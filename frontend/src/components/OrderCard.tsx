import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, Users, UserCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { OrderSummaryCard } from '../types';
import { formatTimeRemaining } from '../lib/format';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface OrderCardProps {
  order: OrderSummaryCard;
  viewerHostelId?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, viewerHostelId }) => {
  const isSameHostel = !viewerHostelId || order.hostelId === viewerHostelId;
  const isFull =
    order.participantLimit !== null && order.participantCount >= order.participantLimit;

  return (
    <div className="bg-white border border-stone-200/85 rounded-xl p-5 shadow-sm hover:border-stone-300 transition-all flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <PlatformBadge platform={order.platform} category={order.category} />
          <StatusBadge status={order.status} size="sm" />
        </div>

        <div>
          <Link
            to={`/orders/${order.id}`}
            className="text-base font-semibold text-zinc-900 hover:text-emerald-800 transition-colors line-clamp-1"
          >
            {order.title}
          </Link>
          {order.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
              {order.description}
            </p>
          )}
        </div>

        <ProgressBar
          committedTotalPaise={order.committedTotalPaise}
          minimumAmountPaise={order.minimumAmountPaise}
          compact
        />
      </div>

      <div className="pt-3 border-t border-stone-100 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
          <div className="inline-flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate font-medium text-zinc-700">
              {order.hostel?.name || 'Hostel'}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 justify-end">
            <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-mono">
              {order.participantCount}
              {order.participantLimit ? `/${order.participantLimit}` : ''} joined
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 truncate">
            <UserCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">
              By {order.initiator?.fullName || 'Initiator'}
              {order.initiator?.roomNumber ? ` (${order.initiator.roomNumber})` : ''}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 justify-end">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-medium text-zinc-700">
              {formatTimeRemaining(order.deadline, order.status)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {order.isInitiator ? (
              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                You Initiated
              </span>
            ) : order.isJoined ? (
              <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-zinc-800 text-[11px] font-medium">
                Joined
              </span>
            ) : !isSameHostel ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                <ShieldAlert className="w-3 h-3" />
                Other Hostel
              </span>
            ) : isFull && order.status === 'OPEN' ? (
              <span className="text-[11px] text-red-700 font-medium">Order Full</span>
            ) : null}

            {order.isInitiator && order.pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-semibold">
                {order.pendingRequestsCount} pending review
              </span>
            )}
          </div>

          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors ml-auto"
          >
            {order.isInitiator
              ? 'Manage Order'
              : order.isJoined
              ? 'Open Order'
              : 'View Details'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

