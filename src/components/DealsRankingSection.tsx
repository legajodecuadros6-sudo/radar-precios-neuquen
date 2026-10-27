import React, { useState, useMemo } from 'react';
import { Flame, Trophy, Tag, ArrowRight, CheckCircle2, TrendingDown, Store, Sparkles, AlertCircle } from 'lucide-react';
import { Product, PriceObservation, SupermarketId } from '../types';
import { SUPERMARKETS_NEUQUEN } from '../data/supermarkets';
import { formatCurrency } from '../utils/formatters';
import { useBasket } from '../context/BasketContext';

interface DealsRankingSectionProps {
  products: Product[];
  observations: PriceObservation[];
  onOpenProductDetail: (product: Product) => void;
}

export const DealsRankingSection: React.FC<DealsRankingSectionProps> = ({
  products,
  observations,
  onOpenProductDetail
}) => {
  const { addItem } = useBasket();
  const [selectedSupermarket, setSelectedSupermarket] = useState<string>('all');

  // Filter observations that have active discounts or promos
  const dealsObservations = useMemo(() => {
    return observations.filter(o => 
      (o.discount_percentage && o.discount_percentage > 0) || Boolean(o.promo_label)
    );
  }, [observations]);

  // Compute discount ranking per supermarket in Neuquén
  const supermarketRankings = useMemo(() => {
    const storeMap: Record<string, { totalDiscount: number; count: number; bestDeal: number }> = {};

    dealsObservations.forEach(obs => {
      const id = obs.supermarket_id;
      if (!storeMap[id]) {
        storeMap[id] = { totalDiscount: 0, count: 0, bestDeal: 0 };
      }
      const disc = obs.discount_percentage || 10;
      storeMap[id].totalDiscount += disc;
      storeMap[id].count += 1;
      if (disc > storeMap[id].bestDeal) {
        storeMap[id].bestDeal = disc;
      }
    });

    const ranked = Object.entries(storeMap).map(([id, data]) => {
      const store = SUPERMARKETS_NEUQUEN.find(s => s.supermarket_id === id);
      return {
        id,
        name: store?.brand_name || id,
        store,
        avgDiscount: Math.round(data.totalDiscount / data.count),
        bestDeal: data.bestDeal,
        dealsCount: data.count
      };
    });

    // Sort by highest average discount
    ranked.sort((a, b) => b.avgDiscount - a.avgDiscount);
    return ranked;
  }, [dealsObservations]);

  // Filter deals based on selected supermarket
  const filteredDeals = useMemo(() => {
    if (selectedSupermarket === 'all') {
      return dealsObservations.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    }
    return dealsObservations.filter(o => o.supermarket_id === selectedSupermarket)
      .sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
  }, [dealsObservations, selectedSupermarket]);

  // Selected supermarket info for contextual comparison notice
  const selectedStoreObj = SUPERMARKETS_NEUQUEN.find(s => s.supermarket_id === selectedSupermarket);
  const leadingStore = supermarketRankings[0];

  return (
    <section className="mb-12 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
      
      {/* Background ambient radar glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Title & Leaderboard Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-slate-950" />
              Radar de Ofertas & Descuentos
            </span>
            <span className="text-xs text-cyan-400 font-mono">
              Neuquén Capital • CP 8300
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ¿Quién tiene los precios más baratos hoy?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Compara promociones en general o selecciona una cadena para ver sus ofertas auditadas y cómo se ubica en el ranking de Neuquén.
          </p>
        </div>

        {/* Live Podium Leader Pill */}
        {leadingStore && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-lg shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-black">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Líder del Ranking de Ahorro
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-white">
                {leadingStore.name} ({leadingStore.avgDiscount}% ahorro prom.)
              </h4>
            </div>
          </div>
        )}
      </div>

      {/* Supermarket Selection Filter Pills (Both General & By Supermarket) */}
      <div className="relative z-10 mb-6">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
          Filtrar ofertas por supermercado:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedSupermarket('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
              selectedSupermarket === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Todas las Cadenas ({dealsObservations.length})</span>
          </button>

          {supermarketRankings.map(rank => (
            <button
              key={rank.id}
              onClick={() => setSelectedSupermarket(rank.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                selectedSupermarket === rank.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: rank.store?.logo_color || '#38bdf8' }}
              />
              <span>{rank.name}</span>
              <span className="bg-slate-900/60 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
                {rank.dealsCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Ranking Insight (When a specific supermarket is selected) */}
      {selectedSupermarket !== 'all' && selectedStoreObj && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3 relative z-10 text-xs">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">Estás explorando {selectedStoreObj.brand_name}: </span>
            <span className="text-slate-300">
              Mostrando sus promociones exclusivas en Neuquén. En el ranking general de precios de la ciudad, {selectedStoreObj.brand_name} ocupa la posición #{supermarketRankings.findIndex(r => r.id === selectedSupermarket) + 1} con un promedio de descuento del {supermarketRankings.find(r => r.id === selectedSupermarket)?.avgDiscount}%.
              {selectedSupermarket !== leadingStore?.id && (
                <span className="text-cyan-400 font-semibold ml-1">
                  (Para compras globales de canasta completa, {leadingStore?.name} lidera actualmente el ahorro).
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Deals Cards Grid (Similar to Superprecios Matrix) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {filteredDeals.map(deal => {
          const product = products.find(p => p.id === deal.product_id);
          if (!product) return null;

          // Find competing prices for the same product to show the live comparison
          const competingObs = observations.filter(o => o.product_id === product.id);
          const minPrice = Math.min(...competingObs.map(o => o.current_price));
          const isAbsoluteBest = deal.current_price === minPrice;

          return (
            <div
              key={deal.id}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4.5 flex flex-col justify-between transition-all group hover:border-cyan-500/50 shadow-sm"
            >
              <div>
                {/* Header: Supermarket badge + discount tag */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-cyan-400" />
                    {deal.branch_name.split('(')[0]}
                  </span>
                  
                  {deal.discount_percentage ? (
                    <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-lg shadow-xs">
                      -{deal.discount_percentage}% DTO
                    </span>
                  ) : deal.promo_label ? (
                    <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold text-[11px] px-2 py-0.5 rounded-lg">
                      {deal.promo_label}
                    </span>
                  ) : null}
                </div>

                {/* Product Info */}
                <div className="flex gap-3 mt-2">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-xl bg-slate-700/50 p-1 border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      {product.brand} • {product.net_content_str}
                    </span>
                    <h4
                      onClick={() => onOpenProductDetail(product)}
                      className="font-bold text-sm text-white line-clamp-2 hover:text-cyan-300 cursor-pointer transition-colors"
                    >
                      {product.name}
                    </h4>
                  </div>
                </div>

                {/* Pricing & Promo details */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-baseline justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-cyan-300">
                        {formatCurrency(deal.current_price)}
                      </span>
                      {deal.regular_price > deal.current_price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(deal.regular_price)}
                        </span>
                      )}
                    </div>
                    {deal.promo_label && (
                      <span className="text-[11px] text-amber-300 font-medium block mt-0.5">
                        {deal.promo_label}
                      </span>
                    )}
                  </div>

                  {isAbsoluteBest ? (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Mejor precio Neuquén
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Mínimo en ciudad: {formatCurrency(minPrice)}
                    </span>
                  )}
                </div>

                {/* Comparison Matrix Snippet */}
                <div className="mt-2.5 p-2 bg-slate-900/70 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    Comparativa en otras cadenas:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
                    {competingObs.map(c => {
                      const isThis = c.id === deal.id;
                      return (
                        <span
                          key={c.id}
                          className={`px-1.5 py-0.5 rounded whitespace-nowrap ${
                            isThis
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {c.supermarket_id}: {formatCurrency(c.current_price)}
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenProductDetail(product)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>Ver matriz completa</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => addItem(product, 1)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm"
                >
                  + Canasta
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
};
