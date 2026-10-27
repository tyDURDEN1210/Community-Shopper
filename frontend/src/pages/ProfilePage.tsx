import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { User, Building2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { Hostel } from '../types';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,15}$/, 'Please enter a valid 10-15 digit phone number'),
  hostelId: z.string().min(1, 'Hostel is required'),
  roomNumber: z.string().trim().min(1, 'Room number is required').max(20)
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiRequest<{ hostels: Hostel[] }>('/hostels')
  });

  const hostels = hostelsData?.hostels || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: user?.fullName || '',
      phoneNumber: user?.phoneNumber || '',
      hostelId: user?.hostelId || '',
      roomNumber: user?.roomNumber || ''
    }
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setStatusMsg(null);
    try {
      await apiRequest('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(values)
      });
      await refreshProfile();
      setStatusMsg({
        type: 'success',
        text: 'Your resident profile has been updated.'
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile'
      });
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Resident Profile & Hostel Details
        </h1>
        <p className="text-xs text-zinc-600 mt-1">
          Your name, phone number, hostel, and room number are automatically used when you join or
          initiate orders.
        </p>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-5 border-b border-stone-200/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">{user.fullName}</h2>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-zinc-800">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              {user.role}
            </span>
          </div>
        </div>

        {statusMsg && (
          <div
            role="status"
            className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-medium ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-800 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="fullName"
                  type="text"
                  {...register('fullName')}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Phone Number (Private to Initiator) *
              </label>
              <input
                id="phoneNumber"
                type="tel"
                {...register('phoneNumber')}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.phoneNumber && (
                <p className="text-xs text-red-600 mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="roomNumber"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Room Number *
              </label>
              <input
                id="roomNumber"
                type="text"
                {...register('roomNumber')}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.roomNumber && (
                <p className="text-xs text-red-600 mt-1">{errors.roomNumber.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="hostelId" className="block text-xs font-semibold text-zinc-800 mb-1">
                Registered Hostel *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <select
                  id="hostelId"
                  {...register('hostelId')}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Note: Hostel can only be changed when you have no active order windows in progress.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

