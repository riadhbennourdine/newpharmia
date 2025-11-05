import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';

// Extend the Express Request type to include the user property
export interface AuthenticatedRequest extends Request {
    user?: User;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Access Token is required' });
    }

    // This is where real token verification would happen.
    // For this demo, we'll just check if the token is the mock token.
    if (token !== 'mock-jwt-token') {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // If the token is valid, fetch the user associated with it.
    // In a real app, the user ID would be in the JWT payload.
    // For this demo, we'll just fetch the hardcoded admin user.
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        // In a real app, you'd find the user based on info from the decoded token.
        const user = await usersCollection.findOne({ email: 'admin@example.com' });

        if (!user) {
            return res.status(403).json({ message: 'User for token not found' });
        }

        req.user = user; // Attach user to the request
        next();
    } catch (error) {
        console.error('Authentication database error:', error);
        res.status(500).json({ message: 'Internal server error during authentication' });
    }
};

export const checkRole = (roles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action' });
        }

        next();
    };
};