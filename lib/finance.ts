import type { Coupon, Expense, IncomeEntry, Order, Product } from './types';

/** Effective selling price of a product (sale price wins). */
export const effPrice = (p: Product) => p.salePrice ?? p.price;

export const isCounted = (o: Order) => o.status !== 'Cancelled' && o.status !== 'Returned';

/** Profit formula (shown in the UI):
 *  Profit = Selling total − Product costs − Packaging − Delivery cost − Payment fee − Coupon discount
 *  Selling total = order.total (already includes delivery fee charged minus coupon discount).
 *  Delivery cost here is the ACTUAL delivery cost (deliveryCost field, falls back to deliveryFee).
 */
export function orderProductCost(order: Order, products: Product[]): number {
  return order.items.reduce((sum, it) => {
    const p = products.find((x) => x.id === it.productId);
    const cost = p?.costPrice ?? 0;
    return sum + cost * it.qty;
  }, 0);
}
export function orderProfit(order: Order, products: Product[]): number {
  if (!isCounted(order)) return 0;
  const productCost = orderProductCost(order, products);
  const packaging = order.packagingCost ?? 0;
  const deliveryCost = order.deliveryCost ?? order.deliveryFee ?? 0;
  const fee = order.paymentFee ?? 0;
  return order.total - productCost - packaging - deliveryCost - fee;
}
export function orderHasMissingCost(order: Order, products: Product[]): boolean {
  return order.items.some((it) => {
    const p = products.find((x) => x.id === it.productId);
    return !p || p.costPrice === undefined || p.costPrice === null;
  });
}

export interface ProductProfit {
  product: Product;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  costSet: boolean;
}
export function perProductProfit(orders: Order[], products: Product[]): ProductProfit[] {
  const counted = orders.filter(isCounted);
  return products.map((p) => {
    let unitsSold = 0; let revenue = 0;
    for (const o of counted) {
      for (const it of o.items) {
        if (it.productId === p.id) { unitsSold += it.qty; revenue += it.price * it.qty; }
      }
    }
    const cost = (p.costPrice ?? 0) * unitsSold;
    const profit = revenue - cost;
    return { product: p, unitsSold, revenue, cost, profit, marginPct: revenue > 0 ? (profit / revenue) * 100 : 0, costSet: p.costPrice !== undefined && p.costPrice !== null };
  });
}

/** Manual expenses + per-order packaging/delivery/payment fees. Order product costs are NOT double-counted here. */
export function totalManualExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}
export function totalOrderExtraCosts(orders: Order[]): number {
  return orders.filter(isCounted).reduce((s, o) => s + (o.packagingCost ?? 0) + (o.deliveryCost ?? o.deliveryFee ?? 0) + (o.paymentFee ?? 0), 0);
}
/** Net profit = order revenue − product costs − order extra costs − manual expenses + manual incomes */
export function netProfit(orders: Order[], products: Product[], expenses: Expense[], incomes: IncomeEntry[]): number {
  const revenue = orders.filter(isCounted).reduce((s, o) => s + o.total, 0);
  const productCost = orders.filter(isCounted).reduce((s, o) => s + orderProductCost(o, products), 0);
  const manualIncome = incomes.reduce((s, i) => s + i.amount, 0);
  return revenue - productCost - totalOrderExtraCosts(orders) - totalManualExpenses(expenses) + manualIncome;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function inMonth(d: Date, ref: Date): boolean {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Cash flow buckets: revenue from counted orders + manual incomes vs manual expenses + order extra costs. */
export interface CashFlowBucket { key: string; label: string; inflow: number; outflow: number; balance: number }
export function cashFlowBy(orders: Order[], expenses: Expense[], incomes: IncomeEntry[], granularity: 'day' | 'month'): CashFlowBucket[] {
  const map = new Map<string, CashFlowBucket>();
  const keyOf = (d: Date) => (granularity === 'day' ? dayKey(d) : monthKey(d));
  for (const o of orders.filter(isCounted)) {
    const k = keyOf(new Date(o.createdAt));
    const b = map.get(k) || { key: k, label: k, inflow: 0, outflow: 0, balance: 0 };
    b.inflow += o.total;
    b.outflow += (o.packagingCost ?? 0) + (o.deliveryCost ?? o.deliveryFee ?? 0) + (o.paymentFee ?? 0);
    map.set(k, b);
  }
  for (const e of expenses) {
    const k = keyOf(new Date(e.date));
    const b = map.get(k) || { key: k, label: k, inflow: 0, outflow: 0, balance: 0 };
    b.outflow += e.amount; map.set(k, b);
  }
  for (const i of incomes) {
    const k = keyOf(new Date(i.date));
    const b = map.get(k) || { key: k, label: k, inflow: 0, outflow: 0, balance: 0 };
    b.inflow += i.amount; map.set(k, b);
  }
  const list = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const b of list) b.balance = b.inflow - b.outflow;
  return list;
}

/** COD / mobile-banking pending vs received, from counted orders. */
export function paymentSplit(orders: Order[]): Record<string, { pending: number; received: number; count: number }> {
  const out: Record<string, { pending: number; received: number; count: number }> = {};
  for (const o of orders.filter(isCounted)) {
    const bucket = out[o.payment] || { pending: 0, received: 0, count: 0 };
    if (o.paymentReceived) bucket.received += o.total; else bucket.pending += o.total;
    bucket.count += 1;
    out[o.payment] = bucket;
  }
  return out;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function discountForCoupon(c: Coupon | undefined, subtotal: number): number {
  if (!c) return 0;
  return c.type === 'percent' ? Math.round(subtotal * (c.value / 100)) : Math.min(c.value, subtotal);
}
