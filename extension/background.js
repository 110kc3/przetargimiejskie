// Service worker:
//   - fetches data/{properties,active,meta}.json from GitHub on demand
//   - chrome.alarms periodic check: re-fetches, diffs active.json against
//     the user's watchlist, and fires chrome.notifications for any newly
//     active watched property
//   - notification click → opens the property detail page

// The watchlist module exposes globalThis.ZGM_WATCH when imported below.
importScripts('watchlist.js');

const REPO = '110kc3/zgm-gliwice';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data`;
const TTL_MS = 6 * 60 * 60 * 1000;       // 6h soft TTL for ad-hoc reads
const ALARM_NAME = 'zgm-watchlist-check';
const ALARM_INTERVAL_MIN = 240;          // 4h periodic watchlist scan

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

// ---------------- watchlist diff + notifications ----------------

// Returns a stable "this is the active listing right now" fingerprint that
// we can compare across runs. Same date + same price = same listing.
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

async function notifyNewListing(key, entry, listing) {
  const id = `zgm-watch-${key}-${listing.auction_date || 'now'}`;
  // Stash the click-target URL alongside the notification id so onClicked
  // can route correctly. Notification IDs are unique per session, so keep
  // a tiny registry in chrome.storage.local.
  const reg = (await chrome.storage.local.get('notif:registry'))['notif:registry'] || {};
  reg[id] = entry.detail_url || `https://zgm-gliwice.pl/`;
  await chrome.storage.local.set({ 'notif:registry': reg });

  // For now we hardcode the notification copy in PL (since the underlying
  // app is PL by default). i18n hookup from a service worker is non-trivial
  // because chrome.storage reads are async — we'd need to await ZGM_I18N
  // here too. Keeping it simple: PL strings, since that's the default.
  const title = 'ZGM — nowa aukcja obserwowanej nieruchomości';
  const body = `${entry.addr} — aukcja ${listing.auction_date || '?'} po ${fmtPLN(listing.starting_price_pln)}`;
  await chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message: body,
    priority: 2,
  });
}

async function runWatchlistCheck() {
  let payload;
  try {
    payload = await getOrFetch(true);
  } catch (err) {
    console.warn('[ZGM bg] watchlist check skipped — fetch failed:', err);
    return;
  }
  const watchlist = await ZGM_WATCH.getAll();
  if (Object.keys(watchlist).length === 0) return;

  const propsByKey = new Map(
    (payload.properties?.properties || []).map((p) => [p.key, p]),
  );

  for (const [key, entry] of Object.entries(watchlist)) {
    const prop = propsByKey.get(key);
    const active = prop?.listings.find((l) => l.outcome === 'active');
    if (!active) {
      // No current active listing. Clear last-seen so future re-listings
      // trigger a fresh notification.
      if (entry.last_seen_active) {
        await ZGM_WATCH.markSeenActive(key, null);
      }
      continue;
    }
    const fp = activeFingerprint({
      auction_date: active.date,
      starting_price_pln: active.starting_price_pln,
    });
    if (sameFingerprint(fp, entry.last_seen_active)) continue;
    // Either no last_seen, or it's a different active listing now → notify.
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
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL_MIN });
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
  delete reg[id];
  await chrome.storage.local.set({ 'notif:registry': reg });
});

// ---------------- message handlers ----------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getData') {
    getOrFetch(Boolean(msg.force))
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg?.type === 'runWatchlistCheck') {
    runWatchlistCheck()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
