import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Security headers with helmet
app.use(helmet());

// Cross-Origin Resource Sharing setup
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman) or matching frontend
      if (!origin || origin === clientUrl || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);

// Built-in JSON request body parser
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// We will mount url routes and redirect routes in Phase 2 & 3 here

// Global JSON error handling middleware (always placed after routes)
app.use(errorHandler);

export default app;
