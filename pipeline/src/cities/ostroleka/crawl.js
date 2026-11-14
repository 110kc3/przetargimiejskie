
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  parseMetaTable,
  parseAttachments,
  isResultAttachment,
  isAnnouncementAttachment,
  buildActiveListing,
} from './parse.js';

const ORIGIN = 'https://bip.um.ostroleka.pl';
const MAX_PAGES = 15;
const MIN_YEAR = 2020;

const listUrl = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/10`;
const detailUrl = (id, slug) => `${ORIGIN}/przetarg-nieruchomosci/${id}/${slug}`;

async function listFlatDetails() {
  const seen = new Set();
  const flats = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    let html;
    try {
      html = await getText(listUrl(p));
    } catch (err) {
      console.error(`  ostroleka: listing page ${p} failed (${err.message})`);
      break;
    }
    const cards = html.split('table table-borderless').slice(1);
    if (cards.length === 0) break;
    let addedOnPage = 0;
    for (const card of cards) {
      const link = /przetarg-nieruchomosci\/(\d+)\/([a-z0-9\-]+)/i.exec(card);
      if (!link) continue;
      const rodzaj = /Rodzaj nieruchomości<\/th>\s*<td>([^<]+)/i.exec(card);
      addedOnPage++;
      if (!rodzaj || !/lokal\s+mieszkalny/i.test(rodzaj[1])) continue;
      const id = link[1];
      if (seen.has(id)) continue;
      seen.add(id);
      flats.push({ id, slug: link[2], url: detailUrl(id, link[2]) });
    }
    if (addedOnPage === 0) break;
  }
  console.error(`  ostroleka: ${flats.length} lokal-mieszkalny detail page(s) found`);
  return flats;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  const flats = await listFlatDetails();
  for (const flat of flats) {
    let html;
    try {
      html = await getText(flat.url);
    } catch (err) {
      console.error(`  ostroleka: detail ${flat.id} failed (${err.message})`);
      continue;
    }
    const meta = parseMetaTable(html);
    const atts = parseAttachments(html);
    const resultAtt = atts.find((a) => isResultAttachment(a.label));
    const annAtt =
      atts.find((a) => isAnnouncementAttachment(a.label)) ||
      atts.find((a) => !isResultAttachment(a.label)) ||
      null;

    if (resultAtt) {
      resultRefs.push({
        pdf_url: resultAtt.url,
        auction_date: meta.auction_date,
        detail_url: flat.url,
      });
      continue;
    }

    const year = meta.auction_date ? Number(meta.auction_date.slice(0, 4)) : null;
    if (year != null && year < MIN_YEAR) continue;

    let ocrText = '';
    if (annAtt) {
      try {
        ocrText = await ocrPdf(annAtt.url);
      } catch (err) {
        console.error(`  ostroleka: announcement OCR failed ${annAtt.url} (${err.message})`);
      }
    }
    const rec = buildActiveListing(meta, {
      ocrText,
      label: annAtt?.label || '',
      detailUrl: flat.url,
    });
    if (rec) listings.push(rec);
    else console.error(`  ostroleka WARN: could not build active listing for ${flat.url}`);
  }

  console.error(
    `  ostroleka: ${listings.length} active listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = await crawlResultDocs();
  const { listings } = await crawlActive();
  process.stdout.write(
    JSON.stringify(
      { results: results.length, listings: listings.length, sampleResult: results[0], sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
