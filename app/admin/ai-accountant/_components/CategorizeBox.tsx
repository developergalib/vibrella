'use client';
import { useEffect, useState } from 'react';
import type { CategorySuggestion } from '../../../../lib/ai-accountant';
import { EXPENSE_CATEGORIES } from '../../../../lib/types';
import type { ExpenseCategory } from '../../../../lib/types';

/**
 * Auto-categorize demo + quick-add: type an expense note, get a rule-based
 * category suggestion, accept it, then save the expense.
 */
export default function CategorizeBox() {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!note.trim()) {
      setSuggestion(null);
      setAccepted(false);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/ai-accountant/suggest?note=${encodeURIComponent(note)}`)
        .then((r) => r.json())
        .then((j) => {
          setSuggestion(j);
          setAccepted(false);
        })
        .catch(() => setSuggestion(null));
    }, 300);
    return () => clearTimeout(t);
  }, [note]);

  function accept() {
    if (!suggestion) return;
    setCategory(suggestion.category);
    setAccepted(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        category,
        amount: Number(amount),
        note,
      }),
    });
    if (!res.ok) {
      setMsg('Failed to save — are you logged in?');
      return;
    }
    setMsg('Expense saved with category ' + category + '.');
    setNote('');
    setAmount('');
    setCategory('Other');
    setSuggestion(null);
    setAccepted(false);
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold">Auto-categorize expenses</h2>
      <p className="text-sm text-stone-500 mt-1">
        Type a note — e.g. “bKash ad”, “packaging boxes”, “Pathao delivery”, “serum stock” — and the
        accountant suggests a category. Try it, then save.
      </p>
      <form onSubmit={save} className="mt-4 space-y-3">
        <div>
          <label className="label">Expense note</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. bKash ad boost"
          />
        </div>
        {suggestion && (
          <div className="flex flex-wrap items-center gap-2 text-sm bg-blush-50 border border-blush-100 rounded-xl px-3 py-2.5">
            <span>
              Suggested: <b>{suggestion.category}</b> · {Math.round(suggestion.confidence * 100)}%
              confidence
              {suggestion.matchedKeyword ? ` (matched “${suggestion.matchedKeyword}”)` : ''}
            </span>
            {!accepted ? (
              <button type="button" className="btn-primary !py-1.5 !px-3 text-xs" onClick={accept}>
                Accept suggestion
              </button>
            ) : (
              <span className="text-green-700 font-semibold text-xs">✓ Accepted — category set.</span>
            )}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount (BDT)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn-primary">Save expense</button>
        {msg && <p className="text-sm text-green-700">{msg}</p>}
      </form>
    </div>
  );
}
