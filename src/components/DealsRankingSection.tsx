import React, { useState } from 'react';
import { Product, PriceObservation } from '../types';
import { priceIsUsable, CHAIN_NAMES } from '../utils/dataQuality';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';

interface DealsRankingSectionProps {
  products: Product[];
  observations: PriceObservation[];
  onOpenProductDetail: (product: Product) => void;
}

export const DealsRankingSection: React.FC<DealsRankingSectionProps> = ({ products, observations, onOpenProductDetail }) => {
  const [limit, setLimit] = useState(12);
  const byId = new Map(products.map(product => [product.id, product]));
  const rows = observations.filter(o => priceIsUsable(o) && byId.has(o.product_id) && ((o.min_quantity || 1) > 1 || (o.quantity_multiple || 1) > 1));
  return <section id="ofertas-ranking" className="my-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
    <h2 className="text-2xl font-bold text-slate-900">Compras por bulto: precios y condiciones</h2>
    <p className="mt-2 text-sm text-slate-600">El precio por unidad requiere comprar la cantidad indicada. No implica un descuento frente a otros comercios. Compará el total y revisá la ficha antes de agregar unidades a tu canasta.</p>
    {!rows.length && <p className="mt-4 text-slate-600">No hay cotizaciones vigentes por bulto. Consultá los precios disponibles en el catálogo.</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.slice(0, limit).map(o => {
        const product = byId.get(o.product_id)!;
        const multiple = o.quantity_multiple || 1;
        const minimum = Math.ceil((o.min_quantity || 1) / multiple) * multiple;
        return <article key={o.id} className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-emerald-700">{CHAIN_NAMES[o.supermarket_id]}</p>
          <h3 className="mt-1 font-bold">{product.name}</h3>
          <p className="text-sm text-slate-600">{product.net_content_str} · {o.branch_name}</p>
          <p className="mt-3 font-bold">{formatCurrency(o.current_price)} por unidad</p>
          <p className="text-sm">Compra mínima: {minimum} unidades · {formatCurrency(o.current_price * minimum)}</p>
          {multiple > 1 && <p className="text-sm">Solo múltiplos de {multiple} unidades</p>}
          <p className="mt-2 text-xs text-slate-500">Consulta: {formatDateDisplay(o.query_date)}</p>
          <button type="button" onClick={() => onOpenProductDetail(product)} className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Ver ficha y fuente</button>
        </article>;
      })}
    </div>
    {rows.length > limit && <button onClick={() => setLimit(limit + 12)} className="mt-5 rounded-lg border px-4 py-2">Ver más compras por bulto</button>}
  </section>;
};
