import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { formatBDT } from '../../../lib/format';
import { isCounted, netProfit, totalManualExpenses, totalOrderExtraCosts, paymentSplit, sameDay, inMonth } from '../../../lib/finance';

export default async function FinanceHome() {
  const s = await readSession(cookies().toString()); if (!s) redirect('/admin/login');
  const orders = db.orders.all(); const products = db.products.all(); const expenses = db.expenses.all(); const incomes = db.incomes.all();
  const now = new Date();
  const counted = orders.filter(isCounted);
  const revenue = counted.reduce((a, o) => a + o.total, 0);
  const revenueToday = counted.filter((o) => sameDay(new Date(o.createdAt), now)).reduce((a, o) => a + o.total, 0);
  const revenueMonth = counted.filter((o) => inMonth(new Date(o.createdAt), now)).reduce((a, o) => a + o.total, 0);
  const expTotal = totalManualExpenses(expenses) + totalOrderExtraCosts(orders);
  const expToday = expenses.filter((e) => sameDay(new Date(e.date), now)).reduce((a, e) => a + e.amount, 0);
  const expMonth = expenses.filter((e) => inMonth(new Date(e.date), now)).reduce((a, e) => a + e.amount, 0);
  const profit = netProfit(orders, products, expenses, incomes);
  const manualIncome = incomes.reduce((a, i) => a + i.amount, 0);
  const split = paymentSplit(orders);
  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
  return (<div className="max-w-7xl mx-auto px-4 py-8">
    <div className="flex justify-between"><h1 className="text-2xl font-bold">Finance Overview</h1><a href="/admin" className="underline text-sm">← Dashboard</a></div>
    <p className="text-sm text-stone-500 mt-1">All amounts in BDT (৳). Net profit = Revenue − Product costs − Order costs (packaging + delivery + fees) − Manual expenses + Manual income.</p>
    <div className="grid md:grid-cols-4 gap-4 mt-6">
      <div className="card p-5"><p className="label">Total Revenue</p><p className="text-2xl font-bold mt-1">{formatBDT(revenue)}</p><p className="text-xs text-stone-500 mt-1">Today {formatBDT(revenueToday)} • Month {formatBDT(revenueMonth)}</p></div>
      <div className="card p-5"><p className="label">Total Costs</p><p className="text-2xl font-bold mt-1">{formatBDT(expTotal)}</p><p className="text-xs text-stone-500 mt-1">Manual expenses today {formatBDT(expToday)} • Month {formatBDT(expMonth)}</p></div>
      <div className="card p-5"><p className="label">Net Profit (all time)</p><p className={`text-2xl font-bold mt-1 ${profit < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatBDT(profit)}</p><p className="text-xs text-stone-500 mt-1">Manual income {formatBDT(manualIncome)}</p></div>
      <div className="card p-5"><p className="label">Orders Counted</p><p className="text-2xl font-bold mt-1">{counted.length} <span className="text-sm font-normal text-stone-500">/ {orders.length} total</span></p><p className="text-xs text-stone-500 mt-1">Cancelled / Returned excluded from revenue & profit.</p></div>
    </div>
    <div className="grid md:grid-cols-3 gap-4 mt-6">
      <a href="/admin/finance/profit" className="card p-5 hover:shadow-md"><p className="font-bold">Profit Calculator →</p><p className="text-sm text-stone-500">Per-product & per-order profit tables</p></a>
      <a href="/admin/finance/expenses" className="card p-5 hover:shadow-md"><p className="font-bold">Expenses →</p><p className="text-sm text-stone-500">Add / edit / delete expenses</p></a>
      <a href="/admin/finance/incomes" className="card p-5 hover:shadow-md"><p className="font-bold">Manual Income →</p><p className="text-sm text-stone-500">Income outside orders</p></a>
      <a href="/admin/ai-accountant" className="card p-5 hover:shadow-md"><p className="font-bold">AI Accountant →</p><p className="text-sm text-stone-500">Plain-language Q&A, forecast, alerts, monthly report</p></a>
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      <div className="card p-5"><h2 className="font-bold">Expenses by Category</h2>{byCat.size === 0 ? <p className="text-sm text-stone-500 mt-2">No manual expenses yet.</p> : <ul className="mt-2 space-y-1 text-sm">{[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><b>{formatBDT(v)}</b></li>)}</ul>}</div>
      <div className="card p-5"><h2 className="font-bold">Payment Received vs Pending</h2><p className="text-xs text-stone-500">Pending = order placed, money not yet marked received. Mark it in Orders → View.</p>{Object.keys(split).length === 0 ? <p className="text-sm text-stone-500 mt-2">No orders yet.</p> : <ul className="mt-2 space-y-1 text-sm">{Object.entries(split).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k} ({v.count} orders)</span><span>Received <b className="text-green-700">{formatBDT(v.received)}</b> • Pending <b className="text-amber-700">{formatBDT(v.pending)}</b></span></li>)}</ul>}</div>
    </div>
  </div>);
}
