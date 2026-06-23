// Popup: watching section (top) + currently-active table (bottom).
// Clicking a star toggles watch; clicking a row opens detail in new tab.

const $status = document.getElementById('status');
const $table = document.getElementById('active-table');
const $tbody = $table.querySelector('tbody');
const $meta = document.getElementById('meta');
const $refresh = document.getElementById('refresh');
const $langToggle = document.getElementById('lang-toggle');
const $themeToggle = document.getElementById('theme-toggle');
const $activeHeading = document.getElementById('active-heading');
const $watchingSection = document.getElementById('watching-section');
const $watchingTbody = $watchingSection.querySelector('tbody');
const $filterBar = document.getElementById('filter-bar');
const $filterCity = document.getElementById('filter-city');
const $filterKind = document.getElementById('filter-kind');
const $filterCount = document.getElementById('filter-count');

// Active-list filters (city + kind), in-memory for the popup session.
let filterCity = 'all';
let filterKind = 'all';
let _cityOptsSig = '';
let _kindOptsSig = '';
const KIND_ORDER = ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'grunt', 'unknown'];

const t = (k, vars) => window.ZGM_I18N.t(k, vars);
const fmtPLN = (n) =>
  n == null ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) + ' zł';
// Polish decimal comma ("37,91 m²"), matching archive.js/content.js — the raw
// JSON number used to render with a dot.
const fmtArea = (a) =>
  a == null ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(a) + ' m²';

// Escape crawled strings before they land in innerHTML — CSP blocks inline
// <script>, but attribute breakout and javascript:-style hrefs are still
// possible on this privileged page.
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
// Allow only http(s) URLs through to hrefs / data-url; else collapse to ''.
const safeHref = (u) => {
  if (!u) return '';
  try {
    const url = new URL(u, location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

const roundLabel = (n) => (n ? t('chip.round', { r: String(n) }) : null);

// Europe/Warsaw civil date (YYYY-MM-DD). UTC "today" flips at 01:00/02:00
// local, so around midnight an auction whose date is "today" would still be
// counted active for an extra hour or two. Mirrors pipeline todayWarsaw().
const todayWarsaw = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

// Background.js namespaces property keys as `<city>|...`, so we can recover
// the city for legacy/orphan watch entries that don't carry one.
function cityFromKey(key) {
  if (!key || typeof key !== 'string') return null;
  const i = key.indexOf('|');
  return i > 0 ? key.slice(0, i) : null;
}

// Compact city chip prepended to the Property cell on each row. Style lives
// in popup.css; color variants come from the city id as a data attribute.
function cityTagHtml(city) {
  if (!city) return '';
  const label = t('city.' + city);
  // Fall back to a capitalized id when no translation is registered.
  const display = label === 'city.' + city
    ? city.charAt(0).toUpperCase() + city.slice(1)
    : label;
  return `<span class="zgm-city-tag" data-city="${esc(city)}">${esc(display)}</span> `;
}

// Drop pre-cutoff historical listings from the prior counts (mirrors
// content.js withinYearWindow/isPriorHistory). Active / announced / archived
// rows always pass — they're current postings, not history; sold/unsold
// respect the saved minHistoryYear. settings.js is optional (defensive ?.).
const withinYearWindow = (l) => {
  if (
    l.outcome === 'active' ||
    l.outcome === 'announced' ||
    l.outcome === 'archived'
  )
    return true;
  const y = window.ZGM_SETTINGS?.getMinHistoryYear?.() ?? 0;
  if (!y || !l.date) return true;
  return Number(l.date.slice(0, 4)) >= y;
};
const isPrior = (l) =>
  l.outcome !== 'active' && l.outcome !== 'announced' && withinYearWindow(l);

function datesCellHtml(a) {
  const rows = [];
  if (a.auction_date) rows.push(`<span class="zgm-date-label">${t('popup.label.auction')}</span> ${esc(a.auction_date)}`);
  if (a.wadium_deadline) rows.push(`<span class="zgm-date-label">${t('popup.label.wadium')}</span> ${wadiumCellHtml(a.wadium_deadline)}`);
  if (a.viewing_date) rows.push(`<span class="zgm-date-label">${t('popup.label.viewing')}</span> ${esc(a.viewing_date)}`);
  return rows.join('<br>');
}

// Warsaw civil "today" (not the viewer's local midnight) so the urgency flag
// can't be a day off for a non-Polish-timezone user — mirrors background.js.
function wadiumCellHtml(date) {
  if (!date) return '—';
  const t0 = Date.parse(date);
  // A non-ISO date (e.g. "12.07.2026") parses to NaN; NaN<0 and NaN<=7 are both
  // false, so an urgent deadline would render neutral (and title="NaNd"). Show
  // the raw value instead of silently dropping the urgency cue.
  if (!Number.isFinite(t0)) return esc(date);
  const daysLeft = Math.round((t0 - Date.parse(todayWarsaw())) / 86400000);
  if (daysLeft < 0) return `<span class="zgm-past">${esc(date)}</span>`;
  if (daysLeft <= 7) return `<span class="zgm-urgent" title="${daysLeft}d">${esc(date)}</span>`;
  return esc(date);
}


function applyStaticI18n() {
  document.documentElement.lang = window.ZGM_I18N.getLang();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  const cur = window.ZGM_I18N.getLang();
  $langToggle.textContent =
    cur === 'pl' ? t('popup.lang_toggle.to_en') : t('popup.lang_toggle.to_pl');
}

let lastPayload = null;
let lastWatchlist = {};

// Active-table sort state. Null sortKey = use the default heuristic
// (most-relisted first, then prior count, then area) — preserves the
// behaviour the popup had before sortable headers existed.
let activeSortKey = null;
let activeSortDir = 'asc';

// Per-column value extractor. Returns null for "missing" so the sorter
// can park empty cells at the bottom regardless of direction.
function activeSortValue(item, key) {
  const a = item.a;
  switch (key) {
    case 'date': return a.auction_date || null;
    case 'ask':  return a.starting_price_pln ?? null;
    case 'm2':
      return a.area_m2 && a.starting_price_pln
        ? a.starting_price_pln / a.area_m2
        : null;
    case 'prior': return item.prior.length;
    default: return null;
  }
}

function sortActiveItems(items) {
  if (!activeSortKey) {
    return items.sort((x, y) => {
      if (y.unsold.length !== x.unsold.length) return y.unsold.length - x.unsold.length;
      if (y.prior.length !== x.prior.length) return y.prior.length - x.prior.length;
      return (y.a.area_m2 || 0) - (x.a.area_m2 || 0);
    });
  }
  return items.sort((x, y) => {
    const av = activeSortValue(x, activeSortKey);
    const bv = activeSortValue(y, activeSortKey);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return activeSortDir === 'asc' ? cmp : -cmp;
  });
}

// Direct Google Maps link for a non-land active listing (land has no street address).
function mapsCell(a) {
  if (a.kind === 'grunt') return '—';
  const base = String(a.address_raw || '').replace(/\s*\/\s*\d+\w*$/, '').trim();
  if (!base) return '—';
  const q = encodeURIComponent(`${base}, ${a.city || ''}`.replace(/,\s*$/, '').trim());
  return `<a class="zgm-src-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q}">${t('col.map')} ↗</a>`;
}

async function load(force) {
  $status.hidden = false;
  $status.textContent = force ? t('popup.refreshing') : t('popup.loading');
  $table.hidden = true;
  $activeHeading.hidden = true;
  $watchingSection.hidden = true;
  try {
    const [res, watchlist] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'getData', force }),
      window.ZGM_WATCH.getAll(),
    ]);
    if (!res?.ok) throw new Error(res?.error || 'unknown');
    lastPayload = res.payload;
    lastWatchlist = watchlist;
    render();
  } catch (err) {
    $status.textContent = t('popup.failed', { msg: err.message });
  }
}

function cityOf(a) {
  return a.city || cityFromKey(a.address?.key) || null;
}
function cityLabel(c) {
  const l = t('city.' + c);
  return l === 'city.' + c ? c.charAt(0).toUpperCase() + c.slice(1) : l;
}
function fillFilterSelect($sel, values, labelFn) {
  const allLabel = t('popup.filter.all');
  $sel.innerHTML =
    `<option value="all">${esc(allLabel)}</option>` +
    values.map((v) => `<option value="${esc(v)}">${esc(labelFn(v))}</option>`).join('');
}
// Rebuild the city + kind dropdowns from what's actually present in the live
// active set (only when that set or the language changed), then keep the current
// selection valid. Hides the bar when there's nothing to show.
function populateFilters(live) {
  const lang = window.ZGM_I18N.getLang();
  const cities = [...new Set(live.map(cityOf).filter(Boolean))].sort((x, y) =>
    cityLabel(x).localeCompare(cityLabel(y), 'pl'),
  );
  const kinds = KIND_ORDER.filter((k) => live.some((a) => (a.kind || 'unknown') === k));
  const csig = lang + '|' + cities.join('|');
  const ksig = lang + '|' + kinds.join('|');
  if (csig !== _cityOptsSig) { fillFilterSelect($filterCity, cities, cityLabel); _cityOptsSig = csig; }
  if (ksig !== _kindOptsSig) { fillFilterSelect($filterKind, kinds, (k) => t('kind.' + k, { default: k })); _kindOptsSig = ksig; }
  if (![...$filterCity.options].some((o) => o.value === filterCity)) filterCity = 'all';
  if (![...$filterKind.options].some((o) => o.value === filterKind)) filterKind = 'all';
  $filterCity.value = filterCity;
  $filterKind.value = filterKind;
  $filterBar.hidden = live.length === 0;
}

function renderActive() {
  const payload = lastPayload;
  const watchlist = lastWatchlist;
  const properties = payload.properties?.properties || [];
  const byKey = new Map(properties.map((p) => [p.key, p]));

  // Defensive filter: the Katowice crawler currently dumps every BIP-board
  // announcement into active.json regardless of date, and the city portal
  // takes its time archiving past-auction documents (see TODO.md). Drop
  // anything whose auction date has already passed so "currently active"
  // means what it says. Proper fix lives in cities/katowice/crawl.js.
  const today = todayWarsaw();
  const liveActive = (payload.active?.listings || []).filter(
    (a) => !a.auction_date || a.auction_date >= today,
  );

  // City + kind filters: populate from the live set, then narrow what we show.
  populateFilters(liveActive);
  const shown = liveActive.filter(
    (a) =>
      (filterCity === 'all' || cityOf(a) === filterCity) &&
      (filterKind === 'all' || (a.kind || 'unknown') === filterKind),
  );
  if ($filterCount) {
    $filterCount.textContent =
      shown.length === liveActive.length
        ? ''
        : t('popup.filter.count', { shown: shown.length, total: liveActive.length });
  }

  // Per-city median zł/m² for the "deal score" badge (residential only).
  const cityMedians = window.ZGM_DEALSCORE.buildCityMedians(properties);

  const items = shown.map((a) => {
    const prop = a.address ? byKey.get(a.address.key) : null;
    const prior = prop ? prop.listings.filter(isPrior) : [];
    const unsold = prior.filter((l) => l.outcome === 'unsold');
    const lastUnsold = unsold[unsold.length - 1];
    const key = a.address?.key;
    return { a, prop, prior, unsold, lastUnsold, key };
  });
  sortActiveItems(items);

  $tbody.innerHTML = items
    .map(({ a, prior, unsold, lastUnsold, key }) => {
      const cityTag = cityTagHtml(a.city || cityFromKey(key));
      // For houses with both a building area and a plot area, show both
      // ("· 185 m² · dz. 450 m²") so usable vs plot is distinguishable.
      const aArea = a.area_m2 ?? a.land_area_m2; // building (or the sole area if that's all we have)
      const addr = cityTag + esc(a.address_raw || '') + (aArea ? ` · ${fmtArea(aArea)}` : '')
        + (a.area_m2 != null && a.land_area_m2 != null ? ` · dz. ${fmtArea(a.land_area_m2)}` : '');
      // "nowa" (new) only when this really is a first auction with no recorded
      // history. A 2nd/3rd przetarg is a re-listing, not new — show its round.
      const priorCell =
        prior.length > 0
          ? `<span class="zgm-prior">${t('popup.prior_summary', { n: prior.length, unsold: unsold.length })}</span>`
          : a.round > 1
            ? `<span class="zgm-prior">${roundLabel(a.round)}</span>`
            : `<span class="zgm-fresh">${t('popup.fresh')}</span>`;
      const lastUnsoldCell = lastUnsold
        ? `${lastUnsold.date} @ ${fmtPLN(lastUnsold.starting_price_pln)}`
        : '—';
      const watched = key ? watchlist[key] : null;
      const star = `<button type="button" class="zgm-star ${watched ? 'on' : ''}" data-key="${esc(key || '')}" title="${esc(t(watched ? 'watch.button.remove' : 'watch.button.add'))}">${watched ? '★' : '☆'}</button>`;
      const askM2 = (a.area_m2 && a.starting_price_pln != null) ? new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Math.round(a.starting_price_pln / a.area_m2)) + ' zł/m²' : '—';
      const ds = window.ZGM_DEALSCORE.score(a.starting_price_pln, a.area_m2, a.kind, cityMedians.get(a.city || cityFromKey(key)));
      const dealCell = ds
        ? `<br><span class="zgm-deal ${ds.below ? 'good' : 'bad'}" title="${esc(t('dealscore.tooltip', { median: Math.round(ds.median), n: cityMedians.get(a.city || cityFromKey(key)).n }))}">${ds.below ? '▼' : '▲'} ${ds.pct}% ${esc(t(ds.below ? 'dealscore.below' : 'dealscore.above'))}</span>`
        : '';
      const datesCell = datesCellHtml(a);
      return `
        <tr data-url="${esc(safeHref(a.detail_url))}">
          <td class="zgm-star-cell">${star}</td>
          <td>${addr}</td>
          <td>${esc(t('kind.' + (a.kind || 'unknown'), { default: a.kind || 'unknown' }))}</td>
          <td class="zgm-dates-cell">${datesCell}</td>
          <td>${fmtPLN(a.starting_price_pln)}</td>
          <td>${askM2}${dealCell}</td>
          <td>${priorCell}</td>
          <td>${lastUnsoldCell}</td>
          <td>${mapsCell(a)}</td>
          <td>${srcLinkCell(a.detail_url, a.bip_url)}</td>
        </tr>`;
    })
    .join('');

  // Row click → open detail page (but not when the click was on the star or link).
  for (const tr of $tbody.querySelectorAll('tr[data-url]')) {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.zgm-star') || e.target.closest('a')) return;
      const url = tr.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  }
  for (const btn of $tbody.querySelectorAll('.zgm-star')) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (!key) return;
      const cur = await window.ZGM_WATCH.isWatched(key);
      const item = items.find((i) => i.key === key);
      const meta = item && item.a
        ? {
            addr: item.a.address_raw,
            kind: item.a.kind,
            detail_url: item.a.detail_url,
            city: item.a.city || cityFromKey(key),
          }
        : {};
      if (cur) await window.ZGM_WATCH.unwatch(key);
      else await window.ZGM_WATCH.watch(key, meta);
      lastWatchlist = await window.ZGM_WATCH.getAll();
      render();
    });
  }

  $activeHeading.hidden = false;
  $table.hidden = false;
}

// Dedicated 'verify at the source' link cell → the city BIP/ZGM detail page,
// so the user can confirm any listing first-hand. Blank when no source URL.
function srcLinkCell(u, bip) {
  const h = safeHref(u);
  const primary = h ? `<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(h)}">${esc(t('link.verify'))}</a>` : '';
  // Secondary source: the city BIP page for an auction also listed on ZGM.
  const hb = safeHref(bip);
  const secondary = hb ? `${primary ? ' ' : ''}<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(hb)}">BIP ↗</a>` : '';
  return primary + secondary;
}

function renderWatching() {
  const payload = lastPayload;
  const watchlist = lastWatchlist;
  const entries = Object.entries(watchlist);
  if (entries.length === 0) {
    $watchingSection.hidden = true;
    return;
  }
  const properties = payload.properties?.properties || [];
  const byKey = new Map(properties.map((p) => [p.key, p]));

  $watchingTbody.innerHTML = entries
    .map(([key, entry]) => {
      const prop = byKey.get(key);
      const active = prop?.listings?.find((l) => l.outcome === 'active');
      const prior = prop?.listings ? prop.listings.filter(isPrior) : [];
      const unsold = prior.filter((l) => l.outcome === 'unsold').length;
      let statusHtml;
      if (active) {
        const wad = active.wadium_deadline ? `, ${t('popup.col.wadium_by').toLowerCase()} ${wadiumCellHtml(active.wadium_deadline)}` : '';
        statusHtml = `<span class="zgm-active">${active.date} · ${fmtPLN(active.starting_price_pln)}${wad}</span>` +
          (prior.length ? ` <span class="zgm-prior">${esc(t('popup.watching.active_prior', { n: prior.length, unsold }))}</span>` : '');
      } else if (prior.length) {
        statusHtml = `<span class="zgm-historical">${t('popup.watching.historical_only', { n: prior.length, unsold })}</span>`;
      } else {
        statusHtml = '<span class="muted">—</span>';
      }
      const url = safeHref(active?.detail_url || entry.detail_url || '');
      const city = prop?.city || entry.city || cityFromKey(key);
      const addrCell = cityTagHtml(city) + esc(entry.addr);
      return `
        <tr data-url="${esc(url)}">
          <td class="zgm-star-cell"><button type="button" class="zgm-star on" data-key="${esc(key)}" title="${esc(t('watch.button.remove'))}">★</button></td>
          <td>${addrCell}</td>
          <td>${statusHtml}</td>
          <td>${srcLinkCell(url, active?.bip_url)}</td>
        </tr>`;
    })
    .join('');

  for (const btn of $watchingTbody.querySelectorAll('.zgm-star')) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      await window.ZGM_WATCH.unwatch(key);
      lastWatchlist = await window.ZGM_WATCH.getAll();
      render();
    });
  }
  for (const tr of $watchingTbody.querySelectorAll('tr[data-url]')) {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.zgm-star') || e.target.tagName === 'A') return;
      const url = tr.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  }
  $watchingSection.hidden = false;
}

function render() {
  if (!lastPayload) return;
  $status.hidden = true;
  renderWatching();
  renderActive();
  const fetched = new Date(lastPayload.fetched_at);
  const meta = lastPayload.meta || {};
  // Match the same past-date filter renderActive uses so the count in the
  // footer is consistent with the number of rows the user sees.
  const today = todayWarsaw();
  const activeCount = (lastPayload.active?.listings || []).filter(
    (a) => !a.auction_date || a.auction_date >= today,
  ).length;
  $meta.textContent = t('popup.meta', {
    active: activeCount,
    tracked: meta.unique_properties || '?',
    when: fetched.toLocaleString(window.ZGM_I18N.getLang()),
  });
}

// Theme button: show ☀ in light mode (click → dark) and ☾ in dark mode
// (click → light). Title is i18n'd so it follows the lang toggle.
function syncThemeButton() {
  if (!$themeToggle || !window.ZGM_THEME) return;
  const eff = window.ZGM_THEME.getEffective();
  $themeToggle.textContent = eff === 'dark' ? '☾' : '☀';
  $themeToggle.title = t(eff === 'dark' ? 'theme.toggle.to_light' : 'theme.toggle.to_dark');
}

(async () => {
  await Promise.all([
    window.ZGM_I18N.ready,
    window.ZGM_THEME?.ready,
    window.ZGM_SETTINGS?.ready,
  ]);
  applyStaticI18n();
  syncThemeButton();
  window.ZGM_I18N.onChange(() => {
    applyStaticI18n();
    syncThemeButton();
    render();
  });
  window.ZGM_THEME?.onChange(syncThemeButton);
  window.ZGM_WATCH.onChange(async () => {
    lastWatchlist = await window.ZGM_WATCH.getAll();
    render();
  });
  $refresh.addEventListener('click', () => load(true));
  $filterCity.addEventListener('change', () => { filterCity = $filterCity.value; if (lastPayload) renderActive(); });
  $filterKind.addEventListener('change', () => { filterKind = $filterKind.value; if (lastPayload) renderActive(); });
  $langToggle.addEventListener('click', () => {
    const next = window.ZGM_I18N.getLang() === 'pl' ? 'en' : 'pl';
    window.ZGM_I18N.setLang(next);
  });
  $themeToggle?.addEventListener('click', () => window.ZGM_THEME?.toggle());

  // Sortable column headers on the active table. Date defaults to asc
  // (soonest first — what the user typically wants); other columns default
  // to desc (most expensive / most-relisted first). Re-clicking the same
  // column toggles direction.
  for (const th of $table.querySelectorAll('th[data-sort]')) {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (activeSortKey === k) {
        activeSortDir = activeSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        activeSortKey = k;
        activeSortDir = k === 'date' ? 'asc' : 'desc';
      }
      for (const t2 of $table.querySelectorAll('th[data-sort]')) {
        t2.classList.remove('sorted-asc', 'sorted-desc');
      }
      th.classList.add(activeSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      if (lastPayload) renderActive();
    });
  }

  load(false);
})();
