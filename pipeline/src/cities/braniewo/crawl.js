import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncement,
  isResultNotice,
  isApplicationForm,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'http://bip.braniewo.pl';
const BOARD = 120;

const MAX_PAGES = 20;

const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const xmlUrl = (page) => `${ORIGIN}/artykuly/xml/${BOARD}/${page}/1`;
const fileUrl = (attId) => `${ORIGIN}/attachments/download/${attId}`;

function pageCountFromXml(xml) {
  const m = /<ilosc-stron>\s*(\d+)\s*<\/ilosc-stron>/i.exec(xml || '');
  return m ? Math.min(Number(m[1]), MAX_PAGES) : 1;
}

export function parseXmlPage(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let block;
  while ((block = re.exec(xml)) !== null) {
    const b = block[1];
    const url = (/<url>\s*([^<]+?)\s*<\/url>/i.exec(b) || [])[1] || '';
    const title = (/<tytul>\s*([\s\S]*?)\s*<\/tytul>/i.exec(b) || [])[1] || '';
    const dm = /<data>\s*(\d{2})\.(\d{2})\.(\d{4})\s*<\/data>/i.exec(b);
    const published_date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null;
    const idm = /\/artykul\/\d+\/(\d+)\//.exec(url);
    if (!idm) continue;
    out.push({ id: idm[1], url, title: title.trim(), published_date });
  }
  return out;
}

export function attachmentUrls(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /attachments\/download\/(\d+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(fileUrl(m[1]));
  }
  return out;
}

async function articleNotice(id, url) {
  let html;
  try {
    html = await getText(url);
  } catch (err) {
    console.error(`  braniewo: article ${id} fetch failed: ${err.message}`);
    return null;
  }
  for (const pdfUrl of attachmentUrls(html)) {
    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  braniewo: PDF extract failed ${pdfUrl}: ${err.message}`);
      continue;
    }
    if (!text || isApplicationForm(text)) continue;
    return { pdfUrl, text };
  }
  return null;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  let refs = [];
  let firstXml;
  try {
    firstXml = await getText(xmlUrl(1));
  } catch (err) {
    console.error(`  braniewo: XML feed page 1 failed: ${err.message}`);
    return { listings, land, resultRefs };
  }
  const totalPages = pageCountFromXml(firstXml);
  refs = parseXmlPage(firstXml);
  for (let page = 2; page <= totalPages; page++) {
    try {
      refs = refs.concat(parseXmlPage(await getText(xmlUrl(page))));
    } catch (err) {
      console.error(`  braniewo: XML feed page ${page} failed: ${err.message}`);
      break;
    }
  }

  const seen = new Set();
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    if (isSkippableTitle(ref.title, ref.url)) continue;
    if (!isResultTitle(ref.title, ref.url) && !isAnnouncementTitle(ref.title, ref.url)) continue;

    const notice = await articleNotice(ref.id, ref.url);
    if (!notice) {
      console.error(`  braniewo: no notice PDF on article ${ref.id} (${ref.title.slice(0, 60)})`);
      continue;
    }
    const { pdfUrl, text } = notice;

    if (isResultNotice(text)) {
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: ref.url, auction_date: null });
      continue;
    }

    const rec = parseAnnouncement(text);
    if (!rec) {
      console.error(`  braniewo WARN: announcement not parsed (article ${ref.id}, ${ref.title.slice(0, 60)})`);
      continue;
    }
    if (!rec.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
      rec.auction_date = ref.published_date;
      rec.auction_date_estimated = true;
    }
    const enriched = { ...rec, detail_url: ref.url, source_url: pdfUrl };
    (rec.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  braniewo: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0]?.pdf_url },
      null,
      2,
    ) + '\n',
  );
}
