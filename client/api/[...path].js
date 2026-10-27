import connectDB from '../backend/config/db.js';
import app from '../backend/app.js';

export const config = {
  maxDuration: 10,
};

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        message: error.message || 'Database is not connected',
      })
    );
    return;
  }

  return app(req, res);
}
