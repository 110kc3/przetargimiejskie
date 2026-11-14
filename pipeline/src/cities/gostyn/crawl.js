
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import {
  parseArticleList,
  extractTitle,
  extractBodyText,
  extractAttachments,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://biuletyn.gostyn.pl';
const BOARDS = [280, 232];
const MAX_PAGES = 15;
const MIN_PDF_TEXT = 40;

const xmlListUrl = (board, page) => `${ORIGIN}/artykuly/xml/${board}/${page}/1`;

async function attachmentText(att) {
  const ext = (att.ext || '').toLowerCase();
  if (ext.startsWith('doc')) return docText(att.url);
  try {
    const t = await pdfText(att.url);
    if (t && t.replace(/\s/g, '').length >= MIN_PDF_TEXT) return t;
    return await ocrPdf(att.url);
  } catch (err) {
    if (/not a PDF/i.test(err.message)) return docText(att.url);
    throw err;
  }
}

async function articleText(role, atts, bodyText) {
  const wantResult = role === 'result';
  const order = [...atts].sort((a, b) => rank(b, wantResult) - rank(a, wantResult));
  for (const att of order) {
    let t;
    try {
      t = await attachmentText(att);
    } catch (err) {
      console.error(`  gostyn: attachment extract failed ${att.url}: ${err.message}`);
      continue;
    }
    if (!t) continue;
    if (wantResult ? isResultNotice(t) : !isResultNotice(t)) return t;
  }
  if (bodyText && (wantResult ? isResultNotice(bodyText) : /cena\s+wywo[łl]awcz|og[łl]asza/i.test(bodyText))) {
    return bodyText;
  }
  return null;
}

function rank(att, wantResult) {
  const name = (att.name || '').toLowerCase();
  const ext = (att.ext || '').toLowerCase();
  let s = 0;
  if (wantResult) {
    if (/wynik/.test(name)) s += 4;
    if (ext === 'pdf') s += 1;
  } else {
    if (/szczeg[óo][łl]ow|og[łl]oszen|przetarg/.test(name)) s += 2;
    if (ext.startsWith('doc')) s += 3;
    else if (ext === 'pdf') s += 1;
  }
  return s;
}

async function listArticles() {
  const refs = [];
  const seen = new Set();
  for (const board of BOARDS) {
    let pages = 1;
    for (let page = 1; page <= Math.min(pages, MAX_PAGES); page++) {
      let xml;
      try {
        xml = await getText(xmlListUrl(board, page));
      } catch (err) {
        console.error(`  gostyn board ${board} list failed (page ${page}): ${err.message}`);
        break;
      }
      const { pages: total, items } = parseArticleList(xml);
      pages = total;
      for (const it of items) {
        if (!it.url || seen.has(it.url)) continue;
        if (isSkippableTitle(it.title)) continue;
        let role = null;
        if (isResultTitle(it.title)) role = 'result';
        else if (isAnnouncementTitle(it.title)) role = 'ann';
        else continue;
        seen.add(it.url);
        refs.push({ ...it, role, board });
      }
      if (!items.length) break;
    }
  }
  return refs;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const refs = await listArticles();
  console.error(
    `  gostyn: ${refs.length} relevant article(s) ` +
      `(${refs.filter((r) => r.role === 'ann').length} announcement, ${refs.filter((r) => r.role === 'result').length} result)`,
  );

  for (const ref of refs) {
    let html;
    try {
      html = await getText(ref.url);
    } catch (err) {
      console.error(`  gostyn: article fetch failed ${ref.url}: ${err.message}`);
      continue;
    }
    const atts = extractAttachments(html);
    const bodyText = extractBodyText(html);
    const title = extractTitle(html) || ref.title;

    const text = await articleText(ref.role, atts, bodyText);
    if (!text) {
      console.error(`  gostyn: no ${ref.role} text for ${title.slice(0, 60)} (${ref.url})`);
      continue;
    }

    if (ref.role === 'result') {
      const pdf = atts.find((a) => /wynik/i.test(a.name || '')) || atts.find((a) => (a.ext || '') === 'pdf') || atts[0];
      resultRefs.push({ text, pdf_url: pdf ? pdf.url : ref.url, detail_url: ref.url, auction_date: ref.date });
      continue;
    }

    const recs = parseAnnouncement(text);
    if (!recs.length) {
      console.error(`  gostyn WARN: announcement not parsed (${title.slice(0, 60)}, ${ref.url})`);
      continue;
    }
    for (const rec of recs) {
      const enriched = { ...rec, detail_url: ref.url, published_date: ref.date };
      if (rec.kind === 'grunt') land.push(enriched);
      else listings.push(enriched);
    }
  }

  console.error(
    `  gostyn: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleLand: land[0], sampleResultLen: results[0]?.text?.length },
      null,
      2,
    ) + '\n',
  );
}
