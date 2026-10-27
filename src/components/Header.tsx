import React from 'react';
import { ShoppingCart, ScanBarcode, Search, Radio, Compass, Flame } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Radar Brand Identity & Logo */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/40 via-transparent to-transparent animate-spin" style={{ animationDuration: '3.5s' }} />
                <div className="relative z-10 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl tracking-tight text-white flex items-center">
                  RADAR <span className="text-cyan-400 ml-1">PRECIOS</span>
                </h1>
                <span className="bg-cyan-500/10 text-cyan-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-cyan-400/30 uppercase tracking-widest">
                  Neuquén
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>CP 8300 • Coto, La Anónima, Makro, Yaguar, Vital, La Coope</span>
              </p>
            </div>
          </div>

          {/* Precision Search Bar */}
          <div className="flex-1 max-w-xl mx-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={onSearchFocus}
                placeholder="Rastrear producto, marca (Playadito, Natura) o código EAN..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-900 text-sm text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700/80 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Deals & Discounts Trigger Button */}
            <button
              onClick={onScrollToDeals}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 rounded-xl transition-all shadow-xs"
              title="Ver Ranking de Ofertas y Descuentos"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Ofertas & Ranking</span>
            </button>

            {/* Map Trigger */}
            <button
              onClick={() => setIsMapOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-xs"
              title="Abrir Radar Geográfico de Neuquén"
            >
              <Compass className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span className="hidden md:inline">Radar Mapa</span>
            </button>

            {/* Barcode Scanner Trigger */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-xs"
              title="Escanear código de barra con la cámara o foto"
            >
              <ScanBarcode className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline">Escanear</span>
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
