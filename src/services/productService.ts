import { Product, PriceObservation, SupermarketId } from '../types';
import { INITIAL_PRODUCTS, INITIAL_PRICE_OBSERVATIONS } from '../data/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface DataFetchResult {
  products: Product[];
  observations: PriceObservation[];
  isLiveCloud: boolean;
  message?: string;
}

// Mapeo seguro de IDs de supermercados en Supabase hacia SupermarketId
function mapSupermarketId(supaId: string): SupermarketId {
  if (supaId.includes('coto')) return 'coto';
  if (supaId.includes('anonima')) return 'la_anonima';
  if (supaId.includes('chango')) return 'changomas';
  if (supaId.includes('makro')) return 'makro';
  if (supaId.includes('yaguar')) return 'yaguar';
  if (supaId.includes('coop')) return 'cooperativa_obrera';
  if (supaId.includes('diarco')) return 'diarco';
  if (supaId.includes('vital')) return 'vital';
  return 'coto';
}

export async function fetchLiveRadarData(): Promise<DataFetchResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      products: INITIAL_PRODUCTS,
      observations: INITIAL_PRICE_OBSERVATIONS,
      isLiveCloud: false,
      message: 'Modo local activo (Configura .env.local para activar Supabase)'
    };
  }

  try {
    // 1. Obtener productos de Supabase
    const { data: supaProducts, error: prodError } = await supabase
      .from('products')
      .select('*');

    if (prodError || !supaProducts || supaProducts.length === 0) {
      console.warn('Supabase no devolvió productos o dio error, usando fallback local:', prodError);
      return {
        products: INITIAL_PRODUCTS,
        observations: INITIAL_PRICE_OBSERVATIONS,
        isLiveCloud: false,
        message: 'Respaldo local activado (Base en nube inicializándose)'
      };
    }

    // 2. Obtener observaciones de precios
    const { data: supaPrices, error: priceError } = await supabase
      .from('price_observations')
      .select('*');

    if (priceError || !supaPrices || supaPrices.length === 0) {
      return {
        products: INITIAL_PRODUCTS,
        observations: INITIAL_PRICE_OBSERVATIONS,
        isLiveCloud: false,
        message: 'Respaldo local activado (Sin precios en nube)'
      };
    }

    // 3. Mapear productos a la interfaz Product
    const mappedProducts: Product[] = supaProducts.map((p: any) => ({
      id: p.id,
      ean: p.ean || undefined,
      name: p.name,
      brand: p.brand,
      category: (p.category || 'Almacén') as Product['category'],
      image_url: p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
      unit_measure: (p.unit?.includes('L') ? 'litro' : p.unit?.includes('kg') ? 'kg' : 'unidad') as Product['unit_measure'],
      net_content_number: 1,
      net_content_str: p.unit || '1 u.',
      description: p.description || undefined,
      is_cesta_basica: true
    }));

    // 4. Mapear observaciones a PriceObservation
    const mappedObservations: PriceObservation[] = supaPrices.map((obs: any) => {
      const regular = Number(obs.regular_price) || 0;
      const offer = obs.offer_price ? Number(obs.offer_price) : regular;
      const discount = obs.discount_percentage ? Number(obs.discount_percentage) : (regular > offer ? Math.round(((regular - offer) / regular) * 100) : 0);

      return {
        id: obs.id,
        product_id: obs.product_id,
        supermarket_id: mapSupermarketId(obs.supermarket_id),
        branch_name: obs.supermarket_id,
        regular_price: regular,
        current_price: offer,
        discount_percentage: discount,
        promo_label: obs.promo_condition || (discount > 0 ? `${discount}% OFF` : undefined),
        promo_condition: obs.promo_condition || undefined,
        price_per_unit: offer,
        unit_label: '$ / u',
        query_date: obs.updated_at || new Date().toISOString(),
        is_verified: true,
        is_demo: false,
        source_url: 'https://supabase.com'
      };
    });

    return {
      products: mappedProducts,
      observations: mappedObservations,
      isLiveCloud: true,
      message: 'Conectado en vivo a Supabase (São Paulo)'
    };
  } catch (err) {
    console.error('Error conectando a Supabase:', err);
    return {
      products: INITIAL_PRODUCTS,
      observations: INITIAL_PRICE_OBSERVATIONS,
      isLiveCloud: false,
      message: 'Fallo de red: Operando con base de datos local'
    };
  }
}
