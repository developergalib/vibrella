'use client';
import { useEffect, useState } from 'react';
import type { IncomeEntry } from '../../../../lib/types';
import { formatBDT } from '../../../../lib/format';
const empty = { date: new Date().toISOString().slice(0, 10), source: '', amount: '', note: '', payment: '', relatedOrderId: '' };
export default function IncomesPage() {
  const [items, setItems] = useState<IncomeEntry[]>([]); const [form, setForm] = useState<any>(empty); const [editing, setEditing] = useState<string | null>(null); const [msg, setMsg] = useState('');
  const load = () => fetch('/api/incomes').then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); const url = editing ? `/api/incomes/${editing}` : '/api/incomes'; const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (!r.ok) { setMsg('Failed — are you logged in?'); return; } setMsg(editing ? 'Updated.' : 'Income added.'); setForm(empty); setEditing(null); load(); }
  async function del(id: string) { if (!confirm('Delete this income?')) return; await fetch(`/api/incomes/${id}`, { method: 'DELETE' }); load(); }
  function edit(x: IncomeEntry) { setEditing(x.id); setForm({ date: x.date, source: x.source, amount: x.amount, note: x.note, payment: x.payment || '', relatedOrderId: x.relatedOrderId || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const total = items.reduce((s, e) => s + e.amount, 0);
  return (<div className="max-w-7xl mx-auto px-4 py-8"><div className="flex justify-between"><h1 className="text-2xl font-bold">Manual Income</h1><a href="/admin/finance" className="underline text-sm">← Finance</a></div>
    <p className="text-sm text-stone-500 mt-1">Order revenue is automatic — use this only for income outside orders (e.g. manual sale, delivery charge collected separately). Total manual income: <b>{formatBDT(total)}</b>.</p>
    <form onSubmit={submit} className="card p-5 mt-6 grid md:grid-cols-2 gap-3">
      <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
      <div><label className="label">Source</label><input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Manual sale" required /></div>
      <div><label className="label">Amount (BDT)</label><input type="number" min={0} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
      <div><label className="label">Payment</label><select className="input" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}><option value="">—</option><option>COD</option><option>bKash</option><option>Nagad</option><option>Card</option></select></div>
      <div><label className="label">Note</label><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
      <div><label className="label">Related Order ID (optional)</label><input className="input" value={form.relatedOrderId} onChange={(e) => setForm({ ...form, relatedOrderId: e.target.value })} placeholder="VB-XXXXXX" /></div>
      <div className="flex gap-2"><button className="btn-primary">{editing ? 'Update Income' : 'Add Income'}</button>{editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}</div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
    </form>
    <div className="card mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-3">Date</th><th className="p-3">Source</th><th className="p-3">Note</th><th className="p-3">Amount</th><th className="p-3"></th></tr></thead><tbody>{items.map((x) => (<tr key={x.id} className="border-b"><td className="p-3">{x.date}</td><td className="p-3">{x.source}{x.payment ? <span className="text-xs text-stone-500 block">{x.payment}</span> : null}</td><td className="p-3">{x.note}</td><td className="p-3 font-semibold">{formatBDT(x.amount)}</td><td className="p-3"><button className="underline" onClick={() => edit(x)}>Edit</button> <button className="underline text-red-600 ml-2" onClick={() => del(x.id)}>Delete</button></td></tr>))}</tbody></table>{items.length === 0 && <p className="p-4 text-stone-500">No manual income yet.</p>}</div>
  </div>);
}
