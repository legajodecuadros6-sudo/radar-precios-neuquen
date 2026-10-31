import { BasketItem, PriceObservation, BasketStoreTotal, SplitBasketOptimization, SplitBasketOptimalItem, SupermarketBranch } from '../types';
import { SUPERMARKETS_NEUQUEN } from '../data/supermarkets';
import { priceIsUsable, CHAIN_NAMES } from './dataQuality';

export interface BasketAnalysisResult {
  single_trip: BasketStoreTotal[];
  split_trip: SplitBasketOptimization;
  cheapest_single_store?: BasketStoreTotal;
  most_expensive_single_store?: BasketStoreTotal;
  overall_potential_savings: number;
}
export function calculateBasketOptimization(items: BasketItem[], observations: PriceObservation[]): BasketAnalysisResult {
  const eligible = observations.filter(o => priceIsUsable(o) && !o.promo_condition);
  const key = (o: PriceObservation) => `${o.branch_id}|${o.channel || 'unknown'}`;
  const storeFor = (o: PriceObservation): SupermarketBranch => {
    const known = SUPERMARKETS_NEUQUEN.find(s => s.id === o.branch_id);
    return { id: key(o), supermarket_id: o.supermarket_id, name: o.branch_name,
      brand_name: `${CHAIN_NAMES[o.supermarket_id]}${o.channel === 'online' ? ' · Online' : ''}`,
      type: ['makro','yaguar','diarco','vital'].includes(o.supermarket_id) ? 'mayorista' : 'minorista',
      address: o.branch_address || known?.address || 'Dirección pendiente de confirmar', city: 'Neuquén', postal_code: '8300',
      lat: known?.lat || 0, lng: known?.lng || 0, opening_hours: known?.opening_hours || '',
      logo_color: known?.logo_color || '#334155', badge_bg: known?.badge_bg || '', badge_text: known?.badge_text || '',
      has_ecommerce: o.channel === 'online', ecommerce_url: known?.ecommerce_url };
  };
  const bestFor = (item: BasketItem, storeKey?: string) => eligible
    .filter(o => o.product_id === item.product.id && (o.min_quantity || 1) <= item.quantity && (!storeKey || key(o) === storeKey))
    .sort((a,b) => a.current_price - b.current_price)[0];
  const stores = new Map(eligible.map(o => [key(o), storeFor(o)]));
  const single: BasketStoreTotal[] = [...stores].map(([storeKey, supermarket]) => {
    let total = 0;
    const missing = items.filter(item => {
      const obs = bestFor(item, storeKey);
      if (!obs) return true;
      total += obs.current_price * item.quantity;
      return false;
    }).map(item => item.product);
    return { supermarket, total, items_available: items.length-missing.length, items_total: items.length, missing_products: missing, savings_vs_most_expensive: 0 };
  }).filter(row => row.items_available > 0).sort((a,b) => b.items_available-a.items_available || a.total-b.total);
  const complete = single.filter(row => row.items_available === items.length);
  const cheapest = complete[0], mostExpensive = complete[complete.length-1];
  for (const row of complete) row.savings_vs_most_expensive = (mostExpensive?.total || row.total)-row.total;
  const missing = items.filter(item => !bestFor(item)).map(item => item.product);
  const groups = new Map<string, {supermarket: SupermarketBranch; items: SplitBasketOptimalItem[]; subtotal: number}>();
  for (const item of items) {
    const obs = bestFor(item);
    if (!obs) continue; // Unknown cost is not zero and is never assigned to Coto.
    const supermarket = storeFor(obs);
    const optimal: SplitBasketOptimalItem = { product: item.product, quantity: item.quantity, best_supermarket: supermarket, best_price: obs.current_price, subtotal: obs.current_price*item.quantity };
    if (!groups.has(supermarket.id)) groups.set(supermarket.id, {supermarket, items: [], subtotal: 0});
    const group = groups.get(supermarket.id)!;
    group.items.push(optimal); group.subtotal += optimal.subtotal;
  }
  const store_groups = [...groups.values()];
  const total = store_groups.reduce((sum,g) => sum+g.subtotal,0);
  const extra = cheapest && missing.length === 0 ? Math.max(0,cheapest.total-total) : 0;
  return { single_trip: single, cheapest_single_store: cheapest, most_expensive_single_store: mostExpensive,
    overall_potential_savings: mostExpensive && !missing.length ? Math.max(0,mostExpensive.total-total) : 0,
    split_trip: {store_groups,total_optimized:total,single_trip_best_total:cheapest?.total || 0,extra_savings:extra,extra_savings_percentage:cheapest?.total ? extra/cheapest.total*100 : 0,missing_products:missing} };
}
