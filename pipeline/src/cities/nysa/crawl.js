import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isSkippableTitle,
  isFlatSaleTitle,
  isResultNotice,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://bip.nysa.pl';
const BOARDS = [
  { cat: 280, label: 'active' },
  { cat: 318, label: 'archive' },
];

const boardUrl = (cat) => `${ORIGIN}/?c=${cat}`;
const articleUrl = (id) => `${ORIGIN}/?a=${id}`;
const docUrl = (docId, artId) =>
  `${ORIGIN}/?p=document&action=show&id=${docId}&bar_id=${artId}`;

export function parseArticleList(html) {
  const out = [];
  const seen = new Set();
  const re = /href="\?a=(\d+)"[^>]*class="blue"[^>]*>([^<]+)</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const title = m[2].trim();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title });
  }
  return out;
}

export function parsePdfAttachments(html, artId) {
  const out = [];
  const rowRe =
    /<td[^>]*attachmentTableColumn1[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*attachmentTableColumn3[^>]*>[\s\S]*?action=show&(?:amp;)?id=(\d+)&(?:amp;)?bar_id=(\d+)/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const label = m[1].replace(/\s*\(\d+[^)]*\)\s*$/, '').trim();
    const docId = m[2];
    const barId = m[3];
    if (barId !== artId) continue;
    out.push({ docId, label });
  }
  return out;
}

export function classifyAttachmentLabel(label) {
  const l = label || '';
  if (/informacja\s+o\s+wyniku/i.test(l)) return 'result';
  if (/og[łl]oszenie/i.test(l)) return 'announcement';
  return 'skip';
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  const seenArticles = new Set();

  for (const board of BOARDS) {
    let html;
    try {
      html = await getText(boardUrl(board.cat));
    } catch (err) {
      console.error(`  nysa board c=${board.cat} fetch failed: ${err.message}`);
      continue;
    }

    const articles = parseArticleList(html);
    const flatArticles = articles.filter((a) => {
      if (isSkippableTitle(a.title)) return false;
      return isFlatSaleTitle(a.title);
    });

    console.error(
      `  nysa board c=${board.cat} (${board.label}): ${articles.length} articles, ${flatArticles.length} flat candidates`,
    );

    for (const art of flatArticles) {
      if (seenArticles.has(art.id)) continue;
      seenArticles.add(art.id);

      let artHtml;
      try {
        artHtml = await getText(articleUrl(art.id));
      } catch (err) {
        console.error(`  nysa article ?a=${art.id} fetch failed: ${err.message}`);
        continue;
      }

      const attachments = parsePdfAttachments(artHtml, art.id);
      if (attachments.length === 0) {
        console.error(`  nysa: no PDF attachments on article ?a=${art.id} (${art.title.slice(0, 60)})`);
        continue;
      }

      for (const att of attachments) {
        const role = classifyAttachmentLabel(att.label);
        if (role === 'skip') continue;

        const pdfUrl = docUrl(att.docId, art.id);
        let text;
        try {
          text = await pdfText(pdfUrl);
        } catch (err) {
          console.error(`  nysa: PDF extract failed ${pdfUrl}: ${err.message}`);
          continue;
        }

        if (isResultNotice(text)) {
          resultRefs.push({
            text,
            pdf_url: pdfUrl,
            detail_url: articleUrl(art.id),
            auction_date: null,
          });
          continue;
        }

        if (role === 'announcement') {
          const rec = parseAnnouncement(text);
          if (!rec) {
            console.error(
              `  nysa WARN: announcement not parsed (article ?a=${art.id}, ${art.title.slice(0, 60)})`,
            );
            continue;
          }
          listings.push({
            ...rec,
            detail_url: articleUrl(art.id),
            source_url: pdfUrl,
          });
        }
      }
    }
  }

  console.error(
    `  nysa: ${listings.length} flat listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
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
