import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import { findUserById } from '../data/users';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

interface JwtPayload {
  userId: string;
  username: string;
}

const getBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const decodeToken = (token: string): JwtPayload | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload?.userId) return null;
    return payload;
  } catch {
    return null;
  }
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded?.userId) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    const user = await findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};

// New: optional authentication that does not error when no/invalid token
export const optionalAuthenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      next();
      return;
    }

    const decoded = decodeToken(token);
    if (decoded?.userId) {
      const user = await findUserById(decoded.userId);
      if (user) req.user = user;
    }

    next();
  } catch {
    // On unexpected errors, still allow request to proceed unauthenticated
    next();
  }
};
