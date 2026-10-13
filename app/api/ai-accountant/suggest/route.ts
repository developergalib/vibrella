import { NextResponse } from 'next/server';
import { suggestExpenseCategory } from '../../../../lib/ai-accountant';

/** Auto-categorize an expense note. No AI key needed (keyword rules). */
export async function GET(req: Request) {
  const note = new URL(req.url).searchParams.get('note') || '';
  return NextResponse.json(suggestExpenseCategory(note));
}
