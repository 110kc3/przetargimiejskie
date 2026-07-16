// Elbląg crawler — a single small, server-rendered board (bip.elblag.eu
// /przetargi-nieruchomosci/190, "Przetargi - zbycie") lists every currently
// visible item (both future/active AND recently-concluded auctions — verified
// live: a concluded item stays on this board once its "Rozstrzygnięcie" field
// flips to "Wyniki z przetargu w załączniku", see isResolved below). No
// pagination is needed: the board returns its whole (small, ~8-12 item) list in
// one page — verified live 2026-07-16 (the XML feed at
// /przetargi-nieruchomosci/xml/1/1 independently confirms `ilosc-stron: 1`).
//
// SCOPE: this adapter only ever visits /przetargi-nieruchomosci/190 (real
// auctions). It NEVER visits /artykuly/191/wykaz-nieruchomosci-zbycie, the
// board that carries the bezprzetargowo tenant-sale wykaz notices — so that
// stream is excluded by URL scoping alone. parse.js's isBezprzetargowoDoc()
// gate is an explicit second layer of defense (see config.js).
//
// Each item's detail page carries a structured "Szczegóły" HTML table (kind,
// round, price, a machine-readable ISO auction date) PLUS a Załączniki list of
// attachments. Each notice (announcement AND result) is posted as a born-digital
// "… - wersja edytowalna" file (PDF for announcements, legacy .doc for results —
// both text-extractable, no OCR) alongside a scanned "… - skan" twin, which is
// always dropped (same dual-attachment pattern as Kędzierzyn-Koźle).
//
// RESULT documents are BATCH tables: one document can report several
// properties' outcomes decided the same day, and the SAME batch document is
// often linked from more than one item's detail page (verified live:
// attachment 18393 on the Legionów page and 18396 on the Dębowa page are
// byte-identical). Dedupe by extracted TEXT (not by attachment id/URL, which
// differ) so a shared batch is only queued into resultRefs once; parse.js's
// parseResultDoc then expands it into one record per table row.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { parseAnnouncement, isResultDoc, isBezprzetargowoDoc } from './parse.js';

const ORIGIN = 'https://bip.elblag.eu';
const BOARD_URL = `${ORIGIN}/przetargi-nieruchomosci/190`;

function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Detail-page URLs (deduped by id) linked from the board listing. */
export function detailUrlsFromBoard(html) {
  const out = new Map();
  const re = /href="(https:\/\/bip\.elblag\.eu\/przetarg-nieruchomosci\/(\d+)\/[a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    if (!out.has(m[2])) out.set(m[2], m[1]);
  }
  return [...out.values()];
}

/** One "Szczegóły" table field by its <th scope="row"> label, tags stripped. */
export function fieldFromHtml(html, label) {
  const re = new RegExp(`<th scope="row">\\s*${label}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = re.exec(html || '');
  return m ? stripTags(m[1]) : null;
}

/** ISO date (YYYY-MM-DD) from the "Data przetargu" row's machine-readable
 *  <time datetime="2026-07-06T11:00:00"> attribute — more reliable than
 *  parsing the human "DD.MM.YYYY" text next to it. */
export function auctionDateIsoFromHtml(html) {
  const m = /<th scope="row">\s*Data przetargu\s*<\/th>[\s\S]{0,300}?<time datetime="([^"]+)"/i.exec(html || '');
  return m ? m[1].slice(0, 10) : null;
}

/** True once the "Rozstrzygnięcie" block states the result is published (in an
 *  attachment) — the item's detail page carries no such block at all before a
 *  decision is recorded (verified live on a future/active item). */
export function isResolved(html) {
  return /addon-bip-result[\s\S]{0,300}?Wyniki\s+z\s+przetargu\s+w\s+za[łl]/i.test(html || '');
}

/** True when "Typ przetargu" names rokowania (post-auction negotiations, not a
 *  competitive bidding auction) — the one Typ przetargu facet value this
 *  adapter skips outright (the others — ustny/pisemny, (nie)ograniczony — are
 *  all genuine competitive auctions and stay in scope). */
export function isRokowania(typPrzetargu) {
  return /rokowani/i.test(typPrzetargu || '');
}

/** Załączniki (attachments): [{ id, url, name, ext }], document order. `ext`
 *  comes from the file-size badge next to each link ("pdf, 131 kB" / "doc, 43
 *  kB" / "docx, 18 kB") — reliable regardless of the (inconsistently worded)
 *  human-facing attachment name. */
export function attachmentsFromHtml(html) {
  const out = [];
  const re =
    /href="([^"]*\/attachments\/download\/(\d+))"[^>]*>\s*([^<]*?)\s*<\/a>\s*<\/span>\s*<span class="files[^"]*">\s*([a-z0-9]+)\s*,/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    out.push({ id: m[2], url: m[1], name: m[3].replace(/\s+/g, ' ').trim(), ext: m[4].toLowerCase() });
  }
  return out;
}

/** The first non-scanned attachment whose name matches `namePredicate`. A "-
 *  skan" attachment (any case/spacing) is always the OCR-garbled scanned twin
 *  of the born-digital "- wersja edytowalna" file and is never selected — same
 *  skan/text-twin filter as Kędzierzyn-Koźle. */
function pickAttachment(atts, namePredicate) {
  return atts.find((a) => namePredicate(a.name) && !/skan/i.test(a.name)) || null;
}

/** Extract an attachment's text: pdftotext for a PDF, catdoc/docx-unzip
 *  (core/doc-text.js) for anything else (.doc/.docx) — both born-digital
 *  formats seen live for this city, no OCR needed for either. */
async function extractText(att) {
  return att.ext === 'pdf' ? pdfText(att.url) : docText(att.url);
}

// One memoised pass over the board — see file header. crawlResultDocs() and
// crawlActive() both await the same crawl (like Tarnowskie Góry/Kędzierzyn-Koźle).
let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats/units/buildings)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date:null }
  const seenResultText = new Set(); // dedupe a batch doc shared by several items

  let boardHtml;
  try {
    boardHtml = await getText(BOARD_URL);
  } catch (err) {
    console.error(`  elblag: board fetch failed: ${err.message}`);
    return { listings, land, resultRefs };
  }
  const detailUrls = detailUrlsFromBoard(boardHtml);
  console.error(`  elblag: ${detailUrls.length} item(s) on the Przetargi - zbycie board`);

  for (const detailUrl of detailUrls) {
    let html;
    try {
      html = await getText(detailUrl);
    } catch (err) {
      console.error(`  elblag: detail fetch failed ${detailUrl}: ${err.message}`);
      continue;
    }

    const typPrzetargu = fieldFromHtml(html, 'Typ przetargu');
    if (isRokowania(typPrzetargu)) continue; // negotiations, not a competitive auction

    const kindText = fieldFromHtml(html, 'Rodzaj nieruchomości');
    const roundText = fieldFromHtml(html, 'Przetarg na');
    const priceText = fieldFromHtml(html, 'Cena wywoławcza');
    const auctionDateIso = auctionDateIsoFromHtml(html);
    const atts = attachmentsFromHtml(html);

    const annAtt = pickAttachment(atts, (n) => /og[łl]oszenie/i.test(n));
    if (annAtt) {
      let text = '';
      try {
        text = await extractText(annAtt);
      } catch (err) {
        console.error(`  elblag: announcement extract failed ${annAtt.url}: ${err.message}`);
      }
      const rec = parseAnnouncement({ kindText, roundText, priceText, auctionDateIso, pdfText: text });
      if (rec) {
        const enriched = { ...rec, detail_url: detailUrl, source_url: annAtt.url };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      } else {
        console.error(`  elblag WARN: announcement not parsed (${detailUrl})`);
      }
    } else {
      console.error(`  elblag: no announcement attachment on ${detailUrl}`);
    }

    if (isResolved(html)) {
      const resAtt = pickAttachment(atts, (n) => /wyniki/i.test(n));
      if (!resAtt) {
        console.error(`  elblag WARN: resolved item with no Wyniki attachment (${detailUrl})`);
        continue;
      }
      let text;
      try {
        text = await extractText(resAtt);
      } catch (err) {
        console.error(`  elblag: result extract failed ${resAtt.url}: ${err.message}`);
        continue;
      }
      // Defense in depth: never queue a bezprzetargowo document even if one
      // somehow got linked as a "Wyniki" attachment (see config.js/parse.js).
      if (isResultDoc(text) && !isBezprzetargowoDoc(text) && !seenResultText.has(text)) {
        seenResultText.add(text);
        resultRefs.push({ text, pdf_url: resAtt.url, detail_url: detailUrl, auction_date: null });
      }
    }
  }

  console.error(
    `  elblag: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result document(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result documents (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
