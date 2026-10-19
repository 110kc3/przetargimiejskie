// Service worker:
//   - fetches per-city data/<city>/{properties,active,meta}.json from GitHub
//     for every city in CITIES, merges them into a single payload the popup
//     consumes as a flat list (with each record city-tagged + key-namespaced)
//   - chrome.alarms periodic check: re-fetches, diffs merged active.json
//     against the user's watchlist, and fires chrome.notifications for any
//     newly-active watched property
//   - notification click → opens the property detail page
//
// Multi-city note: the pipeline's data files keep their original
// `street|building|apt` keys; namespacing to `city|street|building|apt` happens
// here at merge time so the extension can mix cities without collisions. A
// one-shot migration upgrades any legacy un-namespaced watchlist entries.

// The watchlist module exposes globalThis.ZGM_WATCH when imported below.
importScripts('watchlist.js', 'catalog.js');

const REPO = '110kc3/przetargimiejskie';
const BRANCH = 'main';
const CATALOG_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data/catalog.json`;
let CITIES = [];
const RAW = (city) =>
  `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data/${city}`;
// Notification-click fallback targets when a watchlist entry has no
// detail_url (legacy entries) — per-city source home, then the project site.
const PROJECT_HOME = 'https://przetargimiejskie.pl/';
const CITY_HOME = {
  gliwice: 'https://zgm-gliwice.pl/',
  katowice: 'https://bip.katowice.eu/',
  bytom: 'https://www.bytom.pl/bip',
  zabrze: 'https://bip.miastozabrze.pl/',
  sosnowiec: 'https://www.bip.um.sosnowiec.pl/',
  rybnik: 'https://bip.zgm.rybnik.pl/',
  bielsko: 'https://bielsko-biala.pl/gielda-nieruchomosci',
  myslowice: 'https://bip.myslowice.pl/',
  swietochlowice: 'https://bip.swietochlowice.pl/',
};
const TTL_MS = 6 * 60 * 60 * 1000;       // 6h soft TTL for ad-hoc reads
const ALARM_NAME = 'zgm-watchlist-check';
const ALARM_INTERVAL_MIN = 240;          // 4h periodic watchlist scan

const CACHE_PREFIX = 'cache:v4:city:';
const CATALOG_KEY = 'cache:v4:catalog';
const MAX_CACHED_CITIES = 8;
const MAX_CITY_CACHE_BYTES = 6 * 1024 * 1024;
const inflight = new Map();
let cacheQueue = Promise.resolve();
const MIGRATION_FLAG = 'watchlist:migrated_v2';

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function loadFromCache(key) {
  const v = await chrome.storage.local.get(key);
  return v[key];
}

async function saveToCache(key, payload) {
  await chrome.storage.local.set({ [key]: payload });
}

// ---------------- merging ----------------

function nsKey(city, key) {
  if (!key) return key;
  // Already namespaced (looks like "<city>|...") — leave as-is.
  if (key.startsWith(`${city}|`)) return key;
  return `${city}|${key}`;
}

// Mutates each property to (a) prefix `key` with its city and (b) carry a
// `city` field. Returns the same array for chaining.
function namespaceProperties(properties, city) {
  for (const p of properties) {
    p.key = nsKey(city, p.key);
    p.city = city;
    if (p.legacy_keys) p.legacy_keys = p.legacy_keys.map(key => nsKey(city, key));
  }
  return properties;
}

function namespaceActiveListings(listings, city) {
  for (const l of listings) {
    if (l.address && l.address.key) {
      l.address.key = nsKey(city, l.address.key);
    }
    l.city = city;
  }
  return listings;
}

// Land plots keep their own parcel keys (dz|… / street|building| / addr|…);
// namespace them by city the same way as properties so cities can't collide.
function namespaceLandPlots(plots, city) {
  for (const p of plots) {
    p.key = nsKey(city, p.key);
    p.city = city;
  }
  return plots;
}

// Builds the merged payload the popup/archive consume. Each city contributes
// its own three JSONs; key namespacing happens here.
function mergeCityPayloads(cityPayloads) {
  const allProperties = [];
  const allActive = [];
  const allWykaz = [];
  const allLand = [];
  const perCityMeta = {};
  let totalSourcePdfs = 0;
  let totalUnique = 0;
  let totalActive = 0;
  let totalWykaz = 0;
  let latestGenerated = null;

  for (const { city, properties, active, meta, land } of cityPayloads) {
    const props = properties?.properties || [];
    namespaceProperties(props, city);
    allProperties.push(...props);

    const listings = active?.listings || [];
    namespaceActiveListings(listings, city);
    allActive.push(...listings);

    const wykaz = active?.wykaz || [];
    for (const w of wykaz) w.city = city;
    allWykaz.push(...wykaz);

    const plots = land?.plots || [];
    namespaceLandPlots(plots, city);
    allLand.push(...plots);

    perCityMeta[city] = meta || null;
    totalSourcePdfs += meta?.source_pdf_count ?? 0;
    totalUnique += meta?.unique_properties ?? props.length;
    totalActive += meta?.active_listings ?? listings.length;
    totalWykaz += meta?.wykaz_entries ?? wykaz.length;
    if (meta?.generated_at) {
      if (!latestGenerated || meta.generated_at > latestGenerated) {
        latestGenerated = meta.generated_at;
      }
    }
  }

  // Mirror the legacy shape the popup/archive already expect:
  //   payload.properties.properties = [...]
  //   payload.active.listings       = [...]
  //   payload.active.wykaz          = [...]
  //   payload.meta                  = { ...aggregates, per_city }
  return {
    properties: {
      schema_version: 1,
      properties: allProperties,
    },
    active: {
      schema_version: 1,
      listings: allActive,
      wykaz: allWykaz,
    },
    land: {
      schema_version: 1,
      plots: allLand,
    },
    meta: {
      schema_version: 1,
      generated_at: latestGenerated,
      source_pdf_count: totalSourcePdfs,
      unique_properties: totalUnique,
      active_listings: totalActive,
      wykaz_entries: totalWykaz,
      cities: cityPayloads.map(p => p.city),
      per_city: perCityMeta,
    },
  };
}

async function getCatalog(force = false) {
  const cached = await loadFromCache(CATALOG_KEY);
  if (!force && cached && Date.now() - cached.fetched_at < TTL_MS) return cached.data;
  try {
    const data = await fetchJson(CATALOG_URL);
    if (data.schema_version !== 1 || !Array.isArray(data.cities) || !data.cities.length
        || data.cities.some(c => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)
          || (c.pipeline_id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.pipeline_id)))) throw new Error('invalid city catalogue');
    await saveToCache(CATALOG_KEY,{data,fetched_at:Date.now()});
    return data;
  } catch (err) {
    if (cached) return {...cached.data, cache_stale:true};
    const old=Object.entries(await chrome.storage.local.get(null)).find(([key,value])=>key.startsWith('cache:v3:')&&value?.data?.meta?.cities?.length)?.[1];
    if(old)return {schema_version:1,cache_stale:true,inventory_incomplete:true,cities:old.data.meta.cities.map(id=>({id,simc:id,label:id,voivodeship:'',powiat:'',pipeline_id:id,searchable:true,status:'unavailable',overlay:false,host:null}))};
    throw err;
  }
}

async function cacheCity(city, data) {
  // Serialise eviction so concurrent fetches cannot resurrect evicted entries.
  const task = cacheQueue.then(async () => {
    const all = await chrome.storage.local.get(null);
    const key=CACHE_PREFIX+city;
    const value={data,fetched_at:Date.now(),used_at:Date.now()};
    const candidates=Object.entries({...all,[key]:value}).filter(([k])=>k.startsWith(CACHE_PREFIX))
      .sort((a,b)=>(b[1].used_at||b[1].fetched_at)-(a[1].used_at||a[1].fetched_at));
    const keep=new Set();let size=0;
    for(const [k,v]of candidates){
      const bytes=new TextEncoder().encode(JSON.stringify(v)).byteLength+k.length;
      if(keep.size<MAX_CACHED_CITIES && size+bytes<=MAX_CITY_CACHE_BYTES){keep.add(k);size+=bytes;}
    }
    const remove=Object.keys(all).filter(k=>(k.startsWith(CACHE_PREFIX)&&!keep.has(k))
      || (k.startsWith('cache:v')&&!k.startsWith('cache:v4:')));
    // Evict before setting the new item so Chrome's storage quota is respected.
    if(remove.length)await chrome.storage.local.remove(remove);
    if(keep.has(key))await saveToCache(key,value);
  });
  cacheQueue=task.catch(()=>{});
  return task;
}

async function fetchCity(city, force = false) {
  let cached = await loadFromCache(CACHE_PREFIX + city);
  if(!cached){
    const old=Object.entries(await chrome.storage.local.get(null)).find(([key,value])=>key.startsWith('cache:v3:')&&value?.data?.meta?.cities?.includes(city))?.[1];
    if(old){
      const data=old.data;
      cached={fetched_at:old.fetched_at,data:{city,
        properties:{properties:(data.properties?.properties||[]).filter(p=>p.city===city)},
        active:{listings:(data.active?.listings||[]).filter(l=>l.city===city),wykaz:(data.active?.wykaz||[]).filter(l=>l.city===city)},
        land:{plots:(data.land?.plots||[]).filter(p=>p.city===city)},meta:data.meta.per_city?.[city]||null}};
      await saveToCache(CACHE_PREFIX+city,cached);
    }
  }
  if (!force && cached && Date.now()-cached.fetched_at<TTL_MS) {
    const touch=cacheQueue.then(async()=>{const current=await loadFromCache(CACHE_PREFIX+city);if(current)await saveToCache(CACHE_PREFIX+city,{...current,used_at:Date.now()});});
    cacheQueue=touch.catch(()=>{});await touch;
    return structuredClone(cached.data);
  }
  if(inflight.has(city)) return structuredClone(await inflight.get(city));
  const task=(async()=>{
    const base=RAW(city);
    try {
      const [properties,active,meta,land] = await ZGM_CATALOG.mapLimit(
        ['properties','active','meta','land'],2, name=>fetchJson(`${base}/${name}.json`));
      if(!Array.isArray(properties.properties)||!Array.isArray(active.listings)||!Array.isArray(land.plots)) throw new Error('invalid city data');
      const data={city,properties,active,meta,land};await cacheCity(city,data);return data;
    }catch(err){
      console.warn(`[ZGM ext] city ${city}: ${err.message}`);
      return cached ? {...structuredClone(cached.data),cache_stale:true} : {city,error:String(err)};
    }
  })();
  inflight.set(city,task);
  try{return structuredClone(await task);}finally{inflight.delete(city);}
}

async function getOrFetch(force = false, requested = [], senderUrl = null, includeWatches = false) {
  const catalog = await getCatalog(force);
  CITIES = catalog.cities.filter(c=>c.pipeline_id).map(c=>c.pipeline_id);
  const selection = await chrome.storage.local.get('catalog:selected');
  let ids = requested.length ? requested : selection['catalog:selected'] ? [selection['catalog:selected']] : [];
  if(senderUrl && !requested.length){
    const host=new URL(senderUrl).hostname.replace(/^www\./,'');
    const match=catalog.cities.find(c=>c.host?.replace(/^www\./,'')===host);
    if(match?.pipeline_id) ids=[match.pipeline_id];
  }
  if(includeWatches){const watches=await ZGM_WATCH.getAll();ids=Object.keys(watches).map(k=>k.split('|')[0]);}
  ids=[...new Set(ids)].filter(id=>CITIES.includes(id));
  // UI selections are one city; alarm checks visit watched cities in bounded
  // batches, with only the eight most recent city payloads retained on disk.
  if(!includeWatches && ids.length>1) throw new Error('select one city');
  const results=await ZGM_CATALOG.mapLimit(ids,2,id=>fetchCity(id,force));
  const available=results.filter(r=>!r.error);
  const merged=mergeCityPayloads(available);
  merged.meta.requested_cities=ids;
  merged.meta.unavailable_cities=results.filter(r=>r.error||r.cache_stale).map(r=>r.city);
  merged.meta.catalog_stale=Boolean(catalog.cache_stale);
  await ZGM_WATCH.migrateAliases(merged.properties.properties);
  merged.catalog=catalog;
  return {...merged,fetched_at:Date.now()};
}

// ---------------- watchlist migration ----------------

// One-shot upgrade for keys saved by the pre-merge extension. Legacy keys
// look like "street|building|apt" (2 pipes); namespaced keys look like
// "city|street|building|apt" (3 pipes). Anything with <3 pipes is assumed to
// be a Gliwice entry (the only city that existed when those keys were saved).
async function migrateWatchlistOnce() {
  try {
    const flag = (await chrome.storage.local.get(MIGRATION_FLAG))[MIGRATION_FLAG];
    if (flag) return;
    const all = await ZGM_WATCH.getAll();
    let changed = false;
    const next = {};
    for (const [key, entry] of Object.entries(all)) {
      const pipes = (key.match(/\|/g) || []).length;
      if (pipes < 3) {
        const newKey = `gliwice|${key}`;
        next[newKey] = entry;
        changed = true;
      } else {
        next[key] = entry;
      }
    }
    if (changed) {
      await chrome.storage.local.set({ watchlist: next });
    }
    await chrome.storage.local.set({ [MIGRATION_FLAG]: true });
  } catch (err) {
    console.warn('[ZGM bg] watchlist migration skipped:', err);
  }
}

// ---------------- watchlist diff + notifications ----------------

function activeFingerprint(listing) {
  return {
    auction_date: listing.auction_date,
    starting_price_pln: listing.starting_price_pln,
  };
}

function sameFingerprint(a, b) {
  if (!a || !b) return false;
  return (
    a.auction_date === b.auction_date &&
    a.starting_price_pln === b.starting_price_pln
  );
}

function fmtPLN(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) + ' zł';
}

// notif:registry maps a notification id → the URL its click should open. Three
// writers mutate it (notifyNewListing, notifyReminder, onClicked); a bare
// read-modify-write lets a click's write-back clobber URLs a concurrent alarm
// scan just added. Chain every mutation through one promise so they serialize.
let _regQueue = Promise.resolve();
function mutateRegistry(fn) {
  _regQueue = _regQueue
    .then(async () => {
      const reg = (await chrome.storage.local.get('notif:registry'))['notif:registry'] || {};
      await fn(reg);
      await chrome.storage.local.set({ 'notif:registry': reg });
    })
    .catch((err) => console.warn('[ZGM bg] registry mutation failed:', err));
  return _regQueue;
}

async function notifyNewListing(key, entry, listing) {
  const id = `zgm-watch-${key}-${listing.auction_date || 'now'}`;
  await mutateRegistry((reg) => {
    reg[id] = entry.detail_url || CITY_HOME[entry.city] || PROJECT_HOME;
  });

  // PL strings (the app's default). City prefix helps disambiguate now that
  // notifications can fire for any of CITIES.
  const cityLabel = entry.city ? ` [${entry.city}]` : '';
  const title = `przetargimiejskie${cityLabel} — nowa aukcja obserwowanej nieruchomości`;
  const body = `${entry.addr} — aukcja ${listing.auction_date || '?'} po ${fmtPLN(listing.starting_price_pln)}`;
  await chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message: body,
    priority: 2,
  });
}

// ---------------- deadline reminders (wadium / auction day) ----------------

// Europe/Warsaw civil date (YYYY-MM-DD) — same rationale as popup.js: UTC
// "today" flips 1-2 h late, which matters for "is the deadline tomorrow?".
function todayWarsaw() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** Whole days from `today` (YYYY-MM-DD) to `dateISO`; null when unparsable. */
function daysUntil(dateISO, today) {
  const a = Date.parse(dateISO);
  const b = Date.parse(today);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((a - b) / 86400000);
}

/**
 * Which reminders are due for one watched listing. A reminder is due in the
 * [day-before, day-of] window — one notification per deadline (the id embeds
 * the deadline date, and `sent` dedupes), so catching it on the day itself
 * (e.g. the browser was closed yesterday) still works without double-firing.
 * Pure (exported for tests via globalThis below).
 * @param {{auction_date?:string, wadium_deadline?:string}} listing
 * @param {string} today  YYYY-MM-DD (Warsaw)
 * @returns {Array<{type:'wadium'|'auction', date:string}>}
 */
function dueReminders(listing, today) {
  const out = [];
  for (const [type, date] of [
    ['wadium', listing.wadium_deadline],
    ['auction', listing.auction_date],
  ]) {
    if (!date) continue;
    const d = daysUntil(date, today);
    if (d != null && d >= 0 && d <= 1) out.push({ type, date });
  }
  return out;
}

const REMIND_KEY = 'remind:sent';

async function notifyReminder(key, entry, listing, reminder) {
  const id = `zgm-remind-${key}-${reminder.type}-${reminder.date}`;
  const sent = (await chrome.storage.local.get(REMIND_KEY))[REMIND_KEY] || {};
  if (sent[id]) return;

  await mutateRegistry((reg) => {
    reg[id] = listing.detail_url || entry.detail_url || CITY_HOME[entry.city] || PROJECT_HOME;
  });

  const cityLabel = entry.city ? ` [${entry.city}]` : '';
  const today = todayWarsaw();
  const when = reminder.date === today ? 'dziś' : `jutro (${reminder.date})`;
  const title =
    reminder.type === 'wadium'
      ? `przetargimiejskie${cityLabel} — przypomnienie: wadium`
      : `przetargimiejskie${cityLabel} — przypomnienie: aukcja`;
  const body =
    reminder.type === 'wadium'
      ? `${entry.addr} — termin wpłaty wadium mija ${when}.` +
        (listing.auction_date ? ` Aukcja ${listing.auction_date}.` : '')
      : `${entry.addr} — aukcja ${when}` +
        (listing.starting_price_pln != null ? ` od ${fmtPLN(listing.starting_price_pln)}.` : '.');
  await chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message: body,
    priority: 2,
  });

  // Record + prune: drop entries whose deadline date is >14 days past, so the
  // sent-set can't grow forever.
  sent[id] = reminder.date;
  const cutoff = daysUntil; // alias for clarity below
  for (const [sid, sdate] of Object.entries(sent)) {
    const d = cutoff(today, sdate); // days from sdate to today
    if (d != null && d > 14) delete sent[sid];
  }
  await chrome.storage.local.set({ [REMIND_KEY]: sent });
}

async function runWatchlistCheck() {
  await migrateWatchlistOnce();
  if(!Object.keys(await ZGM_WATCH.getAll()).length)return;
  let payload;
  try {
    payload = await getOrFetch(true, [], null, true);
  } catch (err) {
    console.warn('[ZGM bg] watchlist check skipped — fetch failed:', err);
    return;
  }
  const watchlist = await ZGM_WATCH.getAll();
  if (Object.keys(watchlist).length === 0) return;

  const propsByKey = new Map(
    (payload.properties?.properties || []).flatMap(p => [[p.key,p],...(p.legacy_keys||[]).map(k=>[k,p])]),
  );
  const today = todayWarsaw();
  // active.json listings carry the dates the reminders need (wadium_deadline
  // lives ONLY here — the merged property listings don't have it). When a key
  // has several active rows (re-list / duplicate board post), prefer the
  // soonest still-upcoming auction so reminders track the next real event
  // rather than whichever row happened to be first.
  const activeByKey = new Map();
  const reminderRank = (l) => {
    const d = l.auction_date || '';
    if (!d) return [2, ''];               // undated → lowest priority
    return d >= today ? [0, d] : [1, d];  // upcoming before past
  };
  for (const l of payload.active?.listings || []) {
    const k = l.address?.key;
    if (!k) continue;
    const prev = activeByKey.get(k);
    if (!prev) { activeByKey.set(k, l); continue; }
    const [pr, pd] = reminderRank(prev);
    const [nr, nd] = reminderRank(l);
    if (nr < pr || (nr === pr && nd && (!pd || nd < pd))) activeByKey.set(k, l);
  }

  for (const [key, entry] of Object.entries(watchlist)) {
    if (payload.meta.unavailable_cities.includes(key.split('|')[0])) continue;
    const prop = propsByKey.get(key);
    const active = prop?.listings?.find((l) => l.outcome === 'active');
    if (!active) {
      if (entry.last_seen_active) {
        await ZGM_WATCH.markSeenActive(key, null);
      }
      continue;
    }

    // Day-before / day-of reminders for wadium + auction on watched listings.
    const live = activeByKey.get(key);
    const dates = {
      auction_date: live?.auction_date || active.date || null,
      wadium_deadline: live?.wadium_deadline || null,
      detail_url: live?.detail_url || null,
      starting_price_pln: live?.starting_price_pln ?? active.starting_price_pln ?? null,
    };
    for (const reminder of dueReminders(dates, today)) {
      try {
        await notifyReminder(key, entry, dates, reminder);
      } catch (err) {
        console.warn('[ZGM bg] reminder failed:', err);
      }
    }

    const fp = activeFingerprint({
      auction_date: active.date,
      starting_price_pln: active.starting_price_pln,
    });
    if (sameFingerprint(fp, entry.last_seen_active)) continue;
    await notifyNewListing(key, entry, {
      auction_date: active.date,
      starting_price_pln: active.starting_price_pln,
    });
    await ZGM_WATCH.markSeenActive(key, fp);
  }
}

// ---------------- alarms wiring ----------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL_MIN });
  // Best-effort migration on upgrade so legacy watchlist keys don't silently
  // stop matching once the merge starts namespacing.
  migrateWatchlistOnce().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL_MIN });
  migrateWatchlistOnce().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    runWatchlistCheck().catch((err) =>
      console.warn('[ZGM bg] watchlist check error:', err),
    );
  }
});

// ---------------- notification click → open detail page ----------------

chrome.notifications.onClicked.addListener(async (id) => {
  const reg = (await chrome.storage.local.get('notif:registry'))['notif:registry'] || {};
  const url = reg[id];
  if (url) chrome.tabs.create({ url });
  chrome.notifications.clear(id);
  // Serialize the delete through the queue so it re-reads the latest registry
  // and can't erase entries a concurrent scan added since the read above.
  await mutateRegistry((r) => { delete r[id]; });
});

// ---------------- message handlers ----------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getCatalog') {
    getCatalog(Boolean(msg.force)).then(catalog=>sendResponse({ok:true,catalog})).catch(err=>sendResponse({ok:false,error:String(err)}));
    return true;
  }
  if (msg?.type === 'getData') {
    (async () => {
      try {
        await migrateWatchlistOnce();
        const payload = await getOrFetch(Boolean(msg.force), Array.isArray(msg.cities) ? msg.cities : [], _sender?.tab?.url);
        sendResponse({ ok: true, payload });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }
  if (msg?.type === 'runWatchlistCheck') {
    runWatchlistCheck()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
