import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_cart?replicaSet=rs0',
  USE_IN_MEMORY_DB: process.env.USE_IN_MEMORY_DB === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_fallback_campus_cart_jwt_secret_do_not_use_in_prod_987654321',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

