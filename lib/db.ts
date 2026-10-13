import fs from 'node:fs';
import path from 'node:path';
import type { Order, Product, Customer, Expense, IncomeEntry, Coupon } from './types';

const dataDir = path.join(process.cwd(), 'data');
function readJson<T>(file: string, fallback: T): T {
  try {
    const p = path.join(dataDir, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch { return fallback; }
}
function writeJson(file: string, value: unknown) {
  const p = path.join(dataDir, file);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2));
}

// NOTE: Phase 1+2 use JSON files for local dev / demo.
// On Vercel, the filesystem is ephemeral — set DATABASE_URL and migrate this
// layer to Prisma + Postgres/Supabase for persistent production storage.
// See README "Switching to Postgres" section.
export const db = {
  products: {
    all: (): Product[] => readJson<Product[]>('products.json', []),
    save: (items: Product[]) => writeJson('products.json', items),
  },
  orders: {
    all: (): Order[] => readJson<Order[]>('orders.json', []),
    save: (items: Order[]) => writeJson('orders.json', items),
  },
  customers: {
    all: (): Customer[] => readJson<Customer[]>('customers.json', []),
    save: (items: Customer[]) => writeJson('customers.json', items),
  },
  expenses: {
    all: (): Expense[] => readJson<Expense[]>('expenses.json', []),
    save: (items: Expense[]) => writeJson('expenses.json', items),
  },
  incomes: {
    all: (): IncomeEntry[] => readJson<IncomeEntry[]>('incomes.json', []),
    save: (items: IncomeEntry[]) => writeJson('incomes.json', items),
  },
  coupons: {
    all: (): Coupon[] => readJson<Coupon[]>('coupons.json', []),
    save: (items: Coupon[]) => writeJson('coupons.json', items),
  },
};
export function newOrderRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `VB-${s}`;
}
export function money(n: number): string {
  return `৳${n.toLocaleString('en-US')}`;
}

/** Validate a coupon against a subtotal. Returns { ok, discount, error }. Does NOT increment usage. */
export function validateCoupon(coupon: Coupon | undefined, subtotal: number): { ok: boolean; discount: number; error?: string } {
  if (!coupon) return { ok: false, discount: 0, error: 'Coupon not found.' };
  if (!coupon.active) return { ok: false, discount: 0, error: 'This coupon is inactive.' };
  if (coupon.expiry && new Date(coupon.expiry) < new Date(new Date().toDateString())) return { ok: false, discount: 0, error: 'This coupon has expired.' };
  if (coupon.usageLimit !== undefined && coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return { ok: false, discount: 0, error: 'This coupon has reached its usage limit.' };
  if (subtotal < (coupon.minOrder || 0)) return { ok: false, discount: 0, error: `Minimum order ${money(coupon.minOrder || 0)} required.` };
  let discount = coupon.type === 'percent' ? Math.round(subtotal * (coupon.value / 100)) : coupon.value;
  discount = Math.max(0, Math.min(discount, subtotal));
  return { ok: true, discount };
}
