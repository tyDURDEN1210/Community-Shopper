import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { ItemRequestCard } from '../components/ItemRequestCard';
import { OrderCard } from '../components/OrderCard';
import { formatPaiseToRupees, rupeesToPaise } from '../lib/format';
import { OrderItemRecord, OrderSummaryCard } from '../types';

describe('Campus Cart Frontend Components & Calculations', () => {
  it('accurately converts integer paise to rupees and vice-versa', () => {
    expect(rupeesToPaise(125)).toBe(12500);
    expect(rupeesToPaise('199.50')).toBe(19950);
    expect(formatPaiseToRupees(59900)).toContain('599');
  });

  it('renders ProgressBar with committed total, target, and remaining amount', () => {
    render(
      <ProgressBar
        committedTotalPaise={30000}
        minimumAmountPaise={50000}
        targetBasisNote="Item Value Only"
      />
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByText(/60%/i)).toBeInTheDocument();
    expect(screen.getByText(/more in approved items needed/i)).toBeInTheDocument();
    expect(screen.getByText(/Basis: Item Value Only/i)).toBeInTheDocument();
  });

  it('shows target reached state in ProgressBar when committed >= minimum', () => {
    render(<ProgressBar committedTotalPaise={65000} minimumAmountPaise={50000} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/Minimum target reached!/i)).toBeInTheDocument();
  });

  it('renders ItemRequestCard with initiator approval and rejection controls when order is OPEN and item is PENDING', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();

    const sampleItem: OrderItemRecord = {
      id: 'item-101',
      orderWindowId: 'order-1',
      productName: 'Sleepy Owl Cold Brew',
      productUrl: 'https://blinkit.com/prn/cold-brew',
      unitPricePaise: 12500,
      quantity: 2,
      subtotalPaise: 25000,
      variantDetails: '200ml Can',
      status: 'PENDING',
      resubmissionCount: 0,
      requesterId: 'user-2',
      requester: {
        id: 'user-2',
        fullName: 'Rohan Verma',
        roomNumber: 'A-212'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    render(
      <ItemRequestCard
        item={sampleItem}
        orderStatus="OPEN"
        isViewerInitiator={true}
        isViewerOwner={false}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    expect(screen.getByText('Sleepy Owl Cold Brew')).toBeInTheDocument();
    expect(screen.getByText(/Room A-212/i)).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: /Approve Sleepy Owl Cold Brew/i });
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith('item-101');
  });

  it('renders OrderCard with platform, hostel, progress, and cross-hostel indicator', () => {
    const sampleOrder: OrderSummaryCard = {
      id: 'ord-55',
      title: 'Blinkit Late Night Snacks',
      platform: 'Blinkit',
      category: 'QUICK_COMMERCE',
      hostelId: 'hostel-a',
      hostel: {
        id: 'hostel-a',
        name: 'Aravali Hostel',
        code: 'ARAVALI-A',
        block: 'Block A'
      },
      initiatorId: 'user-1',
      initiator: {
        id: 'user-1',
        fullName: 'Aarav Sharma',
        roomNumber: 'A-304'
      },
      minimumAmountPaise: 50000,
      targetBasis: 'ITEM_VALUE_ONLY',
      targetBasisNote: 'Item Value Only',
      committedTotalPaise: 25000,
      amountRemainingPaise: 25000,
      progressPercentage: 50,
      isTargetReached: false,
      approvedItemsCount: 2,
      pendingRequestsCount: 1,
      participantCount: 3,
      participantLimit: 8,
      deadline: new Date(Date.now() + 3600000).toISOString(),
      timeRemainingMs: 3600000,
      status: 'OPEN',
      isJoined: false,
      isInitiator: false,
      createdAt: new Date().toISOString()
    };

    render(
      <MemoryRouter>
        <OrderCard order={sampleOrder} viewerHostelId="hostel-b" />
      </MemoryRouter>
    );

    expect(screen.getByText('Blinkit Late Night Snacks')).toBeInTheDocument();
    expect(screen.getByText('Aravali Hostel')).toBeInTheDocument();
    expect(screen.getByText(/Other Hostel/i)).toBeInTheDocument();
  });
});

