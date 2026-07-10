// Choszczno crawler — custom BIP CMS consumed via a plain year-tree HTML walk
// (no XML feed, no SPA) plus PDF-attachment extraction. See config.js.
//
// Enumeration walks the year tree:
//   /artykul/ogloszenia                     -> year links (2003..2026)
//   /artykul/ogloszenia-<YYYY>-r             -> a row titled "Przetargi"
//   /artykul/przetargi-<slug-id>             -> one row per announcement case
// Every list page (all three levels) shares the SAME "Lista artykułów" table
// markup, including a confirmed-live quirk: rows are
//   <tr><td><a href="/artykul/…">TITLE</td><td>YYYY-MM-DD hh:mm:ss</td>
// with NO closing </a> — parseListRows() parses the title up to </td>.
//
// Bound: only the YEARS_BACK most recent discovered years are walked (recent
// flat volume is ~1/1-2yrs and refresh.js's own pipeline floor drops result
// records older than ~2020 centrally anyway — see refresh.js
// PIPELINE_MIN_HISTORY_YEAR), plus a wall-clock budget as a hard safety net.
//
// Within a year's board, rows are pre-filtered on TITLE alone (cheap, no
// fetch) BEFORE the article is ever requested:
//   - dzierżawa/najem (lease, not a sale)              -> skipped
//   - no ul./al./pl./os. street token in the title      -> skipped
// The second rule is a PARTIAL land filter, not a full one — most land rows
// have no street token ("… - obr. Stary Klukom") and are skipped here, but a
// plot fronting a named street ("… - ul. Ogrodowa działka 121/1") keeps its
// street token and DOES get fetched; kindFromText still routes it to land.json
// correctly (from the OGŁOSZENIE prose, not the title) — see config.js's scope
// note for what full land coverage would still be missing (multiple OGŁOSZENIE
// PDF template generations; only two are handled for field extraction).
// Every title that survives (street-token flats/houses, plus the occasional
// street-fronting land plot) gets its article fetched.
//
// Each surviving article's attachment table is routed by FILENAME prefix:
//   "ogloszenie…pdf"  -> announcement text (pdfText, OCR-layer already
//                         embedded so this rarely needs the ocrPdf fallback,
//                         but it's wired for the rare true-scan case)
//   "informacja…pdf"  -> result text (present only once the auction is HELD —
//                         for sold AND unsold outcomes alike)
// A case with only the ogłoszenie attachment is pending (-> crawlActive);
// one with both is concluded (-> crawlResultDocs). This exactly mirrors
// chełmno's <rozstrzygniecie>-empty-vs-filled split, adapted to two files
// instead of one inline XML element. (One older multi-parcel land template
// names its result files "inf-<znak>.pdf" instead of "informacja…pdf" and is
// not picked up by this routing — see config.js's scope note.)
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { buildRecordText, parseAnnouncement, hasResolution } from './parse.js';

const ORIGIN = 'https://bip.choszczno.pl';

// A browser UA — the spike found the site answers a plain bot UA fine from a
// normal client, but a browser UA is the safe default for municipal WAFs /
// cloud-runner IP treatment (harmless if unneeded; see config.js header).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// How many of the most-recently-discovered years to walk. Real history is
// 2003-2026 (24 years); this window is deliberately much narrower — see the
// header note above.
const YEARS_BACK = 8;
// Hard safety net so a broken page (endless "next year" style loop, or a slow
// host) can never stall the CI job.
const WALL_CLOCK_BUDGET_MS = 10 * 60 * 1000;

const LEASE_TITLE_RE = /dzier[żz]aw|\bnajem\b/i;
// Period after ul./al./pl./os. is optional (OCR / typing drops it live — see
// parse.js's stripLocalityPrefix note), so this pre-filter can't rely on it.
const STREET_TITLE_RE = /\b(?:ul|al|pl|os)\.?\s+\S/i;

/**
 * Parse {href, title, published_at} rows out of one "Lista artykułów" board
 * table — shared markup at every tree level (year index, year page, and the
 * "Przetargi" sub-board all use it). Tolerates the missing closing </a>.
 * @param {string} html
 * @returns {Array<{href:string, title:string, published_at:string|null}>}
 */
export function parseListRows(html) {
  if (!html) return [];
  const out = [];
  const tbodyM = /<tbody>([\s\S]*?)<\/tbody>/i.exec(html);
  const body = tbodyM ? tbodyM[1] : html;
  const re = /<tr>\s*<td>\s*<a href="([^"]+)">([\s\S]*?)<\/td>\s*<td>\s*([^<]*?)\s*<\/td>/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const publishedRaw = m[3].trim();
    out.push({
      href: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      title,
      published_at: publishedRaw ? publishedRaw.slice(0, 10) : null,
    });
  }
  return out;
}

/** Year links from the top-level /artykul/ogloszenia page, newest first. */
export function parseYearLinks(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"/]+)?\/artykul\/ogloszenia-(\d{4})-r)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, href, year] = m;
    if (seen.has(year)) continue;
    seen.add(year);
    out.push({ year: Number(year), url: href.startsWith('http') ? href : `${ORIGIN}${href}` });
  }
  return out.sort((a, b) => b.year - a.year);
}

/** The href of the row titled exactly "Przetargi" on a year page, or null. */
export function findPrzetargiHref(rows) {
  const row = rows.find((r) => /^przetargi$/i.test(r.title));
  return row ? row.href : null;
}

/** Attachment {url, filename} pairs from an article's "Załączniki" table —
 *  scoped to `class="download"` links so nav/logo hrefs can't leak in. */
export function parseAttachments(html) {
  if (!html) return [];
  const out = [];
  const re = /<a href="(\/pliki\/[^"]+\.pdf)"[^>]*class="download"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    out.push({ url: `${ORIGIN}${href}`, filename: href.split('/').pop() });
  }
  return out;
}

function h1Title(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
}

/** Text of a PDF attachment: pdftotext first (these are scanned PDFs but ship
 *  an OCR text layer, so this normally succeeds), OCR fallback for the rare
 *  true no-text-layer scan. Mirrors oświęcim's attachmentText helper. */
async function attachmentText(url) {
  try {
    const t = await pdfText(url, { userAgent: BROWSER_UA });
    if (t.replace(/\s+/g, '').length >= 60) return t;
  } catch { /* not a clean text layer — fall through to OCR */ }
  try {
    return await ocrPdf(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  choszczno: OCR failed on ${url}: ${err.message}`);
    return '';
  }
}

/** Fetch one article + its attachment text; build the labelled blob. */
async function fetchCase(row) {
  let html;
  try {
    html = await getText(row.href, FETCH_OPTS);
  } catch (err) {
    console.error(`  choszczno: article fetch failed (${row.href}): ${err.message}`);
    return null;
  }
  const title = h1Title(html) || row.title;
  const attachments = parseAttachments(html);
  const oglAtt = attachments.filter((a) => /^ogloszenie/i.test(a.filename));
  const infAtt = attachments.filter((a) => /^informacja/i.test(a.filename));
  if (oglAtt.length === 0 && infAtt.length === 0) {
    console.error(`  choszczno: no ogłoszenie/informacja attachment on ${row.href}`);
    return null;
  }

  let ogloszenie = '';
  for (const a of oglAtt) ogloszenie += (ogloszenie ? '\n' : '') + (await attachmentText(a.url));
  let informacja = '';
  for (const a of infAtt) informacja += (informacja ? '\n' : '') + (await attachmentText(a.url));

  const text = buildRecordText({ title, ogloszenie, informacja });
  const pdf_url = infAtt[0]?.url || oglAtt[0]?.url || row.href;
  return { text, articleUrl: row.href, pdf_url };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const started = Date.now();

  let yearLinks;
  try {
    const html = await getText(`${ORIGIN}/artykul/ogloszenia`, FETCH_OPTS);
    yearLinks = parseYearLinks(html).slice(0, YEARS_BACK);
  } catch (err) {
    console.error(`  choszczno: year index fetch failed: ${err.message}`);
    return { listings, land, resultRefs };
  }

  for (const { year, url } of yearLinks) {
    if (Date.now() - started > WALL_CLOCK_BUDGET_MS) {
      console.error('  choszczno: wall-clock budget reached, stopping year walk');
      break;
    }
    let yearHtml;
    try {
      yearHtml = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  choszczno: year ${year} fetch failed: ${err.message}`);
      continue;
    }
    const przetargiHref = findPrzetargiHref(parseListRows(yearHtml));
    if (!przetargiHref) {
      console.error(`  choszczno: year ${year} has no "Przetargi" sub-board`);
      continue;
    }
    let boardHtml;
    try {
      boardHtml = await getText(przetargiHref, FETCH_OPTS);
    } catch (err) {
      console.error(`  choszczno: przetargi board fetch failed (year ${year}): ${err.message}`);
      continue;
    }

    for (const row of parseListRows(boardHtml)) {
      if (LEASE_TITLE_RE.test(row.title)) continue; // dzierżawa / najem — not a sale
      if (!STREET_TITLE_RE.test(row.title)) continue; // land / obręb-only — out of scope, see config.js

      const rec = await fetchCase(row);
      if (!rec) continue;
      const { text, articleUrl, pdf_url } = rec;

      if (hasResolution(text)) {
        resultRefs.push({ text, auction_date: row.published_at, pdf_url });
        continue;
      }

      const parsed = parseAnnouncement(text);
      if (!parsed) continue;
      const enriched = { ...parsed, detail_url: articleUrl, source_url: articleUrl };
      (parsed.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  choszczno: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded cases (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
