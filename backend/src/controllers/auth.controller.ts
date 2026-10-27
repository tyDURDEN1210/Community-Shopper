import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema
} from '../validators/auth.validator.js';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
} from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';

function setAuthCookies(res: Response, token: string, csrfToken: string): void {
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const sameSite = env.COOKIE_SAME_SITE;

  res.cookie('cc_token', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite,
    maxAge: maxAgeMs,
    path: '/'
  });

  res.cookie('cc_csrf', csrfToken, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite,
    maxAge: maxAgeMs,
    path: '/'
  });
}

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await registerUser(validated);
    setAuthCookies(res, result.token, result.csrfToken);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        csrfToken: result.csrfToken
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await loginUser(validated);
    setAuthCookies(res, result.token, result.csrfToken);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        csrfToken: result.csrfToken
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sameSite = env.COOKIE_SAME_SITE;
    res.clearCookie('cc_token', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite,
      path: '/'
    });
    res.clearCookie('cc_csrf', {
      httpOnly: false,
      secure: env.COOKIE_SECURE,
      sameSite,
      path: '/'
    });
    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }
    const profile = await getUserProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: { user: profile }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }
    const validated = updateProfileSchema.parse(req.body);
    const updatedProfile = await updateUserProfile(req.user.id, validated);
    res.status(200).json({
      success: true,
      data: { user: updatedProfile }
    });
  } catch (err) {
    next(err);
  }
}
