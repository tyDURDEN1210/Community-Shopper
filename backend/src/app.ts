import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'test') {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api/v1', apiRateLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

