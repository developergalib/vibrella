'use client';
import { useState } from 'react';
import { SUGGESTED_QUESTIONS } from '../../../../lib/ai-accountant';
import type { QAAnswer } from '../../../../lib/ai-accountant';

export default function AskAccountant() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QAAnswer | null>(null);
  const [error, setError] = useState('');

  async function ask(question: string) {
    const query = question.trim();
    if (!query) return;
    setQ(query);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ai-accountant/ask?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not answer that.');
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not answer that.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold">Ask in plain words</h2>
      <p className="text-sm text-stone-500 mt-1">
        Type like you would talk — e.g. “How much profit on perfume last month?” No AI key needed; answers come from your real orders &amp; expenses.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2 mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input
          className="input flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="How much profit did I make this month?"
          aria-label="Ask the AI Accountant"
        />
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTED_QUESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="text-xs bg-blush-50 border border-blush-200 hover:border-blush-400 rounded-full px-3 py-1.5"
            onClick={() => ask(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      {result && (
        <div className="mt-5 border-t border-blush-100 pt-4">
          <p className="label">{result.title}</p>
          <p className="mt-1 font-medium">{result.answer}</p>
          {result.rows.length > 0 && (
            <table className="w-full text-sm mt-3">
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.label} className="border-b border-stone-100">
                    <td className="py-1.5 pr-3 text-stone-600">{r.label}</td>
                    <td className="py-1.5 text-right font-semibold">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {result.note && <p className="text-xs text-stone-500 mt-3">{result.note}</p>}
        </div>
      )}
    </div>
  );
}
