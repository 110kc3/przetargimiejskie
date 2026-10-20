// Chrzanów crawler. The city portal www.chrzanow.pl is the server-rendered
// enumeration layer; each item links a bip.malopolska.pl/umchrzanow article whose
// body is a JS SPA. Fetch its anonymous public article JSON instead: Chromium
// can finish loading the SPA shell before the notice arrives. See config.js.
//
// Live-verified 19 October 2026 against article 2950984, including its combined
// three-parcel sale table; public API verified 20 October. If fetching fails,
// last-good data remains subject to refresh's preservation rules.
// Result notices ("Wyniki przetargów") are not yet
// ingested; source/asset coverage is explicitly partial.

import { getText } from '../../core/fetch.js';
import { parseAnnouncement } from './parse.js';

const ORIGIN = 'https://www.chrzanow.pl';
const BOARDS = [
  '/zbycie-nieruchomosci/ogloszenia-o-przetargach/nieruchomosci-niezabudowane',
  '/zbycie-nieruchomosci/ogloszenia-o-przetargach/nieruchomosci-niezabudowane-i-lokale',
];
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function harvestArticles(html) {
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/bip\.malopolska\.pl\/umchrzanow[,/]a,?\d+[^"'\s)]*/gi)) out.add(m[0]);
  return [...out];
}

let crawlPromise = null;

export function articleBody(raw, url) {
  const source = new URL(url);
  const id = /^\/umchrzanow[,/]a,?(\d+)(?:,|$)/i.exec(source.pathname)?.[1];
  if (source.origin !== 'https://bip.malopolska.pl' || !id) throw new Error('Invalid Chrzanów article URL');
  const article = JSON.parse(raw);
  if (String(article.id) !== id || String(article.articleId) !== id
    || !String(article.link).startsWith(`umchrzanow,a,${id},`)
    || typeof article.content !== 'string' || !article.content.trim()) {
    throw new Error(`Invalid Chrzanów article response (${id})`);
  }
  return { title: article.title || '', html: article.content };
}

export async function crawlAll({ fetchText = getText } = {}) {
  const listings = [];
  const land = [];

  const seen = new Set();
  const articles = [];

  // The board listing pages carry only LOCAL article-stub links; the actual
  // bip.malopolska.pl/umchrzanow article URL lives one level deeper, inside each
  // stub page. So: (1) harvest stub URLs from the boards, (2) fetch each stub and
  // harvest its BIP article URL. (Two-level structure confirmed live 2026-06-27.)
  const LOCAL_STUB_RE = /href="(\/zbycie-nieruchomosci\/ogloszenia-o-przetargach\/[^"]+,\d+)"/gi;
  const stubs = new Set();
  for (const board of BOARDS) {
    const html = await fetchText(`${ORIGIN}${board}`, { userAgent: BROWSER_UA });
    for (const m of html.matchAll(LOCAL_STUB_RE)) stubs.add(`${ORIGIN}${m[1]}`);
  }
  console.error(`  chrzanow: ${stubs.size} stub page(s) to scan for BIP links`);

  for (const stubUrl of stubs) {
    const stubHtml = await fetchText(stubUrl, { userAgent: BROWSER_UA });
    for (const u of harvestArticles(stubHtml)) if (!seen.has(u)) { seen.add(u); articles.push(u); }
  }
  console.error(`  chrzanow: ${articles.length} BIP article(s) to fetch`);
  // These rolling boards cannot prove that the municipality has no stock.
  if (!articles.length) throw new Error('Chrzanów boards yielded no BIP articles');

  for (const url of articles) {
    const id = /^\/umchrzanow[,/]a,?(\d+)/i.exec(new URL(url).pathname)[1];
    const raw = await fetchText(`https://bip.malopolska.pl/api/articles/${id}`, { userAgent: BROWSER_UA });
    const { title, html } = articleBody(raw, url);
    for (const rec of parseAnnouncement(title, html, url)) (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  chrzanow: ${listings.length} listing(s), ${land.length} land plot(s)`);
  return { listings, land };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land, land_complete: false };
}
