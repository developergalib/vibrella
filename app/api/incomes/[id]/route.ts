import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { readSession } from '../../../../lib/auth';
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json(); const items = db.incomes.all();
  const idx = items.findIndex((e) => e.id === params.id); if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  items[idx] = { ...items[idx], ...body, amount: body.amount !== undefined ? Number(body.amount) : items[idx]!.amount };
  db.incomes.save(items); return NextResponse.json(items[idx]);
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  db.incomes.save(db.incomes.all().filter((e) => e.id !== params.id)); return NextResponse.json({ ok: true });
}
