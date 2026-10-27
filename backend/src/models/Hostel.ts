import mongoose, { Document, Schema } from 'mongoose';

export interface IHostel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  block: string;
  genderType: 'COED' | 'BOYS' | 'GIRLS';
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hostelSchema = new Schema<IHostel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true
    },
    block: {
      type: String,
      required: true,
      trim: true
    },
    genderType: {
      type: String,
      enum: ['COED', 'BOYS', 'GIRLS'],
      default: 'COED'
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Hostel = mongoose.model<IHostel>('Hostel', hostelSchema);

