// Zakopane crawler — bip.zakopane.eu (ESC S.A. / VelaBIP).
// Server-rendered HTML listing + detail pages with attachments (PDF / Word DOC).
//
// Sources crawled:
//   1. "Inne przetargi": https://bip.zakopane.eu/lista/inne-przetargi (cat 171)
//   2. "Wydział Mienia": https://bip.zakopane.eu/lista/wydzial-mienia-i-nadzoru-wlascicielskiego-1 (cat 304)
//   3. Site search: https://bip.zakopane.eu/szukaj//przetarg
//
// Each candidate is title/lead-routed (announcement / result / lease-skip / movable-skip).
// Operative notice texts live in born-digital attachments (PDF or DOC), extracted
// via pdfText() or docText().

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  htmlToText,
  isAnnouncement,
  isResult,
  isLease,
  isMovable,
  extractDetail,
  pickAttachment,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://bip.zakopane.eu';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_PAGES_INNE = Number(process.env.ZAKOPANE_MAX_PAGES_INNE) || 8;
const MAX_PAGES_DEPT = Number(process.env.ZAKOPANE_MAX_PAGES_DEPT) || 4;
const MAX_PAGES_SEARCH = Number(process.env.ZAKOPANE_MAX_PAGES_SEARCH) || 6;

const INDEX_BUDGET_MS = Number(process.env.ZAKOPANE_INDEX_BUDGET_MS) || 2 * 60 * 1000;
const ARTICLE_BUDGET_MS = Number(process.env.ZAKOPANE_ARTICLE_BUDGET_MS) || 8 * 60 * 1000;
const MAX_ARTICLES = Number(process.env.ZAKOPANE_MAX_ARTICLES) || 120;

const ITEM_RE =
  /document-title[^>]*href="([^"#]+)#cnt">([\s\S]*?)<\/a>(?:[\s\S]*?<section class="lead">[\s\S]*?<p>([\s\S]*?)<\/p>)?/gi;

export function harvestItemsFromHtml(html) {
  const out = [];
  let m;
  ITEM_RE.lastIndex = 0;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const rawHref = m[1].trim();
    const href = rawHref.startsWith('http')
      ? rawHref
      : `${ORIGIN}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
    const title = htmlToText(m[2]);
    const lead = m[3] ? htmlToText(m[3]) : '';
    if (title) out.push({ href, title, lead });
  }
  return out;
}

export async function harvestCandidates() {
  const seen = new Set();
  const candidates = [];
  const start = Date.now();

  async function crawlSourcePages(urlFn, maxPages, label) {
    for (let page = 1; page <= maxPages; page++) {
      if (Date.now() - start > INDEX_BUDGET_MS) {
        console.error(`  zakopane: index harvest budget reached during ${label} (page ${page})`);
        break;
      }
      let html;
      const url = urlFn(page);
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  zakopane: fetch failed for ${url}: ${err.message}`);
        break;
      }
      const items = harvestItemsFromHtml(html);
      if (!items.length) break;

      for (const item of items) {
        if (seen.has(item.href)) continue;
        seen.add(item.href);

        if (isLease(item.title, item.lead) || isMovable(item.title, item.lead)) continue;
        const isRes = isResult(item.title, item.lead);
        const isAnn = !isRes && isAnnouncement(item.title, item.lead);
        if (!isRes && !isAnn) continue;

        candidates.push({
          href: item.href,
          title: item.title,
          lead: item.lead,
          role: isRes ? 'result' : 'ann',
        });
      }
      if (items.length < 10) break; // Last page
    }
  }

  // 1. Inne przetargi (category 171)
  await crawlSourcePages(
    (p) => (p <= 1 ? `${ORIGIN}/lista/inne-przetargi` : `${ORIGIN}/lista/inne-przetargi/${p}`),
    MAX_PAGES_INNE,
    'inne-przetargi',
  );

  // 2. Wydział Mienia (category 304)
  await crawlSourcePages(
    (p) =>
      p <= 1
        ? `${ORIGIN}/lista/wydzial-mienia-i-nadzoru-wlascicielskiego-1`
        : `${ORIGIN}/lista/wydzial-mienia-i-nadzoru-wlascicielskiego-1/${p}`,
    MAX_PAGES_DEPT,
    'wydzial-mienia',
  );

  // 3. Search query: przetarg
  await crawlSourcePages(
    (p) => (p <= 1 ? `${ORIGIN}/szukaj//przetarg` : `${ORIGIN}/szukaj//przetarg////${p}`),
    MAX_PAGES_SEARCH,
    'szukaj-przetarg',
  );

  return candidates;
}

async function resolveBodyText(detail, href) {
  if (detail.contentText && detail.contentText.replace(/\s+/g, '').length >= 100) {
    return `${detail.title}. ${detail.lead}. ${detail.contentText}`;
  }
  const att = pickAttachment(detail.attachments);
  if (!att) {
    return `${detail.title}. ${detail.lead}. ${detail.contentText || ''}`;
  }
  try {
    const isDoc = /docx?$/i.test(att.format) || /\.docx?$/i.test(att.name);
    const text = isDoc ? await docText(att.url) : await pdfText(att.url);
    return `${detail.title}. ${detail.lead}.\n${text}`;
  } catch (err) {
    console.error(`  zakopane attachment extract failed (${att.url}, from ${href}): ${err.message}`);
    return `${detail.title}. ${detail.lead}. ${detail.contentText || ''}`;
  }
}

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('zakopane');
  const candidates = await harvestCandidates();
  console.error(`  zakopane: ${candidates.length} candidate article(s) (announcements + results)`);

  const listings = [];
  const land = [];
  const resultRefs = [];
  const deadline = Date.now() + ARTICLE_BUDGET_MS;
  let processed = 0;
  let skippedKnown = 0;

  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) {
      skippedKnown++;
      continue;
    }
    if (processed >= MAX_ARTICLES || Date.now() > deadline) {
      console.error(
        `  zakopane: article budget reached (processed ${processed}/${candidates.length - skippedKnown} remaining)`,
      );
      break;
    }
    processed++;

    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  zakopane article fetch failed (${c.href}): ${err.message}`);
      continue;
    }

    if (!/Zakopan/i.test(html)) {
      continue;
    }

    const detail = extractDetail(html);
    if (!detail) {
      continue;
    }

    const att = pickAttachment(detail.attachments);
    const bodyText = await resolveBodyText(detail, c.href);

    if (c.role === 'result') {
      resultRefs.push({
        text: bodyText,
        pdf_url: att ? att.url : c.href,
        detail_url: c.href,
        auction_date: null,
      });
      continue;
    }

    // Announcement
    try {
      const rec = parseAnnouncement(detail.title, bodyText, c.href);
      if (rec) {
        (rec.kind === 'grunt' ? land : listings).push(rec);
      }
    } catch (err) {
      console.error(`  zakopane announcement parse failed (${c.href}): ${err.message}`);
    }
  }

  console.error(
    `  zakopane: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s) (${skippedKnown} known result(s) skipped)`,
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
  return {
    listings,
    wykaz: [],
    land,
    valid_empty: false,
    valid_empty_land: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0] && {
          pdf_url: results[0].pdf_url,
          text: String(results[0].text).slice(0, 200),
        },
      },
      null,
      2,
    ) + '\n',
  );
}
