'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../lib/types';
import { formatBDT } from '../lib/format';
import { ProductCard, useCart } from '../components/Store';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('featured');
  const [quick, setQuick] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const { add, count } = useCart();
  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts).catch(() => {});
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get('cat'); if (c) setCat(c);
  }, []);
  const filtered = useMemo(() => {
    let list = products.filter((p) => (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    if (sort === 'price-desc') list = [...list].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    if (sort === 'featured') list = [...list].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    return list;
  }, [products, q, cat, sort]);
  const featured = products.find((p) => p.featured) ?? products[0];
  return (
    <div>
      <section className="bg-gradient-to-br from-blush-100 via-white to-blush-50">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-blush-600 font-bold tracking-widest text-xs uppercase">Beauty • Skincare • Perfume</p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mt-2">Glow that feels like you.</h1>
            <p className="text-stone-600 mt-3 max-w-md">Shop Vibrella — curated beauty, skincare and perfume, delivered across Bangladesh. Cash on Delivery, bKash, Nagad & Card.</p>
            <div className="flex gap-3 mt-6"><a href="#shop" className="btn-primary">Shop Best Sellers</a><Link href="/checkout" className="btn-ghost">View Bag ({count})</Link></div>
            <p className="text-xs text-stone-500 mt-4">Prices in BDT (৳) • Contact: shop.vibrella@gmail.com</p>
          </div>
          {featured && <div className="card overflow-hidden"><img src={featured.image} alt={featured.name} className="w-full h-72 object-cover" /><div className="p-4 flex items-center justify-between gap-3"><div><p className="font-bold">{featured.name}</p><p className="text-blush-700 font-bold">{formatBDT(featured.salePrice ?? featured.price)} <span className="text-stone-400 line-through text-sm">{featured.salePrice ? formatBDT(featured.price) : ''}</span></p></div><button className="btn-primary" onClick={() => add(featured)}>Add to Bag</button></div></div>}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4">
          {(['Skincare', 'Beauty', 'Perfume'] as const).map((c) => (
            <button key={c} onClick={() => setCat(c)} className="card p-5 text-left hover:shadow-md transition"><p className="font-bold text-lg">{c}</p><p className="text-sm text-stone-500">Shop {c} →</p></button>
          ))}
        </div>
      </section>

      <section id="shop" className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <h2 className="text-2xl font-bold">Shop</h2>
          <div className="flex flex-wrap gap-2">
            <input className="input !w-56" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input !w-40" value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option><option>Beauty</option><option>Skincare</option><option>Perfume</option></select>
            <select className="input !w-44" value={sort} onChange={(e) => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: Low → High</option><option value="price-desc">Price: High → Low</option></select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {filtered.map((p) => <ProductCard key={p.id} p={p} onAdd={(x) => add(x)} onQuick={(x) => { setQuick(x); setQty(1); }} />)}
        </div>
        {filtered.length === 0 && <p className="text-stone-500 mt-8">No products found. Try a different search or category.</p>}
      </section>

      {quick && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setQuick(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img src={quick.image} alt={quick.name} className="w-full h-64 object-cover" />
            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-blush-600 font-semibold">{quick.category} • {quick.sku}</p>
              <h3 className="text-xl font-bold mt-1">{quick.name}</h3>
              <p className="text-stone-600 mt-2 text-sm">{quick.description}</p>
              <p className="mt-3 font-bold text-lg">{formatBDT(quick.salePrice ?? quick.price)} {quick.salePrice && <span className="text-stone-400 line-through text-sm">{formatBDT(quick.price)}</span>}</p>
              <div className="flex items-center gap-3 mt-4">
                <label className="label">Qty</label>
                <input type="number" min={1} max={quick.stock} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="input !w-20" />
                <button className="btn-primary flex-1" onClick={() => { add(quick, qty); setQuick(null); }}>Add to Bag</button>
                <button className="btn-ghost" onClick={() => setQuick(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
