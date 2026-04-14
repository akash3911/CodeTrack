import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserByUsername } from '../data/users';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const createToken = (payload: { userId: string; username: string; email: string }): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const userResponse = (user: IUser) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  avatar: user.avatar,
  solvedProblems: user.solvedProblems,
  starredProblems: user.starredProblems,
  createdAt: user.createdAt,
});

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username = '', email = '', password = '' } = req.body || {};
    const normalizedUsername = String(username).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30 || !USERNAME_REGEX.test(normalizedUsername)) {
      return res.status(400).json({ message: 'Username must be 3-30 chars and use letters, numbers, underscore' });
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const [existingByEmail, existingByUsername] = await Promise.all([
      findUserByEmail(normalizedEmail),
      findUserByUsername(normalizedUsername),
    ]);

    if (existingByEmail) {
      return res.status(409).json({ message: 'Email is already in use' });
    }
    if (existingByUsername) {
      return res.status(409).json({ message: 'Username is already in use' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await createUser({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      displayName: normalizedUsername,
    });

    const token = createToken({ userId: created._id, username: created.username, email: created.email });

    return res.status(201).json({
      token,
      user: userResponse(created),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email = '', password = '' } = req.body || {};
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByEmail(normalizedEmail, true);
    if (!user?.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken({ userId: user._id, username: user.username, email: user.email });
    return res.status(200).json({ token, user: userResponse(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    return res.status(200).json({
      user: userResponse(req.user)
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
