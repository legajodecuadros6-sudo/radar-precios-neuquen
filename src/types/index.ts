export type SupermarketId = 
  | 'coto' 
  | 'la_anonima' 
  | 'changomas' 
  | 'makro' 
  | 'yaguar' 
  | 'cooperativa_obrera' 
  | 'diarco' 
  | 'vital'
  | 'vea';

export type StoreType = 'minorista' | 'mayorista' | 'cooperativa';

export interface SupermarketBranch {
  id: string;
  supermarket_id: SupermarketId;
  name: string;
  brand_name: string;
  type: StoreType;
  address: string;
  city: string;
  postal_code: string;
  lat: number;
  lng: number;
  phone?: string;
  opening_hours: string;
  logo_color: string;
  badge_bg: string;
  badge_text: string;
  has_ecommerce: boolean;
  ecommerce_url?: string;
  whatsapp_canal?: string;
}

export type UnitType = 'kg' | 'g' | 'litro' | 'ml' | 'unidad' | 'rollo' | 'paño';

export interface Product {
  id: string;
  ean?: string;
  ean_aliases?: string[];
  name: string;
  brand: string;
  category: 'Almacén' | 'Lácteos y Frescos' | 'Bebidas' | 'Carnicería' | 'Limpieza' | 'Cuidado Personal' | 'Congelados' | 'Panadería';
  image_url: string;
  unit_measure: UnitType;
  net_content_number: number;
  net_content_str: string;
  description?: string;
  is_cesta_basica?: boolean;
}

export type DealFlag = 'oferta_real' | 'suba_previa' | 'precio_estable' | 'historial_insuficiente';

export interface PriceObservation {
  id: string;
  product_id: string;
  supermarket_id: SupermarketId;
  branch_name: string;
  regular_price: number;
  current_price: number;
  discount_percentage?: number;
  promo_label?: string; // ej: "2x1", "2do al 70%", "15% efectivo", "Llevando 3+", "Canasta Básica"
  promo_condition?: string;
  price_per_unit: number; // e.g. precio por kg, precio por litro
  unit_label: string; // ej: "$ / kg", "$ / litro"
  query_date: string;
  publication_date?: string;
  is_verified: boolean;
  is_demo: boolean;
  source_url: string;
  notes?: string;
}

export interface PriceHistoryPoint {
  date: string;
  coto?: number;
  la_anonima?: number;
  changomas?: number;
  makro?: number;
  yaguar?: number;
  cooperativa_obrera?: number;
  min_price: number;
  avg_price: number;
}

export interface BasketItem {
  product: Product;
  quantity: number;
}

export interface BasketStoreTotal {
  supermarket: SupermarketBranch;
  total: number;
  items_available: number;
  items_total: number;
  missing_products: Product[];
  savings_vs_most_expensive: number;
}

export interface SplitBasketOptimalItem {
  product: Product;
  quantity: number;
  best_supermarket: SupermarketBranch;
  best_price: number;
  subtotal: number;
  regular_price?: number;
  promo_label?: string;
}

export interface SplitBasketOptimization {
  store_groups: {
    supermarket: SupermarketBranch;
    items: SplitBasketOptimalItem[];
    subtotal: number;
  }[];
  total_optimized: number;
  single_trip_best_total: number;
  extra_savings: number;
  extra_savings_percentage: number;
}
