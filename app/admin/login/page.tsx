'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) { e.preventDefault(); setErr(''); setLoading(true); const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); setLoading(false); if (!r.ok) { setErr('Invalid email or password. Check ADMIN_EMAIL / ADMIN_PASSWORD_HASH env vars.'); return; } router.push('/admin'); }
  return (<div className="min-h-[70vh] flex items-center justify-center px-4"><form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-3"><img src="/logo.svg" alt="Vibrella" className="h-9" /><h1 className="text-xl font-bold">Admin Login</h1><p className="text-xs text-stone-500">Uses ADMIN_EMAIL + ADMIN_PASSWORD_HASH env vars only. No password is stored in code.</p><div><label className="label">Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" /></div><div><label className="label">Password</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" /></div>{err && <p className="text-red-600 text-sm">{err}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form></div>);
}
