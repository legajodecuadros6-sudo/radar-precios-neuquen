import { readFile, writeFile, copyFile, mkdir, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { summarizeHistory } from './history-summary.mjs';

const historyGz = new URL('../src/data/price-history.json.gz', import.meta.url);
const historyJson = new URL('../src/data/price-history.json', import.meta.url);
const historyTarget = new URL('../public/history-summary.json', import.meta.url);
const liveSource = new URL('../src/data/live-prices.json', import.meta.url);
const livePublicDir = new URL('../public/data/', import.meta.url);
const livePublicTarget = new URL('../public/data/live-prices.json', import.meta.url);
const branchesTarget = new URL('../src/data/branches.json', import.meta.url);
const sourcesTarget = new URL('../src/data/sources.json', import.meta.url);

// 1. Process history summary
let historyRaw;
if (existsSync(historyGz)) {
  const buf = await readFile(historyGz);
  historyRaw = gunzipSync(buf).toString('utf8');
} else {
  historyRaw = await readFile(historyJson, 'utf8');
}
const historyRows = JSON.parse(historyRaw);
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
const historyOutput = JSON.stringify(summarizeHistory(historyRows));
await writeFile(historyTarget, historyOutput);
console.log(`Histórico: ${historyRows.length} consultas conservadas en archivo; resumen público ${Buffer.byteLength(historyOutput)} bytes.`);

// 2. Prepare public static data for live prices (H3 bundle optimization)
await mkdir(livePublicDir, { recursive: true });
await copyFile(liveSource, livePublicTarget);
await chmod(livePublicTarget, 0o644);



// 3. Extract lightweight branches and sources for metadata/supermarkets
const liveSnapshot = JSON.parse(await readFile(liveSource, 'utf8'));
await writeFile(branchesTarget, JSON.stringify(liveSnapshot.branches || [], null, 2));
await writeFile(sourcesTarget, JSON.stringify(liveSnapshot.sources || {}, null, 2));
console.log(`Catálogo público: copiado a public/data/live-prices.json (${liveSnapshot.products?.length || 0} productos, ${liveSnapshot.observations?.length || 0} cotizaciones).`);

