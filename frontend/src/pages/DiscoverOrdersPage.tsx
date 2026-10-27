import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, PlusCircle, RotateCcw, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { Hostel, OrderCategory, OrderStatus, OrderSummaryCard } from '../types';
import { POPULAR_PLATFORMS } from '../lib/format';
import { OrderCard } from '../components/OrderCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

export const DiscoverOrdersPage: React.FC = () => {
  const { user } = useAuth();

  const [hostelId, setHostelId] = useState<string>(user?.hostelId || '');
  const [platform, setPlatform] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('OPEN');
  const [search, setSearch] = useState<string>('');

  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiRequest<{ hostels: Hostel[] }>('/hostels')
  });

  const queryParams = new URLSearchParams();
  if (hostelId) queryParams.set('hostelId', hostelId);
  if (platform) queryParams.set('platform', platform);
  if (category) queryParams.set('category', category);
  if (status) queryParams.set('status', status);
  if (search.trim()) queryParams.set('search', search.trim());

  const {
    data: ordersData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['orders', hostelId, platform, category, status, search],
    queryFn: () =>
      apiRequest<{ orders: OrderSummaryCard[] }>(`/orders?${queryParams.toString()}`)
  });

  const hostels = hostelsData?.hostels || [];
  const orders = ordersData?.orders || [];

  const resetFilters = () => {
    setHostelId(user?.hostelId || '');
    setPlatform('');
    setCategory('');
    setStatus('OPEN');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Discover Hostel Order Windows
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Browse collective orders in your hostel, check progress toward the minimum target, and
            submit your item requests before the deadline.
          </p>
        </div>
        <Link
          to="/orders/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors self-start"
        >
          <PlusCircle className="w-4 h-4" />
          Create Order Window
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            Filter Order Feed
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to My Hostel (Open)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <label htmlFor="filter-search" className="sr-only">
              Search orders
            </label>
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="filter-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or platform..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="filter-hostel" className="sr-only">
              Filter by Hostel
            </label>
            <select
              id="filter-hostel"
              value={hostelId}
              onChange={(e) => setHostelId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">All Campus Hostels</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} {h.id === user?.hostelId ? '(My Hostel)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-platform" className="sr-only">
              Filter by Platform
            </label>
            <select
              id="filter-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">All Platforms</option>
              {POPULAR_PLATFORMS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-category" className="sr-only">
              Filter by Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as OrderCategory | '')}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">All Categories</option>
              <option value="QUICK_COMMERCE">Quick Commerce</option>
              <option value="FOOD_DELIVERY">Food Delivery</option>
              <option value="GROCERIES">Groceries</option>
              <option value="FASHION">Fashion</option>
              <option value="GENERAL_SHOPPING">General Shopping</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="sr-only">
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="LOCKED">LOCKED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PURCHASED">PURCHASED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingState rows={3} label="Loading order feed..." />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load orders'}
          onRetry={() => void refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No matching order windows found"
          description="Try clearing a filter or start a new collective order window for your hostel."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHostelId('');
                  setPlatform('');
                  setCategory('');
                  setStatus('');
                  setSearch('');
                }}
                className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-zinc-700 hover:bg-stone-50"
              >
                Show All Campus Orders
              </button>
              <Link
                to="/orders/new"
                className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
              >
                Create Order Window
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} viewerHostelId={user?.hostelId} />
          ))}
        </div>
      )}
    </div>
  );
};

