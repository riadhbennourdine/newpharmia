import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import './env.js';

// Extend the Express Request type to include the user property
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Middleware to optionally attach a user to the request if a valid token is provided.
export const softAuthenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return next(); // No token, just continue
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');
    const user = await usersCollection.findOne({
      _id: new ObjectId(decoded.id),
    });

    if (user) {
      req.user = user; // Attach user to the request
    }
  } catch (error: any) {
    // If it's a JWT error, log the problematic header for debugging
    if (error.name === 'JsonWebTokenError') {
      console.error('Soft authentication JWT Error. Malformed token received.');
      console.error('Problematic Auth Header:', authHeader);
    } else {
      // For other errors (e.g., DB connection), log the full error
      console.error('Soft authentication error:', error);
    }
  }

  next();
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Access Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');
    const user = await usersCollection.findOne({
      _id: new ObjectId(decoded.id),
    });

    if (!user) {
      return res.status(403).json({ message: 'User for token not found' });
    }

    req.user = user; // Attach user to the request
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const checkRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const effectiveRoles: UserRole[] = [req.user.role];

    // Si l'utilisateur est ADMIN_WEBINAR, il hérite des droits de PHARMACIEN
    if (req.user.role === UserRole.ADMIN_WEBINAR) {
      effectiveRoles.push(UserRole.PHARMACIEN);
    }

    // Un FORMATEUR a aussi les droits d'un PHARMACIEN
    if (req.user.role === UserRole.FORMATEUR) {
      effectiveRoles.push(UserRole.PHARMACIEN);
    }

    const hasPermission = allowedRoles.some((allowedRole) =>
      effectiveRoles.includes(allowedRole),
    );

    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: 'You do not have permission to perform this action' });
    }

    next();
  };
};
