import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';
import admin from '../utils/firebaseAdmin';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

const sanitizeUsernameBase = (value: string): string => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const trimmed = cleaned.slice(0, 24);
  return trimmed.length >= 3 ? trimmed : 'user';
};

const generateUniqueUsername = async (base: string): Promise<string> => {
  const normalized = sanitizeUsernameBase(base);
  let candidate = normalized;
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ username: candidate });
    if (!existing) return candidate;
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    candidate = `${normalized.slice(0, 24)}${suffix}`.slice(0, 30);
  }
  return `${normalized.slice(0, 20)}${Date.now().toString().slice(-6)}`.slice(0, 30);
};

const upsertFirebaseUser = async (decoded: admin.auth.DecodedIdToken): Promise<IUser> => {
  const firebaseUid = decoded.uid;
  const email = decoded.email || `${firebaseUid}@no-email.local`;
  const displayName = decoded.name || decoded.email || 'CodeTrack User';
  const avatar = decoded.picture || '';

  let user = await User.findOne({ firebaseUid });
  if (!user) {
    const username = await generateUniqueUsername(displayName || email);
    user = await User.create({
      firebaseUid,
      username,
      email,
      displayName,
      avatar
    });
  } else {
    const updates: Partial<IUser> = {};
    if (email && user.email !== email) updates.email = email;
    if (displayName && user.displayName !== displayName) updates.displayName = displayName;
    if (avatar && user.avatar !== avatar) updates.avatar = avatar;
    if (Object.keys(updates).length > 0) {
      user.set(updates);
      await user.save();
    }
  }

  return user;
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded?.uid) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    const user = await upsertFirebaseUser(decoded);

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
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded?.uid) {
        const user = await upsertFirebaseUser(decoded);
        if (user) req.user = user;
      }
    } catch {
      // Ignore token errors in optional auth and proceed as unauthenticated
    }

    next();
  } catch {
    // On unexpected errors, still allow request to proceed unauthenticated
    next();
  }
};
