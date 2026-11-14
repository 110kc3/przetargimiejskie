import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseListPage,
  isResultNoticeTitle,
  attachmentUrlFromDetail,
} from './parse.js';

const ORIGIN = 'https://bipum.kielce.eu';
const BOARD_BASE =
  `${ORIGIN}/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/` +
  `przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/`;
const BOARD_PAGED =
  `${BOARD_BASE}przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci-1.html`;

const MAX_PAGES = 12;

function pageUrl(n) {
  return n === 1 ? BOARD_BASE : `${BOARD_PAGED}?page=${n}`;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  const seenKeys = new Set();
  const seenResultUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = pageUrl(page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  kielce board page ${page} fetch failed: ${err.message}`);
      break;
    }

    if (page > 1 && /aria-current="page"[^>]*>\s*1\s*<\/a>/i.test(html)) {
      console.error(`  kielce board: page ${page} wrapped to page 1 — stopping`);
      break;
    }

    const items = parseListPage(html, ORIGIN);
    let newFlats = 0;
    for (const it of items) {
      const key = it.address?.key ?? it.detail_url;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      listings.push({
        kind: it.kind,
        address_raw: it.address_raw,
        address: it.address,
        auction_date: null,
        published_date: it.published_date,
        round: it.round,
        area_m2: it.area_m2,
        starting_price_pln: null,
        detail_url: it.detail_url,
      });
      newFlats++;
    }

    const titleLinkRe = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let rm;
    while ((rm = titleLinkRe.exec(html)) !== null) {
      const title = rm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!isResultNoticeTitle(title)) continue;
      let href = rm[1].replace(/&amp;/gi, '&');
      if (href.startsWith('/')) href = ORIGIN + href;
      if (seenResultUrls.has(href)) continue;
      seenResultUrls.add(href);
      resultRefs.push({ detail_url: href, title });
    }

    console.error(
      `  kielce page ${page}: ${newFlats} new flat(s), ` +
      `${resultRefs.length} result notice(s) seen so far`,
    );

    if (!/<li[^>]*class="[^"]*component-item/.test(html)) {
      console.error(`  kielce: empty page ${page} — stopping`);
      break;
    }
  }

  const resolvedRefs = [];
  for (const ref of resultRefs) {
    const likelyFlat =
      /lokal\s+mieszkaln/i.test(ref.title) ||
      !/nieruchomo[śs]ci\s+gruntow/i.test(ref.title);
    if (!likelyFlat) {
      console.error(
        `  kielce result: skipping non-flat "${ref.title.slice(0, 60)}"`,
      );
      continue;
    }

    let detailHtml;
    try {
      detailHtml = await getText(ref.detail_url);
    } catch (err) {
      console.error(`  kielce result detail fetch failed (${ref.detail_url}): ${err.message}`);
      continue;
    }

    const attUrl = attachmentUrlFromDetail(detailHtml, ORIGIN);
    if (!attUrl) {
      console.error(`  kielce result: no DOCX/PDF attachment on ${ref.detail_url}`);
      continue;
    }

    let text = '';
    try {
      if (/\.pdf(\?|$)/i.test(attUrl)) {
        text = await pdfText(attUrl);
      } else {
        text = await docText(attUrl);
      }
    } catch (err) {
      try {
        text = /\.pdf(\?|$)/i.test(attUrl)
          ? await docText(attUrl)
          : await pdfText(attUrl);
      } catch (err2) {
        console.error(`  kielce result attachment extract failed (${attUrl}): ${err.message}`);
        continue;
      }
    }

    resolvedRefs.push({
      text,
      pdf_url: attUrl,
      auction_date: null,
    });
  }

  console.error(
    `  kielce: ${listings.length} active flat listing(s), ` +
    `${resolvedRefs.length} result DOCX(s) resolved`,
  );
  return { listings, resolvedRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [] };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resolvedRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active flat listing(s)`);
}
