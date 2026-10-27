import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { OrderDetail } from '../types';
import { POPULAR_PLATFORMS, rupeesToPaise } from '../lib/format';

const createOrderFormSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
  platform: z.string().trim().min(1, 'Shopping platform is required').max(80),
  category: z.enum([
    'FOOD_DELIVERY',
    'QUICK_COMMERCE',
    'GROCERIES',
    'FASHION',
    'GENERAL_SHOPPING',
    'OTHER'
  ]),
  minimumAmountRupees: z.coerce
    .number({ invalid_type_error: 'Enter a valid minimum target in ₹' })
    .positive('Minimum target must be greater than ₹0')
    .max(500000, 'Minimum target is too high'),
  targetBasis: z.enum(['ITEM_VALUE_ONLY', 'SUBTOTAL_BEFORE_FEES', 'CUSTOM']),
  targetBasisNote: z.string().trim().max(300).optional(),
  deadlineMinutesFromNow: z.coerce
    .number()
    .int()
    .min(15, 'Deadline must be at least 15 minutes in the future')
    .max(10080, 'Deadline cannot exceed 7 days'),
  participantLimit: z
    .union([
      z.literal(''),
      z.coerce.number().int().min(2, 'Minimum limit is 2 participants').max(200)
    ])
    .optional(),
  description: z.string().trim().max(1000).optional(),
  deliveryNotes: z.string().trim().max(500).optional()
});

type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;

export const CreateOrderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderFormSchema),
    defaultValues: {
      title: '',
      platform: 'Blinkit',
      category: 'QUICK_COMMERCE',
      minimumAmountRupees: 500,
      targetBasis: 'ITEM_VALUE_ONLY',
      targetBasisNote:
        'Sum of approved item subtotals (excludes delivery fees, taxes, and platform charges)',
      deadlineMinutesFromNow: 120,
      participantLimit: 8,
      description: '',
      deliveryNotes: user?.roomNumber
        ? `Collect your approved items from Room ${user.roomNumber} once delivered.`
        : ''
    }
  });

  const selectedPlatform = watch('platform');

  const handleSelectQuickPlatform = (p: (typeof POPULAR_PLATFORMS)[number]) => {
    setValue('platform', p.name, { shouldValidate: true });
    setValue('category', p.defaultCategory, { shouldValidate: true });
  };

  const onSubmit = async (values: CreateOrderFormValues) => {
    if (!user) return;
    setServerError(null);

    try {
      const minimumAmountPaise = rupeesToPaise(values.minimumAmountRupees);
      const deadline = new Date(
        Date.now() + Number(values.deadlineMinutesFromNow) * 60 * 1000
      ).toISOString();

      const participantLimit =
        values.participantLimit === '' || values.participantLimit === undefined
          ? null
          : Number(values.participantLimit);

      const response = await apiRequest<{ order: OrderDetail }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          platform: values.platform.trim(),
          category: values.category,
          hostelId: user.hostelId,
          minimumAmountPaise,
          targetBasis: values.targetBasis,
          targetBasisNote: values.targetBasisNote?.trim() || undefined,
          deadline,
          participantLimit,
          description: values.description?.trim() || undefined,
          deliveryNotes: values.deliveryNotes?.trim() || undefined
        })
      });

      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/orders/${response.order.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create order window');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Create a Hostel Order Window
        </h1>
        <p className="text-xs text-zinc-600 mt-1">
          Open a collective basket for <span className="font-semibold">{user?.hostel?.name}</span>.
          You will review and approve every item request before locking and placing the external
          order.
        </p>
      </div>

      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-950">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Transparent Coordination Notice:</span> Campus Cart
          coordinates group baskets and tracks committed totals. It does not place automated orders
          on third-party platforms—once you lock the window, you place the consolidated order
          directly on the selected app.
        </div>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm">
        {serverError && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Quick select platform chips */}
          <div>
            <span className="block text-xs font-semibold text-zinc-800 mb-2">
              Quick-Select Popular Platform (or type any custom store below)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_PLATFORMS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectQuickPlatform(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    selectedPlatform.toLowerCase() === p.name.toLowerCase()
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-stone-50 text-zinc-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-xs font-semibold text-zinc-800 mb-1">
                Order Window Title *
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g., Midnight Blinkit Snacks & Cold Coffee Run"
                {...register('title')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.title && (
                <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="platform" className="block text-xs font-semibold text-zinc-800 mb-1">
                Shopping Platform Name *
              </label>
              <input
                id="platform"
                type="text"
                placeholder="e.g., Blinkit, Zepto, Swiggy, Amazon, Decathlon"
                {...register('platform')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.platform && (
                <p className="text-xs text-red-600 mt-1">{errors.platform.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-zinc-800 mb-1">
                Category *
              </label>
              <select
                id="category"
                {...register('category')}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="QUICK_COMMERCE">Quick Commerce</option>
                <option value="FOOD_DELIVERY">Food Delivery</option>
                <option value="GROCERIES">Groceries</option>
                <option value="FASHION">Fashion</option>
                <option value="GENERAL_SHOPPING">General Shopping</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="minimumAmountRupees"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Minimum Order Target (₹) *
              </label>
              <input
                id="minimumAmountRupees"
                type="number"
                step="1"
                min="1"
                {...register('minimumAmountRupees')}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.minimumAmountRupees && (
                <p className="text-xs text-red-600 mt-1">{errors.minimumAmountRupees.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="targetBasis"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Target Calculation Basis *
              </label>
              <select
                id="targetBasis"
                {...register('targetBasis')}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="ITEM_VALUE_ONLY">Item Value Only (Excludes Fees/Taxes)</option>
                <option value="SUBTOTAL_BEFORE_FEES">Merchandise Subtotal Before Discounts</option>
                <option value="CUSTOM">Custom Configured Basis</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="targetBasisNote"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Target Basis Explanation (Shown to Participants)
              </label>
              <input
                id="targetBasisNote"
                type="text"
                {...register('targetBasisNote')}
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="deadlineMinutesFromNow"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Joining Deadline *
              </label>
              <select
                id="deadlineMinutesFromNow"
                {...register('deadlineMinutesFromNow')}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value={30}>In 30 minutes</option>
                <option value={60}>In 1 hour</option>
                <option value={120}>In 2 hours</option>
                <option value={240}>In 4 hours</option>
                <option value={720}>In 12 hours</option>
                <option value={1440}>In 24 hours (1 day)</option>
                <option value={2880}>In 48 hours (2 days)</option>
              </select>
              {errors.deadlineMinutesFromNow && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.deadlineMinutesFromNow.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="participantLimit"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Participant Limit (Optional, min 2)
              </label>
              <input
                id="participantLimit"
                type="number"
                min="2"
                max="200"
                placeholder="Leave blank for no limit"
                {...register('participantLimit')}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {errors.participantLimit && (
                <p className="text-xs text-red-600 mt-1">{errors.participantLimit.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Order Description / Offer Context (Optional)
              </label>
              <textarea
                id="description"
                rows={2}
                placeholder="e.g., Pooling items to hit ₹599 for free delivery + HDFC ₹75 instant discount."
                {...register('description')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="deliveryNotes"
                className="block text-xs font-semibold text-zinc-800 mb-1"
              >
                Delivery / Room Pickup Instructions (Optional)
              </label>
              <input
                id="deliveryNotes"
                type="text"
                placeholder="e.g., Pick up from Room A-304 within 15 minutes of delivery arrival."
                {...register('deliveryNotes')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-between text-xs text-zinc-700">
            <span className="inline-flex items-center gap-1.5">
              <Info className="w-4 h-4 text-zinc-500" />
              Hostel Locked To: <strong>{user?.hostel?.name || 'Your Registered Hostel'}</strong>
            </span>
            <span className="font-mono text-zinc-600">Initiator Room: {user?.roomNumber}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-zinc-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Opening Order Window...' : 'Publish Order Window'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

