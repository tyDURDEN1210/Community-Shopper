import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'MEMBER' | 'INITIATOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phoneNumber: string;
  hostelId: mongoose.Types.ObjectId;
  roomNumber: string;
  passwordHash: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['MEMBER', 'INITIATOR', 'ADMIN'],
      default: 'MEMBER'
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const User = mongoose.model<IUser>('User', userSchema);

