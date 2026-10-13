import { NextResponse } from 'next/server';
import { db, validateCoupon } from '../../../../lib/db';
/** Public: validate a coupon code against a subtotal. Never reveals other coupons. */
export async function POST(req: Request) {
  const body = await req.json();
  const code = String(body.code || '').trim().toUpperCase();
  const subtotal = Number(body.subtotal ?? 0);
  const coupon = db.coupons.all().find((c) => c.code === code);
  const res = validateCoupon(coupon, subtotal);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, code, type: coupon!.type, value: coupon!.value, discount: res.discount });
}
