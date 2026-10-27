import React from 'react';
import { ItemStatus, OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | ItemStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<string, string> = {
    OPEN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    LOCKED: 'bg-amber-50 text-amber-800 border-amber-200',
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    CONFIRMED: 'bg-blue-50 text-blue-800 border-blue-200',
    PURCHASED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    COMPLETED: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    REJECTED: 'bg-red-50 text-red-800 border-red-200',
    CANCELLED: 'bg-red-50 text-red-800 border-red-200'
  };

  const dotColors: Record<string, string> = {
    OPEN: 'bg-emerald-600',
    APPROVED: 'bg-emerald-600',
    LOCKED: 'bg-amber-500',
    PENDING: 'bg-amber-500',
    CONFIRMED: 'bg-blue-600',
    PURCHASED: 'bg-indigo-600',
    COMPLETED: 'bg-zinc-600',
    REJECTED: 'bg-red-600',
    CANCELLED: 'bg-red-600'
  };

  const sizeClass =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${
        styles[status] || 'bg-zinc-100 text-zinc-700 border-zinc-200'
      } ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status] || 'bg-zinc-500'}`} />
      {status}
    </span>
  );
};

