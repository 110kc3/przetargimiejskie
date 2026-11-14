import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText } from '../../core/finn-bip.js';
import { isAnnouncementTitle, isResultTitle, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bochnia.eu';
const CATEGORY = '/kategorie/komunikaty-i-ogloszenia/';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = Number(process.env.BOCHNIA_MAX_PAGES) || 40;
const TIME_BUDGET_MS = Number(process.env.BOCHNIA_TIME_BUDGET_MS) || 120000;

const POST_RE = /<a[^>]+href="(https:\/\/bochnia\.eu\/[a-z0-9][a-z0-9-]{15,}\/)"[^>]*>([\s\S]*?)<\/a>/gi;

function harvestLinks(html) {
  const out = [];
  let m;
  while ((m = POST_RE.exec(html)) !== null) {
    const href = m[1];
    const title = htmlToText(m[2]);
    if (title && title.length > 10) out.push({ href, title });
  }
  return out;
}

function articleBody(html) {
  const m = /<[^>]*class="cs-post-content"[^>]*>/i.exec(html);
  if (!m) return html;
  const chunk = html.slice(m.index + m[0].length);
  const end = chunk.search(/cs-single-post-controls|cs-related|<footer/i);
  return end > 0 ? chunk.slice(0, end) : chunk;
}

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('bochnia');
  const start = Date.now();

  const seen = new Set();
  const candidates = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  bochnia: index time budget reached at page ${p}`);
      break;
    }
    const url = p === 1 ? `${ORIGIN}${CATEGORY}` : `${ORIGIN}${CATEGORY}page/${p}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (!/\b404\b/.test(err.message)) {
        console.error(`  bochnia index fetch failed (${url}): ${err.message}`);
      }
      break;
    }
    for (const { href, title } of harvestLinks(html)) {
      if (seen.has(href)) continue;
      seen.add(href);
      const isRes = isResultTitle(title);
      const isAnn = !isRes && isAnnouncementTitle(title);
      if (!isRes && !isAnn) continue;
      candidates.push({ href, title, role: isRes ? 'result' : 'ann' });
    }
  }
  console.error(`  bochnia: ${candidates.length} candidate article(s) (announcements + results)`);

  const listings = [];
  const land = [];
  const resultRefs = [];
  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) continue;
    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  bochnia article fetch failed (${c.href}): ${err.message}`);
      continue;
    }
    const body = articleBody(html);
    if (c.role === 'result') {
      resultRefs.push({
        text: `${c.title}. ${htmlToText(body)}`,
        pdf_url: c.href, detail_url: c.href, auction_date: null,
      });
      continue;
    }
    const rec = parseAnnouncement(c.title, body, c.href);
    if (!rec) {
      console.error(`  bochnia WARN: unparsed announcement ${c.href} (${c.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  bochnia: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
