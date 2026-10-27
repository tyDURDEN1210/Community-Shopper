import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Clock,
  Users,
  Lock,
  CheckCircle2,
  ShoppingCart,
  XCircle,
  UserPlus,
  LogOut,
  ClipboardList,
  Activity,
  Phone,
  DoorOpen,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { OrderDetail, OrderItemRecord } from '../types';
import {
  formatPaiseToRupees,
  formatTimeRemaining,
  formatDateTime,
  formatTargetBasisLabel,
  rupeesToPaise,
  paiseToRupeesNumber
} from '../lib/format';
import { useOrderSocket } from '../hooks/useOrderSocket';
import { PlatformBadge } from '../components/PlatformBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ItemRequestCard } from '../components/ItemRequestCard';
import { ItemForm } from '../components/ItemForm';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useOrderSocket(orderId);

  const [moderationTab, setModerationTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [editingItem, setEditingItem] = useState<OrderItemRecord | null>(null);
  const [resubmittingItem, setResubmittingItem] = useState<OrderItemRecord | null>(null);
  const [itemToDelete, setItemToDelete] = useState<OrderItemRecord | null>(null);

  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [finalRupeesInput, setFinalRupeesInput] = useState<string>('');
  const [purchaseNotesInput, setPurchaseNotesInput] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const {
    data: orderData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiRequest<{ order: OrderDetail }>(`/orders/${orderId}`),
    enabled: Boolean(orderId)
  });

  const order = orderData?.order;

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const joinMutation = useMutation({
    mutationFn: () => apiRequest(`/orders/${orderId}/join`, { method: 'POST' }),
    onSuccess: async () => {
      setActionBanner({
        type: 'success',
        message: 'You have joined this order window! Your hostel and room details were linked automatically.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest(`/orders/${orderId}/leave`, { method: 'POST' }),
    onSuccess: async () => {
      setActionBanner({ type: 'success', message: 'You have left this order window.' });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: {
      productName: string;
      productUrl?: string;
      unitPricePaise: number;
      quantity: number;
      variantDetails?: string;
      notes?: string;
    }) =>
      apiRequest(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setActionBanner({
        type: 'success',
        message: 'Item request submitted! It is now PENDING initiator approval.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      payload
    }: {
      itemId: string;
      payload: {
        productName: string;
        productUrl?: string;
        unitPricePaise: number;
        quantity: number;
        variantDetails?: string;
        notes?: string;
      };
    }) =>
      apiRequest(`/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setEditingItem(null);
      setActionBanner({ type: 'success', message: 'Pending item updated.' });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const resubmitItemMutation = useMutation({
    mutationFn: ({
      itemId,
      payload
    }: {
      itemId: string;
      payload: {
        productName: string;
        productUrl?: string;
        unitPricePaise: number;
        quantity: number;
        variantDetails?: string;
        notes?: string;
      };
    }) =>
      apiRequest(`/orders/${orderId}/items/${itemId}/resubmit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setResubmittingItem(null);
      setActionBanner({
        type: 'success',
        message: 'Revised item resubmitted and returned to PENDING review.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setItemToDelete(null);
      setActionBanner({ type: 'success', message: 'Pending item request deleted.' });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const approveMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/orders/${orderId}/items/${itemId}/approve`, { method: 'POST' }),
    onSuccess: async () => {
      setActionBanner({
        type: 'success',
        message: 'Item approved and added to the committed group total.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const rejectMutation = useMutation({
    mutationFn: ({ itemId, rejectionReason }: { itemId: string; rejectionReason?: string }) =>
      apiRequest(`/orders/${orderId}/items/${itemId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason })
      }),
    onSuccess: async () => {
      setActionBanner({ type: 'success', message: 'Item rejected.' });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const lockMutation = useMutation({
    mutationFn: (acknowledgePending: boolean) =>
      apiRequest(`/orders/${orderId}/lock`, {
        method: 'POST',
        body: JSON.stringify({ acknowledgePending })
      }),
    onSuccess: async () => {
      setShowLockDialog(false);
      setActionBanner({
        type: 'success',
        message: 'Order window locked! Item additions and edits are now frozen.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const confirmMutation = useMutation({
    mutationFn: () => apiRequest(`/orders/${orderId}/confirm`, { method: 'POST' }),
    onSuccess: async () => {
      setActionBanner({
        type: 'success',
        message: 'Consolidated order confirmed! You can now place the external order.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const purchaseMutation = useMutation({
    mutationFn: (payload: { finalActualTotalPaise: number; purchaseNotes?: string }) =>
      apiRequest(`/orders/${orderId}/purchase`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setShowPurchaseModal(false);
      setActionBanner({
        type: 'success',
        message: 'Order marked as PURCHASED with final external total recorded.'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const completeMutation = useMutation({
    mutationFn: () => apiRequest(`/orders/${orderId}/complete`, { method: 'POST' }),
    onSuccess: async () => {
      setActionBanner({
        type: 'success',
        message: 'Order marked as COMPLETED!'
      });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  const cancelMutation = useMutation({
    mutationFn: (cancellationReason?: string) =>
      apiRequest(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason })
      }),
    onSuccess: async () => {
      setShowCancelDialog(false);
      setActionBanner({ type: 'success', message: 'Order window has been cancelled.' });
      await invalidateAll();
    },
    onError: (err: Error) => setActionBanner({ type: 'error', message: err.message })
  });

  if (isLoading) {
    return <LoadingState rows={4} label="Loading order window details..." />;
  }

  if (error || !order) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Order window not found'}
        onRetry={() => void refetch()}
      />
    );
  }

  const { isInitiator, isParticipant, canJoin, canLeave } = order.viewerContext;
  const isSameHostel = user?.hostelId === order.hostelId;
  const isFull =
    order.participantLimit !== null && order.participantCount >= order.participantLimit;

  const copyConsolidatedSummaryText = () => {
    const lines = [
      `CAMPUS CART — CONSOLIDATED ORDER SUMMARY`,
      `Order: ${order.title}`,
      `Platform: ${order.platform} | Hostel: ${order.hostel.name}`,
      `Committed Approved Total: ${formatPaiseToRupees(order.committedTotalPaise)}`,
      `----------------------------------------`,
      ...order.approvedItems.map(
        (item, idx) =>
          `${idx + 1}. ${item.productName}${
            item.variantDetails ? ` (${item.variantDetails})` : ''
          } — ${item.quantity} x ${formatPaiseToRupees(item.unitPricePaise)} = ${formatPaiseToRupees(
            item.subtotalPaise
          )} [${item.requester?.fullName || 'Member'}${
            item.requester?.roomNumber ? `, Room ${item.requester.roomNumber}` : ''
          }]`
      )
    ];
    void navigator.clipboard?.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Status Banner */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Link to="/orders" className="hover:text-zinc-900 font-medium">
            Order Windows
          </Link>
          <span>/</span>
          <span className="text-zinc-800 font-semibold truncate max-w-xs">{order.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
            Lifecycle:
          </span>
          {(['OPEN', 'LOCKED', 'CONFIRMED', 'PURCHASED', 'COMPLETED'] as const).map((step, i) => (
            <React.Fragment key={step}>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  order.status === step
                    ? 'bg-emerald-700 text-white'
                    : 'bg-stone-200/70 text-zinc-600'
                }`}
              >
                {step}
              </span>
              {i < 4 && <span className="text-zinc-300">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {actionBanner && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            actionBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{actionBanner.message}</span>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: OVERVIEW AND PROGRESS */}
      <section className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <PlatformBadge platform={order.platform} category={order.category} />
              <StatusBadge status={order.status} />
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-xs font-medium text-zinc-700">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                {order.hostel.name}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{order.title}</h1>

            {order.description && (
              <p className="text-sm text-zinc-600 leading-relaxed">{order.description}</p>
            )}

            <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-600 pt-1">
              <span>
                Initiated by{' '}
                <strong className="text-zinc-900">{order.initiator.fullName}</strong> (Room{' '}
                <span className="font-mono font-semibold">{order.initiator.roomNumber}</span>)
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {formatTimeRemaining(order.deadline, order.status)} (Deadline:{' '}
                {formatDateTime(order.deadline)})
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono font-semibold">{order.participantCount}</span>
                {order.participantLimit ? ` / ${order.participantLimit}` : ''} participants
              </span>
            </div>

            {order.deliveryNotes && (
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 text-xs text-zinc-700">
                <strong className="text-zinc-900">Fulfilment / Pickup Notes:</strong>{' '}
                {order.deliveryNotes}
              </div>
            )}
          </div>

          {/* Primary Actions Column */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            {canJoin && (
              <button
                type="button"
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {joinMutation.isPending ? 'Joining Order...' : 'Join Order Window'}
              </button>
            )}

            {!isParticipant && !canJoin && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 max-w-xs">
                <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  Cannot Join Order Window
                </div>
                {!isSameHostel
                  ? `This order is restricted to residents of ${order.hostel.name}.`
                  : order.status !== 'OPEN'
                  ? `This order window is currently ${order.status}.`
                  : isFull
                  ? `This order has reached its ${order.participantLimit}-participant limit.`
                  : 'The joining deadline for this order window has passed.'}
              </div>
            )}

            {canLeave && (
              <button
                type="button"
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-medium text-zinc-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave Order Window
              </button>
            )}

            {/* Initiator Lifecycle Controls */}
            {isInitiator && order.status === 'OPEN' && (
              <button
                type="button"
                onClick={() => {
                  setFinalRupeesInput(String(paiseToRupeesNumber(order.committedTotalPaise)));
                  setShowLockDialog(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Order Window
              </button>
            )}

            {isInitiator && order.status === 'LOCKED' && (
              <>
                <button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || order.approvedItemsCount === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm Consolidated List'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFinalRupeesInput(String(paiseToRupeesNumber(order.committedTotalPaise)));
                    setShowPurchaseModal(true);
                  }}
                  disabled={order.approvedItemsCount === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Record External Purchase
                </button>
              </>
            )}

            {isInitiator && order.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => {
                  setFinalRupeesInput(String(paiseToRupeesNumber(order.committedTotalPaise)));
                  setShowPurchaseModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Mark Order as Purchased
              </button>
            )}

            {isInitiator && order.status === 'PURCHASED' && (
              <button
                type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {completeMutation.isPending ? 'Completing...' : 'Mark Delivered & Completed'}
              </button>
            )}

            {isInitiator &&
              ['OPEN', 'LOCKED', 'CONFIRMED'].includes(order.status) && (
                <button
                  type="button"
                  onClick={() => setShowCancelDialog(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Order
                </button>
              )}
          </div>
        </div>

        {/* Target Progress Box */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/90 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-2">
            <span className="font-semibold text-zinc-800">
              Target Calculation Basis: {formatTargetBasisLabel(order.targetBasis)}
            </span>
            <div className="flex items-center gap-4 font-mono">
              <span>Approved Items: {order.approvedItemsCount}</span>
              <span>Pending Review: {order.pendingRequestsCount}</span>
            </div>
          </div>
          <ProgressBar
            committedTotalPaise={order.committedTotalPaise}
            minimumAmountPaise={order.minimumAmountPaise}
            targetBasisNote={order.targetBasisNote}
          />
        </div>
      </section>

      {/* SECTION 3 (FOR INITIATOR): INITIATOR MODERATION QUEUE */}
      {isInitiator && (
        <section className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Initiator Moderation Queue
              </h2>
              <p className="text-xs text-zinc-500">
                Review member item requests. Approving an item atomically adds its subtotal to the
                committed group target.
              </p>
            </div>

            <div className="inline-flex rounded-lg bg-stone-100 p-1 border border-stone-200 self-start">
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => {
                const count =
                  tab === 'PENDING'
                    ? order.pendingItems.length
                    : tab === 'APPROVED'
                    ? order.approvedItems.length
                    : order.rejectedItems.length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setModerationTab(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      moderationTab === tab
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {moderationTab === 'PENDING' &&
            (order.pendingItems.length === 0 ? (
              <EmptyState
                title="No pending item requests"
                description="All submitted requests in this order window have been reviewed."
              />
            ) : (
              <div className="space-y-3">
                {order.pendingItems.map((item) => (
                  <ItemRequestCard
                    key={item.id}
                    item={item}
                    orderStatus={order.status}
                    isViewerInitiator={isInitiator}
                    isViewerOwner={item.requesterId === user?.id}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(id, reason) =>
                      rejectMutation.mutate({ itemId: id, rejectionReason: reason })
                    }
                    onEdit={(it) => setEditingItem(it)}
                    onDelete={(it) => setItemToDelete(it)}
                  />
                ))}
              </div>
            ))}

          {moderationTab === 'APPROVED' &&
            (order.approvedItems.length === 0 ? (
              <EmptyState
                title="No approved items yet"
                description="Approve pending requests above to add them to the consolidated basket."
              />
            ) : (
              <div className="space-y-3">
                {order.approvedItems.map((item) => (
                  <ItemRequestCard
                    key={item.id}
                    item={item}
                    orderStatus={order.status}
                    isViewerInitiator={isInitiator}
                    isViewerOwner={item.requesterId === user?.id}
                  />
                ))}
              </div>
            ))}

          {moderationTab === 'REJECTED' &&
            (order.rejectedItems.length === 0 ? (
              <EmptyState
                title="No rejected items"
                description="Rejected item requests will appear here with their rejection reason."
              />
            ) : (
              <div className="space-y-3">
                {order.rejectedItems.map((item) => (
                  <ItemRequestCard
                    key={item.id}
                    item={item}
                    orderStatus={order.status}
                    isViewerInitiator={isInitiator}
                    isViewerOwner={item.requesterId === user?.id}
                    onResubmit={(it) => setResubmittingItem(it)}
                  />
                ))}
              </div>
            ))}
        </section>
      )}

      {/* SECTION 4: MY ITEMS & ADD ITEM FORM (FOR PARTICIPANTS) */}
      {isParticipant && (
        <section className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                My Requested Items ({order.myItems.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Your identity ({user?.fullName}, Room {user?.roomNumber}) is automatically attached
                from your profile.
              </p>
            </div>
          </div>

          {order.status === 'OPEN' ? (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/90 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                {editingItem
                  ? `Editing Pending Request: ${editingItem.productName}`
                  : resubmittingItem
                  ? `Revise & Resubmit Rejected Request: ${resubmittingItem.productName}`
                  : 'Add an Item Request to This Order'}
              </h3>

              {editingItem ? (
                <ItemForm
                  key={`edit-${editingItem.id}`}
                  initialItem={editingItem}
                  mode="edit"
                  isSubmitting={updateItemMutation.isPending}
                  onSubmitItem={async (payload) => {
                    await updateItemMutation.mutateAsync({
                      itemId: editingItem.id,
                      payload
                    });
                  }}
                  onCancel={() => setEditingItem(null)}
                />
              ) : resubmittingItem ? (
                <ItemForm
                  key={`resubmit-${resubmittingItem.id}`}
                  initialItem={resubmittingItem}
                  mode="resubmit"
                  isSubmitting={resubmitItemMutation.isPending}
                  onSubmitItem={async (payload) => {
                    await resubmitItemMutation.mutateAsync({
                      itemId: resubmittingItem.id,
                      payload
                    });
                  }}
                  onCancel={() => setResubmittingItem(null)}
                />
              ) : (
                <ItemForm
                  mode="create"
                  isSubmitting={addItemMutation.isPending}
                  onSubmitItem={async (payload) => {
                    await addItemMutation.mutateAsync(payload);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                This order window is <strong>{order.status}</strong>. New item requests and item
                modifications are frozen.
              </span>
            </div>
          )}

          {order.myItems.length === 0 ? (
            <EmptyState
              title="You haven't requested any items in this order yet"
              description="Use the form above to add a product name, unit price, and quantity."
            />
          ) : (
            <div className="space-y-3">
              {order.myItems.map((item) => (
                <ItemRequestCard
                  key={item.id}
                  item={item}
                  orderStatus={order.status}
                  isViewerInitiator={isInitiator}
                  isViewerOwner={true}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                  onApprove={isInitiator ? (id) => approveMutation.mutate(id) : undefined}
                  onReject={
                    isInitiator
                      ? (id, reason) =>
                          rejectMutation.mutate({ itemId: id, rejectionReason: reason })
                      : undefined
                  }
                  onEdit={(it) => {
                    setResubmittingItem(null);
                    setEditingItem(it);
                  }}
                  onDelete={(it) => setItemToDelete(it)}
                  onResubmit={(it) => {
                    setEditingItem(null);
                    setResubmittingItem(it);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2 & SECTION 7: APPROVED ITEMS & CONSOLIDATED PURCHASE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Approved Items in Group Basket ({order.approvedItems.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Official items approved by the initiator and committed to the order target.
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-emerald-800">
              {formatPaiseToRupees(order.committedTotalPaise)}
            </span>
          </div>

          {order.approvedItems.length === 0 ? (
            <EmptyState
              title="No approved items yet"
              description="Once the initiator approves submitted requests, they will be listed here."
            />
          ) : (
            <div className="space-y-3">
              {order.approvedItems.map((item) => (
                <ItemRequestCard
                  key={item.id}
                  item={item}
                  orderStatus={order.status}
                  isViewerInitiator={isInitiator}
                  isViewerOwner={item.requesterId === user?.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 7: CONSOLIDATED PURCHASE SUMMARY */}
        <section className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-4 self-start">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-bold text-zinc-900">Consolidated Summary</h2>
            </div>
            {order.approvedItems.length > 0 && (
              <button
                type="button"
                onClick={copyConsolidatedSummaryText}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-stone-200 text-xs font-medium text-zinc-700 hover:bg-stone-50"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy List
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Platform</span>
              <span className="font-semibold text-zinc-900">{order.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Approved Line Items</span>
              <span className="font-mono font-semibold text-zinc-900">
                {order.consolidatedSummary.totalApprovedLineItems} (
                {order.consolidatedSummary.totalApprovedUnits} units)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Committed Item Total</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatPaiseToRupees(order.committedTotalPaise)}
              </span>
            </div>
            {order.finalActualTotalPaise !== null && (
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="font-semibold text-zinc-800">Recorded Final Checkout Total</span>
                <span className="font-mono font-bold text-indigo-800">
                  {formatPaiseToRupees(order.finalActualTotalPaise)}
                </span>
              </div>
            )}
            {order.purchaseNotes && (
              <div className="pt-1 text-[11px] text-zinc-600 italic">
                Purchase Reference: "{order.purchaseNotes}"
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Member Contribution Breakdown
            </h3>
            {order.consolidatedSummary.memberShares.length === 0 ? (
              <p className="text-xs text-zinc-500">No approved member contributions yet.</p>
            ) : (
              <div className="space-y-2">
                {order.consolidatedSummary.memberShares.map((share) => (
                  <div
                    key={share.user.id}
                    className="p-3 rounded-lg border border-stone-200/80 bg-white space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-900">{share.user.fullName}</span>
                      <span className="font-mono font-semibold text-zinc-900">
                        {formatPaiseToRupees(share.approvedSubtotalPaise)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {share.user.roomNumber ? `Room ${share.user.roomNumber}` : 'Resident'}
                        {share.user.phoneNumber ? ` • ${share.user.phoneNumber}` : ''}
                      </span>
                      <span>{share.itemsCount} unit(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SECTION 5 & SECTION 6: PARTICIPANTS & ORDER ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 5: PARTICIPANTS */}
        <section className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-bold text-zinc-900">
                Participants ({order.participants.length})
              </h2>
            </div>
            <span className="text-[11px] text-zinc-500">
              {isInitiator
                ? 'Initiator view: room & contact visible for coordination'
                : 'Phone numbers are private to the order initiator'}
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {order.participants.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{p.user.fullName}</span>
                    {p.role === 'INITIATOR' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                        INITIATOR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500 mt-0.5">
                    {p.user.roomNumber && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <DoorOpen className="w-3 h-3" />
                        Room {p.user.roomNumber}
                      </span>
                    )}
                    {p.user.phoneNumber && (
                      <span className="inline-flex items-center gap-1 font-mono text-zinc-700">
                        <Phone className="w-3 h-3 text-emerald-700" />
                        {p.user.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Joined {formatDateTime(p.joinedAt)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6: ORDER ACTIVITY TIMELINE */}
        <section className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-bold text-zinc-900">Activity & Status Log</h2>
          </div>

          {order.activities.length === 0 ? (
            <p className="text-xs text-zinc-500">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {order.activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 text-xs border-l-2 border-stone-200 pl-3 py-0.5"
                >
                  <p className="text-zinc-700">{act.message}</p>
                  <span className="text-[11px] text-zinc-400 shrink-0 font-mono">
                    {formatDateTime(act.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* DIALOG 1: CONFIRM DELETE ITEM */}
      <ConfirmationDialog
        isOpen={Boolean(itemToDelete)}
        title="Delete Pending Item Request?"
        description={`Are you sure you want to remove "${itemToDelete?.productName}" from your requests?`}
        confirmLabel="Delete Item"
        variant="danger"
        isPending={deleteItemMutation.isPending}
        onConfirm={() => {
          if (itemToDelete) {
            deleteItemMutation.mutate(itemToDelete.id);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* DIALOG 2: LOCK ORDER WINDOW */}
      <ConfirmationDialog
        isOpen={showLockDialog}
        title="Lock Order Window & Freeze Requests?"
        description="Locking this order window freezes all item additions, edits, and approvals so you can finalize the consolidated purchase list."
        confirmLabel={
          order.pendingRequestsCount > 0
            ? `Lock Anyway (${order.pendingRequestsCount} Pending Ignored)`
            : 'Lock Order Window'
        }
        variant={order.pendingRequestsCount > 0 ? 'warning' : 'primary'}
        isPending={lockMutation.isPending}
        onConfirm={() => lockMutation.mutate(true)}
        onCancel={() => setShowLockDialog(false)}
      >
        <div className="space-y-2 text-xs bg-stone-50 p-3 rounded-lg border border-stone-200">
          <div className="flex justify-between">
            <span className="text-zinc-600">Approved Items:</span>
            <span className="font-mono font-semibold">{order.approvedItemsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Committed Total:</span>
            <span className="font-mono font-semibold text-emerald-800">
              {formatPaiseToRupees(order.committedTotalPaise)}
            </span>
          </div>
          {order.pendingRequestsCount > 0 && (
            <div className="flex items-start gap-2 pt-2 border-t border-stone-200 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Warning: There are still <strong>{order.pendingRequestsCount}</strong> unreviewed
                pending item request(s). Locking now will leave them unapproved.
              </span>
            </div>
          )}
        </div>
      </ConfirmationDialog>

      {/* DIALOG 3: MARK ORDER AS PURCHASED */}
      <ConfirmationDialog
        isOpen={showPurchaseModal}
        title={`Record External Purchase on ${order.platform}`}
        description="Enter the actual final total paid on the shopping platform (including any delivery fees, taxes, or coupon discounts applied at checkout)."
        confirmLabel="Mark as Purchased"
        variant="primary"
        isPending={purchaseMutation.isPending}
        onConfirm={() => {
          const finalActualTotalPaise = rupeesToPaise(finalRupeesInput || 0);
          purchaseMutation.mutate({
            finalActualTotalPaise,
            purchaseNotes: purchaseNotesInput.trim() || undefined
          });
        }}
        onCancel={() => setShowPurchaseModal(false)}
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="final-rupees-input"
              className="block text-xs font-semibold text-zinc-800 mb-1"
            >
              Actual Final Order Total Paid (₹) *
            </label>
            <input
              id="final-rupees-input"
              type="number"
              step="0.01"
              min="0"
              value={finalRupeesInput}
              onChange={(e) => setFinalRupeesInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor="purchase-notes-input"
              className="block text-xs font-semibold text-zinc-800 mb-1"
            >
              External Order ID / ETA Note (Optional)
            </label>
            <input
              id="purchase-notes-input"
              type="text"
              placeholder="e.g., Blinkit Order #BLK-99412, arriving in 14 mins"
              value={purchaseNotesInput}
              onChange={(e) => setPurchaseNotesInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>
      </ConfirmationDialog>

      {/* DIALOG 4: CANCEL ORDER WINDOW */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        title="Cancel Order Window?"
        description="Cancelling this order window closes it permanently and preserves the activity log for participants."
        confirmLabel="Confirm Cancellation"
        variant="danger"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(cancelReasonInput.trim() || undefined)}
        onCancel={() => setShowCancelDialog(false)}
      >
        <div>
          <label
            htmlFor="cancel-reason-input"
            className="block text-xs font-semibold text-zinc-800 mb-1"
          >
            Reason for cancellation (optional)
          </label>
          <input
            id="cancel-reason-input"
            type="text"
            placeholder="e.g., Minimum target not reached before store closing"
            value={cancelReasonInput}
            onChange={(e) => setCancelReasonInput(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
};

