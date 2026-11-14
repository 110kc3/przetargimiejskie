
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.jeleniagora.pl';
const ANNOUNCEMENTS_XML = `${ORIGIN}/artykuly/xml/126/1/1`;
const RESULTS_XML = `${ORIGIN}/artykuly/xml/321/1/1`;

function parseXmlArticles(xml) {
  const out = [];
  const re = /<artykul>\s*<url>([^<]*)<\/url>\s*<tytul>([^<]*)<\/tytul>\s*<data>([^<]*)<\/data>/g;
  let m;
  while ((m = re.exec(xml || '')) !== null) {
    const url = m[1].trim();
    if (url) out.push({ url, title: m[2].trim(), date: m[3].trim() });
  }
  return out;
}

function pdfAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="(https:\/\/bip\.jeleniagora\.pl\/attachments\/download\/\d+)"/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(m[1]);
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const known = await loadKnownSourceUrls('jelenia-gora');

  const deadline = Date.now() + (Number(process.env.JG_CRAWL_BUDGET_MS) || 15 * 60 * 1000);
  const maxArticles = Number(process.env.JG_MAX_ARTICLES) || 150;
  let processed = 0;

  let annXml = '';
  try {
    annXml = await getText(ANNOUNCEMENTS_XML);
  } catch (err) {
    console.error(`  jelenia-gora: announcements XML feed failed: ${err.message}`);
  }
  const annArticles = parseXmlArticles(annXml);

  for (const art of annArticles) {
    if (processed >= maxArticles || Date.now() > deadline) {
      console.error(`  jelenia-gora: crawl budget reached (${processed}/${annArticles.length} announcements processed); remainder backfills next run`);
      break;
    }
    processed++;
    let html;
    try {
      html = await getText(art.url);
    } catch (err) {
      console.error(`  jelenia-gora: announcement detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  jelenia-gora: PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      if (isResultNotice(text)) continue;
      for (const rec of parseAnnouncement(text)) {
        const enriched = { ...rec, detail_url: art.url, source_url: pdfUrl };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      }
    }
  }

  let resXml = '';
  try {
    resXml = await getText(RESULTS_XML);
  } catch (err) {
    console.error(`  jelenia-gora: results XML feed failed: ${err.message}`);
  }
  const resArticles = parseXmlArticles(resXml);

  for (const art of resArticles) {
    if (known.has(art.url)) continue;
    let html;
    try {
      html = await getText(art.url);
    } catch (err) {
      console.error(`  jelenia-gora: result detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      if (known.has(pdfUrl)) continue;
      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  jelenia-gora: result PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: art.url, auction_date: null });
    }
  }

  console.error(
    `  jelenia-gora: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
