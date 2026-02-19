import express from 'express';
import {
  getMe
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Protected routes
router.get('/me', authenticateToken, getMe);

export default router;
