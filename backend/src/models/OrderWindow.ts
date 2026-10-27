import mongoose, { Document, Schema } from 'mongoose';

export const ORDER_CATEGORIES = [
  'FOOD_DELIVERY',
  'QUICK_COMMERCE',
  'GROCERIES',
  'FASHION',
  'GENERAL_SHOPPING',
  'OTHER'
] as const;

export type OrderCategory = (typeof ORDER_CATEGORIES)[number];

export const ORDER_STATUSES = [
  'OPEN',
  'LOCKED',
  'CONFIRMED',
  'PURCHASED',
  'COMPLETED',
  'CANCELLED'
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TARGET_BASIS_TYPES = [
  'ITEM_VALUE_ONLY',
  'SUBTOTAL_BEFORE_FEES',
  'CUSTOM'
] as const;

export type TargetBasisType = (typeof TARGET_BASIS_TYPES)[number];

export interface IOrderWindow extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  platform: string;
  category: OrderCategory;
  hostelId: mongoose.Types.ObjectId;
  initiatorId: mongoose.Types.ObjectId;
  minimumAmountPaise: number;
  targetBasis: TargetBasisType;
  targetBasisNote: string;
  deadline: Date;
  participantLimit?: number | null;
  description?: string;
  deliveryNotes?: string;
  status: OrderStatus;
  committedTotalPaise: number;
  approvedItemsCount: number;
  participantCount: number;
  finalActualTotalPaise?: number | null;
  purchaseNotes?: string;
  cancellationReason?: string;
  lockedAt?: Date;
  confirmedAt?: Date;
  purchasedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderWindowSchema = new Schema<IOrderWindow>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 140
    },
    platform: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    category: {
      type: String,
      enum: ORDER_CATEGORIES,
      required: true,
      index: true
    },
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true
    },
    initiatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    minimumAmountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: 'minimumAmountPaise must be a positive integer in paise'
      }
    },
    targetBasis: {
      type: String,
      enum: TARGET_BASIS_TYPES,
      default: 'ITEM_VALUE_ONLY'
    },
    targetBasisNote: {
      type: String,
      trim: true,
      default: 'Sum of approved item subtotals (excludes delivery fees, taxes, and platform charges)'
    },
    deadline: {
      type: Date,
      required: true,
      index: true
    },
    participantLimit: {
      type: Number,
      default: null,
      validate: {
        validator: (v: number | null | undefined) =>
          v === null || v === undefined || (Number.isInteger(v) && v >= 2),
        message: 'participantLimit must be at least 2 when specified'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    deliveryNotes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'OPEN',
      index: true
    },
    committedTotalPaise: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v >= 0,
        message: 'committedTotalPaise must be a non-negative integer in paise'
      }
    },
    approvedItemsCount: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v >= 0,
        message: 'approvedItemsCount must be a non-negative integer'
      }
    },
    participantCount: {
      type: Number,
      required: true,
      default: 1,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v >= 1,
        message: 'participantCount must be at least 1'
      }
    },
    finalActualTotalPaise: {
      type: Number,
      default: null,
      validate: {
        validator: (v: number | null | undefined) =>
          v === null || v === undefined || (Number.isInteger(v) && v >= 0),
        message: 'finalActualTotalPaise must be a non-negative integer in paise'
      }
    },
    purchaseNotes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    lockedAt: { type: Date },
    confirmedAt: { type: Date },
    purchasedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date }
  },
  {
    timestamps: true
  }
);

orderWindowSchema.index({ hostelId: 1, status: 1, deadline: 1 });
orderWindowSchema.index({ initiatorId: 1, status: 1, createdAt: -1 });
orderWindowSchema.index({ status: 1, category: 1, platform: 1 });

export const OrderWindow = mongoose.model<IOrderWindow>('OrderWindow', orderWindowSchema);

