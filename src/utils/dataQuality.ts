import { PriceObservation, Product, SupermarketId } from '../types';

export const CHAIN_NAMES: Record<SupermarketId, string> = {
  coto: 'Coto', la_anonima: 'La Anónima', changomas: 'ChangoMás', vea: 'Vea',
  cooperativa_obrera: 'Cooperativa Obrera', yaguar: 'Yaguar', vital: 'Vital', diarco: 'Diarco', makro: 'Makro',
  jumbo: 'Jumbo'
};
// Retired from the public catalogue by product decision; historical IDs remain valid.
export const isActiveChain = (id: string) => id !== 'vea' && id !== 'diarco';
export const ACTIVE_CHAIN_NAMES = Object.fromEntries(Object.entries(CHAIN_NAMES).filter(([id]) => isActiveChain(id)));
export const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function mapSupermarketId(value: string): SupermarketId | undefined {
  const text = normalizeText(value).replace(/[-_]/g, '');
  return (Object.keys(CHAIN_NAMES) as SupermarketId[]).find(id => text.includes(id.replace(/_/g, '')) || (id === 'cooperativa_obrera' && text.includes('cooperativa')) || (id === 'la_anonima' && text.includes('anonima')));
}
export function priceIsUsable(observation: PriceObservation, now = Date.now()): boolean {
  // Historical imports must not bypass regional/quantity corrections.
  if (observation.supermarket_id === 'yaguar' && (observation.price_validation !== 'local_unit_price' || !observation.source_url?.startsWith('https://yaguar.com.ar/neuquen/'))) return false;
  if (observation.supermarket_id === 'coto' && observation.current_price < observation.regular_price) return false;
  if (observation.price_validation === 'pending') return false;
  const time = Date.parse(observation.query_date);
  const maxAgeMs = (observation.supermarket_id === 'makro' ? 7 * 24 : 72) * 3600 * 1000;
  return isActiveChain(observation.supermarket_id) && observation.is_verified && !observation.is_demo && Boolean(observation.branch_id) &&
    Number.isFinite(observation.current_price) && observation.current_price > 0 &&
    Number.isFinite(time) && time <= now && now - time <= maxAgeMs &&
    /^https:\/\//.test(observation.source_url) &&
    !/^https:\/\/(?:radar-precios-neuquen\.vercel\.app|supabase\.com)(?:\/|$)/.test(observation.source_url);
}
export const observationKey = (o: PriceObservation) => `${o.product_id}|${o.branch_id || o.branch_name}|${o.channel || 'unknown'}`;
export function mergePrices(...groups: PriceObservation[][]): PriceObservation[] {
  const result = new Map<string, PriceObservation>();
  for (const observation of groups.flat()) {
    const key = observationKey(observation), old = result.get(key);
    if (!old || (observation.is_verified && !old.is_verified) ||
      (observation.is_verified === old.is_verified && Date.parse(observation.query_date) > Date.parse(old.query_date))) result.set(key, observation);
  }
  return [...result.values()];
}
export function matchesProduct(product: Product, query: string) {
  const text = normalizeText(`${product.name} ${product.brand} ${product.category} ${product.ean || ''}`);
  return normalizeText(query).trim().split(/\s+/).every(word => text.includes(word));
}
export function productUnitPrice(price: number, product: Product) {
  let amount = product.net_content_number;
  let unit: string = product.unit_measure;
  if (unit === 'g') { amount /= 1000; unit = 'kg'; }
  if (unit === 'ml') { amount /= 1000; unit = 'litro'; }
  const known = Number.isFinite(amount) && amount > 0;
  return { price_per_unit: known ? price / amount : price, unit_label: unit === 'litro' ? '$ / L' : unit === 'kg' ? '$ / kg' : '$ / u' };
}
