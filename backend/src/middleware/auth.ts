import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET, ROLES, UserRole } from '../config/constants';

export interface UserPayload extends JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err: jwt.VerifyErrors | null, user: string | jwt.JwtPayload | undefined) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user as UserPayload;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Middleware to check if user is authenticated
export const isAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Middleware to check if user has admin role
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === ROLES.ADMIN) {
    return next();
  }
  res.status(403).json({ error: 'Forbidden - Admin access required' });
};
