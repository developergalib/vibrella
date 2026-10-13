/**
 * Phase 3 — AI Accountant (offline-first, rule-based).
 *
 * Everything in this file works WITHOUT any AI API key. All insights,
 * Q&A, forecasting and alerts are computed locally from the existing
 * orders / expenses / incomes / products / coupons data (lib/db.ts +
 * lib/finance.ts) using deterministic rules, so the numbers are always
 * reproducible and auditable.
 *
 * OPTIONAL external AI: `askExternalAI()` is a clearly-marked stub/hook.
 * If `OPENAI_API_KEY` (or `AI_PROVIDER` + key) is set in env, it tries a
 * single hosted-model call and returns its text; otherwise it returns
 * null and callers fall back to the local rules. No key is ever required,
 * stored, or logged. See README "Phase 3 — AI Accountant".
 */
import type { Coupon, Expense, ExpenseCategory, IncomeEntry, Order, Product } from './types';
import {
  isCounted,
  orderProductCost,
  orderProfit,
  perProductProfit,
  totalManualExpenses,
} from './finance';

export interface AccountantData {
  orders: Order[];
  products: Product[];
  expenses: Expense[];
  incomes: IncomeEntry[];
  coupons: Coupon[];
}

/* ------------------------------------------------------------------ */
/* Period parsing                                                      */
/* ------------------------------------------------------------------ */

export type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'last-30-days'
  | 'all';

export interface Period {
  key: PeriodKey;
  label: string;
  start: Date;
  end: Date; // inclusive
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function resolvePeriod(q: string, now = new Date()): Period {
  const s = q.toLowerCase();
  if (/\byesterday\b/.test(s)) {
    const d = addDays(now, -1);
    return { key: 'yesterday', label: 'Yesterday', start: startOfDay(d), end: endOfDay(d) };
  }
  if (/\blast\s+week\b/.test(s) || /\bprevious\s+week\b/.test(s)) {
    // Previous Mon–Sun week.
    const day = (now.getDay() + 6) % 7; // Mon = 0
    const thisMon = startOfDay(addDays(now, -day));
    const start = addDays(thisMon, -7);
    const end = addDays(thisMon, -1);
    return { key: 'last-week', label: 'Last week', start, end: endOfDay(end) };
  }
  if (/\bthis\s+week\b/.test(s) || /\bthis\s+wk\b/.test(s)) {
    const day = (now.getDay() + 6) % 7;
    const start = startOfDay(addDays(now, -day));
    return { key: 'this-week', label: 'This week', start, end: endOfDay(now) };
  }
  if (/\blast\s+month\b/.test(s) || /\bprevious\s+month\b/.test(s)) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { key: 'last-month', label: 'Last month', start: startOfDay(start), end: endOfDay(end) };
  }
  if (/\bthis\s+month\b/.test(s)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { key: 'this-month', label: 'This month', start: startOfDay(start), end: endOfDay(now) };
  }
  if (/\blast\s+30\s+days\b/.test(s) || /\blast\s+month\b/.test(s)) {
    return { key: 'last-30-days', label: 'Last 30 days', start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
  }
  if (/\btoday\b/.test(s)) {
    return { key: 'today', label: 'Today', start: startOfDay(now), end: endOfDay(now) };
  }
  return { key: 'all', label: 'All time', start: new Date(0), end: endOfDay(now) };
}

export function inPeriod(d: Date, p: Period): boolean {
  return d >= p.start && d <= p.end;
}

/* ------------------------------------------------------------------ */
/* Daily summary (plain English + simple Bangla)                       */
/* ------------------------------------------------------------------ */

export interface DailySummary {
  dateLabel: string;
  revenue: number;
  manualExpenses: number;
  orderExtraCosts: number;
  profit: number;
  orderCount: number;
  topCost: { label: string; amount: number } | null;
  english: string;
  bangla: string;
}

export function dailySummary(data: AccountantData, day = new Date()): DailySummary {
  const counted = data.orders.filter(
    (o) => isCounted(o) && sameDay(new Date(o.createdAt), day),
  );
  const revenue = counted.reduce((s, o) => s + o.total, 0);
  const productCost = counted.reduce((s, o) => s + orderProductCost(o, data.products), 0);
  const orderExtras = counted.reduce(
    (s, o) => s + (o.packagingCost ?? 0) + (o.deliveryCost ?? o.deliveryFee ?? 0) + (o.paymentFee ?? 0),
    0,
  );
  const manual = data.expenses.filter((e) => sameDay(new Date(e.date), day));
  const manualExpenses = totalManualExpenses(manual);
  const manualIncome = data.incomes
    .filter((i) => sameDay(new Date(i.date), day))
    .reduce((s, i) => s + i.amount, 0);
  const profit = revenue - productCost - orderExtras - manualExpenses + manualIncome;

  // Top cost today: biggest of product cost / order extras / manual expense categories.
  const candidates: { label: string; amount: number }[] = [
    { label: 'Product costs', amount: productCost },
    { label: 'Packaging + delivery + fees', amount: orderExtras },
  ];
  const byCat = new Map<string, number>();
  for (const e of manual) byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
  for (const [label, amount] of byCat) candidates.push({ label: `${label} expenses`, amount });
  candidates.sort((a, b) => b.amount - a.amount);
  const topCost = candidates[0] && candidates[0].amount > 0 ? candidates[0] : null;

  const dateLabel = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const english =
    counted.length === 0
      ? `Today you have no counted orders yet. ${manualExpenses > 0 ? `You spent ৳${manualExpenses.toLocaleString('en-US')} on expenses.` : 'No expenses recorded today.'}`
      : `Today you made ৳${profit.toLocaleString('en-US')} profit on ${counted.length} order${counted.length === 1 ? '' : 's'} (${counted.length === 1 ? 'revenue' : 'revenue'} ৳${revenue.toLocaleString('en-US')}).` +
        (topCost ? ` Top cost was ${topCost.label} at ৳${topCost.amount.toLocaleString('en-US')}.` : '');
  const bangla =
    counted.length === 0
      ? `আজ এখনো কোনো অর্ডার নেই।${manualExpenses > 0 ? ` আজ খরচ হয়েছে ৳${manualExpenses.toLocaleString('en-US')}।` : ' আজ কোনো খরচ রেকর্ড করা হয়নি।'}`
      : `আজ ${counted.length}টি অর্ডারে আপনার লাভ ৳${profit.toLocaleString('en-US')} (আয় ৳${revenue.toLocaleString('en-US')})।` +
        (topCost ? ` সবচেয়ে বড় খরচ ছিল ${topCost.label} — ৳${topCost.amount.toLocaleString('en-US')}।` : '');

  return {
    dateLabel,
    revenue,
    manualExpenses,
    orderExtraCosts: orderExtras,
    profit,
    orderCount: counted.length,
    topCost,
    english,
    bangla,
  };
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ------------------------------------------------------------------ */
/* Auto-categorize expenses (rule-based keyword map)                   */
/* ------------------------------------------------------------------ */

export interface CategorySuggestion {
  category: ExpenseCategory;
  confidence: number; // 0–1
  matchedKeyword: string | null;
  reason: string;
}

interface CategoryRule {
  category: ExpenseCategory;
  keywords: string[]; // lowercase substrings, most specific first
  strong: string[]; // multi-word / very specific keywords → high confidence
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Ads FB',
    keywords: ['facebook', 'fb ad', 'fb boost', 'meta ad', 'instagram', 'insta ad', 'boost', 'advertis', 'promotion', 'sponsor', ' ad '],
    strong: ['bkash ad', 'facebook ad', 'fb ad', 'fb boost', 'meta ad', 'instagram ad', 'boost post'],
  },
  {
    category: 'Ads TikTok',
    keywords: ['tiktok', 'tik tok'],
    strong: ['tiktok ad', 'tiktok boost', 'tik tok ad'],
  },
  {
    category: 'Packaging',
    keywords: ['packaging', 'poly', 'bubble', 'ribbon', 'sticker', 'label', 'box', 'boxes', 'bag', 'tape', 'wrap'],
    strong: ['packaging box', 'packaging boxes', 'bubble wrap', 'poly bag'],
  },
  {
    category: 'Delivery',
    keywords: ['pathao', 'steadfast', 'redx', 'paperfly', 'courier', 'shipping', 'delivery', 'parcel'],
    strong: ['pathao delivery', 'steadfast delivery', 'delivery charge', 'courier charge'],
  },
  {
    category: 'Product Cost',
    keywords: ['serum', 'stock', 'inventory', 'supplier', 'wholesale', 'purchase', 'cream', 'perfume', 'lipstick', 'moisturizer', 'toner', 'cleanser', 'product'],
    strong: ['serum stock', 'stock purchase', 'buy stock', 'supplier payment', 'wholesale'],
  },
  {
    category: 'Salary',
    keywords: ['salary', 'wage', 'staff', 'helper', 'employee'],
    strong: ['salary payment', 'staff salary'],
  },
  {
    category: 'Shop',
    keywords: ['rent', 'electric', 'internet', 'wifi', 'utility', 'shop'],
    strong: ['shop rent', 'electricity bill', 'internet bill'],
  },
];

export function suggestExpenseCategory(note: string): CategorySuggestion {
  const s = ` ${note.toLowerCase().trim()} `;
  if (!note.trim()) {
    return { category: 'Other', confidence: 0, matchedKeyword: null, reason: 'No note text to learn from.' };
  }
  // Strong (specific) matches win first.
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.strong) {
      if (s.includes(kw)) {
        return { category: rule.category, confidence: 0.9, matchedKeyword: kw, reason: `Matched "${kw}" → ${rule.category}.` };
      }
    }
  }
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (s.includes(kw)) {
        return { category: rule.category, confidence: 0.7, matchedKeyword: kw.trim(), reason: `Matched "${kw.trim()}" → ${rule.category}.` };
      }
    }
  }
  return { category: 'Other', confidence: 0.3, matchedKeyword: null, reason: 'No keyword matched — defaulted to Other. Pick a category manually.' };
}

/* ------------------------------------------------------------------ */
/* Plain-language Q&A                                                  */
/* ------------------------------------------------------------------ */

export interface QAAnswer {
  question: string;
  title: string;
  answer: string;
  rows: { label: string; value: string }[];
  note: string;
}

const CATEGORY_WORDS: Record<string, string> = {
  perfume: 'Perfume',
  skincare: 'Skincare',
  'skin care': 'Skincare',
  beauty: 'Beauty',
};

function detectCategory(q: string): string | null {
  const s = q.toLowerCase();
  for (const [word, cat] of Object.entries(CATEGORY_WORDS)) {
    if (s.includes(word)) return cat;
  }
  return null;
}

function detectChannel(q: string): string | null {
  const s = q.toLowerCase();
  if (s.includes('instagram') || s.includes('insta')) return 'Instagram';
  if (s.includes('facebook') || /\bfb\b/.test(s)) return 'Facebook';
  if (s.includes('tiktok') || s.includes('tik tok')) return 'TikTok';
  if (s.includes('website') || s.includes('web site')) return 'Website';
  return null;
}

function fmt(n: number): string {
  return `৳${Math.round(n).toLocaleString('en-US')}`;
}

export function answerQuestion(question: string, data: AccountantData, now = new Date()): QAAnswer {
  const q = question.trim();
  const s = q.toLowerCase();
  const period = resolvePeriod(s, now);
  const category = detectCategory(s);
  const channel = detectChannel(s);
  const scopeBits: string[] = [period.label];
  if (category) scopeBits.push(category);
  if (channel) scopeBits.push(channel);
  const scope = scopeBits.join(' • ');

  const counted = data.orders.filter((o) => isCounted(o) && inPeriod(new Date(o.createdAt), period));
  const periodOrders = channel ? counted.filter((o) => (o.channel ?? 'Website') === channel) : counted;
  const periodExpenses = data.expenses.filter((e) => inPeriod(new Date(e.date), period));
  const periodIncomes = data.incomes.filter((i) => inPeriod(new Date(i.date), period));

  // Category-filtered, item-level aggregation (orders can mix categories).
  const categoryItems = (orders: Order[]) => {
    let revenue = 0;
    let cost = 0;
    let units = 0;
    for (const o of orders) {
      for (const it of o.items) {
        const p = data.products.find((x) => x.id === it.productId);
        if (category && p && p.category !== category) continue;
        revenue += it.price * it.qty;
        cost += (p?.costPrice ?? 0) * it.qty;
        units += it.qty;
      }
    }
    return { revenue, cost, units, profitBeforeShared: revenue - cost };
  };

  // --- Best / slowest seller ---
  if (/best\s*seller|best-selling|top\s*seller|top\s*product|most\s*sold|most\s*popular/.test(s)) {
    const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
    for (const o of periodOrders) {
      for (const it of o.items) {
        const p = data.products.find((x) => x.id === it.productId);
        if (category && p && p.category !== category) continue;
        const cur = byProduct.get(it.productId) || { name: it.name, units: 0, revenue: 0 };
        cur.units += it.qty;
        cur.revenue += it.price * it.qty;
        byProduct.set(it.productId, cur);
      }
    }
    const ranked = [...byProduct.values()].sort((a, b) => b.units - a.units);
    if (ranked.length === 0) {
      return { question: q, title: 'Best seller', answer: `No sales found for ${scope}.`, rows: [], note: 'Try a different period or category.' };
    }
    const top = ranked[0]!;
    return {
      question: q,
      title: 'Best seller',
      answer: `Your best seller for ${scope} is "${top.name}" — ${top.units} unit${top.units === 1 ? '' : 's'} sold, ${fmt(top.revenue)} revenue.`,
      rows: ranked.slice(0, 5).map((r, i) => ({ label: `#${i + 1} ${r.name}`, value: `${r.units} units • ${fmt(r.revenue)}` })),
      note: 'Ranked by units sold in the period.',
    };
  }
  if (/worst\s*seller|slowest|least\s*sold|lowest\s*seller/.test(s)) {
    const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
    for (const p of data.products) {
      if (category && p.category !== category) continue;
      byProduct.set(p.id, { name: p.name, units: 0, revenue: 0 });
    }
    for (const o of periodOrders) {
      for (const it of o.items) {
        const cur = byProduct.get(it.productId);
        if (cur) {
          cur.units += it.qty;
          cur.revenue += it.price * it.qty;
        }
      }
    }
    const ranked = [...byProduct.values()].sort((a, b) => a.units - b.units);
    const bottom = ranked[0];
    if (!bottom) {
      return { question: q, title: 'Slowest seller', answer: 'No products found.', rows: [], note: '' };
    }
    return {
      question: q,
      title: 'Slowest seller',
      answer: `Your slowest seller for ${scope} is "${bottom.name}" — ${bottom.units} unit${bottom.units === 1 ? '' : 's'} sold, ${fmt(bottom.revenue)} revenue.`,
      rows: ranked.slice(0, 5).map((r, i) => ({ label: `#${i + 1} ${r.name}`, value: `${r.units} units • ${fmt(r.revenue)}` })),
      note: 'Products with no sales in the period are listed first.',
    };
  }

  // --- Stock / run out ---
  if (/stock|run\s*out|inventory|left/.test(s)) {
    const stock = stockForecast(data.products, data.orders, now);
    const filtered = category ? stock.filter((x) => x.product.category === category) : stock;
    const urgent = filtered.filter((x) => x.daysLeft !== null && x.daysLeft < 14);
    return {
      question: q,
      title: 'Stock forecast',
      answer:
        urgent.length > 0
          ? `${urgent.length} product${urgent.length === 1 ? '' : 's'} will run out in under 14 days. Most urgent: "${urgent[0]!.product.name}" — about ${urgent[0]!.daysLeft} days left.`
          : `No products will run out in the next 14 days for ${scope}.`,
      rows: filtered.slice(0, 8).map((x) => ({
        label: `${x.product.name} (${x.product.stock} in stock)`,
        value: x.daysLeft === null ? 'No sales in last 30 days' : `~${x.daysLeft} days left`,
      })),
      note: 'Days left = stock ÷ average daily units sold (last 30 days).',
    };
  }

  // --- Pending / COD / unpaid ---
  if (/pending|cod|unpaid|not\s*received|collect/.test(s)) {
    const pending = counted.filter((o) => !o.paymentReceived);
    const pendingTotal = pending.reduce((sum, o) => sum + o.total, 0);
    const codPending = pending.filter((o) => o.payment === 'COD').reduce((sum, o) => sum + o.total, 0);
    return {
      question: q,
      title: 'Pending payments',
      answer: `You have ${fmt(pendingTotal)} pending across ${pending.length} order${pending.length === 1 ? '' : 's'} for ${scope} (not yet marked received).`,
      rows: [
        { label: 'Pending total', value: fmt(pendingTotal) },
        { label: 'COD pending', value: fmt(codPending) },
        { label: 'Pending orders', value: String(pending.length) },
      ],
      note: 'Mark money as received in Orders → View → Save Costs & Payment.',
    };
  }

  // --- Coupons ---
  if (/coupon|discount|promo/.test(s)) {
    const used = counted.filter((o) => o.couponCode).length;
    const discount = counted.reduce((sum, o) => sum + (o.discount ?? 0), 0);
    return {
      question: q,
      title: 'Coupons',
      answer: `Coupons were used on ${used} order${used === 1 ? '' : 's'} for ${scope}, giving ${fmt(discount)} in discounts.`,
      rows: [
        { label: 'Orders with a coupon', value: String(used) },
        { label: 'Total discount given', value: fmt(discount) },
        { label: 'Active coupons', value: String(data.coupons.filter((c) => c.active).length) },
      ],
      note: 'Discounts are already subtracted from order totals.',
    };
  }

  // --- Margin ---
  if (/margin/.test(s)) {
    const profits = perProductProfit(periodOrders, data.products)
      .filter((p) => (category ? p.product.category === category : true) && p.revenue > 0)
      .sort((a, b) => a.marginPct - b.marginPct);
    if (profits.length === 0) {
      return { question: q, title: 'Profit margin', answer: `No sold products with revenue for ${scope}.`, rows: [], note: '' };
    }
    const lowest = profits[0]!;
    return {
      question: q,
      title: 'Profit margin',
      answer: `Lowest margin for ${scope} is "${lowest.product.name}" at ${lowest.marginPct.toFixed(1)}% (${fmt(lowest.profit)} profit on ${fmt(lowest.revenue)} revenue).`,
      rows: profits.slice(0, 5).map((p) => ({
        label: `${p.product.name}`,
        value: `${p.marginPct.toFixed(1)}% margin • ${fmt(p.profit)} profit`,
      })),
      note: 'Margin = (revenue − buying cost) ÷ revenue, before packaging / delivery / fees.',
    };
  }

  // --- Profit ---
  if (/profit|earn|made|net/.test(s)) {
    if (category) {
      const agg = categoryItems(periodOrders);
      return {
        question: q,
        title: `Profit — ${category}`,
        answer: `Profit on ${category} for ${period.label} is ${fmt(agg.profitBeforeShared)} (${agg.units} units, ${fmt(agg.revenue)} revenue, ${fmt(agg.cost)} product cost).`,
        rows: [
          { label: `${category} revenue`, value: fmt(agg.revenue) },
          { label: `${category} product cost`, value: fmt(agg.cost) },
          { label: `${category} profit`, value: fmt(agg.profitBeforeShared) },
        ],
        note: 'Category profit is before shared packaging / delivery / fees, which are not split by category.',
      };
    }
    const revenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const productCost = periodOrders.reduce((sum, o) => sum + orderProductCost(o, data.products), 0);
    const extras = periodOrders.reduce(
      (sum, o) => sum + (o.packagingCost ?? 0) + (o.deliveryCost ?? o.deliveryFee ?? 0) + (o.paymentFee ?? 0),
      0,
    );
    const manualIncome = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
    const manual = channel ? 0 : totalManualExpenses(periodExpenses);
    const profit = revenue - productCost - extras - manual + manualIncome;
    return {
      question: q,
      title: 'Profit',
      answer: `Net profit for ${scope} is ${fmt(profit)} on ${periodOrders.length} order${periodOrders.length === 1 ? '' : 's'}.`,
      rows: [
        { label: 'Revenue', value: fmt(revenue) },
        { label: 'Product costs', value: fmt(productCost) },
        { label: 'Packaging + delivery + fees', value: fmt(extras) },
        ...(channel ? [] : [{ label: 'Manual expenses', value: fmt(manual) }]),
        { label: 'Manual income', value: fmt(manualIncome) },
        { label: 'Net profit', value: fmt(profit) },
      ],
      note: channel
        ? 'Channel profit excludes manual expenses (they are not split by channel).'
        : 'Net profit = Revenue − Product costs − Order costs − Manual expenses + Manual income.',
    };
  }

  // --- Revenue / sales ---
  if (/revenue|sales|sell|income|turnover/.test(s)) {
    if (category) {
      const agg = categoryItems(periodOrders);
      return {
        question: q,
        title: `Revenue — ${category}`,
        answer: `${category} revenue for ${period.label} is ${fmt(agg.revenue)} (${agg.units} units sold).`,
        rows: [
          { label: `${category} revenue`, value: fmt(agg.revenue) },
          { label: `${category} units sold`, value: String(agg.units) },
          { label: `${category} profit (before shared costs)`, value: fmt(agg.profitBeforeShared) },
        ],
        note: 'Item-level revenue for the category.',
      };
    }
    const revenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const aov = periodOrders.length > 0 ? revenue / periodOrders.length : 0;
    return {
      question: q,
      title: 'Revenue',
      answer: `Revenue for ${scope} is ${fmt(revenue)} across ${periodOrders.length} order${periodOrders.length === 1 ? '' : 's'}.`,
      rows: [
        { label: 'Revenue', value: fmt(revenue) },
        { label: 'Orders', value: String(periodOrders.length) },
        { label: 'Average order value', value: fmt(aov) },
      ],
      note: 'Cancelled / Returned orders are excluded.',
    };
  }

  // --- Expenses / spend ---
  if (/expense|spend|spent|cost/.test(s)) {
    const byCat = new Map<string, number>();
    for (const e of periodExpenses) byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
    const manualTotal = totalManualExpenses(periodExpenses);
    const orderExtras = periodOrders.reduce(
      (sum, o) => sum + (o.packagingCost ?? 0) + (o.deliveryCost ?? o.deliveryFee ?? 0) + (o.paymentFee ?? 0),
      0,
    );
    let focusLabel = 'Total spent (manual + order costs)';
    let focusValue = manualTotal + orderExtras;
    if (/\bad(s)?\b|advert/.test(s)) {
      const ads = (byCat.get('Ads FB') || 0) + (byCat.get('Ads TikTok') || 0);
      return {
        question: q,
        title: 'Ad spend',
        answer: `You spent ${fmt(ads)} on ads for ${period.label} (Facebook/Instagram ${fmt(byCat.get('Ads FB') || 0)}, TikTok ${fmt(byCat.get('Ads TikTok') || 0)}).`,
        rows: [
          { label: 'Ads FB', value: fmt(byCat.get('Ads FB') || 0) },
          { label: 'Ads TikTok', value: fmt(byCat.get('Ads TikTok') || 0) },
          { label: 'Total ad spend', value: fmt(ads) },
        ],
        note: 'Manual ad expenses only — see Expenses for the full list.',
      };
    }
    if (/deliver/.test(s)) {
      const orderDelivery = periodOrders.reduce((sum, o) => sum + (o.deliveryCost ?? o.deliveryFee ?? 0), 0);
      const manualDelivery = byCat.get('Delivery') || 0;
      focusLabel = 'Delivery costs';
      focusValue = orderDelivery + manualDelivery;
      return {
        question: q,
        title: 'Delivery costs',
        answer: `Delivery costs for ${period.label} total ${fmt(focusValue)} (per-order ${fmt(orderDelivery)} + manual ${fmt(manualDelivery)}).`,
        rows: [
          { label: 'Per-order delivery cost', value: fmt(orderDelivery) },
          { label: 'Manual Delivery expenses', value: fmt(manualDelivery) },
          { label: 'Total delivery', value: fmt(focusValue) },
        ],
        note: '',
      };
    }
    if (/packag/.test(s)) {
      const orderPack = periodOrders.reduce((sum, o) => sum + (o.packagingCost ?? 0), 0);
      const manualPack = byCat.get('Packaging') || 0;
      return {
        question: q,
        title: 'Packaging costs',
        answer: `Packaging costs for ${period.label} total ${fmt(orderPack + manualPack)} (per-order ${fmt(orderPack)} + manual ${fmt(manualPack)}).`,
        rows: [
          { label: 'Per-order packaging', value: fmt(orderPack) },
          { label: 'Manual Packaging expenses', value: fmt(manualPack) },
          { label: 'Total packaging', value: fmt(orderPack + manualPack) },
        ],
        note: '',
      };
    }
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      question: q,
      title: 'Expenses',
      answer: `You spent ${fmt(focusValue)} for ${period.label} (manual expenses ${fmt(manualTotal)} + per-order packaging/delivery/fees ${fmt(orderExtras)}).` +
        (top ? ` Biggest manual category: ${top[0]} at ${fmt(top[1])}.` : ''),
      rows: [
        { label: 'Manual expenses', value: fmt(manualTotal) },
        { label: 'Per-order costs', value: fmt(orderExtras) },
        { label: focusLabel, value: fmt(focusValue) },
        ...[...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ label: `· ${k}`, value: fmt(v) })),
      ],
      note: 'Manual expenses never double-count per-order costs.',
    };
  }

  // --- Order count ---
  if (/how many|order|aov|average/.test(s)) {
    const revenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const aov = periodOrders.length > 0 ? revenue / periodOrders.length : 0;
    return {
      question: q,
      title: 'Orders',
      answer: `You had ${periodOrders.length} counted order${periodOrders.length === 1 ? '' : 's'} for ${scope}, averaging ${fmt(aov)} per order.`,
      rows: [
        { label: 'Orders', value: String(periodOrders.length) },
        { label: 'Revenue', value: fmt(revenue) },
        { label: 'Average order value', value: fmt(aov) },
      ],
      note: 'Cancelled / Returned orders are excluded.',
    };
  }

  // --- Fallback: overview ---
  {
    const revenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const profit = periodOrders.reduce((sum, o) => sum + orderProfit(o, data.products), 0);
    const manual = totalManualExpenses(periodExpenses);
    return {
      question: q,
      title: 'Overview',
      answer: `For ${scope}: revenue ${fmt(revenue)}, order-level profit ${fmt(profit)}, manual expenses ${fmt(manual)}, ${periodOrders.length} order${periodOrders.length === 1 ? '' : 's'}.`,
      rows: [
        { label: 'Revenue', value: fmt(revenue) },
        { label: 'Order-level profit', value: fmt(profit) },
        { label: 'Manual expenses', value: fmt(manual) },
        { label: 'Orders', value: String(periodOrders.length) },
      ],
      note: 'Try: "How much profit on perfume last month?", "What is my best seller?", "How much did I spend on ads?"',
    };
  }
}

export const SUGGESTED_QUESTIONS = [
  'How much profit did I make this month?',
  'How much profit on perfume last month?',
  'What is my best seller?',
  'How much did I spend on ads?',
  'How much revenue did I make today?',
  'How much is pending in COD?',
];

/* ------------------------------------------------------------------ */
/* Forecasting                                                         */
/* ------------------------------------------------------------------ */

export interface MonthForecast {
  monthLabel: string;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  revenueSoFar: number;
  profitSoFar: number;
  avgDailyRevenue: number;
  avgDailyProfit: number;
  projectedRevenue: number;
  projectedProfit: number;
  projectedRevenueLow: number;
  projectedRevenueHigh: number;
  projectedProfitLow: number;
  projectedProfitHigh: number;
  basis: string;
}

export function forecastMonth(data: AccountantData, now = new Date()): MonthForecast {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;
  const monthStart = new Date(year, month, 1);
  const windowStart = addDays(startOfDay(now), -29);

  // Daily revenue/profit over the last 30 days → simple average pace.
  let windowRevenue = 0;
  let windowProfit = 0;
  for (const o of data.orders.filter(isCounted)) {
    const d = new Date(o.createdAt);
    if (d >= windowStart && d <= now) {
      windowRevenue += o.total;
      windowProfit += orderProfit(o, data.products);
    }
  }
  const windowManual = data.expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d >= windowStart && d <= now;
    })
    .reduce((s, e) => s + e.amount, 0);
  const windowIncome = data.incomes
    .filter((i) => {
      const d = new Date(i.date);
      return d >= windowStart && d <= now;
    })
    .reduce((s, i) => s + i.amount, 0);
  windowProfit = windowProfit - windowManual + windowIncome;

  const avgDailyRevenue = windowRevenue / 30;
  const avgDailyProfit = windowProfit / 30;

  const monthOrders = data.orders.filter((o) => {
    const d = new Date(o.createdAt);
    return isCounted(o) && d >= monthStart && d <= now;
  });
  const revenueSoFar = monthOrders.reduce((s, o) => s + o.total, 0);
  const profitSoFar =
    monthOrders.reduce((s, o) => s + orderProfit(o, data.products), 0) -
    data.expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= monthStart && d <= now;
      })
      .reduce((s, e) => s + e.amount, 0) +
    data.incomes
      .filter((i) => {
        const d = new Date(i.date);
        return d >= monthStart && d <= now;
      })
      .reduce((s, i) => s + i.amount, 0);

  const projectedRevenue = revenueSoFar + avgDailyRevenue * daysRemaining;
  const projectedProfit = profitSoFar + avgDailyProfit * daysRemaining;
  // Simple range: ±15% around the pace-based projection.
  const spread = (v: number) => ({ low: Math.round(v * 0.85), high: Math.round(v * 1.15) });
  const revRange = spread(projectedRevenue);
  const profRange = spread(projectedProfit);

  return {
    monthLabel: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    daysInMonth,
    daysElapsed,
    daysRemaining,
    revenueSoFar,
    profitSoFar,
    avgDailyRevenue,
    avgDailyProfit,
    projectedRevenue: Math.round(projectedRevenue),
    projectedProfit: Math.round(projectedProfit),
    projectedRevenueLow: revRange.low,
    projectedRevenueHigh: revRange.high,
    projectedProfitLow: profRange.low,
    projectedProfitHigh: profRange.high,
    basis: 'Average daily revenue/profit over the last 30 days × remaining days in the month.',
  };
}

export interface StockForecast {
  product: Product;
  unitsSold30d: number;
  avgDailyUnits: number;
  daysLeft: number | null; // null = no sales in last 30 days, cannot estimate
  status: 'ok' | 'low' | 'urgent';
}

export function stockForecast(products: Product[], orders: Order[], now = new Date()): StockForecast[] {
  const windowStart = addDays(startOfDay(now), -29);
  const sold = new Map<string, number>();
  for (const o of orders.filter(isCounted)) {
    const d = new Date(o.createdAt);
    if (d < windowStart || d > now) continue;
    for (const it of o.items) sold.set(it.productId, (sold.get(it.productId) || 0) + it.qty);
  }
  const list: StockForecast[] = products.map((p) => {
    const unitsSold30d = sold.get(p.id) || 0;
    const avgDailyUnits = unitsSold30d / 30;
    const daysLeft = avgDailyUnits > 0 ? Math.floor(p.stock / avgDailyUnits) : null;
    const status: StockForecast['status'] =
      daysLeft !== null && daysLeft < 14 ? 'urgent' : p.stock <= 5 ? 'low' : 'ok';
    return { product: p, unitsSold30d, avgDailyUnits, daysLeft, status };
  });
  // Most urgent first.
  list.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  return list;
}

/* ------------------------------------------------------------------ */
/* Smart alerts                                                        */
/* ------------------------------------------------------------------ */

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  link: string;
}

export function generateAlerts(data: AccountantData, now = new Date()): Alert[] {
  const alerts: Alert[] = [];
  const { orders, products, expenses, coupons } = data;

  // Low stock.
  for (const p of products.filter((x) => x.stock <= 5)) {
    alerts.push({
      id: `low-stock-${p.id}`,
      severity: p.stock === 0 ? 'critical' : 'warning',
      title: 'Low stock',
      message: `"${p.name}" has only ${p.stock} left in stock.`,
      link: '/admin/products',
    });
  }

  // Will run out soon.
  for (const f of stockForecast(products, orders, now).filter((x) => x.daysLeft !== null && x.daysLeft < 14)) {
    alerts.push({
      id: `runout-${f.product.id}`,
      severity: f.daysLeft !== null && f.daysLeft < 7 ? 'critical' : 'warning',
      title: 'Will run out soon',
      message: `"${f.product.name}" will run out in about ${f.daysLeft} days at the current sales pace (${f.product.stock} in stock).`,
      link: '/admin/products',
    });
  }

  // Delivery cost spike (>20% vs prior week).
  const thisWeekStart = startOfDay(addDays(now, -6));
  const lastWeekStart = startOfDay(addDays(now, -13));
  const lastWeekEnd = endOfDay(addDays(now, -7));
  const deliveryCostOf = (list: Order[], manual: Expense[]) => {
    const orderCost = list.reduce((s, o) => s + (o.deliveryCost ?? o.deliveryFee ?? 0), 0);
    const manualCost = manual.filter((e) => e.category === 'Delivery').reduce((s, e) => s + e.amount, 0);
    return orderCost + manualCost;
  };
  const thisWeekOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return isCounted(o) && d >= thisWeekStart && d <= now;
  });
  const lastWeekOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return isCounted(o) && d >= lastWeekStart && d <= lastWeekEnd;
  });
  const thisWeekDelivery = deliveryCostOf(
    thisWeekOrders,
    expenses.filter((e) => new Date(e.date) >= thisWeekStart),
  );
  const lastWeekDelivery = deliveryCostOf(
    lastWeekOrders,
    expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= lastWeekStart && d <= lastWeekEnd;
    }),
  );
  if (lastWeekDelivery > 0 && thisWeekDelivery > lastWeekDelivery * 1.2) {
    const pct = Math.round(((thisWeekDelivery - lastWeekDelivery) / lastWeekDelivery) * 100);
    alerts.push({
      id: 'delivery-spike',
      severity: 'warning',
      title: 'Delivery cost spike',
      message: `Delivery costs are up ${pct}% vs last week (${fmt(thisWeekDelivery)} vs ${fmt(lastWeekDelivery)}). Check courier charges.`,
      link: '/admin/finance/expenses',
    });
  }

  // Profit margin < 10% on any product (with sales).
  for (const pp of perProductProfit(orders, products)) {
    if (pp.revenue > 0 && pp.costSet && pp.marginPct < 10) {
      alerts.push({
        id: `margin-${pp.product.id}`,
        severity: 'warning',
        title: 'Low profit margin',
        message: `"${pp.product.name}" has only ${pp.marginPct.toFixed(1)}% margin — consider raising the price or lowering the buying cost.`,
        link: '/admin/finance/profit',
      });
    }
  }

  // COD pending > ৳5000.
  const codPending = orders
    .filter((o) => isCounted(o) && o.payment === 'COD' && !o.paymentReceived)
    .reduce((s, o) => s + o.total, 0);
  if (codPending > 5000) {
    alerts.push({
      id: 'cod-pending',
      severity: 'critical',
      title: 'COD money pending',
      message: `${fmt(codPending)} in Cash on Delivery orders has not been marked received yet. Follow up and confirm collection.`,
      link: '/admin/orders',
    });
  }

  // Coupon expiring soon (within 7 days).
  for (const c of coupons.filter((x) => x.active && x.expiry)) {
    const days = Math.ceil((new Date(c.expiry as string).getTime() - startOfDay(now).getTime()) / 86400000);
    if (days >= 0 && days <= 7) {
      alerts.push({
        id: `coupon-${c.id}`,
        severity: 'warning',
        title: 'Coupon expiring soon',
        message: `Coupon "${c.code}" expires in ${days} day${days === 1 ? '' : 's'} (${c.expiry}). Extend it or let it end.`,
        link: '/admin/coupons',
      });
    }
  }

  // Dead stock (no sales in 30 days, still in stock).
  const windowStart = startOfDay(addDays(now, -29));
  const soldIds = new Set<string>();
  for (const o of orders.filter(isCounted)) {
    const d = new Date(o.createdAt);
    if (d < windowStart || d > now) continue;
    for (const it of o.items) soldIds.add(it.productId);
  }
  for (const p of products.filter((x) => x.stock > 0 && !soldIds.has(x.id))) {
    alerts.push({
      id: `dead-${p.id}`,
      severity: 'info',
      title: 'Dead stock',
      message: `"${p.name}" has had no sales in the last 30 days (${p.stock} in stock). Consider a discount or bundle.`,
      link: '/admin/products',
    });
  }

  const rank: Record<Alert['severity'], number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Monthly P&L report                                                  */
/* ------------------------------------------------------------------ */

export interface MonthlyPL {
  year: number;
  month: number; // 0-based
  label: string;
  revenue: number;
  cogs: number;
  packaging: number;
  delivery: number;
  paymentFees: number;
  ads: number;
  otherExpenses: number;
  expensesByCategory: { category: string; amount: number }[];
  manualIncome: number;
  totalCosts: number;
  netProfit: number;
  orderCount: number;
}

export function monthlyPL(data: AccountantData, year: number, month: number): MonthlyPL {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const inM = (d: Date) => d >= start && d <= end;
  const monthOrders = data.orders.filter((o) => isCounted(o) && inM(new Date(o.createdAt)));
  const monthExpenses = data.expenses.filter((e) => inM(new Date(e.date)));
  const monthIncomes = data.incomes.filter((i) => inM(new Date(i.date)));

  const revenue = monthOrders.reduce((s, o) => s + o.total, 0);
  const cogs = monthOrders.reduce((s, o) => s + orderProductCost(o, data.products), 0);
  const packaging =
    monthOrders.reduce((s, o) => s + (o.packagingCost ?? 0), 0) +
    monthExpenses.filter((e) => e.category === 'Packaging').reduce((s, e) => s + e.amount, 0);
  const delivery =
    monthOrders.reduce((s, o) => s + (o.deliveryCost ?? o.deliveryFee ?? 0), 0) +
    monthExpenses.filter((e) => e.category === 'Delivery').reduce((s, e) => s + e.amount, 0);
  const paymentFees = monthOrders.reduce((s, o) => s + (o.paymentFee ?? 0), 0);
  const ads = monthExpenses
    .filter((e) => e.category === 'Ads FB' || e.category === 'Ads TikTok')
    .reduce((s, e) => s + e.amount, 0);
  const otherExpenses = monthExpenses
    .filter((e) => !['Packaging', 'Delivery', 'Ads FB', 'Ads TikTok'].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const manualIncome = monthIncomes.reduce((s, i) => s + i.amount, 0);
  const totalCosts = cogs + packaging + delivery + paymentFees + ads + otherExpenses;

  const byCat = new Map<string, number>();
  for (const e of monthExpenses) byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);

  return {
    year,
    month,
    label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    revenue,
    cogs,
    packaging,
    delivery,
    paymentFees,
    ads,
    otherExpenses,
    expensesByCategory: [...byCat.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    manualIncome,
    totalCosts,
    netProfit: revenue - totalCosts + manualIncome,
    orderCount: monthOrders.length,
  };
}

/* ------------------------------------------------------------------ */
/* OPTIONAL external AI hook (no key needed — falls back to local)     */
/* ------------------------------------------------------------------ */

export interface ExternalAIResult {
  provider: string;
  used: boolean;
  text: string | null;
  error?: string;
}

/**
 * OPTIONAL — only used when an AI key is configured.
 * Reads `AI_PROVIDER` (default: "openai") and `OPENAI_API_KEY` from env.
 * Returns { used: false } when no key is set, so callers fall back to the
 * local rule-based answers. Never logs or stores the key.
 *
 * To enable: set OPENAI_API_KEY in .env.local / Vercel env vars and call
 * this from a server route with the user's question + a small data
 * summary. The local rules in this file remain the default.
 */
export async function askExternalAI(
  question: string,
  contextSummary: string,
): Promise<ExternalAIResult> {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    return { provider, used: false, text: null, error: 'No AI key configured — using local rules.' };
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are the accountant for Vibrella, a beauty/skincare/perfume store in Bangladesh. Answer briefly in plain English, using only the numbers in the context. All amounts are in BDT (৳). If the context lacks the data, say so.',
          },
          { role: 'user', content: `Context:\n${contextSummary}\n\nQuestion: ${question}` },
        ],
        max_tokens: 400,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { provider, used: false, text: null, error: `AI provider returned ${res.status} — using local rules.` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim() || null;
    return { provider, used: true, text };
  } catch {
    return { provider, used: false, text: null, error: 'AI provider unreachable — using local rules.' };
  }
}
