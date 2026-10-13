'use client';
import { useState } from 'react';
import type { DailySummary } from '../../../../lib/ai-accountant';
import { formatBDT } from '../../../../lib/format';

export default function DailySummaryCard({ summary }: { summary: DailySummary }) {
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  return (
    <div className="card p-5 bg-gradient-to-br from-blush-50 to-white">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <p className="label">Daily summary — {summary.dateLabel}</p>
          <p className="text-lg font-semibold mt-2 leading-snug">
            {lang === 'en' ? summary.english : summary.bangla}
          </p>
        </div>
        <div className="flex rounded-full border border-blush-200 overflow-hidden text-xs font-semibold shrink-0">
          <button
            type="button"
            className={`px-3 py-1.5 ${lang === 'en' ? 'bg-blush-600 text-white' : 'bg-white'}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 ${lang === 'bn' ? 'bg-blush-600 text-white' : 'bg-white'}`}
            onClick={() => setLang('bn')}
          >
            বাংলা
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
        <div>
          <p className="text-stone-500 text-xs">Revenue today</p>
          <p className="font-bold">{formatBDT(summary.revenue)}</p>
        </div>
        <div>
          <p className="text-stone-500 text-xs">Orders today</p>
          <p className="font-bold">{summary.orderCount}</p>
        </div>
        <div>
          <p className="text-stone-500 text-xs">Profit today</p>
          <p className={`font-bold ${summary.profit < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {formatBDT(summary.profit)}
          </p>
        </div>
      </div>
    </div>
  );
}
