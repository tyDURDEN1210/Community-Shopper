import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, UserRole } from '../models/User.js';
import { AppError } from '../utils/errors.js';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  hostelId: string;
  roomNumber: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;
    let isCookieAuth = false;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies && typeof req.cookies.cc_token === 'string') {
      token = req.cookies.cc_token;
      isCookieAuth = true;
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401, 'UNAUTHENTICATED');
    }

    // CSRF protection when relying on cookie-based auth for state-changing methods
    if (isCookieAuth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      const csrfCookie = req.cookies?.cc_csrf;
      const csrfHeader = req.headers['x-csrf-token'];
      const requestedWith = req.headers['x-requested-with'];

      const validDoubleSubmit = csrfCookie && csrfHeader && csrfCookie === csrfHeader;
      const validCustomHeader = requestedWith === 'CampusCart';

      if (!validDoubleSubmit && !validCustomHeader) {
        throw new AppError('CSRF validation failed', 403, 'CSRF_INVALID');
      }
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new AppError('User account no longer exists', 401, 'USER_NOT_FOUND');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new AppError('Your account has been suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    req.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      hostelId: user.hostelId.toString(),
      roomNumber: user.roomNumber,
      role: user.role
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN')
      );
    }
    next();
  };
}

