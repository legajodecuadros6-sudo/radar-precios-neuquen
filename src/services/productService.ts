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
  if (supaId.includes('vea')) return 'vea';
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

    // 3. Mapear productos respetando SIEMPRE las fotos oficiales de packaging de INITIAL_PRODUCTS
    const mappedProducts: Product[] = INITIAL_PRODUCTS.map(initialProd => {
      const supaMatch = supaProducts.find(
        (sp: any) => sp.id === initialProd.id || (sp.ean && sp.ean === initialProd.ean)
      );
      if (!supaMatch) return initialProd;

      // Si la imagen en Supabase es genérica de Unsplash, usar la oficial de góndola de INITIAL_PRODUCTS
      const isUnsplash = supaMatch.image_url && supaMatch.image_url.includes('unsplash.com');
      const finalImage = (!isUnsplash && supaMatch.image_url) ? supaMatch.image_url : initialProd.image_url;

      return {
        ...initialProd,
        name: supaMatch.name || initialProd.name,
        brand: supaMatch.brand || initialProd.brand,
        category: (supaMatch.category || initialProd.category) as Product['category'],
        image_url: finalImage,
        description: supaMatch.description || initialProd.description
      };
    });

    // 4. Mapear observaciones a PriceObservation
    const supaMappedObservations: PriceObservation[] = supaPrices.map((obs: any) => {
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

    // Combinar observaciones para asegurar cobertura completa de las sucursales de Neuquén
    const observationMap = new Map<string, PriceObservation>();
    INITIAL_PRICE_OBSERVATIONS.forEach(obs => {
      observationMap.set(`${obs.product_id}_${obs.supermarket_id}`, obs);
    });
    supaMappedObservations.forEach(obs => {
      observationMap.set(`${obs.product_id}_${obs.supermarket_id}`, obs);
    });

    const finalObservations = Array.from(observationMap.values());

    return {
      products: mappedProducts,
      observations: finalObservations,
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
