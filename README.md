# Campus Cart — Multi-Platform Collective Ordering for Hostels

Campus Cart is a full-stack collective-ordering coordination platform designed for university hostel residents. It allows verified hostel members to pool product requests for food delivery apps, quick-commerce services, grocery stores, fashion retailers, and general shopping platforms to waive delivery charges, meet minimum-order thresholds, and unlock group basket offers.

> **Important Product Scope Note**: Campus Cart coordinates group baskets, item moderation, and committed order totals within a hostel. It does not claim or attempt unauthorized automated checkout on third-party shopping apps; once an order window is locked, the initiator places the consolidated order directly on the external platform and records the final checkout total.

---

## 1. Problem Statement

Hostel residents frequently order individual small-value items from platforms like Blinkit, Zepto, Swiggy, Zomato, Myntra, and Amazon. Ordering individually results in:
- Repeated delivery, packaging, and small-cart surge fees.
- Missed minimum-order thresholds for free delivery or bank/platform coupon discounts.
- Chaotic coordination in hostel messaging groups where items, quantities, room numbers, and totals get lost.

Campus Cart replaces ad-hoc chat threads with a structured, auditable workflow: an initiator opens an order window for their hostel, residents join using their verified profile identity and submit item requests, and the initiator approves or rejects requests with atomic transactional updates to the group's committed order total.

---

## 2. Core Features

- **Role-Based Access & Hostel Isolation**:
  - Supports `MEMBER`, `INITIATOR`, and `ADMIN` roles.
  - Residents' name, phone number, hostel, and room number are bound to their authenticated profile—participants never re-enter identity details when joining an order.
  - Strict server-side hostel boundary enforcement prevents cross-hostel order joining or item submission.
- **Discoverable Order Windows**:
  - Filterable feed by Hostel, Platform, Category (`FOOD_DELIVERY`, `QUICK_COMMERCE`, `GROCERIES`, `FASHION`, `GENERAL_SHOPPING`, `OTHER`), Status, and keyword search.
  - Clear lifecycle progression: `OPEN → LOCKED → CONFIRMED → PURCHASED → COMPLETED` (plus `CANCELLED`).
- **Personal Item Requests & Safe Resubmission**:
  - Participants submit items with product name, optional validated `http`/`https` product URL (with SSRF hostname filtering), integer paise unit price, quantity, variant details, and notes.
  - Item lifecycle: `PENDING → APPROVED`, `PENDING → REJECTED`, and `REJECTED → PENDING` (via explicit revision & resubmission).
  - Approved items are locked against silent price/quantity edits so the committed total cannot be corrupted.
- **Transactional Initiator Moderation Workflow**:
  - Only the order initiator can approve or reject item requests for that order window.
  - Approving a pending item executes inside a **MongoDB multi-document ACID transaction** using atomic conditional updates (`status: 'PENDING'`) and transient conflict retry logic.
  - Guarantees that concurrent approval requests never double-increment `committedTotalPaise`.
- **Integer-Paise Monetary Precision & Reconciliation**:
  - All monetary values (`minimumAmountPaise`, `unitPricePaise`, `subtotalPaise`, `committedTotalPaise`, `finalActualTotalPaise`) are stored and calculated in integer paise (`₹1.00 = 100 paise`).
  - Includes a server-side reconciliation verifier comparing `OrderWindow.committedTotalPaise` against the sum of `APPROVED` `OrderItem` documents.
- **Consolidated Purchase Summary & Privacy by Design**:
  - Locking freezes all item additions and approvals and generates a member-by-member and item-by-item consolidated purchase summary.
  - Phone numbers are never exposed to all group participants; only the initiator (and the user themselves) can view contact numbers for delivery/payment coordination.
- **Real-Time Socket.IO Updates**:
  - Live updates broadcast item submissions, approvals, rejections, and lifecycle transitions to connected clients.

---

## 3. Technology Stack

### Frontend (`/frontend`)
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Server-State Management**: TanStack Query v5 + Socket.IO Client
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library + JSDOM

### Backend (`/backend`)
- **Runtime & Framework**: Node.js + Express + TypeScript
- **Database**: MongoDB (Replica Set required for transactions) + Mongoose 8
- **Validation**: Zod (with `.strict()` schemas to prevent mass assignment)
- **Authentication & Security**: JWT (`httpOnly` cookies + `Authorization: Bearer` support), `bcryptjs` password hashing, CSRF custom-header/double-submit verification, `helmet`, `cors`, and `express-rate-limit`
- **Real-Time**: Socket.IO
- **Testing**: Vitest + Supertest + `mongodb-memory-server` (`MongoMemoryReplSet`)

---

## 4. Architecture & Project Structure

```text
Community-Shopper/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment config & MongoDB Replica Set connection manager
│   │   ├── controllers/    # Express route handlers (auth, hostels, orders)
│   │   ├── middleware/     # JWT/cookie auth, CSRF check, rate limiters, centralized error handler
│   │   ├── models/         # Mongoose schemas (User, Hostel, OrderWindow, OrderParticipant, OrderItem, OrderActivity)
│   │   ├── routes/         # Versioned REST routes under /api/v1
│   │   ├── scripts/        # Database seed script (seed.ts)
│   │   ├── services/       # Business logic & transactional approval workflows
│   │   ├── utils/          # AppError class & Socket.IO emitter
│   │   ├── validators/     # Strict Zod request schemas & SSRF URL validator
│   │   ├── app.ts          # Express application factory
│   │   └── index.ts        # HTTP + Socket.IO server entrypoint
│   └── tests/              # Automated backend integration & transaction tests
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components (OrderCard, ProgressBar, ItemRequestCard, ItemForm, etc.)
│   │   ├── context/        # AuthContext provider
│   │   ├── hooks/          # Socket.IO real-time invalidation hook
│   │   ├── lib/            # API client & paise/rupee formatters
│   │   ├── pages/          # 10 application pages (Login, Register, Dashboard, Discover, Create, Detail, etc.)
│   │   ├── test/           # Frontend component & unit tests
│   │   └── types/          # Shared TypeScript interfaces
│   └── vercel.json         # SPA rewrite rules for Vercel deployment
├── render.yaml             # Render blueprint for backend deployment
└── package.json            # Workspace convenience scripts
```

---

## 5. Database Models

1. **`Hostel`**: Campus hostel registry (`name`, `code`, `block`, `genderType`, `address`, `isActive`).
2. **`User`**: Resident profile (`fullName`, `email`, `phoneNumber`, `hostelId`, `roomNumber`, `passwordHash` with `select: false`, `role`, `accountStatus`).
3. **`OrderWindow`**: Group order container (`title`, `platform`, `category`, `hostelId`, `initiatorId`, `minimumAmountPaise`, `targetBasis`, `targetBasisNote`, `deadline`, `participantLimit`, `status`, `committedTotalPaise`, `approvedItemsCount`, `participantCount`, `finalActualTotalPaise`).
4. **`OrderParticipant`**: Membership join table with a unique compound index `{ orderWindowId: 1, userId: 1 }` to prevent duplicate membership records.
5. **`OrderItem`**: Individual item requests (`orderWindowId`, `requesterId`, `productName`, `productUrl`, `unitPricePaise`, `quantity`, `subtotalPaise`, `variantDetails`, `notes`, `status`, `reviewerId`, `reviewedAt`, `rejectionReason`, `resubmissionCount`).
6. **`OrderActivity`**: Immutable audit trail of order lifecycle events and item reviews (`orderWindowId`, `actorId`, `action`, `message`, `metadata`).

---

## 6. API Endpoints (`/api/v1`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Health check endpoint | Public |
| `GET` | `/api/v1/hostels` | List active campus hostels | Public |
| `POST` | `/api/v1/auth/register` | Register a new hostel resident | Public (Rate-limited) |
| `POST` | `/api/v1/auth/login` | Authenticate and issue JWT/cookies | Public (Rate-limited) |
| `POST` | `/api/v1/auth/logout` | Clear authentication cookies | Public |
| `GET` | `/api/v1/auth/me` | Fetch current authenticated profile | Protected |
| `PATCH` | `/api/v1/auth/me` | Update profile details | Protected |
| `GET` | `/api/v1/orders/dashboard` | Aggregated dashboard data for current user | Protected |
| `GET` | `/api/v1/orders` | List/filter order windows | Protected |
| `POST` | `/api/v1/orders` | Create a new order window for user's hostel | Protected |
| `GET` | `/api/v1/orders/:orderId` | Full order detail with privacy-filtered items/members | Protected |
| `GET` | `/api/v1/orders/:orderId/summary` | Consolidated purchase summary & aggregate reconciliation | Protected |
| `GET` | `/api/v1/orders/:orderId/activity` | Order activity log | Protected |
| `POST` | `/api/v1/orders/:orderId/join` | Join an OPEN order window in user's hostel | Protected |
| `POST` | `/api/v1/orders/:orderId/leave` | Leave an OPEN order window (if no approved items) | Protected |
| `GET` | `/api/v1/orders/:orderId/items` | List items in order window | Protected |
| `POST` | `/api/v1/orders/:orderId/items` | Submit a new `PENDING` item request | Participant |
| `PATCH` | `/api/v1/orders/:orderId/items/:itemId` | Edit own `PENDING` item request | Item Owner |
| `DELETE` | `/api/v1/orders/:orderId/items/:itemId` | Delete own `PENDING` item request | Item Owner |
| `POST` | `/api/v1/orders/:orderId/items/:itemId/resubmit` | Revise and resubmit own `REJECTED` item back to `PENDING` | Item Owner |
| `POST` | `/api/v1/orders/:orderId/items/:itemId/approve` | Transactionally approve a `PENDING` item & increment total | Order Initiator |
| `POST` | `/api/v1/orders/:orderId/items/:itemId/reject` | Reject a `PENDING` item with optional reason | Order Initiator |
| `POST` | `/api/v1/orders/:orderId/lock` | Lock `OPEN` order window and freeze item changes | Order Initiator |
| `POST` | `/api/v1/orders/:orderId/confirm` | Transition `LOCKED` order to `CONFIRMED` | Order Initiator |
| `POST` | `/api/v1/orders/:orderId/purchase` | Record `finalActualTotalPaise` and mark `PURCHASED` | Order Initiator |
| `POST` | `/api/v1/orders/:orderId/complete` | Mark `PURCHASED` order as `COMPLETED` | Order Initiator |
| `POST` | `/api/v1/orders/:orderId/cancel` | Cancel an unpurchased order window | Initiator / Admin |

---

## 7. Local Setup & Environment Variables

### Prerequisites
- **Node.js**: v20+ (tested on v24)
- **MongoDB**: A MongoDB Replica Set (e.g., MongoDB Atlas or local `mongod --replSet rs0`).
  - *Note*: For frictionless local development without a local MongoDB replica set installed, if `MONGODB_URI` is unreachable in `development` mode (or if `USE_IN_MEMORY_DB=true`), the backend automatically boots an embedded single-node `MongoMemoryReplSet` and seeds demo hostels and accounts.

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`:

#### `backend/.env`
| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | `development` |
| `PORT` | Backend HTTP & Socket.IO port | `5000` |
| `MONGODB_URI` | MongoDB Replica Set connection string | `mongodb://127.0.0.1:27017/campus_cart?replicaSet=rs0` |
| `USE_IN_MEMORY_DB` | Set `true` to force embedded `MongoMemoryReplSet` locally | `false` |
| `JWT_SECRET` | Secret key for signing JWTs (use 64+ random chars in prod) | `replace_with_strong_secret` |
| `JWT_EXPIRES_IN` | Token expiration window | `7d` |
| `COOKIE_SECURE` | Set `true` in HTTPS production environments | `false` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |

#### `frontend/.env`
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend REST API base URL | `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | Backend Socket.IO URL | `http://localhost:5000` |

### Installation & Running Locally

```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. (Optional) Seed external MongoDB database with demo hostels, users & orders
npm run seed

# 3. Start backend server (http://localhost:5000)
npm run dev:backend

# 4. In a second terminal, start frontend Vite server (http://localhost:5173)
npm run dev:frontend
```

### Seeded Demo Accounts (Password: `CampusCart123`)
- **Initiator (Aravali Hostel, Room A-304)**: `aarav@campuscart.edu`
- **Member (Aravali Hostel, Room A-212)**: `rohan@campuscart.edu`
- **Member (Aravali Hostel, Room A-108)**: `kabir@campuscart.edu`
- **Initiator (Nilgiri Hostel, Room B-405)**: `ananya@campuscart.edu`

---

## 8. Testing, Type Checking & Production Build

```bash
# Run all backend & frontend automated tests
npm test

# Run backend API & transactional tests only
npm run test:backend

# Run frontend component & unit tests only
npm run test:frontend

# Run TypeScript type checking across both workspaces
npm run typecheck

# Build production bundles for backend and frontend
npm run build
```

---

## 9. Deployment Instructions (Single Render Web Service)

Campus Cart is configured to deploy as **one unified Render Web Service** from the repository root. Express serves both the `/api/v1` REST API, `/socket.io` WebSocket server, and the compiled React/Vite production SPA (`frontend/dist`) with a safe SPA fallback.

1. **Database (MongoDB Atlas)**:
   - Create an M0 (or higher) cluster on MongoDB Atlas (Atlas clusters run as a 3-node replica set by default, supporting multi-document ACID transactions out of the box).
   - Under **Network Access**, allow access from Render (`0.0.0.0/0` or Render's outbound IPs).
   - Copy your `mongodb+srv://...` connection string.
2. **Render Web Service Configuration**:
   - Connect your GitHub repository to Render (either via **New -> Blueprint** using `render.yaml` or **New -> Web Service**):
     - **Root Directory**: *(leave empty / repository root)*
     - **Runtime**: `Node`
     - **Build Command**: `npm run install:all && npm run build`
     - **Start Command**: `npm run start`
     - **Health Check Path**: `/api/v1/health`
   - **Environment Variables on Render**:
     - `NODE_ENV` = `production`
     - `MONGODB_URI` = `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/campus_cart?retryWrites=true&w=majority`
     - `JWT_SECRET` = `<strong 64+ character random string>`
     - `JWT_EXPIRES_IN` = `7d`
     - `COOKIE_SECURE` = `true`
     - `COOKIE_SAME_SITE` = `lax`

---

## 10. Known Limitations & Future Improvements

- **Manual External Checkout**: Because quick-commerce and delivery platforms do not offer public checkout APIs for consumer group orders, the initiator places the consolidated order manually using the Consolidated Summary and records the final checkout amount.
- **Future Enhancements**:
  - Split-expense settlement tracking (UPI deep-link generation per participant share including proportional delivery/discount adjustments).
  - Push/WebPush notifications when an order reaches 100% of its minimum target or is locked.
  - Admin management dashboard for adding new hostels and moderating reported orders.

