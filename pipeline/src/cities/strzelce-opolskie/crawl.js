// Strzelce Opolskie crawler — GZMK BIP `gzmk.pl` (bespoke fast4net server-HTML).
//
// DISCOVERY. GZMK carries every municipal sale notice (flats + land + buildings)
// on ONE board — "Przetargi na sprzedaż nieruchomości" (board id 14) — at
// https://gzmk.pl/bw/Przetargi_na_sprzedaz_nieruchomosci,14. The board is a
// plain server-rendered list of <a href="…,14,<id>">Title (spelled-out date)</a>
// items; resolved notices are flagged "(rozstrzygnięty)" in the link text and
// keep their INLINE result. The board has no pagination / sitemap / archive
// link (all confirmed live 2026-07-12), and it RETAINS resolved items for many
// months (January items still listed in July) — so a single board fetch yields
// both the current/upcoming auctions AND the recently-concluded results. That
// makes board-scrape the whole discovery surface: we resolve every `,14,<id>`
// link against the board URL and fetch it. Older items that have scrolled off
// the board are reachable only by direct id URL and are out of the rolling
// window by design (low-value concluded history — the spike rates flat volume
// LOW and the ongoing land/building stream is the bulk).
//
// The `,14,<id>` slug is decorative — gzmk.pl resolves `x,14,<id>` for any
// placeholder slug (confirmed live) — but we always follow the board's own
// canonical hrefs rather than guess ids.
//
// SKIP at discovery: "Lista osób zakwalifikowanych …" (a restricted-tender
// QUALIFICATION list, not an auction) and, defensively, dzierżawa/najem (those
// live on separate boards 15/44, never board 14, but guarded anyway). A
// restricted-tender SALE ("przetarg ograniczony na sprzedaż działki") IS a real
// auction and is kept.
//
// KIND is classifyKind() on the fetched BODY, never the slug (house rule).
//
// RESULTS. Unlike most analogs there is no separate results board and no result
// PDF to OCR: the outcome (sold "za cenę …" / negative "wynikiem negatywnym") is
// appended INLINE to the same notice body once Status flips to "rozstrzygnięty".
// crawlResultDocs() therefore forwards every resolved notice's own fetched HTML
// (source:'html' → refresh.js hands ref.text straight to parseResultDoc), which
// extracts the real address/parcel/area/price/date + the inline hammer price.
//
// FLAT-AREA PDF FALLBACK. For flats the structured "Powierzchnia" field is the
// parcel SHARE, not the flat; the flat's usable m² lives in the prose (present
// once resolved) or the attached born-digital PDF. So for a flat/commercial
// notice whose HTML body has no usable-area yet, we fetch that one PDF
// (download.php?id=… → pdfText, content-addressed cache) and re-read the area.
// Land/buildings never need the PDF (structured Powierzchnia covers them).
//
// One request per second (enforced by getText's throttle in core/fetch.js).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseNotice, extractAreaM2, extractTextContent } from './parse.js';

const BOARD_URL = 'https://gzmk.pl/bw/Przetargi_na_sprzedaz_nieruchomosci,14';

// Safety cap for the single board (observed ≈9 items). Bounds a runaway without
// ever truncating the real list. At ~1 req/s this stays far under the CI budget.
const MAX_NOTICES = 80;

// Restricted-tender qualification list (not an auction) + lease/rent guard.
const SKIP_LINK_RE = /lista\s+os[óo]b\s+zakwalifikowanych|dzier[żz]aw|najem/i;

const NOTICE_LINK_RE = /href="([^"]*,14,(\d+))"[^>]*>([\s\S]*?)<\/a>/gi;

function stripLinkText(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Fetch the board and return the deduped, bounded list of notice candidates.
 * @returns {Promise<Array<{id:number, url:string, linkText:string}>>}
 */
async function discoverCandidateUrls() {
  const html = await getText(BOARD_URL);
  const out = [];
  const seen = new Set();
  let m;
  while ((m = NOTICE_LINK_RE.exec(html)) !== null) {
    const id = Number(m[2]);
    if (seen.has(id)) continue;
    seen.add(id);
    const linkText = stripLinkText(m[3]);
    if (SKIP_LINK_RE.test(linkText)) continue;
    const url = new URL(m[1], BOARD_URL).toString();
    out.push({ id, url, linkText });
  }
  out.sort((a, b) => b.id - a.id); // newest first
  const bounded = out.slice(0, MAX_NOTICES);
  console.error(
    `  strzelce-opolskie: board ${out.length} sale notice(s) (bounded to ${bounded.length})`,
  );
  return bounded;
}

// The attachment PDF (download.php?id=…) — used only for the flat-area fallback.
function extractPdfUrl(html, baseUrl) {
  const m = /href="([^"]*download\.php\?[^"]*)"/i.exec(html || '');
  if (!m) return null;
  const href = m[1].replace(/&amp;/gi, '&');
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared fetch-and-parse pass, memoized per process run so crawlActive() and
// crawlResultDocs() (each called once per refresh.js run) never double-fetch.
// ---------------------------------------------------------------------------

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
      console.error(`  strzelce-opolskie fetch failed (${c.url}): ${err.message}`);
      continue;
    }
    const rec = parseNotice(html, c.url);

    // Flat/commercial usable-area fallback via the born-digital PDF.
    if ((rec.kind === 'mieszkalny' || rec.kind === 'uzytkowy') && rec.area_m2 == null) {
      const pdfUrl = extractPdfUrl(html, c.url);
      if (pdfUrl) {
        try {
          const text = await pdfText(pdfUrl);
          const area = extractAreaM2(text, rec.kind);
          if (area != null) rec.area_m2 = area;
        } catch (err) {
          console.error(`  strzelce-opolskie flat-area PDF fallback failed (${pdfUrl}): ${err.message}`);
        }
      }
    }

    if (!rec.address && !rec.dzialka_nr) {
      console.error(`  strzelce-opolskie no subject (kind=${rec.kind}): ${c.url}`);
      continue;
    }
    records.push({ ...rec, html });
  }
  console.error(`  strzelce-opolskie: ${records.length} notice(s) parsed from ${candidates.length} candidate(s)`);
  _cache = records;
  return records;
}

// ---------------------------------------------------------------------------
// crawlActive()
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{ listings: Array<object>, wykaz: Array, land: Array }>}
 */
export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();

  const listings = [];
  for (const r of records) {
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
      detail_url: r.detail_url,
      published_date: r.published_date,
    });
  }
  console.error(`  strzelce-opolskie active: ${listings.length} upcoming listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs()
// ---------------------------------------------------------------------------

/**
 * Every RESOLVED notice forwarded as its own fetched HTML. Contract:
 * {text, pdf_url, auction_date} — refresh.js (source:'html') passes ref.text to
 * parseResultDoc as the document text, ref.pdf_url as sourceUrl, ref.auction_date
 * as the fallback date.
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = [];
  for (const r of records) {
    if (r.status !== 'rozstrzygniety') continue;
    refs.push({ text: r.html, pdf_url: r.detail_url, auction_date: r.auction_date });
  }
  console.error(`  strzelce-opolskie crawlResultDocs: ${refs.length} resolved notice(s)`);
  return refs;
}

// ---------------------------------------------------------------------------
// CLI harness (manual testing: node crawl.js [active|results])
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(
      JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n',
    );
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
