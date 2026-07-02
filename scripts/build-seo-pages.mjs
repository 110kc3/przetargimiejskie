#!/usr/bin/env node
// Build-time SEO page generator (P0-C — see TODO.md + GTM.md §3/§7).
//
// Generates, into the build-site.sh output dir, fully static indexable pages
// over the committed data/*.json — no runtime JS needed to see content:
//
//   /<miasto>/                 one page per city (aktualne przetargi + wyniki +
//                              wszystkie nieruchomości + miesięczne podsumowania)
//   /<miasto>/<adres-slug>/    one page per property (pełna historia licytacji)
//   /<miasto>/<YYYY-MM>/       monthly recap "co miasto wystawiło" (last 24 months)
//   /miasta/                   static hub linking every city page
//   /sitemap.xml               all of the above + the existing site pages
//
// SCOPE: cities with voivodeship === 'slaskie' only — mirrors the public
// landing-page gate (index.html filters Śląskie; all-Poland stays on the
// /archiwum-all test view). Widen by changing PUBLIC_VOIVODESHIPS below.
//
// Runs on plain Node (no deps): `node scripts/build-seo-pages.mjs <outDir>`.
// Called from build-site.sh AFTER site/ + data/ are copied into the out dir.
// Titles/meta target the GTM.md §3 queries: "przetarg mieszkania <miasto>",
// "licytacja mieszkania <miasto>", "mieszkanie od miasta", "lokale <ZGM>".

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.SEO_ROOT ? resolve(process.env.SEO_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] || '_site');
const SITE = 'https://przetargimiejskie.pl';
const PUBLIC_VOIVODESHIPS = new Set(['slaskie']);
const RECAP_MONTHS = 24; // monthly recap pages: this many calendar months back

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

// ---------- Polish formatting ----------

const MONTHS_NOM = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const MONTHS_GEN = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const MONTHS_LOC = ['styczniu','lutym','marcu','kwietniu','maju','czerwcu','lipcu','sierpniu','wrześniu','październiku','listopadzie','grudniu'];

// Locative ("w …") city names for grammatical prose. Fallback: nominative
// apposition ("— <Label>") so an unmapped future city is never mis-declined.
const CITY_LOC = {
  gliwice: 'w Gliwicach', katowice: 'w Katowicach', bytom: 'w Bytomiu', zabrze: 'w Zabrzu',
  sosnowiec: 'w Sosnowcu', rybnik: 'w Rybniku', bielsko: 'w Bielsku-Białej',
  myslowice: 'w Mysłowicach', swietochlowice: 'w Świętochłowicach',
  'tarnowskie-gory': 'w Tarnowskich Górach', raciborz: 'w Raciborzu', cieszyn: 'w Cieszynie',
};
const inCity = (c) => CITY_LOC[c.id] || `— ${c.label}`;

const fmtInt = (n) => Number(n).toLocaleString('pl-PL');
const fmtPln = (n) => (n == null ? '—' : `${fmtInt(Math.round(n))} zł`);
const fmtArea = (a) => (a == null ? '—' : `${Number(a).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m²`);
const perM2 = (price, area) => (price && area ? `${fmtInt(Math.round(price / area))} zł/m²` : '—');
const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return m ? `${d} ${MONTHS_GEN[m - 1]} ${y}` : iso;
};
const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MONTHS_NOM[m - 1]} ${y}`; };
const monthLoc = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MONTHS_LOC[m - 1]} ${y}`; };

const KIND_LABEL = { mieszkalny: 'mieszkanie', zabudowana: 'dom / kamienica', uzytkowy: 'lokal użytkowy', garaz: 'garaż', grunt: 'działka', unknown: 'nieruchomość' };
const OUTCOME_LABEL = {
  active: 'przetarg zaplanowany', announced: 'zapowiedziany', sold: 'sprzedane',
  unsold: 'bez nabywcy', archived: 'zakończony',
};
const TODAY = new Date().toISOString().slice(0, 10);
const isLive = (l) => (l.outcome === 'active' || l.outcome === 'announced') && l.date && l.date >= TODAY;
const outcomeHtml = (l) => {
  const o = l.outcome;
  if (o === 'sold') return `<span class="ok">sprzedane${l.final_price_pln ? ` za ${fmtPln(l.final_price_pln)}` : ''}</span>`;
  if (o === 'unsold') return `<span class="bad">bez nabywcy${l.unsold_reason === 'no_deposits' ? ' (brak wadium)' : ''}</span>`;
  if (o === 'active' || o === 'announced') {
    // A stale 'active' whose auction date already passed (result not yet
    // published/matched) must NOT read as an upcoming auction.
    if (!isLive(l)) return 'po terminie (wynik nieopublikowany)';
    return `<span class="live">${OUTCOME_LABEL[o]}</span>`;
  }
  return OUTCOME_LABEL[o] || esc(o || '—');
};

const slugify = (s) => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---------- Shared page shell (Slate Ledger, compact subset) ----------

const CSS = `
:root{color-scheme:dark;--bg:#0d1117;--bg-grad:#131a26;--surface:#161b22;--surface-2:#1b2230;
--border:#272e3a;--border-2:#313a48;--fg:#e6edf3;--fg-strong:#f4f8fc;--muted:#8b97a8;--faint:#646f80;
--accent:#2f81f7;--accent-hi:#5fa0ff;--ok:#45b97c;--bad:#d8736b;--radius:8px;--radius-s:6px;
--font:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
*{box-sizing:border-box}
body{margin:0;font-family:var(--font);background:radial-gradient(1100px 520px at 78% -12%,var(--bg-grad) 0%,transparent 62%),var(--bg);
color:var(--fg);font-size:14px;line-height:1.55;font-variant-numeric:tabular-nums;letter-spacing:.1px}
a{color:var(--accent-hi);text-decoration:none}a:hover{color:var(--accent);text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 22px}
.site-header{display:flex;align-items:center;justify-content:space-between;gap:8px 18px;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid var(--border)}
.brand{font-weight:700;font-size:16px;color:var(--fg-strong);white-space:nowrap}
.brand b{color:var(--accent-hi)}.brand .brand-sep{color:var(--faint);font-weight:500;margin:0 7px}
.brand .brand-region{color:var(--muted);font-weight:500}
.site-nav{display:flex;gap:22px}.site-nav a{color:var(--muted);font-size:13.5px;white-space:nowrap}
.site-nav a:hover{color:var(--fg);text-decoration:none}
.crumbs{padding:14px 0 0;font-size:12.5px;color:var(--faint)}.crumbs a{color:var(--muted)}
h1{font-size:28px;line-height:1.15;margin:14px 0 10px;font-weight:800;letter-spacing:-.4px;color:var(--fg-strong)}
.lead{color:var(--muted);max-width:72ch;margin:0 0 18px;font-size:14.5px}
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin:18px 0;background:var(--border);
border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.stat{background:var(--surface);padding:13px 16px}
.stat-value{font-size:22px;font-weight:800;color:var(--fg-strong)}.stat-label{color:var(--muted);font-size:12px;margin-top:1px}
.section{padding:24px 0;border-top:1px solid var(--border)}
.section-title{font-size:13px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-weight:700;margin:0 0 14px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{color:var(--faint);font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:7px 10px;border-bottom:1px solid var(--border-2)}
td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
tr:last-child td{border-bottom:0}
.num{text-align:right;white-space:nowrap}th.num{text-align:right}
.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad)}.live{color:var(--accent-hi);font-weight:600}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);
border-radius:999px;padding:6px 13px;font-size:13px}
.chip a{color:var(--fg);font-weight:600}.chip .m{color:var(--faint);font-size:12px}
.note{color:var(--faint);font-size:12.5px;margin:14px 0 0}
.site-footer{padding:24px 0 44px;color:var(--faint);font-size:12.5px;border-top:1px solid var(--border);margin-top:10px}
.site-footer p{margin:0 0 8px}
.tbl-scroll{overflow-x:auto}
@media (max-width:720px){.stat-row{grid-template-columns:repeat(2,1fr)}h1{font-size:22px}.site-nav{width:100%;gap:16px}}
`.trim();

function page({ path: pagePath, title, description, h1, crumbs, body, jsonLd }) {
  const canonical = `${SITE}${pagePath}`;
  const crumbHtml = crumbs?.length
    ? `<nav class="crumbs">${crumbs.map((c) => (c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : esc(c.label))).join(' › ')}</nav>` : '';
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="color-scheme" content="dark" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${canonical}" />
${ld}<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <header class="site-header">
    <div class="brand"><a href="/" style="color:inherit;text-decoration:none">przetargi<b>miejskie</b></a><span class="brand-sep">·</span><span class="brand-region">Polska</span></div>
    <nav class="site-nav">
      <a href="/raporty">Raporty</a>
      <a href="/archiwum">Archiwum</a>
      <a href="/miasta/">Miasta</a>
      <a href="/privacy">Prywatność</a>
    </nav>
  </header>
  ${crumbHtml}
  <h1>${h1}</h1>
  ${body}
  <footer class="site-footer">
    <p>Dane pochodzą z publicznych Biuletynów Informacji Publicznej urzędów miast i miejskich
       zakładów gospodarki mieszkaniowej. Ceny i terminy mają charakter informacyjny — wiążące są
       wyłącznie dokumenty urzędu. Narzędzie nieoficjalne, niezwiązane z żadnym urzędem.</p>
    <p>Kontakt: <a href="mailto:kontakt@przetargimiejskie.pl">kontakt@przetargimiejskie.pl</a> ·
       <a href="/privacy">Prywatność</a> · <a href="https://github.com/110kc3/przetargimiejskie">Kod źródłowy</a></p>
  </footer>
</div>
</body>
</html>
`;
}

function writePage(relDir, html) {
  const dir = join(OUT, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

// ---------- Load data ----------

const index = readJson(join(ROOT, 'data', 'index.json'));
const cities = (index.cities || [])
  .filter((c) => PUBLIC_VOIVODESHIPS.has(c.voivodeship))
  .sort((a, b) => a.label.localeCompare(b.label, 'pl'));

const today = new Date().toISOString().slice(0, 10);
const recapFloor = (() => { // first day of the month RECAP_MONTHS-1 months ago
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (RECAP_MONTHS - 1));
  return d.toISOString().slice(0, 7);
})();

const sitemap = []; // { loc, lastmod }
const addUrl = (path, lastmod) => sitemap.push({ loc: `${SITE}${path}`, lastmod: (lastmod || today).slice(0, 10) });

// ---------- Per-city ----------

const cityHub = []; // for /miasta/

for (const city of cities) {
  const dataDir = join(ROOT, 'data', city.id);
  if (!existsSync(join(dataDir, 'properties.json'))) { console.error(`  seo: skipping ${city.id} (no properties.json)`); continue; }
  const props = readJson(join(dataDir, 'properties.json')).properties || [];
  const landPlots = existsSync(join(dataDir, 'land.json')) ? (readJson(join(dataDir, 'land.json')).plots || []).length : 0;
  const meta = existsSync(join(dataDir, 'meta.json')) ? readJson(join(dataDir, 'meta.json')) : {};
  const generated = (meta.generated_at || today).slice(0, 10);

  // --- enrich properties: slug, display address, sorted listings ---
  const slugSeen = new Map();
  for (const p of props) {
    p._addr = `ul. ${p.street} ${p.building}${p.apt ? `/${p.apt}` : ''}`;
    let slug = slugify(`${p.street_norm || p.street} ${p.building} ${p.apt || ''}`) || 'nieruchomosc';
    const n = (slugSeen.get(slug) || 0) + 1; slugSeen.set(slug, n);
    if (n > 1) slug = `${slug}-${n}`;
    p._slug = slug;
    p._listings = [...(p.listings || [])].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    p._lastDate = p._listings.reduce((m, l) => (l.date && l.date > m ? l.date : m), '');
    // "Live" = a genuinely upcoming auction (date >= today). Stale 'active'
    // rows (auction passed, result never published) stay history-only, so the
    // city count matches meta.json's active_auctions notion.
    p._live = [...p._listings].reverse().find(isLive) || null;
  }
  const propHref = (p) => `/${city.id}/${p._slug}/`;
  const propLink = (p) => `<a href="${propHref(p)}">${esc(p._addr)}</a>`;

  // --- collect city-wide rows ---
  const activeRows = props.filter((p) => p._live).sort((a, b) => (a._live.date || '9999').localeCompare(b._live.date || '9999'));
  const concluded = props.flatMap((p) => p._listings.filter((l) => l.outcome === 'sold' || l.outcome === 'unsold').map((l) => ({ p, l })))
    .sort((a, b) => (b.l.date || '').localeCompare(a.l.date || '')).slice(0, 15);

  // monthly recap buckets (last RECAP_MONTHS months)
  const byMonth = new Map();
  for (const p of props) for (const l of p._listings) {
    const ym = (l.date || '').slice(0, 7);
    if (ym && ym >= recapFloor && ym <= today.slice(0, 7)) {
      if (!byMonth.has(ym)) byMonth.set(ym, []);
      byMonth.get(ym).push({ p, l });
    }
  }
  const months = [...byMonth.keys()].sort().reverse();

  // ---------- city page ----------
  const kindCount = {};
  for (const p of props) kindCount[p.kind] = (kindCount[p.kind] || 0) + 1;
  const flats = kindCount.mieszkalny || 0;

  const activeTable = activeRows.length ? `<div class="tbl-scroll"><table>
<thead><tr><th>Adres</th><th>Typ</th><th class="num">Runda</th><th class="num">Powierzchnia</th><th class="num">Cena wywoławcza</th><th class="num">zł/m²</th><th>Termin</th></tr></thead>
<tbody>${activeRows.map(({ _live: l, ...p }) => `<tr><td>${propLink({ ...p, _live: l })}</td><td>${KIND_LABEL[l.kind || p.kind] || '—'}</td><td class="num">${l.round ?? '—'}</td><td class="num">${fmtArea(l.area_m2 ?? p.area_m2)}</td><td class="num">${fmtPln(l.starting_price_pln)}</td><td class="num">${perM2(l.starting_price_pln, l.area_m2 ?? p.area_m2)}</td><td>${fmtDate(l.date)}</td></tr>`).join('\n')}</tbody>
</table></div>` : `<p class="lead">Brak zaplanowanych przetargów w tej chwili — nowe ogłoszenia pojawiają się tu automatycznie po publikacji w BIP.</p>`;

  const resultsTable = concluded.length ? `<div class="tbl-scroll"><table>
<thead><tr><th>Adres</th><th class="num">Runda</th><th class="num">Cena wywoławcza</th><th>Wynik</th><th>Data</th></tr></thead>
<tbody>${concluded.map(({ p, l }) => `<tr><td>${propLink(p)}</td><td class="num">${l.round ?? '—'}</td><td class="num">${fmtPln(l.starting_price_pln)}</td><td>${outcomeHtml(l)}</td><td>${fmtDate(l.date)}</td></tr>`).join('\n')}</tbody>
</table></div>` : '';

  const allProps = [...props].sort((a, b) => a._addr.localeCompare(b._addr, 'pl'));
  const propsTable = `<div class="tbl-scroll"><table>
<thead><tr><th>Adres</th><th>Typ</th><th class="num">Przetargi</th><th>Ostatnio</th><th>Status</th></tr></thead>
<tbody>${allProps.map((p) => {
    const last = p._listings[p._listings.length - 1];
    return `<tr><td>${propLink(p)}</td><td>${KIND_LABEL[p.kind] || '—'}</td><td class="num">${p._listings.length}</td><td>${fmtDate(p._lastDate)}</td><td>${last ? outcomeHtml(last) : '—'}</td></tr>`;
  }).join('\n')}</tbody>
</table></div>`;

  const monthChips = months.length ? `<div class="chip-row">${months.map((ym) => `<span class="chip"><a href="/${city.id}/${ym}/">${monthLabel(ym)}</a><span class="m">${byMonth.get(ym).length}</span></span>`).join('')}</div>` : '';

  const cityBody = `
<p class="lead">Przetargi na mieszkania i licytacje nieruchomości od miasta ${esc(inCity(city))} —
ceny wywoławcze, zł/m², rundy i wyniki. Ogłoszenia ${esc(city.authority || 'urzędu miasta')}
z BIP (${esc(city.host || '')}), aktualizowane codziennie. Sprawdź też
<a href="/archiwum">pełne archiwum</a> z filtrami i medianami zł/m².</p>
<div class="stat-row">
  <div class="stat"><div class="stat-value">${fmtInt(activeRows.length)}</div><div class="stat-label">aktualnych przetargów</div></div>
  <div class="stat"><div class="stat-value">${fmtInt(props.length)}</div><div class="stat-label">nieruchomości (w tym ${fmtInt(flats)} mieszkań)</div></div>
  <div class="stat"><div class="stat-value">${fmtInt(city.archived_auctions || 0)}</div><div class="stat-label">przetargów w archiwum</div></div>
  <div class="stat"><div class="stat-value">${fmtInt(landPlots)}</div><div class="stat-label">działek na sprzedaż</div></div>
</div>
<section class="section"><h2 class="section-title">Aktualne przetargi</h2>${activeTable}</section>
${resultsTable ? `<section class="section"><h2 class="section-title">Ostatnie wyniki</h2>${resultsTable}</section>` : ''}
${monthChips ? `<section class="section"><h2 class="section-title">Miesięczne podsumowania</h2>${monthChips}</section>` : ''}
<section class="section"><h2 class="section-title">Wszystkie nieruchomości (${fmtInt(props.length)})</h2>${propsTable}
<p class="note">Historia obejmuje wszystkie przetargi wychwycone z BIP od startu monitoringu — kliknij adres, aby zobaczyć pełną historię rund i cen.</p></section>`;

  writePage(city.id, page({
    path: `/${city.id}/`,
    title: `Przetargi na mieszkania ${city.label} — licytacje, ceny, wyniki | przetargimiejskie`,
    description: `Przetargi na mieszkania ${inCity(city)}: ${activeRows.length ? `${activeRows.length} aktualnych licytacji, ` : ''}ceny wywoławcze, zł/m², rundy i wyniki sprzedaży. Lokale ${city.authority || 'miasta'} — dane z BIP, aktualizowane codziennie.`,
    h1: `Przetargi na mieszkania — ${esc(city.label)}`,
    crumbs: [{ label: 'Strona główna', href: '/' }, { label: 'Miasta', href: '/miasta/' }, { label: city.label }],
    body: cityBody,
  }));
  addUrl(`/${city.id}/`, generated);

  // ---------- property pages ----------
  for (const p of props) {
    const live = p._live;
    const priceRange = p._listings.filter((l) => l.starting_price_pln).map((l) => l.starting_price_pln);
    const histTable = `<div class="tbl-scroll"><table>
<thead><tr><th>Data</th><th class="num">Runda</th><th class="num">Cena wywoławcza</th><th class="num">zł/m²</th><th>Wynik</th><th>Źródło</th></tr></thead>
<tbody>${p._listings.map((l) => {
      const src = l.source_pdf || l.detail_url || l.bip_url;
      return `<tr><td>${fmtDate(l.date)}</td><td class="num">${l.round ?? '—'}</td><td class="num">${fmtPln(l.starting_price_pln)}</td><td class="num">${perM2(l.starting_price_pln, l.area_m2 ?? p.area_m2)}</td><td>${outcomeHtml(l)}</td><td>${src ? `<a href="${esc(src)}" rel="nofollow noopener">dokument</a>` : '—'}</td></tr>`;
    }).join('\n')}</tbody>
</table></div>`;

    const liveBlock = live ? `<div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat"><div class="stat-value">${fmtDate(live.date)}</div><div class="stat-label">termin przetargu (runda ${live.round ?? '—'})</div></div>
  <div class="stat"><div class="stat-value">${fmtPln(live.starting_price_pln)}</div><div class="stat-label">cena wywoławcza</div></div>
  <div class="stat"><div class="stat-value">${perM2(live.starting_price_pln, live.area_m2 ?? p.area_m2)}</div><div class="stat-label">za m²</div></div>
  <div class="stat"><div class="stat-value">${live.wadium_deadline ? fmtDate(live.wadium_deadline) : '—'}</div><div class="stat-label">wpłata wadium do</div></div>
</div>` : '';

    const desc = `${p._addr}, ${city.label} — historia przetargów na ${KIND_LABEL[p.kind] || 'nieruchomość'}: ${p._listings.length} ${p._listings.length === 1 ? 'ogłoszenie' : 'ogłoszeń'}${priceRange.length ? `, ceny wywoławcze ${fmtPln(Math.min(...priceRange)).replace(/ /g, ' ')} – ${fmtPln(Math.max(...priceRange)).replace(/ /g, ' ')}` : ''}${p.area_m2 ? `, ${fmtArea(p.area_m2).replace(/ /g, ' ')}` : ''}. Rundy, zł/m² i wyniki licytacji ${city.authority || 'miasta'}.`;

    writePage(`${city.id}/${p._slug}`, page({
      path: `/${city.id}/${p._slug}/`,
      title: `${p._addr}, ${city.label} — przetarg: historia licytacji | przetargimiejskie`,
      description: desc,
      h1: `${esc(p._addr)}, ${esc(city.label)}`,
      crumbs: [{ label: 'Strona główna', href: '/' }, { label: city.label, href: `/${city.id}/` }, { label: p._addr }],
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'przetargimiejskie', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: city.label, item: `${SITE}/${city.id}/` },
          { '@type': 'ListItem', position: 3, name: `${p._addr}, ${city.label}` },
        ],
      },
      body: `
<p class="lead">${KIND_LABEL[p.kind] || 'Nieruchomość'}${p.area_m2 ? `, ${fmtArea(p.area_m2)}` : ''} —
${live ? 'najbliższy przetarg poniżej, pod spodem' : ''} pełna historia licytacji ${esc(city.authority || 'miasta')}
(rundy, ceny wywoławcze, wyniki). Więcej nieruchomości: <a href="/${city.id}/">przetargi ${esc(city.label)}</a>.</p>
${liveBlock}
<section class="section"><h2 class="section-title">Historia przetargów</h2>${histTable}
<p class="note">Kolejne rundy tego samego lokalu oznaczają brak nabywcy we wcześniejszych terminach —
cena wywoławcza zwykle wtedy spada. Wiążące informacje wyłącznie w dokumentach źródłowych urzędu.</p></section>`,
    }));
    addUrl(`/${city.id}/${p._slug}/`, p._lastDate || generated);
  }

  // ---------- monthly recap pages ----------
  for (const ym of months) {
    const rows = byMonth.get(ym).sort((a, b) => (a.l.date || '').localeCompare(b.l.date || ''));
    const i = months.indexOf(ym);
    const nav = [
      i < months.length - 1 ? `<a href="/${city.id}/${months[i + 1]}/">← ${monthLabel(months[i + 1])}</a>` : '',
      i > 0 ? `<a href="/${city.id}/${months[i - 1]}/">${monthLabel(months[i - 1])} →</a>` : '',
    ].filter(Boolean).join(' · ');
    writePage(`${city.id}/${ym}`, page({
      path: `/${city.id}/${ym}/`,
      title: `Przetargi mieszkań ${city.label} — ${monthLabel(ym)} | co miasto wystawiło`,
      description: `Co miasto wystawiło na przetarg ${inCity(city)} w ${monthLoc(ym)}: ${rows.length} ${rows.length === 1 ? 'ogłoszenie' : 'ogłoszeń'} — adresy, ceny wywoławcze, rundy i wyniki licytacji.`,
      h1: `${esc(city.label)}: przetargi — ${monthLabel(ym)}`,
      crumbs: [{ label: 'Strona główna', href: '/' }, { label: city.label, href: `/${city.id}/` }, { label: monthLabel(ym) }],
      body: `
<p class="lead">Ogłoszenia i wyniki przetargów ${esc(city.authority || 'miasta')} z terminem w ${monthLoc(ym)}
— automatyczne podsumowanie z danych BIP.</p>
<div class="tbl-scroll"><table>
<thead><tr><th>Data</th><th>Adres</th><th>Typ</th><th class="num">Runda</th><th class="num">Cena wywoławcza</th><th>Wynik / status</th></tr></thead>
<tbody>${rows.map(({ p, l }) => `<tr><td>${fmtDate(l.date)}</td><td>${propLink(p)}</td><td>${KIND_LABEL[l.kind || p.kind] || '—'}</td><td class="num">${l.round ?? '—'}</td><td class="num">${fmtPln(l.starting_price_pln)}</td><td>${outcomeHtml(l)}</td></tr>`).join('\n')}</tbody>
</table></div>
<p class="note">${nav}</p>`,
    }));
    addUrl(`/${city.id}/${ym}/`, generated);
  }

  cityHub.push({ city, active: activeRows.length, props: props.length, archived: city.archived_auctions || 0 });
  console.error(`  seo: ${city.id} — 1 city + ${props.length} property + ${months.length} monthly page(s)`);
}

// ---------- /miasta/ hub ----------

const hubBody = `
<p class="lead">Historia miejskich przetargów na mieszkania — wybierz miasto. Każda strona
zbiera aktualne licytacje, wyniki i pełną historię rund z BIP, aktualizowaną codziennie.</p>
<div class="chip-row">${cityHub.map(({ city, active, archived }) =>
  `<span class="chip"><a href="/${city.id}/">${esc(city.label)}</a><span class="m">${active} aktywnych · ${fmtInt(archived)} w archiwum</span></span>`).join('\n')}</div>
<p class="note">Kolejne miasta dodajemy w miarę dostępności otwartych przetargów na mieszkania —
pełna lista danych także w <a href="/archiwum">archiwum</a>.</p>`;

writePage('miasta', page({
  path: '/miasta/',
  title: 'Przetargi na mieszkania — miasta | przetargimiejskie',
  description: `Miejskie przetargi na mieszkania: ${cityHub.map((c) => c.city.label).join(', ')}. Aktualne licytacje, ceny wywoławcze, zł/m² i historia rund — dane z BIP.`,
  h1: 'Miasta',
  crumbs: [{ label: 'Strona główna', href: '/' }, { label: 'Miasta' }],
  body: hubBody,
}));
addUrl('/miasta/');

// ---------- sitemap.xml ----------

for (const p of ['/', '/archiwum/', '/raporty/', '/privacy/']) addUrl(p);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), xml);

console.error(`  seo: wrote ${sitemap.length} URLs to sitemap.xml (${cityHub.length} cities)`);
