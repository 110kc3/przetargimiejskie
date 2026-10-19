import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import vm from'node:vm';
const ext=new URL('../../extension/',import.meta.url);
function worker(initial={}){
 const storage=structuredClone(initial),requests=[];let fail=false,current=0,max=0;
 const event={addListener(){}};
 const chrome={storage:{local:{async get(key){if(key===null)return structuredClone(storage);const out={};for(const k of Array.isArray(key)?key:[key])if(k in storage)out[k]=structuredClone(storage[k]);return out;},async set(v){Object.assign(storage,structuredClone(v));},async remove(keys){for(const k of keys)delete storage[k];}},onChanged:event},runtime:{onInstalled:event,onStartup:event,onMessage:event},alarms:{onAlarm:event,create(){}},notifications:{onClicked:event,create(){},clear(){}},tabs:{create(){}}};
 const catalog=JSON.parse(readFileSync(new URL('../../data/catalog.json',import.meta.url),'utf8'));
 const context=vm.createContext({chrome,URL,AbortSignal,TextEncoder,structuredClone,console:{warn(){}},setTimeout,clearTimeout,fetch:async url=>{
   requests.push(url);if(fail)throw Error('offline');current++;max=Math.max(max,current);await new Promise(r=>setTimeout(r,1));current--;
   if(url.endsWith('/catalog.json'))return{ok:true,json:async()=>structuredClone(catalog)};
   const m=/data\/([^/]+)\/(properties|active|meta|land)\.json/.exec(url);if(!m)return{ok:false,status:404};
   const city=m[1],name=m[2];let doc;try{doc=JSON.parse(readFileSync(new URL('../../data/'+city+'/'+name+'.json',import.meta.url),'utf8'));}catch{return{ok:false,status:404};}
   return{ok:true,json:async()=>structuredClone(doc)};
 }});
 context.importScripts=(...names)=>names.forEach(name=>vm.runInContext(readFileSync(new URL(name,ext),'utf8'),context));
 vm.runInContext(readFileSync(new URL('background.js',ext),'utf8'),context);
 return{storage,requests,run:code=>vm.runInContext(code,context),offline:()=>{fail=true;},max:()=>max,catalog};
}
test('first load fetches only the catalogue; a new city loads within bounded concurrency',async()=>{
 const w=worker();const empty=await w.run('getOrFetch(false)');assert.equal(empty.meta.cities.length,0);assert.equal(w.requests.length,1);
 const data=await w.run("getOrFetch(false,['jarocin'])");assert.ok(data.properties.properties.length);assert.equal(data.meta.cities[0],'jarocin');assert.ok(w.max()<=2);assert.equal(w.requests.filter(u=>u.includes('/jarocin/')).length,4);
});
test('per-city last-good cache survives failure and eviction stays bounded',async()=>{
 const w=worker();const ids=w.catalog.cities.filter(c=>c.pipeline_id).slice(0,10).map(c=>c.pipeline_id);
 for(const id of ids)await w.run('getOrFetch(false,'+JSON.stringify([id])+')');assert.equal(Object.keys(w.storage).filter(k=>k.startsWith('cache:v4:city:')).length,8);
 const id=ids.at(-1);w.offline();const data=await w.run('getOrFetch(true,'+JSON.stringify([id])+')');assert.ok(data.meta.unavailable_cities.includes(id));assert.ok(data.properties.properties.length||data.land.plots.length);
});
test('offline upgrade retains old watchlist identities and last-good city data',async()=>{
 const old={data:{properties:{properties:[{key:'gliwice|test|1|2',city:'gliwice',listings:[]}]},active:{listings:[]},meta:{cities:['gliwice'],per_city:{gliwice:{generated_at:'2026-09-01'}}}},fetched_at:1};
 const w=worker({'cache:v3:old:merged':old,watchlist:{'test|1|2':{city:'gliwice'}}});w.offline();await w.run('migrateWatchlistOnce()');assert.ok(w.storage.watchlist['gliwice|test|1|2']);
 const data=await w.run("getOrFetch(true,['gliwice'])");assert.equal(data.properties.properties[0].key,'gliwice|test|1|2');assert.equal(data.meta.catalog_stale,true);
});
test('corrected keys migrate watched properties without dropping fingerprints',async()=>{
 const w=worker({watchlist:{'torun|old|1|':{addr:'Old 1',city:'torun',last_seen_active:{auction_date:'2026-11-01',starting_price_pln:100000}}}});
 await w.run("ZGM_WATCH.migrateAliases([{key:'torun|new|1|2',legacy_keys:['torun|old|1|'],street:'New',building:'1',apt:'2',city:'torun'}])");
 assert.ok(!w.storage.watchlist['torun|old|1|']);assert.equal(w.storage.watchlist['torun|new|1|2'].last_seen_active.starting_price_pln,100000);
});
