(function(){
  let selected=null,picker=null,catalog=null;
  async function start(onSelect){
    const res=await chrome.runtime.sendMessage({type:'getCatalog'});
    if(!res?.ok)throw new Error(res?.error||'City catalogue unavailable');
    catalog=res.catalog;window.ZGM_I18N.setCatalog(catalog);
    const saved=await chrome.storage.local.get('catalog:selected');
    selected=catalog.cities.find(c=>c.pipeline_id===saved['catalog:selected'])||null;
    picker=ZGM_CATALOG.mount({container:document.getElementById('city-catalog'),catalog,
      lang:()=>window.ZGM_I18N.getLang(),selected,onSelect:async c=>{
        selected=c;
        await chrome.storage.local.set({'catalog:selected':c.pipeline_id||null});
        await onSelect(c);
      }});
    window.ZGM_I18N.onChange(()=>picker.refresh());
    if(catalog.cache_stale)document.getElementById('catalog-selection').textContent+=(window.ZGM_I18N.getLang()==='en'?' · Cached catalogue; source status may be stale.':' · Katalog z pamięci; stan źródła może być nieaktualny.');
    if(selected)await onSelect(selected);
  }
  function populateLoadedFilters(city){
    for(const [id,value,text]of [['filter-city',city.pipeline_id,city.label],['filter-woj',city.voivodeship,window.ZGM_I18N.t('woj.'+city.voivodeship)]]){
      const select=document.getElementById(id);if(!select)continue;
      select.replaceChildren(new Option(window.ZGM_I18N.t('archive.filter.all'),'all'),new Option(text,value));select.value='all';
    }
  }
  window.ZGM_CITY_VIEW={start,selected:()=>selected,populateLoadedFilters};
})();
