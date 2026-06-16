// Rybnik (legacy) crawler — ZGM Rybnik's standalone "Ogłoszenie o przetargach"
// page.
//
//   LIST:     https://bip.zgm.rybnik.pl/Default.aspx?Page=214            (current batch)
//   ARCHIVE:  https://bip.zgm.rybnik.pl/Default.aspx?Page=214&Archive=<id>
//   RTF:      https://bip.zgm.rybnik.pl/Download.ashx?id=<id>            (one per flat)
//
// NOTE (June 2026): this ZGM page is DEAD — Page=214 now renders the ZGM home
// (0 "OGŁOSZENIE …" links), so crawlActive() returns no flats. ZGM's flat
// auctions are published on the CITY BIP register instead (bip.um.rybnik.eu,
// Page=339) and are now crawled by crawl-land.js (parseFlatRtf). This module is
// kept as a resilient fallback: parseListPage finds nothing on the dead page,
// so crawlActive() yields [] harmlessly; if ZGM ever republishes here the
// adapter (index.js) merges those flats back in (de-duped by address key).
//
// Originally an active-listings adapter (like Bytom/Zabrze/Sosnowiec): each
// announcement was an "OGŁOSZENIE <address> [rtf]" link (address in the label,
// price/area/date/round in the RTF, decoded by core/rtf-text.js). The page is
// server-rendered ASP.NET; older batches hung off `&Archive=<id>` links.
// crawlResultDocs() is [] (no achieved-price stream wired).

import { getText } from '../../core/fetch.js';
import { rtfText } from '../../core/rtf-text.js';
import { parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.zgm.rybnik.pl';
const LIST_URL = `${ORIGIN}/Default.aspx?Page=214`;
const archiveUrl = (id) => `${ORIGIN}/Default.aspx?Page=214&Archive=${id}`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_ARCHIVE = 30; // safety cap on archive batches per run

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function absUrl(href) {
  const clean = href.replace(/&amp;/gi, '&');
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${ORIGIN}/${clean.replace(/^\//, '')}`;
}

/**
 * Parse one list/archive page: the "OGŁOSZENIE <addr>" RTF links + any
 * `&Archive=<id>` batch links.
 * @param {string} html
 * @returns {{ anns: Array<{label:string, rtf_url:string}>, archiveIds: string[] }}
 */
export function parseListPage(html) {
  const anns = [];
  const seen = new Set();
  const re = /<a\b[^>]*?href=["']([^"']*Download\.ashx\?id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const label = stripTags(m[2]);
    if (!/^OG[ŁL]OSZENIE\b/i.test(label) || !/\d/.test(label)) continue; // sale announcements only
    const rtf_url = absUrl(m[1]);
    if (seen.has(rtf_url)) continue;
    seen.add(rtf_url);
    anns.push({ label, rtf_url });
  }
  const archiveIds = [...new Set([...html.matchAll(/[?&]Archive=(\d+)/gi)].map((x) => x[1]))];
  return { anns, archiveIds };
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  let currentHtml;
  try {
    currentHtml = await getText(LIST_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  rybnik list fetch failed: ${err.message}`);
    return { listings: [], wykaz: [] };
  }
  const { anns: currentAnns, archiveIds } = parseListPage(currentHtml);

  // Each ref: { label, rtf_url, detail_url }. Current batch first, then archives.
  const refs = currentAnns.map((a) => ({ ...a, detail_url: LIST_URL }));
  const seen = new Set(refs.map((r) => r.rtf_url));
  for (const id of archiveIds.slice(0, MAX_ARCHIVE)) {
    let html;
    try {
      html = await getText(archiveUrl(id), FETCH_OPTS);
    } catch (err) {
      console.error(`  rybnik archive ${id} fetch failed: ${err.message}`);
      continue;
    }
    for (const a of parseListPage(html).anns) {
      if (seen.has(a.rtf_url)) continue;
      seen.add(a.rtf_url);
      refs.push({ ...a, detail_url: archiveUrl(id) });
    }
  }

  console.error(`  rybnik: ${refs.length} flat announcement(s) (current ${currentAnns.length} + ${archiveIds.length} archive batch(es))`);

  const listings = [];
  for (const r of refs) {
    let text;
    try {
      text = await rtfText(r.rtf_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  rybnik RTF extract failed (${r.label}): ${err.message}`);
      continue;
    }
    const parsed = parseAnnouncement(r.label, text);
    if (!parsed) {
      console.error(`  rybnik WARN: unkeyable announcement (${r.label})`);
      continue;
    }
    listings.push({
      kind: parsed.kind,
      address_raw: parsed.address_raw,
      address: parsed.address,
      auction_date: parsed.auction_date,
      published_date: null,
      round: parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: parsed.starting_price_pln,
      detail_url: r.detail_url,
    });
  }

  console.error(`  rybnik active: ${listings.length} flat listing(s) from ${refs.length} announcement(s)`);
  return { listings, wykaz: [] };
}

/** @returns {Promise<Array>} ZGM Rybnik has no machine-readable results stream wired. */
export async function crawlResultDocs() {
  return [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
