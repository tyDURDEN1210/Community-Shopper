import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  Compass,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  DoorOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { DashboardData } from '../types';
import { formatPaiseToRupees } from '../lib/format';
import { OrderCard } from '../components/OrderCard';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ApprovalControls } from '../components/ApprovalControls';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardData>('/orders/dashboard')
  });

  const approveMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      apiRequest(`/orders/${orderId}/items/${itemId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      orderId,
      itemId,
      rejectionReason
    }: {
      orderId: string;
      itemId: string;
      rejectionReason?: string;
    }) =>
      apiRequest(`/orders/${orderId}/items/${itemId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  if (isLoading) {
    return <LoadingState rows={4} label="Loading your dashboard..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Could not load dashboard'}
        onRetry={() => void refetch()}
      />
    );
  }

  const totalCommittedAcrossActive = data.myActiveOrders.reduce(
    (sum, o) => sum + o.committedTotalPaise,
    0
  );
  const targetsMetCount = data.myActiveOrders.filter((o) => o.isTargetReached).length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>{user?.hostel?.name || 'Hostel Resident'}</span>
            <span>•</span>
            <span className="font-mono">Room {user?.roomNumber}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Track your active hostel group baskets, review incoming item requests, and monitor
            minimum-order targets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-zinc-800 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            Browse Hostel Orders
          </Link>
          <Link
            to="/orders/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Order Window
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200/85 rounded-xl p-4">
          <span className="text-xs text-zinc-500 font-medium">My Active Order Windows</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-zinc-900">
              {data.myActiveOrders.length}
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              {targetsMetCount} reached target
            </span>
          </div>
        </div>

        <div className="bg-white border border-stone-200/85 rounded-xl p-4">
          <span className="text-xs text-zinc-500 font-medium">Orders I Initiated</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-zinc-900">
              {data.initiatedOrders.length}
            </span>
            <span className="text-xs text-zinc-500">Hostel organizer</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200/85 rounded-xl p-4">
          <span className="text-xs text-zinc-500 font-medium">Awaiting My Approval</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-amber-700">
              {data.pendingForMyApproval.length}
            </span>
            <Link
              to="/moderation"
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Open queue →
            </Link>
          </div>
        </div>

        <div className="bg-white border border-stone-200/85 rounded-xl p-4">
          <span className="text-xs text-zinc-500 font-medium">Active Committed Volume</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-emerald-800">
              {formatPaiseToRupees(totalCommittedAcrossActive)}
            </span>
            <span className="text-xs text-zinc-500">Approved items</span>
          </div>
        </div>
      </div>

      {/* Section 1: Pending Requests Requiring My Approval */}
      {data.pendingForMyApproval.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-bold text-zinc-900">
                Pending Requests Requiring Your Approval ({data.pendingForMyApproval.length})
              </h2>
            </div>
            <Link
              to="/moderation"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              Full Moderation Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.pendingForMyApproval.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/orders/${item.orderWindowId}`}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      {item.platform} • {item.orderTitle}
                    </Link>
                    <h3 className="text-sm font-semibold text-zinc-900 mt-0.5">
                      {item.productName}
                    </h3>
                    {item.variantDetails && (
                      <p className="text-xs text-zinc-500">Variant: {item.variantDetails}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-zinc-900">
                      {formatPaiseToRupees(item.subtotalPaise)}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500">
                      {item.quantity} × {formatPaiseToRupees(item.unitPricePaise)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <span className="font-medium text-zinc-800">{item.requester?.fullName}</span>
                    {item.requester?.roomNumber && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[11px]">
                        <DoorOpen className="w-3 h-3" />
                        {item.requester.roomNumber}
                      </span>
                    )}
                  </div>
                  <ApprovalControls
                    itemId={item.id}
                    productName={item.productName}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                    onApprove={(id) =>
                      approveMutation.mutate({ orderId: item.orderWindowId, itemId: id })
                    }
                    onReject={(id, reason) =>
                      rejectMutation.mutate({
                        orderId: item.orderWindowId,
                        itemId: id,
                        rejectionReason: reason
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: My Active Order Windows */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">
            My Active Order Windows ({data.myActiveOrders.length})
          </h2>
          <Link
            to="/orders"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            Discover More <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.myActiveOrders.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No active order windows yet"
            description="Join an open order in your hostel or create a new order window to start pooling items."
            action={
              <div className="flex items-center gap-2">
                <Link
                  to="/orders"
                  className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-zinc-800 hover:bg-stone-50"
                >
                  Browse Hostel Feed
                </Link>
                <Link
                  to="/orders/new"
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                >
                  Create Order Window
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.myActiveOrders.map((order) => (
              <OrderCard key={order.id} order={order} viewerHostelId={user?.hostelId} />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Order Windows I Initiated & My Submitted Items Awaiting Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">
              Order Windows I Initiated ({data.initiatedOrders.length})
            </h2>
          </div>

          {data.initiatedOrders.length === 0 ? (
            <EmptyState
              icon={PlusCircle}
              title="You haven't initiated an order window yet"
              description="When you want to order from Blinkit, Swiggy, Amazon, or Myntra, open a window so hostel mates can join."
            />
          ) : (
            <div className="space-y-3">
              {data.initiatedOrders.slice(0, 4).map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white border border-stone-200/85 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-500">{ord.platform}</span>
                      <StatusBadge status={ord.status} size="sm" />
                    </div>
                    <Link
                      to={`/orders/${ord.id}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-emerald-700 truncate block mt-0.5"
                    >
                      {ord.title}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                      {formatPaiseToRupees(ord.committedTotalPaise)} /{' '}
                      {formatPaiseToRupees(ord.minimumAmountPaise)} ({ord.progressPercentage}%)
                    </p>
                  </div>
                  <Link
                    to={`/orders/${ord.id}`}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-zinc-800 shrink-0"
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">
              My Submitted Items Awaiting Review ({data.myItemsAwaitingReview.length})
            </h2>
            <Link
              to="/my-items"
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View all my items →
            </Link>
          </div>

          {data.myItemsAwaitingReview.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No pending items awaiting review"
              description="All your submitted item requests have been reviewed or you haven't submitted any pending items."
            />
          ) : (
            <div className="space-y-3">
              {data.myItemsAwaitingReview.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-stone-200/85 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {item.platform} • {item.orderTitle}
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-900 truncate">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono">
                      {item.quantity} × {formatPaiseToRupees(item.unitPricePaise)} ={' '}
                      <span className="font-semibold text-zinc-800">
                        {formatPaiseToRupees(item.subtotalPaise)}
                      </span>
                    </p>
                  </div>
                  <Link
                    to={`/orders/${item.orderWindowId}`}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-zinc-700 hover:bg-stone-50 shrink-0"
                  >
                    View Order
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Section 4: Recently Completed Orders */}
      {data.recentlyCompletedOrders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-zinc-500" />
            <h2 className="text-base font-bold text-zinc-900">
              Recently Completed & Archived Orders ({data.recentlyCompletedOrders.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.recentlyCompletedOrders.slice(0, 3).map((ord) => (
              <OrderCard key={ord.id} order={ord} viewerHostelId={user?.hostelId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

