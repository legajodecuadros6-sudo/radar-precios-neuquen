import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { summarizeHistory } from './history-summary.mjs';
const source = new URL('../src/data/price-history.json', import.meta.url);
const target = new URL('../public/history-summary.json', import.meta.url);
const rows = JSON.parse(await readFile(source, 'utf8'));
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
const output = JSON.stringify(summarizeHistory(rows));
await writeFile(target, output);
console.log(`Histórico: ${rows.length} consultas conservadas en archivo; resumen público ${Buffer.byteLength(output)} bytes.`);
