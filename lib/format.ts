export const STORE_NAME = 'Vibrella';
export const STORE_EMAIL = 'shop.vibrella@gmail.com';
export const CURRENCY = 'BDT';
export function formatBDT(n: number) { return `৳${n.toLocaleString('en-US')}`; }
export const PAYMENTS = [
  { id: 'COD', label: 'Cash on Delivery' },
  { id: 'bKash', label: 'bKash' },
  { id: 'Nagad', label: 'Nagad' },
  { id: 'Card', label: 'Card' },
] as const;
