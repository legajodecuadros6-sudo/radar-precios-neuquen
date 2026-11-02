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
import { CoveragePanel } from './components/CoveragePanel';
import { priceIsUsable, matchesProduct, CHAIN_NAMES, ACTIVE_CHAIN_NAMES } from './utils/dataQuality';
import { fetchLiveRadarData, localData } from './services/productService';
import { useBasket } from './context/BasketContext';
import { isRetailOffer, WHOLESALE_CHAINS, selectCatalogView } from './utils/catalogViews';
import { buildCatalogIndex, compareCatalogProducts } from './utils/catalogIndex';
import { Shield, Database, Cloud, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Product, PriceObservation } from './types';

export const AppContent: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setSelectedCategory,
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

  const [products, setProducts] = useState<Product[]>(localData.products);
  const [observations, setObservations] = useState<PriceObservation[]>(localData.observations.filter(o => priceIsUsable(o)));
  const [connectionStatus, setConnectionStatus] = useState<{ isLiveCloud: boolean; message: string }>({
    isLiveCloud: false,
    message: 'Inicializando conexión...'
  });

  const [chainFilter, setChainFilter] = useState('all');
  const [marketView, setMarketView] = useState<'all' | 'wholesale' | 'offers'>('all');
  const catalogRef = useRef<HTMLDivElement>(null);
  const { observations: viewObservations, products: viewProducts } = useMemo(() => selectCatalogView(products, observations, chainFilter, marketView), [products, observations, chainFilter, marketView]);
  const [visibleCount, setVisibleCount] = useState(36);
  useEffect(() => setVisibleCount(36), [searchQuery, selectedCategory, chainFilter, marketView]);
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
        setObservations(result.observations.filter(o => priceIsUsable(o)));
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
    setMarketView('wholesale'); setChainFilter('all'); setSearchQuery(''); setSelectedCategory('Todos');
  };

  useEffect(() => { if (marketView !== 'all' || chainFilter !== 'all') catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [marketView, chainFilter]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(viewProducts.map(p => p.category)));
    return ['Todos', ...cats];
  }, [viewProducts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: viewProducts.length };
    viewProducts.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [viewProducts]);

  const catalogIndex = useMemo(() => buildCatalogIndex(viewProducts, viewObservations), [viewProducts, viewObservations]);

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    let result = viewProducts.filter(product => {
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
      return matchesCategory && matchesProduct(product, searchQuery) &&
        (chainFilter === 'all' || catalogIndex.get(product.id)!.observations.some(o => o.supermarket_id === chainFilter));
    });

    result.sort((a, b) => compareCatalogProducts(catalogIndex.get(a.id)!, catalogIndex.get(b.id)!, sortBy));

    return result;
  }, [viewProducts, catalogIndex, selectedCategory, searchQuery, sortBy, chainFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Header with Search, Deals, Map and Embedded Scanner */}
      <Header
        onSearchFocus={() => setIsSearchFocused(true)}
        onScrollToDeals={scrollToDeals}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative">
        
        <section className="mb-5 rounded-3xl bg-slate-900 px-5 py-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Neuquén Capital · Precios por sucursal</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black">Buscá el producto. Revisá el precio y su fecha.</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">Escaneá un envase o buscá por nombre. Comparamos la misma presentación cuando tenemos datos suficientes; los precios online pueden diferir de la góndola.</p>
          <p className="mt-3 text-xs text-slate-400">{connectionStatus.message}</p>
        </section>
        <CoveragePanel observations={observations} />
        <label className="block my-4 text-sm font-bold text-slate-700">
          Filtrar por comercio
          <select aria-label="Filtrar por comercio" value={chainFilter} onChange={event => { setChainFilter(event.target.value); setMarketView('all'); setSearchQuery(''); setSelectedCategory('Todos'); }} className="block w-full sm:w-80 mt-2 p-3 rounded-xl border border-slate-300 bg-white">
            <option value="all">Todos los comercios</option>
            {Object.entries(ACTIVE_CHAIN_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>

        {/* 4 Quick Action Cards (Ofertas, Mapa, Scanner, Changuito) - Superprecio Style */}
        <QuickActionCards onScrollToDeals={scrollToDeals} onRetailOffers={() => { setMarketView('offers'); setChainFilter('all'); setSearchQuery(''); setSelectedCategory('Todos'); }} />
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">Tus búsquedas frecuentes:</span>
          {[['Papas Lay’s', 'papas lay'], ['Manaos pomelo', 'manaos pomelo'], ['Bebidas alcohólicas', '']].map(([label, query]) => <button key={label} className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-900" onClick={() => { setChainFilter('all'); setMarketView('all'); setSearchQuery(query); setSelectedCategory(label === 'Bebidas alcohólicas' ? label : 'Todos'); catalogRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>{label}</button>)}
        </div>

        {/* Floating Autocomplete Popover */}
        <div className="relative">
          <SearchAutocomplete
            products={viewProducts}
            observations={viewObservations}
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
        {!searchQuery && chainFilter === 'all' && marketView === 'all' && (
          <BentoDealsGrid
            products={viewProducts}
            observations={viewObservations}
            onSelectProduct={product => setSelectedProductForModal(product)}
          />
        )}

        {/* Section Heading & Category Filters */}
        <div ref={catalogRef} className="mb-4 scroll-mt-44">
          <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" role="status">
            <h2 className="text-xl font-extrabold text-slate-900">{chainFilter !== 'all' ? `${CHAIN_NAMES[chainFilter as keyof typeof CHAIN_NAMES]} · precios y ofertas` : marketView === 'wholesale' ? 'Mayoristas · catálogo y condiciones' : marketView === 'offers' ? 'Ofertas minoristas verificadas' : 'Catálogo de todos los comercios'}</h2>
            <p className="mt-1 text-sm text-slate-600">{marketView === 'offers' ? 'Solo descuentos con precio anterior y condiciones identificadas. No se presentan los precios base como ofertas.' : 'Los precios corresponden al comercio y la sucursal indicados en cada ficha. La cantidad mínima de compra se muestra cuando aplica.'}</p>
            {(chainFilter !== 'all' || marketView !== 'all') && <button className="mt-2 text-sm font-bold underline" onClick={() => { setChainFilter('all'); setMarketView('all'); setSelectedCategory('Todos'); setSearchQuery(''); }}>Volver a todos los comercios</button>}
            {chainFilter !== 'all' && !WHOLESALE_CHAINS.has(chainFilter) && <p className="mt-2 text-sm">Ofertas minoristas verificadas en este comercio: {viewObservations.filter(isRetailOffer).length}. Un precio disponible no implica una promoción.</p>}
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {searchQuery ? `Resultados para "${searchQuery}"` : 'Productos y precios disponibles'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredProducts.length} productos en el catálogo · Consultá disponibilidad y condiciones en la fuente
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
            {filteredProducts.slice(0, visibleCount).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                observations={viewObservations}
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
              {marketView === 'offers' ? 'Todavía no hay ofertas minoristas verificadas' : chainFilter !== 'all' && !viewProducts.length ? `Catálogo de ${CHAIN_NAMES[chainFilter as keyof typeof CHAIN_NAMES]} pendiente` : 'No encontramos productos para este filtro'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {marketView === 'offers' ? 'Podés consultar los precios base en el catálogo. Publicaremos descuentos cuando podamos comprobar la vigencia y las condiciones.' : chainFilter !== 'all' && !viewProducts.length ? 'Aún no contamos con precios locales vigentes comprobados para esta cadena. No significa que el comercio no tenga productos o promociones.' : 'Probá cambiando la categoría o la búsqueda.'}
            </p>
          </div>
        )}

        {filteredProducts.length > visibleCount && <button onClick={() => setVisibleCount(n => n + 36)} className="block mx-auto mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold">Mostrar más productos ({Math.min(visibleCount, filteredProducts.length)} de {filteredProducts.length})</button>}
        {marketView === 'wholesale' && <div ref={dealsRef}><DealsRankingSection products={viewProducts} observations={viewObservations} onOpenProductDetail={product => setSelectedProductForModal(product)} /></div>}
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
            Se muestran precios con fuente y sucursal identificadas, consultados en las últimas 72 horas. Un comercio en el mapa no implica cobertura de precios. Las fuentes pendientes se indican arriba. El historial se construye con consultas reales; promociones, stock y condiciones se confirman en la tienda.
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
