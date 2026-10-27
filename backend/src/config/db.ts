import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'path';
import { env } from './env.js';

let replSet: MongoMemoryReplSet | null = null;

export async function connectDatabase(customUri?: string): Promise<string> {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.host;
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
  if (!replSet) {
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

