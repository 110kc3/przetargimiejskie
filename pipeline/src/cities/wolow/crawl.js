// Wołów crawler — `wolow.pl` (SkyCMS / netkoncept.com city portal).
//
// DISCOVERY. wolow.pl has no stable, walkable "przetargi na sprzedaż
// nieruchomości" category board — the URL the spike recorded (`/115/`) 404s
// live, and a 3-segment article URL that still carries an `/idcat/` segment
// 301-redirects to the bare 2-segment canonical form, i.e. skyCMS treats the
// category id as decorative, not a stable listing key. What IS stable: the
// site's own `/sitemap.xml` -> one `.gz` sitemap covering every article on
// the whole portal (~3,940 URLs, confirmed live). This crawler fetches that
// once per run and filters it, rather than trying to paginate a moving
// category page.
//
// CANDIDATE FILTER (two buckets, see discoverCandidateUrls):
//   - "flat-tagged" (URL slug contains "lokal") — small (≈30 URLs across the
//     site's ~5.5-year history), fetched IN FULL every run.
//   - everything else matching an "[I-V] ustn* przetarg*" announcement — this
//     is land- and house-dominated (≈600 URLs) and is BOUNDED to the most
//     recent MAX_OTHER_ANNOUNCE by numeric article id (skyCMS ids are
//     assigned sequentially at publish time, confirmed live: id 466 ≈ Jan
//     2021, id 3993 ≈ Jul 2026).
//   IMPORTANT: a URL slug is NOT trusted for KIND — confirmed live that a
//   genuine flat (wolow.pl/3909, "ul. Komuny Paryskiej 41", 39,47 m²,
//   "Lokal mieszkalny nr 1" in the BODY) has a slug with no "lokal" in it at
//   all (same gotcha ADAPTER-GUIDE documents for Olesno's round-I titles) —
//   the slug filter only decides which bucket gets an unbounded vs bounded
//   fetch; parse.js's classifyKind(BODY) is what actually decides kind, so a
//   flat hiding in the bounded "other" bucket is still classified correctly
//   as long as its id falls inside the recency window.
//   Land/house WYKAZ (no "lokal" in slug) is deliberately NOT crawled at all
//   (≈1,400+ URLs spanning 15+ years of small-parcel/easement history — far
//   outside this Low-Medium-effort build's budget; wykaz is a pre-auction
//   designation, lowest-value stream, and every land parcel that actually
//   reaches auction still shows up via the announcement bucket regardless).
//   Excluded outright (lease/rent/cancelled/invalidated/negotiated-sale —
//   never a flat-auction outcome): dzierżawa, najem, odwołan(ie/y),
//   unieważnien, rokowania.
//
// THE ACHIEVED-PRICE STREAM — WHY IT'S UNSOLD-ONLY. See parse.js's header for
// the full trail (bip.wolow.pl is a client-rendered SPA — out of reach
// without core/render.js; the county's bip.powiatwolowski.pl "wylicytowano"
// figure the spike quoted is a DIFFERENT JST, correctly out of scope). This
// crawler's only source of a CONFIRMED outcome is: round K's own announcement
// existing alongside a round K+1 announcement for the SAME subject (address
// key for flats/houses/commercial, dzialka_nr+obreb for land) PROVES round K
// did not sell (ADAPTER-GUIDE §5.5: "≥II signals a property that keeps
// failing to sell"). crawlResultDocs() finds those confirmed-superseded
// rounds and forwards round K's OWN real text (not a synthetic summary) so
// parseResultDoc extracts round K's real address/area/price/date — just
// never a hammer price, since none is ever published here.
//
// One request per second (enforced by getText's throttle in core/fetch.js).

import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { getText, getBytes } from '../../core/fetch.js';
import { parseAnnouncement, parseWykaz } from './parse.js';

const HOST = 'https://wolow.pl';
const SITEMAP_URL = `${HOST}/sitemap.xml`;

// Recency caps for the unbounded "everything else" bucket — see header. At
// ~110 land/house announcements/year and ~1 req/s, 220 is ≈2 years of
// lookback and well under a 20-25 min CI budget even added to the flat
// bucket + a second (memoized, so effectively free) crawlResultDocs pass.
const MAX_OTHER_ANNOUNCE = 220;

const EXCLUDE_RE = /dzierzaw|najem|odwolan|uniewazni|rokowa/;
const ANNOUNCE_RE = /ustn/; // paired with a separate "przetarg" test — see isAnnounceSlug
const WYKAZ_RE = /wykaz-nieruchomosci-przeznaczonych-do-(sprzedazy|zbycia)/;
const LOKAL_RE = /\blokal/;

function toAsciiSlug(url) {
  return url
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// "ustn*" + "przetarg*" as two SEPARATE tests (not one adjacent-phrase regex)
// because the source declines both words independently across the corpus —
// "ustny przetarg" (subject case) vs "ustnym przetargu" (object case, e.g.
// "ogłoszenie o I ustnym przetargu...") — confirmed live losing 2 of 6 real
// flat-announcement URLs to a stricter adjacent-phrase match during this
// build's own discovery-script iteration.
function isAnnounceSlug(asciiSlug) {
  return ANNOUNCE_RE.test(asciiSlug) && /przetarg/.test(asciiSlug);
}

/**
 * Fetch the site's one `.gz` sitemap and return every `{id, url}` article
 * link on the whole portal, in sitemap order.
 * @returns {Promise<Array<{id:number, url:string}>>}
 */
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

/**
 * Discover + bucket candidate URLs from the sitemap.
 * @returns {Promise<Array<{id:number, url:string, isWykaz:boolean}>>}
 */
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

// ---------------------------------------------------------------------------
// Shared fetch-and-parse pass (memoized per process run so crawlActive() and
// crawlResultDocs() — both called once per refresh.js run — never double-fetch
// the same candidate set).
// ---------------------------------------------------------------------------

let _cache = null;

/**
 * @returns {Promise<Array<{type:'announce'|'wykaz', url:string, html:string} & object>>}
 */
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

/** Stable per-run grouping key: address for address-kinds, parcel for land. */
function subjectKey(r) {
  if (r.kind === 'grunt') {
    if (!r.dzialka_nr) return null;
    return `dz|${(r.obreb || '').toLowerCase()}|${r.dzialka_nr}`;
  }
  return r.address ? r.address.key : null;
}

// ---------------------------------------------------------------------------
// crawlActive()
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{ listings: Array<object>, wykaz: Array<object>, land: [] }>}
 */
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
    if (!r.auction_date || r.auction_date < todayIso) continue; // only genuinely upcoming
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

// ---------------------------------------------------------------------------
// crawlResultDocs()
// ---------------------------------------------------------------------------

/**
 * Refs are CONFIRMED-superseded rounds only (see file header): round K's own
 * fetched html, forwarded because round K+1 for the same subject also exists.
 * Contract: {text, pdf_url, auction_date} — refresh.js reads `ref.pdf_url`
 * (passed to parseResultDoc as sourceUrl) and `ref.auction_date` (fallbackDate);
 * `ref.text` is what source==='html' cities have refresh.js hand straight to
 * parseResultDoc.
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
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
    // Dedupe same-round republishes (confirmed live: wolow.pl/3537 + /3538,
    // identical round-I duplicates) before doing round-order arithmetic.
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

// ---------------------------------------------------------------------------
// CLI harness (manual testing: node crawl.js [active|results])
// ---------------------------------------------------------------------------
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
