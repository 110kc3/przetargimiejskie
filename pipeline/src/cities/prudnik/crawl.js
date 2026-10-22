// Prudnik crawler — bip.prudnik.pl, Joomla BIP (server-rendered HTML).
//
// Target board:
//   GET /gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali(?start=N)
//   Articles: /gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali/<id>-<slug>
//   Attachments: /images/.../*.pdf (born-digital text-extractable PDFs)
//
// One memoised pass serves both streams:
//   - crawlActive()     → { listings, wykaz: [], land: [] } — active and past flat auctions.
//   - crawlResultDocs() → result refs ({ text, pdf_url, detail_url, auction_date }) —
//     the achieved-price stream; source:'html' means each ref carries `.text`.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isSkippableTitle,
  isResultNotice,
  parseAnnouncement,
  resultDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.prudnik.pl';
const BOARD_BASE =
  `${ORIGIN}/gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali`;

const absUrl = (p) =>
  /^https?:/i.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`;

/**
 * Extract articles from board HTML table.
 * Pattern: <a href="(/gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali/(\d+-[^"]+))">
 * @param {string} html
 * @returns {Array<{id: string, slug: string, href: string, title: string}>}
 */
export function parseArticleList(html) {
  const out = [];
  const seen = new Set();
  const re =
    /<a\s+href="(\/gospodarka-przestrzenna\/przetargi-na-zbycie-nieruchomosci-i-lokali\/(\d+-[^"]+))">\s*([\s\S]*?)\s*<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const href = m[1];
    const slug = m[2];
    const title = m[3].replace(/\s+/g, ' ').trim();
    const id = slug.split('-')[0];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, slug, href, title });
  }
  return out;
}

/**
 * Extract PDF attachment links from an article's HTML body.
 * @param {string} html
 * @returns {Array<{url: string, label: string}>}
 */
export function parsePdfAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /<a\s+[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const rawHref = m[1].replace(/&amp;/gi, '&');
    const url = absUrl(rawHref);
    const label = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, label });
  }
  return out;
}

/**
 * Classify attachment role based on URL and label.
 * @param {string} url
 * @param {string} label
 * @returns {'result'|'announcement'|'skip'|'unknown'}
 */
export function classifyAttachment(url, label = '') {
  const combined = `${url} ${label}`;
  if (
    /rzuty|grafika|mapa|lista.*osob|odwolani|sprostowani|ogloszenie-o-odwolaniu/i.test(
      combined,
    )
  ) {
    return 'skip';
  }
  if (/informacja.*wynik|wynik.*przetarg/i.test(combined)) {
    return 'result';
  }
  if (/ogloszenie/i.test(combined)) {
    return 'announcement';
  }
  return 'unknown';
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  const seenArticles = new Set();

  const PAGE_STEP = 10;
  const MAX_PAGES = 15;

  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * PAGE_STEP;
    const pageUrl = start === 0 ? BOARD_BASE : `${BOARD_BASE}?start=${start}`;

    let html = '';
    try {
      html = await getText(pageUrl);
    } catch (err) {
      console.error(
        `  prudnik board fetch failed at start=${start}: ${err.message}`,
      );
      break;
    }

    const articles = parseArticleList(html);
    if (articles.length === 0) break;

    const candidates = articles.filter((a) => !isSkippableTitle(a.title));

    for (const art of candidates) {
      if (seenArticles.has(art.id)) continue;
      seenArticles.add(art.id);

      const detailUrl = absUrl(art.href);
      let artHtml = '';
      try {
        artHtml = await getText(detailUrl);
      } catch (err) {
        console.error(
          `  prudnik article ${art.id} fetch failed: ${err.message}`,
        );
        continue;
      }

      const attachments = parsePdfAttachments(artHtml);
      if (attachments.length === 0) continue;

      for (const att of attachments) {
        const role = classifyAttachment(att.url, att.label);
        if (role === 'skip') continue;

        let text = '';
        try {
          text = await pdfText(att.url);
        } catch (err) {
          // 404s and invalid PDFs are safely caught
          console.error(
            `  prudnik: PDF extract failed ${att.url}: ${err.message}`,
          );
          continue;
        }

        if (!text) continue;

        if (isResultNotice(text)) {
          const auction_date = resultDateFromText(text);
          resultRefs.push({
            text,
            pdf_url: att.url,
            detail_url: detailUrl,
            auction_date,
          });
          continue;
        }

        const flatListings = parseAnnouncement(text, detailUrl, att.url);
        if (flatListings.length > 0) {
          listings.push(...flatListings);
        }
      }
    }

    // Stop when there is no next page link or fewer articles than page step
    if (!/title="Nast[eę]pny"/i.test(html) || articles.length < PAGE_STEP) {
      break;
    }
  }

  console.error(
    `  prudnik: ${listings.length} flat listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, resultRefs };
}

/** Result notices (achieved prices) found on the board. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** Active + historical flat auctions. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return {
    listings,
    wykaz: [],
    land: [],
    valid_empty: false,
    valid_empty_land: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        results: results.length,
        sampleListing: listings[0],
        sampleResult: results[0] && {
          ...results[0],
          text: results[0].text.slice(0, 160) + '…',
        },
      },
      null,
      2,
    ) + '\n',
  );
}
