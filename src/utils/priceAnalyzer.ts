import { Product, PriceObservation, DealFlag, PriceHistoryPoint } from '../types';
import { priceIsUsable } from './dataQuality';
import { SUPERMARKETS_NEUQUEN } from '../data/supermarkets';

export interface ProductPriceSummary {
  product: Product;
  observations: PriceObservation[];
  min_price: number;
  max_price: number;
  avg_price: number;
  best_store_id: string;
  best_store_name: string;
  best_store_badge_bg: string;
  best_store_badge_text: string;
  max_savings_amount: number;
  max_savings_percentage: number;
  deal_flag: DealFlag;
  deal_flag_label: string;
  deal_flag_badge: string;
}

export const analyzeProductPrices = (
  product: Product,
  allObservations: PriceObservation[],
  historyPoints?: PriceHistoryPoint[]
): ProductPriceSummary => {
  const observations = allObservations.filter(o => o.product_id === product.id && priceIsUsable(o) && (o.min_quantity || 1) <= 1 && !o.promo_condition);

  if (observations.length === 0) {
    return {
      product,
      observations: [],
      min_price: 0,
      max_price: 0,
      avg_price: 0,
      best_store_id: '',
      best_store_name: 'Sin datos',
      best_store_badge_bg: 'bg-slate-100',
      best_store_badge_text: 'text-slate-600',
      max_savings_amount: 0,
      max_savings_percentage: 0,
      deal_flag: 'historial_insuficiente',
      deal_flag_label: 'Sin datos',
      deal_flag_badge: 'bg-slate-100 text-slate-600'
    };
  }

  const prices = observations.map(o => o.current_price);
  const min_price = Math.min(...prices);
  const max_price = Math.max(...prices);
  const avg_price = Math.round(prices.reduce((acc, p) => acc + p, 0) / prices.length);

  const bestObs = observations.find(o => o.current_price === min_price) || observations[0];
  const bestStore = SUPERMARKETS_NEUQUEN.find(s => s.id === bestObs.branch_id);

  const max_savings_amount = max_price - min_price;
  const max_savings_percentage = max_price > 0 ? Math.round(((max_price - min_price) / max_price) * 100) : 0;

  // A series mixing stores does not prove inflation or an artificial prior increase.
  const deal_flag: DealFlag = 'historial_insuficiente';
  const deal_flag_label = historyPoints && historyPoints.length > 1 ? 'Precios registrados' : 'Historial en construcción';
  const deal_flag_badge = 'bg-blue-50 text-blue-700 border-blue-200';

  return {
    product,
    observations,
    min_price,
    max_price,
    avg_price,
    best_store_id: bestObs.supermarket_id,
    best_store_name: bestStore?.brand_name || bestObs.supermarket_id,
    best_store_badge_bg: bestStore?.badge_bg || 'bg-slate-100',
    best_store_badge_text: bestStore?.badge_text || '',
    max_savings_amount,
    max_savings_percentage,
    deal_flag,
    deal_flag_label,
    deal_flag_badge
  };
};
