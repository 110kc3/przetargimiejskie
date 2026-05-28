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
const $filterKind = document.getElementById('filter-kind');
const $filterOutcome = document.getElementById('filter-outcome');
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
const fmtPLN = (n) => (n == null ? '—' : nf.format(n) + ' zł');
const fmtPerM2 = (price, area) =>
  price == null || area == null || area === 0
    ? '—'
    : nf.format(Math.round(price / area)) + ' zł/m²';

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

// Compact city chip prepended to property cells (the archive mixes cities).
// Style lives in archive.css; per-city color comes from the data attribute.
function cityTagHtml(city) {
  if (!city) return '';
  const label = t('city.' + city);
  const display = label === 'city.' + city
    ? city.charAt(0).toUpperCase() + city.slice(1)
    : label;
  return `<span class="zgm-city-tag" data-city="${city}">${display}</span> `;
}

let records = []; // flattened historical records ready to render
let activeListings = []; // payload.active.listings, city-namespaced by background.js
let propByKey = new Map(); // for enriching active rows with prior-attempts info
let lastMeta = null;
let lastFetchedAt = null;

// Dates / wadium helpers — same shape the popup uses, kept inline to avoid a
// new shared file just for these two functions.
function wadiumCellHtml(date) {
  if (!date) return '—';
  const today = new Date();
  const target = new Date(date + 'T00:00:00');
  const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `<span class="zgm-past">${date}</span>`;
  if (daysLeft <= 7) return `<span class="zgm-urgent" title="${daysLeft}d">${date}</span>`;
  return date;
}

function datesCellHtml(a) {
  const rows = [];
  if (a.auction_date) rows.push(`<span class="zgm-date-label">${t('popup.label.auction')}</span> ${a.auction_date}`);
  if (a.wadium_deadline) rows.push(`<span class="zgm-date-label">${t('popup.label.wadium')}</span> ${wadiumCellHtml(a.wadium_deadline)}`);
  if (a.viewing_date) rows.push(`<span class="zgm-date-label">${t('popup.label.viewing')}</span> ${a.viewing_date}`);
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
    activeListings = res.payload.active?.listings || [];
    propByKey = new Map(
      (res.payload.properties?.properties || []).map((p) => [p.key, p]),
    );
    lastMeta = res.payload.meta || null;
    lastFetchedAt = res.payload.fetched_at || null;
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
  const props = payload.properties?.properties || [];
  for (const p of props) {
    for (const l of p.listings) {
      if (l.outcome === 'sold' || l.outcome === 'unsold') {
        records.push({
          date: l.date,
          // background.js stamps `city` onto every property at merge time.
          city: p.city || null,
          street: p.street,
          building: p.building,
          apt: p.apt,
          addr_display:
            `${p.street} ${p.building}${p.apt ? '/' + p.apt : ''}`,
          street_search: (p.street_norm + ' ' + p.building + ' ' + (p.apt || ''))
            .toLowerCase(),
          kind: l.kind || p.kind || 'unknown',
          area_m2: l.area_m2 ?? p.area_m2 ?? null,
          round: l.round,
          starting_price_pln: l.starting_price_pln,
          final_price_pln: l.final_price_pln,
          outcome: l.outcome,
          unsold_reason: l.unsold_reason,
          source_pdf: l.source_pdf,
        });
      }
    }
  }
  // newest first by default
  records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function renderSummary() {
  for (const tile of document.querySelectorAll('#summary .tile')) {
    const kind = tile.dataset.kind;
    const sold = records.filter(
      (r) => r.kind === kind && r.outcome === 'sold' && r.final_price_pln != null,
    );
    tile.querySelector('.n').textContent = sold.length;
    tile.querySelector('.med-total').textContent =
      fmtPLN(median(sold.map((r) => r.final_price_pln)));
    const m2 = sold
      .filter((r) => r.area_m2)
      .map((r) => r.final_price_pln / r.area_m2);
    tile.querySelector('.med-m2').textContent =
      m2.length ? nf.format(Math.round(median(m2))) + ' zł/m²' : '—';
  }
}

let sortKey = 'date';
let sortDir = 'desc';

function getSortValue(r, key) {
  switch (key) {
    case 'date': return r.date || '';
    case 'area': return r.area_m2 ?? -1;
    case 'price': return r.starting_price_pln ?? -1;
    case 'final': return r.final_price_pln ?? -1;
    case 'm2':
      return r.area_m2 && r.starting_price_pln
        ? r.starting_price_pln / r.area_m2 : -1;
    default: return '';
  }
}

function renderTable() {
  const city = $filterCity.value;
  const kind = $filterKind.value;
  const outcome = $filterOutcome.value;
  const q = $filterSearch.value.trim().toLowerCase();

  let rows = records.slice();
  if (city !== 'all') rows = rows.filter((r) => r.city === city);
  if (kind !== 'all') rows = rows.filter((r) => r.kind === kind);
  if (outcome !== 'all') rows = rows.filter((r) => r.outcome === outcome);
  if (q) rows = rows.filter((r) => r.street_search.includes(q));

  rows.sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
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
        <td>${r.date || '—'}</td>
        <td>${cityTagHtml(r.city)}${r.addr_display}</td>
        <td>${t('kind.' + r.kind)}</td>
        <td>${r.area_m2 ? r.area_m2 + ' m²' : '—'}</td>
        <td>${fmtPLN(r.starting_price_pln)}</td>
        <td>${fmtPLN(r.final_price_pln)}</td>
        <td>${fmtPerM2(r.outcome === 'sold' ? r.final_price_pln : r.starting_price_pln, r.area_m2)}</td>
        <td>${outcomeLabel(r)}</td>
        <td>${r.source_pdf ? `<a target="_blank" rel="noopener" href="${r.source_pdf}">PDF</a>` : ''}</td>
      </tr>`,
    )
    .join('');
}

function outcomeLabel(r) {
  if (r.outcome === 'sold') return t('outcome.sold');
  if (r.outcome === 'unsold') {
    const reason = r.unsold_reason ? ` (${t('reason.' + r.unsold_reason)})` : '';
    return t('outcome.unsold') + reason;
  }
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

// "Currently active" section — bigger version of the popup's active table.
// Same column shape; city + kind + search filters apply, outcome filter is
// inherently a no-op here (every row is `active`).
function renderActiveTable() {
  const city = $filterCity.value;
  const kind = $filterKind.value;
  const q = $filterSearch.value.trim().toLowerCase();

  // Defensive filter mirroring popup.js renderActive(): drop listings whose
  // auction date has already passed. Proper home for this is the Katowice
  // pipeline crawler (TODO.md), but the BIP keeps stale announcement docs
  // up so the data file alone isn't trustworthy.
  const today = new Date().toISOString().slice(0, 10);
  const items = activeListings
    .filter((a) => !a.auction_date || a.auction_date >= today)
    .filter((a) => city === 'all' || a.city === city)
    .filter((a) => kind === 'all' || a.kind === kind)
    .filter((a) => {
      if (!q) return true;
      // Search the same shape the historical table searches against: a
      // lowercased "street building/apt" string.
      const s = (a.address_raw || '').toLowerCase();
      return s.includes(q);
    })
    .map((a) => {
      const prop = a.address ? propByKey.get(a.address.key) : null;
      const prior = prop
        ? prop.listings.filter(
            (l) => l.outcome !== 'active' && l.outcome !== 'announced',
          )
        : [];
      const unsold = prior.filter((l) => l.outcome === 'unsold');
      const lastUnsold = unsold[unsold.length - 1];
      return { a, prop, prior, unsold, lastUnsold };
    });
  // Same sort as the popup: most-relisted first, then prior count, then area.
  items.sort((x, y) => {
    if (y.unsold.length !== x.unsold.length) return y.unsold.length - x.unsold.length;
    if (y.prior.length !== x.prior.length) return y.prior.length - x.prior.length;
    return (y.a.area_m2 || 0) - (x.a.area_m2 || 0);
  });

  $activeTbody.innerHTML = items
    .map(({ a, prior, unsold, lastUnsold }) => {
      const addr = cityTagHtml(a.city) + (a.address_raw || '') + (a.area_m2 ? ` · ${a.area_m2} m²` : '');
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
      const datesCell = datesCellHtml(a);
      return `
        <tr data-url="${a.detail_url || ''}">
          <td>${addr}</td>
          <td>${t('kind.' + (a.kind || 'unknown'))}</td>
          <td class="zgm-dates-cell">${datesCell}</td>
          <td>${fmtPLN(a.starting_price_pln)}</td>
          <td>${askM2}</td>
          <td>${priorCell}</td>
          <td>${lastUnsoldCell}</td>
        </tr>`;
    })
    .join('');

  // Row click → open the detail page in a new tab, like the popup does.
  for (const tr of $activeTbody.querySelectorAll('tr[data-url]')) {
    tr.addEventListener('click', () => {
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
  await Promise.all([window.ZGM_I18N.ready, window.ZGM_THEME?.ready]);
  applyStaticI18n();
  syncThemeButton();
  window.ZGM_I18N.onChange(() => {
    applyStaticI18n();
    syncThemeButton();
    renderAll();
  });
  window.ZGM_THEME?.onChange(syncThemeButton);
  $langToggle.addEventListener('click', () => {
    const next = window.ZGM_I18N.getLang() === 'pl' ? 'en' : 'pl';
    window.ZGM_I18N.setLang(next);
  });
  $themeToggle?.addEventListener('click', () => window.ZGM_THEME?.toggle());
  const onFilterChange = () => { renderActiveTable(); renderTable(); };
  $filterCity.addEventListener('change', onFilterChange);
  $filterKind.addEventListener('change', onFilterChange);
  // Outcome filter is meaningful only for the historical table — active rows
  // have no outcome — so it doesn't need to re-render the active section.
  $filterOutcome.addEventListener('change', renderTable);
  $filterSearch.addEventListener('input', onFilterChange);
  for (const th of $table.querySelectorAll('th[data-sort]')) {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = k; sortDir = k === 'date' ? 'desc' : 'desc'; }
      for (const t2 of $table.querySelectorAll('th[data-sort]')) {
        t2.classList.remove('sorted-asc', 'sorted-desc');
      }
      th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable();
    });
  }
  load();
})();
