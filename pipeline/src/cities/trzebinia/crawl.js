// Trzebinia crawler — the Joomla "Tablica ogłoszeń → Ogłoszenia" board
// (server-rendered HTML, no OCR). See config.js.
//
// The board is a MIXED, paginated list (Joomla ?start=N); each item is a full
// HTML article at /administracja-miasto-i-gmina/tablica-ogloszen/ogloszenia/<id>-<slug>.
// The listing link TEXT carries the full title (the slug is truncated), so we
// harvest (href,title) pairs, keep only sale announcements + result notices by
// TITLE, then fetch each article and parse its body.
//
// One memoised pass serves both streams (refresh.js calls crawlResultDocs() then
// crawlActive()). source:'html' ⇒ result refs already carry `.text`.
//
// NOTE (confirm on first CI refresh): the Joomla listing markup + pagination
// depth were inferred from the live article URLs; the body parsers are
// groundtruthed. Confirm the index harvest on the first real run.

import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle, isResultTitle, parseAnnouncement, parseResultDoc, htmlToText,
} from './parse.js';

const ORIGIN = 'https://trzebinia.pl';
const BOARD = '/administracja-miasto-i-gmina/tablica-ogloszen/ogloszenia';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = 12; // Joomla ?start=N (20/page) — defensive depth

const abs = (p) => (/^https?:/.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

// Harvest (href,title) of board articles from one listing page's HTML.
function harvestLinks(html) {
  const out = [];
  const re = /<a[^>]+href="((?:https?:\/\/[^"]+)?\/administracja-miasto-i-gmina\/tablica-ogloszen\/ogloszenia\/\d+-[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = abs(m[1].replace(/&amp;/g, '&'));
    const title = htmlToText(m[2]);
    if (title) out.push({ href, title });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  // 1) Harvest candidate (href,title) across the paginated board; keep sale
  //    announcements + result notices by title; dedupe by href.
  const seen = new Set();
  const candidates = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const url = `${abs(BOARD)}?start=${p * 20}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  trzebinia board fetch failed (${url}): ${err.message}`);
      break;
    }
    let added = 0;
    for (const { href, title } of harvestLinks(html)) {
      if (seen.has(href)) continue;
      seen.add(href);
      const isAnn = isAnnouncementTitle(title);
      const isRes = isResultTitle(title);
      if (!isAnn && !isRes) continue;
      candidates.push({ href, title, role: isRes ? 'result' : 'ann' });
      added++;
    }
    if (added === 0 && p > 0) break; // no new relevant items → stop paging
  }
  console.error(`  trzebinia: ${candidates.length} candidate article(s) (announcements + results)`);

  // 2) Fetch + parse each.
  for (const c of candidates) {
    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  trzebinia article fetch failed (${c.href}): ${err.message}`);
      continue;
    }
    if (c.role === 'result') {
      resultRefs.push({ text: htmlToText(html), pdf_url: c.href, detail_url: c.href, auction_date: null });
      continue;
    }
    const rec = parseAnnouncement(c.title, html, c.href);
    if (!rec) {
      console.error(`  trzebinia WARN: unparsed announcement ${c.href} (${c.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  trzebinia: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
