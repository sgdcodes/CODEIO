import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import urlRoutes from './routes/urlRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Security headers with helmet
app.use(helmet());

// Cross-Origin Resource Sharing setup
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, curl, Postman) or matching frontend
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

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 2. Core API routes
app.use('/api/urls', urlRoutes);

// 3. Short URL redirection route (Mounted AFTER /api routes)
app.use('/', redirectRoutes);

// 4. Catch-all for unhandled routes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// 5. Global JSON error handling middleware
app.use(errorHandler);

export default app;
