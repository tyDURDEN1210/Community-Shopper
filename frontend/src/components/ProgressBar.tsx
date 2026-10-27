import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { formatPaiseToRupees } from '../lib/format';

interface ProgressBarProps {
  committedTotalPaise: number;
  minimumAmountPaise: number;
  targetBasisNote?: string;
  compact?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  committedTotalPaise,
  minimumAmountPaise,
  targetBasisNote,
  compact = false
}) => {
  const rawPct = minimumAmountPaise > 0 ? (committedTotalPaise / minimumAmountPaise) * 100 : 100;
  const percentage = Math.min(100, Math.round(rawPct));
  const remainingPaise = Math.max(0, minimumAmountPaise - committedTotalPaise);
  const isReached = committedTotalPaise >= minimumAmountPaise;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="font-mono text-base font-semibold text-zinc-900">
            {formatPaiseToRupees(committedTotalPaise)}
          </span>
          <span className="text-xs text-zinc-500 ml-1.5">
            committed of{' '}
            <span className="font-mono font-medium text-zinc-700">
              {formatPaiseToRupees(minimumAmountPaise)}
            </span>{' '}
            target
          </span>
        </div>
        <span
          className={`font-mono text-xs font-semibold ${
            isReached ? 'text-emerald-700' : 'text-zinc-700'
          }`}
        >
          {percentage}%
        </span>
      </div>

      <div
        className="w-full h-2.5 bg-stone-200/80 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isReached ? 'bg-emerald-600' : 'bg-emerald-700/85'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        {isReached ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Minimum target reached! Ready for order lock
          </span>
        ) : (
          <span className="text-zinc-600">
            <span className="font-mono font-medium text-zinc-800">
              {formatPaiseToRupees(remainingPaise)}
            </span>{' '}
            more in approved items needed
          </span>
        )}
      </div>

      {!compact && targetBasisNote && (
        <p className="text-[11px] text-zinc-500 flex items-start gap-1 pt-0.5">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <span>Basis: {targetBasisNote}</span>
        </p>
      )}
    </div>
  );
};

