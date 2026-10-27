export type UserRole = 'MEMBER' | 'INITIATOR' | 'ADMIN';

export type OrderCategory =
  | 'FOOD_DELIVERY'
  | 'QUICK_COMMERCE'
  | 'GROCERIES'
  | 'FASHION'
  | 'GENERAL_SHOPPING'
  | 'OTHER';

export type OrderStatus =
  | 'OPEN'
  | 'LOCKED'
  | 'CONFIRMED'
  | 'PURCHASED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TargetBasisType = 'ITEM_VALUE_ONLY' | 'SUBTOTAL_BEFORE_FEES' | 'CUSTOM';

export type ItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Hostel {
  id: string;
  name: string;
  code: string;
  block: string;
  genderType?: 'COED' | 'BOYS' | 'GIRLS';
  address?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  hostelId: string;
  hostel?: Hostel;
  roomNumber: string;
  role: UserRole;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface OrderSummaryCard {
  id: string;
  title: string;
  platform: string;
  category: OrderCategory;
  hostelId: string;
  hostel?: {
    id: string;
    name: string;
    code: string;
    block: string;
  };
  initiatorId: string;
  initiator?: {
    id: string;
    fullName: string;
    roomNumber?: string;
  };
  minimumAmountPaise: number;
  targetBasis: TargetBasisType;
  targetBasisNote: string;
  committedTotalPaise: number;
  amountRemainingPaise: number;
  progressPercentage: number;
  isTargetReached: boolean;
  approvedItemsCount: number;
  pendingRequestsCount: number;
  participantCount: number;
  participantLimit: number | null;
  deadline: string;
  timeRemainingMs: number;
  description?: string;
  deliveryNotes?: string;
  status: OrderStatus;
  isJoined: boolean;
  isInitiator: boolean;
  createdAt: string;
}

export interface OrderItemRecord {
  id: string;
  orderWindowId: string;
  orderTitle?: string;
  platform?: string;
  orderStatus?: OrderStatus;
  productName: string;
  productUrl?: string;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  variantDetails?: string;
  notes?: string;
  status: ItemStatus;
  rejectionReason?: string;
  resubmissionCount: number;
  requesterId: string;
  requester?: {
    id: string;
    fullName: string;
    roomNumber?: string;
    phoneNumber?: string;
  };
  reviewer?: {
    id: string;
    fullName: string;
  };
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderParticipantRecord {
  id: string;
  role: 'INITIATOR' | 'PARTICIPANT';
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    roomNumber?: string;
    phoneNumber?: string;
  };
}

export interface OrderActivityRecord {
  id: string;
  action: string;
  message: string;
  actorName: string;
  createdAt: string;
}

export interface OrderDetail
  extends Omit<OrderSummaryCard, 'isJoined' | 'isInitiator' | 'hostel'> {
  hostel: {
    id: string;
    name: string;
    code: string;
    block: string;
    address?: string;
  };
  rejectedRequestsCount: number;
  finalActualTotalPaise: number | null;
  purchaseNotes?: string;
  cancellationReason?: string;
  lockedAt?: string;
  confirmedAt?: string;
  purchasedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  initiator: {
    id: string;
    fullName: string;
    roomNumber: string;
    phoneNumber?: string;
  };
  viewerContext: {
    isInitiator: boolean;
    isParticipant: boolean;
    canJoin: boolean;
    canLeave: boolean;
  };
  participants: OrderParticipantRecord[];
  approvedItems: OrderItemRecord[];
  pendingItems: OrderItemRecord[];
  rejectedItems: OrderItemRecord[];
  myItems: OrderItemRecord[];
  consolidatedSummary: {
    platform: string;
    hostelName: string;
    status: OrderStatus;
    committedTotalPaise: number;
    minimumAmountPaise: number;
    finalActualTotalPaise: number | null;
    purchaseNotes?: string;
    totalApprovedUnits: number;
    totalApprovedLineItems: number;
    memberShares: Array<{
      user: {
        id: string;
        fullName: string;
        roomNumber?: string;
        phoneNumber?: string;
      };
      approvedSubtotalPaise: number;
      itemsCount: number;
      items: OrderItemRecord[];
    }>;
  };
  activities: OrderActivityRecord[];
}

export interface DashboardData {
  myActiveOrders: OrderSummaryCard[];
  initiatedOrders: OrderSummaryCard[];
  pendingForMyApproval: OrderItemRecord[];
  mySubmittedItems: OrderItemRecord[];
  myItemsAwaitingReview: OrderItemRecord[];
  recentlyCompletedOrders: OrderSummaryCard[];
}
