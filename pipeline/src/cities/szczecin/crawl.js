import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncementPage,
  parseResultDoc as parseResultDocFn,
  isResultNotice,
} from './parse.js';

const ORIGIN = 'https://bip.um.szczecin.pl';
const RSS_URL = `${ORIGIN}/rss/131207/rss_131207.xml`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_AGE_DAYS = 90;
const RESULT_LOOKBACK_DAYS = 180;

function parsePubDate(rfc2822) {
  try { return new Date(rfc2822).getTime(); } catch { return 0; }
}

export function parseRss(xml) {
  if (!xml) return [];
  const out = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1];
    const titleM = /<title><!\[CDATA\[(.*?)\]\]>/i.exec(body);
    const linkM = /<link><!\[CDATA\[(.*?)\]\]>/i.exec(body) ||
                  /<guid[^>]*><!\[CDATA\[(.*?)\]\]>/i.exec(body);
    const dateM = /<pubDate><!\[CDATA\[(.*?)\]\]>/i.exec(body);
    if (!titleM || !linkM) continue;
    const pubDate = dateM ? dateM[1].trim() : '';
    const title = titleM[1].trim().replace(/,\s*Sprzedaż.*$/, '').trim();
    let href = linkM[1].trim();
    try {
      const parsed = new URL(href);
      if (parsed.protocol === 'http:' && parsed.hostname === 'bip.um.szczecin.pl') {
        parsed.protocol = 'https:';
        href = parsed.toString();
      }
    } catch {
    }
    out.push({ title, href, pubDate, pubMs: parsePubDate(pubDate) });
  }
  return out;
}

function rssDateToISO(rfc2822) {
  try {
    const d = new Date(rfc2822);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}

let crawlPromise = null;

async function crawlAll() {
  let xml;
  try {
    xml = await getText(RSS_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  szczecin RSS fetch failed: ${err.message}`);
    return { listings: [], wykaz: [], resultRefs: [] };
  }

  const allItems = parseRss(xml);
  console.error(`  szczecin RSS: ${allItems.length} total items`);

  const now = Date.now();
  const activeCutoff = now - MAX_AGE_DAYS * 86400 * 1000;
  const resultCutoff = now - RESULT_LOOKBACK_DAYS * 86400 * 1000;

  const announcementItems = allItems.filter(
    (it) => isAnnouncementTitle(it.title) && it.pubMs >= activeCutoff,
  );
  const resultItems = allItems.filter(
    (it) => isResultTitle(it.title) && it.pubMs >= resultCutoff,
  );

  console.error(
    `  szczecin: ${announcementItems.length} flat announcements (last ${MAX_AGE_DAYS}d), ` +
    `${resultItems.length} result notices (last ${RESULT_LOOKBACK_DAYS}d)`,
  );

  const listings = [];
  for (const it of announcementItems) {
    let html;
    try {
      html = await getText(it.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  szczecin: announcement fetch failed (${it.href}): ${err.message}`);
      continue;
    }
    const rec = parseAnnouncementPage(html, it.href, it.title, rssDateToISO(it.pubDate));
    if (!rec) {
      console.error(`  szczecin: WARN: 0 flats parsed from ${it.href} (${it.title.slice(0, 60)})`);
      continue;
    }
    listings.push(rec);
  }

  const resultRefs = [];
  for (const it of resultItems) {
    let html;
    try {
      html = await getText(it.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  szczecin: result fetch failed (${it.href}): ${err.message}`);
      continue;
    }
    if (!isResultNotice(html)) continue;
    resultRefs.push({
      text: html,
      pdf_url: it.href,
      auction_date: null,
    });
  }

  console.error(
    `  szczecin: ${listings.length} active listings, ${resultRefs.length} result refs`,
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

export { parseResultDoc } from './parse.js';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
