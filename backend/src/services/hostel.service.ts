import { Hostel, IHostel } from '../models/Hostel.js';
import { AppError } from '../utils/errors.js';

export const DEFAULT_HOSTELS = [
  {
    name: 'Aravali Hostel (Block A)',
    code: 'ARAVALI-A',
    block: 'North Campus - Block A',
    genderType: 'BOYS' as const,
    address: 'Gate 2, North Residential Zone, Campus Road'
  },
  {
    name: 'Nilgiri Hostel (Block B)',
    code: 'NILGIRI-B',
    block: 'North Campus - Block B',
    genderType: 'GIRLS' as const,
    address: 'Gate 2, North Residential Zone, Campus Road'
  },
  {
    name: 'Vindhya Residency (Block C)',
    code: 'VINDHYA-C',
    block: 'East Campus - Block C',
    genderType: 'COED' as const,
    address: 'Academic Avenue, East Residential Sector'
  },
  {
    name: 'Satpura Towers (PG & Research)',
    code: 'SATPURA-D',
    block: 'South Campus - Block D',
    genderType: 'COED' as const,
    address: 'Research Park Enclave, South Gate'
  }
];

export async function ensureDefaultHostels(): Promise<IHostel[]> {
  const count = await Hostel.countDocuments();
  if (count === 0) {
    await Hostel.insertMany(DEFAULT_HOSTELS, { ordered: false }).catch(() => {
      // Ignore duplicate key errors if concurrent seed occurs
    });
  }
  return Hostel.find({ isActive: true }).sort({ name: 1 });
}

export async function listActiveHostels(): Promise<IHostel[]> {
  const hostels = await Hostel.find({ isActive: true }).sort({ name: 1 });
  if (hostels.length === 0) {
    return ensureDefaultHostels();
  }
  return hostels;
}

export async function getHostelById(hostelId: string): Promise<IHostel> {
  const hostel = await Hostel.findOne({ _id: hostelId, isActive: true });
  if (!hostel) {
    throw new AppError('Selected hostel does not exist or is inactive', 400, 'INVALID_HOSTEL');
  }
  return hostel;
}

