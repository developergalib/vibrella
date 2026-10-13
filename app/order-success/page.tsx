'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Order } from '../../lib/types';
import { formatBDT, STORE_EMAIL } from '../../lib/format';
import Link from 'next/link';
function Inner() {
  const sp = useSearchParams(); const id = sp.get('id');
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => { if (!id) return; fetch(`/api/orders/${id}`).then((r) => r.json()).then(setOrder).catch(() => {}); }, [id]);
  if (!order) return <div className="max-w-xl mx-auto px-4 py-12">Loading order…</div>;
  const subject = encodeURIComponent(`Vibrella Order ${order.id} — ${order.customerName}`);
  const body = encodeURIComponent(`Hello Vibrella,\n\nI just placed an order on the Vibrella store.\n\nOrder: ${order.id}\nName: ${order.customerName}\nPhone: ${order.phone}\nAddress: ${order.address}\nPayment: ${order.payment}\n\nItems:\n${order.items.map((i) => `- ${i.name} x ${i.qty} = ${formatBDT(i.price * i.qty)}`).join('\n')}\n\nSubtotal: ${formatBDT(order.subtotal)}\nDelivery: ${formatBDT(order.deliveryFee)}\nTotal: ${formatBDT(order.total)}\n\nThank you!`);
  return (<div className="max-w-xl mx-auto px-4 py-12 text-center"><h1 className="text-3xl font-bold">Thank you! 💗</h1><p className="mt-2">Your order <b>{order.id}</b> is confirmed.</p><div className="card p-5 mt-6 text-left"><p><b>Total:</b> {formatBDT(order.total)} • {order.payment}</p><p className="text-sm text-stone-600 mt-1">We will contact you at {order.phone} to confirm delivery.</p></div><a className="btn-primary inline-block mt-6" href={`mailto:${STORE_EMAIL}?subject=${subject}&body=${body}`}>Send Order Email to Vibrella</a><div className="mt-4"><Link href="/" className="underline text-sm">Continue shopping</Link></div></div>);
}
export default function Success() { return <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-12">Loading…</div>}><Inner /></Suspense>; }
