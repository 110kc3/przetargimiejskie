// Kętrzyn crawler — bip.miastoketrzyn.pl (modern gov.pl-style card BIP).
//
// BOARD (server-rendered HTML, live-verified 2026-07-11, bot UA not gated):
//   https://bip.miastoketrzyn.pl/nieruchomosci/przetargi[?page=N]   (N = 2..5)
//   Each auction is a card:
//     <li class="group list-none …">
//       <a href="/nieruchomosci/przetargi/<slug>">…<h3>Title</h3>…
//         Status: <span>ogłoszony|rozstrzygnięty|…</span>
//         Cena wywoławcza: <span>50 400,00 zł</span>
//         Termin przetargu: <span>28.05.2026 09:00</span>
//         Data wytworzenia|publikacji: 20.04.2026
//     </li>
//
// DETAIL page → the auction's documents. Two publishing patterns:
//   (a) born-digital text PDFs under /przetargi/<slug>/<file>.pdf — the
//       announcement (any name) plus, once concluded, an
//       "informacj[ae]-o-wyniku-przetargu-*.pdf" result. pdfText() extracts
//       them (no OCR needed; if pdftotext ever returned empty the record is
//       dropped, never OCR-guessed, and no \f-only junk is committed).
//   (b) a standalone "Informacja o wyniku przetargu" card whose result text is
//       inline in the detail HTML (no PDF) — extractArticleText() feeds it to
//       the same parseResultDoc().
//
// ROUTING is by CONTENT + DATE, not the card Status (which is observably stale:
// a concluded, sold flat still showed Status "ogłoszony"). An entry yields an
// ACTIVE listing only when its announcement's own auction_date is in the
// future; it yields a RESULT when a result doc/inline notice is present.
//
// KIND is decided in parse.js on the document body — the crawler only skips
// rentals (dzierżawa/najem) by card title.
//
// POLITENESS / CI budget: core/fetch.js throttles to 1 req/s and retries 429/5xx
// with backoff (the spike's rate-limit caveat). crawlResultDocs additionally
// skips URLs already in committed data (loadKnownSourceUrls) and is bounded by a
// wall-clock budget + a doc cap, so a cold run cannot blow the 25-min CI job.
//
// See config.js for source/scope/analog notes.

import { pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  parseResultDoc,
  isResultNotice,
  resultDate,
  fold,
} from './parse.js';

const ORIGIN = 'https://bip.miastoketrzyn.pl';
const BOARD_PATH = '/nieruchomosci/przetargi';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const UA = { userAgent: BROWSER_UA };

// Caps / budget (env-overridable for backfills). Board holds ~10 cards/page.
const MAX_PAGES = Number(process.env.KETRZYN_MAX_PAGES) || 10;
const MAX_RESULT_DOCS = Number(process.env.KETRZYN_MAX_RESULT_DOCS) || 200;
const CRAWL_BUDGET_MS = Number(process.env.KETRZYN_CRAWL_BUDGET_MS) || 12 * 60 * 1000;

// ── HTML helpers ─────────────────────────────────────────────────────────────

function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const deamp = (u) => String(u || '').replace(/&amp;/g, '&');

/** Absolute URL from a root-relative or absolute href. */
export function resolveUrl(href) {
  try {
    return new URL(deamp(href), ORIGIN).toString();
  } catch {
    return null;
  }
}

/** Board URL for a 1-based page (page 1 has no query). */
export function boardUrl(page) {
  return page <= 1 ? `${ORIGIN}${BOARD_PATH}` : `${ORIGIN}${BOARD_PATH}?page=${page}`;
}

/** "28.05.2026 09:00" / "20.04.2026" → ISO "2026-05-28", else null. */
export function dmyToIso(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(String(s || ''));
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/**
 * Parse one board page into card metadata.
 * @param {string} html
 * @returns {Array<{detailUrl:string, title:string, status:string,
 *   cena:string|null, terminIso:string|null, dataIso:string|null}>}
 */
export function parseBoardCards(html) {
  const out = [];
  const parts = String(html || '').split(/<li class="group list-none/i);
  for (const part of parts.slice(1)) {
    const block = part.slice(0, part.indexOf('</li>') + 1 || undefined);
    const hrefM = /href="(\/nieruchomosci\/przetargi\/[^"]+)"/i.exec(block);
    if (!hrefM) continue;
    const detailUrl = resolveUrl(hrefM[1]);
    if (!detailUrl) continue;

    const h3M = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block);
    const ariaM = /aria-label="Przej[^"]*?do\s+([^"]+)"/i.exec(block);
    const title = stripTags(h3M ? h3M[1] : ariaM ? ariaM[1] : '');

    const statusM = /Status:\s*<span[^>]*>([^<]+)<\/span>/i.exec(block);
    const cenaM = /Cena\s+wywoławcza:\s*<span[^>]*>([^<]+)<\/span>/i.exec(block);
    const terminM = /Termin\s+przetargu:\s*<span[^>]*>([^<]+)<\/span>/i.exec(block);
    const dataM = /Data\s+(?:wytworzenia|publikacji):\s*([\d.]+)/i.exec(block);

    out.push({
      detailUrl,
      title,
      status: statusM ? statusM[1].trim() : '',
      cena: cenaM ? stripTags(cenaM[1]) : null,
      terminIso: terminM ? dmyToIso(terminM[1]) : null,
      dataIso: dataM ? dmyToIso(dataM[1]) : null,
    });
  }
  return out;
}

/**
 * Split a detail page's PDF attachments into result vs announcement docs.
 * Result PDFs are named "informacj[ae]…wynik…"; everything else is the
 * announcement (map/annex PDFs are rare here and harmlessly parse to null).
 * @param {string} html
 * @returns {{ announcePdfs:string[], resultPdfs:string[] }}
 */
export function extractPdfLinks(html) {
  const announcePdfs = [];
  const resultPdfs = [];
  const seen = new Set();
  const re = /href="([^"]+\.pdf)"/gi;
  let m;
  while ((m = re.exec(String(html || ''))) !== null) {
    const abs = resolveUrl(m[1]);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    const name = fold(decodeURIComponent(abs.split('/').pop() || ''));
    if (/informacj\w*.*wynik/.test(name)) resultPdfs.push(abs);
    else announcePdfs.push(abs);
  }
  return { announcePdfs, resultPdfs };
}

/** Plain-text of the detail page's main article region (inline result notices). */
export function extractArticleText(html) {
  const src = String(html || '');
  const m = /<article\b[\s\S]*?<\/article>/i.exec(src) || /<main\b[\s\S]*?<\/main>/i.exec(src);
  const region = (m ? m[0] : src).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  return stripTags(region);
}

/** True when a card title is a rental (dzierżawa/najem) — never a sale. */
export function isRentalTitle(title) {
  return /dzierzaw|najem|najm|wynaj|u[żz]ytkowanie|u[żz]yczenie/.test(fold(title));
}

// ── fetch + discovery ────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, UA);
  } catch (err) {
    console.error(`  ketrzyn: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

let _cards = null;

/** Paginate the board (cap + stop-on-no-new) and return all cards (memoized). */
async function discoverCards() {
  if (_cards) return _cards;
  const cards = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchPage(boardUrl(page));
    if (!html) break;
    const pageCards = parseBoardCards(html);
    const fresh = pageCards.filter((c) => !seen.has(c.detailUrl));
    if (fresh.length === 0) break; // ran out / server re-served last page
    for (const c of fresh) {
      seen.add(c.detailUrl);
      cards.push(c);
    }
  }
  console.error(`  ketrzyn: ${cards.length} board card(s) discovered`);
  _cards = cards;
  return cards;
}

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Active auctions: cards whose auction is still upcoming. The announcement's
 * OWN body auction_date (from the PDF) is authoritative; the card Termin is a
 * pre-filter + fallback.
 * @returns {Promise<{ listings:object[], wykaz:[], land:[] }>}
 */
export async function crawlActive() {
  const cards = await discoverCards();
  const today = new Date().toISOString().slice(0, 10);
  const listings = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;

  const upcoming = cards.filter((c) => {
    if (isRentalTitle(c.title)) return false;
    if (c.terminIso) return c.terminIso >= today; // has a date → must be future
    return /ogloszony|otwart/.test(fold(c.status)); // dateless → trust "open" status
  });

  for (const c of upcoming) {
    if (Date.now() > deadline) break;
    const html = await fetchPage(c.detailUrl);
    if (!html) continue;
    const { announcePdfs } = extractPdfLinks(html);
    for (const pdf of announcePdfs) {
      let text;
      try {
        text = await pdfText(pdf, UA);
      } catch (err) {
        console.error(`  ketrzyn: pdfText failed (${pdf}): ${err.message}`);
        continue;
      }
      const rec = parseAnnouncement(text, {
        detailUrl: c.detailUrl,
        sourceUrl: pdf,
        fallbackAuctionDate: c.terminIso,
      });
      if (!rec || rec.cancelled) continue;
      if (!rec.auction_date || rec.auction_date < today) continue; // genuinely upcoming only
      listings.push({
        kind: rec.kind,
        address_raw: rec.address_raw,
        address: rec.address,
        dzialka_nr: rec.dzialka_nr,
        obreb: rec.obreb,
        area_m2: rec.area_m2,
        starting_price_pln: rec.starting_price_pln,
        auction_date: rec.auction_date,
        round: rec.round,
        detail_url: c.detailUrl,
        source_url: pdf,
        published_date: c.dataIso,
      });
    }
  }

  console.error(`  ketrzyn active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Concluded auctions: fetch each result PDF (or inline result-notice HTML) and
 * return refs with `.text` already extracted (source:'html' → refresh.js hands
 * ref.text straight to parseResultDoc). Skips URLs already in committed data.
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const cards = await discoverCards();
  const today = new Date().toISOString().slice(0, 10);
  const known = await loadKnownSourceUrls('ketrzyn');
  const refs = [];
  const seen = new Set();
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skipped = 0;

  const concluded = cards.filter((c) => {
    if (isRentalTitle(c.title)) return false;
    const s = fold(c.status);
    if (/rozstrzygni|nierozstrzygni|uniewazni|negatywn/.test(s)) return true;
    if (/informacj\w*\s+o\s+wyniku/.test(fold(c.title))) return true;
    return c.terminIso ? c.terminIso < today : false; // past-dated → concluded
  });

  for (const c of concluded) {
    if (refs.length >= MAX_RESULT_DOCS || Date.now() > deadline) {
      console.error('  ketrzyn: result-crawl budget/cap reached — remainder backfills next run');
      break;
    }
    if (known.has(c.detailUrl)) {
      skipped++;
      continue;
    }
    const html = await fetchPage(c.detailUrl);
    if (!html) continue;
    const { resultPdfs } = extractPdfLinks(html);

    if (resultPdfs.length) {
      for (const pdf of resultPdfs) {
        if (seen.has(pdf) || known.has(pdf)) {
          if (known.has(pdf)) skipped++;
          continue;
        }
        seen.add(pdf);
        let text;
        try {
          text = await pdfText(pdf, UA);
        } catch (err) {
          console.error(`  ketrzyn: pdfText failed (${pdf}): ${err.message}`);
          continue;
        }
        if (!isResultNotice(text)) continue;
        refs.push({ text, pdf_url: pdf, auction_date: resultDate(text) || c.terminIso || null });
      }
    } else if (/informacj\w*\s+o\s+wyniku/.test(fold(c.title))) {
      // Standalone inline-HTML result notice (no PDF attachment).
      if (seen.has(c.detailUrl)) continue;
      seen.add(c.detailUrl);
      const text = extractArticleText(html);
      if (!isResultNotice(text)) continue;
      refs.push({ text, pdf_url: c.detailUrl, auction_date: resultDate(text) || c.terminIso || null });
    }
  }

  if (skipped) console.error(`  ketrzyn: skipped ${skipped} already-known result URL(s)`);
  console.error(`  ketrzyn crawlResultDocs: ${refs.length} result doc(s)`);
  return refs;
}

// ── CLI harness (manual: node crawl.js [active|results]) ─────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n');
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  }
}
