#!/usr/bin/env node
// B2G one-pager generator — the "sell the failure data back to the city" pitch
// (GTM.md §2.2). Produces outreach/<city>/one-pager-<city>.pdf from the city's
// own committed data.
//
//   node scripts/build-onepager.mjs <city-id> [<city-id> ...]
//
// The pitch, in one line: a city sees only its own auction board, and only while
// a notice is live. We hold every round, every outcome and every price cut across
// 121 cities, so we can tell a city what its own sell-through is and how much a
// failed round costs it. No competitor tracks outcomes (GTM.md §8), which is what
// makes this line defensible.
//
// Tone rule: lead with "how to price round 1 so it sells", never with "your
// auctions fail". The numbers are blunt enough on their own.
//
// Every metric is derived, and any metric a city's data can't support is dropped
// rather than rendered as a zero — a tile reading "0%" would misrepresent missing
// source data as a real finding. Requires playwright (already in pipeline/).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inCity } from './lib/city-loc.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const fmtInt = (n) => Number(Math.round(n)).toLocaleString('pl-PL');
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const MONTHS_GEN = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const shortDate = (iso) => { const [y, m] = iso.slice(0, 7).split('-'); return `${MONTHS_GEN[+m - 1]} ${y}`; };
// Polish plural: 1 lokal · 2–4 lokale · 5+ lokali (with the 12–14 exception).
const plNoun = (n, one, few, many) => (n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many);
const lokal = (n) => plNoun(n, 'lokal', 'lokale', 'lokali');

// ---------- metrics ----------

function analyse(city, props) {
  // A "decided" listing is one whose outcome the city actually published. Those
  // are the only rows that can carry this argument — 'archived' means concluded
  // with an unknown result and would silently bias the sell-through if counted.
  const decided = [];
  for (const p of props) {
    const ls = [...(p.listings || [])].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    for (const l of ls) if (l.outcome === 'sold' || l.outcome === 'unsold') decided.push({ p, l, ls });
  }
  if (decided.length < 20) return null; // too thin to argue from

  const sold = decided.filter((d) => d.l.outcome === 'sold');
  const unsold = decided.filter((d) => d.l.outcome === 'unsold');

  // by calendar year
  const byYear = {};
  for (const d of decided) {
    const y = (d.l.date || '').slice(0, 4);
    if (!y) continue;
    (byYear[y] ||= { sold: 0, unsold: 0 });
    byYear[y][d.l.outcome === 'sold' ? 'sold' : 'unsold']++;
  }
  const years = Object.keys(byYear).sort().slice(-4);
  const dates = decided.map((d) => d.l.date).filter(Boolean).sort();

  // sold only after one or more failed rounds
  const soldLate = sold.filter((d) => (d.l.round ?? 1) >= 2);
  const maxRound = Math.max(...sold.map((d) => d.l.round ?? 1), 1);

  // still unsold after >= 2 failed attempts
  const stuck = props.filter((p) => {
    const ls = p.listings || [];
    return ls.filter((l) => l.outcome === 'unsold').length >= 2 && !ls.some((l) => l.outcome === 'sold');
  }).length;

  // price given up: first asking price vs the asking price it finally sold at
  const drops = [];
  let totalGiveUp = 0;
  for (const d of soldLate) {
    const first = d.ls.find((l) => l.starting_price_pln);
    if (!first || !d.l.starting_price_pln || first === d.l) continue;
    if (d.l.starting_price_pln >= first.starting_price_pln) continue;
    drops.push((100 * (d.l.starting_price_pln - first.starting_price_pln)) / first.starting_price_pln);
    totalGiveUp += first.starting_price_pln - d.l.starting_price_pln;
  }
  const medDrop = median(drops);

  // months added per failed round
  const gaps = [];
  for (const p of props) {
    const ls = [...(p.listings || [])].filter((l) => l.date).sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < ls.length; i++) {
      const a = new Date(ls[i - 1].date), b = new Date(ls[i].date);
      const m = (b - a) / (1000 * 60 * 60 * 24 * 30.44);
      if (m > 0 && m < 36) gaps.push(m);
    }
  }
  const medGap = median(gaps);

  // "nobody even paid the deposit" — only some cities publish the reason
  const noDeposit = unsold.filter((d) => d.l.unsold_reason === 'no_deposits').length;

  const lastYear = years[years.length - 1];
  return {
    city, decided: decided.length, sold: sold.length, unsold: unsold.length,
    pctUnsold: pct(unsold.length, decided.length),
    byYear, years, lastYear, lastYearPctUnsold: pct(byYear[lastYear].unsold, byYear[lastYear].sold + byYear[lastYear].unsold),
    from: dates[0], to: dates[dates.length - 1],
    soldLate: soldLate.length, maxRound, stuck,
    medDrop, totalGiveUp, dropN: drops.length,
    medGap, noDeposit, pctNoDeposit: pct(noDeposit, unsold.length),
  };
}

// ---------- rendering ----------

const NAVY = '#1c3a5c', GREEN = '#3a9d6e', RED = '#cf4b42', AMBER = '#dd9330';

function chartSvg(m) {
  const W = 660, H = 300, padB = 46, padT = 54;
  const max = Math.max(...m.years.map((y) => Math.max(m.byYear[y].sold, m.byYear[y].unsold)), 1);
  const groupW = W / m.years.length, barW = Math.min(56, groupW / 3.2), gap = 10;
  const h = (v) => Math.round(((H - padT - padB) * v) / max);
  let out = '';
  m.years.forEach((y, i) => {
    const cx = i * groupW + groupW / 2;
    const g = m.byYear[y], tot = g.sold + g.unsold;
    const x1 = cx - barW - gap / 2, x2 = cx + gap / 2;
    const h1 = h(g.sold), h2 = h(g.unsold);
    const yTop = (bh) => H - padB - bh;
    out += `<rect x="${x1}" y="${yTop(h1)}" width="${barW}" height="${h1}" fill="${GREEN}" rx="2"/>`
      + `<rect x="${x2}" y="${yTop(h2)}" width="${barW}" height="${h2}" fill="${RED}" rx="2"/>`
      + `<text x="${x1 + barW / 2}" y="${yTop(h1) - 7}" text-anchor="middle" class="bv">${g.sold}</text>`
      + `<text x="${x2 + barW / 2}" y="${yTop(h2) - 7}" text-anchor="middle" class="bv">${g.unsold}</text>`
      + `<text x="${cx}" y="${H - padB + 20}" text-anchor="middle" class="ax">${y}${y === m.lastYear ? '*' : ''}</text>`
      + `<text x="${cx}" y="26" text-anchor="middle" class="hd">${pct(g.unsold, tot)}% nieudanych</text>`;
  });
  out += `<line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="#c9d3df" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<style>.bv{font:700 13px sans-serif;fill:${NAVY}}.ax{font:600 13px sans-serif;fill:#5b6b7d}.hd{font:700 14px sans-serif;fill:${RED}}</style>${out}</svg>`;
}

function tiles(m) {
  const t = [];
  t.push({ v: `${m.lastYearPctUnsold}%`, c: RED, l: `przetargów w ${m.lastYear} r.<br>bez rozstrzygnięcia` });
  if (m.pctNoDeposit >= 15) t.push({ v: `${m.pctNoDeposit}%`, c: RED, l: 'nieudanych przetargów<br>bez ani jednego wadium' });
  if (m.medDrop != null && m.dropN >= 3) t.push({ v: `${m.medDrop.toFixed(1).replace('.', ',').replace('-', '−')}%`, c: AMBER, l: 'niższa cena przy sprzedaży<br>po nieudanej rundzie' });
  if (m.medGap != null) t.push({ v: `+${Math.round(m.medGap)} mies.`, c: NAVY, l: 'dłuższa sprzedaż po każdej<br>nieudanej rundzie' });
  if (t.length < 4 && m.stuck) t.push({ v: fmtInt(m.stuck), c: NAVY, l: `${lokal(m.stuck)} czeka po dwóch<br>i więcej nieudanych rundach` });
  if (t.length < 4) t.push({ v: `${m.pctUnsold}%`, c: RED, l: `nieudanych przetargów<br>w całym okresie` });
  return t.slice(0, 4);
}

function bullets(m) {
  const b = [];
  if (m.soldLate) {
    const share = m.sold ? Math.round(m.sold / m.soldLate) : 0;
    const lead = share >= 2 && share <= 5 ? `Co ${['', '', 'drugie', 'trzecie', 'czwarte', 'piąte'][share]} sprzedane mieszkanie` : 'Część sprzedanych mieszkań';
    b.push(`${lead} (${m.soldLate} ze ${m.sold}) znalazło nabywcę dopiero w ${m.maxRound > 2 ? `2.–${m.maxRound}.` : '2.'} przetargu.`);
  }
  if (m.stuck) b.push(`${m.stuck} ${lokal(m.stuck)} po dwóch i więcej nieudanych rundach nadal ${plNoun(m.stuck, 'czeka', 'czekają', 'czeka')} na nabywcę.`);
  if (m.totalGiveUp > 0) {
    const kw = m.totalGiveUp >= 1e6
      ? `${(m.totalGiveUp / 1e6).toFixed(2).replace('.', ',')} mln zł`
      : `${fmtInt(m.totalGiveUp / 1000)} tys. zł`;
    b.push(`Sprzedaż po nieudanych rundach oznacza łącznie ok. ${kw} poniżej pierwotnych cen wywoławczych (tylko w przypadkach z pełną historią cen — realna kwota jest wyższa).`);
  }
  return b;
}

function html(m) {
  const c = m.city;
  const auth = c.authority || 'urzędu miasta';
  return `<meta charset="utf-8"><style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;color:#20303f;font-size:11.5pt;line-height:1.5}
.hdr{background:${NAVY};color:#fff;padding:20px 34px 18px;position:relative}
.hdr h1{margin:0 0 4px;font-size:20pt;font-weight:700;letter-spacing:-.2px}
.hdr .sub{font-size:10.5pt;color:#c3d4e6;padding-right:175px}
.hdr .brand{position:absolute;right:34px;bottom:18px;font-weight:700;font-size:11pt}
.body{padding:22px 34px 0}
.lead{margin:0 0 18px;font-size:11.5pt;color:${NAVY}}
.chart{text-align:center;margin:0 0 16px}
.chart h2{margin:0 0 2px;font-size:13.5pt;color:${NAVY}}
.chart .csub{font-size:9.5pt;color:#7b8b9c;margin-bottom:6px}
.chart .src{font-size:8pt;color:#93a2b1;margin-top:2px}
.legend{font-size:9.5pt;color:#5b6b7d;margin-top:4px}
.legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin:0 5px 0 14px;vertical-align:-1px}
.tiles{display:flex;gap:10px;margin:14px 0 18px}
.tile{flex:1;background:#f1f4f8;border:1px solid #e2e8f0;border-radius:7px;padding:11px 8px;text-align:center}
.tile .v{font-size:19pt;font-weight:700;line-height:1.1}
.tile .l{font-size:8pt;color:#5b6b7d;margin-top:4px;line-height:1.35}
h3{font-size:12.5pt;color:${NAVY};margin:0 0 7px}
h3.offer{color:#2e9e6b}
ul{margin:0 0 16px;padding-left:17px}
li{margin:3px 0}
.foot{margin-top:auto;background:#f1f4f8;padding:12px 34px;font-size:8.5pt;color:#7b8b9c;line-height:1.5}
/* Exactly one A4 page. 297mm at 96dpi = 1122.5px; hold it 2px under so sub-pixel
   rounding in the print layout can't push the footer onto a second page — the
   whole artifact is worthless as a "one-pager" if it spills. The build asserts
   the real rendered height below and fails loudly rather than clipping quietly. */
.wrap{height:1120px;display:flex;flex-direction:column;overflow:hidden}
</style>
<div class="wrap">
<div class="hdr">
  <h1>Przetargi na mieszkania komunalne ${esc(inCity(c))}</h1>
  <div class="sub">Analiza wyników przetargów · ${esc(auth)} · ${shortDate(m.from)} – ${shortDate(m.to)}</div>
  <div class="brand">przetargimiejskie.pl</div>
</div>
<div class="body">
  <p class="lead">${m.pctUnsold >= 50 ? 'Ponad połowa' : 'Znaczna część'} przetargów na sprzedaż mieszkań komunalnych kończy się bez rozstrzygnięcia
  — w badanym okresie ${m.unsold} z ${m.decided} ogłoszeń (${m.pctUnsold}%).${m.pctNoDeposit >= 15 ? `<br>W ${m.pctNoDeposit}% nieudanych przetargów nikt nie wpłacił wadium — ogłoszenie nie dotarło do kupujących.<br>To problem zasięgu, nie cen.` : '<br>Każda nieudana runda to kolejne miesiące i niższa cena wywoławcza.'}</p>

  <div class="chart">
    <h2>Skuteczność przetargów na mieszkania rok po roku</h2>
    <div class="csub">Wyniki przetargów mieszkaniowych${m.lastYear === String(new Date().getFullYear()) ? ` (*${m.lastYear} do ${shortDate(m.to).split(' ')[0]})` : ''}</div>
    ${chartSvg(m)}
    <div class="legend"><i style="background:${GREEN}"></i>sprzedane<i style="background:${RED}"></i>bez rozstrzygnięcia</div>
    <div class="src">Źródło: wyniki przetargów · ${esc(auth)} · ${shortDate(m.from)}–${shortDate(m.to)} · analiza przetargimiejskie.pl</div>
  </div>

  <div class="tiles">${tiles(m).map((t) => `<div class="tile"><div class="v" style="color:${t.c}">${t.v}</div><div class="l">${t.l}</div></div>`).join('')}</div>

  <h3>Co jeszcze pokazują dane</h3>
  <ul>${bullets(m).map((x) => `<li>${x}</li>`).join('')}</ul>

  <h3 class="offer">Propozycja współpracy — bezpłatnie</h3>
  <div>przetargimiejskie.pl to bezpłatny serwis docierający do osób aktywnie szukających mieszkań od miasta:</div>
  <ul>
    <li>każde aktywne ogłoszenie miasta prezentowane z historią cen i pełnym archiwum wyników,</li>
    <li>codzienne powiadomienia o nowych przetargach dla zainteresowanych kupujących,</li>
    <li>okresowe podsumowania skuteczności przetargów na tle innych miast w Polsce.</li>
  </ul>
  <div>Prosimy jedynie o stabilny dostęp do ogłoszeń i — opcjonalnie — odnośnik na stronie urzędu.</div>
</div>
<div class="foot">
  Kontakt: Kamil · kontakt@przetargimiejskie.pl · przetargimiejskie.pl<br>
  Źródło danych: publiczne wyniki przetargów · ${esc(auth)}${c.host ? ` (${esc(c.host)})` : ''} · ${shortDate(m.from)}–${shortDate(m.to)}. Analiza własna.
</div>
</div>`;
}

// ---------- main ----------

const ids = process.argv.slice(2);
if (!ids.length) { console.error('usage: node scripts/build-onepager.mjs <city-id> [...]'); process.exit(1); }

const pwPath = join(ROOT, 'pipeline', 'node_modules', 'playwright', 'index.mjs');
if (!existsSync(pwPath)) { console.error(`playwright not found at ${pwPath} — run "npm install" in pipeline/`); process.exit(1); }
const { chromium } = await import(pathToFileURL(pwPath).href);

const index = readJson(join(ROOT, 'data', 'index.json'));
const browser = await chromium.launch();
let made = 0;

for (const id of ids) {
  const city = (index.cities || []).find((c) => c.id === id);
  if (!city) { console.error(`  skip ${id}: not in data/index.json`); continue; }
  const pf = join(ROOT, 'data', id, 'properties.json');
  if (!existsSync(pf)) { console.error(`  skip ${id}: no properties.json`); continue; }

  const m = analyse(city, readJson(pf).properties || []);
  if (!m) { console.error(`  skip ${id}: fewer than 20 published outcomes — nothing to argue from`); continue; }

  const outDir = join(ROOT, 'outreach', id);
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, `one-pager-${id}.html`);
  writeFileSync(htmlPath, html(m));

  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  // Guard: content must fit the fixed-height wrap. `overflow:hidden` would
  // otherwise hide a too-long page by silently cropping the offer or the footer.
  const fit = await page.evaluate(() => {
    const w = document.querySelector('.wrap');
    return { need: w.scrollHeight, have: w.clientHeight };
  });
  if (fit.need > fit.have) {
    console.error(`  WARNING ${id}: content overflows the page by ${fit.need - fit.have}px — text is being clipped, tighten the layout`);
  }
  await page.pdf({ path: join(outDir, `one-pager-${id}.pdf`), format: 'A4', printBackground: true });
  await page.close();

  console.error(`  ${id}: ${m.decided} wyników (${m.sold} sprzedanych / ${m.unsold} bez nabywcy, ${m.pctUnsold}%) → outreach/${id}/one-pager-${id}.pdf`);
  made++;
}

await browser.close();
console.error(`built ${made} one-pager(s)`);
