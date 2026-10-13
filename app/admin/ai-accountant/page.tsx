import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { formatBDT } from '../../../lib/format';
import {
  dailySummary,
  forecastMonth,
  generateAlerts,
  stockForecast,
} from '../../../lib/ai-accountant';
import AskAccountant from './_components/AskAccountant';
import CategorizeBox from './_components/CategorizeBox';
import DailySummaryCard from './_components/DailySummaryCard';

const severityStyle: Record<string, string> = {
  critical: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
};

export default async function AIAccountantPage() {
  const s = await readSession(cookies().toString());
  if (!s) redirect('/admin/login');
  const data = {
    orders: db.orders.all(),
    products: db.products.all(),
    expenses: db.expenses.all(),
    incomes: db.incomes.all(),
    coupons: db.coupons.all(),
  };
  const now = new Date();
  const summary = dailySummary(data, now);
  const alerts = generateAlerts(data, now);
  const forecast = forecastMonth(data, now);
  const stock = stockForecast(data.products, data.orders, now);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">AI Accountant</h1>
          <p className="text-sm text-stone-500 mt-1">
            Plain-language answers, forecasts &amp; alerts from your real data. Works offline — no AI
            key needed.
          </p>
        </div>
        <a href="/admin" className="underline text-sm no-print">
          ← Dashboard
        </a>
      </div>

      <div className="mt-6">
        <DailySummaryCard summary={summary} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <AskAccountant />
        <CategorizeBox />
      </div>

      {/* Forecast — "At this pace" card */}
      <div id="forecast" className="card p-5 mt-4">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="font-bold">Forecast — At this pace ({forecast.monthLabel})</h2>
          <a href="/admin/ai-accountant/forecast" className="underline text-sm">
            Full forecast →
          </a>
        </div>
        <p className="text-sm text-stone-500 mt-1">{forecast.basis}</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="label">Revenue so far</p>
            <p className="text-xl font-bold mt-1">{formatBDT(forecast.revenueSoFar)}</p>
            <p className="text-xs text-stone-500">
              {forecast.daysElapsed} of {forecast.daysInMonth} days · {forecast.daysRemaining} left
            </p>
          </div>
          <div>
            <p className="label">Projected revenue</p>
            <p className="text-xl font-bold mt-1">{formatBDT(forecast.projectedRevenue)}</p>
            <p className="text-xs text-stone-500">
              Range {formatBDT(forecast.projectedRevenueLow)} – {formatBDT(forecast.projectedRevenueHigh)}
            </p>
          </div>
          <div>
            <p className="label">Profit so far</p>
            <p className={`text-xl font-bold mt-1 ${forecast.profitSoFar < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatBDT(forecast.profitSoFar)}
            </p>
            <p className="text-xs text-stone-500">Avg {formatBDT(forecast.avgDailyProfit)} / day</p>
          </div>
          <div>
            <p className="label">Projected profit</p>
            <p className={`text-xl font-bold mt-1 ${forecast.projectedProfit < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatBDT(forecast.projectedProfit)}
            </p>
            <p className="text-xs text-stone-500">
              Range {formatBDT(forecast.projectedProfitLow)} – {formatBDT(forecast.projectedProfitHigh)}
            </p>
          </div>
        </div>
      </div>

      {/* Smart alerts */}
      <div className="card p-5 mt-4">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="font-bold">Smart Alerts ({alerts.length})</h2>
          <a href="/admin/ai-accountant/report" className="underline text-sm">
            Monthly report →
          </a>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-stone-500 mt-2">
            All clear — no low stock, cost spikes, margin, pending-payment, coupon or dead-stock issues
            detected. 🎉
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alerts.map((a) => (
              <li key={a.id} className={`border rounded-xl px-4 py-3 text-sm ${severityStyle[a.severity]}`}>
                <span className="font-bold">{a.title}:</span> {a.message}{' '}
                <a href={a.link} className="underline font-medium">
                  Fix →
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stock forecast */}
      <div className="card p-5 mt-4 overflow-x-auto">
        <h2 className="font-bold">Stock forecast</h2>
        <p className="text-sm text-stone-500 mt-1">
          Days left = stock ÷ average daily units sold (last 30 days). Flagged when under 14 days.
        </p>
        {stock.length === 0 ? (
          <p className="text-sm text-stone-500 mt-2">No products yet.</p>
        ) : (
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Product</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Sold (30d)</th>
                <th className="p-2">Days left</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((x) => (
                <tr key={x.product.id} className="border-b">
                  <td className="p-2">{x.product.name}</td>
                  <td className="p-2">{x.product.stock}</td>
                  <td className="p-2">{x.unitsSold30d}</td>
                  <td className="p-2">
                    {x.daysLeft === null ? (
                      <span className="text-stone-500">No recent sales</span>
                    ) : x.daysLeft < 14 ? (
                      <b className="text-red-600">Will run out in {x.daysLeft} days</b>
                    ) : (
                      `~${x.daysLeft} days`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
