import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{10,15}$/, 'Please provide a valid 10-15 digit phone number'),
    hostelId: z.string().regex(objectIdRegex, 'Please select a valid hostel'),
    roomNumber: z.string().trim().min(1, 'Room number is required').max(20),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters')
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required')
  })
  .strict();

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{10,15}$/, 'Please provide a valid 10-15 digit phone number')
      .optional(),
    roomNumber: z.string().trim().min(1, 'Room number is required').max(20).optional(),
    hostelId: z.string().regex(objectIdRegex, 'Invalid hostel ID').optional()
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

