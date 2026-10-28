import React from 'react';
import { Plus, Minus, LineChart } from 'lucide-react';
import { Product, PriceObservation } from '../types';
import { analyzeProductPrices } from '../utils/priceAnalyzer';
import { formatCurrency } from '../utils/formatters';
import { SUPERMARKETS_NEUQUEN } from '../data/supermarkets';
import { useBasket } from '../context/BasketContext';

interface ProductCardProps {
  product: Product;
  observations: PriceObservation[];
  onOpenDetail: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  observations,
  onOpenDetail
}) => {
  const { items, addItem, updateQuantity } = useBasket();
  const analysis = analyzeProductPrices(product, observations);

  const basketItem = items.find(i => i.product.id === product.id);
  const inBasketQuantity = basketItem ? basketItem.quantity : 0;

  // Sort observations by current price ascending
  const sortedObs = [...analysis.observations].sort((a, b) => a.current_price - b.current_price);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group">
      
      {/* Product Image & Badges */}
      <div className="p-4 pb-0 relative">
        <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-white border border-slate-100 flex items-center justify-center p-2">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              // Fallback si la imagen no carga
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
            }}
          />

          {/* Deal Flag Badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-xs ${analysis.deal_flag_badge}`}>
              {analysis.deal_flag_label}
            </span>
          </div>

          {/* EAN or Canasta Badge */}
          {product.is_cesta_basica && (
            <div className="absolute top-2.5 right-2.5">
              <span className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-slate-700">
                Canasta Básica
              </span>
            </div>
          )}
        </div>

        {/* Brand & Title */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-extrabold text-indigo-900 uppercase tracking-wider text-[11px]">
              {product.brand}
            </span>
            <span className="font-medium text-slate-500">{product.net_content_str}</span>
          </div>
          <h3
            onClick={() => onOpenDetail(product)}
            className="font-extrabold text-slate-900 text-sm mt-0.5 line-clamp-2 hover:text-cyan-700 cursor-pointer transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>
      </div>

      {/* Multi-Supermarket Matrix */}
      <div className="p-4 pt-3">
        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1 mb-1 tracking-wider">
            <span>Comercio en Neuquén</span>
            <span>Precio (Unidad)</span>
          </div>

          {sortedObs.map((obs, index) => {
            const isBest = index === 0;
            const store = SUPERMARKETS_NEUQUEN.find(s => s.supermarket_id === obs.supermarket_id);

            return (
              <div
                key={obs.id}
                className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition-colors ${
                  isBest
                    ? 'bg-cyan-50/90 border border-cyan-300 font-medium'
                    : 'hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isBest ? 'bg-cyan-500' : 'bg-slate-300'
                    }`}
                  />
                  <span className={`font-bold truncate text-[11px] ${isBest ? 'text-cyan-950' : 'text-slate-800'}`}>
                    {store?.brand_name || obs.supermarket_id}
                  </span>
                  {obs.promo_label && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded truncate">
                      {obs.promo_label}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    {obs.regular_price > obs.current_price && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatCurrency(obs.regular_price)}
                      </span>
                    )}
                    <span
                      className={`font-black ${
                        isBest ? 'text-cyan-800 text-xs' : 'text-slate-800 text-[11px]'
                      }`}
                    >
                      {formatCurrency(obs.current_price)}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {formatCurrency(obs.price_per_unit)} {obs.unit_label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Savings Summary Banner */}
        {analysis.max_savings_percentage > 0 && (
          <div className="mt-2 text-center text-[11px] text-indigo-900 font-black bg-indigo-50/80 py-1 px-2 rounded-xl border border-indigo-200">
            Ahorro de {formatCurrency(analysis.max_savings_amount)} ({analysis.max_savings_percentage}%) comprando en {analysis.best_store_name}
          </div>
        )}
      </div>

      {/* Action Footer: History + Cart Stepper */}
      <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
        <button
          onClick={() => onOpenDetail(product)}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-cyan-700 py-2 px-2.5 rounded-xl hover:bg-slate-100 transition-colors"
          title="Ver evolución histórica de precios en Neuquén"
        >
          <LineChart className="w-3.5 h-3.5 text-cyan-600" />
          <span>Historial</span>
        </button>

        {inBasketQuantity === 0 ? (
          <button
            onClick={() => addItem(product, 1)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-extrabold py-2 px-3 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-300 rounded-xl p-1">
            <button
              onClick={() => updateQuantity(product.id, inBasketQuantity - 1)}
              className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs shadow-xs"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center font-black text-xs text-cyan-900">
              {inBasketQuantity}
            </span>
            <button
              onClick={() => updateQuantity(product.id, inBasketQuantity + 1)}
              className="w-6 h-6 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 flex items-center justify-center font-bold text-xs shadow-xs"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
