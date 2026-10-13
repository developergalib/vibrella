import './globals.css';
import Header from '../components/Header';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Vibrella — Beauty, Skincare & Perfume', description: 'Vibrella — Glow that feels like you. Beauty, Skincare & Perfume in Bangladesh. Prices in BDT.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Header /><main>{children}</main><footer className="mt-16 border-t border-blush-100 bg-white"><div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-stone-600"><div><img src="/logo.svg" alt="Vibrella" className="h-8 w-auto" /><p className="mt-2">Beauty • Skincare • Perfume — Glow that feels like you.</p><p>Dhaka, Bangladesh</p></div><div><p className="font-semibold text-ink">Contact</p><p>shop.vibrella@gmail.com</p><p>Cash on Delivery • bKash • Nagad • Card</p><Link2 /></div></div><p className="text-center text-xs pb-6 text-stone-400">© {new Date().getFullYear()} Vibrella. Prices in BDT (৳).</p></footer></body></html>);
}
function Link2() { return <a href="/admin" className="underline">Admin</a>; }
