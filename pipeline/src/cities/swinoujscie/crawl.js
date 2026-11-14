import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import {
  isSkippableTitle,
  isAnnouncementTitle,
  parseArticle,
  startingPriceFromDoc,
} from './parse.js';

const ORIGIN = 'https://bip.um.swinoujscie.pl';

const BOARDS = [
  { id: 1717, slug: 'przetargi-na-sprzedaz-nieruchomosci' },
  { id: 1718, slug: 'archiwum' },
];

const boardUrl = (board, page, per = 25) =>
  `${ORIGIN}/artykuly/${board.id}/${page}/${per}/${board.slug}`;


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseArticleList(html, boardId) {
  const out = [];
  const re = new RegExp(
    `<h2[^>]*>\\s*<a[^>]+href="(?:https?://[^"/]+)?(/artykul/${boardId}/(\\d+)/[^"]*)"[^>]*>([\\s\\S]*?)</a>\\s*</h2>(?:\\s*<(?:p|div)[^>]*>([\\s\\S]*?)</(?:p|div)>)?`,
    'gi',
  );
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    const id = m[2];
    const title = stripTags(m[3]);
    const blurb = stripTags(m[4] || '');
    const detail_url = `${ORIGIN}${path}`;
    out.push({ id, title, blurb, detail_url, board: boardId });
  }
  return out;
}

async function listBoard(board) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= 20; page++) {
    const url = boardUrl(board, page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  swinoujscie board ${board.id} page ${page} fetch failed: ${err.message}`);
      break;
    }
    const arts = parseArticleList(html, board.id);
    if (arts.length === 0) break;
    let added = 0;
    for (const a of arts) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      refs.push(a);
      added++;
    }
    console.error(`  swinoujscie board ${board.id} page ${page}: ${arts.length} articles (${added} new)`);
    if (arts.length < 25) break;
  }
  return refs;
}


export function docAttachmentUrl(html) {
  if (!html) return null;
  const re = /href="(https:\/\/bip\.um\.swinoujscie\.pl\/attachments\/download\/\d+)"[\s\S]{0,600}?<span[^>]*>[^<]*\bdoc\b/gi;
  const m = re.exec(html);
  return m ? m[1] : null;
}


async function fetchDocUrl(detailUrl) {
  let html;
  try {
    html = await getText(detailUrl);
  } catch (err) {
    console.error(`  swinoujscie: detail fetch failed (${detailUrl}): ${err.message}`);
    return null;
  }
  return docAttachmentUrl(html);
}


async function crawlAll() {
  const listings = [];

  for (const board of BOARDS) {
    const refs = await listBoard(board);
    const relevant = refs.filter((r) => {
      if (isSkippableTitle(r.title, '')) return false;
      if (!isAnnouncementTitle(r.title, '')) return false;
      return true;
    });
    console.error(
      `  swinoujscie board ${board.id}: ${refs.length} total, ${relevant.length} relevant`,
    );

    for (const ref of relevant) {
      const rec = parseArticle(ref);
      if (!rec) {
        console.error(`  swinoujscie WARN: could not parse article ${ref.id} "${ref.title.slice(0, 60)}"`);
        continue;
      }
      if (rec.kind === 'grunt') {
        console.error(`  swinoujscie: skipping land article ${ref.id} "${ref.title.slice(0, 60)}"`);
        continue;
      }

      listings.push({ ...rec, source_url: ref.detail_url });
    }
  }

  let enriched = 0;
  for (const listing of listings) {
    if (listing.starting_price_pln != null) continue;
    const docUrl = await fetchDocUrl(listing.detail_url);
    if (!docUrl) continue;
    try {
      const text = await docText(docUrl);
      const price = startingPriceFromDoc(text);
      if (price != null) {
        listing.starting_price_pln = price;
        listing.doc_url = docUrl;
        enriched++;
      }
    } catch (err) {
      console.error(`  swinoujscie: DOC price enrich failed (${docUrl}): ${err.message}`);
    }
  }

  console.error(
    `  swinoujscie: ${listings.length} listing(s) total, ${enriched} price(s) enriched from DOC`,
  );
  return { listings };
}

let crawlPromise = null;

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, sample: listings[0] }, null, 2) + '\n',
  );
}
