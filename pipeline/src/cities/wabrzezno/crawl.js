// Wąbrzeźno crawler — rbip.mojregion.info regional BIP, consumed as server HTML
// via the board's XML feed + per-notice XML. See config.js.
//
// ONE "Przetargi" board (id 330). Its XML feed lists EVERY article in a single
// request (no pagination), so there is no page-walk:
//   BOARD   /xml/330/przetargi.html → <strona numer><naglowek>TITLE</naglowek>
//                                     <link>NOTICE_URL</link>
//   NOTICE  /xml/<id>/<slug>.html   → <tresc> CDATA (inline ogłoszenie) +
//                                     <zalaczniki> attachment list (PDF/DOCX)
// For each notice we build a text BODY from whichever source carries it — inline
// <tresc>, or a born-digital PDF (pdfText, OCR fallback) / DOCX (docText)
// attachment when <tresc> is only a "PDF …/DOCX …" stub — then pair it with the
// feed TITLE and assemble the parse blob via buildRecordText().
//
// Routing (by CONTENT, never the slug): "Informacja o wynikach/dotycząca …"
// → crawlResultDocs; a sale przetarg → crawlActive (grunt → land, flat/unit →
// listings, one record per lokal). Rokowania, leases (dzierżawa/najem) and works
// tenders share the board and are dropped.
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isRokowania,
  isResultDoc,
  auctionDateFromText,
  stripHtml,
} from './parse.js';

const ORIGIN = 'https://mst-wabrzezno.rbip.mojregion.info';
const BOARD_FEED = `${ORIGIN}/xml/330/przetargi.html`;

// A browser UA — the bot UA is served fine here, but a browser UA is the safe
// default for municipal WAFs / CI egress (harmless if unneeded).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Hard cap so a broken/looping feed can never spin forever. The feed is a single
// complete page (~38 items at current volume); this bounds the per-notice fetch
// fan-out for the 25-min CI job.
const MAX_NOTICES = 90;

/** The clean-XML variant of a notice URL ("…/1866/x.html" → "…/xml/1866/x.html").
 *  Only main-host links are transformed; anything else is returned unchanged. */
function toXmlUrl(url) {
  return url.startsWith(`${ORIGIN}/`) && !url.startsWith(`${ORIGIN}/xml/`)
    ? url.replace(`${ORIGIN}/`, `${ORIGIN}/xml/`)
    : url;
}

const decodeEntities = (s) => String(s || '').replace(/&amp;/gi, '&').trim();

/**
 * Article refs from the board XML feed. Each `<strona numer>` entry carries the
 * notice TITLE (`<naglowek>`) and URL (`<link>`); the outer board `<strona>` (no
 * `numer`) is skipped by the required attribute.
 * @param {string} xml
 * @returns {Array<{title:string, url:string}>}
 */
export function parseBoardFeed(xml) {
  const out = [];
  const seen = new Set();
  const re = /<strona\s+numer="\d+">[\s\S]*?<naglowek>([\s\S]*?)<\/naglowek>[\s\S]*?<link>([\s\S]*?)<\/link>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const url = decodeEntities(m[2]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: stripHtml(m[1]), url });
  }
  return out;
}

/** Isolate the notice's main text (`<tresc>` CDATA) from its XML. */
export function extractTresc(xml) {
  const m = /<tresc[^>]*>([\s\S]*?)<\/tresc>/i.exec(xml || '');
  return m ? stripHtml(m[1]) : '';
}

/** Attachment refs from the notice XML's `<zalaczniki>` block. */
export function extractAttachments(xml) {
  const out = [];
  const re = /<plik\b[^>]*>[\s\S]*?<url>([\s\S]*?)<\/url>[\s\S]*?<nazwa>([\s\S]*?)<\/nazwa>[\s\S]*?<rozszerzenie>([\s\S]*?)<\/rozszerzenie>/gi;
  let m;
  while ((m = re.exec(xml || '')) !== null) {
    out.push({
      url: decodeEntities(m[1]),
      name: stripHtml(m[2]),
      ext: stripHtml(m[3]).toLowerCase(),
    });
  }
  return out;
}

/** True when `<tresc>` is only a "PDF …/DOCX …" attachment stub (real text lives
 *  in <zalaczniki>), not an inline ogłoszenie. */
function isStubTresc(body) {
  return !body || body.length < 160 || /^\s*(pdf|docx?|rtf|odt|xlsx?)\b/i.test(body);
}

/** Pick the primary ogłoszenie attachment: drop RODO/klauzula boilerplate, then
 *  prefer a PDF, then a DOC/DOCX. */
function pickAttachment(atts) {
  const real = atts.filter((a) => !/klauzul|rodo|przetwarzani\w+\s+danych/i.test(a.name));
  const pool = real.length ? real : atts;
  return (
    pool.find((a) => a.ext === 'pdf') ||
    pool.find((a) => a.ext === 'docx' || a.ext === 'doc') ||
    pool[0] ||
    null
  );
}

/** Extract text from an attachment (PDF → pdfText, empty PDF → ocrPdf; DOC/DOCX
 *  → docText). Returns '' for unsupported/failed extraction. */
async function attachmentText(att) {
  try {
    if (att.ext === 'pdf') {
      let txt = (await pdfText(att.url, { userAgent: UA })).replace(/\f/g, ' ');
      if (txt.replace(/\s+/g, '').length < 40) {
        txt = (await ocrPdf(att.url, { userAgent: UA })).replace(/\f/g, ' ');
      }
      return txt;
    }
    if (att.ext === 'doc' || att.ext === 'docx') {
      return await docText(att.url, { userAgent: UA });
    }
  } catch (err) {
    console.error(`  wabrzezno: attachment ${att.url} extract failed: ${err.message}`);
  }
  return '';
}

/** Fetch one notice → { text, title, url }, or null. */
async function fetchNotice(ref) {
  let xml;
  try {
    xml = await getText(toXmlUrl(ref.url), { userAgent: UA });
  } catch (err) {
    console.error(`  wabrzezno: notice ${ref.url} fetch failed: ${err.message}`);
    return null;
  }
  let body = extractTresc(xml);
  if (isStubTresc(body)) {
    const att = pickAttachment(extractAttachments(xml));
    if (att) {
      const attText = await attachmentText(att);
      if (attText && attText.replace(/\s+/g, '').length > body.replace(/\s+/g, '').length) {
        body = attText;
      }
    }
  }
  if (!body) return null;
  return { text: buildRecordText({ title: ref.title, body }), title: ref.title, url: ref.url };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats + commercial units)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, source_url, auction_date }

  let feedXml;
  try {
    feedXml = await getText(BOARD_FEED, { userAgent: UA });
  } catch (err) {
    console.error(`  wabrzezno: board feed fetch failed: ${err.message}`);
    return { listings, land, resultRefs };
  }

  const refs = parseBoardFeed(feedXml).slice(0, MAX_NOTICES);
  for (const ref of refs) {
    if (isRokowania(ref.title)) continue; // negotiations, not a przetarg
    const rec = await fetchNotice(ref);
    if (!rec) continue;
    const { text } = rec;

    if (isResultDoc(text)) {
      resultRefs.push({
        text,
        source_url: ref.url,
        auction_date: auctionDateFromText(text) || null,
      });
      continue;
    }
    if (!isSaleAuction(text)) continue; // works tender / non-sale
    if (isLease(text)) continue;        // dzierżawa / najem

    for (const parsed of parseAnnouncement(text)) {
      const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
      (parsed.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  wabrzezno: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
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
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
