# Vibrella — eCommerce + Admin Panel (Phase 1 + Phase 2 + Phase 3)

Beauty, Skincare & Perfume store for Bangladesh. Prices in BDT (৳). Contact: shop.vibrella@gmail.com.

## What is built (Phase 1)

**Public store (`/`)**
- Hero, 3 collections (Beauty / Skincare / Perfume), product grid with search, category filter, price sort
- Product quick-view, product detail page, cart (localStorage), checkout (name/phone/address + COD / bKash / Nagad / Card, coupon code, "Where did you find us?" channel)
- Order confirmation with reference like `VB-XXXXXX` + email draft to shop.vibrella@gmail.com
- 9 starter products seeded in `data/products.json` — swap for real inventory

**Admin (`/admin`)**
- Login at `/admin/login` — env-based only (see Security below)
- Dashboard: revenue, net profit, expenses this month, orders, low-stock alerts, recent orders
- Products & Inventory: add / edit / delete, price, sale price, **buying cost**, stock, SKU, image URL, featured
- Orders: list, status (New → Confirmed → Packed → Shipped → Delivered / Cancelled / Returned), order detail, tracking number, channel, coupon, per-order costs, payment received flag
- Customers: auto-created from checkout, order count, total spent, last order
- Invoice Print: branded Vibrella invoice at `/admin/invoice/[id]` — Print / Save as PDF

**Data (Phase 1)**
- JSON files in `data/`: `products.json`, `orders.json`, `customers.json`
- Works for local dev / demo. On Vercel the filesystem is ephemeral — see “Switching to Postgres”.

## What is built (Phase 2) — Finance + Profit Calculator + Analytics + Coupons

**Finance (`/admin/finance`)**
- Expenses CRUD (`/admin/finance/expenses`): date, category (Product Cost / Packaging / Delivery / Ads FB / Ads TikTok / Salary / Shop / Other), amount BDT, note, receipt URL, related order/product. Stored in `data/expenses.json`.
- Manual Income CRUD (`/admin/finance/incomes`): income outside orders (manual sale, delivery charge collected). Stored in `data/incomes.json`. Order revenue is automatic — do not re-enter it here.
- Finance Overview: total revenue, total costs, net profit, expenses by category, payment received vs pending (COD / bKash / Nagad / Card).
- Cash-flow rule: Net profit = Revenue − Product costs − Order costs (packaging + delivery + payment fees) − Manual expenses + Manual income. Manual expenses never double-count per-order costs.

**Profit Calculator (`/admin/finance/profit`)**
- Formula shown in the UI: **Profit = Selling total − Product costs − Packaging − Delivery cost − Payment fee − Coupon discount**
- Per-product profit: (price − buying cost) × units sold, total profit, margin %. Products without a buying cost are flagged "cost not set" and treated as ৳0 cost.
- Per-order profit table + Download CSV profit report.
- Set buying cost in Products. Set per-order packaging / delivery / payment fee in Orders → View → Save Costs & Payment.

**Analytics (`/admin/analytics`)**
- Revenue, average order value, order count, repeat customer rate.
- Sales chart (last 14 days or months), sales by category, sales by channel (Website / Instagram / Facebook / TikTok / Other — set at checkout), best sellers, slowest sellers.
- Download Orders CSV.

**Coupons (`/admin/coupons`)**
- CRUD: code (e.g. `VIBRELLA10`), type % or fixed BDT, value, min order, expiry, usage limit, active toggle, usage count.
- Checkout: coupon code input → validates via `/api/coupons/validate` → applies discount, shows discounted total. On a successful order the coupon usage count increments. Discount never exceeds the subtotal.
- Seeded example: `VIBRELLA10` — 10% off, min ৳1,000, expires 2026-12-31, limit 100 uses.

## Security — Admin password

**NEVER put a real password in code, files, or commits.**
Admin auth uses env vars only:

- `ADMIN_EMAIL` — the admin login email
- `ADMIN_PASSWORD_HASH` — bcrypt hash of the admin password (NOT the password itself)
- `SESSION_SECRET` — random secret for the session cookie

### Set up admin login (local + Vercel)

1. Copy env template:
   ```bash
   cp .env.example .env.local
   ```
2. Generate a hash (password input is hidden, only the hash is printed):
   ```bash
   npm run hash
   ```
   Enter a new, unique password for Vibrella admin (at least 10 chars). Copy ONLY the hash output.
3. In `.env.local` set:
   ```
   ADMIN_EMAIL=shop.vibrella@gmail.com
   ADMIN_PASSWORD_HASH=<paste hash only>
   SESSION_SECRET=<random 64-char hex>
   ```
   Generate SESSION_SECRET with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. In **Vercel Dashboard → Project → Settings → Environment Variables**, set the same three vars for Production (and Preview if you want). Redeploy after changing them.
5. Log in at `/admin/login` with the email + the password you typed in step 2. The app compares it against the hash — the plain password is never stored.

If a password was ever shared in chat / email, change it and re-generate the hash.

## Run locally

```bash
npm install
npm run dev
# Store: http://localhost:3000
# Admin: http://localhost:3000/admin/login
```

## Deploy to Vercel

1. Push this folder to GitHub:
   ```bash
   git init && git add . && git commit -m "Vibrella Phase 1"
   git branch -M main
   git remote add origin https://github.com/<you>/vibrella.git
   git push -u origin main
   ```
   (`.gitignore` already excludes `.env`, `.env.local`, `.next`, `node_modules`.)
2. In Vercel: **Add New → Project → Import** the GitHub repo. Framework: Next.js (auto-detected). Root directory: this folder if it is not the repo root.
3. Set Environment Variables in Vercel (Production): `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`. Optional: `DATABASE_URL` (see below).
4. Deploy. Your store is live at `https://<project>.vercel.app`. Add a custom domain in Vercel → Domains when ready.
5. For Instagram / bio link: use the Vercel URL, not the temporary Muse preview link.

## Switching to Postgres (Supabase) for production

Phase 1 JSON storage does NOT persist reliably on Vercel serverless.
For real orders, migrate `lib/db.ts` to Prisma + Postgres:

1. In Supabase: create project → copy Postgres connection string → set `DATABASE_URL` in Vercel.
2. Add Prisma: `npm i prisma @prisma/client`, `npx prisma init`, define `Product`, `Order`, `Customer`, `Expense`, `IncomeEntry`, `Coupon` models matching `lib/types.ts`, `npx prisma migrate deploy`.
3. Replace the `db` functions in `lib/db.ts` with Prisma calls (same function names). API routes and admin pages do not need to change.
4. Keep `data/*.json` as seed data for the first import.

## What is built (Phase 3) — AI Accountant (works offline, NO AI key needed)

All Phase 3 features are **rule-based and work without any AI API key**. Insights are computed locally from your existing orders / expenses / incomes / products / coupons, so every number is reproducible. Logic lives in `lib/ai-accountant.ts`.

**AI Accountant (`/admin/ai-accountant`)**
- **Daily summary card** in plain English, with an English / বাংলা toggle: “Today you made ৳X profit on N orders. Top cost was Y.”
- **Ask in plain words**: type e.g. “How much profit on perfume last month?”, “What is my best seller?”, “How much did I spend on ads?” — the question parser understands profit, revenue, expense, best/worst seller, category (Beauty / Skincare / Perfume), channel (Website / Instagram / Facebook / TikTok), and period (today / yesterday / this week / last week / this month / last month / all time), and answers with numbers + a small table. 6 suggested questions as chips. API: `GET /api/ai-accountant/ask?q=…`.
- **Auto-categorize expenses**: type a note and get a category suggestion with confidence + **Accept suggestion** button — e.g. “bKash ad” → Ads FB, “packaging boxes” → Packaging, “Pathao delivery” → Delivery, “serum stock” → Product Cost. Same suggestion appears inline on the Expenses form. API: `GET /api/ai-accountant/suggest?note=…`.

**Forecasting (`/admin/ai-accountant/forecast`, plus an “At this pace” card on the AI Accountant page)**
- End-of-month revenue/profit projection: average daily revenue/profit over the last 30 days × remaining days, shown with a ±15% range.
- Stock forecast: for each product, days-left = stock ÷ average daily units sold (last 30 days). Flagged “Will run out in X days” when under 14 days.

**Smart Alerts (on the AI Accountant page + top 3 on the admin dashboard)**
- Low stock, stock will run out soon, delivery cost spike (>20% vs prior week), profit margin < 10% on any product, COD pending > ৳5,000, coupon expiring within 7 days, dead stock (no sales in 30 days).

**Monthly Report (`/admin/ai-accountant/report`)**
- P&L for a selected month: revenue, COGS, packaging, delivery, ads, other expenses, net profit — plus this month vs last month comparison, **Download CSV** and **Print**.

**Optional external AI hook (no key needed)**
- `lib/ai-accountant.ts` exports `askExternalAI()`, which reads `OPENAI_API_KEY` / `AI_PROVIDER` / `AI_MODEL` from env **only if present** and otherwise returns `{ used: false }` so callers fall back to the local rules. The key is never stored, logged, or committed. To enable later, set `OPENAI_API_KEY` in `.env.local` / Vercel env vars — nothing else changes, and all AI features keep working without it.

## What is NOT in Phase 3 (future)

- Real payment gateway checkout (currently COD / bKash / Nagad / Card as payment preference + email order)
- Image upload to storage (currently image URL field — paste an image link)
- Multi-staff roles / 2FA

## Project structure

```
app/                 Store + Admin pages (App Router)
app/api/             Products, Orders, Auth, Expenses, Incomes, Coupons (+ validate), Customers APIs
components/          Header, Store (cart + ProductCard)
lib/                 types, db (JSON), auth (env-based), format, finance (profit / cash-flow / analytics helpers), ai-accountant (Phase 3: Q&A, categorize, forecast, alerts, P&L, optional AI hook)
data/                products.json, orders.json, customers.json, expenses.json, incomes.json, coupons.json (seed)
public/logo.svg      Vibrella wordmark (replace with high-res logo file when ready)
scripts/generate-hash.mjs  Secure bcrypt hash generator
```

## Notes

- Prices are BDT throughout, formatted with `৳` and thousand separators.
- Logo: `public/logo.svg` is a text placeholder in Vibrella pink. Replace it with the high-res Vibrella logo file (keep the same filename) when ready.
- Products: starter lineup only — replace `data/products.json` with real products, prices, and photos before launch.
