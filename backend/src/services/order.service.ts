import mongoose from 'mongoose';
import { OrderWindow, IOrderWindow } from '../models/OrderWindow.js';
import { OrderParticipant } from '../models/OrderParticipant.js';
import { OrderItem, IOrderItem } from '../models/OrderItem.js';
import { OrderActivity } from '../models/OrderActivity.js';
import { Hostel } from '../models/Hostel.js';
import { User } from '../models/User.js';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import { AppError } from '../utils/errors.js';
import { emitOrderUpdate } from '../utils/socket.js';

export interface OrderMetrics {
  committedTotalPaise: number;
  minimumAmountPaise: number;
  amountRemainingPaise: number;
  progressPercentage: number;
  isTargetReached: boolean;
  approvedItemsCount: number;
  pendingRequestsCount: number;
  rejectedRequestsCount: number;
  participantCount: number;
  timeRemainingMs: number;
  isExpired: boolean;
}

export function computeOrderMetrics(
  order: Pick<
    IOrderWindow,
    | 'committedTotalPaise'
    | 'minimumAmountPaise'
    | 'approvedItemsCount'
    | 'participantCount'
    | 'deadline'
  >,
  pendingRequestsCount = 0,
  rejectedRequestsCount = 0
): OrderMetrics {
  const committedTotalPaise = order.committedTotalPaise;
  const minimumAmountPaise = order.minimumAmountPaise;
  const amountRemainingPaise = Math.max(0, minimumAmountPaise - committedTotalPaise);
  const rawProgress =
    minimumAmountPaise > 0 ? (committedTotalPaise / minimumAmountPaise) * 100 : 100;
  const progressPercentage = Math.min(100, Math.round(rawProgress * 100) / 100);
  const isTargetReached = committedTotalPaise >= minimumAmountPaise;
  const timeRemainingMs = Math.max(0, new Date(order.deadline).getTime() - Date.now());

  return {
    committedTotalPaise,
    minimumAmountPaise,
    amountRemainingPaise,
    progressPercentage,
    isTargetReached,
    approvedItemsCount: order.approvedItemsCount,
    pendingRequestsCount,
    rejectedRequestsCount,
    participantCount: order.participantCount,
    timeRemainingMs,
    isExpired: timeRemainingMs === 0
  };
}

function validateObjectId(id: string, label = 'identifier'): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label} format`, 400, 'INVALID_IDENTIFIER');
  }
}

export async function createOrderWindow(
  user: AuthenticatedUser,
  input: {
    title: string;
    platform: string;
    category: IOrderWindow['category'];
    hostelId: string;
    minimumAmountPaise: number;
    targetBasis?: IOrderWindow['targetBasis'];
    targetBasisNote?: string;
    deadline: Date;
    participantLimit?: number | null;
    description?: string;
    deliveryNotes?: string;
  }
) {
  validateObjectId(input.hostelId, 'hostelId');

  const hostel = await Hostel.findOne({ _id: input.hostelId, isActive: true });
  if (!hostel) {
    throw new AppError('Selected hostel does not exist or is inactive', 400, 'INVALID_HOSTEL');
  }

  if (user.hostelId !== input.hostelId && user.role !== 'ADMIN') {
    throw new AppError(
      'You can only create an order window for your own registered hostel',
      403,
      'CROSS_HOSTEL_FORBIDDEN'
    );
  }

  if (input.deadline.getTime() <= Date.now()) {
    throw new AppError('Joining deadline must be in the future', 400, 'INVALID_DEADLINE');
  }

  const session = await mongoose.startSession();
  let createdOrder: IOrderWindow | null = null;

  try {
    await session.withTransaction(async () => {
      const [order] = await OrderWindow.create(
        [
          {
            title: input.title,
            platform: input.platform,
            category: input.category,
            hostelId: hostel._id,
            initiatorId: new mongoose.Types.ObjectId(user.id),
            minimumAmountPaise: input.minimumAmountPaise,
            targetBasis: input.targetBasis || 'ITEM_VALUE_ONLY',
            targetBasisNote:
              input.targetBasisNote ||
              'Sum of approved item subtotals (excludes delivery fees, taxes, and platform charges)',
            deadline: input.deadline,
            participantLimit: input.participantLimit ?? null,
            description: input.description,
            deliveryNotes: input.deliveryNotes,
            status: 'OPEN',
            committedTotalPaise: 0,
            approvedItemsCount: 0,
            participantCount: 1
          }
        ],
        { session }
      );

      createdOrder = order;

      await OrderParticipant.create(
        [
          {
            orderWindowId: order._id,
            userId: new mongoose.Types.ObjectId(user.id),
            role: 'INITIATOR',
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        ],
        { session }
      );

      if (user.role === 'MEMBER') {
        await User.findByIdAndUpdate(user.id, { $set: { role: 'INITIATOR' } }, { session });
      }

      await OrderActivity.create(
        [
          {
            orderWindowId: order._id,
            actorId: new mongoose.Types.ObjectId(user.id),
            action: 'ORDER_CREATED',
            message: `${user.fullName} opened an order window for ${input.platform}`
          }
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  if (!createdOrder) {
    throw new AppError('Failed to create order window', 500, 'ORDER_CREATION_FAILED');
  }

  const orderId = (createdOrder as IOrderWindow)._id.toString();
  emitOrderUpdate(orderId, 'order:created', { orderId });
  return getOrderDetail(orderId, user);
}

export async function listOrderWindows(
  filters: {
    hostelId?: string;
    platform?: string;
    category?: string;
    status?: string;
    search?: string;
  },
  viewer?: AuthenticatedUser
) {
  const query: Record<string, unknown> = {};

  if (filters.hostelId) {
    validateObjectId(filters.hostelId, 'hostelId');
    query.hostelId = new mongoose.Types.ObjectId(filters.hostelId);
  }
  if (filters.platform) {
    query.platform = { $regex: new RegExp(`^${ escapeRegex(filters.platform) }$`, 'i') };
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { platform: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  const orders = await OrderWindow.find(query)
    .populate('hostelId', 'name code block')
    .populate('initiatorId', 'fullName roomNumber')
    .sort({ status: 1, deadline: 1, createdAt: -1 })
    .lean();

  const orderIds = orders.map((o) => o._id);

  // Count pending items per order
  const pendingCounts = await OrderItem.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { orderWindowId: { $in: orderIds }, status: 'PENDING' } },
    { $group: { _id: '$orderWindowId', count: { $sum: 1 } } }
  ]);
  const pendingMap = new Map(pendingCounts.map((p) => [p._id.toString(), p.count]));

  // Check viewer participation
  let joinedOrderSet = new Set<string>();
  if (viewer) {
    const participations = await OrderParticipant.find({
      orderWindowId: { $in: orderIds },
      userId: new mongoose.Types.ObjectId(viewer.id),
      status: 'ACTIVE'
    }).lean();
    joinedOrderSet = new Set(participations.map((p) => p.orderWindowId.toString()));
  }

  return orders.map((order) => {
    const pendingRequestsCount = pendingMap.get(order._id.toString()) || 0;
    const metrics = computeOrderMetrics(order as unknown as IOrderWindow, pendingRequestsCount);
    const hostelDoc = order.hostelId as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      code: string;
      block: string;
    };
    const initiatorDoc = order.initiatorId as unknown as {
      _id: mongoose.Types.ObjectId;
      fullName: string;
      roomNumber: string;
    };

    return {
      id: order._id.toString(),
      title: order.title,
      platform: order.platform,
      category: order.category,
      hostelId: hostelDoc?._id ? hostelDoc._id.toString() : order.hostelId.toString(),
      hostel: hostelDoc?._id
        ? {
            id: hostelDoc._id.toString(),
            name: hostelDoc.name,
            code: hostelDoc.code,
            block: hostelDoc.block
          }
        : undefined,
      initiatorId: initiatorDoc?._id ? initiatorDoc._id.toString() : order.initiatorId.toString(),
      initiator: initiatorDoc?._id
        ? {
            id: initiatorDoc._id.toString(),
            fullName: initiatorDoc.fullName,
            roomNumber: initiatorDoc.roomNumber
          }
        : undefined,
      minimumAmountPaise: order.minimumAmountPaise,
      targetBasis: order.targetBasis,
      targetBasisNote: order.targetBasisNote,
      committedTotalPaise: order.committedTotalPaise,
      amountRemainingPaise: metrics.amountRemainingPaise,
      progressPercentage: metrics.progressPercentage,
      isTargetReached: metrics.isTargetReached,
      approvedItemsCount: order.approvedItemsCount,
      pendingRequestsCount,
      participantCount: order.participantCount,
      participantLimit: order.participantLimit ?? null,
      deadline: order.deadline,
      timeRemainingMs: metrics.timeRemainingMs,
      description: order.description,
      deliveryNotes: order.deliveryNotes,
      status: order.status,
      isJoined: viewer ? joinedOrderSet.has(order._id.toString()) : false,
      isInitiator: viewer
        ? (initiatorDoc?._id ? initiatorDoc._id.toString() : order.initiatorId.toString()) ===
          viewer.id
        : false,
      createdAt: order.createdAt
    };
  });
}

export async function joinOrderWindow(orderId: string, user: AuthenticatedUser) {
  validateObjectId(orderId, 'orderId');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await OrderWindow.findById(orderId).session(session);
      if (!order) {
        throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'OPEN') {
        throw new AppError(
          `Cannot join this order window because it is currently ${order.status}`,
          409,
          'ORDER_NOT_OPEN'
        );
      }

      if (new Date(order.deadline).getTime() <= Date.now()) {
        throw new AppError(
          'The joining deadline for this order window has already passed',
          409,
          'ORDER_DEADLINE_PASSED'
        );
      }

      if (order.hostelId.toString() !== user.hostelId) {
        throw new AppError(
          'You can only join order windows created for your registered hostel',
          403,
          'CROSS_HOSTEL_FORBIDDEN'
        );
      }

      const existingParticipant = await OrderParticipant.findOne({
        orderWindowId: order._id,
        userId: new mongoose.Types.ObjectId(user.id)
      }).session(session);

      if (existingParticipant && existingParticipant.status === 'ACTIVE') {
        throw new AppError(
          'You are already a participant in this order window',
          409,
          'ALREADY_JOINED'
        );
      }

      if (
        order.participantLimit !== null &&
        order.participantLimit !== undefined &&
        order.participantCount >= order.participantLimit
      ) {
        throw new AppError(
          'This order window has reached its maximum participant limit',
          409,
          'ORDER_FULL'
        );
      }

      if (existingParticipant && existingParticipant.status === 'LEFT') {
        existingParticipant.status = 'ACTIVE';
        existingParticipant.joinedAt = new Date();
        existingParticipant.leftAt = undefined;
        await existingParticipant.save({ session });
      } else {
        await OrderParticipant.create(
          [
            {
              orderWindowId: order._id,
              userId: new mongoose.Types.ObjectId(user.id),
              role: 'PARTICIPANT',
              status: 'ACTIVE',
              joinedAt: new Date()
            }
          ],
          { session }
        );
      }

      await OrderWindow.updateOne(
        { _id: order._id },
        { $inc: { participantCount: 1 } },
        { session }
      );

      await OrderActivity.create(
        [
          {
            orderWindowId: order._id,
            actorId: new mongoose.Types.ObjectId(user.id),
            action: 'PARTICIPANT_JOINED',
            message: `${user.fullName} joined the order window`
          }
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  emitOrderUpdate(orderId, 'order:participant-joined', { orderId, userId: user.id });
  return getOrderDetail(orderId, user);
}

export async function leaveOrderWindow(orderId: string, user: AuthenticatedUser) {
  validateObjectId(orderId, 'orderId');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await OrderWindow.findById(orderId).session(session);
      if (!order) {
        throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
      }

      if (order.initiatorId.toString() === user.id) {
        throw new AppError(
          'The initiator cannot leave their own order window. Cancel the order instead.',
          409,
          'INITIATOR_CANNOT_LEAVE'
        );
      }

      if (order.status !== 'OPEN') {
        throw new AppError(
          'Cannot leave an order window after it has been locked or finalized',
          409,
          'ORDER_NOT_OPEN'
        );
      }

      const participant = await OrderParticipant.findOne({
        orderWindowId: order._id,
        userId: new mongoose.Types.ObjectId(user.id),
        status: 'ACTIVE'
      }).session(session);

      if (!participant) {
        throw new AppError('You are not an active participant in this order', 404, 'NOT_PARTICIPANT');
      }

      const approvedCount = await OrderItem.countDocuments({
        orderWindowId: order._id,
        requesterId: new mongoose.Types.ObjectId(user.id),
        status: 'APPROVED'
      }).session(session);

      if (approvedCount > 0) {
        throw new AppError(
          'Cannot leave this order window because you have approved items committed to the group total',
          409,
          'HAS_APPROVED_ITEMS'
        );
      }

      await OrderItem.deleteMany({
        orderWindowId: order._id,
        requesterId: new mongoose.Types.ObjectId(user.id),
        status: { $in: ['PENDING', 'REJECTED'] }
      }).session(session);

      participant.status = 'LEFT';
      participant.leftAt = new Date();
      await participant.save({ session });

      await OrderWindow.updateOne(
        { _id: order._id, participantCount: { $gt: 1 } },
        { $inc: { participantCount: -1 } },
        { session }
      );

      await OrderActivity.create(
        [
          {
            orderWindowId: order._id,
            actorId: new mongoose.Types.ObjectId(user.id),
            action: 'PARTICIPANT_LEFT',
            message: `${user.fullName} left the order window`
          }
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  emitOrderUpdate(orderId, 'order:participant-left', { orderId, userId: user.id });
  return getOrderDetail(orderId, user);
}

export async function addItemRequest(
  orderId: string,
  user: AuthenticatedUser,
  input: {
    productName: string;
    productUrl?: string;
    unitPricePaise: number;
    quantity: number;
    variantDetails?: string;
    notes?: string;
  }
) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'OPEN') {
    throw new AppError(
      `Cannot submit item requests when the order window is ${order.status}`,
      409,
      'ORDER_NOT_OPEN'
    );
  }

  if (order.hostelId.toString() !== user.hostelId) {
    throw new AppError(
      'You cannot submit items to an order window from another hostel',
      403,
      'CROSS_HOSTEL_FORBIDDEN'
    );
  }

  const participation = await OrderParticipant.findOne({
    orderWindowId: order._id,
    userId: new mongoose.Types.ObjectId(user.id),
    status: 'ACTIVE'
  });

  if (!participation) {
    throw new AppError(
      'You must join the order window before submitting item requests',
      403,
      'NOT_A_PARTICIPANT'
    );
  }

  if (!Number.isInteger(input.unitPricePaise) || input.unitPricePaise <= 0) {
    throw new AppError('Unit price must be a positive integer in paise', 400, 'INVALID_PRICE');
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new AppError('Quantity must be a positive integer', 400, 'INVALID_QUANTITY');
  }

  const subtotalPaise = input.unitPricePaise * input.quantity;

  const item = await OrderItem.create({
    orderWindowId: order._id,
    requesterId: new mongoose.Types.ObjectId(user.id),
    productName: input.productName,
    productUrl: input.productUrl,
    unitPricePaise: input.unitPricePaise,
    quantity: input.quantity,
    subtotalPaise,
    variantDetails: input.variantDetails,
    notes: input.notes,
    status: 'PENDING'
  });

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ITEM_ADDED',
    message: `${user.fullName} requested ${input.quantity}x "${input.productName}"`,
    metadata: {
      itemId: item._id.toString(),
      subtotalPaise
    }
  });

  emitOrderUpdate(orderId, 'order:item-added', { orderId, itemId: item._id.toString() });
  return formatItemResponse(item, user, order.initiatorId.toString() === user.id);
}

export async function updateItemRequest(
  orderId: string,
  itemId: string,
  user: AuthenticatedUser,
  input: {
    productName?: string;
    productUrl?: string;
    unitPricePaise?: number;
    quantity?: number;
    variantDetails?: string;
    notes?: string;
  }
) {
  validateObjectId(orderId, 'orderId');
  validateObjectId(itemId, 'itemId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'OPEN') {
    throw new AppError(
      'Cannot modify item requests after the order window is locked or closed',
      409,
      'ORDER_NOT_OPEN'
    );
  }

  const item = await OrderItem.findOne({ _id: itemId, orderWindowId: order._id });
  if (!item) {
    throw new AppError('Item request not found in this order window', 404, 'ITEM_NOT_FOUND');
  }

  if (item.requesterId.toString() !== user.id) {
    throw new AppError(
      'Only the owner of an item request can modify it',
      403,
      'NOT_ITEM_OWNER'
    );
  }

  if (item.status !== 'PENDING') {
    throw new AppError(
      `Cannot directly edit an item with status ${item.status}. Approved items are locked into the group total, and rejected items must be resubmitted.`,
      409,
      'ITEM_NOT_EDITABLE'
    );
  }

  if (input.productName !== undefined) item.productName = input.productName;
  if ('productUrl' in input) item.productUrl = input.productUrl;
  if (input.unitPricePaise !== undefined) item.unitPricePaise = input.unitPricePaise;
  if (input.quantity !== undefined) item.quantity = input.quantity;
  if (input.variantDetails !== undefined) item.variantDetails = input.variantDetails;
  if (input.notes !== undefined) item.notes = input.notes;

  item.subtotalPaise = item.unitPricePaise * item.quantity;
  await item.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ITEM_UPDATED',
    message: `${user.fullName} updated their request for "${item.productName}"`,
    metadata: { itemId: item._id.toString(), subtotalPaise: item.subtotalPaise }
  });

  emitOrderUpdate(orderId, 'order:item-updated', { orderId, itemId: item._id.toString() });
  return formatItemResponse(item, user, order.initiatorId.toString() === user.id);
}

export async function deleteItemRequest(
  orderId: string,
  itemId: string,
  user: AuthenticatedUser
) {
  validateObjectId(orderId, 'orderId');
  validateObjectId(itemId, 'itemId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'OPEN') {
    throw new AppError('Cannot delete items when the order window is not OPEN', 409, 'ORDER_NOT_OPEN');
  }

  const item = await OrderItem.findOne({ _id: itemId, orderWindowId: order._id });
  if (!item) {
    throw new AppError('Item request not found in this order window', 404, 'ITEM_NOT_FOUND');
  }

  if (item.requesterId.toString() !== user.id) {
    throw new AppError('Only the owner of an item request can delete it', 403, 'NOT_ITEM_OWNER');
  }

  if (item.status !== 'PENDING') {
    throw new AppError(
      `Only pending item requests can be deleted (current status: ${item.status})`,
      409,
      'ITEM_NOT_DELETABLE'
    );
  }

  await OrderItem.deleteOne({ _id: item._id });

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ITEM_DELETED',
    message: `${user.fullName} removed their pending request for "${item.productName}"`
  });

  emitOrderUpdate(orderId, 'order:item-deleted', { orderId, itemId });
  return { deleted: true, itemId };
}

export async function resubmitItemRequest(
  orderId: string,
  itemId: string,
  user: AuthenticatedUser,
  input: {
    productName?: string;
    productUrl?: string;
    unitPricePaise?: number;
    quantity?: number;
    variantDetails?: string;
    notes?: string;
  }
) {
  validateObjectId(orderId, 'orderId');
  validateObjectId(itemId, 'itemId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'OPEN') {
    throw new AppError('Cannot resubmit items when the order is not OPEN', 409, 'ORDER_NOT_OPEN');
  }

  const item = await OrderItem.findOne({ _id: itemId, orderWindowId: order._id });
  if (!item) {
    throw new AppError('Item request not found in this order window', 404, 'ITEM_NOT_FOUND');
  }

  if (item.requesterId.toString() !== user.id) {
    throw new AppError('Only the item owner can resubmit this request', 403, 'NOT_ITEM_OWNER');
  }

  if (item.status !== 'REJECTED') {
    throw new AppError(
      'Only rejected item requests can be resubmitted',
      409,
      'ITEM_NOT_REJECTED'
    );
  }

  if (input.productName !== undefined) item.productName = input.productName;
  if ('productUrl' in input) item.productUrl = input.productUrl;
  if (input.unitPricePaise !== undefined) item.unitPricePaise = input.unitPricePaise;
  if (input.quantity !== undefined) item.quantity = input.quantity;
  if (input.variantDetails !== undefined) item.variantDetails = input.variantDetails;
  if (input.notes !== undefined) item.notes = input.notes;

  item.subtotalPaise = item.unitPricePaise * item.quantity;
  item.status = 'PENDING';
  item.rejectionReason = undefined;
  item.reviewerId = undefined;
  item.reviewedAt = undefined;
  item.resubmissionCount = (item.resubmissionCount || 0) + 1;

  await item.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ITEM_RESUBMITTED',
    message: `${user.fullName} revised and resubmitted "${item.productName}" for review`,
    metadata: { itemId: item._id.toString(), subtotalPaise: item.subtotalPaise }
  });

  emitOrderUpdate(orderId, 'order:item-resubmitted', { orderId, itemId: item._id.toString() });
  return formatItemResponse(item, user, order.initiatorId.toString() === user.id);
}

/**
 * Core Feature E: Initiator Approval Workflow
 * Uses a MongoDB multi-document transaction with atomic conditional updates
 * and transient conflict retry handling so concurrent approvals never double-count.
 */
export async function approveItemRequest(
  orderId: string,
  itemId: string,
  user: AuthenticatedUser,
  options?: { simulateFailureAfterItemUpdate?: boolean }
) {
  // 1. Validate order and item identifiers
  validateObjectId(orderId, 'orderId');
  validateObjectId(itemId, 'itemId');

  const maxRetries = 4;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const session = await mongoose.startSession();
    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });

      const order = await OrderWindow.findById(orderId).session(session);
      if (!order) {
        throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
      }

      // 2. Verify the authenticated user is the order initiator
      if (order.initiatorId.toString() !== user.id) {
        throw new AppError(
          'Only the initiator of this order window can approve item requests',
          403,
          'FORBIDDEN_NOT_INITIATOR'
        );
      }

      // 3. Verify the order is still OPEN
      if (order.status !== 'OPEN') {
        throw new AppError(
          `Cannot approve items because the order window is ${order.status}`,
          409,
          'ORDER_NOT_OPEN'
        );
      }

      // 4. Verify the item belongs to that order
      const existingItem = await OrderItem.findOne({
        _id: itemId,
        orderWindowId: order._id
      }).session(session);

      if (!existingItem) {
        throw new AppError(
          'Item request not found in this order window',
          404,
          'ITEM_NOT_FOUND_IN_ORDER'
        );
      }

      // 5. Verify the item is PENDING
      if (existingItem.status !== 'PENDING') {
        throw new AppError(
          `Item request has already been reviewed (status: ${existingItem.status})`,
          409,
          'ITEM_ALREADY_REVIEWED'
        );
      }

      // 6. Validate price and quantity
      if (
        !Number.isInteger(existingItem.unitPricePaise) ||
        existingItem.unitPricePaise <= 0 ||
        !Number.isInteger(existingItem.quantity) ||
        existingItem.quantity <= 0
      ) {
        throw new AppError(
          'Item has invalid unit price or quantity',
          400,
          'INVALID_ITEM_DIMENSIONS'
        );
      }

      const contributionPaise = existingItem.unitPricePaise * existingItem.quantity;
      const reviewedAt = new Date();

      // 7. Transition the item to APPROVED exactly once via atomic conditional update
      const approvedItem = await OrderItem.findOneAndUpdate(
        {
          _id: existingItem._id,
          orderWindowId: order._id,
          status: 'PENDING'
        },
        {
          $set: {
            status: 'APPROVED',
            subtotalPaise: contributionPaise,
            reviewerId: new mongoose.Types.ObjectId(user.id),
            reviewedAt,
            rejectionReason: undefined
          }
        },
        { new: true, session }
      );

      if (!approvedItem) {
        throw new AppError(
          'Item request was concurrently modified or already reviewed',
          409,
          'ITEM_ALREADY_REVIEWED'
        );
      }

      // Test hook to verify transaction rollback safety (Requirement 18.14)
      if (options?.simulateFailureAfterItemUpdate) {
        throw new AppError(
          'Simulated mid-transaction failure before aggregate commit',
          500,
          'SIMULATED_TRANSACTION_FAILURE'
        );
      }

      // 8. Add its subtotal to the committed group total atomically
      const updatedOrder = await OrderWindow.findOneAndUpdate(
        {
          _id: order._id,
          status: 'OPEN'
        },
        {
          $inc: {
            committedTotalPaise: contributionPaise,
            approvedItemsCount: 1
          }
        },
        { new: true, session }
      );

      if (!updatedOrder) {
        throw new AppError(
          'Order window state changed concurrently and is no longer OPEN',
          409,
          'ORDER_STATE_CONFLICT'
        );
      }

      // 9. Record activity
      await OrderActivity.create(
        [
          {
            orderWindowId: order._id,
            actorId: new mongoose.Types.ObjectId(user.id),
            action: 'ITEM_APPROVED',
            message: `${user.fullName} approved "${approvedItem.productName}" (x${approvedItem.quantity})`,
            metadata: {
              itemId: approvedItem._id.toString(),
              contributionPaise,
              newCommittedTotalPaise: updatedOrder.committedTotalPaise
            }
          }
        ],
        { session }
      );

      await session.commitTransaction();

      const pendingCount = await OrderItem.countDocuments({
        orderWindowId: order._id,
        status: 'PENDING'
      });
      const rejectedCount = await OrderItem.countDocuments({
        orderWindowId: order._id,
        status: 'REJECTED'
      });

      const orderSummary = computeOrderMetrics(updatedOrder, pendingCount, rejectedCount);

      emitOrderUpdate(orderId, 'order:item-approved', {
        orderId,
        itemId: approvedItem._id.toString(),
        orderSummary
      });

      // 10. Return the updated item and order summary
      return {
        item: await formatItemResponse(approvedItem, user, true),
        orderSummary: {
          orderId: updatedOrder._id.toString(),
          status: updatedOrder.status,
          ...orderSummary
        }
      };
    } catch (err: unknown) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const isTransientConflict =
        typeof err === 'object' &&
        err !== null &&
        (('hasErrorLabel' in err &&
          typeof (err as { hasErrorLabel: (l: string) => boolean }).hasErrorLabel === 'function' &&
          (err as { hasErrorLabel: (l: string) => boolean }).hasErrorLabel(
            'TransientTransactionError'
          )) ||
          ('code' in err && (err as { code?: number }).code === 112));

      if (isTransientConflict && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        continue;
      }

      throw err;
    } finally {
      await session.endSession();
    }
  }

  throw new AppError(
    'Could not complete item approval due to high concurrency. Please try again.',
    409,
    'TRANSACTION_CONFLICT'
  );
}

/**
 * Core Feature F: Rejection Workflow
 */
export async function rejectItemRequest(
  orderId: string,
  itemId: string,
  user: AuthenticatedUser,
  rejectionReason?: string
) {
  validateObjectId(orderId, 'orderId');
  validateObjectId(itemId, 'itemId');

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const order = await OrderWindow.findById(orderId).session(session);
    if (!order) {
      throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.initiatorId.toString() !== user.id) {
      throw new AppError(
        'Only the initiator of this order window can reject item requests',
        403,
        'FORBIDDEN_NOT_INITIATOR'
      );
    }

    if (order.status !== 'OPEN') {
      throw new AppError(
        `Cannot reject items when the order window is ${order.status}`,
        409,
        'ORDER_NOT_OPEN'
      );
    }

    const existingItem = await OrderItem.findOne({
      _id: itemId,
      orderWindowId: order._id
    }).session(session);

    if (!existingItem) {
      throw new AppError(
        'Item request not found in this order window',
        404,
        'ITEM_NOT_FOUND_IN_ORDER'
      );
    }

    if (existingItem.status !== 'PENDING') {
      throw new AppError(
        `Item request has already been reviewed (status: ${existingItem.status})`,
        409,
        'ITEM_ALREADY_REVIEWED'
      );
    }

    const rejectedItem = await OrderItem.findOneAndUpdate(
      {
        _id: existingItem._id,
        orderWindowId: order._id,
        status: 'PENDING'
      },
      {
        $set: {
          status: 'REJECTED',
          reviewerId: new mongoose.Types.ObjectId(user.id),
          reviewedAt: new Date(),
          rejectionReason: rejectionReason?.trim() || 'Not approved by initiator'
        }
      },
      { new: true, session }
    );

    if (!rejectedItem) {
      throw new AppError(
        'Item request has already been reviewed',
        409,
        'ITEM_ALREADY_REVIEWED'
      );
    }

    await OrderActivity.create(
      [
        {
          orderWindowId: order._id,
          actorId: new mongoose.Types.ObjectId(user.id),
          action: 'ITEM_REJECTED',
          message: `${user.fullName} rejected "${rejectedItem.productName}"`,
          metadata: {
            itemId: rejectedItem._id.toString(),
            rejectionReason: rejectedItem.rejectionReason
          }
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const pendingCount = await OrderItem.countDocuments({
      orderWindowId: order._id,
      status: 'PENDING'
    });
    const rejectedCount = await OrderItem.countDocuments({
      orderWindowId: order._id,
      status: 'REJECTED'
    });
    const orderSummary = computeOrderMetrics(order, pendingCount, rejectedCount);

    emitOrderUpdate(orderId, 'order:item-rejected', {
      orderId,
      itemId: rejectedItem._id.toString(),
      orderSummary
    });

    return {
      item: await formatItemResponse(rejectedItem, user, true),
      orderSummary: {
        orderId: order._id.toString(),
        status: order.status,
        ...orderSummary
      }
    };
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Reconciliation method (Section 10):
 * Compares the stored OrderWindow aggregate against actual APPROVED OrderItem records.
 */
export async function reconcileOrderAggregate(orderId: string) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  const approvedItems = await OrderItem.find({
    orderWindowId: order._id,
    status: 'APPROVED'
  }).lean();

  const calculatedTotalPaise = approvedItems.reduce(
    (sum, item) => sum + item.unitPricePaise * item.quantity,
    0
  );
  const calculatedCount = approvedItems.length;

  const isConsistent =
    order.committedTotalPaise === calculatedTotalPaise &&
    order.approvedItemsCount === calculatedCount;

  return {
    orderId: order._id.toString(),
    storedCommittedTotalPaise: order.committedTotalPaise,
    calculatedTotalPaise,
    storedApprovedItemsCount: order.approvedItemsCount,
    calculatedCount,
    isConsistent
  };
}

/**
 * Core Feature H: Lock and Finalize Order Lifecycle
 * Lifecycle: OPEN -> LOCKED -> CONFIRMED -> PURCHASED -> COMPLETED (or CANCELLED)
 */
export async function lockOrderWindow(
  orderId: string,
  user: AuthenticatedUser,
  acknowledgePending = false
) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.initiatorId.toString() !== user.id) {
    throw new AppError('Only the initiator can lock this order window', 403, 'FORBIDDEN_NOT_INITIATOR');
  }

  if (order.status !== 'OPEN') {
    throw new AppError(
      `Only an OPEN order window can be locked (current status: ${order.status})`,
      409,
      'INVALID_LIFECYCLE_TRANSITION'
    );
  }

  const pendingCount = await OrderItem.countDocuments({
    orderWindowId: order._id,
    status: 'PENDING'
  });

  if (pendingCount > 0 && !acknowledgePending) {
    throw new AppError(
      `There are still ${pendingCount} pending item request(s). Please review them or confirm locking with acknowledgePending=true.`,
      409,
      'PENDING_ITEMS_EXIST',
      { pendingCount }
    );
  }

  order.status = 'LOCKED';
  order.lockedAt = new Date();
  await order.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ORDER_LOCKED',
    message: `${user.fullName} locked the order window with ${order.approvedItemsCount} approved item(s)`
  });

  emitOrderUpdate(orderId, 'order:status-changed', { orderId, status: 'LOCKED' });
  return getOrderDetail(orderId, user);
}

export async function confirmOrderWindow(orderId: string, user: AuthenticatedUser) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.initiatorId.toString() !== user.id) {
    throw new AppError('Only the initiator can confirm this order', 403, 'FORBIDDEN_NOT_INITIATOR');
  }

  if (order.status !== 'LOCKED') {
    throw new AppError(
      `Order must be LOCKED before it can be CONFIRMED (current status: ${order.status})`,
      409,
      'INVALID_LIFECYCLE_TRANSITION'
    );
  }

  if (order.approvedItemsCount === 0) {
    throw new AppError(
      'Cannot confirm an order window with zero approved items',
      409,
      'NO_APPROVED_ITEMS'
    );
  }

  order.status = 'CONFIRMED';
  order.confirmedAt = new Date();
  await order.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ORDER_CONFIRMED',
    message: `${user.fullName} confirmed the consolidated order list for purchase`
  });

  emitOrderUpdate(orderId, 'order:status-changed', { orderId, status: 'CONFIRMED' });
  return getOrderDetail(orderId, user);
}

export async function markOrderPurchased(
  orderId: string,
  user: AuthenticatedUser,
  input: { finalActualTotalPaise: number; purchaseNotes?: string }
) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.initiatorId.toString() !== user.id) {
    throw new AppError(
      'Only the initiator can record the external purchase',
      403,
      'FORBIDDEN_NOT_INITIATOR'
    );
  }

  if (order.status !== 'LOCKED' && order.status !== 'CONFIRMED') {
    throw new AppError(
      `Order must be LOCKED or CONFIRMED before marking as PURCHASED (current status: ${order.status})`,
      409,
      'INVALID_LIFECYCLE_TRANSITION'
    );
  }

  if (order.approvedItemsCount === 0) {
    throw new AppError(
      'Cannot mark an order with zero approved items as purchased',
      409,
      'NO_APPROVED_ITEMS'
    );
  }

  order.status = 'PURCHASED';
  order.finalActualTotalPaise = input.finalActualTotalPaise;
  if (input.purchaseNotes !== undefined) {
    order.purchaseNotes = input.purchaseNotes;
  }
  if (!order.confirmedAt) {
    order.confirmedAt = new Date();
  }
  order.purchasedAt = new Date();
  await order.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ORDER_PURCHASED',
    message: `${user.fullName} marked the order as purchased on ${order.platform}`,
    metadata: {
      finalActualTotalPaise: input.finalActualTotalPaise
    }
  });

  emitOrderUpdate(orderId, 'order:status-changed', { orderId, status: 'PURCHASED' });
  return getOrderDetail(orderId, user);
}

export async function completeOrderWindow(orderId: string, user: AuthenticatedUser) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.initiatorId.toString() !== user.id) {
    throw new AppError('Only the initiator can complete this order', 403, 'FORBIDDEN_NOT_INITIATOR');
  }

  if (order.status !== 'PURCHASED') {
    throw new AppError(
      `Order must be PURCHASED before marking as COMPLETED (current status: ${order.status})`,
      409,
      'INVALID_LIFECYCLE_TRANSITION'
    );
  }

  order.status = 'COMPLETED';
  order.completedAt = new Date();
  await order.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ORDER_COMPLETED',
    message: `${user.fullName} marked the order as delivered and completed`
  });

  emitOrderUpdate(orderId, 'order:status-changed', { orderId, status: 'COMPLETED' });
  return getOrderDetail(orderId, user);
}

export async function cancelOrderWindow(
  orderId: string,
  user: AuthenticatedUser,
  cancellationReason?: string
) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId);
  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.initiatorId.toString() !== user.id && user.role !== 'ADMIN') {
    throw new AppError(
      'Only the initiator or an administrator can cancel this order window',
      403,
      'FORBIDDEN_NOT_INITIATOR'
    );
  }

  if (order.status === 'PURCHASED' || order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    throw new AppError(
      `Cannot cancel an order window with status ${order.status}`,
      409,
      'INVALID_LIFECYCLE_TRANSITION'
    );
  }

  order.status = 'CANCELLED';
  order.cancellationReason = cancellationReason?.trim() || 'Cancelled by initiator';
  order.cancelledAt = new Date();
  await order.save();

  await OrderActivity.create({
    orderWindowId: order._id,
    actorId: new mongoose.Types.ObjectId(user.id),
    action: 'ORDER_CANCELLED',
    message: `${user.fullName} cancelled the order window (${order.cancellationReason})`
  });

  emitOrderUpdate(orderId, 'order:status-changed', { orderId, status: 'CANCELLED' });
  return getOrderDetail(orderId, user);
}

/**
 * Core Feature I: Order Detail & Consolidated Purchase Summary
 * Enforces privacy rules: phone numbers are never exposed to all participants;
 * the initiator sees room numbers and coordination details.
 */
export async function getOrderDetail(orderId: string, viewer: AuthenticatedUser) {
  validateObjectId(orderId, 'orderId');

  const order = await OrderWindow.findById(orderId)
    .populate('hostelId', 'name code block address')
    .populate('initiatorId', 'fullName roomNumber phoneNumber');

  if (!order) {
    throw new AppError('Order window not found', 404, 'ORDER_NOT_FOUND');
  }

  const isInitiator =
    (order.initiatorId as unknown as { _id: mongoose.Types.ObjectId })._id.toString() ===
      viewer.id || viewer.role === 'ADMIN';

  const participants = await OrderParticipant.find({
    orderWindowId: order._id,
    status: 'ACTIVE'
  })
    .populate('userId', 'fullName roomNumber phoneNumber')
    .sort({ joinedAt: 1 })
    .lean();

  const isParticipant = participants.some((p) => {
    const u = p.userId as unknown as { _id: mongoose.Types.ObjectId };
    return u?._id?.toString() === viewer.id;
  });

  const allItems = await OrderItem.find({ orderWindowId: order._id })
    .populate('requesterId', 'fullName roomNumber phoneNumber')
    .populate('reviewerId', 'fullName')
    .sort({ createdAt: 1 })
    .lean();

  const activities = await OrderActivity.find({ orderWindowId: order._id })
    .populate('actorId', 'fullName')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const serializeUserForViewer = (
    u: { _id: mongoose.Types.ObjectId; fullName: string; roomNumber: string; phoneNumber?: string },
    targetUserId: string
  ) => {
    const isSelf = targetUserId === viewer.id;
    return {
      id: targetUserId,
      fullName: u.fullName,
      // Initiator and self see room number; fellow hostel members see room number for delivery drop-off coordination
      roomNumber: isInitiator || isSelf || isParticipant ? u.roomNumber : undefined,
      // Phone number is strictly restricted to initiator (for order drop-off/payment collection) and self!
      phoneNumber: isInitiator || isSelf ? u.phoneNumber : undefined
    };
  };

  const formattedItems = allItems
    .filter((item) => {
      const reqUser = item.requesterId as unknown as { _id: mongoose.Types.ObjectId };
      const reqUserId = reqUser?._id?.toString() || item.requesterId.toString();
      // Approved items are visible to everyone in the order; Pending/Rejected items are visible to the initiator and the item's owner
      if (item.status === 'APPROVED') return true;
      if (isInitiator) return true;
      return reqUserId === viewer.id;
    })
    .map((item) => {
      const reqUser = item.requesterId as unknown as {
        _id: mongoose.Types.ObjectId;
        fullName: string;
        roomNumber: string;
        phoneNumber?: string;
      };
      const reqUserId = reqUser?._id?.toString() || item.requesterId.toString();
      const revUser = item.reviewerId as unknown as {
        _id: mongoose.Types.ObjectId;
        fullName: string;
      } | null;

      return {
        id: item._id.toString(),
        orderWindowId: item.orderWindowId.toString(),
        productName: item.productName,
        productUrl: item.productUrl,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
        subtotalPaise: item.subtotalPaise,
        variantDetails: item.variantDetails,
        notes: item.notes,
        status: item.status,
        rejectionReason: item.rejectionReason,
        resubmissionCount: item.resubmissionCount || 0,
        requesterId: reqUserId,
        requester: reqUser?._id ? serializeUserForViewer(reqUser, reqUserId) : undefined,
        reviewer: revUser?._id
          ? { id: revUser._id.toString(), fullName: revUser.fullName }
          : undefined,
        reviewedAt: item.reviewedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });

  const approvedItems = formattedItems.filter((i) => i.status === 'APPROVED');
  const pendingItems = formattedItems.filter((i) => i.status === 'PENDING');
  const rejectedItems = formattedItems.filter((i) => i.status === 'REJECTED');
  const myItems = formattedItems.filter((i) => i.requesterId === viewer.id);

  const totalPendingInOrder = allItems.filter((i) => i.status === 'PENDING').length;
  const totalRejectedInOrder = allItems.filter((i) => i.status === 'REJECTED').length;

  const metrics = computeOrderMetrics(order, totalPendingInOrder, totalRejectedInOrder);

  // Build Consolidated Purchase Summary (grouped by member and by product)
  const memberBreakdownMap = new Map<
    string,
    {
      user: { id: string; fullName: string; roomNumber?: string; phoneNumber?: string };
      approvedSubtotalPaise: number;
      itemsCount: number;
      items: typeof approvedItems;
    }
  >();

  for (const item of approvedItems) {
    if (!item.requester) continue;
    const existing = memberBreakdownMap.get(item.requesterId);
    if (existing) {
      existing.approvedSubtotalPaise += item.subtotalPaise;
      existing.itemsCount += item.quantity;
      existing.items.push(item);
    } else {
      memberBreakdownMap.set(item.requesterId, {
        user: item.requester,
        approvedSubtotalPaise: item.subtotalPaise,
        itemsCount: item.quantity,
        items: [item]
      });
    }
  }

  const hostelDoc = order.hostelId as unknown as {
    _id: mongoose.Types.ObjectId;
    name: string;
    code: string;
    block: string;
    address: string;
  };
  const initiatorDoc = order.initiatorId as unknown as {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    roomNumber: string;
    phoneNumber?: string;
  };

  return {
    id: order._id.toString(),
    title: order.title,
    platform: order.platform,
    category: order.category,
    hostelId: hostelDoc._id.toString(),
    hostel: {
      id: hostelDoc._id.toString(),
      name: hostelDoc.name,
      code: hostelDoc.code,
      block: hostelDoc.block,
      address: hostelDoc.address
    },
    initiatorId: initiatorDoc._id.toString(),
    initiator: {
      id: initiatorDoc._id.toString(),
      fullName: initiatorDoc.fullName,
      roomNumber: initiatorDoc.roomNumber,
      // Initiator phone only shown to joined participants once order is confirmed/purchased or to self
      phoneNumber:
        isInitiator ||
        (isParticipant && ['LOCKED', 'CONFIRMED', 'PURCHASED', 'COMPLETED'].includes(order.status))
          ? initiatorDoc.phoneNumber
          : undefined
    },
    minimumAmountPaise: order.minimumAmountPaise,
    targetBasis: order.targetBasis,
    targetBasisNote: order.targetBasisNote,
    committedTotalPaise: order.committedTotalPaise,
    amountRemainingPaise: metrics.amountRemainingPaise,
    progressPercentage: metrics.progressPercentage,
    isTargetReached: metrics.isTargetReached,
    approvedItemsCount: order.approvedItemsCount,
    pendingRequestsCount: totalPendingInOrder,
    rejectedRequestsCount: totalRejectedInOrder,
    participantCount: order.participantCount,
    participantLimit: order.participantLimit ?? null,
    deadline: order.deadline,
    timeRemainingMs: metrics.timeRemainingMs,
    description: order.description,
    deliveryNotes: order.deliveryNotes,
    status: order.status,
    finalActualTotalPaise: order.finalActualTotalPaise ?? null,
    purchaseNotes: order.purchaseNotes,
    cancellationReason: order.cancellationReason,
    lockedAt: order.lockedAt,
    confirmedAt: order.confirmedAt,
    purchasedAt: order.purchasedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    viewerContext: {
      isInitiator,
      isParticipant,
      canJoin:
        !isParticipant &&
        order.status === 'OPEN' &&
        order.hostelId._id.toString() === viewer.hostelId &&
        new Date(order.deadline).getTime() > Date.now() &&
        (order.participantLimit === null ||
          order.participantLimit === undefined ||
          order.participantCount < order.participantLimit),
      canLeave:
        isParticipant &&
        !isInitiator &&
        order.status === 'OPEN' &&
        !myItems.some((i) => i.status === 'APPROVED')
    },
    participants: participants.map((p) => {
      const u = p.userId as unknown as {
        _id: mongoose.Types.ObjectId;
        fullName: string;
        roomNumber: string;
        phoneNumber?: string;
      };
      const uid = u._id.toString();
      return {
        id: p._id.toString(),
        role: p.role,
        joinedAt: p.joinedAt,
        user: serializeUserForViewer(u, uid)
      };
    }),
    approvedItems,
    pendingItems: isInitiator ? pendingItems : myItems.filter((i) => i.status === 'PENDING'),
    rejectedItems: isInitiator ? rejectedItems : myItems.filter((i) => i.status === 'REJECTED'),
    myItems,
    consolidatedSummary: {
      platform: order.platform,
      hostelName: hostelDoc.name,
      status: order.status,
      committedTotalPaise: order.committedTotalPaise,
      minimumAmountPaise: order.minimumAmountPaise,
      finalActualTotalPaise: order.finalActualTotalPaise ?? null,
      purchaseNotes: order.purchaseNotes,
      totalApprovedUnits: approvedItems.reduce((acc, i) => acc + i.quantity, 0),
      totalApprovedLineItems: approvedItems.length,
      memberShares: Array.from(memberBreakdownMap.values())
    },
    activities: activities.map((act) => {
      const actor = act.actorId as unknown as { _id: mongoose.Types.ObjectId; fullName: string };
      return {
        id: act._id.toString(),
        action: act.action,
        message: act.message,
        actorName: actor?.fullName || 'Member',
        createdAt: act.createdAt
      };
    })
  };
}

/**
 * Core Feature J: Dashboard Aggregation
 */
export async function getDashboardData(user: AuthenticatedUser) {
  const userObjId = new mongoose.Types.ObjectId(user.id);

  // Participations of the user
  const participations = await OrderParticipant.find({
    userId: userObjId,
    status: 'ACTIVE'
  }).lean();
  const joinedOrderIds = participations.map((p) => p.orderWindowId);

  const allRelatedOrders = await listOrderWindows({}, user);
  const myActiveOrders = allRelatedOrders.filter(
    (o) =>
      joinedOrderIds.some((id) => id.toString() === o.id) &&
      ['OPEN', 'LOCKED', 'CONFIRMED', 'PURCHASED'].includes(o.status)
  );

  const initiatedOrders = allRelatedOrders.filter((o) => o.initiatorId === user.id);

  const recentlyCompletedOrders = allRelatedOrders.filter(
    (o) =>
      joinedOrderIds.some((id) => id.toString() === o.id) &&
      ['COMPLETED', 'CANCELLED'].includes(o.status)
  );

  // Pending requests requiring my approval (across all OPEN orders I initiated)
  const myOpenInitiatedOrderIds = initiatedOrders
    .filter((o) => o.status === 'OPEN')
    .map((o) => new mongoose.Types.ObjectId(o.id));

  const pendingForMyApprovalRaw = await OrderItem.find({
    orderWindowId: { $in: myOpenInitiatedOrderIds },
    status: 'PENDING'
  })
    .populate('requesterId', 'fullName roomNumber')
    .populate('orderWindowId', 'title platform status minimumAmountPaise committedTotalPaise')
    .sort({ createdAt: 1 })
    .lean();

  const pendingForMyApproval = pendingForMyApprovalRaw.map((item) => {
    const reqUser = item.requesterId as unknown as {
      _id: mongoose.Types.ObjectId;
      fullName: string;
      roomNumber: string;
    };
    const ord = item.orderWindowId as unknown as {
      _id: mongoose.Types.ObjectId;
      title: string;
      platform: string;
      status: string;
      minimumAmountPaise: number;
      committedTotalPaise: number;
    };
    return {
      id: item._id.toString(),
      orderWindowId: ord._id.toString(),
      orderTitle: ord.title,
      platform: ord.platform,
      productName: item.productName,
      productUrl: item.productUrl,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      subtotalPaise: item.subtotalPaise,
      variantDetails: item.variantDetails,
      notes: item.notes,
      status: item.status,
      requester: {
        id: reqUser._id.toString(),
        fullName: reqUser.fullName,
        roomNumber: reqUser.roomNumber
      },
      createdAt: item.createdAt
    };
  });

  // All my submitted items across orders
  const mySubmittedItemsRaw = await OrderItem.find({
    requesterId: userObjId
  })
    .populate('orderWindowId', 'title platform status hostelId initiatorId')
    .sort({ updatedAt: -1 })
    .lean();

  const mySubmittedItems = mySubmittedItemsRaw
    .filter((item) => Boolean(item.orderWindowId))
    .map((item) => {
      const ord = item.orderWindowId as unknown as {
        _id: mongoose.Types.ObjectId;
        title: string;
        platform: string;
        status: string;
      };
      return {
        id: item._id.toString(),
        orderWindowId: ord._id.toString(),
        orderTitle: ord.title,
        platform: ord.platform,
        orderStatus: ord.status,
        productName: item.productName,
        productUrl: item.productUrl,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
        subtotalPaise: item.subtotalPaise,
        variantDetails: item.variantDetails,
        notes: item.notes,
        status: item.status,
        rejectionReason: item.rejectionReason,
        resubmissionCount: item.resubmissionCount || 0,
        reviewedAt: item.reviewedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });

  return {
    myActiveOrders,
    initiatedOrders,
    pendingForMyApproval,
    mySubmittedItems,
    myItemsAwaitingReview: mySubmittedItems.filter((i) => i.status === 'PENDING'),
    recentlyCompletedOrders
  };
}

async function formatItemResponse(
  item: IOrderItem,
  viewer: AuthenticatedUser,
  isViewerInitiator: boolean
) {
  const requester = await User.findById(item.requesterId).lean();
  const isSelf = item.requesterId.toString() === viewer.id;

  return {
    id: item._id.toString(),
    orderWindowId: item.orderWindowId.toString(),
    requesterId: item.requesterId.toString(),
    requester: requester
      ? {
          id: requester._id.toString(),
          fullName: requester.fullName,
          roomNumber: isViewerInitiator || isSelf ? requester.roomNumber : undefined,
          phoneNumber: isViewerInitiator || isSelf ? requester.phoneNumber : undefined
        }
      : undefined,
    productName: item.productName,
    productUrl: item.productUrl,
    unitPricePaise: item.unitPricePaise,
    quantity: item.quantity,
    subtotalPaise: item.subtotalPaise,
    variantDetails: item.variantDetails,
    notes: item.notes,
    status: item.status,
    reviewerId: item.reviewerId?.toString(),
    reviewedAt: item.reviewedAt,
    rejectionReason: item.rejectionReason,
    resubmissionCount: item.resubmissionCount || 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

