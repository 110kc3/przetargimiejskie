import { pathToFileURL } from 'node:url';
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
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

export async function crawlCommercial() {
  let json;
  try {
    json = JSON.parse(await getText(LIST_API, FETCH_OPTS));
  } catch (err) {
    console.error(`  zabrze commercial list API failed: ${err.message}`);
    return [];
  }
  const items = Array.isArray(json?.data) ? json.data : [];
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
      if (/INFORMACJA\s+O\s+(PRZETWARZANIU|WYNIKU)/i.test(text)) continue;
      const parsed = parseCommercialAttachment(text);
      if (parsed.length) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const recs = await crawlCommercial();
  process.stdout.write(JSON.stringify({ count: recs.length, recs }, null, 2) + '\n');
}
