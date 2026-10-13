import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../lib/auth';
import { db } from '../../lib/db';
import { formatBDT } from '../../lib/format';
import { isCounted, netProfit, totalManualExpenses, sameDay, inMonth } from '../../lib/finance';
import { generateAlerts } from '../../lib/ai-accountant';

export default async function AdminHome() {
  const s = await readSession(cookies().toString());
  if (!s) redirect('/admin/login');
  const orders = db.orders.all(); const products = db.products.all(); const customers = db.customers.all();
  const expenses = db.expenses.all(); const incomes = db.incomes.all();
  const now = new Date();
  const revenue = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned').reduce((a, o) => a + o.total, 0);
  const profit = netProfit(orders, products, expenses, incomes);
  const profitToday = orders.filter((o) => isCounted(o) && sameDay(new Date(o.createdAt), now)).reduce((a, o) => a + o.total, 0) - expenses.filter((e) => sameDay(new Date(e.date), now)).reduce((a, e) => a + e.amount, 0);
  const profitMonth = netProfit(orders.filter((o) => inMonth(new Date(o.createdAt), now)), products, expenses.filter((e) => inMonth(new Date(e.date), now)), incomes.filter((i) => inMonth(new Date(i.date), now)));
  const expMonth = totalManualExpenses(expenses.filter((e) => inMonth(new Date(e.date), now)));
  const low = products.filter((p) => p.stock <= 5);
  const alerts = generateAlerts({ orders, products, expenses, incomes, coupons: db.coupons.all() });
  const topAlerts = alerts.slice(0, 3);
  return (<div className="max-w-7xl mx-auto px-4 py-8">
    <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Vibrella Admin</h1><form action="/api/auth/logout" method="post"><button formAction="/api/auth/logout" className="btn-ghost" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/admin/login'; }}>Logout</button></form></div>
    <p className="text-sm text-stone-500 mt-1">Logged in as {s.email} • Phase 3 — AI Accountant, Forecasting, Alerts, Monthly Report</p>
    <div className="grid md:grid-cols-4 gap-4 mt-6">
      <div className="card p-5"><p className="label">Total Revenue</p><p className="text-2xl font-bold mt-1">{formatBDT(revenue)}</p></div>
      <div className="card p-5"><p className="label">Net Profit (all time)</p><p className={`text-2xl font-bold mt-1 ${profit < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatBDT(profit)}</p><p className="text-xs text-stone-500 mt-1">Today (rev − manual exp) {formatBDT(profitToday)} • Month {formatBDT(profitMonth)}</p></div>
      <div className="card p-5"><p className="label">Expenses This Month</p><p className="text-2xl font-bold mt-1">{formatBDT(expMonth)}</p><p className="text-xs text-stone-500 mt-1">Manual expenses only</p></div>
      <div className="card p-5"><p className="label">Orders</p><p className="text-2xl font-bold mt-1">{orders.length}</p><p className="text-xs text-stone-500 mt-1">Products {products.length} • Customers {customers.length}</p></div>
    </div>
    <div className="grid md:grid-cols-3 gap-4 mt-6">
      <a href="/admin/products" className="card p-5 hover:shadow-md"> <p className="font-bold">Products & Inventory →</p><p className="text-sm text-stone-500">Add / edit / delete, stock adjust</p></a>
      <a href="/admin/orders" className="card p-5 hover:shadow-md"><p className="font-bold">Orders →</p><p className="text-sm text-stone-500">Status, tracking, details</p></a>
      <a href="/admin/customers" className="card p-5 hover:shadow-md"><p className="font-bold">Customers →</p><p className="text-sm text-stone-500">Order history, totals</p></a>
      <a href="/admin/finance" className="card p-5 hover:shadow-md"><p className="font-bold">Finance →</p><p className="text-sm text-stone-500">Expenses, income, net profit</p></a>
      <a href="/admin/finance/profit" className="card p-5 hover:shadow-md"><p className="font-bold">Profit Calculator →</p><p className="text-sm text-stone-500">Per-product & per-order profit</p></a>
      <a href="/admin/analytics" className="card p-5 hover:shadow-md"><p className="font-bold">Analytics →</p><p className="text-sm text-stone-500">Sales, categories, channels, CSV</p></a>
      <a href="/admin/coupons" className="card p-5 hover:shadow-md"><p className="font-bold">Coupons →</p><p className="text-sm text-stone-500">Codes, discounts, usage</p></a>
      <a href="/admin/ai-accountant" className="card p-5 hover:shadow-md"><p className="font-bold">AI Accountant →</p><p className="text-sm text-stone-500">Ask in plain words, forecast, alerts</p></a>
    </div>
    <div className="card p-5 mt-6"><div className="flex justify-between items-center"><h2 className="font-bold">AI Alerts</h2><a href="/admin/ai-accountant" className="underline text-sm">All alerts →</a></div>{topAlerts.length === 0 ? <p className="text-sm text-stone-500 mt-2">All clear — no alerts right now. 🎉</p> : <ul className="mt-2 space-y-1 text-sm">{topAlerts.map((a) => <li key={a.id}><b>{a.title}:</b> {a.message} <a href={a.link} className="underline">Fix →</a></li>)}</ul>}</div>
    <div className="card p-5 mt-6"><h2 className="font-bold">Low Stock Alerts</h2>{low.length === 0 ? <p className="text-sm text-stone-500 mt-2">No low-stock products. 🎉</p> : <ul className="mt-2 space-y-1 text-sm">{low.map((p) => <li key={p.id}>{p.name} — <b>{p.stock}</b> left • SKU {p.sku}</li>)}</ul>}</div>
    <div className="card p-5 mt-6"><h2 className="font-bold">Recent Orders</h2>{orders.length === 0 ? <p className="text-sm text-stone-500 mt-2">No orders yet.</p> : <div className="mt-2 space-y-2">{orders.slice(0, 5).map((o) => <div key={o.id} className="flex justify-between text-sm"><span>{o.id} • {o.customerName} • {o.status}</span><span className="font-semibold">{formatBDT(o.total)}</span></div>)}</div>}</div>
  </div>);
}
