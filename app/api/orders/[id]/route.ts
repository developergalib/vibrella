import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { readSession } from '../../../../lib/auth';
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const o = db.orders.all().find((x) => x.id === params.id);
  if (!o) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(o);
}
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json(); const items = db.orders.all();
  const idx = items.findIndex((o) => o.id === params.id); if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  items[idx] = { ...items[idx], ...body, packagingCost: body.packagingCost !== undefined ? Number(body.packagingCost) : items[idx]!.packagingCost, deliveryCost: body.deliveryCost !== undefined ? Number(body.deliveryCost) : items[idx]!.deliveryCost, paymentFee: body.paymentFee !== undefined ? Number(body.paymentFee) : items[idx]!.paymentFee, paymentReceived: body.paymentReceived !== undefined ? !!body.paymentReceived : items[idx]!.paymentReceived }; db.orders.save(items); return NextResponse.json(items[idx]);
}
