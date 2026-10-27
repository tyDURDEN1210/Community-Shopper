import mongoose from 'mongoose';
import path from 'path';
import { env } from './env.js';

interface ClosableReplSet {
  getUri: (dbName?: string) => string;
  stop: () => Promise<boolean>;
}

let replSet: ClosableReplSet | null = null;

export async function connectDatabase(customUri?: string): Promise<string> {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.host;
  }

  // Never allow MongoMemoryReplSet in production
  if (env.IS_PRODUCTION) {
    const prodUri = customUri || env.MONGODB_URI;
    if (!prodUri || prodUri.trim() === '') {
      throw new Error(
        '[DB] MONGODB_URI is required in production. In-memory database fallback is disabled in production.'
      );
    }
    await mongoose.connect(prodUri, {
      serverSelectionTimeoutMS: 10000
    });
    return prodUri;
  }

  const shouldUseInMemory = env.USE_IN_MEMORY_DB && !customUri;

  if (shouldUseInMemory) {
    return connectInMemoryReplicaSet();
  }

  const uri = customUri || env.MONGODB_URI;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    return uri;
  } catch (err) {
    if (env.NODE_ENV === 'development' && !customUri) {
      console.warn(
        '[DB] Could not connect to local MongoDB at MONGODB_URI. Falling back to embedded MongoMemoryReplSet (Replica Set) for development...'
      );
      return connectInMemoryReplicaSet();
    }
    throw err;
  }
}

export async function connectInMemoryReplicaSet(): Promise<string> {
  if (env.IS_PRODUCTION) {
    throw new Error('[DB] MongoMemoryReplSet is strictly forbidden in production.');
  }

  if (!replSet) {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replSet = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: 'wiredTiger'
      },
      binary: {
        downloadDir: path.resolve(process.cwd(), '.mongodb-binaries')
      }
    });
  }
  const uri = replSet.getUri('campus_cart');
  await mongoose.connect(uri);
  return uri;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
}
