import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import vm from'node:vm';
import {buildCityCatalog} from '../src/core/city-catalog.js';
const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
test('official compact catalogue includes every enabled city independent of SEO eligibility',()=>{
 const manifest=read('spikes/master-cities.json'),index=read('data/index.json');const c=buildCityCatalog(manifest,index,{now:new Date('2026-10-18T12:00:00Z')});
 assert.equal(c.cities.length,1026);const pending=index.cities.filter(c=>!c.last_successful_source_check_at&&!(c.unique_properties||c.land_plots||c.wykaz_entries));assert.equal(c.cities.filter(c=>c.searchable).length,index.cities.length-pending.length);assert.equal(c.cities.filter(c=>c.pending_first_publish).length,pending.length);
 assert.equal(new Set(c.cities.map(c=>c.simc)).size,1026);
 assert.ok(c.cities.some(c=>c.searchable&&!c.seo_indexable));
 assert.ok(c.cities.filter(c=>!c.searchable).every(c=>c.active_auctions===null&&c.land_plots===null));
 const duplicate=c.cities.filter(c=>c.label==='Nowa Wieś');if(duplicate.length>1)assert.ok(new Set(duplicate.map(c=>c.powiat)).size>1);
});
test('stale, failed, valid empty and land-only feeds stay distinct',()=>{
 const manifest={cities:['a','b','c','d','e'].map((id,i)=>({id,label:id,pipeline_id:id,voivodeship:'x',official:{simc:String(i),powiat_name:'p',effective_date:'2026-01-01'},lifecycle:{research:'surveyed'}}))};
 const base={coverage_status:'monitored',last_successful_source_check_at:'2026-10-18T10:00:00Z',active_auctions:0,archived_auctions:0,unique_properties:0,land_plots:0};
 const index={cities:[{...base,id:'a',land_plots:1,monitored_assets:['land']},{...base,id:'b',coverage_status:'valid_empty'},{...base,id:'c',last_refresh_status:'failed'},{...base,id:'d',last_successful_source_check_at:'2026-09-01'}]};
 const c=buildCityCatalog(manifest,index,{now:new Date('2026-10-18T12:00:00Z'),landByCity:{a:{plots:[{listings:[{date:'2026-11-01',outcome:'active'}]}]},b:{plots:[]}}});
 assert.deepEqual(c.cities.map(c=>c.status),['monitored','empty','unavailable','unavailable','not_monitored']);assert.equal(c.cities[0].land_active,1);assert.equal(c.cities[0].searchable,true);
});
test('a registered adapter that never published is pending, unfetchable and not reported as retained data',()=>{
 const manifest={cities:['a','b'].map((id,i)=>({id,label:id,pipeline_id:id,voivodeship:'x',official:{simc:String(i),powiat_name:'p',effective_date:'2026-01-01'},lifecycle:{research:'surveyed'}}))};
 const published={coverage_status:'monitored',last_successful_source_check_at:'2026-10-18T10:00:00Z',active_auctions:1,archived_auctions:0,unique_properties:1,land_plots:0};
 const neverPublished={coverage_status:'degraded',last_successful_source_check_at:null,last_refresh_status:'failed',active_auctions:0,archived_auctions:0,unique_properties:0,land_plots:0};
 const c=buildCityCatalog(manifest,{cities:[{...published,id:'a'},{...neverPublished,id:'b'}]},{now:new Date('2026-10-18T12:00:00Z')});
 const [a,b]=c.cities;
 assert.equal(a.status,'monitored');assert.equal(a.pending_first_publish,false);
 assert.equal(b.status,'not_monitored');assert.equal(b.pending_first_publish,true);assert.equal(b.pipeline_id,null);assert.equal(b.registered_adapter,'b');
 assert.equal(b.searchable,false);assert.equal(b.seo_indexable,false);assert.equal(b.active_auctions,null);
});
test('search disambiguates duplicate names and bounds synthetic work without loading histories',()=>{
 const ctx=vm.createContext({});vm.runInContext(readFileSync(new URL('../../extension/catalog.js',import.meta.url),'utf8'),ctx);
 const cities=Array.from({length:5000},(_,i)=>({id:'city-'+i,simc:String(i),label:'Nowa Wieś',powiat:i%2?'powiat A':'powiat B',voivodeship:i%2?'slaskie':'opolskie',searchable:i<121}));
 assert.equal(ctx.ZGM_CATALOG.search(cities,'Nowa Wies powiat A','slaskie').length,2500);assert.equal(ctx.ZGM_CATALOG.search(cities,'nieistniejące').length,0);
});
