import mongoose, { Document, Schema } from 'mongoose';

export const ITEM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export interface IOrderItem extends Document {
  _id: mongoose.Types.ObjectId;
  orderWindowId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  productName: string;
  productUrl?: string;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  variantDetails?: string;
  notes?: string;
  status: ItemStatus;
  reviewerId?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  resubmissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    orderWindowId: {
      type: Schema.Types.ObjectId,
      ref: 'OrderWindow',
      required: true,
      index: true
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200
    },
    productUrl: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    unitPricePaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: 'unitPricePaise must be a positive integer in paise'
      }
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: 'quantity must be a positive integer'
      }
    },
    subtotalPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: 'subtotalPaise must be a positive integer in paise'
      }
    },
    variantDetails: {
      type: String,
      trim: true,
      maxlength: 300
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ITEM_STATUSES,
      default: 'PENDING',
      index: true
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    resubmissionCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

orderItemSchema.index({ orderWindowId: 1, status: 1, createdAt: 1 });
orderItemSchema.index({ orderWindowId: 1, requesterId: 1, status: 1 });
orderItemSchema.index({ requesterId: 1, status: 1, updatedAt: -1 });

export const OrderItem = mongoose.model<IOrderItem>('OrderItem', orderItemSchema);

