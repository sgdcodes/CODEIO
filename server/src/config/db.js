import mongoose from 'mongoose';

// Connect to MongoDB using the URI from environment variables
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/linkvault';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    // We log the error; in production with MongoDB Atlas, set MONGO_URI in .env
  }
};

export default connectDB;
