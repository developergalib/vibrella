import { NextResponse } from 'next/server';
import { verifyAdmin, createSession, sessionCookie } from '../../../../lib/auth';
export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  const ok = await verifyAdmin(email, password);
  if (!ok) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  const token = await createSession(email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}
