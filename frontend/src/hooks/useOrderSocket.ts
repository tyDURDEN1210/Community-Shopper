import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

let sharedSocket: Socket | null = null;

function getSocket(): Socket | null {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') {
    return null;
  }
  if (!sharedSocket) {
    const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    const socketUrl =
      configuredSocketUrl && configuredSocketUrl.length > 0
        ? configuredSocketUrl
        : window.location.origin;

    sharedSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });
  }
  return sharedSocket;
}

export function useOrderSocket(orderId?: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRefresh = () => {
      if (orderId) {
        void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    if (orderId) {
      socket.emit('join-order-room', orderId);
    }

    socket.on('order:item-added', handleRefresh);
    socket.on('order:item-updated', handleRefresh);
    socket.on('order:item-deleted', handleRefresh);
    socket.on('order:item-resubmitted', handleRefresh);
    socket.on('order:item-approved', handleRefresh);
    socket.on('order:item-rejected', handleRefresh);
    socket.on('order:participant-joined', handleRefresh);
    socket.on('order:participant-left', handleRefresh);
    socket.on('order:status-changed', handleRefresh);
    socket.on('orders:feed-updated', handleRefresh);

    return () => {
      if (orderId) {
        socket.emit('leave-order-room', orderId);
      }
      socket.off('order:item-added', handleRefresh);
      socket.off('order:item-updated', handleRefresh);
      socket.off('order:item-deleted', handleRefresh);
      socket.off('order:item-resubmitted', handleRefresh);
      socket.off('order:item-approved', handleRefresh);
      socket.off('order:item-rejected', handleRefresh);
      socket.off('order:participant-joined', handleRefresh);
      socket.off('order:participant-left', handleRefresh);
      socket.off('order:status-changed', handleRefresh);
      socket.off('orders:feed-updated', handleRefresh);
    };
  }, [orderId, queryClient]);
}
