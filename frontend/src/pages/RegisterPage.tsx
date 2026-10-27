import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { Hostel } from '../types';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,15}$/, 'Enter a valid 10-15 digit phone number'),
  hostelId: z.string().min(1, 'Please select your hostel'),
  roomNumber: z.string().trim().min(1, 'Room number is required').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72)
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: hostelsData, isLoading: loadingHostels } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => apiRequest<{ hostels: Hostel[] }>('/hostels')
  });

  const hostels = hostelsData?.hostels || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      hostelId: '',
      roomNumber: '',
      password: ''
    }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Campus Cart</h1>
            <p className="text-xs text-zinc-500">Hostel Member Registration</p>
          </div>
        </div>

        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-zinc-900">
          Create your hostel resident profile
        </h2>
        <p className="mt-1.5 text-center text-xs text-zinc-600">
          Your hostel and room number are saved to your profile so you never have to re-enter them
          when joining orders.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-7 px-6 shadow-sm border border-stone-200/90 rounded-xl sm:px-8">
          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-800 mb-1">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g., Siddharth Mehta"
                  {...register('fullName')}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                {errors.fullName && (
                  <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-zinc-800 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="siddharth@campuscart.edu"
                  {...register('email')}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-xs font-semibold text-zinc-800 mb-1"
                >
                  Phone Number *
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="9876543210"
                  {...register('phoneNumber')}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-600 mt-1">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="hostelId" className="block text-xs font-semibold text-zinc-800 mb-1">
                  Hostel *
                </label>
                <select
                  id="hostelId"
                  disabled={loadingHostels}
                  {...register('hostelId')}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="">Select your hostel...</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
                {errors.hostelId && (
                  <p className="text-xs text-red-600 mt-1">{errors.hostelId.message}</p>
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
                  placeholder="e.g., A-204"
                  {...register('roomNumber')}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                {errors.roomNumber && (
                  <p className="text-xs text-red-600 mt-1">{errors.roomNumber.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="password" className="block text-xs font-semibold text-zinc-800 mb-1">
                  Password (min 8 characters) *
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Register Resident Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-stone-200/80 text-center">
            <p className="text-xs text-zinc-600">
              Already have a hostel account?{' '}
              <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

