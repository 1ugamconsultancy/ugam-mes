import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useShopfloorStore } from '../context/shopfloorStore';
import { getWsUrl } from '../config';

export const useWebSocket = (backendUrl = getWsUrl()) => {
  const socketRef = useRef<Socket | null>(null);
  const { addAlert, updateLiveMachineState, updateLiveMetrics } = useShopfloorStore();

  const token = useShopfloorStore(state => state.token);
  const plantId = useShopfloorStore(state => state.user?.plantId);
  useEffect(() => {
    if (!token || !plantId) return;
    // Connect to Socket.io gateway
    const socket = io(backendUrl, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('MES WebSockets connected successfully');
    });

    socket.on('machineStatusChanged', (data: { machineId: string; status: any }) => {
      updateLiveMachineState(data.machineId, data.status);
    });

    socket.on('liveCounterUpdated', (data: { machineId: string; goodCount: number; scrapCount: number; oee: number }) => {
      updateLiveMetrics(data.machineId, data.goodCount, data.scrapCount, data.oee);
    });

    socket.on('alertCreated', (data: { title: string; message: string; severity: any }) => {
      addAlert({
        title: data.title,
        message: data.message,
        severity: data.severity,
        timestamp: new Date(),
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [backendUrl, token, plantId, addAlert, updateLiveMachineState, updateLiveMetrics]);

  return socketRef.current;
};
