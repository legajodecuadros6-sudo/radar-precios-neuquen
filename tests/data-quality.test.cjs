const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file,'utf8'));
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
  const exports = {}; cache.set(file,exports);
  vm.runInNewContext(code,{exports,console,URL,Date,Map,Set,require(name) {
    if (name.endsWith('/lib/supabase')) return {supabase:null,isSupabaseConfigured:false};
    let target = path.resolve(path.dirname(file),name);
    if (!path.extname(target)) target += '.ts';
    return load(target);
  }});
  return exports;
}
const quality = load('src/utils/dataQuality.ts');
const {calculateBasketOptimization: basket} = load('src/utils/basketOptimizer.ts');
const {mergeCloudData} = load('src/services/productService.ts');
const product = {id:'test-product',name:'Producto',brand:'Marca',category:'Almacén',unit_measure:'kg',net_content_number:.5,net_content_str:'500g',image_url:''};
const obs = (extra={}) => ({id:'test-observation',product_id:product.id,supermarket_id:'coto',branch_id:'coto:test-a',branch_name:'Coto A',branch_address:'Dirección A',regular_price:100,current_price:100,price_per_unit:200,unit_label:'$ / kg',query_date:new Date().toISOString(),is_verified:true,is_demo:false,source_url:'https://comercio.example/precio',channel:'store',min_quantity:1,...extra});

test('unknown supermarket never becomes Coto',()=>assert.equal(quality.mapSupermarketId('tienda-desconocida'),undefined));
test('unverified, old, invalid and future prices never enter comparisons',()=>{
  for(const override of [{is_verified:false},{is_demo:true},{branch_id:undefined},{current_price:0},{current_price:NaN},{query_date:''},{query_date:'2020-01-01'},{query_date:'2099-01-01'},{source_url:'https://supabase.com'}]) assert.equal(quality.priceIsUsable(obs(override)),false);
  assert.equal(quality.priceIsUsable(obs()),true);
});
test('different branches remain distinct and older cloud data cannot overwrite newer data',()=>{
  const newer=obs(), older=obs({current_price:90,query_date:'2020-01-01'}), other=obs({branch_id:'coto:test-b'});
  const rows=quality.mergePrices([newer,other],[older]);assert.equal(rows.length,2);assert.equal(rows[0].current_price,100);
});
test('unit price converts grams and milliliters',()=>{
  assert.equal(quality.productUnitPrice(100,{...product,unit_measure:'g',net_content_number:500}).price_per_unit,200);
  assert.equal(quality.productUnitPrice(100,{...product,unit_measure:'ml',net_content_number:250}).price_per_unit,400);
});
test('search ignores accents and accepts several words',()=>assert.equal(quality.matchesProduct({...product,name:'Azúcar blanca',brand:'Ledesma'},'ledesma azucar'),true));
test('basket cannot invent a complete store by combining branches of the same chain',()=>{
  const other={...product,id:'second'};
  const result=basket([{product,quantity:1},{product:other,quantity:1}],[obs(),obs({product_id:'second',branch_id:'coto:test-b'})]);
  assert.equal(result.cheapest_single_store,undefined);assert.equal(result.single_trip.length,2);assert.equal(result.split_trip.store_groups.length,2);assert.equal(result.split_trip.extra_savings,0);
});
test('missing prices are explicit and never appear as a free Coto item',()=>{
  const result=basket([{product,quantity:1}],[]);
  assert.equal(result.split_trip.missing_products.length,1);assert.equal(result.split_trip.store_groups.length,0);assert.equal(result.cheapest_single_store,undefined);
});
test('minimum wholesale quantity is enforced and ambiguous conditions excluded',()=>{
  assert.equal(basket([{product,quantity:1}],[obs({min_quantity:6})]).split_trip.missing_products.length,1);
  assert.equal(basket([{product,quantity:6}],[obs({min_quantity:6})]).split_trip.total_optimized,600);
  assert.equal(basket([{product,quantity:6}],[obs({promo_condition:'Tarjeta exclusiva'})]).split_trip.missing_products.length,1);
});
test('cloud adds new products, maps their prices to their own IDs and never invents verification',()=>{
  const rows=mergeCloudData([{...product,id:'cloud-new'}],[{id:'cloud-price',product_id:'cloud-new',supermarket_id:'diarco-nqn',regular_price:100,offer_price:90,updated_at:'2026-10-01'}],[{id:'diarco-nqn',brand:'Diarco',branch_name:'Neuquén',address:'Dirección'}]);
  assert.ok(rows.products.some(p=>p.id==='cloud-new'));
  const price=rows.observations.find(o=>o.id==='cloud-price');assert.equal(price.product_id,'cloud-new');assert.equal(price.supermarket_id,'diarco');assert.equal(price.is_verified,false);assert.equal(price.query_date,'2026-10-01');
});


test('official barcode products replace legacy examples in scanner catalogue',()=>{
  const {localData}=load('src/services/productService.ts');
  const snapshot=load('src/data/live-prices.json');
  for(const real of snapshot.products.filter(p=>p.ean)) {
    const matches=localData.products.filter(p=>p.ean===real.ean);
    assert.equal(matches.length,1,real.ean);
    assert.equal(matches[0].id,real.id);
  }
});
