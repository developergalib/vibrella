import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE = 'vibrella_admin';
export function getSessionSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || 'dev-only-secret-change-me';
  return new TextEncoder().encode(s);
}
export async function verifyAdmin(email: string, password: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || '';
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  if (!adminEmail || !hash) return false;
  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) return false;
  try { return await bcrypt.compare(password, hash); } catch { return false; }
}
export async function createSession(email: string): Promise<string> {
  return await new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionSecret());
}
export async function readSession(cookieHeader: string | null): Promise<{ email: string } | null> {
  if (!cookieHeader) return null;
  const m = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  if (!m) return null;
  const token = decodeURIComponent(m.slice(COOKIE.length + 1));
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (typeof payload.email !== 'string') return null;
    return { email: payload.email };
  } catch { return null; }
}
export const sessionCookie = COOKIE;
