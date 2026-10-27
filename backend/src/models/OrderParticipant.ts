import mongoose, { Document, Schema } from 'mongoose';

export type ParticipantRole = 'INITIATOR' | 'PARTICIPANT';
export type ParticipantStatus = 'ACTIVE' | 'LEFT';

export interface IOrderParticipant extends Document {
  _id: mongoose.Types.ObjectId;
  orderWindowId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ParticipantRole;
  status: ParticipantStatus;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderParticipantSchema = new Schema<IOrderParticipant>(
  {
    orderWindowId: {
      type: Schema.Types.ObjectId,
      ref: 'OrderWindow',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['INITIATOR', 'PARTICIPANT'],
      default: 'PARTICIPANT'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'LEFT'],
      default: 'ACTIVE',
      index: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

orderParticipantSchema.index({ orderWindowId: 1, userId: 1 }, { unique: true });
orderParticipantSchema.index({ userId: 1, status: 1 });

export const OrderParticipant = mongoose.model<IOrderParticipant>(
  'OrderParticipant',
  orderParticipantSchema
);

