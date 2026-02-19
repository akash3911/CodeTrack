import { Request } from 'express';
import { IUser } from '../models/User';

// Extend Express Request to include user property
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}
