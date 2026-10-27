import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: fieldErrors[0]?.message || 'Invalid request data',
        details: fieldErrors
      }
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IDENTIFIER',
        message: `Invalid ${err.path} identifier format`
      }
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: messages[0] || 'Database validation failed',
        details: messages
      }
    });
    return;
  }

  // MongoDB duplicate key error
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A record with the provided unique value already exists'
      }
    });
    return;
  }

  // Log unexpected internal error on server without leaking stack traces or sensitive details to client
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ServerError]', err instanceof Error ? err.message : 'Unknown error');
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred. Please try again later.'
    }
  });
}

