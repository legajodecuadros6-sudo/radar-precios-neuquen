import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Product, PriceObservation } from '../types';
import { analyzeProductPrices } from '../utils/priceAnalyzer';
import { formatCurrency } from '../utils/formatters';

interface SearchAutocompleteProps {
  products: Product[];
  observations: PriceObservation[];
  searchQuery: string;
  onSelectProduct: (product: Product) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  products,
  observations,
  searchQuery,
  onSelectProduct,
  isOpen,
  onClose
}) => {
  if (!isOpen || !searchQuery.trim()) return null;

  const query = searchQuery.toLowerCase().trim();

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.brand.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query) ||
    (p.ean && p.ean.includes(query))
  ).slice(0, 6);

  if (filtered.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center z-50">
        <p className="text-sm text-slate-500">
          No encontramos productos coincidentes con "{searchQuery}" en Neuquén Capital.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Intenta buscando por marca (ej. "Natura", "Cocinero") o categoría ("Almacén", "Bebidas").
        </p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Sugerencias instantáneas para Neuquén</span>
        <span>{filtered.length} productos</span>
      </div>

      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {filtered.map(product => {
          const analysis = analyzeProductPrices(product, observations);

          return (
            <div
              key={product.id}
              onClick={() => {
                onSelectProduct(product);
                onClose();
              }}
              className="p-3.5 hover:bg-slate-50/80 cursor-pointer flex items-center justify-between gap-4 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-11 h-11 object-cover rounded-xl bg-slate-100 shrink-0 border border-slate-200/60"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {product.brand}
                    </span>
                    <span className="text-xs text-slate-400">
                      {product.net_content_str}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                    {product.name}
                  </h4>
                  {product.ean && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      EAN: {product.ean}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-500">
                  desde <span className="font-bold text-slate-900 text-sm">{formatCurrency(analysis.min_price)}</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-medium">
                  en {analysis.best_store_name}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
