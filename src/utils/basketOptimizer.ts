import { BasketItem, PriceObservation, BasketStoreTotal, SplitBasketOptimization, SplitBasketOptimalItem, SupermarketBranch } from '../types';
import { SUPERMARKETS_NEUQUEN } from '../data/supermarkets';

export interface BasketAnalysisResult {
  single_trip: BasketStoreTotal[];
  split_trip: SplitBasketOptimization;
  cheapest_single_store?: BasketStoreTotal;
  most_expensive_single_store?: BasketStoreTotal;
  overall_potential_savings: number;
}

export const calculateBasketOptimization = (
  items: BasketItem[],
  observations: PriceObservation[]
): BasketAnalysisResult => {
  if (items.length === 0) {
    return {
      single_trip: [],
      split_trip: {
        store_groups: [],
        total_optimized: 0,
        single_trip_best_total: 0,
        extra_savings: 0,
        extra_savings_percentage: 0
      },
      overall_potential_savings: 0
    };
  }

  // 1. Single Trip calculation per supermarket branch in Neuquén
  const singleTripResults: BasketStoreTotal[] = SUPERMARKETS_NEUQUEN.map(store => {
    let total = 0;
    let availableCount = 0;
    const missing: BasketItem['product'][] = [];

    items.forEach(item => {
      const obs = observations.find(
        o => o.product_id === item.product.id && o.supermarket_id === store.supermarket_id
      );

      if (obs) {
        total += obs.current_price * item.quantity;
        availableCount += 1;
      } else {
        missing.push(item.product);
      }
    });

    return {
      supermarket: store,
      total,
      items_available: availableCount,
      items_total: items.length,
      missing_products: missing,
      savings_vs_most_expensive: 0
    };
  }).filter(res => res.items_available > 0);

  // Sort by coverage first (more items available), then by total ascending
  singleTripResults.sort((a, b) => {
    if (a.items_available !== b.items_available) {
      return b.items_available - a.items_available;
    }
    return a.total - b.total;
  });

  // Calculate savings compared to most expensive
  const fullyCoveredStores = singleTripResults.filter(s => s.items_available === items.length);
  const benchmarkStore = fullyCoveredStores.length > 0 ? fullyCoveredStores : singleTripResults;

  const cheapestSingle = benchmarkStore[0];
  const mostExpensiveSingle = benchmarkStore[benchmarkStore.length - 1];

  if (mostExpensiveSingle && cheapestSingle) {
    singleTripResults.forEach(store => {
      store.savings_vs_most_expensive = Math.max(0, mostExpensiveSingle.total - store.total);
    });
  }

  // 2. Split Trip calculation (Ahorro Máximo Dividido)
  const optimalItems: SplitBasketOptimalItem[] = items.map(item => {
    const itemObs = observations.filter(o => o.product_id === item.product.id);
    
    if (itemObs.length === 0) {
      return {
        product: item.product,
        quantity: item.quantity,
        best_supermarket: SUPERMARKETS_NEUQUEN[0],
        best_price: 0,
        subtotal: 0
      };
    }

    // Sort to find lowest price
    itemObs.sort((a, b) => a.current_price - b.current_price);
    const bestObs = itemObs[0];
    const bestStore = SUPERMARKETS_NEUQUEN.find(s => s.supermarket_id === bestObs.supermarket_id) || SUPERMARKETS_NEUQUEN[0];

    return {
      product: item.product,
      quantity: item.quantity,
      best_supermarket: bestStore,
      best_price: bestObs.current_price,
      subtotal: bestObs.current_price * item.quantity,
      regular_price: bestObs.regular_price,
      promo_label: bestObs.promo_label
    };
  });

  // Group optimal items by store
  const storeGroupsMap = new Map<string, { supermarket: SupermarketBranch; items: SplitBasketOptimalItem[]; subtotal: number }>();

  optimalItems.forEach(optItem => {
    const storeKey = optItem.best_supermarket.id;
    if (!storeGroupsMap.has(storeKey)) {
      storeGroupsMap.set(storeKey, {
        supermarket: optItem.best_supermarket,
        items: [],
        subtotal: 0
      });
    }
    const group = storeGroupsMap.get(storeKey)!;
    group.items.push(optItem);
    group.subtotal += optItem.subtotal;
  });

  const store_groups = Array.from(storeGroupsMap.values()).sort((a, b) => b.subtotal - a.subtotal);
  const total_optimized = optimalItems.reduce((acc, i) => acc + i.subtotal, 0);
  const single_trip_best_total = cheapestSingle ? cheapestSingle.total : total_optimized;
  const extra_savings = Math.max(0, single_trip_best_total - total_optimized);
  const extra_savings_percentage = single_trip_best_total > 0 ? (extra_savings / single_trip_best_total) * 100 : 0;

  const overall_potential_savings = mostExpensiveSingle ? Math.max(0, mostExpensiveSingle.total - total_optimized) : 0;

  return {
    single_trip: singleTripResults,
    split_trip: {
      store_groups,
      total_optimized,
      single_trip_best_total,
      extra_savings,
      extra_savings_percentage
    },
    cheapest_single_store: cheapestSingle,
    most_expensive_single_store: mostExpensiveSingle,
    overall_potential_savings
  };
};
