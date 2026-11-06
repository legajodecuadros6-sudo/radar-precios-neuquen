const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function service(fetch){
  const exports={};
  const code=ts.transpileModule(fs.readFileSync('src/services/productService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,fetch,console:{warn(){}},Map,require(name){
    if(name.endsWith('database'))return {INITIAL_PRODUCTS:[],INITIAL_PRICE_OBSERVATIONS:[]};
    if(name.endsWith('live-prices.json'))return {products:[],observations:[]};
    if(name.endsWith('supabase'))return {supabase:null,isSupabaseConfigured:false};
    if(name.endsWith('dataQuality'))return {mergePrices:(...groups)=>groups.flat()};
    if(name.endsWith('catalogViews'))return {catalogCategory:p=>p.category,productImage:p=>p.image_url};
    throw Error(name);
  }});return exports;
}
test('production stub never masquerades as complete fallback and retry recovers',async()=>{
 let calls=0;
 const api=service(async()=>++calls===1?{ok:false}:{ok:true,json:async()=>({products:[{id:'real',name:'Real',category:'Almacén',image_url:''}],observations:[]})});
 await assert.rejects(api.fetchLiveRadarData(),/descargar/);
 const result=await api.fetchLiveRadarData();assert.equal(result.products[0].id,'real');
 await api.fetchLiveRadarData();assert.equal(calls,2);
});
test('malformed catalogue is rejected instead of cached as an empty success',async()=>{
 const api=service(async()=>({ok:true,json:async()=>({message:'error'})}));
 await assert.rejects(api.fetchLiveRadarData(),/descargar/);
});
