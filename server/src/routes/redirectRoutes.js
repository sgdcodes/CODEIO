import express from 'express';
import { handleRedirect } from '../controllers/redirectController.js';

const router = express.Router();

// GET /:shortCode - Redirect to original URL
router.get('/:shortCode', handleRedirect);

export default router;
