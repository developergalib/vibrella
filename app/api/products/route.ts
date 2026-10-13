import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
export async function GET() { return NextResponse.json(db.products.all()); }
export async function POST(req: Request) {
  const session = await (await import('../../../lib/auth')).readSession(req.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const items = db.products.all();
  const id = body.id || `p${Date.now()}`;
  const product = { id, name: body.name, category: body.category, price: Number(body.price), salePrice: body.salePrice ? Number(body.salePrice) : undefined, costPrice: body.costPrice !== undefined && body.costPrice !== '' ? Number(body.costPrice) : undefined, stock: Number(body.stock ?? 0), sku: body.sku || `VB-${id.toUpperCase()}`, image: body.image || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80', description: body.description || '', featured: !!body.featured };
  db.products.save([...items, product]);
  return NextResponse.json(product, { status: 201 });
}
