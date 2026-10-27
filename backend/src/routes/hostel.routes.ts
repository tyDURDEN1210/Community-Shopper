import { Router } from 'express';
import { listHostelsHandler } from '../controllers/hostel.controller.js';

const router = Router();

router.get('/', listHostelsHandler);

export default router;

