
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { getText, getBytes } from '../../core/fetch.js';
import { parseAnnouncement, parseWykaz } from './parse.js';

const HOST = 'https://wolow.pl';
const SITEMAP_URL = `${HOST}/sitemap.xml`;

const MAX_OTHER_ANNOUNCE = 220;

const EXCLUDE_RE = /dzierzaw|najem|odwolan|uniewazni|rokowa/;
const ANNOUNCE_RE = /ustn/;
const WYKAZ_RE = /wykaz-nieruchomosci-przeznaczonych-do-(sprzedazy|zbycia)/;
const LOKAL_RE = /\blokal/;

function toAsciiSlug(url) {
  return url
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

function isAnnounceSlug(asciiSlug) {
  return ANNOUNCE_RE.test(asciiSlug) && /przetarg/.test(asciiSlug);
}

async function fetchSitemapUrls() {
  const xml = await getText(SITEMAP_URL);
  const gzM = /<loc>([^<]+\.gz)<\/loc>/i.exec(xml);
  if (!gzM) throw new Error('wolow: sitemap.xml has no .gz sitemap entry');
  const gz = await getBytes(gzM[1]);
  const xmlBody = gunzipSync(gz).toString('utf8');
  const out = [];
  const seen = new Set();
  for (const m of xmlBody.matchAll(/<loc>(https?:\/\/wolow\.pl\/(\d+)\/[^<]*)<\/loc>/g)) {
    const url = m[1].replace(/^http:/, 'https:');
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ id: Number(m[2]), url });
  }
  return out;
}

async function discoverCandidateUrls() {
  const all = await fetchSitemapUrls();
  const flat = [];
  const otherAnnounce = [];
  const flatWykaz = [];
  for (const u of all) {
    const slug = toAsciiSlug(u.url);
    if (EXCLUDE_RE.test(slug)) continue;
    const announce = isAnnounceSlug(slug);
    const wykaz = !announce && WYKAZ_RE.test(slug);
    if (!announce && !wykaz) continue;
    const isFlatSlug = LOKAL_RE.test(slug);
    if (announce) {
      (isFlatSlug ? flat : otherAnnounce).push({ id: u.id, url: u.url, isWykaz: false });
    } else if (isFlatSlug) {
      flatWykaz.push({ id: u.id, url: u.url, isWykaz: true });
    }
    // Non-flat wykaz is deliberately dropped — see header.
  }
  otherAnnounce.sort((a, b) => b.id - a.id);
  const bounded = otherAnnounce.slice(0, MAX_OTHER_ANNOUNCE);
  console.error(
    `  wolow: sitemap ${all.length} url(s) -> ${flat.length} flat-tagged announce, ` +
    `${flatWykaz.length} flat-tagged wykaz, ${otherAnnounce.length} other announce ` +
    `(bounded to ${bounded.length}), non-flat wykaz skipped by design`,
  );
  return [...flat, ...flatWykaz, ...bounded];
}


let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;
  const candidates = await discoverCandidateUrls();
  const records = [];
  for (const c of candidates) {
    let html;
    try {
      html = await getText(c.url);
    } catch (err) {
      console.error(`  wolow fetch failed (${c.url}): ${err.message}`);
      continue;
    }
    if (c.isWykaz) {
      const w = parseWykaz(html, c.url);
      if (!w.address && !w.dzialka_nr) {
        console.error(`  wolow wykaz no subject: ${c.url}`);
        continue;
      }
      records.push({ type: 'wykaz', url: c.url, id: c.id, html, ...w });
    } else {
      const a = parseAnnouncement(html, c.url);
      if (a.cancelled) {
        console.error(`  wolow cancelled, skipping: ${c.url}`);
        continue;
      }
      if (!a.address && !a.dzialka_nr) {
        console.error(`  wolow announce no subject (kind=${a.kind}): ${c.url}`);
        continue;
      }
      records.push({ type: 'announce', url: c.url, id: c.id, html, ...a });
    }
  }
  console.error(`  wolow: ${records.length} record(s) parsed from ${candidates.length} candidate(s)`);
  _cache = records;
  return records;
}

function subjectKey(r) {
  if (r.kind === 'grunt') {
    if (!r.dzialka_nr) return null;
    return `dz|${(r.obreb || '').toLowerCase()}|${r.dzialka_nr}`;
  }
  return r.address ? r.address.key : null;
}


export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();

  const listings = [];
  const seenWykaz = new Set();
  const wykazOut = [];

  for (const r of records) {
    if (r.type === 'wykaz') {
      const key = subjectKey(r) || r.address_raw;
      if (!key || seenWykaz.has(key)) continue;
      seenWykaz.add(key);
      wykazOut.push({
        kind: r.kind,
        address_raw: r.address_raw,
        address: r.address,
        published_date: r.published_date,
        wykaz_no: r.wykaz_no,
      });
      continue;
    }
    if (!r.auction_date || r.auction_date < todayIso) continue;
    listings.push({
      kind: r.kind,
      address_raw: r.address_raw,
      address: r.address,
      dzialka_nr: r.dzialka_nr,
      obreb: r.obreb,
      area_m2: r.area_m2,
      starting_price_pln: r.starting_price_pln,
      auction_date: r.auction_date,
      round: r.round,
      detail_url: r.url,
      published_date: r.published_date,
    });
  }
  console.error(`  wolow active: ${listings.length} listing(s), ${wykazOut.length} wykaz entr(y/ies)`);
  return { listings, wykaz: wykazOut, land: [] };
}


export async function crawlResultDocs() {
  const records = await discoverAll();

  const groups = new Map();
  for (const r of records) {
    if (r.type !== 'announce' || r.round == null) continue;
    const key = subjectKey(r);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const refs = [];
  for (const group of groups.values()) {
    const byRound = new Map();
    for (const r of group) {
      if (!byRound.has(r.round)) byRound.set(r.round, r);
    }
    const rounds = [...byRound.keys()].sort((a, b) => a - b);
    for (let i = 0; i < rounds.length - 1; i++) {
      const r = byRound.get(rounds[i]);
      refs.push({ text: r.html, pdf_url: r.url, auction_date: r.auction_date });
    }
  }
  console.error(`  wolow crawlResultDocs: ${refs.length} confirmed-superseded round(s) across ${groups.size} subject(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n');
  } else {
    const { listings, wykaz } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings, wykaz }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s), ${wykaz.length} wykaz`);
  }
}
