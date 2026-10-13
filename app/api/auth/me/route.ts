import { NextResponse } from 'next/server';
import { readSession } from '../../../../lib/auth';
export async function GET(req: Request) {
  const s = await readSession(req.headers.get('cookie'));
  if (!s) return NextResponse.json({ authed: false }, { status: 401 });
  return NextResponse.json({ authed: true, email: s.email });
}
