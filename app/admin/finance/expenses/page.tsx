'use client';
import { useEffect, useState } from 'react';
import type { Expense, ExpenseCategory } from '../../../../lib/types';
import { EXPENSE_CATEGORIES } from '../../../../lib/types';
import { formatBDT } from '../../../../lib/format';
const empty = { date: new Date().toISOString().slice(0, 10), category: 'Other' as ExpenseCategory, amount: '', note: '', receiptUrl: '', relatedOrderId: '', relatedProductId: '' };
export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]); const [form, setForm] = useState<any>(empty); const [editing, setEditing] = useState<string | null>(null); const [msg, setMsg] = useState('');
  const [suggestion, setSuggestion] = useState<{ category: ExpenseCategory; confidence: number; matchedKeyword: string | null } | null>(null);
  // Phase 3: auto-categorize from the note text (rule-based, no AI key needed).
  useEffect(() => {
    if (!form.note?.trim()) { setSuggestion(null); return; }
    const t = setTimeout(() => {
      fetch(`/api/ai-accountant/suggest?note=${encodeURIComponent(form.note)}`).then((r) => r.json()).then(setSuggestion).catch(() => setSuggestion(null));
    }, 300);
    return () => clearTimeout(t);
  }, [form.note]);
  const load = () => fetch('/api/expenses').then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); const url = editing ? `/api/expenses/${editing}` : '/api/expenses'; const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (!r.ok) { setMsg('Failed — are you logged in?'); return; } setMsg(editing ? 'Updated.' : 'Expense added.'); setForm(empty); setEditing(null); load(); }
  async function del(id: string) { if (!confirm('Delete this expense?')) return; await fetch(`/api/expenses/${id}`, { method: 'DELETE' }); load(); }
  function edit(x: Expense) { setEditing(x.id); setForm({ date: x.date, category: x.category, amount: x.amount, note: x.note, receiptUrl: x.receiptUrl || '', relatedOrderId: x.relatedOrderId || '', relatedProductId: x.relatedProductId || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const total = items.reduce((s, e) => s + e.amount, 0);
  return (<div className="max-w-7xl mx-auto px-4 py-8"><div className="flex justify-between"><h1 className="text-2xl font-bold">Expenses</h1><a href="/admin/finance" className="underline text-sm">← Finance</a></div>
    <p className="text-sm text-stone-500 mt-1">Total manual expenses: <b>{formatBDT(total)}</b> (order product / delivery / packaging costs are tracked per-order and are NOT double-counted here).</p>
    <form onSubmit={submit} className="card p-5 mt-6 grid md:grid-cols-2 gap-3">
      <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
      <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><label className="label">Amount (BDT)</label><input type="number" min={0} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
      <div><label className="label">Note</label><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. FB ad boost, packaging boxes" />
        {suggestion && suggestion.category !== form.category && (
          <div className="flex flex-wrap items-center gap-2 text-xs mt-2 bg-blush-50 border border-blush-100 rounded-lg px-2.5 py-2">
            <span>Suggested: <b>{suggestion.category}</b> ({Math.round(suggestion.confidence * 100)}%)</span>
            <button type="button" className="btn-primary !py-1 !px-2.5 !text-xs" onClick={() => setForm({ ...form, category: suggestion.category })}>Accept suggestion</button>
          </div>
        )}
      </div>
      <div><label className="label">Receipt URL (optional)</label><input className="input" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://… photo of receipt" /></div>
      <div><label className="label">Related Order ID (optional)</label><input className="input" value={form.relatedOrderId} onChange={(e) => setForm({ ...form, relatedOrderId: e.target.value })} placeholder="VB-XXXXXX" /></div>
      <div className="md:col-span-2"><label className="label">Related Product ID (optional)</label><input className="input" value={form.relatedProductId} onChange={(e) => setForm({ ...form, relatedProductId: e.target.value })} placeholder="Product ID" /></div>
      <div className="flex gap-2"><button className="btn-primary">{editing ? 'Update Expense' : 'Add Expense'}</button>{editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}</div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
    </form>
    <div className="card mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Note</th><th className="p-3">Amount</th><th className="p-3"></th></tr></thead><tbody>{items.map((x) => (<tr key={x.id} className="border-b"><td className="p-3">{x.date}</td><td className="p-3">{x.category}</td><td className="p-3">{x.note}{x.receiptUrl ? <> <a href={x.receiptUrl} target="_blank" className="underline">Receipt</a></> : null}{x.relatedOrderId ? <span className="text-xs text-stone-500 block">Order {x.relatedOrderId}</span> : null}</td><td className="p-3 font-semibold">{formatBDT(x.amount)}</td><td className="p-3"><button className="underline" onClick={() => edit(x)}>Edit</button> <button className="underline text-red-600 ml-2" onClick={() => del(x.id)}>Delete</button></td></tr>))}</tbody></table>{items.length === 0 && <p className="p-4 text-stone-500">No expenses yet.</p>}</div>
  </div>);
}
