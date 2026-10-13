'use client';
import { useEffect, useState } from 'react';
import type { Product } from '../lib/types';
import { formatBDT } from '../lib/format';

export type CartItem = { product: Product; qty: number };
const KEY = 'vibrella_cart_v1';
export function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveCart(items: CartItem[]) { localStorage.setItem(KEY, JSON.stringify(items)); }
export function cartCount(items: CartItem[]) { return items.reduce((s, i) => s + i.qty, 0); }
export function cartSubtotal(items: CartItem[]) { return items.reduce((s, i) => s + i.qty * (i.product.salePrice ?? i.product.price), 0); }

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { setItems(loadCart()); }, []);
  const update = (next: CartItem[]) => { setItems(next); saveCart(next); window.dispatchEvent(new Event('vibrella-cart')); };
  const add = (p: Product, qty = 1) => {
    const cur = loadCart();
    const ex = cur.find((i) => i.product.id === p.id);
    const next = ex ? cur.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + qty } : i)) : [...cur, { product: p, qty }];
    update(next);
  };
  const remove = (id: string) => update(loadCart().filter((i) => i.product.id !== id));
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) return remove(id);
    update(loadCart().map((i) => (i.product.id === id ? { ...i, qty } : i)));
  };
  const clear = () => update([]);
  return { items, add, remove, setQty, clear, count: cartCount(items), subtotal: cartSubtotal(items) };
}

export function ProductCard({ p, onAdd, onQuick }: { p: Product; onAdd: (p: Product) => void; onQuick: (p: Product) => void }) {
  const price = p.salePrice ?? p.price;
  return (
    <div className="card overflow-hidden group">
      <button onClick={() => onQuick(p)} className="block w-full text-left">
        <img src={p.image} alt={p.name} className="w-full h-56 object-cover group-hover:scale-[1.03] transition" loading="lazy" />
      </button>
      <div className="p-4">
        <div className="text-[11px] uppercase tracking-widest text-blush-600 font-semibold">{p.category}</div>
        <button onClick={() => onQuick(p)} className="font-semibold leading-snug mt-1 text-left hover:text-blush-700">{p.name}</button>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold text-lg">{formatBDT(price)}</span>
          {p.salePrice && <span className="text-sm text-stone-400 line-through">{formatBDT(p.price)}</span>}
        </div>
        <div className="text-xs text-stone-500 mt-1">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</div>
        <button disabled={p.stock <= 0} onClick={() => onAdd(p)} className="btn-primary w-full mt-3 disabled:opacity-40">Add to Bag</button>
      </div>
    </div>
  );
}
