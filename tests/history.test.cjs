const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const now = Date.parse('2026-11-01T15:00:00Z');
const row = extra => ({product_id:'p',branch_id:'a',channel:'store',query_date:'2026-10-31T12:00:00Z',is_verified:true,is_demo:false,current_price:100,source_url:'https://source.example/product',...extra});

test('daily digest keeps the latest quote per branch and channel in Argentina time', async () => {
  const {summarizeHistory} = await import('../scripts/history-summary.mjs');
  const result = summarizeHistory([row({}), row({current_price:120,query_date:'2026-10-31T18:00:00Z'}),row({branch_id:'b',current_price:80}),row({channel:'online',current_price:160}),row({current_price:90,query_date:'2026-11-01T01:00:00Z'})],now);
  assert.deepEqual(result.p,[{date:'2026-10-31',min_price:80,avg_price:110}]);
});
test('digest excludes invalid, demo, future, old and conditional wholesale quotes without mutating archive',async()=>{
  const {summarizeHistory} = await import('../scripts/history-summary.mjs');
  const rows = [row({}), ...[{is_demo:true},{is_verified:false},{query_date:'2099-01-01'},{query_date:'2020-01-01'},{current_price:0},{min_quantity:12},{quantity_multiple:6},{promo_condition:'tarjeta'},{source_url:''},{branch_id:''}].map(row)];
  const before=JSON.stringify(rows);
  assert.deepEqual(summarizeHistory(rows,now),{p:[{date:'2026-10-31',min_price:100,avg_price:100}]});
  assert.equal(JSON.stringify(rows),before);
});
function service(fetch) {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync('src/services/historyService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(source,{exports,fetch});return exports;
}
test('history is lazy, shares concurrent requests and distinguishes missing products from failures',async()=>{
  let calls=0;
  const api=service(async()=>{calls++;return {ok:true,json:async()=>({p:[{date:'2026-10-31',min_price:100,avg_price:100}]})};});
  assert.equal(calls,0);
  const [a,b]=await Promise.all([api.recordedHistory('p'),api.recordedHistory('missing')]);
  assert.equal(calls,1);assert.equal(a[0].min_price,100);assert.equal(b.length,0);
});
test('failed or malformed history can be retried, never silently becomes empty history',async()=>{
  let calls=0;
  const api=service(async()=>{calls++;return calls===1?{ok:false}:{ok:true,json:async()=>calls===2?{p:[{date:'bad',min_price:-1}]}:{}};});
  await assert.rejects(api.recordedHistory('p'));
  await assert.rejects(api.recordedHistory('p'));
  assert.equal((await api.recordedHistory('p')).length,0);assert.equal(calls,3);
});

test('public history excludes unresolved regional offers while preserving raw archive',async()=>{
 const {summarizeHistory}=await import('../scripts/history-summary.mjs');
 const rows=[row({supermarket_id:'coto',regular_price:150}),row({supermarket_id:'yaguar'}),row({price_validation:'pending'})];
 const saved=JSON.stringify(rows);
 assert.deepEqual(summarizeHistory(rows,now),{});assert.equal(JSON.stringify(rows),saved);
});
