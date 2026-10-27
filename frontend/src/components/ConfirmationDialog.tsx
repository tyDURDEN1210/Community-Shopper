import React from 'react';
import { X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'warning';
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isPending = false,
  onConfirm,
  onCancel,
  children
}) => {
  if (!isOpen) return null;

  const confirmStyles = {
    primary: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white border border-stone-200 rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 id="dialog-title" className="text-base font-semibold text-zinc-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>

        {children && <div className="pt-1">{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-medium text-zinc-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${confirmStyles[variant]}`}
          >
            {isPending ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

