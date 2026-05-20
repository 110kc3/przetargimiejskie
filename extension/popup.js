// Popup: watching section (top) + currently-active table (bottom).
// Clicking a star toggles watch; clicking a row opens detail in new tab.

const $status = document.getElementById('status');
const $table = document.getElementById('active-table');
const $tbody = $table.querySelector('tbody');
const $meta = document.getElementById('meta');
const $refresh = document.getElementById('refresh');
const $langToggle = document.getElementById('lang-toggle');
const $activeHeading = document.getElementById('active-heading');
const $watchingSection = document.getElementById('watching-section');
const $watchingTbody = $watchingSection.querySelector('tbody');

const t = (k, vars) => window.ZGM_I18N.t(k, vars);
const fmtPLN = (n) =>
  n == null ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) + ' zł';

function datesCellHtml(a) {
  const rows = [];
  if (a.auction_date) rows.push(`<span class="zgm-date-label">${t('popup.label.auction')}</span> ${a.auction_date}`);
  if (a.wadium_deadline) rows.push(`<span class="zgm-date-label">${t('popup.label.wadium')}</span> ${wadiumCellHtml(a.wadium_deadline)}`);
  if (a.viewing_date) rows.push(`<span class="zgm-date-label">${t('popup.label.viewing')}</span> ${a.viewing_date}`);
  return rows.join('<br>');
}

function wadiumCellHtml(date) {
  if (!date) return '—';
  const today = new Date();
  const target = new Date(date + 'T00:00:00');
  const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `<span class="zgm-past">${date}</span>`;
  if (daysLeft <= 7) return `<span class="zgm-urgent" title="${daysLeft}d">${date}</span>`;
  return date;
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

function renderActive() {
  const payload = lastPayload;
  const watchlist = lastWatchlist;
  const properties = payload.properties?.properties || [];
  const byKey = new Map(properties.map((p) => [p.key, p]));

  const items = (payload.active?.listings || []).map((a) => {
    const prop = a.address ? byKey.get(a.address.key) : null;
    const prior = prop
      ? prop.listings.filter(
          (l) => l.outcome !== 'active' && l.outcome !== 'announced',
        )
      : [];
    const unsold = prior.filter((l) => l.outcome === 'unsold');
    const lastUnsold = unsold[unsold.length - 1];
    const key = a.address?.key;
    return { a, prop, prior, unsold, lastUnsold, key };
  });
  items.sort((x, y) => {
    if (y.unsold.length !== x.unsold.length) return y.unsold.length - x.unsold.length;
    if (y.prior.length !== x.prior.length) return y.prior.length - x.prior.length;
    return (y.a.area_m2 || 0) - (x.a.area_m2 || 0);
  });

  $tbody.innerHTML = items
    .map(({ a, prior, unsold, lastUnsold, key }) => {
      const addr = (a.address_raw || '') + (a.area_m2 ? ` · ${a.area_m2} m²` : '');
      const priorCell =
        prior.length === 0
          ? `<span class="zgm-fresh">${t('popup.fresh')}</span>`
          : `<span class="zgm-prior">${t('popup.prior_summary', { n: prior.length, unsold: unsold.length })}</span>`;
      const lastUnsoldCell = lastUnsold
        ? `${lastUnsold.date} @ ${fmtPLN(lastUnsold.starting_price_pln)}`
        : '—';
      const watched = key ? watchlist[key] : null;
      const star = `<button type="button" class="zgm-star ${watched ? 'on' : ''}" data-key="${key || ''}" title="${t(watched ? 'watch.button.remove' : 'watch.button.add')}">${watched ? '★' : '☆'}</button>`;
      const askM2 = a.area_m2 ? new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Math.round(a.starting_price_pln / a.area_m2)) + ' zł/m²' : '—';
      const datesCell = datesCellHtml(a);
      return `
        <tr data-url="${a.detail_url || ''}">
          <td class="zgm-star-cell">${star}</td>
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

  // Row click → open detail page (but not when the click was on the star).
  for (const tr of $tbody.querySelectorAll('tr[data-url]')) {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.zgm-star')) return;
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
        ? { addr: item.a.address_raw, kind: item.a.kind, detail_url: item.a.detail_url }
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
      const active = prop?.listings.find((l) => l.outcome === 'active');
      const prior = prop
        ? prop.listings.filter(
            (l) => l.outcome !== 'active' && l.outcome !== 'announced',
          )
        : [];
      const unsold = prior.filter((l) => l.outcome === 'unsold').length;
      let statusHtml;
      if (active) {
        const wad = active.wadium_deadline ? `, ${t('popup.col.wadium_by').toLowerCase()} ${wadiumCellHtml(active.wadium_deadline)}` : '';
        statusHtml = `<span class="zgm-active">${active.date} · ${fmtPLN(active.starting_price_pln)}${wad}</span>` +
          (prior.length ? ` <span class="zgm-prior">(${prior.length}×, ${unsold} unsold)</span>` : '');
      } else if (prior.length) {
        statusHtml = `<span class="zgm-historical">${t('popup.watching.historical_only', { n: prior.length, unsold })}</span>`;
      } else {
        statusHtml = '<span class="muted">—</span>';
      }
      const url = active?.detail_url || entry.detail_url || '';
      return `
        <tr data-url="${url}">
          <td class="zgm-star-cell"><button type="button" class="zgm-star on" data-key="${key}" title="${t('watch.button.remove')}">★</button></td>
          <td>${entry.addr}</td>
          <td>${statusHtml}</td>
          <td>${url ? `<a target="_blank" rel="noopener" href="${url}">→</a>` : ''}</td>
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
  const activeCount = lastPayload.active?.listings?.length || 0;
  $meta.textContent = t('popup.meta', {
    active: activeCount,
    tracked: meta.unique_properties || '?',
    when: fetched.toLocaleString(window.ZGM_I18N.getLang()),
  });
}

(async () => {
  await window.ZGM_I18N.ready;
  applyStaticI18n();
  window.ZGM_I18N.onChange(() => {
    applyStaticI18n();
    render();
  });
  window.ZGM_WATCH.onChange(async () => {
    lastWatchlist = await window.ZGM_WATCH.getAll();
    render();
  });
  $refresh.addEventListener('click', () => load(true));
  $langToggle.addEventListener('click', () => {
    const next = window.ZGM_I18N.getLang() === 'pl' ? 'en' : 'pl';
    window.ZGM_I18N.setLang(next);
  });
  load(false);
})();
