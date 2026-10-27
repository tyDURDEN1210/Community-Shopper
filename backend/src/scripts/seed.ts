import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Hostel } from '../models/Hostel.js';
import { User } from '../models/User.js';
import { OrderWindow } from '../models/OrderWindow.js';
import { OrderParticipant } from '../models/OrderParticipant.js';
import { OrderItem } from '../models/OrderItem.js';
import { OrderActivity } from '../models/OrderActivity.js';
import { DEFAULT_HOSTELS } from '../services/hostel.service.js';

export async function seedDatabase(options?: { forceReset?: boolean }): Promise<void> {
  if (options?.forceReset) {
    await Promise.all([
      OrderActivity.deleteMany({}),
      OrderItem.deleteMany({}),
      OrderParticipant.deleteMany({}),
      OrderWindow.deleteMany({}),
      User.deleteMany({}),
      Hostel.deleteMany({})
    ]);
  }

  let hostels = await Hostel.find({ isActive: true }).sort({ name: 1 });
  if (hostels.length === 0) {
    await Hostel.insertMany(DEFAULT_HOSTELS);
    hostels = await Hostel.find({ isActive: true }).sort({ name: 1 });
  }

  const existingUsersCount = await User.countDocuments();
  if (existingUsersCount > 0 && !options?.forceReset) {
    return;
  }

  const aravali = hostels.find((h) => h.code === 'ARAVALI-A') || hostels[0];
  const nilgiri = hostels.find((h) => h.code === 'NILGIRI-B') || hostels[1] || hostels[0];
  const vindhya = hostels.find((h) => h.code === 'VINDHYA-C') || hostels[2] || hostels[0];

  const passwordHash = await bcrypt.hash('CampusCart123', 10);

  const [aarav, rohan, kabir, ananya, adminUser] = await User.create([
    {
      fullName: 'Aarav Sharma',
      email: 'aarav@campuscart.edu',
      phoneNumber: '9876543210',
      hostelId: aravali._id,
      roomNumber: 'A-304',
      passwordHash,
      role: 'INITIATOR',
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'Rohan Verma',
      email: 'rohan@campuscart.edu',
      phoneNumber: '9876543211',
      hostelId: aravali._id,
      roomNumber: 'A-212',
      passwordHash,
      role: 'MEMBER',
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'Kabir Nair',
      email: 'kabir@campuscart.edu',
      phoneNumber: '9876543212',
      hostelId: aravali._id,
      roomNumber: 'A-108',
      passwordHash,
      role: 'MEMBER',
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'Ananya Iyer',
      email: 'ananya@campuscart.edu',
      phoneNumber: '9876543213',
      hostelId: nilgiri._id,
      roomNumber: 'B-405',
      passwordHash,
      role: 'INITIATOR',
      accountStatus: 'ACTIVE'
    },
    {
      fullName: 'Campus Admin',
      email: 'admin@campuscart.edu',
      phoneNumber: '9876543299',
      hostelId: vindhya._id,
      roomNumber: 'ADMIN-01',
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE'
    }
  ]);

  const now = Date.now();

  // Order 1: Active Blinkit Quick Commerce Order in Aravali Hostel (initiated by Aarav)
  const blinkitOrder = await OrderWindow.create({
    title: 'Late-Night Exam Study Snacks & Cold Brew Run',
    platform: 'Blinkit',
    category: 'QUICK_COMMERCE',
    hostelId: aravali._id,
    initiatorId: aarav._id,
    minimumAmountPaise: 59900, // ₹599.00
    targetBasis: 'ITEM_VALUE_ONLY',
    targetBasisNote: 'Sum of approved item MRP/selling prices for free delivery + ₹75 off coupon',
    deadline: new Date(now + 4 * 60 * 60 * 1000),
    participantLimit: 8,
    description:
      'Ordering midnight snacks, coffee, and instant noodles from Blinkit so we waive the ₹35 delivery + surge fee and unlock the ₹599 basket offer.',
    deliveryNotes: 'Collect items from Room A-304 within 15 minutes of delivery arrival.',
    status: 'OPEN',
    committedTotalPaise: 42500, // ₹425.00 approved so far
    approvedItemsCount: 2,
    participantCount: 3
  });

  await OrderParticipant.create([
    {
      orderWindowId: blinkitOrder._id,
      userId: aarav._id,
      role: 'INITIATOR',
      status: 'ACTIVE'
    },
    {
      orderWindowId: blinkitOrder._id,
      userId: rohan._id,
      role: 'PARTICIPANT',
      status: 'ACTIVE'
    },
    {
      orderWindowId: blinkitOrder._id,
      userId: kabir._id,
      role: 'PARTICIPANT',
      status: 'ACTIVE'
    }
  ]);

  await OrderItem.create([
    {
      orderWindowId: blinkitOrder._id,
      requesterId: aarav._id,
      productName: 'Sleepy Owl Hazelnut Cold Brew Can (200ml)',
      productUrl: 'https://blinkit.com/prn/sleepy-owl-cold-brew/prid/101',
      unitPricePaise: 12500,
      quantity: 2,
      subtotalPaise: 25000,
      variantDetails: '200ml Can - Hazelnut',
      notes: 'Chilled if available',
      status: 'APPROVED',
      reviewerId: aarav._id,
      reviewedAt: new Date(now - 20 * 60 * 1000)
    },
    {
      orderWindowId: blinkitOrder._id,
      requesterId: rohan._id,
      productName: 'Nissin Geki Hot & Spicy Korean Ramen (Pack of 5)',
      productUrl: 'https://blinkit.com/prn/nissin-geki-korean-ramen/prid/205',
      unitPricePaise: 17500,
      quantity: 1,
      subtotalPaise: 17500,
      variantDetails: 'Veg Korean Chicken Flavour - 5 Pack',
      status: 'APPROVED',
      reviewerId: aarav._id,
      reviewedAt: new Date(now - 12 * 60 * 1000)
    },
    {
      orderWindowId: blinkitOrder._id,
      requesterId: kabir._id,
      productName: 'Epigamia Greek Yogurt Strawberry (90g)',
      unitPricePaise: 6000,
      quantity: 3,
      subtotalPaise: 18000,
      variantDetails: '90g Cup - Strawberry',
      notes: 'Will bring exact UPI change to A-304',
      status: 'PENDING'
    },
    {
      orderWindowId: blinkitOrder._id,
      requesterId: rohan._id,
      productName: 'Doritos Nacho Cheese Family Pack',
      unitPricePaise: 9500,
      quantity: 2,
      subtotalPaise: 19000,
      variantDetails: '153g Pack',
      status: 'PENDING'
    }
  ]);

  await OrderActivity.create([
    {
      orderWindowId: blinkitOrder._id,
      actorId: aarav._id,
      action: 'ORDER_CREATED',
      message: 'Aarav Sharma opened an order window for Blinkit'
    },
    {
      orderWindowId: blinkitOrder._id,
      actorId: rohan._id,
      action: 'PARTICIPANT_JOINED',
      message: 'Rohan Verma joined the order window'
    },
    {
      orderWindowId: blinkitOrder._id,
      actorId: aarav._id,
      action: 'ITEM_APPROVED',
      message: 'Aarav Sharma approved "Nissin Geki Hot & Spicy Korean Ramen (Pack of 5)" (x1)'
    },
    {
      orderWindowId: blinkitOrder._id,
      actorId: kabir._id,
      action: 'ITEM_ADDED',
      message: 'Kabir Nair requested 3x "Epigamia Greek Yogurt Strawberry (90g)"'
    }
  ]);

  // Order 2: Active Amazon Electronics & Stationery Order in Aravali Hostel (initiated by Rohan)
  const amazonOrder = await OrderWindow.create({
    title: 'Lab Cables, Notebooks & Desk Essentials (Free Prime Delivery)',
    platform: 'Amazon',
    category: 'GENERAL_SHOPPING',
    hostelId: aravali._id,
    initiatorId: rohan._id,
    minimumAmountPaise: 99900, // ₹999.00
    targetBasis: 'ITEM_VALUE_ONLY',
    targetBasisNote: 'Sum of approved item prices to reach ₹999 bank card discount threshold',
    deadline: new Date(now + 18 * 60 * 60 * 1000),
    participantLimit: 10,
    description:
      'Consolidating stationery, USB-C cables, and lab supplies on Amazon. Share product links and exact variants.',
    deliveryNotes: 'Pick up from Room A-212 after evening classes.',
    status: 'OPEN',
    committedTotalPaise: 34900,
    approvedItemsCount: 1,
    participantCount: 2
  });

  await OrderParticipant.create([
    {
      orderWindowId: amazonOrder._id,
      userId: rohan._id,
      role: 'INITIATOR',
      status: 'ACTIVE'
    },
    {
      orderWindowId: amazonOrder._id,
      userId: aarav._id,
      role: 'PARTICIPANT',
      status: 'ACTIVE'
    }
  ]);

  await OrderItem.create([
    {
      orderWindowId: amazonOrder._id,
      requesterId: rohan._id,
      productName: 'Classmate Pulse 6-Subject Spiral Notebook (300 Pages)',
      productUrl: 'https://www.amazon.in/dp/B00P95X672',
      unitPricePaise: 34900,
      quantity: 1,
      subtotalPaise: 34900,
      variantDetails: 'Unruled, 300 Pages, Single Pack',
      status: 'APPROVED',
      reviewerId: rohan._id,
      reviewedAt: new Date(now - 35 * 60 * 1000)
    },
    {
      orderWindowId: amazonOrder._id,
      requesterId: aarav._id,
      productName: 'Portronics Konnect L 60W Type-C to Type-C Braided Cable',
      productUrl: 'https://www.amazon.in/dp/B08CF3B7N1',
      unitPricePaise: 19900,
      quantity: 2,
      subtotalPaise: 39800,
      variantDetails: '1.5 Meter, Space Grey',
      status: 'PENDING'
    }
  ]);

  // Order 3: Active Myntra Fashion Order in Nilgiri Hostel (initiated by Ananya)
  const myntraOrder = await OrderWindow.create({
    title: 'Myntra End of Season Activewear & Ethnic Bundle',
    platform: 'Myntra',
    category: 'FASHION',
    hostelId: nilgiri._id,
    initiatorId: ananya._id,
    minimumAmountPaise: 199900, // ₹1,999.00
    targetBasis: 'ITEM_VALUE_ONLY',
    targetBasisNote: 'Sum of approved item prices to unlock ₹300 off on ₹1,999+ cart',
    deadline: new Date(now + 12 * 60 * 60 * 1000),
    participantLimit: 6,
    description: 'Pooling Myntra orders for Nilgiri Block B residents to waive convenience fee.',
    deliveryNotes: 'Nilgiri Block B reception desk / Room B-405.',
    status: 'OPEN',
    committedTotalPaise: 129900,
    approvedItemsCount: 1,
    participantCount: 1
  });

  await OrderParticipant.create([
    {
      orderWindowId: myntraOrder._id,
      userId: ananya._id,
      role: 'INITIATOR',
      status: 'ACTIVE'
    }
  ]);

  await OrderItem.create([
    {
      orderWindowId: myntraOrder._id,
      requesterId: ananya._id,
      productName: 'HRX Rapid-Dry Running Track Pants',
      productUrl: 'https://www.myntra.com/track-pants/hrx/1001',
      unitPricePaise: 129900,
      quantity: 1,
      subtotalPaise: 129900,
      variantDetails: 'Size M, Jet Black',
      status: 'APPROVED',
      reviewerId: ananya._id,
      reviewedAt: new Date(now - 60 * 60 * 1000)
    }
  ]);

  void adminUser;
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isMainModule) {
  (async () => {
    try {
      const uri = await connectDatabase();
      console.log(`[Seed] Connected to MongoDB (${uri}). Seeding Campus Cart data...`);
      await seedDatabase({ forceReset: true });
      console.log('[Seed] Successfully seeded hostels, demo accounts, and order windows!');
      console.log('------------------------------------------------------------');
      console.log('Demo Accounts (Password for all: CampusCart123):');
      console.log('  1. Initiator (Aravali Hostel): aarav@campuscart.edu');
      console.log('  2. Member    (Aravali Hostel): rohan@campuscart.edu');
      console.log('  3. Member    (Aravali Hostel): kabir@campuscart.edu');
      console.log('  4. Initiator (Nilgiri Hostel): ananya@campuscart.edu');
      console.log('  5. Admin     (Vindhya Hostel): admin@campuscart.edu');
      console.log('------------------------------------------------------------');
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('[Seed] Failed:', err);
      await disconnectDatabase();
      process.exit(1);
    }
  })();
}

