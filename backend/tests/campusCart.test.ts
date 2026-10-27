import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectInMemoryReplicaSet, disconnectDatabase } from '../src/config/db.js';
import { Hostel } from '../src/models/Hostel.js';
import { User } from '../src/models/User.js';
import { OrderWindow } from '../src/models/OrderWindow.js';
import { OrderParticipant } from '../src/models/OrderParticipant.js';
import { OrderItem } from '../src/models/OrderItem.js';
import { OrderActivity } from '../src/models/OrderActivity.js';
import { approveItemRequest, reconcileOrderAggregate } from '../src/services/order.service.js';

const app = createApp();

let hostelAId: string;
let hostelBId: string;

beforeAll(async () => {
  await connectInMemoryReplicaSet();
}, 120000);

afterAll(async () => {
  await disconnectDatabase();
}, 60000);

beforeEach(async () => {
  await Promise.all([
    OrderActivity.deleteMany({}),
    OrderItem.deleteMany({}),
    OrderParticipant.deleteMany({}),
    OrderWindow.deleteMany({}),
    User.deleteMany({}),
    Hostel.deleteMany({})
  ]);

  const [hostelA, hostelB] = await Hostel.create([
    {
      name: 'Aravali Hostel (Block A)',
      code: 'ARAVALI-A',
      block: 'North Block A',
      genderType: 'BOYS',
      address: 'North Campus Road'
    },
    {
      name: 'Nilgiri Hostel (Block B)',
      code: 'NILGIRI-B',
      block: 'South Block B',
      genderType: 'GIRLS',
      address: 'South Campus Road'
    }
  ]);

  hostelAId = hostelA._id.toString();
  hostelBId = hostelB._id.toString();
});

async function registerAndLoginUser(overrides: {
  fullName: string;
  email: string;
  phoneNumber: string;
  hostelId: string;
  roomNumber: string;
  password?: string;
}) {
  const password = overrides.password || 'Password123!';
  const regRes = await request(app)
    .post('/api/v1/auth/register')
    .set('X-Requested-With', 'CampusCart')
    .send({
      fullName: overrides.fullName,
      email: overrides.email,
      phoneNumber: overrides.phoneNumber,
      hostelId: overrides.hostelId,
      roomNumber: overrides.roomNumber,
      password
    });

  expect(regRes.status).toBe(201);
  return {
    token: regRes.body.data.token as string,
    user: regRes.body.data.user as {
      id: string;
      fullName: string;
      email: string;
      phoneNumber: string;
      hostelId: string;
      roomNumber: string;
      role: 'MEMBER' | 'INITIATOR' | 'ADMIN';
    }
  };
}

describe('Campus Cart Backend API & Transactional Approval Suite', () => {
  it('1. A user can register, log in, fetch profile, and duplicate emails are rejected', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'CampusCart')
      .send({
        fullName: 'Aarav Sharma',
        email: 'aarav@test.edu',
        phoneNumber: '9876543210',
        hostelId: hostelAId,
        roomNumber: 'A-301',
        password: 'SecurePassword123'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.email).toBe('aarav@test.edu');
    expect(regRes.body.data.user.passwordHash).toBeUndefined();

    // Duplicate email registration returns 409
    const dupRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'CampusCart')
      .send({
        fullName: 'Aarav Duplicate',
        email: 'aarav@test.edu',
        phoneNumber: '9876543219',
        hostelId: hostelAId,
        roomNumber: 'A-302',
        password: 'SecurePassword123'
      });
    expect(dupRes.status).toBe(409);

    // Login with valid credentials
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'CampusCart')
      .send({
        email: 'aarav@test.edu',
        password: 'SecurePassword123'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();

    // Login with wrong password returns generic 401
    const badLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'CampusCart')
      .send({
        email: 'aarav@test.edu',
        password: 'WrongPassword'
      });
    expect(badLoginRes.status).toBe(401);
    expect(badLoginRes.body.error.message).toBe('Invalid email or password');

    // Fetch /auth/me
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.roomNumber).toBe('A-301');
  });

  it('2. An authenticated member can create an order window for their hostel', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Initiator One',
      email: 'initiator@test.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-101'
    });

    const futureDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Blinkit Midnight Snacks',
        platform: 'Blinkit',
        category: 'QUICK_COMMERCE',
        hostelId: hostelAId,
        minimumAmountPaise: 50000,
        targetBasis: 'ITEM_VALUE_ONLY',
        deadline: futureDeadline,
        participantLimit: 5,
        description: 'Pooling snacks for exam night'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.order.title).toBe('Blinkit Midnight Snacks');
    expect(createRes.body.data.order.status).toBe('OPEN');
    expect(createRes.body.data.order.committedTotalPaise).toBe(0);
    expect(createRes.body.data.order.participantCount).toBe(1);
  });

  it('3. A member from the wrong hostel cannot join an order window (and duplicate join is prevented)', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Aravali Initiator',
      email: 'init@aravali.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-101'
    });

    const wrongHostelMember = await registerAndLoginUser({
      fullName: 'Nilgiri Resident',
      email: 'resident@nilgiri.edu',
      phoneNumber: '9876543211',
      hostelId: hostelBId,
      roomNumber: 'B-202'
    });

    const sameHostelMember = await registerAndLoginUser({
      fullName: 'Aravali Member',
      email: 'member@aravali.edu',
      phoneNumber: '9876543212',
      hostelId: hostelAId,
      roomNumber: 'A-105'
    });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Swiggy Dinner Pool',
        platform: 'Swiggy',
        category: 'FOOD_DELIVERY',
        hostelId: hostelAId,
        minimumAmountPaise: 40000,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });

    const orderId = orderRes.body.data.order.id;

    // Wrong hostel member cannot join -> 403
    const wrongJoinRes = await request(app)
      .post(`/api/v1/orders/${orderId}/join`)
      .set('Authorization', `Bearer ${wrongHostelMember.token}`);
    expect(wrongJoinRes.status).toBe(403);
    expect(wrongJoinRes.body.error.code).toBe('CROSS_HOSTEL_FORBIDDEN');

    // Same hostel member can join -> 200
    const validJoinRes = await request(app)
      .post(`/api/v1/orders/${orderId}/join`)
      .set('Authorization', `Bearer ${sameHostelMember.token}`);
    expect(validJoinRes.status).toBe(200);
    expect(validJoinRes.body.data.order.participantCount).toBe(2);

    // Duplicate join attempt returns 409
    const duplicateJoinRes = await request(app)
      .post(`/api/v1/orders/${orderId}/join`)
      .set('Authorization', `Bearer ${sameHostelMember.token}`);
    expect(duplicateJoinRes.status).toBe(409);
  });

  it('4, 5, 6, 7, 8, 9, 10. Item submission, authorization rules, exact total increment, idempotency, and exclusion of pending/rejected items', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Hostel Initiator',
      email: 'initiator@hostel.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-101'
    });

    const participantA = await registerAndLoginUser({
      fullName: 'Participant A',
      email: 'parta@hostel.edu',
      phoneNumber: '9876543211',
      hostelId: hostelAId,
      roomNumber: 'A-102'
    });

    const participantB = await registerAndLoginUser({
      fullName: 'Participant B',
      email: 'partb@hostel.edu',
      phoneNumber: '9876543212',
      hostelId: hostelAId,
      roomNumber: 'A-103'
    });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Zepto Grocery Run',
        platform: 'Zepto',
        category: 'GROCERIES',
        hostelId: hostelAId,
        minimumAmountPaise: 50000, // ₹500.00
        deadline: new Date(Date.now() + 3600000).toISOString()
      });
    const orderId = orderRes.body.data.order.id;

    // Both participants join
    await request(app)
      .post(`/api/v1/orders/${orderId}/join`)
      .set('Authorization', `Bearer ${participantA.token}`);
    await request(app)
      .post(`/api/v1/orders/${orderId}/join`)
      .set('Authorization', `Bearer ${participantB.token}`);

    // Test 4: Participant A submits an item request (2 x 12500 paise = 25000 paise)
    const item1Res = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${participantA.token}`)
      .send({
        productName: 'Cold Brew Coffee Pack',
        productUrl: 'https://zepto.com/item/cold-brew',
        unitPricePaise: 12500,
        quantity: 2,
        variantDetails: '250ml Bottle'
      });

    expect(item1Res.status).toBe(201);
    const item1Id = item1Res.body.data.item.id;
    expect(item1Res.body.data.item.status).toBe('PENDING');
    expect(item1Res.body.data.item.subtotalPaise).toBe(25000);

    // Participant B submits an item request that will be rejected (1 x 15000 paise)
    const item2Res = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${participantB.token}`)
      .send({
        productName: 'Ice Cream Tub',
        unitPricePaise: 15000,
        quantity: 1
      });
    const item2Id = item2Res.body.data.item.id;

    // Test 10 (part 1): Pending items do NOT count toward the committed target
    const beforeApprovalDetail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(beforeApprovalDetail.body.data.order.committedTotalPaise).toBe(0);

    // Test 5: A participant cannot approve their own item (unless they are the initiator)
    const selfApproveRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item1Id}/approve`)
      .set('Authorization', `Bearer ${participantA.token}`);
    expect(selfApproveRes.status).toBe(403);
    expect(selfApproveRes.body.error.code).toBe('FORBIDDEN_NOT_INITIATOR');

    // Test 6: Another non-initiator cannot approve an item
    const otherApproveRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item1Id}/approve`)
      .set('Authorization', `Bearer ${participantB.token}`);
    expect(otherApproveRes.status).toBe(403);

    // Test 7 & 8: The initiator can approve a pending item, and total increments by exact subtotal (25000 paise)
    const validApproveRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item1Id}/approve`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(validApproveRes.status).toBe(200);
    expect(validApproveRes.body.data.item.status).toBe('APPROVED');
    expect(validApproveRes.body.data.orderSummary.committedTotalPaise).toBe(25000);
    expect(validApproveRes.body.data.orderSummary.progressPercentage).toBe(50);
    expect(validApproveRes.body.data.orderSummary.amountRemainingPaise).toBe(25000);

    // Test 9: A second approval attempt on the same item returns 409 and does NOT increment the total again
    const secondApproveRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item1Id}/approve`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(secondApproveRes.status).toBe(409);
    expect(secondApproveRes.body.error.code).toBe('ITEM_ALREADY_REVIEWED');

    // Verify committed total remained 25000
    const checkAfterSecond = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(checkAfterSecond.body.data.order.committedTotalPaise).toBe(25000);

    // Test 10 (part 2): Rejecting item 2 keeps it excluded from committed total
    const rejectRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item2Id}/reject`)
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({ rejectionReason: 'Melts before delivery distribution' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.item.status).toBe('REJECTED');
    expect(rejectRes.body.data.item.rejectionReason).toBe('Melts before delivery distribution');
    expect(rejectRes.body.data.orderSummary.committedTotalPaise).toBe(25000);

    // Reconcile stored aggregate against APPROVED items
    const reconciliation = await reconcileOrderAggregate(orderId);
    expect(reconciliation.isConsistent).toBe(true);
    expect(reconciliation.calculatedTotalPaise).toBe(25000);
  });

  it('11. An item from another order cannot be approved under a different orderId', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Initiator Multi',
      email: 'multi@hostel.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-110'
    });

    const order1Res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Order Window 1',
        platform: 'Blinkit',
        category: 'QUICK_COMMERCE',
        hostelId: hostelAId,
        minimumAmountPaise: 30000,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });

    const order2Res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Order Window 2',
        platform: 'Amazon',
        category: 'GENERAL_SHOPPING',
        hostelId: hostelAId,
        minimumAmountPaise: 50000,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });

    const order1Id = order1Res.body.data.order.id;
    const order2Id = order2Res.body.data.order.id;

    // Add item to Order 2
    const itemInOrder2 = await request(app)
      .post(`/api/v1/orders/${order2Id}/items`)
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        productName: 'USB-C Adapter',
        unitPricePaise: 29900,
        quantity: 1
      });
    const item2Id = itemInOrder2.body.data.item.id;

    // Try approving Order 2's item via Order 1's endpoint -> must return 404
    const crossOrderApprove = await request(app)
      .post(`/api/v1/orders/${order1Id}/items/${item2Id}/approve`)
      .set('Authorization', `Bearer ${initiator.token}`);

    expect(crossOrderApprove.status).toBe(404);
    expect(crossOrderApprove.body.error.code).toBe('ITEM_NOT_FOUND_IN_ORDER');
  });

  it('12 & 13. Editing an approved item is disallowed, and a locked order cannot accept new items or approvals', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Initiator Lock',
      email: 'lock@hostel.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-201'
    });

    const member = await registerAndLoginUser({
      fullName: 'Member Lock',
      email: 'memberlock@hostel.edu',
      phoneNumber: '9876543211',
      hostelId: hostelAId,
      roomNumber: 'A-202'
    });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Myntra Bundle',
        platform: 'Myntra',
        category: 'FASHION',
        hostelId: hostelAId,
        minimumAmountPaise: 100000,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });
    const orderId = orderRes.body.data.order.id;

    await request(app)
      .post(`/api/v1/orders/${orderId}/join`)
      .set('Authorization', `Bearer ${member.token}`);

    // Member adds two items
    const item1Res = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        productName: 'Cotton T-Shirt',
        unitPricePaise: 49900,
        quantity: 1
      });
    const item1Id = item1Res.body.data.item.id;

    const item2Res = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        productName: 'Running Socks',
        unitPricePaise: 19900,
        quantity: 1
      });
    const item2Id = item2Res.body.data.item.id;

    // Initiator approves item 1
    await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item1Id}/approve`)
      .set('Authorization', `Bearer ${initiator.token}`);

    // Test 13: Editing an approved item is disallowed and cannot silently alter the total
    const editApprovedRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/items/${item1Id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        unitPricePaise: 99900,
        quantity: 5
      });
    expect(editApprovedRes.status).toBe(409);
    expect(editApprovedRes.body.error.code).toBe('ITEM_NOT_EDITABLE');

    // Verify committed total is still 49900
    const checkDetail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(checkDetail.body.data.order.committedTotalPaise).toBe(49900);

    // Locking without acknowledging pending item2 returns 409 PENDING_ITEMS_EXIST
    const lockWithoutAck = await request(app)
      .post(`/api/v1/orders/${orderId}/lock`)
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({ acknowledgePending: false });
    expect(lockWithoutAck.status).toBe(409);
    expect(lockWithoutAck.body.error.code).toBe('PENDING_ITEMS_EXIST');

    // Locking with acknowledgePending: true succeeds
    const lockRes = await request(app)
      .post(`/api/v1/orders/${orderId}/lock`)
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({ acknowledgePending: true });
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.order.status).toBe('LOCKED');

    // Test 12 (part 1): A locked order cannot accept new items
    const addAfterLockRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        productName: 'Late Cap',
        unitPricePaise: 29900,
        quantity: 1
      });
    expect(addAfterLockRes.status).toBe(409);
    expect(addAfterLockRes.body.error.code).toBe('ORDER_NOT_OPEN');

    // Test 12 (part 2): A locked order cannot accept new approvals
    const approveAfterLockRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items/${item2Id}/approve`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(approveAfterLockRes.status).toBe(409);
    expect(approveAfterLockRes.body.error.code).toBe('ORDER_NOT_OPEN');
  });

  it('14. Failed transactions leave both item status and order aggregate unchanged, and concurrent approvals only increment once', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Tx Initiator',
      email: 'tx@hostel.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-401'
    });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Transactional Safety Order',
        platform: 'Blinkit',
        category: 'QUICK_COMMERCE',
        hostelId: hostelAId,
        minimumAmountPaise: 50000,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });
    const orderId = orderRes.body.data.order.id;

    const itemRes = await request(app)
      .post(`/api/v1/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        productName: 'Atomic Matcha Latte',
        unitPricePaise: 22000,
        quantity: 2 // 44000 paise
      });
    const itemId = itemRes.body.data.item.id;

    // Simulate mid-transaction failure after item status update but before order aggregate update commits
    await expect(
      approveItemRequest(
        orderId,
        itemId,
        {
          id: initiator.user.id,
          fullName: initiator.user.fullName,
          email: initiator.user.email,
          phoneNumber: initiator.user.phoneNumber,
          hostelId: initiator.user.hostelId,
          roomNumber: initiator.user.roomNumber,
          role: initiator.user.role
        },
        { simulateFailureAfterItemUpdate: true }
      )
    ).rejects.toThrow('Simulated mid-transaction failure');

    // Verify rollback: item must still be PENDING and order committedTotalPaise must still be 0!
    const itemAfterRollback = await OrderItem.findById(itemId);
    const orderAfterRollback = await OrderWindow.findById(orderId);
    expect(itemAfterRollback?.status).toBe('PENDING');
    expect(orderAfterRollback?.committedTotalPaise).toBe(0);
    expect(orderAfterRollback?.approvedItemsCount).toBe(0);

    // Now test concurrent approvals on the same pending item: exactly 1 succeeds and committedTotalPaise increments only once!
    const authUser = {
      id: initiator.user.id,
      fullName: initiator.user.fullName,
      email: initiator.user.email,
      phoneNumber: initiator.user.phoneNumber,
      hostelId: initiator.user.hostelId,
      roomNumber: initiator.user.roomNumber,
      role: initiator.user.role
    };

    const results = await Promise.allSettled([
      approveItemRequest(orderId, itemId, authUser),
      approveItemRequest(orderId, itemId, authUser),
      approveItemRequest(orderId, itemId, authUser)
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(2);

    const finalOrder = await OrderWindow.findById(orderId);
    expect(finalOrder?.committedTotalPaise).toBe(44000);
    expect(finalOrder?.approvedItemsCount).toBe(1);
  });

  it('15. Validation errors return HTTP 400 with structured error details (deadline in past, negative price, SSRF URLs, mass assignment)', async () => {
    const initiator = await registerAndLoginUser({
      fullName: 'Validator User',
      email: 'val@hostel.edu',
      phoneNumber: '9876543210',
      hostelId: hostelAId,
      roomNumber: 'A-501'
    });

    // Past deadline -> 400
    const pastDeadlineRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Past Deadline Order',
        platform: 'Blinkit',
        category: 'QUICK_COMMERCE',
        hostelId: hostelAId,
        minimumAmountPaise: 30000,
        deadline: new Date(Date.now() - 60000).toISOString()
      });
    expect(pastDeadlineRes.status).toBe(400);

    // Negative minimum amount -> 400
    const negAmountRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Negative Target Order',
        platform: 'Blinkit',
        category: 'QUICK_COMMERCE',
        hostelId: hostelAId,
        minimumAmountPaise: -100,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });
    expect(negAmountRes.status).toBe(400);

    // Mass assignment attempt during registration (trying to pass role: 'ADMIN') -> 400 strict schema rejection
    const massAssignRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'CampusCart')
      .send({
        fullName: 'Hacker User',
        email: 'hacker@hostel.edu',
        phoneNumber: '9876543210',
        hostelId: hostelAId,
        roomNumber: 'A-999',
        password: 'Password123!',
        role: 'ADMIN'
      });
    expect(massAssignRes.status).toBe(400);

    // Unsafe Product URL (javascript: or localhost SSRF) -> 400
    const validOrderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        title: 'Valid Order',
        platform: 'Blinkit',
        category: 'QUICK_COMMERCE',
        hostelId: hostelAId,
        minimumAmountPaise: 30000,
        deadline: new Date(Date.now() + 3600000).toISOString()
      });
    const validOrderId = validOrderRes.body.data.order.id;

    const unsafeUrlRes = await request(app)
      .post(`/api/v1/orders/${validOrderId}/items`)
      .set('Authorization', `Bearer ${initiator.token}`)
      .send({
        productName: 'SSRF Probe Item',
        productUrl: 'http://127.0.0.1:5000/internal',
        unitPricePaise: 10000,
        quantity: 1
      });
    expect(unsafeUrlRes.status).toBe(400);

    // Unauthenticated request -> 401
    const unauthRes = await request(app).get('/api/v1/orders');
    expect(unauthRes.status).toBe(401);

    // Missing resource -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request(app)
      .get(`/api/v1/orders/${fakeId}`)
      .set('Authorization', `Bearer ${initiator.token}`);
    expect(notFoundRes.status).toBe(404);
  });
});

