
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  normalizeText,
  flatKindFromText,
  parseAnnouncement,
  publishedDateFromDetail,
  attachmentPdfUrlFromDetail,
} from './parse.js';

const ORIGIN = 'https://bip.umkonskie.pl';
const BOARD = '5027';

const MAX_PAGES_ACTIVE = 8;
const MAX_PAGES_RESULTS = 20;

export function boardPageUrl(page) {
  return `${ORIGIN}/wiadomosci/${BOARD}/lista/${page}/nieruchomosci`;
}


const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a><\/p>/g;

export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&').trim();
    const title = m[2].trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}


export function isAnnouncementTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  if (!/og[łl]oszenie/.test(t)) return false;
  if (!/przetarg/.test(t)) return false;
  if (/wynik|informacj/.test(t)) return false;
  if (/odwo[łl]a|uniewa[żz]ni/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/dzier[żz]aw|najem|u[żz]yczeni/.test(t)) return false;
  return true;
}

export function isResultTitle(title) {
  if (!title) return false;
  return /informacj\w*\s+o\s+wynik/i.test(title);
}


async function walkBoard(maxPages) {
  const entries = [];
  const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    let html;
    try {
      html = await getText(boardPageUrl(page));
    } catch (err) {
      console.error(`  konskie: board page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseListPage(html);
    if (items.length === 0) break;
    let added = 0;
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      entries.push(item);
      added++;
    }
    console.error(`  konskie: board page ${page}: ${items.length} entries (${added} new)`);
  }
  return entries;
}

async function fetchAttachmentText(entryUrl) {
  let detailHtml = '';
  try {
    detailHtml = await getText(entryUrl);
  } catch (err) {
    console.error(`  konskie: detail fetch failed (${entryUrl}): ${err.message}`);
    return null;
  }
  const publishedDate = publishedDateFromDetail(detailHtml);
  const pdfUrl = attachmentPdfUrlFromDetail(detailHtml);
  if (!pdfUrl) {
    console.error(`  konskie: no PDF attachment on ${entryUrl}`);
    return null;
  }
  let text = '';
  try {
    text = await pdfText(pdfUrl);
  } catch (err) {
    console.error(`  konskie: pdf-text failed (${pdfUrl}): ${err.message}`);
    return null;
  }
  return { text, pdfUrl, publishedDate };
}


export async function crawlActive() {
  const entries = await walkBoard(MAX_PAGES_ACTIVE);
  const candidates = entries.filter((e) => isAnnouncementTitle(e.title));
  console.error(
    `  konskie: crawlActive — ${entries.length} board entries (${MAX_PAGES_ACTIVE} pages), ${candidates.length} announcement candidate(s)`,
  );

  const listings = [];
  let discardedNonFlat = 0;
  for (const entry of candidates) {
    const fetched = await fetchAttachmentText(entry.url);
    if (!fetched) continue;
    if (flatKindFromText(normalizeText(fetched.text)) !== 'mieszkalny') {
      discardedNonFlat++;
      continue;
    }
    const rec = parseAnnouncement(fetched.text, {
      detailUrl: entry.url,
      publishedDate: fetched.publishedDate,
    });
    if (!rec) {
      console.error(`  konskie: announcement did not parse (address?) — ${entry.url}`);
      continue;
    }
    listings.push(rec);
  }
  console.error(
    `  konskie: crawlActive — ${listings.length} flat listing(s), ${discardedNonFlat} non-flat discarded`,
  );
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const entries = await walkBoard(MAX_PAGES_RESULTS);
  const candidates = entries.filter((e) => isResultTitle(e.title));
  console.error(
    `  konskie: crawlResultDocs — ${entries.length} board entries (${MAX_PAGES_RESULTS} pages), ${candidates.length} result candidate(s)`,
  );

  const refs = [];
  let discardedNonFlat = 0;
  for (const entry of candidates) {
    const fetched = await fetchAttachmentText(entry.url);
    if (!fetched) continue;
    if (flatKindFromText(normalizeText(fetched.text)) !== 'mieszkalny') {
      discardedNonFlat++;
      continue;
    }
    refs.push({
      text: fetched.text,
      pdf_url: fetched.pdfUrl,
      detail_url: entry.url,
      auction_date: fetched.publishedDate,
    });
  }
  console.error(
    `  konskie: crawlResultDocs — ${refs.length} flat result ref(s), ${discardedNonFlat} non-flat discarded`,
  );
  return refs;
}
