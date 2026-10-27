import { Request, Response, NextFunction } from 'express';
import {
  createOrderWindowSchema,
  listOrderWindowsQuerySchema,
  createItemSchema,
  updateItemSchema,
  resubmitItemSchema,
  rejectItemSchema,
  lockOrderSchema,
  markPurchasedSchema,
  cancelOrderSchema
} from '../validators/order.validator.js';
import {
  createOrderWindow,
  listOrderWindows,
  getOrderDetail,
  joinOrderWindow,
  leaveOrderWindow,
  addItemRequest,
  updateItemRequest,
  deleteItemRequest,
  resubmitItemRequest,
  approveItemRequest,
  rejectItemRequest,
  lockOrderWindow,
  confirmOrderWindow,
  markOrderPurchased,
  completeOrderWindow,
  cancelOrderWindow,
  getDashboardData,
  reconcileOrderAggregate
} from '../services/order.service.js';
import { AppError } from '../utils/errors.js';

function ensureUser(req: Request) {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }
  return req.user;
}

export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = createOrderWindowSchema.parse(req.body);
    const order = await createOrderWindow(user, validated);
    res.status(201).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const filters = listOrderWindowsQuerySchema.parse(req.query);
    const orders = await listOrderWindows(filters, user);
    res.status(200).json({
      success: true,
      data: { orders }
    });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const dashboard = await getDashboardData(user);
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const order = await getOrderDetail(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const detail = await getOrderDetail(String(req.params.orderId), user);
    const reconciliation = await reconcileOrderAggregate(String(req.params.orderId));
    res.status(200).json({
      success: true,
      data: {
        summary: detail.consolidatedSummary,
        reconciliation,
        metrics: {
          committedTotalPaise: detail.committedTotalPaise,
          minimumAmountPaise: detail.minimumAmountPaise,
          amountRemainingPaise: detail.amountRemainingPaise,
          progressPercentage: detail.progressPercentage,
          isTargetReached: detail.isTargetReached,
          approvedItemsCount: detail.approvedItemsCount,
          pendingRequestsCount: detail.pendingRequestsCount,
          participantCount: detail.participantCount
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderActivityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const detail = await getOrderDetail(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: { activities: detail.activities }
    });
  } catch (err) {
    next(err);
  }
}

export async function joinOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const order = await joinOrderWindow(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function leaveOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const order = await leaveOrderWindow(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function listOrderItemsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const detail = await getOrderDetail(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: {
        approvedItems: detail.approvedItems,
        pendingItems: detail.pendingItems,
        rejectedItems: detail.rejectedItems,
        myItems: detail.myItems
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function addItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = createItemSchema.parse(req.body);
    const item = await addItemRequest(String(req.params.orderId), user, validated);
    res.status(201).json({
      success: true,
      data: { item }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = updateItemSchema.parse(req.body);
    const item = await updateItemRequest(
      String(req.params.orderId),
      String(req.params.itemId),
      user,
      validated
    );
    res.status(200).json({
      success: true,
      data: { item }
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const result = await deleteItemRequest(
      String(req.params.orderId),
      String(req.params.itemId),
      user
    );
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function resubmitItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = resubmitItemSchema.parse(req.body || {});
    const item = await resubmitItemRequest(
      String(req.params.orderId),
      String(req.params.itemId),
      user,
      validated
    );
    res.status(200).json({
      success: true,
      data: { item }
    });
  } catch (err) {
    next(err);
  }
}

export async function approveItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const result = await approveItemRequest(
      String(req.params.orderId),
      String(req.params.itemId),
      user
    );
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectItemHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = rejectItemSchema.parse(req.body || {});
    const result = await rejectItemRequest(
      String(req.params.orderId),
      String(req.params.itemId),
      user,
      validated.rejectionReason
    );
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function lockOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = lockOrderSchema.parse(req.body || {});
    const order = await lockOrderWindow(
      String(req.params.orderId),
      user,
      validated.acknowledgePending
    );
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const order = await confirmOrderWindow(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function markPurchasedHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = markPurchasedSchema.parse(req.body);
    const order = await markOrderPurchased(String(req.params.orderId), user, validated);
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function completeOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const order = await completeOrderWindow(String(req.params.orderId), user);
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = ensureUser(req);
    const validated = cancelOrderSchema.parse(req.body || {});
    const order = await cancelOrderWindow(
      String(req.params.orderId),
      user,
      validated.cancellationReason
    );
    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
}

