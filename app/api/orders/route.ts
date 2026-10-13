import { NextResponse } from 'next/server';
import { db, newOrderRef, validateCoupon } from '../../../lib/db';
import type { Order } from '../../../lib/types';
const CHANNELS = ['Website', 'Instagram', 'Facebook', 'TikTok', 'Other'];
export async function GET() { return NextResponse.json(db.orders.all()); }
export async function POST(req: Request) {
  const body = await req.json();
  const items = body.items || [];
  if (!body.customerName || !body.phone || !body.address || items.length === 0) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.qty), 0);
  const deliveryFee = 80;
  // Coupon (optional) — validated server-side, usage incremented only on a successful order.
  let discount = 0; let couponCode: string | undefined;
  const rawCode = String(body.couponCode || '').trim().toUpperCase();
  if (rawCode) {
    const coupon = db.coupons.all().find((c) => c.code === rawCode);
    const res = validateCoupon(coupon, subtotal);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    discount = res.discount; couponCode = rawCode;
  }
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const order: Order = { id: newOrderRef(), createdAt: new Date().toISOString(), customerName: body.customerName, phone: body.phone, address: body.address, payment: body.payment || 'COD', status: 'New', items, subtotal, deliveryFee, total, note: body.note || '', channel: CHANNELS.includes(body.channel) ? body.channel : 'Website', couponCode, discount, packagingCost: 0, deliveryCost: deliveryFee, paymentFee: 0, paymentReceived: false };
  const orders = db.orders.all(); orders.unshift(order); db.orders.save(orders);
  if (couponCode) {
    const coupons = db.coupons.all();
    const c = coupons.find((x) => x.code === couponCode);
    if (c) { c.usageCount += 1; db.coupons.save(coupons); }
  }
  // Upsert customer (lightweight)
  const customers = db.customers.all();
  const ex = customers.find((c) => c.phone === body.phone);
  if (ex) { ex.totalOrders += 1; ex.totalSpent += total; ex.lastOrderAt = order.createdAt; ex.name = body.customerName; }
  else customers.push({ id: `c${Date.now()}`, name: body.customerName, phone: body.phone, address: body.address, totalOrders: 1, totalSpent: total, lastOrderAt: order.createdAt, tags: ['New'] });
  db.customers.save(customers);
  // Decrement stock
  const products = db.products.all();
  for (const it of items) { const p = products.find((x) => x.id === it.productId); if (p) p.stock = Math.max(0, p.stock - Number(it.qty)); }
  db.products.save(products);
  return NextResponse.json({ order }, { status: 201 });
}
