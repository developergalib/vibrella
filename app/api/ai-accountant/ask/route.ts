import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { answerQuestion } from '../../../../lib/ai-accountant';

/** Plain-language Q&A over live store data. No AI key needed (local rules). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json({ error: 'Ask a question, e.g. "How much profit this month?"' }, { status: 400 });
  }
  const data = {
    orders: db.orders.all(),
    products: db.products.all(),
    expenses: db.expenses.all(),
    incomes: db.incomes.all(),
    coupons: db.coupons.all(),
  };
  return NextResponse.json(answerQuestion(q, data));
}
