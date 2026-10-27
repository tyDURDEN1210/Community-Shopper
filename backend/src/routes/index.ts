import { Router } from 'express';
import authRoutes from './auth.routes.js';
import hostelRoutes from './hostel.routes.js';
import orderRoutes from './order.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'campus-cart-api',
      version: 'v1',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

router.use('/auth', authRoutes);
router.use('/hostels', hostelRoutes);
router.use('/orders', orderRoutes);

export default router;

