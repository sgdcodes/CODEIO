import mongoose from 'mongoose';

let memoryServer = null;

// Connect to MongoDB (MongoDB Atlas, local MongoDB daemon, or in-memory fallback)
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    // If a dedicated Atlas or remote URI is provided, connect to it
    if (mongoUri && !mongoUri.includes('localhost') && !mongoUri.includes('127.0.0.1')) {
      const conn = await mongoose.connect(mongoUri);
      console.log(`[Database] Remote MongoDB Connected: ${conn.connection.host}`);
      return;
    }

    // Try connecting to local daemon
    try {
      const conn = await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/linkvault', {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`[Database] Local MongoDB Connected: ${conn.connection.host}`);
    } catch (localErr) {
      // If local MongoDB daemon is not running, seamlessly start in-memory MongoDB
      console.log('[Database] Local MongoDB daemon not detected. Initializing embedded in-memory database...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const uri = memoryServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[Database] In-Memory MongoDB Connected successfully`);
    }
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
  }
};

export default connectDB;
