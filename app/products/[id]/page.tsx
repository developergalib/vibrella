'use client';
import { useEffect, useState } from 'react';
import type { Product } from '../../../lib/types';
import { formatBDT } from '../../../lib/format';
import { useCart } from '../../../components/Store';
export default function ProductPage({ params }: { params: { id: string } }) {
  const [p, setP] = useState<Product | null>(null);
  const { add } = useCart();
  useEffect(() => { fetch('/api/products').then((r) => r.json()).then((list: Product[]) => setP(list.find((x) => x.id === params.id) || null)); }, [params.id]);
  if (!p) return <div className="max-w-3xl mx-auto px-4 py-12">Loading…</div>;
  return (<div className="max-w-4xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8"><img src={p.image} alt={p.name} className="w-full rounded-2xl object-cover h-96" /><div><p className="text-xs uppercase tracking-widest text-blush-600 font-semibold">{p.category} • {p.sku}</p><h1 className="text-3xl font-bold mt-2">{p.name}</h1><p className="text-stone-600 mt-3">{p.description}</p><p className="mt-4 font-bold text-2xl">{formatBDT(p.salePrice ?? p.price)} {p.salePrice && <span className="text-stone-400 line-through text-base">{formatBDT(p.price)}</span>}</p><p className="text-sm text-stone-500 mt-1">{p.stock} in stock</p><button className="btn-primary mt-6 w-full" onClick={() => add(p)}>Add to Bag</button></div></div>);
}
