import dotenv from 'dotenv';
// Load environment variables before importing app and db
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Start the server
app.listen(PORT, () => {
  console.log(`[Server] LinkVault backend running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
});
