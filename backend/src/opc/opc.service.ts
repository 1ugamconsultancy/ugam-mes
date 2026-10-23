import { Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { currentAccess, currentPlant } from '../auth/access-context';
import { appMode } from '../auth/security-config';
import { OpcTag, KepwareServerConfig, WriteTagDto, CreateTagDto } from './opc.entity';

@Injectable()
export class OpcService {
  constructor(private db: DataSource) {}
  private async equipment(code: string) {
    const rows = await this.db.query(`SELECT m.id FROM machines m JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id WHERE m.code=$1 AND a.plant_id=$2`, [code, currentPlant()]);
    if (!rows.length) throw new NotFoundException('Equipment not found in active plant');
  }
  async getTags(): Promise<OpcTag[]> {
    const rows = await this.db.query(`SELECT t.data FROM opc_tags t JOIN machines m ON m.code=t.data->>'equipmentCode' JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id WHERE t.plant_id=$1 AND a.plant_id=$1 ORDER BY t.tag_name`, [currentPlant()]);
    return rows.map(r => r.data);
  }
  async getTag(tagName: string): Promise<OpcTag> {
    const rows = await this.db.query('SELECT data FROM opc_tags WHERE plant_id=$1 AND tag_name=$2', [currentPlant(), tagName]);
    if (!rows.length) throw new NotFoundException('Tag not found');
    await this.equipment(rows[0].data.equipmentCode);
    return rows[0].data;
  }
  async getServerConfig(): Promise<KepwareServerConfig> {
    const rows = await this.db.query('SELECT data FROM opc_server_configs WHERE plant_id=$1', [currentPlant()]);
    const config = rows[0]?.data || { endpointUrl: '', protocol: 'KEPWARE_REST', scanRateMs: 1000, lastHeartbeat: null, totalWrites: 0 };
    return { ...config, status: appMode === 'demo' ? 'SIMULATION' : 'OFFLINE', activeTagsCount: (await this.getTags()).length };
  }
  private async saveConfig(config: any) {
    await this.db.query('INSERT INTO opc_server_configs(plant_id,data) VALUES($1,$2) ON CONFLICT(plant_id) DO UPDATE SET data=EXCLUDED.data', [currentPlant(), config]);
  }
  private validateEndpoint(endpoint: string) {
    const approved = (process.env.OPC_ALLOWED_ENDPOINTS || '').split(',').map(x => x.trim()).filter(Boolean);
    let url: URL; try { url = new URL(endpoint); } catch { throw new BadRequestException('Invalid endpoint URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !approved.includes(endpoint)) throw new BadRequestException('Endpoint must be in the deployment OPC_ALLOWED_ENDPOINTS allowlist');
  }
  async updateServerConfig(dto: Partial<KepwareServerConfig>) {
    if (dto.endpointUrl) this.validateEndpoint(dto.endpointUrl);
    if (dto.protocol && dto.protocol !== 'KEPWARE_REST') throw new BadRequestException('Only Kepware REST is supported');
    const config = await this.getServerConfig();
    for (const key of ['endpointUrl', 'protocol', 'scanRateMs']) if (dto[key] !== undefined) config[key] = dto[key];
    const id = await this.audit('CONFIGURE', null, config, 'PENDING');
    await this.saveConfig(config); await this.outcome(id, 'SUCCESS'); return config;
  }
  async testConnection(customUrl?: string) {
    const config = await this.getServerConfig();
    if (customUrl && customUrl !== config.endpointUrl) throw new BadRequestException('Save an approved endpoint before testing');
    if (appMode === 'demo') return { success: true, status: 'SIMULATION', latencyMs: 0, message: 'Isolated demo; physical connections disabled' };
    this.validateEndpoint(config.endpointUrl);
    const start = Date.now();
    try {
      const response = await fetch(config.endpointUrl, { signal: AbortSignal.timeout(3000), redirect: 'error' });
      return { success: response.ok, status: response.ok ? 'CONNECTED' : 'OFFLINE', latencyMs: Date.now()-start, message: response.ok ? 'Connection verified' : 'Equipment endpoint unavailable' };
    } catch { return { success: false, status: 'OFFLINE', latencyMs: Date.now()-start, message: 'Equipment endpoint unavailable' }; }
  }
  private value(tag: OpcTag, value: any) {
    if (tag.dataType === 'BOOLEAN') {
      if (![true,false,0,1,'true','false','0','1'].includes(value)) throw new BadRequestException('Boolean value required');
      return [true,1,'true','1'].includes(value);
    }
    if (tag.dataType === 'STRING') {
      if (typeof value !== 'string' || value.length > 4096) throw new BadRequestException('String value required'); return value;
    }
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || (typeof value === 'string' && !value.trim())) throw new BadRequestException('Numeric value required');
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || (tag.dataType === 'INTEGER' && !Number.isSafeInteger(numeric))) throw new BadRequestException('Invalid numeric value');
    if ((tag.alarmHiLimit != null && numeric > tag.alarmHiLimit) || (tag.alarmLowLimit != null && numeric < tag.alarmLowLimit)) throw new BadRequestException('Value outside configured limits');
    return numeric;
  }
  async writeTag(dto: WriteTagDto) {
    const tag = await this.getTag(dto.tagName);
    if (tag.accessMode !== 'READ_WRITE') throw new BadRequestException('Tag is read only');
    const value = this.value(tag, dto.value); const config = await this.getServerConfig();
    if (appMode !== 'demo') this.validateEndpoint(config.endpointUrl);
    const auditId = await this.audit('WRITE', tag.tagName, { oldValue: tag.currentValue, newValue: value, reason: dto.notes || '' }, 'PENDING');
    if (appMode !== 'demo') {
      try {
        const response = await fetch(config.endpointUrl.replace(/\/$/, '')+'/write', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ id: tag.kepwareAddress, v: value }]), signal: AbortSignal.timeout(5000) });
        const body: any = await response.json();
        if (!response.ok || !Array.isArray(body.writeResults) || body.writeResults.length !== 1 || body.writeResults[0].id !== tag.kepwareAddress || body.writeResults[0].s !== true) throw new Error('No confirmed equipment acknowledgement');
      } catch {
        await this.outcome(auditId, 'UNKNOWN');
        throw new ServiceUnavailableException('Equipment write not confirmed; check equipment before retrying');
      }
    }
    tag.currentValue = value; tag.lastUpdated = new Date().toISOString(); tag.quality = 'GOOD';
    await this.db.query('UPDATE opc_tags SET data=$3 WHERE plant_id=$1 AND tag_name=$2', [currentPlant(), tag.tagName, tag]);
    await this.outcome(auditId, appMode === 'demo' ? 'SIMULATED' : 'SUCCESS');
    return { success: true, tag, message: appMode === 'demo' ? 'Demo value updated' : 'Equipment write acknowledged' };
  }
  async createTag(dto: CreateTagDto) {
    await this.equipment(dto.equipmentCode);
    const tag: OpcTag = { ...dto, id: randomUUID(), kepwareAddress: dto.kepwareAddress, currentValue: dto.initialValue ?? null, quality: 'UNCERTAIN', lastUpdated: new Date().toISOString() };
    const id = await this.audit('REGISTER_TAG', tag.tagName, tag, 'PENDING');
    try { await this.db.query('INSERT INTO opc_tags(plant_id,tag_name,data) VALUES($1,$2,$3)', [currentPlant(), tag.tagName, tag]); }
    catch (e) { await this.outcome(id, 'ERROR'); if (e.code === '23505') throw new BadRequestException('Tag already exists'); throw e; }
    await this.outcome(id, 'SUCCESS'); return tag;
  }
  async syncAllTags() {
    // A sync must actually read the equipment; never refresh timestamps on stale values.
    const tags = await this.getTags(); const config = await this.getServerConfig();
    if (appMode === 'demo') return { count: 0, timestamp: new Date().toISOString(), status: 'SIMULATION' };
    this.validateEndpoint(config.endpointUrl);
    const id = await this.audit('SYNC', null, {}, 'PENDING');
    try {
      const url = new URL(config.endpointUrl.replace(/\/$/, '')+'/read'); tags.forEach(t => url.searchParams.append('ids', t.kepwareAddress));
      const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
      const body: any = await response.json();
      if (!response.ok || !Array.isArray(body.readResults)) throw new Error('Read failed');
      let count = 0;
      for (const result of body.readResults) {
        const tag = tags.find(t => t.kepwareAddress === result.id); if (!tag) continue;
        tag.quality = result.s === true ? 'GOOD' : 'BAD';
        if (result.s === true) { tag.currentValue = result.v; tag.lastUpdated = new Date().toISOString(); count++; }
        await this.db.query('UPDATE opc_tags SET data=$3 WHERE plant_id=$1 AND tag_name=$2', [currentPlant(), tag.tagName, tag]);
      }
      await this.outcome(id, 'SUCCESS'); return { count, timestamp: new Date().toISOString() };
    } catch { await this.outcome(id, 'ERROR'); throw new ServiceUnavailableException('Equipment synchronization failed'); }
  }
  async getAuditLogs(limit=100) {
    return this.db.query('SELECT id, created_at AS timestamp, tag_name AS "tagName", action, username AS "user", status, details FROM opc_command_audit WHERE plant_id=$1 ORDER BY created_at DESC LIMIT $2', [currentPlant(), Math.min(Math.max(Number.isFinite(limit) ? limit : 100,1),1000)]);
  }
  private async audit(action: string, tag: string, details: any, status: string) {
    const actor = currentAccess(); const id = randomUUID();
    await this.db.query('INSERT INTO opc_command_audit(id,plant_id,user_id,username,tag_name,action,status,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id,currentPlant(),actor.sub,actor.username,tag,action,status,details]); return id;
  }
  private async outcome(id: string, status: string) { await this.db.query('UPDATE opc_command_audit SET status=$2 WHERE id=$1 AND plant_id=$3', [id,status,currentPlant()]); }
}
