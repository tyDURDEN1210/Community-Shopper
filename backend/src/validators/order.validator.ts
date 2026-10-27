import { z } from 'zod';
import { ORDER_CATEGORIES, ORDER_STATUSES, TARGET_BASIS_TYPES } from '../models/OrderWindow.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost, loopback, and private/internal network hosts for SSRF defense-in-depth
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return Boolean(hostname && hostname.includes('.'));
  } catch {
    return false;
  }
}

const optionalProductUrlSchema = z
  .union([z.string().trim(), z.undefined(), z.null()])
  .transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  })
  .refine((val) => val === undefined || (val.length <= 1000 && isValidHttpUrl(val)), {
    message: 'Product URL must be a valid public HTTP or HTTPS URL'
  });

export const createOrderWindowSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
    platform: z.string().trim().min(1, 'Platform name is required').max(80),
    category: z.enum(ORDER_CATEGORIES),
    hostelId: z.string().regex(objectIdRegex, 'Valid hostel ID is required'),
    minimumAmountPaise: z
      .number()
      .int('Minimum amount must be in integer paise')
      .positive('Minimum amount must be greater than zero')
      .max(100_000_000, 'Minimum amount exceeds allowed maximum'),
    targetBasis: z.enum(TARGET_BASIS_TYPES).optional().default('ITEM_VALUE_ONLY'),
    targetBasisNote: z.string().trim().max(300).optional(),
    deadline: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()) && date.getTime() > Date.now(), {
        message: 'Joining deadline must be a valid date in the future'
      }),
    participantLimit: z
      .union([
        z.number().int().min(2, 'Participant limit must be at least 2').max(200),
        z.null(),
        z.undefined()
      ])
      .optional(),
    description: z.string().trim().max(1000).optional(),
    deliveryNotes: z.string().trim().max(500).optional()
  })
  .strict();

export const listOrderWindowsQuerySchema = z.object({
  hostelId: z.string().regex(objectIdRegex).optional(),
  platform: z.string().trim().optional(),
  category: z.enum(ORDER_CATEGORIES).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().optional()
});

export const createItemSchema = z
  .object({
    productName: z.string().trim().min(1, 'Product name is required').max(200),
    productUrl: optionalProductUrlSchema,
    unitPricePaise: z
      .number()
      .int('Unit price must be an integer in paise')
      .positive('Unit price must be a positive integer in paise')
      .max(50_000_000, 'Unit price exceeds maximum allowed'),
    quantity: z
      .number()
      .int('Quantity must be a positive integer')
      .positive('Quantity must be at least 1')
      .max(500, 'Quantity cannot exceed 500'),
    variantDetails: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional()
  })
  .strict();

export const updateItemSchema = z
  .object({
    productName: z.string().trim().min(1, 'Product name cannot be empty').max(200).optional(),
    productUrl: optionalProductUrlSchema,
    unitPricePaise: z
      .number()
      .int('Unit price must be an integer in paise')
      .positive('Unit price must be a positive integer in paise')
      .max(50_000_000)
      .optional(),
    quantity: z
      .number()
      .int('Quantity must be a positive integer')
      .positive('Quantity must be at least 1')
      .max(500)
      .optional(),
    variantDetails: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update an item'
  });

export const resubmitItemSchema = z
  .object({
    productName: z.string().trim().min(1).max(200).optional(),
    productUrl: optionalProductUrlSchema,
    unitPricePaise: z.number().int().positive().max(50_000_000).optional(),
    quantity: z.number().int().positive().max(500).optional(),
    variantDetails: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional()
  })
  .strict();

export const rejectItemSchema = z
  .object({
    rejectionReason: z.string().trim().max(500).optional()
  })
  .strict();

export const lockOrderSchema = z
  .object({
    acknowledgePending: z.boolean().optional().default(false)
  })
  .strict();

export const markPurchasedSchema = z
  .object({
    finalActualTotalPaise: z
      .number()
      .int('Final order total must be in integer paise')
      .nonnegative('Final order total cannot be negative')
      .max(200_000_000),
    purchaseNotes: z.string().trim().max(500).optional()
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    cancellationReason: z.string().trim().max(500).optional()
  })
  .strict();

