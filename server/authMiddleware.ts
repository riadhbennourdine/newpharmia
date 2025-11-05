import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';

// Extend the Express Request type to include the user property
interface AuthenticatedRequest extends Request {
    user?: User;
}

export type { AuthenticatedRequest };

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth Middleware: authHeader =', authHeader);
    console.log('Auth Middleware: token =', token);

    if (token == null) return res.status(401).json({ message: 'Access Token is required' });
    // This is a temporary, insecure solution based on the existing pattern in the app
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
        // For real JWT, you'd check for 'Authorization' header
        return res.status(401).json({ message: 'Access Token is required' });
    }

    if (!ObjectId.isValid(userId)) {
        return res.status(403).json({ message: 'Invalid User ID format' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
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
