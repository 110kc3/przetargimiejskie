// Full-page archive view. Loads via the same getOrFetch path used by the
// popup, then renders three summary tiles (median sale price + median PLN/m²
// per kind) and a filterable + sortable table of every historical record.

const $status = document.getElementById('status');
const $summary = document.getElementById('summary');
const $filters = document.getElementById('filters');
const $table = document.getElementById('archive-table');
const $tbody = $table.querySelector('tbody');
const $langToggle = document.getElementById('lang-toggle');
const $filterKind = document.getElementById('filter-kind');
const $filterOutcome = document.getElementById('filter-outcome');
const $filterSearch = document.getElementById('filter-search');
const $rowcount = document.getElementById('rowcount');
const $provenance = document.getElementById('provenance');

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

let records = []; // flattened historical records ready to render
let lastMeta = null;
let lastFetchedAt = null;

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
    lastMeta = res.payload.meta || null;
    lastFetchedAt = res.payload.fetched_at || null;
    renderAll();
    $status.hidden = true;
    $summary.hidden = false;
    $filters.hidden = false;
    $table.hidden = false;
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
  const kind = $filterKind.value;
  const outcome = $filterOutcome.value;
  const q = $filterSearch.value.trim().toLowerCase();

  let rows = records.slice();
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
        <td>${r.addr_display}</td>
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

function renderAll() {
  renderProvenance();
  renderSummary();
  renderTable();
}

(async () => {
  await window.ZGM_I18N.ready;
  applyStaticI18n();
  window.ZGM_I18N.onChange(() => {
    applyStaticI18n();
    renderAll();
  });
  $langToggle.addEventListener('click', () => {
    const next = window.ZGM_I18N.getLang() === 'pl' ? 'en' : 'pl';
    window.ZGM_I18N.setLang(next);
  });
  $filterKind.addEventListener('change', renderTable);
  $filterOutcome.addEventListener('change', renderTable);
  $filterSearch.addEventListener('input', renderTable);
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
