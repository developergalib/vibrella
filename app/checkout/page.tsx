'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../components/Store';
import { formatBDT, STORE_EMAIL } from '../../lib/format';
import type { PaymentMethod, Channel } from '../../lib/types';

export default function Checkout() {
  const { items, setQty, remove, clear, subtotal } = useCart();
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('COD'); const [note, setNote] = useState('');
  const [channel, setChannel] = useState<Channel>('Website');
  const [couponCode, setCouponCode] = useState(''); const [discount, setDiscount] = useState(0); const [couponMsg, setCouponMsg] = useState(''); const [couponApplied, setCouponApplied] = useState('');
  const [placing, setPlacing] = useState(false); const [err, setErr] = useState('');
  const router = useRouter();
  const deliveryFee = items.length ? 80 : 0; const total = Math.max(0, subtotal - discount + deliveryFee);
  async function applyCoupon() {
    setCouponMsg('');
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponMsg('Enter a coupon code.'); return; }
    const res = await fetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, subtotal }) });
    const d = await res.json();
    if (!res.ok) { setDiscount(0); setCouponApplied(''); setCouponMsg(d.error || 'Invalid coupon.'); return; }
    setDiscount(d.discount); setCouponApplied(code); setCouponMsg(`Coupon applied — you save ${formatBDT(d.discount)}!`);
  }
  async function place() {
    setErr('');
    if (!name || !phone || !address) { setErr('Please fill name, phone and address.'); return; }
    if (items.length === 0) { setErr('Your bag is empty.'); return; }
    setPlacing(true);
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: name, phone, address, payment, note, channel, couponCode: couponApplied || undefined, items: items.map((i) => ({ productId: i.product.id, name: i.product.name, price: i.product.salePrice ?? i.product.price, qty: i.qty, image: i.product.image })) }) });
    const data = await res.json(); setPlacing(false);
    if (!res.ok) { setErr(data.error || 'Could not place order.'); return; }
    clear(); router.push(`/order-success?id=${data.order.id}`);
  }
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
      <div><h1 className="text-2xl font-bold">Checkout</h1>
        <div className="card p-5 mt-4 space-y-3">
          <div><label className="label">Full name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          <div><label className="label">Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></div>
          <div><label className="label">Delivery address</label><textarea className="input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, area, city" /></div>
          <div><label className="label">Payment method</label><div className="grid grid-cols-2 gap-2 mt-1">{(['COD','bKash','Nagad','Card'] as PaymentMethod[]).map((m) => <label key={m} className={`border rounded-xl px-3 py-2.5 text-sm cursor-pointer ${payment===m?'border-blush-500 bg-blush-50 font-semibold':'border-stone-200'}`}><input type="radio" name="pay" checked={payment===m} onChange={() => setPayment(m)} className="mr-2" />{m === 'COD' ? 'Cash on Delivery' : m}</label>)}</div></div>
          <div><label className="label">Where did you find us?</label><select className="input" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}><option>Website</option><option>Instagram</option><option>Facebook</option><option>TikTok</option><option>Other</option></select></div>
          <div><label className="label">Coupon code (optional)</label><div className="flex gap-2"><input className="input uppercase" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setDiscount(0); setCouponApplied(''); setCouponMsg(''); }} placeholder="VIBRELLA10" /><button type="button" className="btn-ghost shrink-0" onClick={applyCoupon}>Apply</button></div>{couponMsg && <p className={`text-sm mt-1 ${discount > 0 ? 'text-green-700' : 'text-red-600'}`}>{couponMsg}</p>}</div>
          <div><label className="label">Order note (optional)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any note for Vibrella" /></div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button className="btn-primary w-full" disabled={placing} onClick={place}>{placing ? 'Placing…' : `Place Order — ${formatBDT(total)}`}</button>
          <p className="text-xs text-stone-500">After placing, you will get an order reference and an email draft to {STORE_EMAIL} with your order details.</p>
        </div>
      </div>
      <div><h2 className="font-bold">Your Bag</h2><div className="card p-5 mt-4 space-y-3">
        {items.length === 0 && <p className="text-stone-500">Your bag is empty.</p>}
        {items.map((i) => (<div key={i.product.id} className="flex gap-3 items-center"><img src={i.product.image} className="w-14 h-14 rounded-lg object-cover" alt="" /><div className="flex-1"><p className="font-medium text-sm">{i.product.name}</p><p className="text-sm text-stone-500">{formatBDT(i.product.salePrice ?? i.product.price)} × {i.qty}</p></div><input type="number" min={1} value={i.qty} onChange={(e) => setQty(i.product.id, Number(e.target.value))} className="input !w-16" /><button className="text-red-600 text-sm" onClick={() => remove(i.product.id)}>Remove</button></div>))}
        <div className="border-t pt-3 text-sm space-y-1"><p className="flex justify-between"><span>Subtotal</span><span>{formatBDT(subtotal)}</span></p>{discount > 0 && <p className="flex justify-between text-green-700"><span>Coupon {couponApplied}</span><span>−{formatBDT(discount)}</span></p>}<p className="flex justify-between"><span>Delivery</span><span>{formatBDT(deliveryFee)}</span></p><p className="flex justify-between font-bold text-base"><span>Total</span><span>{formatBDT(total)}</span></p></div>
      </div></div>
    </div>
  );
}
