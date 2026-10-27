import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action
}) => {
  return (
    <div className="bg-white border border-stone-200/80 rounded-xl p-8 text-center">
      <div className="w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-3 text-zinc-600">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};

