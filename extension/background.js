// Service worker: fetches properties.json + active.json + meta.json from the
// GitHub repo's main branch and serves them to content scripts / the popup.
//
// Caching: we keep a copy in chrome.storage.local with a TTL of 6 hours so a
// single browsing session does not re-fetch on every page navigation. The
// popup has a "Refresh now" button which bypasses the TTL.

const REPO = '110kc3/zgm-gliwice';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data`;
const TTL_MS = 6 * 60 * 60 * 1000;

const KEYS = {
  properties: 'cache:properties',
  active: 'cache:active',
  meta: 'cache:meta',
};

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
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

async function getOrFetch(force = false) {
  const now = Date.now();
  const cachedProps = await loadFromCache(KEYS.properties);
  if (!force && cachedProps && now - cachedProps.fetched_at < TTL_MS) {
    const cachedActive = await loadFromCache(KEYS.active);
    const cachedMeta = await loadFromCache(KEYS.meta);
    return {
      properties: cachedProps.data,
      active: cachedActive?.data,
      meta: cachedMeta?.data,
      fetched_at: cachedProps.fetched_at,
    };
  }
  const [properties, active, meta] = await Promise.all([
    fetchJson(`${RAW}/properties.json`),
    fetchJson(`${RAW}/active.json`),
    fetchJson(`${RAW}/meta.json`),
  ]);
  const fetched_at = Date.now();
  await Promise.all([
    saveToCache(KEYS.properties, { data: properties, fetched_at }),
    saveToCache(KEYS.active, { data: active, fetched_at }),
    saveToCache(KEYS.meta, { data: meta, fetched_at }),
  ]);
  return { properties, active, meta, fetched_at };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getData') {
    getOrFetch(Boolean(msg.force))
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // async
  }
});
