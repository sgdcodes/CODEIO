import mongoose from 'mongoose';

const globalCache = globalThis;

/**
 * Connect to MongoDB and reuse the connection across Vercel serverless invocations.
 * Production requires Atlas. Locally we still fall back to a daemon or in-memory server.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (globalCache.__linkvaultMongoPromise) {
    return globalCache.__linkvaultMongoPromise;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const isRemoteUri =
    Boolean(mongoUri) && !mongoUri.includes('localhost') && !mongoUri.includes('127.0.0.1');
  const isCloud = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

  const connect = async () => {
    if (isRemoteUri) {
      const conn = await mongoose.connect(mongoUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`[Database] Remote MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }

    if (isCloud) {
      throw new Error(
        'MONGO_URI must be set to a MongoDB Atlas connection string in production'
      );
    }

    try {
      const conn = await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/linkvault', {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`[Database] Local MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch {
      console.log(
        '[Database] Local MongoDB daemon not detected. Initializing embedded in-memory database...'
      );
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const memoryServer = await MongoMemoryServer.create();
      const conn = await mongoose.connect(memoryServer.getUri());
      console.log('[Database] In-Memory MongoDB Connected successfully');
      return conn;
    }
  };

  globalCache.__linkvaultMongoPromise = connect().catch((error) => {
    globalCache.__linkvaultMongoPromise = null;
    console.error(`[Database Error] ${error.message}`);
    throw error;
  });

  return globalCache.__linkvaultMongoPromise;
};

export default connectDB;
