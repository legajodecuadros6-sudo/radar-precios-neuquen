import { PriceHistoryPoint } from '../types';
let pending: Promise<Record<string, PriceHistoryPoint[]>> | undefined;

export async function recordedHistory(productId: string): Promise<PriceHistoryPoint[]> {
  if (!pending) {
    pending = fetch('/history-summary.json', { cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error('No se pudo cargar el histórico');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Histórico inválido');
      for (const points of Object.values(data)) {
        if (!Array.isArray(points) || points.some(p => !p || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(p.min_price) || p.min_price <= 0 || !Number.isFinite(p.avg_price) || p.avg_price < p.min_price)) throw new Error('Histórico inválido');
      }
      return data as Record<string, PriceHistoryPoint[]>;
    }).catch(error => { pending = undefined; throw error; });
  }
  const data = await pending;
  return Object.prototype.hasOwnProperty.call(data, productId) ? data[productId] : [];
}
