'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadCart, cartCount } from './Store';

export default function Header() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setCount(cartCount(loadCart()));
    f(); window.addEventListener('vibrella-cart', f); window.addEventListener('storage', f);
    return () => { window.removeEventListener('vibrella-cart', f); window.removeEventListener('storage', f); };
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-blush-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Vibrella" className="h-9 w-auto" />
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/?cat=Skincare">Skincare</Link>
          <Link href="/?cat=Beauty">Beauty</Link>
          <Link href="/?cat=Perfume">Perfume</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button className="md:hidden btn-ghost" onClick={() => setOpen(!open)}>Menu</button>
          <Link href="/checkout" className="btn-primary relative">Bag {count > 0 && <span className="ml-1 bg-white text-blush-700 rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>}</Link>
        </div>
      </div>
      {open && <div className="md:hidden px-4 pb-3 flex gap-4 text-sm font-medium"><Link href="/?cat=Skincare">Skincare</Link><Link href="/?cat=Beauty">Beauty</Link><Link href="/?cat=Perfume">Perfume</Link><Link href="/admin">Admin</Link></div>}
    </header>
  );
}
