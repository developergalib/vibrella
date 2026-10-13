import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { readSession } from '../../../../lib/auth';
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json(); const items = db.products.all();
  const idx = items.findIndex((p) => p.id === params.id); if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const cur = items[idx]!; const next = { ...cur, ...body, price: body.price !== undefined ? Number(body.price) : cur.price, salePrice: body.salePrice ? Number(body.salePrice) : cur.salePrice, costPrice: body.costPrice !== undefined && body.costPrice !== '' ? Number(body.costPrice) : cur.costPrice, stock: body.stock !== undefined ? Number(body.stock) : cur.stock };
  items[idx] = next; db.products.save(items); return NextResponse.json(next);
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  db.products.save(db.products.all().filter((p) => p.id !== params.id)); return NextResponse.json({ ok: true });
}
