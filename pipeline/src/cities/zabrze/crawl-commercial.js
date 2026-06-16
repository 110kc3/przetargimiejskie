// Zabrze COMMERCIAL (lokale użytkowe) crawler — document-list board 552, the
// municipal commercial-unit sale-auction board ("Prezydent Miasta Zabrze ogłasza
// … ustny … przetarg … na sprzedaż … lokalu użytkowego"). Found by probing the
// document-list API (549 = flats; 555 = land auctions; 552 = commercial auctions).
// Same machinery as crawl-land.js (board 555), but the attachment is the SAME
// numbered per-unit table the flats board produces — single- OR multi-unit — so
// we route it to parseCommercialAttachment, which emits address-keyed records.
// Emits kind:'uzytkowy', merged into the active/listings stream by index.js →
// data/zabrze/properties.json (refresh.js keeps every non-'grunt' kind there).
//
// Board-membership is the classifier: every announcement on 552 is a commercial
// sale, so we do NOT filter on classifyKind(title) === 'uzytkowy' — several real
// titles are terse ("Ogłoszenie o IV ustnym … przetargu na dzień 10.03.2026 r.")
// and a title-only kind check would silently drop them (the recurring bug
// SPIKE-COVERAGE.md flags). We take every auction announcement and stamp uzytkowy.
//
// Defensive throughout (mirrors crawl-land.js): a failed list/doc/attachment
// fetch is logged and skipped; crawlCommercial() returns [] rather than throwing,
// so a commercial outage never affects the flats stream (index.js wraps it too).

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import {
  parseCommercialAttachment,
  roundFromTitle,
  auctionDateFromTitle,
  auctionDateFromText,
} from './parse.js';
import { attachmentUrlsFromDoc } from './crawl-land.js';

const ORIGIN = 'https://bip.miastozabrze.pl';
const COMMERCIAL_CATEGORY_ID = 552;
const LIST_API = `${ORIGIN}/api/v1/document-list/${COMMERCIAL_CATEGORY_ID}?q=`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// bip.miastozabrze.pl ships an incomplete TLS chain — relax verification for this
// host only (public, read-only data), the same option the flats/land crawlers use.
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

/** Crawl board 552 → per-unit commercial records (kind 'uzytkowy'). */
export async function crawlCommercial() {
  let json;
  try {
    json = JSON.parse(await getText(LIST_API, FETCH_OPTS));
  } catch (err) {
    console.error(`  zabrze commercial list API failed: ${err.message}`);
    return [];
  }
  const items = Array.isArray(json?.data) ? json.data : [];
  // Every item on board 552 is a commercial sale; keep the auction announcements
  // (drop the rare housekeeping notice) without a title-only kind filter.
  const anns = items.filter((it) => {
    const t = it?.dscrpt || '';
    return it?.doc_id && /przetarg|sprzeda|og[łl]oszenie/i.test(t);
  });
  console.error(
    `  zabrze commercial: ${anns.length} commercial auction announcement(s) on board ${COMMERCIAL_CATEGORY_ID}`,
  );

  const out = [];
  for (const it of anns) {
    const docUrl = `${ORIGIN}/doc/${it.doc_id}`;
    let docHtml;
    try {
      docHtml = await getText(docUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze commercial doc fetch failed ${docUrl}: ${err.message}`);
      continue;
    }
    const title = it.dscrpt || '';
    // A /doc may link several attachments (the announcement plus a GDPR/result
    // annex). Try each until one parses as a commercial announcement; the first
    // that yields units wins.
    let parsedCount = 0;
    for (const attUrl of attachmentUrlsFromDoc(docHtml)) {
      let text = '';
      try {
        text = await pdfText(attUrl, FETCH_OPTS);
      } catch {
        try {
          text = await docText(attUrl, FETCH_OPTS);
        } catch {
          continue;
        }
      }
      // Skip the GDPR annex and any published result notice — those are not the
      // sale announcement (results, when present, are handled by the flats-board
      // result stream; this board's job is the active commercial offers).
      if (/INFORMACJA\s+O\s+(PRZETWARZANIU|WYNIKU)/i.test(text)) continue;
      const parsed = parseCommercialAttachment(text);
      if (parsed.length) {
        // The title usually carries the date; the body ("Przetarg odbędzie się w
        // dniu …") is the fallback when it doesn't.
        const auctionDate = auctionDateFromTitle(title) || auctionDateFromText(text);
        for (const u of parsed) {
          out.push({
            kind: 'uzytkowy',
            address_raw: u.address_raw,
            address: u.address,
            auction_date: auctionDate,
            round: roundFromTitle(title),
            area_m2: u.area_m2,
            starting_price_pln: u.starting_price_pln,
            detail_url: docUrl,
            source_url: attUrl,
          });
        }
        parsedCount = parsed.length;
        break;
      }
    }
    if (!parsedCount) {
      console.error(`  zabrze commercial: 0 units parsed on ${docUrl} (${title.slice(0, 60)})`);
      continue;
    }
  }
  console.error(`  zabrze commercial: ${out.length} unit(s) parsed`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recs = await crawlCommercial();
  process.stdout.write(JSON.stringify({ count: recs.length, recs }, null, 2) + '\n');
}
