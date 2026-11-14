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
const $filterWoj = document.getElementById('filter-woj');
const $filterCity = document.getElementById('filter-city');
const $filterKind = document.getElementById('filter-kind');
const $filterCount = document.getElementById('filter-count');

let filterWoj = 'all';
let filterCity = 'all';
let filterKind = 'all';
let _wojOptsSig = '';
let _cityOptsSig = '';
let _kindOptsSig = '';
const KIND_ORDER = ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'grunt', 'unknown'];

const t = (k, vars) => window.ZGM_I18N.t(k, vars);
const fmtPLN = (n) =>
  n == null ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) + ' zł';
const fmtArea = (a) =>
  a == null ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(a) + ' m²';

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
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

const todayWarsaw = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

function cityFromKey(key) {
  if (!key || typeof key !== 'string') return null;
  const i = key.indexOf('|');
  return i > 0 ? key.slice(0, i) : null;
}

function cityTagHtml(city) {
  if (!city) return '';
  const label = t('city.' + city);
  const display = label === 'city.' + city
    ? city.charAt(0).toUpperCase() + city.slice(1)
    : label;
  return `<span class="zgm-city-tag" data-city="${esc(city)}">${esc(display)}</span> `;
}

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

function wadiumCellHtml(date) {
  if (!date) return '—';
  const t0 = Date.parse(date);
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

let activeSortKey = null;
let activeSortDir = 'asc';

function activeSortValue(item, key) {
  const a = item.a;
  switch (key) {
    case 'date': return a.auction_date || null;
    case 'ask':  return a.starting_price_pln ?? null;
    case 'm2':
      if(a.share)return null;
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

function mapsCell(a) {
  if (a.kind === 'grunt') return '—';
  const ad = a.address || {};
  const base = (ad.street ? `${ad.street}${ad.building ? ' ' + ad.building : ''}`
                          : String(a.address_raw || '').replace(/\s*\/\s*\d+\w*$/, '')).trim();
  if (!base) return '—';
  const q = encodeURIComponent(`${base}, ${a.city || ''}`.replace(/,\s*$/, '').trim());
  return `<a class="zgm-src-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q}">${t('col.map')} ↗</a>`;
}

async function load(force, city = window.ZGM_CITY_VIEW.selected()) {
  if (!city?.pipeline_id) {
    $status.hidden=false;$status.textContent=city?ZGM_CATALOG.status(city,window.ZGM_I18N.getLang()):'Wybierz miasto / Choose a city';
    $table.hidden=true;$activeHeading.hidden=true;$watchingSection.hidden=true;lastPayload=null;return;
  }
  $status.hidden = false;
  $status.textContent = force ? t('popup.refreshing') : t('popup.loading');
  $table.hidden = true;
  $activeHeading.hidden = true;
  $watchingSection.hidden = true;
  try {
    const [res, watchlist] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'getData', force, cities:[city.pipeline_id] }),
      window.ZGM_WATCH.getAll(),
    ]);
    if (!res?.ok) throw new Error(res?.error || 'unknown');
    if(res.payload.meta.unavailable_cities?.length && !res.payload.meta.per_city[city.pipeline_id])throw new Error(ZGM_CATALOG.status({status:'unavailable'},window.ZGM_I18N.getLang()));
    filterWoj='all';filterCity='all';filterKind='all';
    lastPayload = res.payload;
    lastWatchlist = await window.ZGM_WATCH.getAll();
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
const wojOf = (c) => window.ZGM_I18N.wojOf(c);
function wojLabel(w) {
  const l = t('woj.' + w);
  return l === 'woj.' + w ? w.charAt(0).toUpperCase() + w.slice(1) : l;
}
function fillFilterSelect($sel, values, labelFn) {
  const allLabel = t('popup.filter.all');
  $sel.innerHTML =
    `<option value="all">${esc(allLabel)}</option>` +
    values.map((v) => `<option value="${esc(v)}">${esc(labelFn(v))}</option>`).join('');
}
function populateFilters(live) {
  const lang = window.ZGM_I18N.getLang();
  const wojs = [...new Set(live.map((a) => wojOf(cityOf(a))).filter(Boolean))].sort((x, y) =>
    wojLabel(x).localeCompare(wojLabel(y), 'pl'),
  );
  const wsig = lang + '|' + wojs.join('|');
  if (wsig !== _wojOptsSig) { fillFilterSelect($filterWoj, wojs, wojLabel); _wojOptsSig = wsig; }
  if (![...$filterWoj.options].some((o) => o.value === filterWoj)) filterWoj = 'all';
  const cityPool = live.filter((a) => filterWoj === 'all' || wojOf(cityOf(a)) === filterWoj);
  const cities = [...new Set(cityPool.map(cityOf).filter(Boolean))].sort((x, y) =>
    cityLabel(x).localeCompare(cityLabel(y), 'pl'),
  );
  const kinds = KIND_ORDER.filter((k) => live.some((a) => (a.kind || 'unknown') === k));
  const csig = lang + '|' + filterWoj + '|' + cities.join('|');
  const ksig = lang + '|' + kinds.join('|');
  if (csig !== _cityOptsSig) { fillFilterSelect($filterCity, cities, cityLabel); _cityOptsSig = csig; }
  if (ksig !== _kindOptsSig) { fillFilterSelect($filterKind, kinds, (k) => t('kind.' + k, { default: k })); _kindOptsSig = ksig; }
  if (![...$filterCity.options].some((o) => o.value === filterCity)) filterCity = 'all';
  if (![...$filterKind.options].some((o) => o.value === filterKind)) filterKind = 'all';
  $filterWoj.value = filterWoj;
  $filterCity.value = filterCity;
  $filterKind.value = filterKind;
  const wojWrap = $filterWoj.closest('label') || $filterWoj.parentElement;
  if (wojWrap) wojWrap.hidden = wojs.length < 2;
  $filterBar.hidden = live.length === 0;
}

function renderActive() {
  const payload = lastPayload;
  const watchlist = lastWatchlist;
  const properties = payload.properties?.properties || [];
  const byKey = new Map(properties.map((p) => [p.key, p]));

  const today = todayWarsaw();
  const liveActive = (payload.active?.listings || []).filter(
    (a) => !a.auction_date || a.auction_date >= today,
  );

  populateFilters(liveActive);
  const shown = liveActive.filter(
    (a) =>
      (filterWoj === 'all' || wojOf(cityOf(a)) === filterWoj) &&
      (filterCity === 'all' || cityOf(a) === filterCity) &&
      (filterKind === 'all' || (a.kind || 'unknown') === filterKind),
  );
  if ($filterCount) {
    $filterCount.textContent =
      shown.length === liveActive.length
        ? ''
        : t('popup.filter.count', { shown: shown.length, total: liveActive.length });
  }

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
      const aArea = a.area_m2 ?? a.land_area_m2;
      const addr = cityTag + esc(a.address_raw || '') + (a.share ? ` · ${window.ZGM_I18N.getLang()==='en'?'share':'udział'} ${esc(a.share)}` : '') + (aArea ? ` · ${fmtArea(aArea)}` : '')
        + (a.area_m2 != null && a.land_area_m2 != null ? ` · dz. ${fmtArea(a.land_area_m2)}` : '');
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
      const askM2 = (!a.share && a.area_m2 && a.starting_price_pln != null) ? new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Math.round(a.starting_price_pln / a.area_m2)) + ' zł/m²' : '—';
      const ds = window.ZGM_DEALSCORE.score(a.starting_price_pln, a.area_m2, a.kind, cityMedians.get(a.city || cityFromKey(key)), a.share);
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

function srcLinkCell(u, bip) {
  const h = safeHref(u);
  const primary = h ? `<a class="zgm-src-link" target="_blank" rel="noopener" href="${esc(h)}">${esc(t('link.verify'))}</a>` : '';
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
  $status.hidden = !(lastPayload?.meta.unavailable_cities?.length || lastPayload?.meta.catalog_stale);
  if(!$status.hidden)$status.textContent=ZGM_CATALOG.status({status:'unavailable'},window.ZGM_I18N.getLang());
  renderWatching();
  renderActive();
  const fetched = new Date(lastPayload.fetched_at);
  const meta = lastPayload.meta || {};
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
  $filterWoj.addEventListener('change', () => { filterWoj = $filterWoj.value; filterCity = 'all'; if (lastPayload) renderActive(); });
  $filterCity.addEventListener('change', () => { filterCity = $filterCity.value; if (lastPayload) renderActive(); });
  $filterKind.addEventListener('change', () => { filterKind = $filterKind.value; if (lastPayload) renderActive(); });
  $langToggle.addEventListener('click', () => {
    const next = window.ZGM_I18N.getLang() === 'pl' ? 'en' : 'pl';
    window.ZGM_I18N.setLang(next);
  });
  $themeToggle?.addEventListener('click', () => window.ZGM_THEME?.toggle());

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

  try{await window.ZGM_CITY_VIEW.start(city=>load(false,city));}catch(err){$status.textContent=err.message;}
  if(!window.ZGM_CITY_VIEW.selected())load(false);
})();
