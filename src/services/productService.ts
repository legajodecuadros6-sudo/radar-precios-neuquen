import { Product, PriceObservation } from '../types';
import { INITIAL_PRODUCTS, INITIAL_PRICE_OBSERVATIONS } from '../data/database';
import snapshot from '../data/live-prices.json';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapSupermarketId, mergePrices, productUnitPrice } from '../utils/dataQuality';

type Row = Record<string, any>;
export interface DataFetchResult {
  products: Product[];
  observations: PriceObservation[];
  isLiveCloud: boolean;
  message: string;
  excluded?: { products: number; prices: number };
}
// Retain historical source files, but never treat their hardcoded prices as fresh evidence.
export const localData: DataFetchResult = {
  products: [...INITIAL_PRODUCTS.filter(p => !p.ean || !snapshot.products.some(real => 'ean' in real && real.ean === p.ean)).map(p => ({ ...p, ean_aliases: [] })), ...snapshot.products as Product[]],
  observations: mergePrices(INITIAL_PRICE_OBSERVATIONS.map(o => ({ ...o, is_verified: false, notes: 'Registro anterior sin trazabilidad suficiente' })), snapshot.observations as PriceObservation[]),
  isLiveCloud: false,
  message: 'Última importación guardada. Cada precio indica su fuente y fecha.'
};

export function mergeCloudData(productRows: Row[], priceRows: Row[], branchRows: Row[]): DataFetchResult {
  const products = new Map(localData.products.map(p => [p.id, p]));
  const ids = new Map<string, string>();
  const excluded = { products: 0, prices: 0 };
  for (const row of productRows) {
    if (!row.id || !row.name) { excluded.products++; continue; }
    const existing = products.get(row.id);
    // Legacy cloud units conflict with EANs in the test catalog: never merge by EAN alone.
    if (existing) { ids.set(row.id, existing.id); continue; }
    const product: Product = {
      id: String(row.id), name: String(row.name), brand: String(row.brand || 'Sin marca'),
      category: row.category || 'Almacén', ean: row.ean || undefined, ean_aliases: [],
      image_url: row.image_url && !row.image_url.includes('unsplash.com') ? row.image_url : '',
      unit_measure: row.unit_measure || 'unidad', net_content_number: Number(row.net_content_number) || 1,
      net_content_str: row.net_content_str || row.unit || 'Unidad', description: row.description
    };
    // A duplicate barcode with conflicting product identity is quarantined until reviewed.
    if (product.ean && [...products.values()].some(p => p.ean === product.ean)) { excluded.products++; continue; }
    products.set(product.id, product); ids.set(row.id, product.id);
  }
  const observations: PriceObservation[] = [];
  for (const row of priceRows) {
    const pid = ids.get(row.product_id), product = pid ? products.get(pid) : undefined;
    const branch = branchRows.find(b => b.id === row.supermarket_id);
    const chain = mapSupermarketId(branch?.brand || row.supermarket_id || '');
    const regular = Number(row.regular_price), price = row.offer_price == null ? regular : Number(row.offer_price);
    if (!product || !chain || !Number.isFinite(price) || price <= 0 || row.in_stock === false) { excluded.prices++; continue; }
    observations.push({
      id: String(row.id), product_id: product.id, supermarket_id: chain,
      branch_id: row.branch_id || branch?.id, branch_name: branch?.branch_name || row.supermarket_id,
      branch_address: row.branch_address || branch?.address, regular_price: regular || price, current_price: price,
      ...productUnitPrice(price, product), query_date: row.observed_at || row.updated_at || '',
      source_url: row.source_url || '', source_name: row.source_name,
      is_verified: row.is_verified === true && Boolean(row.source_url), is_demo: row.is_demo === true,
      channel: row.channel, min_quantity: Number(row.min_quantity) || 1, quantity_multiple: Number(row.quantity_multiple) || 1,
      promo_condition: row.promo_condition || undefined
    });
  }
  return { products: [...products.values()], observations: mergePrices(localData.observations, observations), isLiveCloud: true, excluded, message: 'Catálogo consultado. La conexión no garantiza precios vigentes.' + (excluded.products || excluded.prices ? ` Se excluyeron ${excluded.products} productos y ${excluded.prices} cotizaciones por identidad sin confirmar, datos incompletos o falta de disponibilidad.` : '') };
}

export async function fetchLiveRadarData(): Promise<DataFetchResult> {
  if (!isSupabaseConfigured || !supabase) return localData;
  try {
    // Stable pagination avoids the default 1,000-row ceiling when catalog grows.
    const read = async (table: string): Promise<Row[]> => {
      const rows: Row[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase!.from(table).select('*').order('id').range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) return rows;
      }
    };
    const [products, prices, branches] = await Promise.all([read('products'), read('price_observations'), read('supermarkets')]);
    return mergeCloudData(products, prices, branches);
  } catch {
    return { ...localData, message: 'No se pudo actualizar la conexión. Mostrando la última importación y sus fechas originales.' };
  }
}
