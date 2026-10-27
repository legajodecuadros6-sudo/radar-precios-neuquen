import { Product, PriceObservation, DealFlag, PriceHistoryPoint } from '../types';
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
  const observations = allObservations.filter(o => o.product_id === product.id);

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
  const bestStore = SUPERMARKETS_NEUQUEN.find(s => s.supermarket_id === bestObs.supermarket_id);

  const max_savings_amount = max_price - min_price;
  const max_savings_percentage = avg_price > 0 ? Math.round(((avg_price - min_price) / avg_price) * 100) : 0;

  // Anti-inflation and deal legitimacy logic
  let deal_flag: DealFlag = 'precio_estable';
  let deal_flag_label = 'Precio de Mercado';
  let deal_flag_badge = 'bg-slate-100 text-slate-700 border-slate-200';

  if (!historyPoints || historyPoints.length < 3) {
    deal_flag = 'historial_insuficiente';
    deal_flag_label = 'Historial en construcción';
    deal_flag_badge = 'bg-blue-50 text-blue-700 border-blue-200';
  } else {
    const historicalAvg = historyPoints.reduce((acc, h) => acc + h.avg_price, 0) / historyPoints.length;
    const diffPct = ((min_price - historicalAvg) / historicalAvg) * 100;

    if (bestObs.promo_label && bestObs.regular_price > avg_price * 1.25) {
      deal_flag = 'suba_previa';
      deal_flag_label = '⚠️ Posible Suba Previa';
      deal_flag_badge = 'bg-amber-50 text-amber-800 border-amber-300';
    } else if (diffPct <= -8 || (bestObs.discount_percentage && bestObs.discount_percentage >= 15)) {
      deal_flag = 'oferta_real';
      deal_flag_label = '🔥 Oferta Real Verificada';
      deal_flag_badge = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
    }
  }

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
