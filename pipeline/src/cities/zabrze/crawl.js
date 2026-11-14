import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import {
  parseAnnouncementText,
  roundFromTitle,
  auctionDateFromTitle,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.miastozabrze.pl';
const LIST_CATEGORY_ID = 549;
const LIST_API = `${ORIGIN}/api/v1/document-list/${LIST_CATEGORY_ID}?q=`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

export function parseDocumentList(json) {
  const items = json?.data;
  if (!Array.isArray(items)) return [];
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const id = it?.doc_id;
    const title = it?.dscrpt || '';
    if (!id || seen.has(id)) continue;
    if (!/przetarg|sprzeda|ogłoszenie/i.test(title)) continue;
    seen.add(id);
    out.push({
      doc_url: `${ORIGIN}/doc/${id}`,
      title,
      round: roundFromTitle(title),
      auction_date: auctionDateFromTitle(title),
      published_date: (it?.pubdat || '').slice(0, 10) || null,
    });
  }
  return out;
}

export function attachmentUrlFromDoc(html) {
  const m = /((?:https?:\/\/[^"'\s]*?)?\/attachment\/\d+)/i.exec(html);
  if (!m) return null;
  return m[1].startsWith('http') ? m[1] : ORIGIN + m[1];
}

async function crawlAnnouncements() {
  let json;
  try {
    json = JSON.parse(await getText(LIST_API, FETCH_OPTS));
  } catch (err) {
    console.error(`  zabrze document-list API failed: ${err.message}`);
    return [];
  }
  const anns = parseDocumentList(json);
  console.error(`  zabrze document-list: ${anns.length} announcements`);
  return anns;
}

let crawlPromise = null;

async function crawlAll() {
  const announcements = await crawlAnnouncements();
  const listings = [];
  const resultRefs = [];
  for (const ann of announcements) {
    let docHtml;
    try {
      docHtml = await getText(ann.doc_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze doc fetch failed ${ann.doc_url}: ${err.message}`);
      continue;
    }
    const attUrl = attachmentUrlFromDoc(docHtml);
    if (!attUrl) {
      const hasWord = /attachment/i.test(docHtml);
      console.error(
        `  zabrze: no attachment on ${ann.doc_url} [docLen=${docHtml.length} hasAttachmentWord=${hasWord}]`,
      );
      continue;
    }
    let text = '';
    try {
      text = await pdfText(attUrl, FETCH_OPTS);
    } catch (err) {
      try {
        text = await docText(attUrl, FETCH_OPTS);
      } catch (err2) {
        console.error(`  zabrze attachment extract failed ${attUrl}: ${err.message}`);
        continue;
      }
    }
    if (/INFORMACJA\s+O\s+WYNIKU/i.test(text)) {
      resultRefs.push({ text, pdf_url: attUrl, auction_date: null });
      continue;
    }

    const flats = parseAnnouncementText(text);
    if (flats.length === 0) {
      console.error(`  zabrze WARN: 0 flats parsed from ${attUrl} (${ann.title})`);
    }
    const auctionDate = ann.auction_date || auctionDateFromText(text);
    for (const f of flats) {
      listings.push({
        kind: f.kind,
        address_raw: f.address_raw,
        address: f.address,
        auction_date: auctionDate,
        round: ann.round,
        area_m2: f.area_m2,
        starting_price_pln: f.starting_price_pln,
        detail_url: ann.doc_url,
      });
    }
  }
  console.error(
    `  zabrze: ${listings.length} flats from ${announcements.length} announcements, ${resultRefs.length} result notices`,
  );
  return { listings, wykaz: [], resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
