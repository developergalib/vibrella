import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { formatBDT } from '../../../lib/format';
export default async function AdminCustomers() {
  const s = await readSession(cookies().toString()); if (!s) redirect('/admin/login');
  const customers = db.customers.all(); const orders = db.orders.all();
  return (<div className="max-w-7xl mx-auto px-4 py-8"><div className="flex justify-between"><h1 className="text-2xl font-bold">Customers</h1><a href="/admin" className="underline text-sm">← Dashboard</a></div>
    <div className="card mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Orders</th><th className="p-3">Total Spent</th><th className="p-3">Last Order</th></tr></thead><tbody>{customers.map((c) => (<tr key={c.id} className="border-b"><td className="p-3 font-semibold">{c.name}</td><td className="p-3">{c.phone}</td><td className="p-3">{c.totalOrders}</td><td className="p-3">{formatBDT(c.totalSpent)}</td><td className="p-3">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</td></tr>))}</tbody></table>{customers.length === 0 && <p className="p-4 text-stone-500">No customers yet.</p>}</div>
    <p className="text-xs text-stone-500 mt-3">Customers are created automatically from checkout. Order history is in Orders → View.</p><p className="text-xs text-stone-500">Total orders in system: {orders.length}</p></div>);
}
