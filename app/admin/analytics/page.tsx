'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Order, Product, Customer } from '../../../lib/types';
import { formatBDT } from '../../../lib/format';
import { isCounted, perProductProfit, cashFlowBy, downloadCsv, toCsv } from '../../../lib/finance';
export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]); const [products, setProducts] = useState<Product[]>([]); const [customers, setCustomers] = useState<Customer[]>([]); const [range, setRange] = useState<'day' | 'month'>('day');
  useEffect(() => { fetch('/api/orders').then((r) => r.json()).then(setOrders); fetch('/api/products').then((r) => r.json()).then(setProducts); fetch('/api/customers' as any).then((r) => r.ok ? r.json() : []).then((d: any) => setCustomers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const counted = useMemo(() => orders.filter(isCounted), [orders]);
  const revenue = counted.reduce((s, o) => s + o.total, 0);
  const aov = counted.length ? revenue / counted.length : 0;
  const repeat = customers.length ? customers.filter((c) => c.totalOrders > 1).length / customers.length * 100 : 0;
  const perProduct = useMemo(() => perProductProfit(orders, products).sort((a, b) => b.unitsSold - a.unitsSold), [orders, products]);
  const best = perProduct.filter((p) => p.unitsSold > 0).slice(0, 5);
  const worst = [...perProduct].filter((p) => p.unitsSold > 0).sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 5);
  const byCat = useMemo(() => { const m = new Map<string, number>(); for (const o of counted) for (const it of o.items) { const p = products.find((x) => x.id === it.productId); m.set(p?.category || 'Other', (m.get(p?.category || 'Other') || 0) + it.price * it.qty); } return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [counted, products]);
  const byChannel = useMemo(() => { const m = new Map<string, { rev: number; n: number }>(); for (const o of counted) { const ch = o.channel || 'Website'; const cur = m.get(ch) || { rev: 0, n: 0 }; cur.rev += o.total; cur.n += 1; m.set(ch, cur); } return [...m.entries()].sort((a, b) => b[1].rev - a[1].rev); }, [counted]);
  const flow = useMemo(() => cashFlowBy(orders, [], [], range).slice(-14), [orders, range]);
  const maxFlow = Math.max(1, ...flow.map((f) => Math.max(f.inflow, f.outflow)));
  const maxCat = Math.max(1, ...byCat.map(([, v]) => v));
  function exportOrders() { downloadCsv('vibrella-orders.csv', toCsv(['Order', 'Date', 'Customer', 'Phone', 'Channel', 'Payment', 'Status', 'Subtotal', 'Discount', 'DeliveryFee', 'Total'], orders.map((o) => [o.id, new Date(o.createdAt).toLocaleString(), o.customerName, o.phone, o.channel || 'Website', o.payment, o.status, o.subtotal, o.discount ?? 0, o.deliveryFee, o.total]))); }
  return (<div className="max-w-7xl mx-auto px-4 py-8"><div className="flex justify-between flex-wrap gap-2"><h1 className="text-2xl font-bold">Analytics</h1><div className="flex gap-2"><a href="/admin" className="underline text-sm self-center">← Dashboard</a><button className="btn-ghost" onClick={exportOrders}>Download Orders CSV</button></div></div>
    <div className="grid md:grid-cols-4 gap-4 mt-6">
      <div className="card p-5"><p className="label">Revenue (counted)</p><p className="text-2xl font-bold mt-1">{formatBDT(revenue)}</p></div>
      <div className="card p-5"><p className="label">Average Order Value</p><p className="text-2xl font-bold mt-1">{formatBDT(Math.round(aov))}</p></div>
      <div className="card p-5"><p className="label">Orders</p><p className="text-2xl font-bold mt-1">{counted.length}</p></div>
      <div className="card p-5"><p className="label">Repeat Customer Rate</p><p className="text-2xl font-bold mt-1">{repeat.toFixed(1)}%</p><p className="text-xs text-stone-500">Customers with &gt;1 order</p></div>
    </div>
    <div className="card p-5 mt-6"><div className="flex justify-between"><h2 className="font-bold">Sales (last 14 {range === 'day' ? 'days' : 'months'})</h2><select className="input !w-32 !py-1" value={range} onChange={(e) => setRange(e.target.value as any)}><option value="day">By day</option><option value="month">By month</option></select></div>
      {flow.length === 0 ? <p className="text-sm text-stone-500 mt-2">No sales yet.</p> : <div className="mt-4 space-y-2">{flow.map((f) => (<div key={f.key} className="flex items-center gap-2 text-sm"><span className="w-24 shrink-0">{f.label}</span><div className="flex-1 bg-blush-50 rounded-full h-5 overflow-hidden"><div className="bg-blush-500 h-5 rounded-full" style={{ width: `${Math.round((f.inflow / maxFlow) * 100)}%` }} /></div><span className="w-24 text-right font-semibold">{formatBDT(f.inflow)}</span></div>))}</div>}
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      <div className="card p-5"><h2 className="font-bold">Sales by Category</h2>{byCat.length === 0 ? <p className="text-sm text-stone-500 mt-2">No sales yet.</p> : <div className="mt-3 space-y-2">{byCat.map(([k, v]) => (<div key={k} className="flex items-center gap-2 text-sm"><span className="w-24">{k}</span><div className="flex-1 bg-blush-50 rounded-full h-4 overflow-hidden"><div className="bg-blush-400 h-4 rounded-full" style={{ width: `${Math.round((v / maxCat) * 100)}%` }} /></div><span className="font-semibold">{formatBDT(v)}</span></div>))}</div>}</div>
      <div className="card p-5"><h2 className="font-bold">Sales by Channel</h2>{byChannel.length === 0 ? <p className="text-sm text-stone-500 mt-2">No sales yet.</p> : <ul className="mt-2 space-y-1 text-sm">{byChannel.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k} ({v.n} orders)</span><b>{formatBDT(v.rev)}</b></li>)}</ul>}<p className="text-xs text-stone-500 mt-2">Channel is set at checkout (“Where did you find us?”).</p></div>
      <div className="card p-5"><h2 className="font-bold">Best Sellers</h2>{best.length === 0 ? <p className="text-sm text-stone-500 mt-2">No sales yet.</p> : <ul className="mt-2 space-y-1 text-sm">{best.map((p) => <li key={p.product.id} className="flex justify-between"><span>{p.product.name}</span><b>{p.unitsSold} sold</b></li>)}</ul>}</div>
      <div className="card p-5"><h2 className="font-bold">Slowest Sellers (sold &gt; 0)</h2>{worst.length === 0 ? <p className="text-sm text-stone-500 mt-2">No sales yet.</p> : <ul className="mt-2 space-y-1 text-sm">{worst.map((p) => <li key={p.product.id} className="flex justify-between"><span>{p.product.name}</span><b>{p.unitsSold} sold</b></li>)}</ul>}</div>
    </div>
  </div>);
}
