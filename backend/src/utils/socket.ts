import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env.js';

let io: SocketIOServer | null = null;

export function isAllowedOrigin(origin: string | undefined, requestHost?: string): boolean {
  if (!origin || env.NODE_ENV === 'test') {
    return true;
  }

  const configuredOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  if (env.RENDER_EXTERNAL_URL && origin === env.RENDER_EXTERNAL_URL.trim()) {
    return true;
  }

  if (requestHost) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host === requestHost) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // In same-origin production, Socket.IO requests come from the same host
        // or match RENDER_EXTERNAL_URL / CORS_ORIGIN
        if (isAllowedOrigin(origin) || env.IS_PRODUCTION) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by Socket.IO CORS policy'));
        }
      },
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
