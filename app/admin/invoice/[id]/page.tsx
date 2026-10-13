'use client';
import { useEffect, useState } from 'react';
import type { Order } from '../../../../lib/types';
import { formatBDT, STORE_EMAIL } from '../../../../lib/format';
export default function InvoicePage({ params }: { params: { id: string } }) {
  const [o, setO] = useState<Order | null>(null);
  useEffect(() => { fetch(`/api/orders/${params.id}`).then((r) => r.json()).then(setO); }, [params.id]);
  if (!o) return <div className="max-w-2xl mx-auto px-4 py-12">Loading invoice…</div>;
  return (<div className="max-w-2xl mx-auto px-4 py-8">
    <div className="no-print flex justify-between mb-4"><a href="/admin/orders" className="underline text-sm">← Orders</a><button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button></div>
    <div className="bg-white rounded-2xl border p-8">
      <div className="flex justify-between items-start"><div><img src="/logo.svg" alt="Vibrella" className="h-10" /><p className="text-sm text-stone-600 mt-2">{STORE_EMAIL}<br />Dhaka, Bangladesh</p></div><div className="text-right"><h1 className="text-2xl font-bold">INVOICE</h1><p className="text-sm">{o.id}</p><p className="text-sm text-stone-500">{new Date(o.createdAt).toLocaleString()}</p></div></div>
      <div className="grid grid-cols-2 gap-4 mt-6 text-sm"><div><p className="label">Bill To</p><p className="font-semibold">{o.customerName}</p><p>{o.phone}</p><p>{o.address}</p></div><div><p className="label">Payment</p><p>{o.payment}</p><p>Status: {o.status}</p>{o.tracking && <p>Tracking: {o.tracking}</p>}</div></div>
      <table className="w-full text-sm mt-6"><thead><tr className="border-b text-left"><th className="py-2">Item</th><th className="py-2">Qty</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{o.items.map((i, idx) => <tr key={idx} className="border-b"><td className="py-2">{i.name}</td><td className="py-2">{i.qty}</td><td className="py-2 text-right">{formatBDT(i.price * i.qty)}</td></tr>)}</tbody></table>
      <div className="text-right text-sm mt-4 space-y-1"><p>Subtotal: {formatBDT(o.subtotal)}</p><p>Delivery: {formatBDT(o.deliveryFee)}</p><p className="font-bold text-lg">Total: {formatBDT(o.total)}</p></div>
      <p className="text-xs text-stone-500 mt-6">Thank you for shopping with Vibrella 💗 • Prices in BDT (৳) • For support: {STORE_EMAIL}</p>
    </div>
  </div>);
}
