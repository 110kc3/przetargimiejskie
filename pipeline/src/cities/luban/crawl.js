// Lubań crawler — https://luban.pl/1333 ("Nieruchomości Miasta Lubań").
// Server-rendered HTML announcements (no OCR required).
//
// WAF / SERVER NOTE:
//   IdeaWebServer/6.4.2 returns HTTP 403 on bare `?Article_page=N`.
//   Percent-encoding the underscore as `?Article%5Fpage=N` returns HTTP 200.
//
// OFFER-SIDE STREAM:
//   Announcements carry cena wywoławcza, area, wadium, round, auction date.
//   Negative round outcomes appear inline in subsequent announcements.
//   Achieved-price result notices are not published as separate documents,
//   so crawlResultDocs returns an empty list.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAnnouncement } from './parse.js';

const ORIGIN = 'https://luban.pl';
const HUB_URL = `${ORIGIN}/1333`;
const PAGE_URL = (p) => (p === 1 ? HUB_URL : `${HUB_URL}?Article%5Fpage=${p}`);
const MAX_PAGES = 12;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const EXCLUDE_RE = /najem|dzier[żz]aw|bezprzetargow|rezerwacj|deklaracja-dostepnosci/i;

/**
 * Harvest unique announcement item descriptors from one index page's HTML.
 * @param {string} html
 * @returns {Array<{href:string, title:string, published_date:string|null}>}
 */
export function harvestIndexItems(html) {
  const items = [];
  const re = /<div class="item-cell item-article">([\s\S]*?)<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const block = m[1];
    const hrefM = /href="(\/artykul\/\d+\/[^"]+)"/i.exec(block);
    const dateM = /<div class="date">\s*<span>(\d{2})-(\d{2})-(\d{4})<\/span>/i.exec(block);
    const titleM = /<h3><a[^>]*>([^<]+)<\/a><\/h3>/i.exec(block);
    if (hrefM) {
      const published_date = dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}` : null;
      items.push({
        href: hrefM[1],
        title: titleM ? titleM[1].trim() : '',
        published_date,
      });
    }
  }
  return items;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const seenHrefs = new Set();
  const candidates = [];

  for (let p = 1; p <= MAX_PAGES; p++) {
    const pageUrl = PAGE_URL(p);
    let html;
    try {
      html = await getText(pageUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  luban page ${p} fetch failed (${pageUrl}): ${err.message}`);
      break;
    }

    const items = harvestIndexItems(html);
    if (items.length === 0) break;

    let addedOnPage = 0;
    for (const it of items) {
      if (seenHrefs.has(it.href)) continue;
      seenHrefs.add(it.href);

      // Skip non-sale notices by title/slug
      if (EXCLUDE_RE.test(it.title) || EXCLUDE_RE.test(it.href)) continue;
      // Skip wykaz notices that are not auctions
      if (/komunikat.*o\s+wykazie|wykaz.*najem/i.test(it.title)) continue;

      candidates.push(it);
      addedOnPage++;
    }

    if (addedOnPage === 0 && items.length > 0) {
      // If none added, we might have looped past the active pages
      // continue for at least 3 pages to be safe
      if (p > 3) break;
    }
  }

  console.error(`  luban: ${candidates.length} candidate announcement(s) to inspect`);

  for (const it of candidates) {
    const url = `${ORIGIN}${it.href}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  luban article fetch failed (${url}): ${err.message}`);
      continue;
    }

    const rec = parseAnnouncement(it.title, html, url, it.published_date);
    if (!rec) continue;

    if (rec.kind === 'grunt') {
      land.push(rec);
    } else {
      listings.push(rec);
    }
  }

  console.error(`  luban: ${listings.length} flat/building listing(s), ${land.length} land plot(s)`);
  return { listings, land };
}

/**
 * Active flat/building listings + land plots for Lubań.
 * @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>}
 */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

/**
 * Result docs stream — Lubań publishes no separate concluded-price documents.
 * @returns {Promise<any[]>}
 */
export async function crawlResultDocs() {
  return [];
}

// ---------------------------------------------------------------------------
// CLI harness (manual testing: node crawl.js)
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} listing(s), ${land.length} land plot(s)`);
}
