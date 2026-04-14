import express from 'express';
import {
  login,
  register,
  getMe
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Protected routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

export default router;
