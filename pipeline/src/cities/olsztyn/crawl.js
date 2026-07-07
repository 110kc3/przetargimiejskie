// Olsztyn crawler.
//
// The BIP (bip.olsztyn.eu) publishes two server-rendered HTML index tables:
//
//   RESULTS INDEX (kategoria/188) — result notices (informacja o wynikach)
//     Default view shows only "Aktualny" (currently 1 land result).
//     Archived flat-sale results are at:
//       ?VInformacjaSearch%5Barchiwum%5D=1
//     Each row: <tr data-key="ID"> with a link href="/ID/...slug...html"
//
//   ANNOUNCEMENTS INDEX (kategoria/187) — active and archived announcements
//     Same structure; archived flat announcements at the same archiwum param.
//     Active flat announcements: title contains "lokalu mieszkalnego".
//
// crawlResultDocs():
//   1. Fetches both the "Aktualny" and "Archiwalny" results index pages
//      (no pagination observed; all results fit in one page per filter).
//   2. Keeps only rows whose title contains "lokal mieszkaln".
//   3. Fetches each kept detail page, strips HTML → plain text.
//   4. Returns { text, auction_date, pdf_url } objects for parseResultDoc().
//
// crawlActive():
//   1. Fetches both aktualny and archiwalny announcements index.
//   2. Keeps rows with "lokal mieszkaln" in the title.
//   3. Fetches each announcement detail page, calls parseActiveDoc().
//   4. Returns { listings, wykaz: [], land: [] }.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { stripTags, parseActiveDoc } from './parse.js';

const BASE = 'https://bip.olsztyn.eu';
const RESULTS_INDEX = `${BASE}/kategoria/188/informacja-o-wynikach-przetargow-nieruchomosci.html`;
const ACTIVE_INDEX = `${BASE}/kategoria/187/informacja-o-przetargach-nieruchomosci.html`;
const ARCHIVED_PARAM = 'VInformacjaSearch%5Barchiwum%5D=1';

// Row pattern in both index tables:
//   <tr data-key="ID"><td...><td...DATE...</td><td...>
//     <a href="/ID/slug.html">TITLE</a></td><td...>STATUS</td></tr>
export function parseIndexPage(html) {
  const rows = [];
  const rowRe = /<tr\s+data-key="(\d+)">([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const id = m[1];
    const inner = m[2];
    const linkM = /<a\s+href="([^"]+)"\s[^>]*>([\s\S]*?)<\/a>/i.exec(inner);
    if (!linkM) continue;
    const href = linkM[1];
    const title = stripTags(linkM[2]).trim();
    const dateM = /data-col-date[^>]*>([^<]+)</.exec(inner);
    const published_date = dateM ? dateM[1].trim().replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1') : null;
    const detailUrl = href.startsWith('http') ? href : `${BASE}${href}`;
    rows.push({ id, title, detailUrl, published_date });
  }
  return rows;
}

function isFlatSaleResult(title) {
  return /lokal\w*\s+mieszkaln/i.test(title);
}

function isFlatAnnouncement(title) {
  // "Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego"
  return /sprzeda[żz]\s+lokalu\s+mieszkaln/i.test(title) ||
         /lokalu\s+mieszkaln/i.test(title);
}

async function fetchIndexRows(baseUrl, filter) {
  const url = filter ? `${baseUrl}?${filter}` : baseUrl;
  let html;
  try {
    html = await getText(url);
  } catch (err) {
    console.error(`  olsztyn index fetch failed (${url}): ${err.message}`);
    return [];
  }
  return parseIndexPage(html);
}

// Extracts the article body text from a detail page HTML
function extractBodyText(html) {
  // The content lives in <article class="post">...</article>
  const artM = /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  return stripTags(artM ? artM[1] : html);
}

export async function crawlResultDocs() {
  const seen = new Set();
  const refs = [];

  // Fetch both aktualny (default) and archiwalny pages
  for (const filter of [null, ARCHIVED_PARAM]) {
    const rows = await fetchIndexRows(RESULTS_INDEX, filter);
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (isFlatSaleResult(r.title)) refs.push(r);
    }
  }

  console.error(
    `  olsztyn results index: ${refs.length} flat-sale result notice(s) found`,
  );

  const out = [];
  for (const r of refs) {
    let html;
    try {
      html = await getText(r.detailUrl);
    } catch (err) {
      console.error(`  olsztyn result page fetch failed (${r.detailUrl}): ${err.message}`);
      continue;
    }
    const text = extractBodyText(html);
    out.push({
      text,
      auction_date: r.published_date,
      pdf_url: r.detailUrl,
    });
  }

  console.error(`  olsztyn: fetched ${out.length} result page(s)`);
  return out;
}

export async function crawlActive() {
  const seen = new Set();
  const annRefs = [];

  for (const filter of [null, ARCHIVED_PARAM]) {
    const rows = await fetchIndexRows(ACTIVE_INDEX, filter);
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (isFlatAnnouncement(r.title)) annRefs.push(r);
    }
  }

  console.error(
    `  olsztyn announcements index: ${annRefs.length} flat announcement(s) found`,
  );

  const listings = [];

  for (const r of annRefs) {
    let html;
    try {
      html = await getText(r.detailUrl);
    } catch (err) {
      console.error(`  olsztyn announcement fetch failed (${r.detailUrl}): ${err.message}`);
      continue;
    }

    const bodyText = extractBodyText(html);
    const parsed = parseActiveDoc(r.title, bodyText);
    if (!parsed) {
      console.error(`  olsztyn WARN: unkeyable announcement ${r.id} (${r.title.slice(0, 60)})`);
      continue;
    }

    listings.push({
      kind: parsed.kind,
      address_raw: parsed.address_raw,
      address: parsed.address,
      auction_date: parsed.auction_date,
      published_date: r.published_date,
      round: parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: parsed.starting_price_pln,
      detail_url: r.detailUrl,
    });
  }

  console.error(`  olsztyn active: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
