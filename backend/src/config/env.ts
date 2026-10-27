import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const env = {
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: isProduction,
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    (isProduction ? '' : 'mongodb://127.0.0.1:27017/campus_cart?replicaSet=rs0'),
  USE_IN_MEMORY_DB: !isProduction && process.env.USE_IN_MEMORY_DB === 'true',
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (isProduction ? '' : 'dev_fallback_campus_cart_jwt_secret_do_not_use_in_prod_987654321'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECURE: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : isProduction,
  COOKIE_SAME_SITE: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
  CORS_ORIGIN: process.env.CORS_ORIGIN || (isProduction ? '' : 'http://localhost:5173'),
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || ''
};

export function validateProductionEnv(): void {
  if (!env.IS_PRODUCTION) return;

  if (!env.MONGODB_URI || env.MONGODB_URI.trim() === '') {
    throw new Error(
      'Missing required environment variable MONGODB_URI in production. Refusing to start without a persistent MongoDB URI.'
    );
  }

  if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 16) {
    throw new Error(
      'Missing or weak JWT_SECRET environment variable in production (must be at least 16 characters).'
    );
  }
}
