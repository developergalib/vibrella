import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { readSession } from '../../../lib/auth';
import type { Coupon } from '../../../lib/types';
export async function GET() { return NextResponse.json(db.coupons.all()); }
export async function POST(req: Request) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  if (db.coupons.all().some((c) => c.code === code)) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
  const item: Coupon = { id: `cpn${Date.now()}`, code, type: body.type === 'fixed' ? 'fixed' : 'percent', value: Number(body.value ?? 0), minOrder: Number(body.minOrder ?? 0), expiry: body.expiry || '', usageLimit: body.usageLimit ? Number(body.usageLimit) : undefined, usageCount: 0, active: body.active !== false, createdAt: new Date().toISOString() };
  db.coupons.save([item, ...db.coupons.all()]);
  return NextResponse.json(item, { status: 201 });
}
