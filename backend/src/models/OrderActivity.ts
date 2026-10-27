import mongoose, { Document, Schema } from 'mongoose';

export const ACTIVITY_ACTIONS = [
  'ORDER_CREATED',
  'PARTICIPANT_JOINED',
  'PARTICIPANT_LEFT',
  'ITEM_ADDED',
  'ITEM_UPDATED',
  'ITEM_DELETED',
  'ITEM_RESUBMITTED',
  'ITEM_APPROVED',
  'ITEM_REJECTED',
  'ORDER_LOCKED',
  'ORDER_CONFIRMED',
  'ORDER_PURCHASED',
  'ORDER_COMPLETED',
  'ORDER_CANCELLED'
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface IOrderActivity extends Document {
  _id: mongoose.Types.ObjectId;
  orderWindowId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: ActivityAction;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const orderActivitySchema = new Schema<IOrderActivity>(
  {
    orderWindowId: {
      type: Schema.Types.ObjectId,
      ref: 'OrderWindow',
      required: true,
      index: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

orderActivitySchema.index({ orderWindowId: 1, createdAt: -1 });

export const OrderActivity = mongoose.model<IOrderActivity>('OrderActivity', orderActivitySchema);

