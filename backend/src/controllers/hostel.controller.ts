import { Request, Response, NextFunction } from 'express';
import { listActiveHostels } from '../services/hostel.service.js';

export async function listHostelsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hostels = await listActiveHostels();
    res.status(200).json({
      success: true,
      data: {
        hostels: hostels.map((h) => ({
          id: h._id.toString(),
          name: h.name,
          code: h.code,
          block: h.block,
          genderType: h.genderType,
          address: h.address
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

