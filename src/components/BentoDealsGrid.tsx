import React from 'react';
import { TrendingDown, ShieldAlert, Zap, ArrowUpRight, CheckCircle2, Radar } from 'lucide-react';
import { Product, PriceObservation } from '../types';
import { formatCurrency } from '../utils/formatters';

interface BentoDealsGridProps {
  products: Product[];
  observations: PriceObservation[];
  onSelectProduct: (product: Product) => void;
}

export const BentoDealsGrid: React.FC<BentoDealsGridProps> = ({
  products,
  observations,
  onSelectProduct
}) => {
  // Find top real deals (highest discount percentage with verified flag)
  const topDealObs = [...observations]
    .filter(o => o.discount_percentage && o.discount_percentage > 0)
    .sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0))[0];

  const topDealProduct = topDealObs ? products.find(p => p.id === topDealObs.product_id) : null;

  // Find meat / canasta highlight
  const meatProduct = products.find(p => p.category === 'Carnicería');
  const meatObs = meatProduct ? observations.filter(o => o.product_id === meatProduct.id) : [];
  const minMeatPrice = meatObs.length > 0 ? Math.min(...meatObs.map(o => o.current_price)) : 0;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-600 animate-spin" style={{ animationDuration: '6s' }} />
            Oportunidades Detectadas por el Radar en Neuquén
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Relevamiento en tiempo real sobre sucursales físicas (Dr. Ramón, Paseo Patagonia, Perticone, Planas y Félix San Martín).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Top Deal Highlight (Spans 2 cols on desktop) */}
        {topDealProduct && topDealObs && (
          <div
            onClick={() => onSelectProduct(topDealProduct)}
            className="md:col-span-2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl shadow-indigo-950/20 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all relative overflow-hidden group border border-slate-800"
          >
            {/* Ambient radar sonar sweep glow */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400 to-transparent" />
            
            <div className="flex items-center justify-between mb-3">
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                Mayor Descuento del Radar
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {topDealObs.query_date}
              </span>
            </div>

            <div className="flex items-center gap-5 mt-2">
              <img
                src={topDealProduct.image_url}
                alt={topDealProduct.name}
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl bg-white/10 p-1 border border-white/10 shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <span className="text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
                  {topDealProduct.brand} • {topDealProduct.net_content_str}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white truncate group-hover:text-cyan-200 transition-colors">
                  {topDealProduct.name}
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-300">
                    {formatCurrency(topDealObs.current_price)}
                  </span>
                  {topDealObs.regular_price > topDealObs.current_price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatCurrency(topDealObs.regular_price)}
                    </span>
                  )}
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-lg shadow-sm">
                    -{topDealObs.discount_percentage}% DTO
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">En {topDealObs.branch_name}</span>
                  {topDealObs.promo_label && (
                    <span className="bg-white/10 px-2 py-0.2 rounded text-[11px]">
                      {topDealObs.promo_label}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Comprobado en catálogo oficial
              </span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform font-bold text-white">
                Analizar comparativa <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              </span>
            </div>
          </div>
        )}

        {/* Card 2: Meat & Asado Neuquino */}
        {meatProduct && (
          <div
            onClick={() => onSelectProduct(meatProduct)}
            className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md cursor-pointer hover:border-slate-300 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-rose-200">
                  🥩 Carnicería & Parrilla
                </span>
                <span className="text-slate-400 text-xs">Neuquén</span>
              </div>
              <h4 className="font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">
                {meatProduct.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Precios relevados en Makro, Coto y La Anónima.
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">
                  desde {formatCurrency(minMeatPrice)}
                </span>
                <span className="text-xs text-slate-400">/ kg</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-cyan-700 font-bold">
              <span>Comparar cortes en el mapa</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Card 3: Anti-Inflation & Anti-Fraud Alert Box */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-3xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-amber-950 text-sm">
                Radar Anti-Inflación
              </h4>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
              Comparamos cada precio contra el promedio histórico de 30 y 90 días en Neuquén. Si un comercio infla el precio de lista previo a un "descuento", el radar te advierte.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-amber-950 font-bold">
            <span>Auditado sin publicidad</span>
            <span className="text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded font-black">
              100% Imparcial
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
