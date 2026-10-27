import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface ApprovalControlsProps {
  itemId: string;
  productName: string;
  isApproving?: boolean;
  isRejecting?: boolean;
  onApprove: (itemId: string) => void;
  onReject: (itemId: string, rejectionReason?: string) => void;
}

export const ApprovalControls: React.FC<ApprovalControlsProps> = ({
  itemId,
  productName,
  isApproving = false,
  isRejecting = false,
  onApprove,
  onReject
}) => {
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [reason, setReason] = useState('');

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    onReject(itemId, reason.trim() || undefined);
    setShowRejectPrompt(false);
    setReason('');
  };

  if (showRejectPrompt) {
    return (
      <form onSubmit={handleConfirmReject} className="mt-3 p-3 bg-red-50/70 border border-red-200 rounded-lg space-y-2">
        <label
          htmlFor={`reject-reason-${itemId}`}
          className="block text-xs font-medium text-red-900"
        >
          Rejection reason for "{productName}" (optional)
        </label>
        <input
          id={`reject-reason-${itemId}`}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Out of stock, incorrect price, or heavy item"
          maxLength={300}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowRejectPrompt(false)}
            className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-stone-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isRejecting}
            className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onApprove(itemId)}
        disabled={isApproving || isRejecting}
        aria-label={`Approve ${productName}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
        {isApproving ? 'Approving...' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={() => setShowRejectPrompt(true)}
        disabled={isApproving || isRejecting}
        aria-label={`Reject ${productName}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
        Reject
      </button>
    </div>
  );
};

