import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickActionCards } from './components/QuickActionCards';
import { BentoDealsGrid } from './components/BentoDealsGrid';
import { DealsRankingSection } from './components/DealsRankingSection';
import { CategoryFilters } from './components/CategoryFilters';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SmartBasketDrawer } from './components/SmartBasketDrawer';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { NeuquenMapModal } from './components/NeuquenMapModal';
import { SearchAutocomplete } from './components/SearchAutocomplete';
import { INITIAL_PRODUCTS, INITIAL_PRICE_OBSERVATIONS, MOCK_PRICE_HISTORIES } from './data/database';
import { fetchLiveRadarData } from './services/productService';
import { useBasket } from './context/BasketContext';
import { analyzeProductPrices } from './utils/priceAnalyzer';
import { Shield, Database, Cloud, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Product, PriceObservation } from './types';

export const AppContent: React.FC = () => {
  const {
    searchQuery,
    selectedCategory,
    selectedProductForModal,
    setSelectedProductForModal,
    isScannerOpen,
    setIsScannerOpen,
    isMapOpen,
    setIsMapOpen,
    toggleBasket,
    itemCount
  } = useBasket();

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [observations, setObservations] = useState<PriceObservation[]>(INITIAL_PRICE_OBSERVATIONS);
  const [connectionStatus, setConnectionStatus] = useState<{ isLiveCloud: boolean; message: string }>({
    isLiveCloud: false,
    message: 'Inicializando conexión...'
  });

  const [sortBy, setSortBy] = useState('max_savings');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const dealsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveRadarData().then(result => {
      if (isMounted) {
        if (result.products && result.products.length > 0) {
          setProducts(result.products);
        }
        if (result.observations && result.observations.length > 0) {
          setObservations(result.observations);
        }
        setConnectionStatus({
          isLiveCloud: result.isLiveCloud,
          message: result.message || ''
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToDeals = () => {
    dealsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['Todos', ...cats];
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: products.length };
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (product.ean && product.ean.includes(query)) ||
        (product.ean_aliases && product.ean_aliases.some(alias => alias.includes(query)));

      return matchesCategory && matchesSearch;
    });

    // Sorting
    result.sort((a, b) => {
      const analysisA = analyzeProductPrices(a, observations);
      const analysisB = analyzeProductPrices(b, observations);

      if (sortBy === 'max_savings') {
        return analysisB.max_savings_percentage - analysisA.max_savings_percentage;
      }
      if (sortBy === 'lowest_price') {
        return analysisA.min_price - analysisB.min_price;
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [products, observations, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Header with Search, Deals, Map and Embedded Scanner */}
      <Header
        onSearchFocus={() => setIsSearchFocused(true)}
        onScrollToDeals={scrollToDeals}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative">
        
        {/* Relevamiento Oficial y Estado en Vivo */}
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800">Precios y Ofertas al Día</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">Relevamiento en Vivo</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
            <span>📍 Neuquén Capital (CP 8300)</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-normal">8 Cadenas Comparadas</span>
          </div>
        </div>

        {/* 4 Quick Action Cards (Ofertas, Mapa, Scanner, Changuito) - Superprecio Style */}
        <QuickActionCards onScrollToDeals={scrollToDeals} />

        {/* Floating Autocomplete Popover */}
        <div className="relative">
          <SearchAutocomplete
            products={products}
            observations={observations}
            searchQuery={searchQuery}
            isOpen={isSearchFocused && searchQuery.length > 0}
            onClose={() => setIsSearchFocused(false)}
            onSelectProduct={product => {
              setSelectedProductForModal(product);
              setIsSearchFocused(false);
            }}
          />
        </div>

        {/* Bento Deals Grid (Visible when no search is active) */}
        {!searchQuery && (
          <BentoDealsGrid
            products={products}
            observations={observations}
            onSelectProduct={product => setSelectedProductForModal(product)}
          />
        )}

        {/* Deals & Supermarket Ranking Section (Anchor target) */}
        <div ref={dealsRef} id="ofertas-ranking">
          <DealsRankingSection
            products={products}
            observations={observations}
            onOpenProductDetail={product => setSelectedProductForModal(product)}
          />
        </div>

        {/* Section Heading & Category Filters */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {searchQuery ? `Resultados para "${searchQuery}"` : 'Catálogo Completo de Precios Comparados'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredProducts.length} productos con matriz comparativa multi-supermercado en Neuquén
              </p>
            </div>
          </div>

          <CategoryFilters
            categories={categories}
            counts={categoryCounts}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                observations={observations}
                onOpenDetail={prod => setSelectedProductForModal(prod)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Database className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              No encontramos productos para este filtro
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Prueba cambiando la categoría seleccionada o borrando los términos de búsqueda.
            </p>
          </div>
        )}

      </main>

      {/* Footer & Transparency Statement */}
      <footer className="bg-slate-900 border-t border-slate-800 py-10 mt-16 text-xs text-slate-400 mb-14 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center text-slate-950 font-black text-xs">
                R
              </div>
              <div>
                <span className="font-black text-white text-sm">
                  RADAR DE PRECIOS NEUQUÉN
                </span>
                <span className="text-cyan-400 text-xs ml-2 font-mono">CP 8300</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-800/60 font-bold">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                100% Open Source & Sin Publicidad
              </span>
              <span>Relevamiento local e independiente</span>
            </div>
          </div>

          <p className="leading-relaxed text-[11px] text-slate-500">
            * Información recopilada mediante relevamiento directo y scraping de fuentes públicas oficiales (Coto Digital, La Anónima Online, Makro Canasta Básica Neuquén, Catálogos Yaguar Neuquén, MasOnline y Cooperativa Obrera). Los precios exhibidos corresponden a la fecha de consulta informada en cada registro y están sujetos a variaciones y stock disponible en cada salón de ventas.
          </p>
        </div>
      </footer>

      {/* Floating Action Button (FAB) - Mobile Cart (Superprecio Style) */}
      <button
        onClick={toggleBasket}
        className="md:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-600 text-white shadow-2xl shadow-cyan-600/50 flex items-center justify-center active:scale-90 transition-transform border-2 border-white/40 cursor-pointer"
        title="Abrir Canasta Inteligente"
      >
        <ShoppingCart className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
            {itemCount}
          </span>
        )}
      </button>

      {/* Modals & Slide-over Drawers */}
      <ProductDetailModal
        product={selectedProductForModal}
        observations={observations}
        historyPoints={selectedProductForModal ? MOCK_PRICE_HISTORIES[selectedProductForModal.id] : []}
        onClose={() => setSelectedProductForModal(null)}
      />

      <SmartBasketDrawer observations={observations} />

      {isScannerOpen && (
        <BarcodeScannerModal
          products={products}
          onProductFound={product => setSelectedProductForModal(product)}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {isMapOpen && (
        <NeuquenMapModal onClose={() => setIsMapOpen(false)} />
      )}

    </div>
  );
};

export default function App() {
  return (
    <React.StrictMode>
      <AppContent />
    </React.StrictMode>
  );
}
