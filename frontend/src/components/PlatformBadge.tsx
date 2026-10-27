import React from 'react';
import { ShoppingBag, Zap, Utensils, Shirt, Package, Sparkles } from 'lucide-react';
import { OrderCategory } from '../types';
import { formatCategoryLabel } from '../lib/format';

interface PlatformBadgeProps {
  platform: string;
  category?: OrderCategory;
  showCategory?: boolean;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platform,
  category,
  showCategory = true
}) => {
  const getCategoryIcon = (cat?: OrderCategory) => {
    switch (cat) {
      case 'QUICK_COMMERCE':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      case 'FOOD_DELIVERY':
        return <Utensils className="w-3.5 h-3.5 text-orange-600" />;
      case 'GROCERIES':
        return <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />;
      case 'FASHION':
        return <Shirt className="w-3.5 h-3.5 text-rose-600" />;
      case 'GENERAL_SHOPPING':
        return <Package className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-zinc-600" />;
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200/90 text-zinc-900 text-xs font-semibold tracking-tight">
        {getCategoryIcon(category)}
        {platform}
      </span>
      {showCategory && category && (
        <span className="text-xs text-zinc-500 font-medium">
          {formatCategoryLabel(category)}
        </span>
      )}
    </div>
  );
};

