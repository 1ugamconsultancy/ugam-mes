import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { allowedOrigins } from '../auth/security-config';

@WebSocketGateway({ cors: { origin: allowedOrigins } })
@Injectable()
export class ProductionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private timers = new Map<string, NodeJS.Timeout>();
  constructor(private auth: AuthService, private db: DataSource) {}
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('Authentication required');
      const actor = await this.auth.authenticateToken(token);
      if (!actor.plantId) throw new Error('Select a plant');
      if (!client.connected) return;
      client.data.actor = actor;
      await client.join(`plant:${actor.plantId}`);
      await client.join(`user:${actor.plantId}:${actor.sub}`);
      const timer = setInterval(async () => {
        try { await this.auth.authenticateToken(token); } catch { client.disconnect(true); }
      }, 5000);
      this.timers.set(client.id, timer);
      client.data.expiryTimer = setTimeout(() => client.disconnect(true), Math.max(0, (actor.exp * 1000) - Date.now()));
    } catch { client.disconnect(true); }
  }
  handleDisconnect(client: Socket) {
    clearInterval(this.timers.get(client.id)); this.timers.delete(client.id);
    clearTimeout(client.data.expiryTimer);
  }
  broadcastMachineStatus(plantId: string, machineId: string, status: string) {
    this.server?.to(`plant:${plantId}`).emit('machineStatusChanged', { machineId, status, timestamp: new Date() });
  }
  broadcastLiveCounter(plantId: string, machineId: string, goodCount: number, scrapCount: number, oee: number) {
    this.server?.to(`plant:${plantId}`).emit('liveCounterUpdated', { machineId, goodCount, scrapCount, oee, timestamp: new Date() });
  }
  broadcastAlert(plantId: string, title: string, message: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') {
    this.server?.to(`plant:${plantId}`).emit('alertCreated', { title, message, severity, timestamp: new Date() });
  }
  @SubscribeMessage('pingOperator')
  async handlePingOperator(client: Socket, payload: { operatorId: string; message: string }) {
    try {
      const actor = await this.auth.authenticateToken(client.handshake.auth?.token);
      if (!actor.plantId || !['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'PRODUCTION_MANAGER'].includes(actor.role)) return { error: 'Forbidden' };
      if (!payload || typeof payload.operatorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.operatorId) || typeof payload.message !== 'string' || !payload.message.trim() || payload.message.length > 1000) return { error: 'Invalid message' };
      const recipients = await this.db.query('SELECT id FROM users WHERE id=$1 AND plant_id=$2 AND is_active=true', [payload.operatorId,actor.plantId]);
      if (!recipients.length) return { error: 'Recipient not found' };
      this.server.to(`user:${actor.plantId}:${payload.operatorId}`).emit('operatorAlert', { operatorId: payload.operatorId, message: payload.message, timestamp: new Date() });
      return { success: true };
    } catch { client.disconnect(true); return { error: 'Authentication required' }; }
  }
}
