import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../../../lib/auth';
import { db } from '../../../../lib/db';
import { formatBDT } from '../../../../lib/format';
import { monthlyPL } from '../../../../lib/ai-accountant';
import { toCsv } from '../../../../lib/finance';
import ReportActions from '../_components/ReportActions';

function monthParam(value: string | null, now: Date): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11) return { year, month };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

function deltaRow(label: string, cur: number, prev: number) {
  const diff = cur - prev;
  return { label, cur, prev, diff };
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const s = await readSession(cookies().toString());
  if (!s) redirect('/admin/login');
  const data = {
    orders: db.orders.all(),
    products: db.products.all(),
    expenses: db.expenses.all(),
    incomes: db.incomes.all(),
    coupons: db.coupons.all(),
  };
  const now = new Date();
  const { year, month } = monthParam(searchParams.month || null, now);
  const prev = prevMonth(year, month);
  const cur = monthlyPL(data, year, month);
  const last = monthlyPL(data, prev.year, prev.month);

  const rows = [
    deltaRow('Revenue', cur.revenue, last.revenue),
    deltaRow('Product costs (COGS)', cur.cogs, last.cogs),
    deltaRow('Packaging', cur.packaging, last.packaging),
    deltaRow('Delivery', cur.delivery, last.delivery),
    deltaRow('Payment fees', cur.paymentFees, last.paymentFees),
    deltaRow('Ads (FB + TikTok)', cur.ads, last.ads),
    deltaRow('Other expenses', cur.otherExpenses, last.otherExpenses),
    deltaRow('Total costs', cur.totalCosts, last.totalCosts),
    deltaRow('Manual income', cur.manualIncome, last.manualIncome),
    deltaRow('Net profit', cur.netProfit, last.netProfit),
  ];

  const csv = toCsv(
    ['Line', cur.label, last.label, 'Change'],
    rows.map((r) => [r.label, r.cur, r.prev, r.diff]),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Monthly Report — P&amp;L</h1>
          <p className="text-sm text-stone-500 mt-1">
            {cur.label} vs {last.label}. All amounts in BDT (৳).
          </p>
        </div>
        <a href="/admin/ai-accountant" className="underline text-sm no-print">
          ← AI Accountant
        </a>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 mt-6 no-print">
        <div>
          <label className="label">Month</label>
          <input
            type="month"
            name="month"
            className="input"
            defaultValue={`${cur.year}-${String(cur.month + 1).padStart(2, '0')}`}
          />
        </div>
        <button className="btn-primary">View report</button>
        <ReportActions csv={csv} filename={`vibrella-pnl-${cur.year}-${String(cur.month + 1).padStart(2, '0')}.csv`} />
      </form>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="card p-5">
          <p className="label">Net profit — {cur.label}</p>
          <p className={`text-2xl font-bold mt-1 ${cur.netProfit < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {formatBDT(cur.netProfit)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Last month {formatBDT(last.netProfit)} · Change {formatBDT(cur.netProfit - last.netProfit)}
          </p>
        </div>
        <div className="card p-5">
          <p className="label">Revenue — {cur.label}</p>
          <p className="text-2xl font-bold mt-1">{formatBDT(cur.revenue)}</p>
          <p className="text-xs text-stone-500 mt-1">
            {cur.orderCount} orders · Last month {formatBDT(last.revenue)}
          </p>
        </div>
        <div className="card p-5">
          <p className="label">Total costs — {cur.label}</p>
          <p className="text-2xl font-bold mt-1">{formatBDT(cur.totalCosts)}</p>
          <p className="text-xs text-stone-500 mt-1">Last month {formatBDT(last.totalCosts)}</p>
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">P&amp;L line</th>
              <th className="p-3 text-right">{cur.label}</th>
              <th className="p-3 text-right">{last.label}</th>
              <th className="p-3 text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                className={`border-b ${r.label === 'Net profit' || r.label === 'Total costs' ? 'font-bold bg-blush-50' : ''}`}
              >
                <td className="p-3">{r.label}</td>
                <td className="p-3 text-right">{formatBDT(r.cur)}</td>
                <td className="p-3 text-right">{formatBDT(r.prev)}</td>
                <td className={`p-3 text-right ${r.diff < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {r.diff >= 0 ? '+' : ''}
                  {formatBDT(r.diff)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-bold">Manual expenses by category — {cur.label}</h2>
        {cur.expensesByCategory.length === 0 ? (
          <p className="text-sm text-stone-500 mt-2">No manual expenses this month.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {cur.expensesByCategory.map((c) => (
              <li key={c.category} className="flex justify-between">
                <span>{c.category}</span>
                <b>{formatBDT(c.amount)}</b>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-stone-500 mt-3">
          Note: per-order packaging / delivery / fees are already included in the Packaging, Delivery
          and Payment fees lines above. Manual expenses are never double-counted.
        </p>
      </div>
    </div>
  );
}
