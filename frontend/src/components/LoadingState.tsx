import React from 'react';

interface LoadingStateProps {
  rows?: number;
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  rows = 3,
  label = 'Loading Campus Cart data...'
}) => {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-stone-200/80 rounded-xl p-5 animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-stone-200 rounded w-1/3" />
            <div className="h-5 bg-stone-200 rounded-full w-16" />
          </div>
          <div className="h-3 bg-stone-100 rounded w-2/3" />
          <div className="h-2.5 bg-stone-200 rounded-full w-full" />
          <div className="flex justify-between pt-1">
            <div className="h-3 bg-stone-100 rounded w-24" />
            <div className="h-3 bg-stone-100 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

