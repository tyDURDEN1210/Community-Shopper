import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Hostel } from '../models/Hostel.js';
import { OrderWindow } from '../models/OrderWindow.js';
import { OrderParticipant } from '../models/OrderParticipant.js';
import { AppError } from '../utils/errors.js';
import { LoginInput, RegisterInput, UpdateProfileInput } from '../validators/auth.validator.js';

const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8D0R/bS1/E8g6/wL3qQ6u5T5j8C2yG';

export interface AuthResult {
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    hostelId: string;
    hostel?: {
      id: string;
      name: string;
      code: string;
      block: string;
    };
    roomNumber: string;
    role: 'MEMBER' | 'INITIATOR' | 'ADMIN';
    accountStatus: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
  };
  token: string;
  csrfToken: string;
}

function generateTokens(userId: string, role: string): { token: string; csrfToken: string } {
  const token = jwt.sign({ sub: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
  const csrfToken = crypto.randomBytes(24).toString('hex');
  return { token, csrfToken };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await User.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    throw new AppError(
      'An account with this email address already exists',
      409,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  const hostel = await Hostel.findOne({ _id: input.hostelId, isActive: true });
  if (!hostel) {
    throw new AppError('The selected hostel is invalid or inactive', 400, 'INVALID_HOSTEL');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await User.create({
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phoneNumber: input.phoneNumber,
    hostelId: hostel._id,
    roomNumber: input.roomNumber,
    passwordHash,
    role: 'MEMBER', // Never allow self-assigning ADMIN
    accountStatus: 'ACTIVE'
  });

  const { token, csrfToken } = generateTokens(user._id.toString(), user.role);

  return {
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      hostelId: hostel._id.toString(),
      hostel: {
        id: hostel._id.toString(),
        name: hostel.name,
        code: hostel.code,
        block: hostel.block
      },
      roomNumber: user.roomNumber,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt
    },
    token,
    csrfToken
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    await bcrypt.compare(input.password, DUMMY_PASSWORD_HASH);
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw new AppError('Your account is currently suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  const hostel = await Hostel.findById(user.hostelId);
  const { token, csrfToken } = generateTokens(user._id.toString(), user.role);

  return {
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      hostelId: user.hostelId.toString(),
      hostel: hostel
        ? {
            id: hostel._id.toString(),
            name: hostel.name,
            code: hostel.code,
            block: hostel.block
          }
        : undefined,
      roomNumber: user.roomNumber,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt
    },
    token,
    csrfToken
  };
}

export async function getUserProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const hostel = await Hostel.findById(user.hostelId);

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    hostelId: user.hostelId.toString(),
    hostel: hostel
      ? {
          id: hostel._id.toString(),
          name: hostel.name,
          code: hostel.code,
          block: hostel.block,
          address: hostel.address
        }
      : undefined,
    roomNumber: user.roomNumber,
    role: user.role,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt
  };
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (input.hostelId && input.hostelId !== user.hostelId.toString()) {
    const targetHostel = await Hostel.findOne({ _id: input.hostelId, isActive: true });
    if (!targetHostel) {
      throw new AppError('Selected hostel is invalid or inactive', 400, 'INVALID_HOSTEL');
    }

    // Check if user has active orders in their current hostel
    const activeParticipations = await OrderParticipant.find({
      userId: user._id,
      status: 'ACTIVE'
    }).distinct('orderWindowId');

    const activeOrdersCount = await OrderWindow.countDocuments({
      _id: { $in: activeParticipations },
      status: { $in: ['OPEN', 'LOCKED', 'CONFIRMED', 'PURCHASED'] }
    });

    if (activeOrdersCount > 0) {
      throw new AppError(
        'Cannot change hostel while participating in active order windows',
        409,
        'ACTIVE_ORDERS_EXIST'
      );
    }

    user.hostelId = targetHostel._id;
  }

  if (input.fullName !== undefined) user.fullName = input.fullName;
  if (input.phoneNumber !== undefined) user.phoneNumber = input.phoneNumber;
  if (input.roomNumber !== undefined) user.roomNumber = input.roomNumber;

  await user.save();
  return getUserProfile(userId);
}

