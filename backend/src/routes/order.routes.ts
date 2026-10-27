import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createOrderHandler,
  listOrdersHandler,
  getDashboardHandler,
  getOrderDetailHandler,
  getOrderSummaryHandler,
  getOrderActivityHandler,
  joinOrderHandler,
  leaveOrderHandler,
  listOrderItemsHandler,
  addItemHandler,
  updateItemHandler,
  deleteItemHandler,
  resubmitItemHandler,
  approveItemHandler,
  rejectItemHandler,
  lockOrderHandler,
  confirmOrderHandler,
  markPurchasedHandler,
  completeOrderHandler,
  cancelOrderHandler
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// Dashboard overview
router.get('/dashboard', getDashboardHandler);

// Order window feed & creation
router.get('/', listOrdersHandler);
router.post('/', createOrderHandler);

// Order window detail, summary & activity
router.get('/:orderId', getOrderDetailHandler);
router.get('/:orderId/summary', getOrderSummaryHandler);
router.get('/:orderId/activity', getOrderActivityHandler);

// Membership
router.post('/:orderId/join', joinOrderHandler);
router.post('/:orderId/leave', leaveOrderHandler);

// Item requests
router.get('/:orderId/items', listOrderItemsHandler);
router.post('/:orderId/items', addItemHandler);
router.patch('/:orderId/items/:itemId', updateItemHandler);
router.delete('/:orderId/items/:itemId', deleteItemHandler);
router.post('/:orderId/items/:itemId/resubmit', resubmitItemHandler);

// Initiator moderation
router.post('/:orderId/items/:itemId/approve', approveItemHandler);
router.post('/:orderId/items/:itemId/reject', rejectItemHandler);

// Order lifecycle transitions
router.post('/:orderId/lock', lockOrderHandler);
router.post('/:orderId/confirm', confirmOrderHandler);
router.post('/:orderId/purchase', markPurchasedHandler);
router.post('/:orderId/complete', completeOrderHandler);
router.post('/:orderId/cancel', cancelOrderHandler);

export default router;

