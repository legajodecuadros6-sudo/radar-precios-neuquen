import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, CheckCircle, Split, Store, Copy, Check } from 'lucide-react';
import { useBasket } from '../context/BasketContext';
import { PriceObservation } from '../types';
import { calculateBasketOptimization } from '../utils/basketOptimizer';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface SmartBasketDrawerProps {
  observations: PriceObservation[];
}

export const SmartBasketDrawer: React.FC<SmartBasketDrawerProps> = ({ observations }) => {
  const {
    items,
    isBasketOpen,
    closeBasket,
    updateQuantity,
    removeItem,
    clearBasket
  } = useBasket();

  const [activeTab, setActiveTab] = useState<'single' | 'split'>('single');
  const [copied, setCopied] = useState(false);

  if (!isBasketOpen) return null;

  const optimization = calculateBasketOptimization(items, observations);

  const handleCopyWhatsApp = () => {
    if (items.length === 0) return;

    let text = `🛒 *MI LISTA OPTIMIZADA DE COMPRAS - RADAR DE PRECIOS NEUQUÉN*\n\n`;

    if (activeTab === 'single' && optimization.cheapest_single_store) {
      const best = optimization.cheapest_single_store;
      text += `📍 *Opción Recomendada: Comprar todo en ${best.supermarket.brand_name}*\n`;
      text += `Dirección: ${best.supermarket.address}\n`;
      text += `Total estimado: ${formatCurrency(best.total)}\n`;
      if (best.savings_vs_most_expensive > 0) {
        text += `Ahorro vs opción más cara: ${formatCurrency(best.savings_vs_most_expensive)}\n`;
      }
      text += `\n*Productos:*\n`;
      items.forEach(i => {
        text += `• ${i.quantity}x ${i.product.name} (${i.product.brand})\n`;
      });
    } else {
      text += `🎯 *Opción Compra Dividida (Ahorro Máximo)*\n`;
      text += `Total Mínimo: ${formatCurrency(optimization.split_trip.total_optimized)}\n`;
      if (optimization.split_trip.extra_savings > 0) {
        text += `Ahorro adicional: ${formatCurrency(optimization.split_trip.extra_savings)} (${formatPercentage(optimization.split_trip.extra_savings_percentage)} más barato que un solo súper)\n`;
      }
      text += `\n*Desglose por comercio:*\n`;

      optimization.split_trip.store_groups.forEach(group => {
        text += `\n🏢 *${group.supermarket.brand_name}* (${group.supermarket.address}):\n`;
        group.items.forEach(it => {
          text += `  - ${it.quantity}x ${it.product.name} (${formatCurrency(it.best_price)} c/u)\n`;
        });
        text += `  Subtotal: ${formatCurrency(group.subtotal)}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                Canasta Inteligente Neuquén
              </h2>
              <p className="text-xs text-slate-500">
                {items.length} {items.length === 1 ? 'producto' : 'productos'} seleccionados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearBasket}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Vaciar canasta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeBasket}
              className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector: Un Solo Viaje vs Compra Dividida */}
        {items.length > 0 && (
          <div className="p-4 pb-0 bg-white">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/60 text-xs font-bold">
              <button
                onClick={() => setActiveTab('single')}
                className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Store className="w-4 h-4 text-emerald-600" />
                <span>1. Un Solo Súper</span>
              </button>
              <button
                onClick={() => setActiveTab('split')}
                className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all relative ${
                  activeTab === 'split'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Split className="w-4 h-4 text-emerald-600" />
                <span>2. Compra Dividida</span>
                {optimization.split_trip.extra_savings > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">
                Tu canasta está vacía
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Agrega productos desde el catálogo para comparar en vivo qué supermercado de Neuquén te conviene más.
              </p>
            </div>
          ) : activeTab === 'single' ? (
            
            /* TAB 1: Ranking de Un Solo Viaje */
            <div className="space-y-4">
              
              {/* Top Winner Banner */}
              {optimization.cheapest_single_store && (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Supermercado Más Barato
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      100% de la canasta
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-lg">
                        {optimization.cheapest_single_store.supermarket.brand_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {optimization.cheapest_single_store.supermarket.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-700">
                        {formatCurrency(optimization.cheapest_single_store.total)}
                      </span>
                    </div>
                  </div>

                  {optimization.cheapest_single_store.savings_vs_most_expensive > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                      <span>Ahorras vs opción más cara:</span>
                      <span className="font-bold">
                        {formatCurrency(optimization.cheapest_single_store.savings_vs_most_expensive)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Stores Ranking Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Comparativa de Cadenas en Neuquén
                </h4>

                {optimization.single_trip.map((res, index) => {
                  const isWinner = index === 0;

                  return (
                    <div
                      key={res.supermarket.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isWinner
                          ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isWinner
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-sm text-slate-900 truncate">
                            {res.supermarket.brand_name}
                          </h5>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {res.supermarket.type === 'mayorista' ? 'Mayorista' : 'Minorista'} • {res.items_available} de {res.items_total} productos
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {formatCurrency(res.total)}
                        </div>
                        {res.savings_vs_most_expensive > 0 && !isWinner && (
                          <div className="text-[10px] text-slate-400">
                            +{formatCurrency(res.total - (optimization.cheapest_single_store?.total || 0))} vs mejor
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            
            /* TAB 2: Compra Dividida (Máximo Ahorro) */
            <div className="space-y-4">
              
              {/* Split Highlights Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
                  <span>Estrategia de Mínimo Absoluto</span>
                  <span>{optimization.split_trip.store_groups.length} paradas</span>
                </div>

                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <span className="text-xs text-slate-400">Costo Mínimo Total:</span>
                    <div className="text-2xl font-black text-white">
                      {formatCurrency(optimization.split_trip.total_optimized)}
                    </div>
                  </div>
                  {optimization.split_trip.extra_savings > 0 && (
                    <div className="text-right bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-emerald-300 font-bold block uppercase">
                        Ahorro Adicional
                      </span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatCurrency(optimization.split_trip.extra_savings)} ({formatPercentage(optimization.split_trip.extra_savings_percentage)})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grouped Items by Supermarket */}
              <div className="space-y-3">
                {optimization.split_trip.store_groups.map(group => (
                  <div
                    key={group.supermarket.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-xs text-slate-900">
                          {group.supermarket.brand_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({group.supermarket.address})
                        </span>
                      </div>
                      <span className="font-extrabold text-xs text-slate-900">
                        Subtotal: {formatCurrency(group.subtotal)}
                      </span>
                    </div>

                    <div className="p-3 divide-y divide-slate-100 text-xs">
                      {group.items.map(opt => (
                        <div key={opt.product.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">
                              {opt.quantity}x {opt.product.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {opt.product.brand} • {formatCurrency(opt.best_price)} c/u
                            </span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(opt.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* List of Products in Basket */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Tus Productos ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.product.id}
                    className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/70 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-10 h-10 object-cover rounded-xl bg-white border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-slate-900 truncate">
                          {item.product.name}
                        </h5>
                        <span className="text-[11px] text-slate-400">
                          {item.product.brand} • {item.product.net_content_str}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-1 text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer with Export Button */}
        {items.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">
                Total Recomendado
              </span>
              <span className="text-xl font-black text-slate-900">
                {formatCurrency(
                  activeTab === 'single'
                    ? (optimization.cheapest_single_store?.total || 0)
                    : optimization.split_trip.total_optimized
                )}
              </span>
            </div>

            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>¡Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar para WhatsApp</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
