import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { readSession } from '../../../../lib/auth';
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json(); const items = db.coupons.all();
  const idx = items.findIndex((c) => c.id === params.id); if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const cur = items[idx]!;
  const code = body.code ? String(body.code).trim().toUpperCase() : cur.code;
  if (items.some((c) => c.id !== params.id && c.code === code)) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
  items[idx] = { ...cur, ...body, code, type: body.type || cur.type, value: body.value !== undefined ? Number(body.value) : cur.value, minOrder: body.minOrder !== undefined ? Number(body.minOrder) : cur.minOrder, usageLimit: body.usageLimit ? Number(body.usageLimit) : undefined, active: body.active !== undefined ? !!body.active : cur.active };
  db.coupons.save(items); return NextResponse.json(items[idx]);
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  db.coupons.save(db.coupons.all().filter((c) => c.id !== params.id)); return NextResponse.json({ ok: true });
}
