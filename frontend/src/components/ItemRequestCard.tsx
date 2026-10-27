import React from 'react';
import {
  ExternalLink,
  Pencil,
  Trash2,
  RotateCcw,
  User as UserIcon,
  DoorOpen,
  AlertCircle
} from 'lucide-react';
import { OrderItemRecord, OrderStatus } from '../types';
import { formatPaiseToRupees, formatDateTime } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { ApprovalControls } from './ApprovalControls';

interface ItemRequestCardProps {
  item: OrderItemRecord;
  orderStatus: OrderStatus;
  isViewerInitiator: boolean;
  isViewerOwner: boolean;
  isApproving?: boolean;
  isRejecting?: boolean;
  onApprove?: (itemId: string) => void;
  onReject?: (itemId: string, reason?: string) => void;
  onEdit?: (item: OrderItemRecord) => void;
  onDelete?: (item: OrderItemRecord) => void;
  onResubmit?: (item: OrderItemRecord) => void;
}

export const ItemRequestCard: React.FC<ItemRequestCardProps> = ({
  item,
  orderStatus,
  isViewerInitiator,
  isViewerOwner,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onResubmit
}) => {
  const isOrderOpen = orderStatus === 'OPEN';
  const canOwnerEdit = isViewerOwner && isOrderOpen && item.status === 'PENDING';
  const canOwnerDelete = isViewerOwner && isOrderOpen && item.status === 'PENDING';
  const canOwnerResubmit = isViewerOwner && isOrderOpen && item.status === 'REJECTED';
  const canInitiatorModerate =
    isViewerInitiator && isOrderOpen && item.status === 'PENDING' && onApprove && onReject;

  return (
    <div className="bg-white border border-stone-200/85 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-zinc-900 break-words">
              {item.productName}
            </h4>
            <StatusBadge status={item.status} size="sm" />
            {item.resubmissionCount > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-zinc-600 font-medium">
                Revised #{item.resubmissionCount}
              </span>
            )}
          </div>

          {item.variantDetails && (
            <p className="text-xs text-zinc-600">
              <span className="font-medium text-zinc-700">Variant:</span> {item.variantDetails}
            </p>
          )}

          {item.notes && (
            <p className="text-xs text-zinc-500 italic">Note: "{item.notes}"</p>
          )}

          {item.productUrl && (
            <a
              href={item.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline pt-0.5"
            >
              <ExternalLink className="w-3 h-3" />
              View product link
            </a>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-semibold text-zinc-900">
            {formatPaiseToRupees(item.subtotalPaise)}
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            {item.quantity} × {formatPaiseToRupees(item.unitPricePaise)}
          </div>
        </div>
      </div>

      {item.status === 'REJECTED' && item.rejectionReason && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/80 border border-red-200 text-xs text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Rejection reason:</span> {item.rejectionReason}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {item.requester && (
            <span className="inline-flex items-center gap-1 font-medium text-zinc-700">
              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              {item.requester.fullName}
            </span>
          )}
          {item.requester?.roomNumber && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[11px] text-zinc-700">
              <DoorOpen className="w-3 h-3 text-zinc-500" />
              Room {item.requester.roomNumber}
            </span>
          )}
          <span className="text-[11px] text-zinc-400">{formatDateTime(item.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {canOwnerEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-stone-200 text-xs font-medium text-zinc-700 hover:bg-stone-50"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
          {canOwnerDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
          {canOwnerResubmit && onResubmit && (
            <button
              type="button"
              onClick={() => onResubmit(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revise & Resubmit
            </button>
          )}
          {canInitiatorModerate && (
            <ApprovalControls
              itemId={item.id}
              productName={item.productName}
              isApproving={isApproving}
              isRejecting={isRejecting}
              onApprove={onApprove}
              onReject={onReject}
            />
          )}
        </div>
      </div>
    </div>
  );
};

