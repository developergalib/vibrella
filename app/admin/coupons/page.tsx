'use client';
import { useEffect, useState } from 'react';
import type { Coupon, CouponType } from '../../../lib/types';
import { formatBDT } from '../../../lib/format';
const empty = { code: '', type: 'percent' as CouponType, value: '', minOrder: '', expiry: '', usageLimit: '', active: true };
export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]); const [form, setForm] = useState<any>(empty); const [editing, setEditing] = useState<string | null>(null); const [msg, setMsg] = useState('');
  const load = () => fetch('/api/coupons').then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); const url = editing ? `/api/coupons/${editing}` : '/api/coupons'; const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const d = await r.json().catch(() => ({})); if (!r.ok) { setMsg(d.error || 'Failed — are you logged in?'); return; } setMsg(editing ? 'Updated.' : 'Coupon added.'); setForm(empty); setEditing(null); load(); }
  async function del(id: string) { if (!confirm('Delete this coupon?')) return; await fetch(`/api/coupons/${id}`, { method: 'DELETE' }); load(); }
  function edit(c: Coupon) { setEditing(c.id); setForm({ code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, expiry: c.expiry || '', usageLimit: c.usageLimit ?? '', active: c.active }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function toggle(c: Coupon) { await fetch(`/api/coupons/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }) }); load(); }
  return (<div className="max-w-7xl mx-auto px-4 py-8"><div className="flex justify-between"><h1 className="text-2xl font-bold">Coupons</h1><a href="/admin" className="underline text-sm">← Dashboard</a></div>
    <p className="text-sm text-stone-500 mt-1">Coupons apply at checkout. Percent = % off subtotal. Fixed = flat BDT off. Discount never exceeds the subtotal.</p>
    <form onSubmit={submit} className="card p-5 mt-6 grid md:grid-cols-2 gap-3">
      <div><label className="label">Code</label><input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VIBRELLA10" required /></div>
      <div><label className="label">Type</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percent">Percent (%)</option><option value="fixed">Fixed (BDT)</option></select></div>
      <div><label className="label">Value {form.type === 'percent' ? '(%)' : '(BDT)'}</label><input type="number" min={0} max={form.type === 'percent' ? 100 : undefined} className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
      <div><label className="label">Minimum Order (BDT)</label><input type="number" min={0} className="input" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="0 = no minimum" /></div>
      <div><label className="label">Expiry (optional)</label><input type="date" className="input" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} /></div>
      <div><label className="label">Usage Limit (optional)</label><input type="number" min={1} className="input" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Blank = unlimited" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
      <div className="flex gap-2"><button className="btn-primary">{editing ? 'Update Coupon' : 'Add Coupon'}</button>{editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}</div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
    </form>
    <div className="card mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Min Order</th><th className="p-3">Expiry</th><th className="p-3">Used</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{items.map((c) => (<tr key={c.id} className="border-b"><td className="p-3 font-bold">{c.code}</td><td className="p-3">{c.type === 'percent' ? `${c.value}%` : formatBDT(c.value)}</td><td className="p-3">{formatBDT(c.minOrder)}</td><td className="p-3">{c.expiry || '—'}</td><td className="p-3">{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td className="p-3"><button className="underline" onClick={() => toggle(c)}>{c.active ? 'Active' : 'Inactive'}</button></td><td className="p-3"><button className="underline" onClick={() => edit(c)}>Edit</button> <button className="underline text-red-600 ml-2" onClick={() => del(c.id)}>Delete</button></td></tr>))}</tbody></table>{items.length === 0 && <p className="p-4 text-stone-500">No coupons yet.</p>}</div>
  </div>);
}
