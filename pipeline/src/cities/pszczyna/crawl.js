import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText, isAnnouncementTitle, isResultTitle, isLeaseTitle, extractDetail, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.pszczyna.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const QUERIES = ['sprzedaż lokalu mieszkalnego', 'sprzedaż nieruchomości niezabudowanej'];

const MAX_PAGES_PER_QUERY = Number(process.env.PSZCZYNA_MAX_PAGES) || 8;
const INDEX_BUDGET_MS = Number(process.env.PSZCZYNA_INDEX_BUDGET_MS) || 3 * 60 * 1000;
const ARTICLE_BUDGET_MS = Number(process.env.PSZCZYNA_ARTICLE_BUDGET_MS) || 8 * 60 * 1000;
const MAX_ARTICLES = Number(process.env.PSZCZYNA_MAX_ARTICLES) || 150;

export function searchUrl(phrase, page) {
  const q = encodeURIComponent(phrase).replace(/%20/g, '+');
  return page <= 1 ? `${ORIGIN}/szukaj//${q}` : `${ORIGIN}/szukaj//${q}////${page}`;
}

const ITEM_RE = /document-title[^>]*href="([^"#]+)#cnt">([\s\S]*?)<\/a>/gi;

export function harvestSearchItems(html) {
  const out = [];
  let m;
  ITEM_RE.lastIndex = 0;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const href = m[1].startsWith('http') ? m[1] : `${ORIGIN}${m[1].startsWith('/') ? '' : '/'}${m[1]}`;
    const title = htmlToText(m[2]);
    if (title) out.push({ href, title });
  }
  return out;
}

async function harvestCandidates() {
  const seen = new Set();
  const candidates = [];
  for (const phrase of QUERIES) {
    const start = Date.now();
    for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
      if (Date.now() - start > INDEX_BUDGET_MS) {
        console.error(`  pszczyna: index time budget reached (query "${phrase}", page ${page})`);
        break;
      }
      let html;
      try {
        html = await getText(searchUrl(phrase, page), FETCH_OPTS);
      } catch (err) {
        console.error(`  pszczyna index fetch failed ("${phrase}" p${page}): ${err.message}`);
        break;
      }
      const items = harvestSearchItems(html);
      if (!items.length) break;
      for (const { href, title } of items) {
        if (seen.has(href)) continue;
        seen.add(href);
        if (isLeaseTitle(title)) continue;
        const isRes = isResultTitle(title);
        const isAnn = !isRes && isAnnouncementTitle(title);
        if (!isRes && !isAnn) continue;
        candidates.push({ href, title, role: isRes ? 'result' : 'ann' });
      }
      if (items.length < 10) break;
    }
  }
  return candidates;
}

export function pickAttachment(attachments) {
  return (
    attachments.find((a) => a.format === 'pdf' || /\.pdf$/i.test(a.name)) ||
    attachments.find((a) => /docx?$/i.test(a.format) || /\.docx?$/i.test(a.name)) ||
    null
  );
}

async function resolveAnnouncementBody(detail, href) {
  if (detail.contentText && detail.contentText.replace(/\s+/g, '').length >= 40) {
    return detail.contentText;
  }
  const att = pickAttachment(detail.attachments);
  if (!att) return null;
  try {
    return /\.pdf$/i.test(att.format) || /\.pdf$/i.test(att.name) ? await pdfText(att.url) : await docText(att.url);
  } catch (err) {
    console.error(`  pszczyna attachment extract failed (${att.url}, from ${href}): ${err.message}`);
    return null;
  }
}

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('pszczyna');
  const candidates = await harvestCandidates();
  console.error(`  pszczyna: ${candidates.length} candidate article(s) (announcements + results)`);

  const listings = [];
  const land = [];
  const resultRefs = [];
  const deadline = Date.now() + ARTICLE_BUDGET_MS;
  let processed = 0;
  let skippedKnown = 0;

  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) { skippedKnown++; continue; }
    if (processed >= MAX_ARTICLES || Date.now() > deadline) {
      console.error(
        `  pszczyna: article budget reached (processed ${processed}/${candidates.length - skippedKnown} remaining); remainder backfills next run`,
      );
      break;
    }
    processed++;

    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  pszczyna article fetch failed (${c.href}): ${err.message}`);
      continue;
    }
    if (!/Pszczy/i.test(html)) {
      console.error(`  pszczyna WARN: fetched page doesn't look like Pszczyna content, skipping (${c.href})`);
      continue;
    }

    const detail = extractDetail(html);
    if (!detail) {
      console.error(`  pszczyna WARN: could not locate document body (${c.href})`);
      continue;
    }

    if (c.role === 'result') {
      let bodyForText = detail.contentHtml;
      if (!detail.contentText || detail.contentText.replace(/\s+/g, '').length < 20) {
        const att = pickAttachment(detail.attachments);
        if (att) {
          try {
            bodyForText = /\.pdf$/i.test(att.format) || /\.pdf$/i.test(att.name) ? await pdfText(att.url) : await docText(att.url);
          } catch (err) {
            console.error(`  pszczyna result attachment extract failed (${att.url}, from ${c.href}): ${err.message}`);
          }
        }
      }
      resultRefs.push({
        text: `${detail.title}. ${bodyForText}`,
        pdf_url: c.href,
        detail_url: c.href,
        auction_date: null,
      });
      continue;
    }

    let bodyText;
    try {
      bodyText = await resolveAnnouncementBody(detail, c.href);
    } catch (err) {
      console.error(`  pszczyna announcement body resolve failed (${c.href}): ${err.message}`);
      continue;
    }
    if (!bodyText) {
      console.error(`  pszczyna WARN: empty body + no usable attachment (${c.href})`);
      continue;
    }
    let rec;
    try {
      rec = parseAnnouncement(detail.title, bodyText, c.href);
    } catch (err) {
      console.error(`  pszczyna announcement parse failed (${c.href}): ${err.message}`);
      continue;
    }
    if (!rec) {
      console.error(`  pszczyna WARN: unparsed announcement (${c.href}) (${detail.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  pszczyna: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s) (${skippedKnown} known result(s) skipped)`,
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
        sampleResult: results[0] && { pdf_url: results[0].pdf_url, text: String(results[0].text).slice(0, 200) },
      },
      null,
      2,
    ) + '\n',
  );
}
