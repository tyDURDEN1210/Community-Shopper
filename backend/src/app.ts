import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/index.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { isAllowedOrigin } from './utils/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Trust Render / reverse proxy for accurate client IP & HTTPS detection
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:']
        }
      }
    })
  );

  app.use((req, res, next) => {
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin, req.get('host'))) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
    })(req, res, next);
  });

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Versioned API routes
  app.use('/api/v1', apiRateLimiter, apiRoutes);

  // Never let unmatched /api routes fall through to the frontend SPA index.html
  app.use('/api', notFoundHandler);

  // Serve built React/Vite frontend assets in production (or whenever frontend/dist exists)
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  const frontendIndexHtml = path.join(frontendDistPath, 'index.html');

  if (fs.existsSync(frontendIndexHtml)) {
    app.use(express.static(frontendDistPath));

    // Safe SPA fallback: only for GET requests that do not target /api or /socket.io
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(frontendIndexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
