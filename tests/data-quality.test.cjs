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


test('wholesale bundles require multiples, not just the minimum quantity',()=>{
  const quote=obs({min_quantity:12,quantity_multiple:12});
  assert.equal(basket([{product,quantity:13}],[quote]).split_trip.missing_products.length,1);
  assert.equal(basket([{product,quantity:24}],[quote]).split_trip.total_optimized,2400);
});
test('bulk prices stay visible without becoming single-unit savings',()=>{
  const {analyzeProductPrices}=load('src/utils/priceAnalyzer.ts');
  const result=analyzeProductPrices(product,[obs({min_quantity:12,quantity_multiple:12,current_price:50}),obs({id:'retail',branch_id:'other',current_price:100})]);
  assert.equal(result.observations.length,2);assert.equal(result.min_price,100);assert.equal(result.max_savings_amount,0);
  const bulk=analyzeProductPrices(product,[obs({min_quantity:12,quantity_multiple:12})]);
  assert.equal(bulk.observations.length,1);assert.equal(bulk.min_price,0);
});


test('catalog index preserves analyses and never combines different products',()=>{
  const {buildCatalogIndex,compareCatalogProducts}=load('src/utils/catalogIndex.ts');
  const {analyzeProductPrices}=load('src/utils/priceAnalyzer.ts');
  const products=[product,{...product,id:'bulk'},{...product,id:'missing'}];
  const rows=[obs(),obs({product_id:'bulk',min_quantity:12,current_price:10}),obs({product_id:'missing',query_date:'2020-01-01'})];
  const index=buildCatalogIndex(products,rows);
  for(const p of products) assert.equal(JSON.stringify(index.get(p.id)),JSON.stringify(analyzeProductPrices(p,rows)));
  const sorted=[...index.values()].reverse().sort((a,b)=>compareCatalogProducts(a,b,'lowest_price'));
  assert.equal(sorted.map(a=>a.product.id).join(','),'test-product,bulk,missing');
  assert.equal(compareCatalogProducts(index.get('bulk'),index.get('bulk'),'lowest_price'),0);
});
test('cloud duplicate barcode and orphan prices are counted without corrupting local identity',()=>{
  const {localData}=load('src/services/productService.ts');
  const real=localData.products.find(p=>p.ean);
  const result=mergeCloudData([{...product,id:'duplicate-cloud',ean:real.ean},{id:'broken'}],[{id:'orphan',product_id:'duplicate-cloud',supermarket_id:'coto',regular_price:100}],[]);
  assert.equal(result.excluded.products,2);assert.equal(result.excluded.prices,1);
  assert.ok(result.message.includes('2 productos y 1 cotizaciones'));
  assert.equal(result.products.find(p=>p.ean===real.ean).id,real.id);
  assert.ok(!result.observations.some(o=>o.id==='orphan'));
});


test('store views isolate products and quotes; missing chains are empty instead of showing other stores',()=>{
  const {selectCatalogView}=load('src/utils/catalogViews.ts');
  const other={...product,id:'other'};
  const rows=[obs(),obs({product_id:'other',supermarket_id:'makro'})];
  const selected=selectCatalogView([product,other],rows,'makro','all');
  assert.equal(selected.products.length,1);assert.equal(selected.products[0].id,'other');
  assert.equal(selected.observations[0].supermarket_id,'makro');
  assert.equal(selectCatalogView([product,other],rows,'yaguar','all').products.length,0);
  assert.equal(selectCatalogView([product,other],rows,'all','wholesale').products[0].id,'other');
});
test('retail offers require an identified promotion and never include base prices or wholesale terms',()=>{
  const {isRetailOffer}=load('src/utils/catalogViews.ts');
  const offer=obs({regular_price:150,promo_label:'Oferta online'});
  assert.equal(isRetailOffer(offer),true);
  for(const change of [{promo_label:undefined},{regular_price:100},{supermarket_id:'makro'},{min_quantity:6},{promo_condition:'Tarjeta'},{query_date:'2020-01-01'}]) assert.equal(isRetailOffer({...offer,...change}),false);
});
test('alcohol and snacks are discoverable and unrelated stock images are replaced',()=>{
  const {catalogCategory,productImage}=load('src/utils/catalogViews.ts');
  assert.equal(catalogCategory({...product,name:'Vino tinto 1 L'}),'Bebidas alcohólicas');
  assert.equal(catalogCategory({...product,name:'Cerveza sin alcohol 473 ml'}),'Bebidas');
  assert.equal(catalogCategory({...product,name:'Papas fritas Lays clásicas 134g'}),'Snacks');
  assert.equal(productImage({...product,category:'Carnicería',image_url:'https://images.unsplash.com/photo-vinyl'}),'/meat-placeholder.svg');
});

 test('retired chains are absent from public coverage, map and basket even with fresh prices', () => {
  const {SUPERMARKETS_NEUQUEN} = load('src/data/supermarkets.ts');
  for (const id of ['vea', 'diarco']) {
    assert.equal(quality.ACTIVE_CHAIN_NAMES[id], undefined);
    assert.equal(SUPERMARKETS_NEUQUEN.some(b => b.supermarket_id === id), false);
    assert.equal(quality.priceIsUsable(obs({supermarket_id:id})), false);
    assert.equal(basket([{product,quantity:1}], [obs({supermarket_id:id})]).split_trip.store_groups.length, 0);
  }
  assert.equal(Object.keys(quality.ACTIVE_CHAIN_NAMES).length, 8);
 });
