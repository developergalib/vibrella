export type Category = 'Beauty' | 'Skincare' | 'Perfume';
export type OrderStatus = 'New' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
export type PaymentMethod = 'COD' | 'bKash' | 'Nagad' | 'Card';
export type Channel = 'Website' | 'Instagram' | 'Facebook' | 'TikTok' | 'Other';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number; // BDT
  salePrice?: number;
  /** Buying / cost price in BDT. Optional for legacy products — treated as 0 with a "cost not set" warning. */
  costPrice?: number;
  stock: number;
  sku: string;
  image: string;
  description: string;
  featured?: boolean;
}

export interface OrderItem { productId: string; name: string; price: number; qty: number; image?: string; }
export interface Order {
  id: string; // VB-XXXXXX
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  payment: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  tracking?: string;
  note?: string;
  // --- Phase 2 ---
  /** Where the order came from. Defaults to Website for legacy orders. */
  channel?: Channel;
  /** Coupon code applied at checkout, if any. */
  couponCode?: string;
  /** Discount amount in BDT granted by the coupon. */
  discount?: number;
  /** Packaging cost for this order in BDT (admin-editable, default 0). */
  packagingCost?: number;
  /** Actual delivery cost for this order in BDT (admin-editable, default = deliveryFee). */
  deliveryCost?: number;
  /** Payment gateway / transaction fee in BDT (admin-editable, default 0). */
  paymentFee?: number;
  /** Whether the money has been received (COD collected / mobile banking confirmed). */
  paymentReceived?: boolean;
}
export interface Customer {
  id: string; name: string; phone: string; email?: string; address?: string;
  totalOrders: number; totalSpent: number; lastOrderAt?: string; tags: string[];
}

// --- Phase 2: Finance ---
export type ExpenseCategory = 'Product Cost' | 'Packaging' | 'Delivery' | 'Ads FB' | 'Ads TikTok' | 'Salary' | 'Shop' | 'Other';
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Product Cost', 'Packaging', 'Delivery', 'Ads FB', 'Ads TikTok', 'Salary', 'Shop', 'Other'];

export interface Expense {
  id: string;
  date: string; // ISO date
  category: ExpenseCategory;
  amount: number; // BDT
  note: string;
  receiptUrl?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  createdAt: string;
}

export interface IncomeEntry {
  id: string;
  date: string;
  source: string; // e.g. "Manual sale", "Delivery charge collected", "Other"
  amount: number; // BDT
  note: string;
  payment?: PaymentMethod;
  relatedOrderId?: string;
  createdAt: string;
}

// --- Phase 2: Coupons ---
export type CouponType = 'percent' | 'fixed';
export interface Coupon {
  id: string;
  code: string; // uppercase, e.g. VIBRELLA10
  type: CouponType;
  value: number; // % (0-100) or fixed BDT
  minOrder: number; // minimum subtotal in BDT to apply
  expiry?: string; // ISO date, optional = no expiry
  usageLimit?: number; // optional = unlimited
  usageCount: number;
  active: boolean;
  createdAt: string;
}
