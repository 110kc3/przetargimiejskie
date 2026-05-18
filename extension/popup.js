// Popup: shows all currently-active listings sorted by "most-relisted first".
// Clicking a row opens the detail page on zgm-gliwice.pl in a new tab.

const $status = document.getElementById('status');
const $table = document.getElementById('active-table');
const $tbody = $table.querySelector('tbody');
const $meta = document.getElementById('meta');
const $refresh = document.getElementById('refresh');

async function load(force) {
  $status.hidden = false;
  $status.textContent = force ? 'Refreshing…' : 'Loading…';
  $table.hidden = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'getData', force });
    if (!res?.ok) throw new Error(res?.error || 'unknown');
    render(res.payload);
  } catch (err) {
    $status.textContent = 'Failed to load: ' + err.message;
  }
}

function fmtPLN(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) + ' zł';
}

function render(payload) {
  const properties = payload.properties?.properties || [];
  const byKey = new Map(properties.map((p) => [p.key, p]));

  const activeListings = (payload.active?.listings || []).map((a) => {
    const prop = a.address ? byKey.get(a.address.key) : null;
    const prior = prop
      ? prop.listings.filter((l) => l.outcome !== 'active' && l.outcome !== 'announced')
      : [];
    const unsold = prior.filter((l) => l.outcome === 'unsold');
    const lastUnsold = unsold[unsold.length - 1];
    return { a, prop, prior, unsold, lastUnsold };
  });

  // Sort: most unsold first, then most prior, then by area descending.
  activeListings.sort((x, y) => {
    if (y.unsold.length !== x.unsold.length) return y.unsold.length - x.unsold.length;
    if (y.prior.length !== x.prior.length) return y.prior.length - x.prior.length;
    return (y.a.area_m2 || 0) - (x.a.area_m2 || 0);
  });

  $tbody.innerHTML = activeListings
    .map(({ a, prop, prior, unsold, lastUnsold }) => {
      const addr = (a.address_raw || '') + (a.area_m2 ? ` · ${a.area_m2} m²` : '');
      const priorCell =
        prior.length === 0
          ? '<span class="zgm-fresh">first</span>'
          : `<span class="zgm-prior">${prior.length}× (${unsold.length} unsold)</span>`;
      const lastUnsoldCell = lastUnsold
        ? `${lastUnsold.date} @ ${fmtPLN(lastUnsold.starting_price_pln)}`
        : '—';
      return `
        <tr data-url="${a.detail_url || ''}">
          <td>${addr}</td>
          <td>${a.kind}</td>
          <td>${a.auction_date || '—'}</td>
          <td>${fmtPLN(a.starting_price_pln)}</td>
          <td>${priorCell}</td>
          <td>${lastUnsoldCell}</td>
        </tr>`;
    })
    .join('');

  for (const tr of $tbody.querySelectorAll('tr[data-url]')) {
    tr.addEventListener('click', () => {
      const url = tr.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  }

  const fetched = new Date(payload.fetched_at);
  const meta = payload.meta || {};
  $meta.textContent = `${activeListings.length} active · ${meta.unique_properties || '?'} properties tracked · refreshed ${fetched.toLocaleString()}`;
  $status.hidden = true;
  $table.hidden = false;
}

$refresh.addEventListener('click', () => load(true));
load(false);
