import React from 'react';
import { PriceObservation, SupermarketId } from '../types';
import { CHAIN_NAMES, priceIsUsable } from '../utils/dataQuality';
import { formatDateDisplay } from '../utils/formatters';
import snapshot from '../data/live-prices.json';

export function CoveragePanel({ observations }: { observations: PriceObservation[] }) {
  const active = observations.filter(o => priceIsUsable(o));
  const expired = snapshot.observations.filter(o => o.is_verified && !o.is_demo && Date.now() - Date.parse(o.query_date) > 72 * 3600 * 1000);
  const chains = new Set(active.map(o => o.supermarket_id));
  return <details className="mb-4 rounded-2xl border border-slate-200 bg-white p-4" open>
    <summary className="cursor-pointer font-bold text-slate-800">Cobertura real: {chains.size} de 9 cadenas con precios vigentes</summary>
    <p className="my-2 text-xs text-slate-500">Los precios sin fuente suficiente o con más de 72 horas no participan en las comparaciones. La conexión a una base no garantiza precios actualizados.</p>
    {expired.length > 0 && <p role="status" className="my-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">Hay {expired.length} cotizaciones vencidas en {new Set(expired.map(o => o.supermarket_id)).size} cadena(s). Se excluyen de los totales hasta que se actualicen. La cobertura puede estar incompleta.</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
      {Object.entries(CHAIN_NAMES).map(([id, name]) => {
        const rows = active.filter(o => o.supermarket_id === id);
        const dates = rows.map(o => o.query_date).sort();
        const source = snapshot.sources[id as keyof typeof snapshot.sources];
        return <div key={id} className={`rounded-xl border p-3 ${rows.length ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
          <h3 className="font-bold text-xs text-slate-800">{name}</h3>
          <p className="text-xs mt-1 text-slate-600">{rows.length ? `${new Set(rows.map(o => o.product_id)).size} productos · ${new Set(rows.map(o => o.branch_id)).size} sucursal(es)` : 'Sin precios verificados'}</p>
          {dates.length > 0 && <p className="text-[11px] mt-1 text-slate-500">Última consulta: {formatDateDisplay(dates[dates.length - 1])}</p>}
          {(source?.status === 'error' || source?.status === 'partial') && <p className="mt-1 text-[11px] text-amber-700">Última actualización incompleta; revisá la fecha de cada precio</p>}
        </div>;
      })}
    </div>
  </details>;
}
