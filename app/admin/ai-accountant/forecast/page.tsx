import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession } from '../../../../lib/auth';
import { db } from '../../../../lib/db';
import { formatBDT } from '../../../../lib/format';
import { forecastMonth, stockForecast } from '../../../../lib/ai-accountant';

export default async function ForecastPage() {
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
  const f = forecastMonth(data, now);
  const stock = stockForecast(data.products, data.orders, now);
  const urgent = stock.filter((x) => x.daysLeft !== null && x.daysLeft < 14);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forecast</h1>
          <p className="text-sm text-stone-500 mt-1">
            Simple pace-based projection — last 30 days average × remaining days. Not a guarantee;
            a planning guide.
          </p>
        </div>
        <a href="/admin/ai-accountant" className="underline text-sm">
          ← AI Accountant
        </a>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="font-bold">At this pace — {f.monthLabel}</h2>
        <p className="text-sm text-stone-500 mt-1">{f.basis}</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="label">Revenue so far</p>
            <p className="text-2xl font-bold mt-1">{formatBDT(f.revenueSoFar)}</p>
            <p className="text-xs text-stone-500">
              {f.daysElapsed} of {f.daysInMonth} days · {f.daysRemaining} remaining
            </p>
          </div>
          <div>
            <p className="label">Projected revenue</p>
            <p className="text-2xl font-bold mt-1">{formatBDT(f.projectedRevenue)}</p>
            <p className="text-xs text-stone-500">
              Range {formatBDT(f.projectedRevenueLow)} – {formatBDT(f.projectedRevenueHigh)} (±15%)
            </p>
          </div>
          <div>
            <p className="label">Profit so far</p>
            <p className={`text-2xl font-bold mt-1 ${f.profitSoFar < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatBDT(f.profitSoFar)}
            </p>
            <p className="text-xs text-stone-500">Avg {formatBDT(f.avgDailyProfit)} / day</p>
          </div>
          <div>
            <p className="label">Projected profit</p>
            <p className={`text-2xl font-bold mt-1 ${f.projectedProfit < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatBDT(f.projectedProfit)}
            </p>
            <p className="text-xs text-stone-500">
              Range {formatBDT(f.projectedProfitLow)} – {formatBDT(f.projectedProfitHigh)} (±15%)
            </p>
          </div>
        </div>
        <p className="text-sm mt-4">
          Average daily revenue (last 30 days): <b>{formatBDT(f.avgDailyRevenue)}</b> · Average daily
          profit: <b>{formatBDT(f.avgDailyProfit)}</b>
        </p>
      </div>

      <div className="card p-5 mt-4 overflow-x-auto">
        <h2 className="font-bold">Stock forecast ({urgent.length} urgent)</h2>
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
                <th className="p-2">Category</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Avg / day</th>
                <th className="p-2">Sold (30d)</th>
                <th className="p-2">Days left</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((x) => (
                <tr key={x.product.id} className="border-b">
                  <td className="p-2">{x.product.name}</td>
                  <td className="p-2">{x.product.category}</td>
                  <td className="p-2">{x.product.stock}</td>
                  <td className="p-2">{x.avgDailyUnits.toFixed(2)}</td>
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
