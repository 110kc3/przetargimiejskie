// Full-page archive view. Loads via the same getOrFetch path used by the
// popup, then renders three summary tiles (median sale price + median PLN/m²
// per kind) and a filterable + sortable table of every historical record.

const $status = document.getElementById('status');
const $summary = document.getElementById('summary');
const $filters = document.getElementById('filters');
const $table = document.getElementById('archive-table');
const $tbody = $table.querySelector('tbody');
const $langToggle = document.getElementById('lang-toggle');
const $themeToggle = document.getElementById('theme-toggle');
const $filterCity = document.getElementById('filter-city');
const $filterClass = document.getElementById('filter-class');
const $filterOutcome = document.getElementById('filter-outcome');
const $filterYear = document.getElementById('filter-year');
const $filterSearch = document.getElementById('filter-search');
const $rowcount = document.getElementById('rowcount');
const $provenance = document.getElementById('provenance');
const $activeSection = document.getElementById('active-section');
const $activeTable = document.getElementById('active-table');
const $activeTbody = $activeTable.querySelector('tbody');
const $activeEmpty = document.getElementById('active-empty');
const $historicalSection = document.getElementById('historical-section');

const t = (k, vars) => window.ZGM_I18N.t(k, vars);
const nf = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const nfArea = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
const fmtPLN = (n) => (n == null ? '—' : nf.format(n) + ' zł');
// Polish decimal comma ("37,91 m²"), matching content.js's fmtArea — the raw
// JSON number used to render with a dot ("37.91 m²").
const fmtArea = (a) => (a == null ? '—' : nfArea.format(a) + ' m²');
const fmtPerM2 = (price, area) =>
  price == null || area == null || area === 0
    ? '—'
    : nf.format(Math.round(price / area)) + ' zł/m²';

// Escape crawled strings before they go into innerHTML. CSP blocks inline
// <script>, but unescaped values still allow attribute breakout and
// javascript:-style hrefs on these privileged pages.
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
// Only allow http(s) URLs through to hrefs; anything else (javascript:, data:)
// collapses to '' so it can't execute or phish.
const safeHref = (u) => {
  if (!u) return '';
  try {
    const url = new URL(u, location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};
// Polish-fold a search query so it matches the already-folded street_search /
// folded address text (e.g. typing "Zwycięstwa" matches "zwyciestwa").
const POLISH_LOWER = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');
// Europe/Warsaw civil date (YYYY-MM-DD) — UTC "today" flips an hour or two
// before local midnight, keeping an auction "active" too long. Mirrors the
// pipeline's todayWarsaw().
const todayWarsaw = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

// Drop pre-cutoff historical listings from prior counts (mirrors popup.js
// withinYearWindow). Active / announced / archived rows always pass — they're
// current postings, not history. settings.js is optional (defensive ?.).
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

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

// Compact city chip prepended to property cells (the archive mixes cities).
function cityTagHtml(city) {
  if (!city) return '';
  const label = t('city.' + city);
  const display = label === 'city.' + city
    ? city.charAt(0).toUpperCase() + city.slice(1)
    : label;
  return `<span class="zgm-city-tag" data-city="${esc(city)}">${esc(display)}</span> `;
}

// Display label for a land parcel (no street|building|apt): prefer a street,
// else the cadastral parcel number (+ obręb), else the raw address.
function landDisplay(p) {
  if (p.street) return `${p.street}${p.building ? ' ' + p.building : ''}`;
  if (p.dzialka_nr) return `dz. ${p.dzialka_nr}${p.obreb ? ' (' + p.obreb + ')' : ''}`;
  return p.address_raw || '—';
}

let records = [];
let activeListings = [];
let landActive = [];
let propByKey = new Map();
let lastMeta = null;
let lastFetchedAt = null;

// Active-table sort state (separate from the historical table's sortKey).
// Null = the default "most-relisted first" heuristic in renderActiveTable.
let activeSortKey = null;
let activeSortDir = 'asc';

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

function datesCellHtml(a) {
  const rows = [];
  if (a.auction_date) rows.push(`<span class="zgm-date-label">${t('popup.label.auction')}</span> ${esc(a.auction_date)}`);
  if (a.wadium_deadline) rows.push(`<span class="zgm-date-label">${t('popup.label.wadium')}</span> ${wadiumCellHtml(a.wadium_deadline)}`);
  if (a.viewing_date) rows.push(`<span class="zgm-date-label">${t('popup.label.viewing')}</span> ${esc(a.viewing_date)}`);
  return rows.join('<br>');
}

function applyStaticI18n() {
  document.documentElement.lang = window.ZGM_I18N.getLang();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  $filterSearch.placeholder = t('archive.filter.search_placeholder');
  const cur = window.ZGM_I18N.getLang();
  $langToggle.textContent =
    cur === 'pl' ? t('popup.lang_toggle.to_en') : t('popup.lang_toggle.to_pl');
}

async function load() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'getData' });
    if (!res?.ok) throw new Error(res?.error || 'unknown');
    flatten(res.payload);
    activeListings = (res.payload.active?.listings || []).concat(landActive);
    propByKey = new Map(
      (res.payload.properties?.properties || []).map((p) => [p.key, p]),
    );
    lastMeta = res.payload.meta || null;
    lastFetchedAt = res.payload.fetched_at || null;
    populateYears();
    renderAll();
    $status.hidden = true;
    $summary.hidden = false;
    $filters.hidden = false;
    $table.hidden = false;
    $activeSection.hidden = false;
    $historicalSection.hidden = false;
  } catch (err) {
    $status.textContent = t('popup.failed', { msg: err.message });
  }
}

function flatten(payload) {
  records = [];
  landActive = [];
  const props = payload.properties?.properties || [];
  for (const p of props) {
    for (const l of p.listings) {
      // 'archived' = a past auction from an announcement-only city (Bytom/
      // Zabrze) — concluded, achieved price not published. Shown in the
      // historical table with its starting price.
      if (
        l.outcome === 'sold' ||
        l.outcome === 'unsold' ||
        l.outcome === 'archived' ||
        l.outcome === 'no_winner'
      ) {
        records.push({
          date: l.date,
          city: p.city || null,
          street: p.street,
          building: p.building,
          apt: p.apt,
          addr_display:
            `${p.street} ${p.building}${p.apt ? '/' + p.apt : ''}`,
          street_search: (p.street_norm + ' ' + p.building + ' ' + (p.apt || ''))
            .toLowerCase(),
          kind: l.kind || p.kind || 'unknown',
          area_m2: l.area_m2 ?? p.area_m2 ?? l.land_area_m2 ?? null,
          // Plot area only when the building area is ALSO known (so it's genuinely
          // the plot, not the sole area). Shown in the Działka column for houses.
          plot_area_m2: (l.area_m2 != null && l.land_area_m2 != null) ? l.land_area_m2 : null,
          round: l.round,
          starting_price_pln: l.starting_price_pln,
          final_price_pln: l.final_price_pln,
          outcome: l.outcome,
          unsold_reason: l.unsold_reason,
          source_pdf: l.source_pdf,
          detail_url: l.detail_url,
          bip_url: l.bip_url,
        });
      }
    }
  }
  // Land (działki/grunty) come from the SEPARATE land.json store (parcel-keyed).
  // Surface plots with kind 'grunt' so the dedicated property-type filter can
  // show/hide them. Plot area is shown as-is (zł/m² is plot-based; dealscore
  // ignores non-residential kinds).
  for (const p of (payload.land?.plots || [])) {
    const disp = landDisplay(p);
    const search = POLISH_LOWER(disp);
    for (const l of (p.listings || [])) {
      if (l.outcome === 'sold' || l.outcome === 'unsold' || l.outcome === 'archived' || l.outcome === 'no_winner') {
        records.push({
          date: l.date, city: p.city || null,
          street: p.street, building: p.building, apt: null,
          addr_display: disp, street_search: search,
          kind: 'grunt',
          area_m2: p.area_m2 ?? l.area_m2 ?? null,
          round: l.round, starting_price_pln: l.starting_price_pln,
          final_price_pln: l.final_price_pln ?? null, outcome: l.outcome,
          detail_url: l.detail_url, source_pdf: null, portal_url: l.source_url || null,
          geoportal_url: p.geoportal_url, dzialka_nr: p.dzialka_nr, parcels: p.parcels, status: p.status,
        });
      } else if (l.outcome === 'active') {
        landActive.push({
          city: p.city || null, kind: 'grunt',
          address_raw: disp, address: null,
          area_m2: p.area_m2 ?? l.area_m2 ?? null,
          auction_date: l.date, round: l.round,
          starting_price_pln: l.starting_price_pln, detail_url: l.detail_url, portal_url: l.source_url || null,
          geoportal_url: p.geoportal_url, dzialka_nr: p.dzialka_nr, parcels: p.parcels, status: p.status,
        });
      }
    }
  }
  records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// "" = all years; otherwise an exact 4-digit year string.
function selectedYear() {
  return $filterYear && $filterYear.value ? $filterYear.value : '';
}
function matchesYear(r, year) {
  if (!year) return true;
  return !!r.date && r.date.slice(0, 4) === year;
}

// Fill the year dropdown from the distinct auction years present in the data
// (newest first), with an "All years" option on top. Preserves the current
// selection across re-populations.
function populateYears() {
  if (!$filterYear) return;
  const years = [...new Set(
    records.map((r) => (r.date ? r.date.slice(0, 4) : null)).filter(Boolean),
  )].sort((a, b) => b.localeCompare(a));
  const prev = $filterYear.value;
  const allLabel = t('archive.filter.all_years');
  $filterYear.innerHTML =
    `<option value="">${allLabel}</option>` +
    years.map((y) => `<option value="${y}">${y}</option>`).join('');
  // restore previous selection if still valid, else default to all years
  $filterYear.value = years.includes(prev) ? prev : '';
}

function renderSummary() {
  const city = $filterCity.value;
  const year = selectedYear();
  const scope = records.filter(
    (r) => (city === 'all' || r.city === city) && matchesYear(r, year),
  );
  for (const tile of document.querySelectorAll('#summary .tile')) {
    const kind = tile.dataset.kind;
    const ofKind = scope.filter((r) => r.kind === kind);
    const sold = ofKind.filter(
      (r) => r.outcome === 'sold' && r.final_price_pln != null,
    );

    // Cities with an achieved-price stream (Gliwice) summarise SOLD prices.
    // Announcement-only cities have no sold records — every row is 'archived' —
    // so fall back to counting all archived auctions and showing the median
    // STARTING (wywoławcza) price instead, which is the data that exists.
    let count, prices, m2vals, suffixKey, labelKey;
    if (sold.length) {
      count = sold.length;
      prices = sold.map((r) => r.final_price_pln);
      m2vals = sold.filter((r) => r.area_m2).map((r) => r.final_price_pln / r.area_m2);
      suffixKey = 'archive.sold_suffix';
      labelKey = 'archive.median';
    } else {
      count = ofKind.length; // records[] holds only historical rows (no active)
      prices = ofKind.filter((r) => r.starting_price_pln != null).map((r) => r.starting_price_pln);
      m2vals = ofKind
        .filter((r) => r.area_m2 && r.starting_price_pln != null)
        .map((r) => r.starting_price_pln / r.area_m2);
      suffixKey = 'archive.archived_suffix';
      labelKey = 'archive.median_start';
    }

    tile.querySelector('.n').textContent = count;
    tile.querySelector('.suffix').textContent = t(suffixKey);
    tile.querySelector('.med-label').textContent = t(labelKey);
    tile.querySelector('.med-total').textContent = prices.length ? fmtPLN(median(prices)) : '—';
    tile.querySelector('.med-m2').textContent =
      m2vals.length ? nf.format(Math.round(median(m2vals))) + ' zł/m²' : '—';
  }
}

let sortKey = 'date';
let sortDir = 'desc';

function getSortValue(r, key) {
  // Return null (not ''/-1) for missing values so the comparator can park them
  // at the bottom in BOTH directions, matching the active table. The old ''/-1
  // sentinels floated dateless/area-less rows to the top in the ascending view.
  switch (key) {
    case 'date': return r.date || null;
    case 'round': return r.round ?? null;
    case 'area': return r.area_m2 ?? null;
    case 'price': return r.starting_price_pln ?? null;
    case 'final': return r.final_price_pln ?? null;
    case 'm2':
      return r.area_m2 && r.starting_price_pln
        ? r.starting_price_pln / r.area_m2 : null;
    default: return null;
  }
}

function renderTable() {
  const city = $filterCity.value;
  const outcome = $filterOutcome.value;
  const year = selectedYear();
  // Polish-fold the query so it matches the folded street_search (typing
  // "Zwycięstwa" must find "zwyciestwa").
  const q = POLISH_LOWER($filterSearch.value.trim());

  let rows = records.slice();
  if (city !== 'all') rows = rows.filter((r) => r.city === city);
  const cls = $filterClass ? $filterClass.value : 'all';
  if (cls !== 'all') rows = rows.filter((r) => r.kind === cls);
  if (outcome !== 'all') rows = rows.filter((r) => r.outcome === outcome);
  if (year) rows = rows.filter((r) => matchesYear(r, year));
  if (q) rows = rows.filter((r) => r.street_search.includes(q));

  rows.sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
    // Missing values always sink to the bottom, regardless of direction.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  $rowcount.textContent = t('archive.rowcount', { n: rows.length });
  $tbody.innerHTML = rows
    .map(
      (r) => `
      <tr class="zgm-ext-row-${r.outcome}">
        <td>${r.date || esc(r.status) || '—'}</td>
        <td>${cityTagHtml(r.city)}${esc(r.addr_display)}</td>
        <td>${esc(t('kind.' + r.kind, { default: r.kind }))}</td>
        <td>${roundCell(r.round)}</td>
        <td>${r.area_m2 ? fmtArea(r.area_m2) : '—'}</td>
        <td>${fmtPLN(r.starting_price_pln)}</td>
        <td>${fmtPLN(r.final_price_pln)}</td>
        <td>${fmtPerM2(r.outcome === 'sold' ? r.final_price_pln : r.starting_price_pln, r.area_m2)}</td>
        <td>${esc(outcomeLabel(r))}</td>
        <td>${r.plot_area_m2 ? fmtArea(r.plot_area_m2) : parcelCell(r)}</td>
        <td>${mapsCell(r)}</td>
        <td>${srcLinkCell(r.source_pdf || r.detail_url, r.bip_url)}${r.kind === 'grunt' ? portalLinkCell(r.portal_url) : ''}</td>
      </tr>`,
    )
    .join('');
}

// A dedicated 'verify at the source' link cell — points straight at the city
// BIP/ZGM page or result PDF so the user can confirm the listing themselves.
// Blank when the listing carries no source URL (a small minority).
function srcLinkCell(u, bip) {
  const h = safeHref(u);
  const primary = h ? `<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(h)}">${esc(t('link.verify'))}</a>` : '';
  // Secondary source: the city BIP page for an auction also listed on ZGM.
  const hb = safeHref(bip);
  const secondary = hb ? `${primary ? ' ' : ''}<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(hb)}">BIP ↗</a>` : '';
  return primary + secondary;
}

// City-portal "source" link for a land plot — the human listing page the plot
// was crawled from, distinct from the geoportal MAP link in the Parcel column.
// Lets users see a plot's source, not only its map. Blank for non-land / no URL.
function portalLinkCell(u) {
  const h = safeHref(u);
  return h ? ` <a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(h)}">portal ↗</a>` : '';
}

// Land rows link the parcel to a geoportal (resolved per-city in build-land);
// non-land rows have no parcel link, so the cell is blank.
// Direct Google Maps link for non-land listings (flats/houses/commercial/garages).
// Land plots use the Parcel/geoportal column instead.
function mapsCell(r) {
  if (r.kind === 'grunt') return '—';
  const base = (r.street ? `${r.street}${r.building ? ' ' + r.building : ''}`
                         : String(r.address_raw || r.addr_display || '').replace(/\s*\/\s*\d+\w*$/, '')).trim();
  if (!base) return '—';
  const q = encodeURIComponent(`${base}, ${r.city || ''}`.replace(/,\s*$/, '').trim());
  return `<a class="zgm-src-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q}">${t('col.map')} ↗</a>`;
}

function parcelCell(r) {
  // Multi-parcel plots ("263/2, 263/6") get one geoportal link per parcel.
  if (r.parcels && r.parcels.length) {
    const links = r.parcels.map((p) => {
      const h = safeHref(p.geoportal_url);
      return h ? `<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(h)}">${esc(p.nr)} ↗</a>` : esc(p.nr);
    }).join(' ');
    return links || '—';
  }
  const h = safeHref(r.geoportal_url);
  if (!h) return '—';
  const label = r.dzialka_nr || t('link.map');
  return `<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(h)}">${esc(label)} ↗</a>`;
}

function roundCell(n) {
  if (!n) return '—';
  return t('chip.round', { r: String(n) });
}

function outcomeLabel(r) {
  if (r.outcome === 'sold') return t('outcome.sold');
  if (r.outcome === 'unsold') {
    const reason = r.unsold_reason
      ? ` (${t('reason.' + r.unsold_reason, { default: r.unsold_reason })})`
      : '';
    return t('outcome.unsold') + reason;
  }
  if (r.outcome === 'archived') return t('outcome.archived');
  if (r.outcome === 'no_winner') return t('outcome.no_winner');
  return r.outcome;
}


function renderProvenance() {
  if (!records.length) return;
  const dates = records.map((r) => r.date).filter(Boolean).sort();
  const from = dates[0] || '?';
  const to = dates[dates.length - 1] || '?';
  let updated = '?';
  const iso = lastMeta?.generated_at || (lastFetchedAt ? new Date(lastFetchedAt).toISOString() : null);
  if (iso) updated = iso.slice(0, 10);
  $provenance.textContent = t('archive.provenance', { from, to, updated });
  $provenance.hidden = false;
}

function renderActiveTable() {
  const city = $filterCity.value;
  // Fold the query AND the address so diacritics match either way (the
  // active-table search previously compared a folded-or-not query against the
  // raw, diacritic-bearing address_raw).
  const q = POLISH_LOWER($filterSearch.value.trim());

  const today = todayWarsaw();
  const items = activeListings
    .filter((a) => !a.auction_date || a.auction_date >= today)
    .filter((a) => city === 'all' || a.city === city)
    .filter((a) => { const cls = $filterClass ? $filterClass.value : 'all'; return cls === 'all' || a.kind === cls; })
    .filter((a) => {
      if (!q) return true;
      const s = POLISH_LOWER(a.address_raw || '');
      return s.includes(q);
    })
    .map((a) => {
      const prop = a.address ? propByKey.get(a.address.key) : null;
      // Same prior-history rule the popup uses (isPrior): exclude live rows
      // AND respect the saved minHistoryYear — otherwise the two surfaces
      // disagree on "listed N× before" for the same property.
      const prior = prop
        ? prop.listings.filter(
            (l) =>
              l.outcome !== 'active' &&
              l.outcome !== 'announced' &&
              withinYearWindow(l),
          )
        : [];
      const unsold = prior.filter((l) => l.outcome === 'unsold');
      const lastUnsold = unsold[unsold.length - 1];
      return { a, prop, prior, unsold, lastUnsold };
    });
  // Heuristic by default, user-clickable headers can override (see the
  // click handlers at the bottom of this file).
  sortActiveItems(items);

  $activeTbody.innerHTML = items
    .map(({ a, prior, unsold, lastUnsold }) => {
      const aArea = a.area_m2 ?? a.land_area_m2;
      const addr = cityTagHtml(a.city) + esc(a.address_raw || '') + (aArea ? ` · ${fmtArea(aArea)}` : '');
      const priorCell =
        prior.length === 0
          ? `<span class="zgm-fresh">${t('popup.fresh')}</span>`
          : `<span class="zgm-prior">${t('popup.prior_summary', { n: prior.length, unsold: unsold.length })}</span>`;
      const lastUnsoldCell = lastUnsold
        ? `${lastUnsold.date} @ ${fmtPLN(lastUnsold.starting_price_pln)}`
        : '—';
      const askM2 = a.area_m2 && a.starting_price_pln
        ? nf.format(Math.round(a.starting_price_pln / a.area_m2)) + ' zł/m²'
        : '—';
      const datesCell = datesCellHtml(a) || esc(a.status || '');
      return `
        <tr data-url="${esc(safeHref(a.detail_url))}">
          <td>${addr}</td>
          <td>${esc(t('kind.' + (a.kind || 'unknown'), { default: a.kind || 'unknown' }))}</td>
          <td class="zgm-dates-cell">${datesCell}</td>
          <td>${fmtPLN(a.starting_price_pln)}</td>
          <td>${askM2}</td>
          <td>${priorCell}</td>
          <td>${lastUnsoldCell}</td>
          <td>${parcelCell(a)}</td>
          <td>${mapsCell(a)}</td>
          <td>${srcLinkCell(a.detail_url, a.bip_url)}${a.kind === 'grunt' ? portalLinkCell(a.portal_url) : ''}</td>
        </tr>`;
    })
    .join('');

  for (const tr of $activeTbody.querySelectorAll('tr[data-url]')) {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const url = tr.dataset.url;
      if (url) window.open(url, '_blank', 'noopener');
    });
  }

  const empty = items.length === 0;
  $activeTable.hidden = empty;
  $activeEmpty.hidden = !empty;
}

function renderAll() {
  renderProvenance();
  renderSummary();
  renderActiveTable();
  renderTable();
}

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
    // Re-fill the year dropdown so its "All years" option retranslates
    // (populateYears preserves the current selection).
    populateYears();
    renderAll();
  });
  window.ZGM_THEME?.onChange(syncThemeButton);
  $langToggle.addEventListener('click', () => {
    const next = window.ZGM_I18N.getLang() === 'pl' ? 'en' : 'pl';
    window.ZGM_I18N.setLang(next);
  });
  $themeToggle?.addEventListener('click', () => window.ZGM_THEME?.toggle());
  const onFilterChange = () => { renderSummary(); renderActiveTable(); renderTable(); };
  $filterCity.addEventListener('change', onFilterChange);
  $filterClass?.addEventListener('change', onFilterChange);
  $filterOutcome.addEventListener('change', renderTable);
  $filterYear?.addEventListener('change', () => {
    renderSummary();
    renderActiveTable();
    renderTable();
  });
  $filterSearch.addEventListener('input', onFilterChange);
  for (const th of $table.querySelectorAll('th[data-sort]')) {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      // Historical table: a freshly-picked column starts descending — newest
      // dates and largest prices/areas first. (Intentionally the opposite of
      // the active table's date-ascending "soonest auction first" default.)
      if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = k; sortDir = 'desc'; }
      for (const t2 of $table.querySelectorAll('th[data-sort]')) {
        t2.classList.remove('sorted-asc', 'sorted-desc');
      }
      th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable();
    });
  }
  // Sortable headers for the "Currently active" table. Mirrors the popup —
  // date defaults asc (soonest first), other columns default desc.
  for (const th of $activeTable.querySelectorAll('th[data-sort]')) {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (activeSortKey === k) {
        activeSortDir = activeSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        activeSortKey = k;
        activeSortDir = k === 'date' ? 'asc' : 'desc';
      }
      for (const t2 of $activeTable.querySelectorAll('th[data-sort]')) {
        t2.classList.remove('sorted-asc', 'sorted-desc');
      }
      th.classList.add(activeSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderActiveTable();
    });
  }
  load();
})();
