import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { readSession } from '../../../lib/auth';
export async function GET() { return NextResponse.json(db.expenses.all()); }
export async function POST(req: Request) {
  const s = await readSession(req.headers.get('cookie')); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.amount || Number(body.amount) < 0) return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
  const item = { id: `exp${Date.now()}`, date: body.date || new Date().toISOString().slice(0, 10), category: body.category || 'Other', amount: Number(body.amount), note: body.note || '', receiptUrl: body.receiptUrl || '', relatedOrderId: body.relatedOrderId || '', relatedProductId: body.relatedProductId || '', createdAt: new Date().toISOString() };
  db.expenses.save([item, ...db.expenses.all()]);
  return NextResponse.json(item, { status: 201 });
}
