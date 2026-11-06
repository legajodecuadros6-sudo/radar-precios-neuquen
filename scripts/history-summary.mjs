// Compact daily series; the complete source archive remains unchanged.
export function summarizeHistory(rows, now = Date.now()) {
  const days = new Map();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Salta', year: 'numeric', month: '2-digit', day: '2-digit' });
  for (const row of rows) {
    // Keep raw history untouched, omit misleading references from public charts.
    if (row.price_validation === 'pending' ||
        (row.supermarket_id === 'yaguar' && (row.price_validation !== 'local_unit_price' || !String(row.source_url || '').startsWith('https://yaguar.com.ar/neuquen/'))) ||
        (row.supermarket_id === 'coto' && row.current_price < row.regular_price)) continue;
    const time = Date.parse(row.query_date);
    if (['vea', 'diarco'].includes(row.supermarket_id) || !row.is_verified || row.is_demo || !row.branch_id || !row.product_id ||
        !Number.isFinite(time) || time > now || now - time > 91 * 86400000 ||
        !Number.isFinite(row.current_price) || row.current_price <= 0 ||
        !/^https:\/\//.test(row.source_url || '') ||
        (row.min_quantity || 1) > 1 || (row.quantity_multiple || 1) > 1 || row.promo_condition) continue;
    const day = formatter.format(new Date(time));
    if (!days.has(row.product_id)) days.set(row.product_id, new Map());
    const product = days.get(row.product_id);
    if (!product.has(day)) product.set(day, new Map());
    const branch = `${row.branch_id}|${row.channel || 'unknown'}`;
    const previous = product.get(day).get(branch);
    if (!previous || time > Date.parse(previous.query_date)) product.get(day).set(branch, row);
  }
  return Object.fromEntries([...days].map(([id, dates]) => [id,
    [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, branches]) => {
      const prices = [...branches.values()].map(row => row.current_price);
      return { date, min_price: Math.min(...prices), avg_price: prices.reduce((a, b) => a + b, 0) / prices.length };
    })
  ]));
}
