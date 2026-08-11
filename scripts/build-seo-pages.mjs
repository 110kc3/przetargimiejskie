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
// SCOPE: all of Poland since 2026-07-27 (PUBLIC_VOIVODESHIPS = null). Narrow to
// specific voivodeships by setting it to a Set. The /archiwum-all test view
// still shows every crawled city, published or not.
//
// PUBLISH GATE: within that scope a city must also clear MIN_PUBLIC_AUCTIONS
// (live + archived) to be published at all. This script is the single place the
// gate is decided — it re-writes <out>/data/index.json with a per-city `public`
// flag and a date-aware `live_auctions` count, and the runtime pages (landing
// chips, /archiwum) filter on that flag rather than re-deriving their own.
//
// Runs on plain Node (no deps): `node scripts/build-seo-pages.mjs <outDir>`.
// Called from build-site.sh AFTER site/ + data/ are copied into the out dir.
// Titles/meta target the GTM.md §3 queries: "przetarg mieszkania <miasto>",
// "licytacja mieszkania <miasto>", "mieszkanie od miasta", "lokale <ZGM>".

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITY_LOC, inCity } from './lib/city-loc.mjs';

const ROOT = process.env.SEO_ROOT ? resolve(process.env.SEO_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] || '_site');
const SITE = 'https://przetargimiejskie.pl';
// null = all of Poland. Narrow again with e.g. `new Set(['slaskie'])`.
const PUBLIC_VOIVODESHIPS = null;
// Minimum auctions (live + archived) for a city to be published. Below this a
// city page is mostly empty tables and "brak danych", which reads as broken
// rather than as honest coverage — so it stays crawled but unlisted.
const MIN_PUBLIC_AUCTIONS = 10;
const RECAP_MONTHS = 24; // monthly recap pages: this many calendar months back

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

// ---------- Polish formatting ----------

const MONTHS_NOM = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const MONTHS_GEN = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const MONTHS_LOC = ['styczniu','lutym','marcu','kwietniu','maju','czerwcu','lipcu','sierpniu','wrześniu','październiku','listopadzie','grudniu'];

// Locative city names live in scripts/lib/city-loc.mjs (shared with the B2G
// one-pager generator so the declensions can't drift apart).

const fmtInt = (n) => Number(n).toLocaleString('pl-PL');
const fmtPln = (n) => (n == null ? '—' : `${fmtInt(Math.round(n))} zł`);
const fmtArea = (a) => (a == null ? '—' : `${Number(a).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m²`);
const perM2 = (price, area) => (price && area ? `${fmtInt(Math.round(price / area))} zł/m²` : '—');

// Chip metadata for the landing + /miasta/ hub. A city with nothing scheduled
// must never render as a bare "0 aukcji" — that reads as broken even when the
// city has a deep archive behind it — so fall back to the archive/property
// counts. Every chip therefore carries two real numbers.
const plural = (n) => (n === 1 ? 'aukcja' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'aukcje' : 'aukcji');
// Deterministic per-city dot colour. Replaces the hand-maintained `--c-<city>`
// palette, which only covered ~10 cities — every unmapped city rendered the same
// grey placeholder dot, which is precisely what made a wide city list look
// unfinished. Hash → hue keeps every city distinct at any coverage. Fixed S/L so
// all hues stay legible on the dark background. Mirrored in site/index.html.
const cityHue = (id) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h; };
const cityDot = (id) => `<span class="city-dot" style="background:hsl(${cityHue(id)} 58% 58%)"></span>`;
const chipMeta = ({ live, archived, props }) => {
  if (live > 0) return `${fmtInt(live)} ${plural(live)} · ${fmtInt(archived)} w archiwum`;
  if (archived > 0) return `${fmtInt(archived)} w archiwum · ${fmtInt(props)} nieruchomości`;
  return `${fmtInt(props)} nieruchomości`;
};
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

// Slugs become directory names, so they must stay under the filesystem's
// 255-byte limit. A mis-parsed record can carry a whole announcement paragraph
// in `street` (seen on krakow), which would otherwise crash the build with
// ENAMETOOLONG — cap at a word boundary and let the caller's dedupe suffix
// resolve any collisions the truncation creates.
const SLUG_MAX = 80;
const slugify = (s) => {
  const full = String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (full.length <= SLUG_MAX) return full;
  const cut = full.slice(0, SLUG_MAX);
  return (cut.slice(0, cut.lastIndexOf('-')) || cut).replace(/-+$/, '');
};

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
<meta property="og:site_name" content="przetargimiejskie" />
<meta property="og:locale" content="pl_PL" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
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
      <a href="/dla-samorzadow/">Dla samorządów</a>
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
       <a href="/dla-samorzadow/">Dla samorządów</a> · <a href="/privacy">Prywatność</a> ·
       <a href="https://github.com/110kc3/przetargimiejskie">Kod źródłowy</a></p>
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
const candidates = (index.cities || [])
  .filter((c) => !PUBLIC_VOIVODESHIPS || PUBLIC_VOIVODESHIPS.has(c.voivodeship))
  .sort((a, b) => a.label.localeCompare(b.label, 'pl'));

const today = new Date().toISOString().slice(0, 10);
const recapFloor = (() => { // first day of the month RECAP_MONTHS-1 months ago
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (RECAP_MONTHS - 1));
  return d.toISOString().slice(0, 7);
})();

const sitemap = []; // { loc, lastmod }
const addUrl = (path, lastmod) => sitemap.push({ loc: `${SITE}${path}`, lastmod: (lastmod || today).slice(0, 10) });

// ---------- Publish gate ----------
// Load every candidate once, enrich its properties, and derive the *date-aware*
// live-auction count. index.json's `active_auctions` is a snapshot frozen at the
// last refresh, so an auction whose date has since passed still counts there —
// that drift is why the landing used to advertise "8 aukcji" for a city whose
// own page then said "0 aktualnych przetargów". `live` below is the single
// definition every public surface uses from here on.

const loaded = [];
for (const city of candidates) {
  const dataDir = join(ROOT, 'data', city.id);
  if (!existsSync(join(dataDir, 'properties.json'))) { console.error(`  seo: skipping ${city.id} (no properties.json)`); continue; }
  const props = readJson(join(dataDir, 'properties.json')).properties || [];

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
    // rows (auction passed, result never published) stay history-only.
    p._live = [...p._listings].reverse().find(isLive) || null;
  }

  const live = props.filter((p) => p._live).length;
  const archived = city.archived_auctions || 0;
  loaded.push({ city, props, live, archived, auctions: live + archived });
}

const published = loaded.filter((e) => e.auctions >= MIN_PUBLIC_AUCTIONS);
const unlisted = loaded.filter((e) => e.auctions < MIN_PUBLIC_AUCTIONS);
const cities = published.map((e) => e.city);
const LIVE_BY_ID = Object.fromEntries(loaded.map((e) => [e.city.id, e.live]));
if (unlisted.length) {
  console.error(`  seo: unlisted ${unlisted.length} thin city page(s) (< ${MIN_PUBLIC_AUCTIONS} auctions): `
    + unlisted.map((e) => `${e.city.id} (${e.auctions})`).join(', '));
}
if (!cities.length) throw new Error('publish gate left no cities — refusing to build an empty site');

// ---------- Per-city ----------

const cityHub = []; // for /miasta/

for (const { city, props } of published) {
  const dataDir = join(ROOT, 'data', city.id);
  const landPlots = existsSync(join(dataDir, 'land.json')) ? (readJson(join(dataDir, 'land.json')).plots || []).length : 0;
  const meta = existsSync(join(dataDir, 'meta.json')) ? readJson(join(dataDir, 'meta.json')) : {};
  const generated = (meta.generated_at || today).slice(0, 10);

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
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Dataset',
      name: `Przetargi na mieszkania — ${city.label}`,
      description: `Historia miejskich przetargów na nieruchomości ${inCity(city)}: ceny wywoławcze, rundy, wyniki. Dane z BIP ${city.authority || 'urzędu miasta'}, aktualizowane codziennie.`,
      url: `${SITE}/${city.id}/`,
      inLanguage: 'pl',
      dateModified: generated,
      creator: { '@type': 'Organization', name: 'przetargimiejskie', url: `${SITE}/` },
      distribution: [{
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${SITE}/data/${city.id}/properties.json`,
      }],
    },
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
      jsonLd: [
        {
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'przetargimiejskie', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: city.label, item: `${SITE}/${city.id}/` },
            { '@type': 'ListItem', position: 3, name: `${p._addr}, ${city.label}` },
          ],
        },
        // Product/Offer only while an auction is genuinely upcoming — a sold or
        // stale listing must not advertise a live price to crawlers.
        {
          '@context': 'https://schema.org', '@type': 'Product',
          name: `${p._addr}, ${city.label}`,
          category: KIND_LABEL[p.kind] || 'nieruchomość',
          description: desc,
          url: `${SITE}/${city.id}/${p._slug}/`,
          ...(live && live.starting_price_pln ? {
            offers: {
              '@type': 'Offer',
              price: live.starting_price_pln,
              priceCurrency: 'PLN',
              availability: 'https://schema.org/InStock',
              url: `${SITE}/${city.id}/${p._slug}/`,
              ...(live.date ? { validThrough: live.date } : {}),
            },
          } : {}),
        },
      ],
      body: `
<p class="lead">${KIND_LABEL[p.kind] || 'Nieruchomość'}${p.area_m2 ? `, ${fmtArea(p.area_m2)}` : ''} —
${live ? 'najbliższy przetarg poniżej, pod spodem' : ''} pełna historia licytacji ${esc(city.authority || 'miasta')}
(rundy, ceny wywoławcze, wyniki). Więcej nieruchomości: <a href="/${city.id}/">przetargi ${esc(city.label)}</a>.</p>
${liveBlock}
<section class="section"><h2 class="section-title">Historia przetargów</h2>${histTable}
<p class="note">Tabela pokazuje zaobserwowane, opublikowane terminy i statusy. Nie należy
wnioskować o wyniku wcześniejszego terminu wyłącznie z numeru późniejszej rundy;
wiążące informacje znajdują się w dokumentach źródłowych urzędu.</p></section>`,
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
<div class="chip-row">${cityHub.map(({ city, active, archived, props }) =>
  `<span class="chip"><a href="/${city.id}/">${esc(city.label)}</a><span class="m">${chipMeta({ live: active, archived, props })}</span></span>`).join('\n')}</div>
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

for (const p of [
  '/', '/archiwum/', '/raporty/', '/dla-samorzadow/',
  '/dla-samorzadow/przyklad-gliwice/', '/privacy/',
]) addUrl(p);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), xml);

console.error(`  seo: wrote ${sitemap.length} URLs to sitemap.xml (${cityHub.length} cities)`);

// ---------- llms.txt + llms-full.txt ----------
// Agent-discovery files (https://llmstxt.org): what the site is, where the
// static pages are, and where the raw JSON lives. Generated so the city list
// and counts never go stale.

const activeOf = (c) => LIVE_BY_ID[c.id] ?? 0;
const cityLine = (c) => `- ${c.label}: ${SITE}/${c.id}/ (${fmtInt(activeOf(c))} aktywnych · ${fmtInt(c.archived_auctions || 0)} w archiwum)`;

const llms = `# przetargimiejskie

> Historia miejskich przetargów na mieszkania w Polsce — municipal property-auction
> history for Poland. Starting prices, PLN/m², auction rounds and sale outcomes,
> scraped daily from official BIP bulletins. Public scope: Śląskie voivodeship
> (${cities.length} cities). Page content is in Polish.

## Pages (fully static, no JavaScript needed)

- ${SITE}/miasta/ — city hub, links every city page
- ${SITE}/<city>/ — per city: live auctions, recent results, every tracked property
- ${SITE}/<city>/<address-slug>/ — one property's full auction history (rounds, prices, outcomes)
- ${SITE}/<city>/<YYYY-MM>/ — monthly recap of what the city put up for auction
- ${SITE}/dla-samorzadow/ — fixed-scope, source-linked reporting product for municipalities
- ${SITE}/dla-samorzadow/przyklad-gliwice/ — frozen public HTML/PDF/CSV example with explicit scope and denominators

## Pages that need JavaScript

- ${SITE}/archiwum — searchable all-auction archive (same records as the JSON below)
- ${SITE}/raporty — market reports

## Machine-readable data (JSON, updated daily)

- ${SITE}/data/index.json — every monitored city with per-city counts
- ${SITE}/data/<city>/properties.json — all properties + full listing history for one city
- ${SITE}/data/<city>/land.json — municipal land plots (where available)
- ${SITE}/data/<city>/meta.json — per-city freshness metadata
- ${SITE}/dla-samorzadow/przyklad-gliwice/analiza-zrodlowa.json — immutable analysis snapshot behind the public example
- Sitemap: ${SITE}/sitemap.xml

## Cities

${cityHub.map(({ city }) => cityLine(city)).join('\n')}

## Contact

- kontakt@przetargimiejskie.pl · source: https://github.com/110kc3/przetargimiejskie
`;
writeFileSync(join(OUT, 'llms.txt'), llms);

const llmsFull = `${llms}
## Per-city data endpoints

${cityHub.map(({ city }) => `- ${SITE}/data/${city.id}/properties.json`).join('\n')}

## Notes

- Data source: public Biuletyn Informacji Publicznej (BIP) pages of city offices and
  municipal housing authorities. Prices and dates are informational; only the office's
  source documents are binding. Unofficial tool, not affiliated with any city office.
- A free Chrome extension overlays the same history directly on BIP listing pages:
  https://chromewebstore.google.com/detail/przetargi-miejskie/jcbkaleamaoknicmilbjibgebmdloken
`;
writeFileSync(join(OUT, 'llms-full.txt'), llmsFull);
console.error('  seo: wrote llms.txt + llms-full.txt');

// ---------- .well-known/agent.json ----------
// A2A-style agent card: what an agent looks for at a domain root before it will
// treat a site as a callable data source rather than a page to scrape.
// Generated rather than committed, so the city count and the per-city endpoint
// list track the same `cities` array everything else here is built from.
//
// Described as a data source, not a callable JSON-RPC agent: what is on offer is
// a set of static JSON documents, and claiming a transport that does not exist
// would be worse than publishing no card at all.
const agentCard = {
  name: 'przetargimiejskie',
  description: 'Historia miejskich przetargów na sprzedaż mieszkań w Polsce: ceny wywoławcze, zł/m², rundy i wyniki, zbierane codziennie z oficjalnych biuletynów BIP. '
    + `Zakres publiczny: ${cities.length} miast. Treść w języku polskim.`,
  url: `${SITE}/`,
  documentationUrl: `${SITE}/llms.txt`,
  version: '1.0.0',
  protocolVersion: '0.3.0',
  provider: { organization: 'przetargimiejskie', url: `${SITE}/` },
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['application/json'],
  skills: [
    {
      id: 'city_index',
      name: 'Monitored cities and counters',
      description: `GET /data/index.json — every monitored city with live-auction, archive and unique-property counts. Currently ${cities.length} public cities.`,
      tags: ['auctions', 'poland', 'municipal', 'index'],
      examples: ['Które miasta są monitorowane?', 'How many live municipal auctions are there right now?'],
      inputModes: ['text/plain'],
      outputModes: ['application/json'],
    },
    {
      id: 'city_properties',
      name: 'Per-city auction history',
      description: 'GET /data/<city>/properties.json — every tracked property in one city with its full auction history: starting price, PLN/m², round number, date and outcome. /data/<city>/land.json carries municipal land plots where available.',
      tags: ['auctions', 'property', 'history', 'prices'],
      examples: ['Pokaż historię przetargów w Gliwicach', 'What did flats in Katowice sell for per square metre?'],
      inputModes: ['text/plain'],
      outputModes: ['application/json'],
    },
  ],
  interfaces: {
    llms_txt: `${SITE}/llms.txt`,
    llms_full_txt: `${SITE}/llms-full.txt`,
    city_index_json: `${SITE}/data/index.json`,
    sitemap: `${SITE}/sitemap.xml`,
  },
  city_endpoints: Object.fromEntries(cityHub.map(({ city }) => [city.id, `${SITE}/data/${city.id}/properties.json`])),
  _note: "Published data source, not a callable JSON-RPC agent: the skills above name static JSON documents to fetch. Data comes from public BIP bulletins; only the issuing office's own documents are binding.",
};
const agentCardJson = `${JSON.stringify(agentCard, null, 2)}\n`;
mkdirSync(join(OUT, '.well-known'), { recursive: true });
writeFileSync(join(OUT, '.well-known', 'agent.json'), agentCardJson);
// Same card at a second, non-dotfile path. The deploy mirrors _site/ to OVH with
// `lftp mirror --reverse`, and whether that picks up a dot-directory is a detail
// of lftp's local globbing rather than something this build controls — so the
// card is also published where no dotfile handling is involved. /agents.json is
// the convention already used on 110kc3.github.io, and agent-readability
// auditors accept either path.
writeFileSync(join(OUT, 'agents.json'), agentCardJson);
// A2A 1.0 reads /.well-known/agent-card.json. /.well-known/agent.json is the
// pre-0.3 path, which a 1.0 client never looks at — so serving only that one
// makes the card invisible to exactly the clients the spec moved for. Same
// document at both paths while the installed base catches up; it costs a file.
writeFileSync(join(OUT, '.well-known', 'agent-card.json'), agentCardJson);
console.error('  seo: wrote .well-known/agent.json + .well-known/agent-card.json + agents.json');

// ---------- landing: bake stats + city chips into the static HTML ----------
// The landing's own <script> fetches /data/index.json and paints the same
// values — this injection makes them present in the raw HTML too, so no-JS
// crawlers see real numbers instead of "—" and an empty #cities container.

const landingPath = join(OUT, 'index.html');
let landing = readFileSync(landingPath, 'utf8');

const statProps = cities.reduce((s, c) => s + (c.unique_properties || 0), 0);
const statActive = cities.reduce((s, c) => s + activeOf(c), 0);
const statArchived = cities.reduce((s, c) => s + (c.archived_auctions || 0), 0);
// The chip is an <a>, not a <span>. It used to be a span, which made the landing
// a dead end for a crawler: the 55 city hubs (and through them all ~2 200
// property pages) were reachable only from the sitemap, because nothing on the
// homepage linked to them and /miasta/ was itself unlinked. A sitemap gets a URL
// discovered; internal links are what get it crawled and ranked. Visually
// identical — every text node inside the chip (.city-name, .city-meta) sets its
// own colour, and `a` is already text-decoration:none globally.
const chipHtml = (c) => {
  const meta = chipMeta({ live: activeOf(c), archived: c.archived_auctions || 0, props: c.unique_properties || 0 });
  return `<a class="city-chip" href="/${c.id}/">${cityDot(c.id)}<span class="city-name">${esc(c.label)}</span><span class="city-meta">${meta}</span></a>`;
};
// Group by voivodeship, mirroring the landing's runtime JS: largest group first,
// then alphabetically. (This used to hardcode a single "Śląskie" heading — wrong
// the moment PUBLIC_VOIVODESHIPS opened past one voivodeship.)
const WOJ = {
  dolnoslaskie: 'Dolnośląskie', 'kujawsko-pomorskie': 'Kujawsko-Pomorskie', lubelskie: 'Lubelskie',
  lubuskie: 'Lubuskie', lodzkie: 'Łódzkie', malopolskie: 'Małopolskie', mazowieckie: 'Mazowieckie',
  opolskie: 'Opolskie', podkarpackie: 'Podkarpackie', podlaskie: 'Podlaskie', pomorskie: 'Pomorskie',
  slaskie: 'Śląskie', swietokrzyskie: 'Świętokrzyskie', 'warminsko-mazurskie': 'Warmińsko-Mazurskie',
  wielkopolskie: 'Wielkopolskie', zachodniopomorskie: 'Zachodniopomorskie',
};
const wojGroups = {};
for (const c of cities) (wojGroups[c.voivodeship || 'inne'] ||= []).push(c);
const chipsHtml = Object.keys(wojGroups)
  .sort((x, y) => wojGroups[y].length - wojGroups[x].length || (WOJ[x] || x).localeCompare(WOJ[y] || y, 'pl'))
  .map((w) => `<div class="city-group"><div class="city-group-title">${esc(WOJ[w] || w)}</div>`
    + `<div class="city-row">${wojGroups[w].slice().sort((a, b) => a.label.localeCompare(b.label, 'pl')).map(chipHtml).join('')}</div></div>`)
  .join('');

const inject = (marker, replacement) => {
  if (!landing.includes(marker)) throw new Error(`landing injection marker not found: ${marker}`);
  landing = landing.replace(marker, replacement);
};
inject('<div class="stat-value" id="stat-cities">—</div>', `<div class="stat-value" id="stat-cities">${fmtInt(cities.length)}</div>`);
inject('<div class="stat-value" id="stat-props">—</div>', `<div class="stat-value" id="stat-props">${fmtInt(statProps)}</div>`);
inject('<div class="stat-value" id="stat-active">—</div>', `<div class="stat-value" id="stat-active">${fmtInt(statActive)}</div>`);
inject('<div class="stat-value" id="stat-archived">—</div>', `<div class="stat-value" id="stat-archived">${fmtInt(statArchived)}</div>`);
inject('<div class="city-groups" id="cities"></div>', `<div class="city-groups" id="cities">${chipsHtml}</div>`);
writeFileSync(landingPath, landing);
console.error('  seo: baked landing stats + city chips into index.html');

// ---------- publish the gated data/index.json ----------
// The runtime pages (landing chips, /archiwum) fetch /data/index.json. Rewrite
// the *published copy* so they see exactly what this script decided: a `public`
// flag per city plus the same date-aware `live_auctions` count baked into the
// static HTML above — one gate, one set of numbers, no page contradicting
// another. The repo's own data/index.json is deliberately left untouched: the
// Chrome extension fetches that one from raw.githubusercontent.com and must
// keep seeing every city, listed or not.

const publicIds = new Set(cities.map((c) => c.id));
const outIndex = {
  ...index,
  public_city_ids: [...publicIds],
  cities: (index.cities || []).map((c) => ({
    ...c,
    live_auctions: LIVE_BY_ID[c.id] ?? null, // null = not evaluated (outside the public voivodeship scope)
    public: publicIds.has(c.id),
  })),
};
writeFileSync(join(OUT, 'data', 'index.json'), JSON.stringify(outIndex, null, 2));
console.error(`  seo: published data/index.json — ${publicIds.size} public of ${(index.cities || []).length} cities`);

// ---------- analytics: inject the tracking snippet into every built page ----------
// Whichever provider is configured must be cookieless and store no personal
// data — that is the only kind compatible with the site's RODO stance
// (RODO-DRAFT.md), the disclosure in site/privacy/, and the extension's
// zero-tracking promise. It is also what lets the site run with no consent
// banner. Do not swap in a provider that fails those tests without updating
// site/privacy/index.html in the same commit.
//
// Default: Umami Cloud (Hobby tier, free) on its standard cloud.umami.is
// endpoint. Umami runs both US and EU servers but does not document how to pick
// the EU one, so the privacy page deliberately makes NO hosting-location claim —
// its RODO argument rests on "no personal data is processed at all", which holds
// either way. If EU residency is ever confirmed or self-hosting happens, point
// ANALYTICS_HOST at that origin and update site/privacy/ in the same commit.
//
// Injected here, as the last build step, rather than pasted into each template:
// it lands on the static site/ pages and every generated SEO page alike, and a
// page added later cannot silently ship unmeasured.
//
//   ANALYTICS_PROVIDER  umami (default) | plausible
//   ANALYTICS_ID        umami website id (UUID) | plausible domain
//   ANALYTICS_HOST      self-hosted origin (umami only; default cloud.umami.is)
//
// With no ANALYTICS_ID the snippet is omitted entirely. That is deliberate: a
// placeholder id would ship a script that beacons nowhere and give a false
// impression that traffic is being recorded.

const ANALYTICS = {
  umami: (id, host) => `<script defer src="${esc((host || 'https://cloud.umami.is').replace(/\/$/, ''))}/script.js" data-website-id="${esc(id)}"></script>`,
  plausible: (id) => `<script defer data-domain="${esc(id)}" src="https://plausible.io/js/script.js"></script>`,
  // Cloudflare Web Analytics. Chosen 2026-08-03 because this site is on OVH and
  // moving its DNS to Cloudflare would mean moving a domain that carries live
  // email — the beacon needs no DNS change at all. Cookieless, no cross-site
  // identifier, so no consent banner is added by it.
  //
  // The token is public by design: it ships in the HTML of every page. It
  // identifies which site a hit belongs to and grants no access to anything.
  cloudflare: (token) => `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(token)}"}'></script>`,
};
const A_PROVIDER = process.env.ANALYTICS_PROVIDER || 'umami';
const A_ID = process.env.ANALYTICS_ID || '';
if (!A_ID) {
  console.error('  seo: NOTE — no ANALYTICS_ID set, pages built without analytics.');
} else if (!ANALYTICS[A_PROVIDER]) {
  console.error(`  seo: WARNING — unknown ANALYTICS_PROVIDER "${A_PROVIDER}", analytics skipped (expected: ${Object.keys(ANALYTICS).join(' | ')})`);
} else {
  const tag = ANALYTICS[A_PROVIDER](A_ID, process.env.ANALYTICS_HOST);
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.html') ? [p] : []);
  });
  let injected = 0;
  for (const file of walk(OUT)) {
    const html = readFileSync(file, 'utf8');
    if (html.includes('data-website-id=') || html.includes('plausible.io/js/') || html.includes('data-cf-beacon')) continue;
    if (!html.includes('</head>')) { console.error(`  seo: WARNING — no </head>, analytics skipped: ${file}`); continue; }
    writeFileSync(file, html.replace('</head>', `${tag}\n</head>`));
    injected++;
  }
  console.error(`  seo: injected ${A_PROVIDER} analytics into ${injected} page(s)`);
}
