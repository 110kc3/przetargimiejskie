// P1-D — Weekly newsletter digest generator.
//
// Renders a Markdown + HTML "nowe ogłoszenia w tym tygodniu" (new auctions this
// week, per city) digest from the committed data/<city>/properties.json, using a
// stored sent-list (newsletter/seen.json) so each run reports only announcements
// not seen before. The send/ESP integration is intentionally out of scope
// (see TODO P1-D — "build the generator now; the send can follow").
//
// WHY delta, not date: a listing has no first-seen field (only the auction
// `date`), so "new" can't be derived from the data alone — we track which
// announcement IDs were already reported. Identity per announcement, most-
// stable-first: source_pdf -> detail_url -> `<city>|<key>|r<round>|<date>`.
//
// Only OPEN auctions (outcome active/announced) are rendered: a freshly crawled
// *result* (sold/unsold/archived) is still recorded in seen.json so it never
// resurfaces, but it isn't advertised as a buying opportunity. Pass
// --include-concluded to render those too.
//
// FIRST RUN (missing/empty seen.json) seeds the baseline silently: it records
// every current ID and emits a short "baseline established" digest, so the NEXT
// run is the first that reports genuine new listings.
//
// Pure fns (listingId/buildModel/render*) are exported for the test; main() is
// the CLI that reads/writes the filesystem.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const OPEN_OUTCOMES = new Set(['active', 'announced']);

const KIND_LABEL = {
  mieszkalny: 'Lokal mieszkalny',
  uzytkowy: 'Lokal użytkowy',
  zabudowana: 'Nieruchomość zabudowana',
  garaz: 'Garaż',
  unknown: 'Nieruchomość',
};

/** Stable identity of a single auction announcement (one listing round). */
export function listingId(citySlug, prop, listing) {
  if (listing.source_pdf) return String(listing.source_pdf).trim();
  if (listing.detail_url) return String(listing.detail_url).trim();
  const key = prop.key || [prop.street_norm, prop.building, prop.apt].filter(Boolean).join('|');
  return `${citySlug}|${key}|r${listing.round ?? '?'}|${listing.date ?? '?'}`;
}

// pl-PL integer with space thousands — implemented by hand so CI output doesn't
// depend on ICU locale data.
export function formatPLN(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
export function formatArea(a) {
  if (a == null || !Number.isFinite(a)) return null;
  return a.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}
export function formatDate(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso);
}

// Polish plural: 1 / 2–4 / 5+ (with the 12–14 "teens" exception → many).
export function plNoun(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n === 1) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

function addressOf(prop) {
  const street = prop.street || prop.street_norm;
  if (!street) return prop.key || '(bez adresu)';
  const bld = prop.building ? ` ${prop.building}` : '';
  const apt = prop.apt ? `/${prop.apt}` : '';
  return `ul. ${street}${bld}${apt}`;
}

function kindLabel(kind) {
  if (KIND_LABEL[kind]) return KIND_LABEL[kind];
  if (!kind) return 'Nieruchomość';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * Build the digest model from already-loaded cities (no filesystem access).
 * @param {{cities:Array<{id:string,label:string,properties:Array}>, seen:Set<string>, now:Date, includeConcluded?:boolean}} args
 */
export function buildModel({ cities, seen, now, includeConcluded = false }) {
  const firstRun = seen.size === 0;
  const currentIds = new Set();
  const sections = [];
  let totalNew = 0;

  for (const city of cities) {
    const items = [];
    for (const prop of city.properties || []) {
      for (const listing of prop.listings || []) {
        const id = listingId(city.id, prop, listing);
        currentIds.add(id);
        if (firstRun || seen.has(id)) continue; // not new (or seeding baseline)
        const open = OPEN_OUTCOMES.has(listing.outcome);
        if (!open && !includeConcluded) continue; // new but concluded → tracked, not shown
        const price = listing.starting_price_pln ?? null;
        const area = listing.area_m2 ?? prop.area_m2 ?? null;
        const zlM2 = price != null && area != null && area > 0 ? Math.round(price / area) : null;
        items.push({
          id,
          address: addressOf(prop),
          kindLabel: kindLabel(listing.kind || prop.kind),
          price,
          priceFmt: formatPLN(price),
          area,
          areaFmt: formatArea(area),
          zlM2,
          zlM2Fmt: formatPLN(zlM2),
          date: listing.date ?? null,
          dateFmt: formatDate(listing.date),
          round: listing.round ?? null,
          outcome: listing.outcome ?? null,
          url: listing.detail_url || listing.source_pdf || null,
        });
      }
    }
    if (items.length) {
      items.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')); // soonest first, null dates last
      sections.push({ id: city.id, label: city.label, items });
      totalNew += items.length;
    }
  }

  // seen is monotonic: after this run EVERY current announcement is marked seen.
  const nextSeen = [...new Set([...seen, ...currentIds])].sort();

  return {
    generatedAt: now.toISOString().slice(0, 10),
    seededBaseline: firstRun,
    totalTracked: currentIds.size,
    totalNew: firstRun ? 0 : totalNew,
    sections: firstRun ? [] : sections,
    nextSeen,
  };
}

function lineParts(it) {
  const parts = [];
  parts.push(it.url ? `**[${it.address}](${it.url})**` : `**${it.address}**`);
  parts.push(it.kindLabel);
  if (it.priceFmt) parts.push(`${it.priceFmt} zł`);
  if (it.areaFmt) parts.push(`${it.areaFmt} m²`);
  if (it.zlM2Fmt) parts.push(`${it.zlM2Fmt} zł/m²`);
  parts.push((it.dateFmt ? `przetarg ${it.dateFmt}` : 'termin nieznany') + (it.round ? ` (runda ${it.round})` : ''));
  if (it.outcome && !OPEN_OUTCOMES.has(it.outcome)) parts.push(`[${it.outcome}]`);
  return parts;
}

export function renderMarkdown(model) {
  const L = [`# Przetargi miejskie — nowe ogłoszenia (${model.generatedAt})`, ''];
  if (model.seededBaseline) {
    L.push(`Ustalono punkt odniesienia — śledzę ${model.totalTracked} ${plNoun(model.totalTracked, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')}.`);
    L.push('Pierwszy biuletyn z nowościami pojawi się przy kolejnym uruchomieniu.');
    return L.join('\n') + '\n';
  }
  if (model.totalNew === 0) {
    L.push('Brak nowych ogłoszeń w tym tygodniu.');
    return L.join('\n') + '\n';
  }
  const cc = model.sections.length;
  L.push(`**${model.totalNew}** ${plNoun(model.totalNew, 'nowe ogłoszenie', 'nowe ogłoszenia', 'nowych ogłoszeń')} w ${cc} ${plNoun(cc, 'mieście', 'miastach', 'miastach')}.`);
  L.push('');
  for (const s of model.sections) {
    L.push(`## ${s.label} (${s.items.length})`);
    for (const it of s.items) L.push('- ' + lineParts(it).join(' · '));
    L.push('');
  }
  return L.join('\n').replace(/\n+$/, '\n');
}

export function renderHtml(model) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const date = esc(model.generatedAt);
  const head = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Przetargi miejskie — ${date}</title></head><body>`;
  const h1 = `<h1>Przetargi miejskie — nowe ogłoszenia (${date})</h1>`;
  const foot = '</body></html>';
  if (model.seededBaseline) {
    return `${head}${h1}<p>Ustalono punkt odniesienia — śledzę ${model.totalTracked} ${plNoun(model.totalTracked, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')}. Pierwszy biuletyn z nowościami pojawi się przy kolejnym uruchomieniu.</p>${foot}`;
  }
  if (model.totalNew === 0) {
    return `${head}${h1}<p>Brak nowych ogłoszeń w tym tygodniu.</p>${foot}`;
  }
  const body = model.sections.map((s) => {
    const lis = s.items.map((it) => {
      const bits = [it.kindLabel];
      if (it.priceFmt) bits.push(`${it.priceFmt} zł`);
      if (it.areaFmt) bits.push(`${it.areaFmt} m²`);
      if (it.zlM2Fmt) bits.push(`${it.zlM2Fmt} zł/m²`);
      bits.push(it.dateFmt ? `przetarg ${it.dateFmt}` : 'termin nieznany');
      if (it.round) bits.push(`runda ${it.round}`);
      if (it.outcome && !OPEN_OUTCOMES.has(it.outcome)) bits.push(it.outcome);
      const name = it.url ? `<a href="${esc(it.url)}">${esc(it.address)}</a>` : esc(it.address);
      return `<li><strong>${name}</strong> — ${bits.map(esc).join(' · ')}</li>`;
    }).join('');
    return `<h2>${esc(s.label)} (${s.items.length})</h2><ul>${lis}</ul>`;
  }).join('');
  const summary = `<p><strong>${model.totalNew}</strong> ${plNoun(model.totalNew, 'nowe ogłoszenie', 'nowe ogłoszenia', 'nowych ogłoszeń')} w ${model.sections.length} ${plNoun(model.sections.length, 'mieście', 'miastach', 'miastach')}.</p>`;
  return `${head}${h1}${summary}${body}${foot}`;
}

function loadJSON(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run') || process.env.NEWSLETTER_DRY_RUN === '1';
  const includeConcluded = argv.includes('--include-concluded');
  const root = process.env.NEWSLETTER_ROOT || process.cwd();
  const dataDir = join(root, 'data');
  const outDir = join(root, 'newsletter');
  const seenPath = join(outDir, 'seen.json');

  const index = loadJSON(join(dataDir, 'index.json'));
  const cities = [];
  for (const c of index.cities || []) {
    const pp = join(dataDir, c.id, 'properties.json');
    if (!existsSync(pp)) continue;
    cities.push({ id: c.id, label: c.label || c.id, properties: loadJSON(pp).properties || [] });
  }

  let seen = new Set();
  if (existsSync(seenPath)) {
    try {
      const arr = loadJSON(seenPath);
      if (Array.isArray(arr)) seen = new Set(arr.map(String));
    } catch {
      /* corrupt/empty seen → treat as first run (re-seed) */
    }
  }

  const model = buildModel({ cities, seen, now: new Date(), includeConcluded });
  const md = renderMarkdown(model);
  const html = renderHtml(model);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${model.generatedAt}.md`), md, 'utf8');
  writeFileSync(join(outDir, `${model.generatedAt}.html`), html, 'utf8');
  writeFileSync(join(outDir, 'latest.md'), md, 'utf8');
  writeFileSync(join(outDir, 'latest.html'), html, 'utf8');
  if (!dryRun) writeFileSync(seenPath, JSON.stringify(model.nextSeen, null, 1) + '\n', 'utf8');

  const note = model.seededBaseline
    ? `baseline seeded: ${model.totalTracked} tracked`
    : `${model.totalNew} new across ${model.sections.length} cities`;
  process.stderr.write(`[newsletter] ${model.generatedAt}: ${note}${dryRun ? ' (dry-run, seen.json unchanged)' : ''}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
