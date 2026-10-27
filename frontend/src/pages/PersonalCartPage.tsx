import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PackageCheck, ArrowRight, ExternalLink, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { DashboardData, ItemStatus } from '../types';
import { formatPaiseToRupees, formatDateTime } from '../lib/format';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

export const PersonalCartPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | ItemStatus>('ALL');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardData>('/orders/dashboard')
  });

  if (isLoading) {
    return <LoadingState rows={3} label="Loading your personal items..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load your items'}
        onRetry={() => void refetch()}
      />
    );
  }

  const allItems = data.mySubmittedItems || [];
  const filteredItems =
    statusFilter === 'ALL'
      ? allItems
      : allItems.filter((item) => item.status === statusFilter);

  const approvedTotalPaise = allItems
    .filter((i) => i.status === 'APPROVED')
    .reduce((sum, i) => sum + i.subtotalPaise, 0);
  const pendingTotalPaise = allItems
    .filter((i) => i.status === 'PENDING')
    .reduce((sum, i) => sum + i.subtotalPaise, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            My Requested Items
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Track all products you have requested across hostel order windows, check review status,
            or revise rejected items.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-2 rounded-lg bg-white border border-stone-200">
            <span className="text-zinc-500">Approved Spend: </span>
            <span className="font-mono font-bold text-emerald-800">
              {formatPaiseToRupees(approvedTotalPaise)}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-white border border-stone-200">
            <span className="text-zinc-500">Pending Review: </span>
            <span className="font-mono font-bold text-amber-700">
              {formatPaiseToRupees(pendingTotalPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex rounded-lg bg-stone-200/70 p-1 border border-stone-200">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === tab
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No item requests found"
          description="Join an open hostel order window and submit the products you want."
          action={
            <Link
              to="/orders"
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
            >
              Browse Open Order Windows
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-xs font-semibold text-zinc-800">
                    {item.platform}
                  </span>
                  <Link
                    to={`/orders/${item.orderWindowId}`}
                    className="text-xs font-semibold text-emerald-700 hover:underline truncate"
                  >
                    {item.orderTitle}
                  </Link>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                <h3 className="text-sm font-semibold text-zinc-900">{item.productName}</h3>

                {item.variantDetails && (
                  <p className="text-xs text-zinc-600">Variant: {item.variantDetails}</p>
                )}

                {item.productUrl && (
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Product URL
                  </a>
                )}

                {item.status === 'REJECTED' && item.rejectionReason && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-xs text-red-800 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Rejected: {item.rejectionReason}</span>
                  </div>
                )}

                <p className="text-[11px] text-zinc-400">
                  Submitted {formatDateTime(item.createdAt)}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-base font-bold text-zinc-900">
                    {formatPaiseToRupees(item.subtotalPaise)}
                  </div>
                  <div className="font-mono text-xs text-zinc-500">
                    {item.quantity} × {formatPaiseToRupees(item.unitPricePaise)}
                  </div>
                </div>

                <Link
                  to={`/orders/${item.orderWindowId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-zinc-800"
                >
                  {item.status === 'REJECTED'
                    ? 'Revise & Resubmit'
                    : item.status === 'PENDING'
                    ? 'Edit / View in Order'
                    : 'Open Order'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

