// Zabrze LAND (działki/grunty) crawler — document-list board 555, the municipal
// land sale-auction board ("Ogłoszenie Prezydenta Miasta Zabrze o … ustnym …
// przetargu na sprzedaż nieruchomości niezabudowanej"). Found by probing the
// document-list API (549 = flats; 544 = land wykazy; 555 = land auctions). Each
// announcement's attachment is single-parcel prose parsed by parseLandAttachment.
// Emits kind:'grunt' so refresh.js routes the records into data/zabrze/land.json.
//
// Defensive throughout: a failed list/doc/attachment fetch is logged and skipped;
// crawlLand() returns [] rather than throwing, so a land outage never affects the
// flats stream (index.js wraps it in try/catch too).

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { roundFromTitle, auctionDateFromTitle, parseLandAttachment } from './parse.js';

const ORIGIN = 'https://bip.miastozabrze.pl';
const LAND_CATEGORY_ID = 555;
const LIST_API = `${ORIGIN}/api/v1/document-list/${LAND_CATEGORY_ID}?q=`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

/** All /attachment/<id> URLs referenced on a /doc page (a notice may carry the
 *  sale announcement plus GDPR/annex PDFs — we try each until one parses). */
export function attachmentUrlsFromDoc(html) {
  const out = [];
  const seen = new Set();
  const re = /((?:https?:\/\/[^"'\s]*?)?\/attachment\/\d+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1].startsWith('http') ? m[1] : ORIGIN + m[1];
    if (!seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

/** Crawl board 555 → parcel-shaped land records (kind 'grunt'). */
export async function crawlLand() {
  let json;
  try {
    json = JSON.parse(await getText(LIST_API, FETCH_OPTS));
  } catch (err) {
    console.error(`  zabrze land list API failed: ${err.message}`);
    return [];
  }
  const items = Array.isArray(json?.data) ? json.data : [];
  const anns = items.filter((it) => {
    const t = it?.dscrpt || '';
    return it?.doc_id && /przetarg/i.test(t) && classifyKind(t) === 'grunt';
  });
  console.error(`  zabrze land: ${anns.length} land auction announcement(s) on board ${LAND_CATEGORY_ID}`);

  const land = [];
  for (const it of anns) {
    const docUrl = `${ORIGIN}/doc/${it.doc_id}`;
    let docHtml;
    try {
      docHtml = await getText(docUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze land doc fetch failed ${docUrl}: ${err.message}`);
      continue;
    }
    const title = it.dscrpt || '';
    let rec = null;
    for (const attUrl of attachmentUrlsFromDoc(docHtml)) {
      let text = '';
      try {
        text = await pdfText(attUrl, FETCH_OPTS);
      } catch {
        try { text = await docText(attUrl, FETCH_OPTS); } catch { continue; }
      }
      // Skip the GDPR / data-processing annex (no parcel in it).
      if (/INFORMACJA\s+O\s+PRZETWARZANIU/i.test(text) && !/dzia[łl]k/i.test(text)) continue;
      const parsed = parseLandAttachment(text);
      if (parsed && (parsed.dzialka_nr || parsed.address_raw)) {
        rec = { ...parsed, source_url: attUrl };
        break;
      }
    }
    if (!rec) {
      console.error(`  zabrze land: no parseable parcel on ${docUrl} (${title.slice(0, 50)})`);
      continue;
    }
    land.push({
      kind: 'grunt',
      dzialka_nr: rec.dzialka_nr,
      obreb: rec.obreb,
      area_m2: rec.area_m2,
      address_raw: rec.address_raw,
      starting_price_pln: rec.starting_price_pln,
      auction_date: auctionDateFromTitle(title) || rec.auction_date,
      round: roundFromTitle(title),
      detail_url: docUrl,
      source_url: rec.source_url,
    });
  }
  console.error(`  zabrze land: ${land.length} parcel(s) parsed`);
  return land;
}
