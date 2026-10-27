import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  LayoutDashboard,
  Compass,
  PlusCircle,
  PackageCheck,
  ClipboardCheck,
  User,
  LogOut,
  Building2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { DashboardData } from '../types';
import { useOrderSocket } from '../hooks/useOrderSocket';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useOrderSocket();

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardData>('/orders/dashboard'),
    enabled: Boolean(user),
    staleTime: 15000
  });

  const pendingModerationCount = dashboard?.pendingForMyApproval?.length || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-zinc-900 text-white'
        : 'text-zinc-600 hover:text-zinc-900 hover:bg-stone-200/60'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-zinc-900">
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-stone-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-zinc-900 block leading-none">
                  Campus Cart
                </span>
                <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">
                  Hostel Collective Ordering
                </span>
              </div>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
                <NavLink to="/dashboard" className={navLinkClass}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </NavLink>
                <NavLink to="/orders" end className={navLinkClass}>
                  <Compass className="w-3.5 h-3.5" />
                  Discover Orders
                </NavLink>
                <NavLink to="/my-items" className={navLinkClass}>
                  <PackageCheck className="w-3.5 h-3.5" />
                  My Items
                </NavLink>
                <NavLink to="/moderation" className={navLinkClass}>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Moderation Queue
                  {pendingModerationCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {pendingModerationCount}
                    </span>
                  )}
                </NavLink>
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              {user.hostel && (
                <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-xs text-zinc-700">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-medium">{user.hostel.name}</span>
                  <span className="font-mono text-[11px] text-zinc-500">({user.roomNumber})</span>
                </div>
              )}

              <Link
                to="/orders/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Order</span>
              </Link>

              <NavLink
                to="/profile"
                aria-label="Profile"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-stone-200 border-stone-300 text-zinc-900'
                      : 'bg-white border-stone-200 text-zinc-700 hover:bg-stone-100'
                  }`
                }
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{user.fullName.split(' ')[0]}</span>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="p-2 rounded-lg border border-stone-200 bg-white text-zinc-600 hover:text-red-700 hover:border-red-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile sub-navigation */}
        {user && (
          <div className="md:hidden border-t border-stone-200/80 px-4 py-2 flex items-center gap-1 overflow-x-auto">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/orders" end className={navLinkClass}>
              Discover
            </NavLink>
            <NavLink to="/my-items" className={navLinkClass}>
              My Items
            </NavLink>
            <NavLink to="/moderation" className={navLinkClass}>
              Moderation ({pendingModerationCount})
            </NavLink>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-stone-200/80 bg-white/60 py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <p>
            <span className="font-semibold text-zinc-700">Campus Cart</span> — Hostel Collective
            Ordering & Threshold Coordination.
          </p>
          <p>
            Coordinates group baskets for hostel members. External platform checkout is completed
            directly by the order initiator.
          </p>
        </div>
      </footer>
    </div>
  );
};

