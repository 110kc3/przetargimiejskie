// Shared, dependency-free catalogue search used by the extension and website.
(function(root){
  const STATUS={pl:{monitored:'Monitorowane',unavailable:'Tymczasowo niedostępne — zachowane dane',empty:'Brak bieżących aukcji w sprawdzonym źródle',unknown:'Stan źródła nieznany',unresearched:'Jeszcze niezbadane',not_monitored:'Brak aktywnego monitoringu'},en:{monitored:'Monitored',unavailable:'Temporarily unavailable — retained data',empty:'No current auctions in the checked source',unknown:'Source status unknown',unresearched:'Not yet researched',not_monitored:'Monitoring not enabled'}};
  const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/ł/g,'l').toLowerCase();
  const status=(c,lang='pl')=>(STATUS[lang]||STATUS.pl)[c.status]||c.status;
  const label=c=>`${c.label} · ${c.powiat} · ${c.voivodeship}`;
  function search(cities,q='',woj='all'){
    const tokens=fold(q).split(/\s+/).filter(Boolean);
    return cities.filter(c=>(woj==='all'||c.voivodeship===woj)&&tokens.every(t=>fold(label(c)).includes(t)))
      .sort((a,b)=>Number(b.searchable)-Number(a.searchable)||a.label.localeCompare(b.label,'pl')||a.simc.localeCompare(b.simc));
  }
  async function mapLimit(items,limit,fn){
    const out=new Array(items.length);let cursor=0;
    await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i);}}));return out;
  }
  function mount({container,catalog,onSelect,lang=()=> 'pl',selected=null}){
    const section=document.createElement('section');section.className='city-catalog';section.setAttribute('aria-label','Katalog miast / City catalogue');
    const heading=document.createElement('h2');const searchBox=document.createElement('input');searchBox.type='search';searchBox.setAttribute('aria-label','Szukaj miasta / Search cities');
    const woj=document.createElement('select');woj.setAttribute('aria-label','Województwo / Region');
    const option=document.createElement('option');option.value='all';option.textContent='Wszystkie województwa / All regions';woj.append(option);
    for(const v of [...new Set(catalog.cities.map(c=>c.voivodeship))].sort()){const o=document.createElement('option');o.value=v;o.textContent=v;woj.append(o);}
    const count=document.createElement('p');count.setAttribute('aria-live','polite');const list=document.createElement('div');list.className='catalog-results';
    const more=document.createElement('button');more.type='button';const state=document.createElement('p');state.id='catalog-selection';state.setAttribute('aria-live','polite');
    section.append(heading,searchBox,woj,count,list,more,state);container.replaceChildren(section);
    let max=20,expanded=!selected;
    function showState(c){
      selected=c;const en=lang()==='en';
      state.textContent=c?`${label(c)} — ${status(c,lang())}${c.last_success_at?` · ${en?'Source checked':'Sprawdzono źródło'}: ${c.last_success_at.slice(0,10)}`:''}${c.searchable?` · ${en?'In-page overlay':'Nakładka na stronie urzędu'}: ${c.overlay?(en?'available':'dostępna'):(en?'not supported':'brak')}`:''}`:'';
    }
    function render(){
      const en=lang()==='en';heading.textContent=en?'City catalogue':'Katalog miast';searchBox.placeholder=en?'City or county name':'Nazwa miasta lub powiatu';
      const rows=search(catalog.cities,searchBox.value,woj.value);count.textContent=`${rows.length} / ${catalog.cities.length} ${en?'cities · choose one to load its data':'miast · wybierz miasto, aby wczytać dane'}`;
      if(catalog.cache_stale)count.textContent+=en?' · Cached catalogue; source status may be stale.':' · Katalog z pamięci; stan źródeł może być nieaktualny.';
      if(catalog.inventory_incomplete)count.textContent+=en?' · Partial legacy catalogue.':' · Niepełny katalog z poprzedniej wersji.';
      list.replaceChildren();
      for(const c of rows.slice(0,max)){
        const button=document.createElement('button');button.type='button';button.className='catalog-city';button.dataset.city=c.id;
        const name=document.createElement('strong');name.textContent=label(c);const detail=document.createElement('span');detail.textContent=status(c,lang());
        button.append(name,detail);button.addEventListener('click',()=>{showState(c);expanded=false;render();Promise.resolve(onSelect(c)).catch(err=>{state.textContent=`${status({status:'unavailable'},lang())}: ${err.message}`;});});list.append(button);
      }
      list.hidden=!expanded;more.hidden=!expanded||rows.length<=max;more.textContent=en?'Show more cities':'Pokaż kolejne miasta';showState(selected);
    }
    searchBox.addEventListener('input',()=>{max=20;expanded=true;render();});searchBox.addEventListener('focus',()=>{expanded=true;render();});woj.addEventListener('change',()=>{max=20;expanded=true;render();});more.addEventListener('click',()=>{max+=20;render();});render();
    return {refresh:render,select:c=>{showState(c);expanded=false;render();}};
  }
  root.ZGM_CATALOG={search,status,label,mapLimit,mount};
})(globalThis);
