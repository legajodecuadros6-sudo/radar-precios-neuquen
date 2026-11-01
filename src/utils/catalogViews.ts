import { Product, PriceObservation } from '../types';
import { priceIsUsable } from './dataQuality';
export const WHOLESALE_CHAINS = new Set(['makro', 'vital', 'diarco', 'yaguar']);
export function isRetailOffer(o: PriceObservation) {
  return priceIsUsable(o) && !WHOLESALE_CHAINS.has(o.supermarket_id) &&
    (o.min_quantity || 1) <= 1 && (o.quantity_multiple || 1) <= 1 && !o.promo_condition &&
    Boolean(o.promo_label) && Number.isFinite(o.regular_price) && o.regular_price > o.current_price;
}
export function catalogCategory(product: Product): Product['category'] {
  if (/sin alcohol|0[.,]0\s*%/i.test(product.name) && /^cerveza/i.test(product.name)) return 'Bebidas';
  if (/^(cerveza|cerv |vino|fernet|aperitivo|vodka|whisky|ron |gin |sidra|espumante)/i.test(product.name)) return 'Bebidas alcohólicas';
  if (/papas.*(?:lay.s|lays)|(?:lay.s|lays).*papas/i.test(product.name)) return 'Snacks';
  if (String(product.category) === 'Carnes') return 'Carnicería';
  if (String(product.category) === 'Lácteos') return 'Lácteos y Frescos';
  return product.category;
}
export function productImage(product: Product) {
  if (product.image_url && !product.image_url.includes('unsplash.com')) return product.image_url;
  return catalogCategory(product) === 'Carnicería' ? '/meat-placeholder.svg' : '/product-placeholder.svg';
}

export function selectCatalogView(products: Product[], observations: PriceObservation[], chain: string, mode: 'all' | 'wholesale' | 'offers') {
  const visibleObservations = observations.filter(o => priceIsUsable(o) && (chain === 'all' || o.supermarket_id === chain) && (mode === 'wholesale' ? WHOLESALE_CHAINS.has(o.supermarket_id) : mode === 'offers' ? isRetailOffer(o) : true));
  const ids = new Set(visibleObservations.map(o => o.product_id));
  return { observations: visibleObservations, products: chain === 'all' && mode === 'all' ? products : products.filter(p => ids.has(p.id)) };
}
