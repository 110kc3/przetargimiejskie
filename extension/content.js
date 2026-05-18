// Decorates zgm-gliwice.pl pages with prior-auction info.
//
// Two main paths:
//   1) listing index pages (mieszkalne, garaże, użytkowe, wykaz)
//        → find each Elementor card, parse its address, inject badge+tooltip
//   2) property detail pages (slug URLs like /zygmunta-starego-29-4-23-03-2026-r/)
//        → inject a sidebar/panel with the full historical timeline

(async function () {
  const path = location.pathname;
  const isListingIndex =
    /^\/(przetargi-lokale-mieszkalne|przetargi-garaze|przetargi-lokale-uzytkowe|wykaz-lokali-przeznaczonych-do-sprzedazy-w-przetargu)\/?/.test(
      path,
    );
  const isDetail = /^\/[a-z0-9-]+-\d{2}-\d{2}-\d{4}-r\/?$/.test(path);
  if (!isListingIndex && !isDetail) return;

  let payload;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'getData' });
    if (!res?.ok) throw new Error(res?.error || 'unknown');
    payload = res.payload;
  } catch (err) {
    console.warn('[ZGM ext] failed to load data:', err);
    return;
  }

  const properties = payload.properties?.properties || [];
  const byKey = new Map(properties.map((p) => [p.key, p]));

  if (isListingIndex) decorateIndex(byKey);
  if (isDetail) decorateDetail(byKey);
})();

// -------------------------------------------------------------- index page

function decorateIndex(byKey) {
  const boxes = document.querySelectorAll('.elementor-image-box-content');
  let decorated = 0;
  for (const box of boxes) {
    const text = box.textContent.replace(/\s+/g, ' ').trim();
    const m = /^(.+?)\s+-\s+\d{2}\.\d{2}\.\d{4}\s*r\./.exec(text);
    if (!m) continue;
    const addrRaw = m[1].trim();
    const addr = window.ZGM_NORMALIZE.parseAddress(addrRaw);
    if (!addr) continue;
    const prop = byKey.get(addr.key);
    const prior = prop
      ? prop.listings.filter(
          (l) => l.outcome !== 'active' && l.outcome !== 'announced',
        )
      : [];
    if (prior.length === 0) {
      // first time — green tag for quick scan
      box.appendChild(makeBadge({ kind: 'fresh', text: 'first listing' }));
    } else {
      const unsoldCount = prior.filter((l) => l.outcome === 'unsold').length;
      const soldCount = prior.filter((l) => l.outcome === 'sold').length;
      const kind = unsoldCount >= 2 ? 'red' : unsoldCount === 1 ? 'amber' : 'gray';
      const label =
        unsoldCount > 0
          ? `prev ${prior.length}× — ${unsoldCount} unsold${soldCount ? `, ${soldCount} sold` : ''}`
          : `prev ${prior.length}× sold`;
      const badge = makeBadge({ kind, text: label });
      badge.appendChild(buildTooltip(prop));
      box.appendChild(badge);
    }
    decorated++;
  }
  console.log(`[ZGM ext] decorated ${decorated} listing card(s)`);
}

function makeBadge({ kind, text }) {
  const el = document.createElement('div');
  el.className = `zgm-ext-badge zgm-ext-${kind}`;
  el.textContent = text;
  return el;
}

function buildTooltip(prop) {
  const tip = document.createElement('div');
  tip.className = 'zgm-ext-tooltip';
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>date</th><th>round</th><th>start price</th>
        <th>outcome</th><th>note</th>
      </tr>
    </thead>
    <tbody>
    ${prop.listings
      .filter((l) => l.outcome !== 'active' && l.outcome !== 'announced')
      .map(
        (l) => `
        <tr class="zgm-ext-row-${l.outcome}">
          <td>${l.date ?? '?'}</td>
          <td>${l.round ? toRoman(l.round) : '—'}</td>
          <td>${fmtPLN(l.starting_price_pln)}</td>
          <td>${outcomeLabel(l)}</td>
          <td>${l.outcome === 'sold' ? `sold ${fmtPLN(l.final_price_pln)}` : (l.unsold_reason || '')}</td>
        </tr>`,
      )
      .join('')}
    </tbody>`;
  tip.appendChild(table);
  return tip;
}

// -------------------------------------------------------------- detail page

function decorateDetail(byKey) {
  // The page <title> carries the canonical address (e.g.
  //   "Królewskiej Tamy 53/2 – 29.06.2026 r. – Zakład Gospodarki Mieszkaniowej").
  // The slug encoding (location.pathname) is ambiguous on collisions — e.g.
  // `/krolewskiej-tamy-5-2-...` could be either 5/2 or 53/2 — so we treat the
  // title as the source of truth and only fall back to the slug if it fails.
  let guess = null;
  const titleM = /^([^–—\-]+?)\s+[–—-]/.exec(document.title.replace(/&#8211;/g, '–'));
  if (titleM) guess = titleM[1].trim();
  let addr = guess ? window.ZGM_NORMALIZE.parseAddress(guess) : null;
  if (!addr) {
    guess = window.ZGM_NORMALIZE.addressFromSlug(location.pathname);
    addr = guess ? window.ZGM_NORMALIZE.parseAddress(guess) : null;
  }
  if (!addr) return;
  const prop = byKey.get(addr.key);
  if (!prop) {
    injectPanel({
      title: `${guess}`,
      body: '<p>No prior listings found for this property in archive (since 2024-02).</p>',
    });
    return;
  }
  const prior = prop.listings.filter(
    (l) => l.outcome !== 'active' && l.outcome !== 'announced',
  );
  const active = prop.listings.find((l) => l.outcome === 'active');
  const rows = prior
    .map(
      (l) => `
      <tr class="zgm-ext-row-${l.outcome}">
        <td>${l.date ?? '?'}</td>
        <td>${l.round ? toRoman(l.round) : '—'}</td>
        <td>${l.kind}</td>
        <td>${fmtPLN(l.starting_price_pln)}</td>
        <td>${outcomeLabel(l)}</td>
        <td>${l.outcome === 'sold' ? fmtPLN(l.final_price_pln) : ''}</td>
        <td>${l.outcome === 'sold' ? '' : (l.unsold_reason || '')}</td>
        <td>${l.source_pdf ? `<a target="_blank" rel="noopener" href="${l.source_pdf}">PDF</a>` : ''}</td>
      </tr>`,
    )
    .join('');
  const summary = priceSummary(active, prior);
  injectPanel({
    title: `${prop.street} ${prop.building}${prop.apt ? '/' + prop.apt : ''}`,
    body: `
      ${summary}
      <table class="zgm-ext-history">
        <thead><tr>
          <th>date</th><th>round</th><th>kind</th>
          <th>start price</th><th>outcome</th><th>final</th><th>reason</th><th>src</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
  });
}

function priceSummary(active, prior) {
  if (!active || prior.length === 0) return '';
  const first = prior[0];
  const last = prior[prior.length - 1];
  const startPrice = active.starting_price_pln;
  if (!first?.starting_price_pln || !startPrice) return '';
  const deltaFromFirst = startPrice - first.starting_price_pln;
  const pctFromFirst = ((deltaFromFirst / first.starting_price_pln) * 100).toFixed(1);
  const sign = deltaFromFirst >= 0 ? '+' : '';
  const unsoldCount = prior.filter((l) => l.outcome === 'unsold').length;
  return `
    <p class="zgm-ext-summary">
      <strong>${prior.length}</strong> prior attempt${prior.length > 1 ? 's' : ''}
      (${unsoldCount} unsold).
      Current ask <strong>${fmtPLN(startPrice)}</strong>
      vs first attempt ${first.date} at <strong>${fmtPLN(first.starting_price_pln)}</strong>
      — <span class="zgm-ext-delta">${sign}${fmtPLN(deltaFromFirst)} (${sign}${pctFromFirst}%)</span>.
    </p>`;
}

function injectPanel({ title, body }) {
  const wrap = document.createElement('aside');
  wrap.className = 'zgm-ext-panel';
  wrap.innerHTML = `
    <h3>Auction history — ${title}</h3>
    ${body}
    <p class="zgm-ext-footer">
      Data: <a target="_blank" rel="noopener" href="https://github.com/110kc3/zgm-gliwice">110kc3/zgm-gliwice</a>
    </p>`;
  // Insert near top of the page content so it's hard to miss.
  const target =
    document.querySelector('.page-content-container') ||
    document.querySelector('main') ||
    document.body;
  target.insertBefore(wrap, target.firstChild);
}

// -------------------------------------------------------------- utils

function fmtPLN(n) {
  if (n == null) return '—';
  return (
    new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) +
    ' zł'
  );
}

function toRoman(n) {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
}

function outcomeLabel(l) {
  if (l.outcome === 'sold') return 'sold';
  if (l.outcome === 'unsold') return 'unsold';
  if (l.outcome === 'no_winner') return 'no winner';
  return l.outcome;
}
