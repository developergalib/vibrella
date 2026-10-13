'use client';
import { useEffect, useState } from 'react';
import type { Product } from '../../../lib/types';
import { formatBDT } from '../../../lib/format';
export default function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]); const [form, setForm] = useState<any>({ name: '', category: 'Beauty', price: '', salePrice: '', costPrice: '', stock: '', sku: '', image: '', description: '', featured: false });
  const [editing, setEditing] = useState<string | null>(null); const [msg, setMsg] = useState('');
  const load = () => fetch('/api/products').then((r) => r.json()).then(setItems);
  useEffect(() => { load(); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); const url = editing ? `/api/products/${editing}` : '/api/products'; const method = editing ? 'PUT' : 'POST'; const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (!r.ok) { setMsg('Failed — are you logged in?'); return; } setMsg(editing ? 'Updated.' : 'Product added.'); setForm({ name: '', category: 'Beauty', price: '', salePrice: '', costPrice: '', stock: '', sku: '', image: '', description: '', featured: false }); setEditing(null); load(); }
  async function del(id: string) { if (!confirm('Delete this product?')) return; await fetch(`/api/products/${id}`, { method: 'DELETE' }); load(); }
  function edit(p: Product) { setEditing(p.id); setForm({ name: p.name, category: p.category, price: p.price, salePrice: p.salePrice || '', costPrice: p.costPrice ?? '', stock: p.stock, sku: p.sku, image: p.image, description: p.description, featured: !!p.featured }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  return (<div className="max-w-7xl mx-auto px-4 py-8"><div className="flex justify-between"><h1 className="text-2xl font-bold">Products & Inventory</h1><a href="/admin" className="underline text-sm">← Dashboard</a></div>
    <form onSubmit={submit} className="card p-5 mt-6 grid md:grid-cols-2 gap-3">
      <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
      <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Beauty</option><option>Skincare</option><option>Perfume</option></select></div>
      <div><label className="label">Price (BDT)</label><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
      <div><label className="label">Buying Cost (BDT, for profit)</label><input type="number" min={0} className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="What you paid per unit" /></div>
      <div><label className="label">Sale Price (BDT, optional)</label><input type="number" className="input" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></div>
      <div><label className="label">Stock</label><input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
      <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="VB-BEA-001" /></div>
      <div className="md:col-span-2"><label className="label">Image URL</label><input className="input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" /></div>
      <div className="md:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured on homepage</label>
      <div className="flex gap-2"><button className="btn-primary">{editing ? 'Update Product' : 'Add Product'}</button>{editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm({ name: '', category: 'Beauty', price: '', salePrice: '', costPrice: '', stock: '', sku: '', image: '', description: '', featured: false }); }}>Cancel</button>}</div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
    </form>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">{items.map((p) => (<div key={p.id} className="card p-4"><img src={p.image} className="w-full h-40 object-cover rounded-xl" alt="" /><p className="font-bold mt-2">{p.name}</p><p className="text-sm text-stone-500">{p.category} • {p.sku} • Stock: {p.stock}</p><p className="font-bold">{formatBDT(p.salePrice ?? p.price)}</p><p className="text-xs text-stone-500">Cost: {p.costPrice !== undefined && p.costPrice !== null ? formatBDT(p.costPrice) : "not set"}</p><div className="flex gap-2 mt-3"><button className="btn-ghost" onClick={() => edit(p)}>Edit</button><button className="btn-ghost !text-red-600" onClick={() => del(p.id)}>Delete</button></div></div>))}</div>
  </div>);
}
