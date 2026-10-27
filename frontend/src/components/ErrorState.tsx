import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  message,
  onRetry
}) => {
  return (
    <div
      className="bg-red-50/70 border border-red-200 rounded-xl p-6 text-center"
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-red-950">{title}</h3>
      <p className="text-xs text-red-800 max-w-md mx-auto mt-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-red-300 text-xs font-medium text-red-900 hover:bg-red-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  );
};

