
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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_NOTICES = 90;

function toXmlUrl(url) {
  return url.startsWith(`${ORIGIN}/`) && !url.startsWith(`${ORIGIN}/xml/`)
    ? url.replace(`${ORIGIN}/`, `${ORIGIN}/xml/`)
    : url;
}

const decodeEntities = (s) => String(s || '').replace(/&amp;/gi, '&').trim();

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

export function extractTresc(xml) {
  const m = /<tresc[^>]*>([\s\S]*?)<\/tresc>/i.exec(xml || '');
  return m ? stripHtml(m[1]) : '';
}

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

function isStubTresc(body) {
  return !body || body.length < 160 || /^\s*(pdf|docx?|rtf|odt|xlsx?)\b/i.test(body);
}

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
  const listings = [];
  const land = [];
  const resultRefs = [];

  let feedXml;
  try {
    feedXml = await getText(BOARD_FEED, { userAgent: UA });
  } catch (err) {
    console.error(`  wabrzezno: board feed fetch failed: ${err.message}`);
    return { listings, land, resultRefs };
  }

  const refs = parseBoardFeed(feedXml).slice(0, MAX_NOTICES);
  for (const ref of refs) {
    if (isRokowania(ref.title)) continue;
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
    if (!isSaleAuction(text)) continue;
    if (isLease(text)) continue;

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

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

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
