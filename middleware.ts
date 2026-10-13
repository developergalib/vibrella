import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = req.cookies.get('vibrella_admin')?.value;
    let ok = false;
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-only-secret-change-me');
        await jwtVerify(token, secret);
        ok = true;
      } catch { ok = false; }
    }
    if (!ok) { const url = req.nextUrl.clone(); url.pathname = '/admin/login'; return NextResponse.redirect(url); }
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*'] };
