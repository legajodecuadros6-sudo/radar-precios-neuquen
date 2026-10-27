import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, TrendingDown, ShoppingCart, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Product, PriceObservation, PriceHistoryPoint } from '../types';
import { analyzeProductPrices } from '../utils/priceAnalyzer';
import { formatCurrency } from '../utils/formatters';
import { SUPERMARKETS_NEUQUEN } from '../data/supermarkets';
import { useBasket } from '../context/BasketContext';

interface ProductDetailModalProps {
  product: Product | null;
  observations: PriceObservation[];
  historyPoints?: PriceHistoryPoint[];
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  observations,
  historyPoints = [],
  onClose
}) => {
  const { items, addItem, updateQuantity } = useBasket();
  const [timeframe, setTimeframe] = useState<'30d' | '90d'>('30d');

  if (!product) return null;

  const analysis = analyzeProductPrices(product, observations, historyPoints);
  const basketItem = items.find(i => i.product.id === product.id);
  const inBasketQuantity = basketItem ? basketItem.quantity : 0;

  // Filter history points based on timeframe
  const displayHistory = timeframe === '30d'
    ? historyPoints.slice(-5)
    : historyPoints;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg">
              {product.category}
            </span>
            {product.ean && (
              <span className="text-xs font-mono text-slate-500">
                EAN: {product.ean}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Info */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl bg-slate-100 border border-slate-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {product.brand} • {product.net_content_str}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Price Range & Best Store */}
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(analysis.min_price)}
                </span>
                <span className="text-xs text-slate-400">
                  (Mejor precio en <span className="font-bold text-slate-800">{analysis.best_store_name}</span>)
                </span>
                {analysis.max_savings_percentage > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                    Ahorro del {analysis.max_savings_percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Anti-Inflation Diagnostic Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs shrink-0">
                {analysis.deal_flag === 'oferta_real' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                ) : analysis.deal_flag === 'suba_previa' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900">
                    Diagnóstico Anti-Inflación
                  </h4>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${analysis.deal_flag_badge}`}>
                    {analysis.deal_flag_label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {analysis.deal_flag === 'oferta_real'
                    ? 'El precio actual se encuentra un 10% o más por debajo de la media histórica de Neuquén.'
                    : analysis.deal_flag === 'suba_previa'
                    ? 'Se detectó que el precio regular fue elevado antes de aplicar la promoción.'
                    : 'Precio dentro de los márgenes normales de mercado.'}
                </p>
              </div>
            </div>

            {/* Timeframe selector */}
            {historyPoints.length > 0 && (
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setTimeframe('30d')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    timeframe === '30d' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  30 días
                </button>
                <button
                  onClick={() => setTimeframe('90d')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    timeframe === '90d' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  90 días
                </button>
              </div>
            )}
          </div>

          {/* Interactive Recharts Chart */}
          {displayHistory.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-semibold">
                <span>Evolución del Precio en Neuquén (ARS $)</span>
                <span className="text-emerald-600">Línea Verde: Mejor Precio</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMinPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={val => val.slice(5)}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={val => `$${val}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={65}
                    />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), 'Precio']}
                      labelFormatter={label => `Fecha: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="min_price"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorMinPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              Historial de observaciones en construcción para este producto en Neuquén.
            </div>
          )}

          {/* Supermarket Breakdown Table with Sources */}
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-2">
              Precios y Sucursales en Neuquén Capital
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {analysis.observations.map(obs => {
                const store = SUPERMARKETS_NEUQUEN.find(s => s.supermarket_id === obs.supermarket_id);

                return (
                  <div key={obs.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {store?.brand_name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {store?.address}
                        </span>
                        {obs.promo_label && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {obs.promo_label}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>Relevado: {obs.query_date}</span>
                        {obs.publication_date && (
                          <span>Publicado: {obs.publication_date}</span>
                        )}
                        {obs.source_url && (
                          <a
                            href={obs.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-0.5"
                          >
                            Ver fuente original <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-slate-900">
                        {formatCurrency(obs.current_price)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(obs.price_per_unit)} {obs.unit_label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {inBasketQuantity > 0 ? `${inBasketQuantity} unidades en tu canasta` : 'No está en tu canasta'}
          </div>

          <div className="flex items-center gap-2">
            {inBasketQuantity > 0 && (
              <button
                onClick={() => updateQuantity(product.id, inBasketQuantity - 1)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => addItem(product, 1)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{inBasketQuantity > 0 ? 'Sumar 1 más' : 'Agregar a Canasta'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
