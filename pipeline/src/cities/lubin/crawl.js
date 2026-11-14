
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isResultNotice,
  isGenuineSaleWykazTitle,
  wykazRecordsFromText,
} from './parse.js';

const ORIGIN = 'https://bip.um.lubin.pl';
const FETCH_OPTS = { insecureTLS: true };
const ANNOUNCEMENTS_URL = `${ORIGIN}/artykuly/ogloszenia-o-przetargach`;
const RESULTS_URL = `${ORIGIN}/artykuly/informacje-o-wynikach-przetargow`;
const WYKAZ_URL = `${ORIGIN}/artykuly/wykazy-nieruchomosci`;

function mainContent(html) {
  const start = html.indexOf('<main id="main-content"');
  if (start === -1) return html;
  const end = html.indexOf('</main>', start);
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

function boardArticles(html) {
  const main = mainContent(html);
  const out = [];
  const re = /<article[^>]*>[\s\S]*?<a\s+href="(\/artykul\/[^"]+)"\s*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(main)) !== null) {
    out.push({ url: ORIGIN + m[1], title: m[2].trim() });
  }
  return out;
}

function pdfAttachments(html) {
  const main = mainContent(html);
  const out = [];
  const seen = new Set();
  const re = /href="[^"]*\/attachments\/(\d+)\/download[^"]*"/g;
  let m;
  while ((m = re.exec(main)) !== null) {
    const url = `${ORIGIN}/attachments/${m[1]}/download`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function fetchBoardArticles(boardUrl, { maxPages, deadline, label }) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    if (Date.now() > deadline) {
      console.error(`  lubin: ${label} crawl budget reached at page ${page}`);
      break;
    }
    let html;
    try {
      html = await getText(`${boardUrl}?page=${page}`, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: ${label} board page ${page} fetch failed: ${err.message}`);
      break;
    }
    const articles = boardArticles(html);
    if (!articles.length) break;
    out.push(...articles);
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];

  const known = await loadKnownSourceUrls('lubin');

  const deadline = Date.now() + (Number(process.env.LUBIN_CRAWL_BUDGET_MS) || 10 * 60 * 1000);
  const maxArticles = Number(process.env.LUBIN_MAX_ARTICLES) || 100;
  const maxPages = Number(process.env.LUBIN_MAX_PAGES) || 5;
  let processed = 0;

  const annArticles = await fetchBoardArticles(ANNOUNCEMENTS_URL, {
    maxPages,
    deadline,
    label: 'announcements',
  });
  for (const art of annArticles) {
    if (processed >= maxArticles || Date.now() > deadline) {
      console.error(`  lubin: crawl budget reached (${processed}/${annArticles.length} announcements processed); remainder backfills next run`);
      break;
    }
    processed++;
    let html;
    try {
      html = await getText(art.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: announcement detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lubin: PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      if (isResultNotice(text)) continue;
      for (const rec of parseAnnouncement(text)) {
        const enriched = { ...rec, detail_url: art.url, source_url: pdfUrl };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      }
    }
  }

  const resArticles = await fetchBoardArticles(RESULTS_URL, {
    maxPages,
    deadline,
    label: 'results',
  });
  for (const art of resArticles) {
    if (known.has(art.url)) continue;
    let html;
    try {
      html = await getText(art.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: result detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      if (known.has(pdfUrl)) continue;
      let text;
      try {
        text = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lubin: result PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: art.url, auction_date: null });
    }
  }

  const wykazArticles = await fetchBoardArticles(WYKAZ_URL, {
    maxPages,
    deadline,
    label: 'wykaz',
  });
  for (const art of wykazArticles) {
    if (!isGenuineSaleWykazTitle(art.title)) continue;
    let html;
    try {
      html = await getText(art.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: wykaz detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lubin: wykaz PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      for (const rec of wykazRecordsFromText(text, pdfUrl)) {
        wykaz.push({ ...rec, detail_url: art.url });
      }
    }
  }

  console.error(
    `  lubin: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, wykaz, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, wykaz } = await crawlPromise;
  return { listings, wykaz, land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land, wykaz } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        wykaz: wykaz.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleWykaz: wykaz[0],
      },
      null,
      2,
    ) + '\n',
  );
}
