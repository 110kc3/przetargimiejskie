
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.um.bydgoszcz.pl';
const BOARD = 1208;
const PER_PAGE = 25;
const MAX_PAGES = 4;

const abs = (p) => (/^https?:/.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url));
  } catch (err) {
    console.error(`  bydgoszcz: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

export function parseIndexPage(html) {
  const out = [];
  const seen = new Set();
  const linkRe = new RegExp(
    `href="(?:https?://[^"/]+)?/artykul/${BOARD}/(\\d+)/([a-z0-9-]+)"[^>]*>([\\s\\S]*?)</a>`,
    'gi',
  );
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({ id, slug: m[2], title });
  }
  return out;
}

export function classifyArticle(title, slug) {
  const t = (title || '').toLowerCase();
  const s = (slug || '').toLowerCase();
  if (/odwo[łl]ani/.test(t) || /odwolani/.test(s)) return 'skip';
  if (/informacja\s+o\s+wyniku/.test(t) || /informacja-o-wyniku/.test(s)) return 'result';
  if (
    /lokal\w*(?:\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+))?\s+przeznaczon\w+\s+do\s+sprzeda[żz]y/.test(t) ||
    /^lokal-(?:(?:mieszkalny|uzytkowy|niemieszkalny)-)?przeznaczony-do-sprzedazy/.test(s)
  ) return 'flat-ann';
  return 'skip';
}

/**
 * A non-empty, completely traversed board with no in-scope announcement title
 * is positive evidence that the flat/commercial stream is genuinely empty.
 * A candidate that later fails to download or parse deliberately prevents this
 * proof, leaving refresh.js's preserve-on-empty guard in charge.
 */
export function isVerifiedEmptyBoard({ boardVerified, boardComplete, activeCandidates }) {
  return boardVerified && boardComplete && activeCandidates === 0;
}

export function docAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"/]+)?\/attachments\/download\/\d+)"[^>]*>\s*([^<]*?)\s*<\/a><\/span>\s*<span class="files\s+textWord">/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = abs(m[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, name: m[2].replace(/\s+/g, ' ').trim() });
  }
  return out;
}

export function pubDateFromHtml(html) {
  const m = /Data\s+(?:opublikowania|wytworzenia):[\s\S]{0,200}?datetime="(\d{4}-\d{2}-\d{2})/i.exec(html || '');
  return m ? m[1] : null;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  const articlesSeen = new Set();
  let boardVerified = false;
  let boardComplete = false;
  let activeCandidates = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${ORIGIN}/artykuly/${BOARD}/${page}/${PER_PAGE}/ogloszenia-o-przetargach-na-zbycie-nieruchomosci`;
    const html = await fetchHtml(url);
    if (!html) break;

    const stubs = parseIndexPage(html);
    if (stubs.length > 0) boardVerified = true;
    const fresh = stubs.filter((s) => !articlesSeen.has(s.id));
    if (fresh.length === 0) {
      boardComplete = true;
      break;
    }

    for (const stub of fresh) {
      articlesSeen.add(stub.id);

      const role = classifyArticle(stub.title, stub.slug);
      if (role === 'skip') continue;
      if (role === 'flat-ann') activeCandidates++;

      const detail_url = abs(`/artykul/${BOARD}/${stub.id}/${stub.slug}`);
      const articleHtml = await fetchHtml(detail_url);
      if (!articleHtml) continue;

      const atts = docAttachments(articleHtml);
      if (atts.length === 0) {
        console.error(`  bydgoszcz: no doc/docx attachment on ${detail_url}`);
        continue;
      }

      let text = null;
      let docUrl = null;
      for (const att of atts) {
        try {
          const candidate = await docText(att.url);
          if (candidate && candidate.trim().length > 50) {
            text = candidate;
            docUrl = att.url;
            break;
          }
        } catch (err) {
          console.error(`  bydgoszcz: doc-text failed ${att.url}: ${err.message}`);
        }
      }
      if (!text) {
        console.error(`  bydgoszcz: empty text from attachment(s) on ${detail_url}`);
        continue;
      }

      if (role === 'result' || isResultNotice(text)) {
        resultRefs.push({ text, pdf_url: docUrl, detail_url, auction_date: pubDateFromHtml(articleHtml) });
        continue;
      }

      const rec = parseAnnouncement(text);
      if (!rec || rec.kind === 'grunt' || !rec.address) {
        console.error(`  bydgoszcz: announcement not parsed (article ${stub.id})`);
        continue;
      }
      listings.push({ ...rec, detail_url, source_url: docUrl });
    }

    if (stubs.length < PER_PAGE) {
      boardComplete = true;
      break;
    }
  }

  console.error(`  bydgoszcz: ${listings.length} flat listing(s), ${resultRefs.length} result notice(s)`);
  const validEmpty = isVerifiedEmptyBoard({ boardVerified, boardComplete, activeCandidates });
  return { listings, resultRefs, validEmpty };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, validEmpty } = await crawlPromise;
  return { listings, wykaz: [], land: [], valid_empty: validEmpty };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
