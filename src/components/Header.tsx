import React from 'react';
import { ShoppingCart, ScanBarcode, Search, Radio, Compass, Flame, MapPin } from 'lucide-react';
import { useBasket } from '../context/BasketContext';

interface HeaderProps {
  onSearchFocus?: () => void;
  onScrollToDeals?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchFocus, onScrollToDeals }) => {
  const {
    itemCount,
    toggleBasket,
    setIsScannerOpen,
    setIsMapOpen,
    searchQuery,
    setSearchQuery
  } = useBasket();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Header Container */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-2.5 md:py-0 md:h-20 gap-2.5 md:gap-4">
          
          {/* Top Bar Row (Mobile: Brand + Location + Cart | Desktop: Left Brand) */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] sm:rounded-[14px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/40 via-transparent to-transparent animate-spin" style={{ animationDuration: '3.5s' }} />
                  <div className="relative z-10 flex items-center justify-center">
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center">
                    RADAR <span className="text-cyan-400 ml-1">PRECIOS</span>
                  </h1>
                  <span className="bg-cyan-500/10 text-cyan-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-cyan-400/30 uppercase tracking-widest">
                    Neuquén
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>CP 8300</span>
                  <span className="hidden sm:inline">• Coto, La Anónima, Makro, Yaguar, Vital, La Coope</span>
                </div>
              </div>
            </div>

            {/* Mobile-Only Fast Cart Trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleBasket}
                className="relative flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 active:scale-95 text-white rounded-xl shadow-md shadow-cyan-600/30 transition-all"
                title="Abrir Canasta Inteligente"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-bold text-xs">Canasta</span>
                {itemCount > 0 && (
                  <span className="bg-white text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-4 text-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>

          </div>

          {/* Search Bar with Embedded Barcode Scanner Icon (Inspired by Superprecio) */}
          <div className="flex-1 max-w-xl w-full">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={onSearchFocus}
                placeholder="Buscá o escaneá el código (Playadito, Aceite, EAN)..."
                className="w-full pl-10 pr-20 py-2.5 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-900 text-sm text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700/80 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all outline-none"
              />

              {/* Embedded Action Buttons inside Search Bar */}
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-white text-xs"
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}

                {/* Direct Barcode Scanner Button INSIDE input */}
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-90 text-cyan-300 border border-cyan-400/40 rounded-lg text-xs font-bold transition-all shadow-2xs"
                  title="Escanear código de barras con la cámara"
                >
                  <ScanBarcode className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] hidden xs:inline">Escanear</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            
            {/* Deals & Discounts Button */}
            <button
              onClick={onScrollToDeals}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 rounded-xl transition-all shadow-xs"
              title="Ver Ranking de Ofertas y Descuentos"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Ofertas & Ranking</span>
            </button>

            {/* Map Trigger */}
            <button
              onClick={() => setIsMapOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-xs"
              title="Abrir Radar Geográfico de Neuquén"
            >
              <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span>Radar Mapa</span>
            </button>

            {/* Smart Basket Button */}
            <button
              onClick={toggleBasket}
              className="relative flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-md shadow-cyan-600/20 hover:shadow-cyan-600/30 transition-all group"
            >
              <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-extrabold text-xs sm:text-sm">Canasta</span>
              {itemCount > 0 && (
                <span className="bg-white text-slate-900 text-xs font-black px-1.5 py-0.2 rounded-full min-w-5 text-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
