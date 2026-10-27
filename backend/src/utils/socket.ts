import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env.js';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-order-room', (orderId: string) => {
      if (typeof orderId === 'string' && orderId.length > 0) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('leave-order-room', (orderId: string) => {
      if (typeof orderId === 'string' && orderId.length > 0) {
        socket.leave(`order:${orderId}`);
      }
    });
  });

  return io;
}

export function emitOrderUpdate(orderId: string, event: string, payload: unknown): void {
  if (io) {
    io.to(`order:${orderId}`).emit(event, payload);
    io.emit('orders:feed-updated', { orderId, event });
  }
}

