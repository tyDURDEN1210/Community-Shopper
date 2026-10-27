import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingBag, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Invalid email or password');
    }
  };

  const fillDemoAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'CampusCart123', { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Campus Cart</h1>
            <p className="text-xs text-zinc-500">Collective Hostel Ordering Platform</p>
          </div>
        </div>

        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-zinc-900">
          Sign in to your hostel account
        </h2>
        <p className="mt-1.5 text-center text-xs text-zinc-600">
          Pool orders across Blinkit, Zepto, Swiggy, Amazon, Myntra & more to waive delivery fees.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
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
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-800 mb-1">
                Campus / Personal Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@campuscart.edu"
                {...register('email')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-800 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-stone-200/80 text-center">
            <p className="text-xs text-zinc-600">
              New resident at your hostel?{' '}
              <Link
                to="/register"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Quick Demo Credentials Card */}
        <div className="bg-stone-100/90 border border-stone-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            Quick Fill Seeded Demo Accounts (Password: CampusCart123)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('aarav@campuscart.edu')}
              className="text-left p-2 rounded-lg bg-white border border-stone-200 hover:border-emerald-500 transition-colors"
            >
              <div className="text-xs font-semibold text-zinc-900">Aarav (Initiator)</div>
              <div className="text-[11px] text-zinc-500">Aravali Hostel • A-304</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('rohan@campuscart.edu')}
              className="text-left p-2 rounded-lg bg-white border border-stone-200 hover:border-emerald-500 transition-colors"
            >
              <div className="text-xs font-semibold text-zinc-900">Rohan (Member)</div>
              <div className="text-[11px] text-zinc-500">Aravali Hostel • A-212</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('ananya@campuscart.edu')}
              className="text-left p-2 rounded-lg bg-white border border-stone-200 hover:border-emerald-500 transition-colors"
            >
              <div className="text-xs font-semibold text-zinc-900">Ananya (Nilgiri)</div>
              <div className="text-[11px] text-zinc-500">Nilgiri Hostel • B-405</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

