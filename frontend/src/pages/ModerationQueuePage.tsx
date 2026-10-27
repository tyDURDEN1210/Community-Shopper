import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, DoorOpen, ExternalLink, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { DashboardData } from '../types';
import { formatPaiseToRupees, formatDateTime } from '../lib/format';
import { ApprovalControls } from '../components/ApprovalControls';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

export const ModerationQueuePage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardData>('/orders/dashboard')
  });

  const approveMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      apiRequest(`/orders/${orderId}/items/${itemId}/approve`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  if (isLoading) {
    return <LoadingState rows={3} label="Loading moderation queue..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load moderation queue'}
        onRetry={() => void refetch()}
      />
    );
  }

  const queue = data.pendingForMyApproval || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Initiator Moderation Queue
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Review pending item requests across all OPEN order windows you initiated. Approving an
            item atomically updates the committed order total.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 self-start">
          {queue.length} Pending Request(s)
        </span>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="All caught up! Zero pending requests"
          description="When hostel members submit item requests to your open order windows, they will appear here for review."
          action={
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-zinc-800 hover:bg-stone-50"
            >
              Return to Dashboard
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-xs font-semibold text-zinc-800">
                      {item.platform}
                    </span>
                    <Link
                      to={`/orders/${item.orderWindowId}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      {item.orderTitle} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900">{item.productName}</h3>

                  {item.variantDetails && (
                    <p className="text-xs text-zinc-600">
                      <span className="font-semibold">Variant:</span> {item.variantDetails}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-zinc-500 italic">Member Note: "{item.notes}"</p>
                  )}

                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Verify Product Link
                    </a>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="font-mono text-lg font-bold text-zinc-900">
                    {formatPaiseToRupees(item.subtotalPaise)}
                  </div>
                  <div className="font-mono text-xs text-zinc-500">
                    {item.quantity} × {formatPaiseToRupees(item.unitPricePaise)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-stone-100 flex-wrap">
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  <span>
                    Requested by <strong className="text-zinc-900">{item.requester?.fullName}</strong>
                  </span>
                  {item.requester?.roomNumber && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-zinc-800">
                      <DoorOpen className="w-3.5 h-3.5 text-zinc-500" />
                      Room {item.requester.roomNumber}
                    </span>
                  )}
                  <span className="text-zinc-400">{formatDateTime(item.createdAt)}</span>
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
      )}
    </div>
  );
};

