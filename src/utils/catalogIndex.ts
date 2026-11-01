import { Product, PriceObservation } from '../types';
import { analyzeProductPrices, ProductPriceSummary } from './priceAnalyzer';

export function buildCatalogIndex(products: Product[], observations: PriceObservation[]) {
  const grouped = new Map<string, PriceObservation[]>();
  for (const observation of observations) {
    const rows = grouped.get(observation.product_id) || [];
    rows.push(observation);
    grouped.set(observation.product_id, rows);
  }
  return new Map(products.map(product => [product.id, analyzeProductPrices(product, grouped.get(product.id) || [])]));
}

export function compareCatalogProducts(a: ProductPriceSummary, b: ProductPriceSummary, sortBy: string) {
  if (Boolean(a.observations.length) !== Boolean(b.observations.length)) return a.observations.length ? -1 : 1;
  if (sortBy === 'max_savings') return b.max_savings_percentage - a.max_savings_percentage;
  if (sortBy === 'lowest_price') {
    if (Boolean(a.min_price) !== Boolean(b.min_price)) return a.min_price ? -1 : 1;
    return a.min_price - b.min_price;
  }
  if (sortBy === 'name_asc') return a.product.name.localeCompare(b.product.name, 'es');
  return 0;
}
