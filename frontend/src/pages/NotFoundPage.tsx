import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-stone-200/80 text-zinc-700 flex items-center justify-center mb-4">
        <Compass className="w-6 h-6" />
      </div>
      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-700">
        404 • Page Not Found
      </span>
      <h1 className="text-2xl font-bold text-zinc-900 mt-1">
        We couldn't find that hostel order or page
      </h1>
      <p className="text-xs text-zinc-600 max-w-md mt-2">
        The link may have expired or the page does not exist. Return to your dashboard or browse open
        order windows.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        <Link
          to="/orders"
          className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-zinc-800 hover:bg-stone-50"
        >
          Discover Orders
        </Link>
      </div>
    </div>
  );
};

