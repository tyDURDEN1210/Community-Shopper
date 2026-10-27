import { OrderCategory, TargetBasisType } from '../types';

export function formatPaiseToRupees(paise: number, showDecimals = true): string {
  const rupees = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals && paise % 100 !== 0 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(rupees);
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function paiseToRupeesNumber(paise: number): number {
  return Number(((paise || 0) / 100).toFixed(2));
}

export function formatTimeRemaining(deadline: string | Date, status?: string): string {
  if (status && status !== 'OPEN') {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) {
    return 'Deadline passed';
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${Math.max(1, minutes)}m left`;
}

export function formatCategoryLabel(category: OrderCategory): string {
  const labels: Record<OrderCategory, string> = {
    FOOD_DELIVERY: 'Food Delivery',
    QUICK_COMMERCE: 'Quick Commerce',
    GROCERIES: 'Groceries',
    FASHION: 'Fashion',
    GENERAL_SHOPPING: 'General Shopping',
    OTHER: 'Other'
  };
  return labels[category] || category;
}

export function formatTargetBasisLabel(basis: TargetBasisType): string {
  const labels: Record<TargetBasisType, string> = {
    ITEM_VALUE_ONLY: 'Item Value Only (Excludes Delivery & Taxes)',
    SUBTOTAL_BEFORE_FEES: 'Merchandise Subtotal Before Fees',
    CUSTOM: 'Custom Configured Basis'
  };
  return labels[basis] || basis;
}

export function formatDateTime(iso: string | Date): string {
  const date = new Date(iso);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const POPULAR_PLATFORMS = [
  { name: 'Blinkit', defaultCategory: 'QUICK_COMMERCE' as OrderCategory },
  { name: 'Zepto', defaultCategory: 'QUICK_COMMERCE' as OrderCategory },
  { name: 'Swiggy Instamart', defaultCategory: 'QUICK_COMMERCE' as OrderCategory },
  { name: 'Swiggy', defaultCategory: 'FOOD_DELIVERY' as OrderCategory },
  { name: 'Zomato', defaultCategory: 'FOOD_DELIVERY' as OrderCategory },
  { name: 'BigBasket', defaultCategory: 'GROCERIES' as OrderCategory },
  { name: 'Myntra', defaultCategory: 'FASHION' as OrderCategory },
  { name: 'Ajio', defaultCategory: 'FASHION' as OrderCategory },
  { name: 'Amazon', defaultCategory: 'GENERAL_SHOPPING' as OrderCategory },
  { name: 'Flipkart', defaultCategory: 'GENERAL_SHOPPING' as OrderCategory },
  { name: 'Nykaa', defaultCategory: 'GENERAL_SHOPPING' as OrderCategory }
];

