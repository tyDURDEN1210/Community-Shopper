import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OrderItemRecord } from '../types';
import { formatPaiseToRupees, paiseToRupeesNumber, rupeesToPaise } from '../lib/format';

const itemFormSchema = z.object({
  productName: z.string().trim().min(1, 'Product name is required').max(200),
  productUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const parsed = new URL(val);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Please enter a valid HTTP or HTTPS URL' }
    ),
  unitPriceRupees: z.coerce
    .number({ invalid_type_error: 'Enter a valid price in ₹' })
    .positive('Unit price must be greater than ₹0')
    .max(500000, 'Unit price is too high'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Enter a valid quantity' })
    .int('Quantity must be a whole number')
    .min(1, 'Minimum quantity is 1')
    .max(500, 'Maximum quantity is 500'),
  variantDetails: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional()
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
  initialItem?: OrderItemRecord | null;
  mode?: 'create' | 'edit' | 'resubmit';
  isSubmitting?: boolean;
  onSubmitItem: (payload: {
    productName: string;
    productUrl?: string;
    unitPricePaise: number;
    quantity: number;
    variantDetails?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({
  initialItem,
  mode = 'create',
  isSubmitting = false,
  onSubmitItem,
  onCancel
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      productName: initialItem?.productName || '',
      productUrl: initialItem?.productUrl || '',
      unitPriceRupees: initialItem ? paiseToRupeesNumber(initialItem.unitPricePaise) : undefined,
      quantity: initialItem?.quantity || 1,
      variantDetails: initialItem?.variantDetails || '',
      notes: initialItem?.notes || ''
    }
  });

  const watchedPrice = watch('unitPriceRupees');
  const watchedQuantity = watch('quantity');

  const previewUnitPaise = rupeesToPaise(watchedPrice || 0);
  const previewQty = Number.isInteger(Number(watchedQuantity)) && Number(watchedQuantity) > 0
    ? Number(watchedQuantity)
    : 0;
  const previewSubtotalPaise = previewUnitPaise * previewQty;

  const onFormSubmit = async (values: ItemFormValues) => {
    const unitPricePaise = rupeesToPaise(values.unitPriceRupees);
    await onSubmitItem({
      productName: values.productName.trim(),
      productUrl: values.productUrl?.trim() || undefined,
      unitPricePaise,
      quantity: values.quantity,
      variantDetails: values.variantDetails?.trim() || undefined,
      notes: values.notes?.trim() || undefined
    });
    if (mode === 'create') {
      reset({
        productName: '',
        productUrl: '',
        unitPriceRupees: undefined,
        quantity: 1,
        variantDetails: '',
        notes: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="productName" className="block text-xs font-semibold text-zinc-800 mb-1">
            Product Name *
          </label>
          <input
            id="productName"
            type="text"
            placeholder="e.g., Sleepy Owl Cold Brew Can (200ml)"
            {...register('productName')}
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          {errors.productName && (
            <p className="text-xs text-red-600 mt-1">{errors.productName.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="unitPriceRupees"
            className="block text-xs font-semibold text-zinc-800 mb-1"
          >
            Unit Price (₹) *
          </label>
          <input
            id="unitPriceRupees"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g., 125"
            {...register('unitPriceRupees')}
            className="w-full px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          {errors.unitPriceRupees && (
            <p className="text-xs text-red-600 mt-1">{errors.unitPriceRupees.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="quantity" className="block text-xs font-semibold text-zinc-800 mb-1">
            Quantity *
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            step="1"
            {...register('quantity')}
            className="w-full px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          {errors.quantity && (
            <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="variantDetails"
            className="block text-xs font-semibold text-zinc-800 mb-1"
          >
            Variant Details (Size, Flavor, Color)
          </label>
          <input
            id="variantDetails"
            type="text"
            placeholder="e.g., 200ml Can - Hazelnut"
            {...register('variantDetails')}
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          {errors.variantDetails && (
            <p className="text-xs text-red-600 mt-1">{errors.variantDetails.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="productUrl" className="block text-xs font-semibold text-zinc-800 mb-1">
            Product Link (Optional HTTP/HTTPS)
          </label>
          <input
            id="productUrl"
            type="url"
            placeholder="https://blinkit.com/prn/..."
            {...register('productUrl')}
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          {errors.productUrl && (
            <p className="text-xs text-red-600 mt-1">{errors.productUrl.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-xs font-semibold text-zinc-800 mb-1">
            Notes for Initiator (Optional)
          </label>
          <input
            id="notes"
            type="text"
            placeholder="e.g., Skip if out of stock; or substitute with Vanilla flavor"
            {...register('notes')}
            className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
          {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-stone-200/80 flex-wrap">
        <div className="text-xs text-zinc-600">
          Requested Subtotal:{' '}
          <span className="font-mono font-semibold text-zinc-900">
            {formatPaiseToRupees(previewSubtotalPaise)}
          </span>
          <span className="block text-[11px] text-zinc-500">
            Counts toward group target only after initiator approval.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-medium text-zinc-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? 'Saving...'
              : mode === 'edit'
              ? 'Save Item Changes'
              : mode === 'resubmit'
              ? 'Submit Revised Request'
              : 'Submit Item Request'}
          </button>
        </div>
      </div>
    </form>
  );
};

