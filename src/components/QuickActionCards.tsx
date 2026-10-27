import React from 'react';
import { Flame, Compass, ScanBarcode, ShoppingBag } from 'lucide-react';
import { useBasket } from '../context/BasketContext';

interface QuickActionCardsProps {
  onScrollToDeals: () => void;
}

export const QuickActionCards: React.FC<QuickActionCardsProps> = ({ onScrollToDeals }) => {
  const { setIsScannerOpen, setIsMapOpen, toggleBasket, itemCount } = useBasket();

  const actions = [
    {
      id: 'deals',
      label: 'Ofertas & Descuentos',
      subtitle: 'Ranking de ahorro hoy',
      icon: Flame,
      color: 'text-amber-500 bg-amber-500/10 border-amber-300/40 hover:bg-amber-500/15',
      badge: 'TOP',
      badgeColor: 'bg-amber-500 text-slate-950',
      onClick: onScrollToDeals
    },
    {
      id: 'map',
      label: 'Radar Mapa',
      subtitle: '17 sucursales en NQN',
      icon: Compass,
      color: 'text-cyan-600 bg-cyan-500/10 border-cyan-300/40 hover:bg-cyan-500/15',
      badge: 'GPS',
      badgeColor: 'bg-cyan-500 text-slate-950',
      onClick: () => setIsMapOpen(true)
    },
    {
      id: 'scanner',
      label: 'Escanear EAN',
      subtitle: 'Cámara o foto de barras',
      icon: ScanBarcode,
      color: 'text-indigo-600 bg-indigo-500/10 border-indigo-300/40 hover:bg-indigo-500/15',
      badge: 'CÁMARA',
      badgeColor: 'bg-indigo-600 text-white',
      onClick: () => setIsScannerOpen(true)
    },
    {
      id: 'basket',
      label: 'Changuito Óptimo',
      subtitle: '1 Viaje vs Dividido',
      icon: ShoppingBag,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-300/40 hover:bg-emerald-500/15',
      badge: itemCount > 0 ? `${itemCount}` : 'SMART',
      badgeColor: 'bg-emerald-600 text-white',
      onClick: toggleBasket
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className="flex items-center gap-3 p-3 sm:p-3.5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all text-left relative overflow-hidden group active:scale-98"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${action.color} group-hover:scale-105 transition-transform`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-slate-900 truncate block">
                  {action.label}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${action.badgeColor}`}>
                  {action.badge}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                {action.subtitle}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
