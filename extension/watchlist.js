
(function () {
  const STORAGE_KEY = 'watchlist';
  const listeners = new Set();

  let writeChain = Promise.resolve();
  function serialize(task) {
    const run = writeChain.then(task, task);
    writeChain = run.then(() => {}, () => {});
    return run;
  }

  async function getAll() {
    try {
      const v = await chrome.storage.local.get(STORAGE_KEY);
      return v[STORAGE_KEY] || {};
    } catch {
      return {};
    }
  }

  async function isWatched(key) {
    const all = await getAll();
    return Object.prototype.hasOwnProperty.call(all, key);
  }

  function watch(key, meta) {
    return serialize(async () => {
      const all = await getAll();
      if (all[key]) return;
      all[key] = {
        addr: meta?.addr || key,
        kind: meta?.kind || 'unknown',
        detail_url: meta?.detail_url || null,
        city: meta?.city || null,
        added_at: Date.now(),
        last_seen_active: null,
      };
      await chrome.storage.local.set({ [STORAGE_KEY]: all });
    });
  }

  function migrateAliases(properties) {
    return serialize(async()=>{
      const all=await getAll();let changed=false;
      const aliases=new Map();
      for(const p of properties||[])for(const key of p.legacy_keys||[]){if(key===p.key)continue;if(!aliases.has(key))aliases.set(key,[]);aliases.get(key).push(p);}
      for(const [oldKey,targets]of aliases){
        const entry=all[oldKey];if(!entry)continue;
        for(const p of targets)if(!all[p.key])all[p.key]={...entry,city:p.city||entry.city,
          addr:`${p.street} ${p.building}${p.apt?'/'+p.apt:''}`,kind:p.kind||entry.kind};
        delete all[oldKey];changed=true;
      }
      if(changed)await chrome.storage.local.set({[STORAGE_KEY]:all});
    });
  }

  function unwatch(key) {
    return serialize(async () => {
      const all = await getAll();
      if (!all[key]) return;
      delete all[key];
      await chrome.storage.local.set({ [STORAGE_KEY]: all });
    });
  }

  function markSeenActive(key, fingerprint) {
    return serialize(async () => {
      const all = await getAll();
      if (!all[key]) return;
      all[key].last_seen_active = fingerprint;
      await chrome.storage.local.set({ [STORAGE_KEY]: all });
    });
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      for (const fn of listeners) {
        try { fn(changes[STORAGE_KEY].newValue || {}); } catch {}
      }
    });
  } catch {}

  // (globalThis) so background.js can import without bundling.
  const api = { getAll, isWatched, watch, unwatch, markSeenActive, onChange, migrateAliases };
  if (typeof window !== 'undefined') window.ZGM_WATCH = api;
  if (typeof globalThis !== 'undefined') globalThis.ZGM_WATCH = api;
})();
