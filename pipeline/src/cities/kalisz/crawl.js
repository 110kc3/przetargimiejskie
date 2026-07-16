// Kalisz crawler — bip.kalisz.pl WGM "Sprzedaż, dzierżawa nieruchomości"
// board (r_ogl=SN). LIVE-VERIFIED 2026-07-16.
//
// Classic PHP-templated BIP (no JS, no JSON API): one board page lists ~14-18
// current entries in numbered table rows. Each row has a plaintext title,
// a linked PDF (`./ogloszenia/sn/<file>.pdf` — no stable naming convention,
// must be discovered per-entry), and metadata ("Na stronie biuletynu od ...
// do ...", "Na podstawie: <WGM ref>"). Confirmed live 2026-07-16: exactly
// this structure, 18 items, dated 29-06-2025..16-07-2026.
//
// CRITICAL finding (this build, NOT in the spike): the board's own title
// text can be STALE/MISMATCHED to its linked PDF's real content. Live item
// #9 (2026-07-16) is titled "Informacja o wyniku II przetargu ustnego
// ograniczonego na sprzedaż ... lokalu mieszkalnego ... Częstochowskiej
// 7/6A" — but its PDF (03072026do24072026.pdf, ref WGM.6845.01.0008.2026.AM)
// is actually an unrelated dzierżawa (lease) WYKAZ for ul. Wojciecha z
// Brudzewa. The SAME ref number is bundled into a different live item's
// (#15) lease-wykaz ref list — a real city CMS data-entry slip, not a
// scraping artifact. Per ADAPTER-GUIDE.md §5.3 ("classifyKind is always run
// on the PDF BODY, never the URL slug/title"), this crawler fetches every
// entry's PDF and lets parse.js classify + extract fields from the PDF TEXT
// ONLY; the board title is used solely for the human-readable log line.
//
// Consequence: every live entry's PDF is fetched (born-digital, pdfText —
// no OCR). Volume is thin (~14-18 items/board fetch) so this is cheap even
// at the default 1 req/sec fetch throttle; pdfText's on-disk content-
// addressed cache makes a second pass (crawlActive after crawlResultDocs, or
// vice versa) effectively free. One shared crawlAll() (memoized per process,
// same pattern as krakow/crawl.js) does the single board-fetch + per-item
// PDF-fetch + classify pass; crawlActive()/crawlResultDocs() just read their
// half of the split.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { htmlToText, parseAnnouncement, parseResultDoc } from './parse.js';

const ORIGIN = 'https://bip.kalisz.pl';
const BOARD_URL = 'https://www.bip.kalisz.pl/index.php?id=1400&s=1418&file=disp_o.php&r_ogl=SN';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Marks the start of each numbered board row: `<td width=25><font
// color='#000080'><strong>N.</strong></font></td><td>`. LIVE-VERIFIED against
// the real 2026-07-16 board HTML (18 matches for 18 visible items).
const ITEM_START_RE = /<td width=25><font color=.#000080.><strong>(\d+)\.<\/strong><\/font><\/td><td>/g;
const TITLE_RE = /<\/strong><\/font><\/td><td>([\s\S]*?)<br \/><br \/><\/td>/;
const HREF_RE = /href="(\.\/ogloszenia\/sn\/[^"]+)"/;
const REF_RE = /Na podstawie:.*?<span[^>]*>([^<]*)<\/span>/;

/** @param {string} html board page HTML @returns {Array<{title:string, pdfUrl:string, ref:string|null}>} */
export function itemsFromBoardHtml(html) {
  const marks = [...(html || '').matchAll(ITEM_START_RE)];
  const archIdx = html.indexOf('Archiwum dzia');
  const items = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : archIdx > 0 ? archIdx : html.length;
    const chunk = html.slice(start, end);
    const hrefM = HREF_RE.exec(chunk);
    if (!hrefM) continue; // a row with no PDF link isn't a real entry
    const titleM = TITLE_RE.exec(chunk);
    const refM = REF_RE.exec(chunk);
    items.push({
      title: titleM ? htmlToText(titleM[1]).trim() : '',
      pdfUrl: ORIGIN + hrefM[1].slice(1), // "./ogloszenia/sn/x.pdf" -> origin + "/ogloszenia/sn/x.pdf"
      ref: refM ? refM[1].trim() : null,
    });
  }
  return items;
}

let crawlPromise = null;

async function crawlAll() {
  let html;
  try {
    html = await getText(BOARD_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  kalisz board fetch failed (${BOARD_URL}): ${err.message}`);
    return { listings: [], resultRefs: [] };
  }

  const items = itemsFromBoardHtml(html);
  const listings = [];
  const resultRefs = [];
  let skipped = 0;

  for (const item of items) {
    let text;
    try {
      text = await pdfText(item.pdfUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  kalisz pdf-text failed (${item.pdfUrl} — "${item.title.slice(0, 60)}"): ${err.message}`);
      continue;
    }

    const rec = parseAnnouncement(text, { url: item.pdfUrl });
    if (rec) {
      listings.push(rec);
      continue;
    }
    const results = parseResultDoc(text, null, item.pdfUrl);
    if (results.length) {
      resultRefs.push({ text, pdf_url: item.pdfUrl, detail_url: item.pdfUrl, auction_date: null });
      continue;
    }
    skipped++;
  }

  console.error(
    `  kalisz: ${listings.length} listing(s), ${resultRefs.length} result notice(s) ` +
      `(${skipped} non-auction/land/unkeyable item(s) skipped of ${items.length})`,
  );
  return { listings, resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export { parseResultDoc };
