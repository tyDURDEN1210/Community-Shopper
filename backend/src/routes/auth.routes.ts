import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  getMeHandler,
  updateMeHandler
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, registerHandler);
router.post('/login', authRateLimiter, loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, getMeHandler);
router.patch('/me', authenticate, updateMeHandler);

export default router;

