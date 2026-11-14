
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.oswiecim.um.gov.pl';
const BOARD = '/5987';
const MAX_PAGES = 8;
const SALE_RE = /MK\.6840|na\s+sprzeda[zż][\s\S]{0,200}?przetarg|przetarg[\s\S]{0,200}?na\s+sprzeda[zż]/i;
const SKIP_RE = /MK\.6845|dzier[żz]aw|\bnajem\b|wykaz/i;

const dokUrl = (id) => `${ORIGIN}${BOARD}/dokument/${id}`;

async function attachmentText(url) {
  try { const t = await pdfText(url); if (t.replace(/\s+/g, '').length >= 120) return t; } catch { /* not a text PDF */ }
  try { return await ocrPdf(url); } catch { return ''; }
}

let crawlPromise = null;

const RESULT_RE = /informacj\w*\s+o\s+wynik\w*\s+przetargu/i;

export function isResidentialAuctionHtml(html) {
  const isResult = RESULT_RE.test(html || '');
  return (
    /lokal\w*\s+mieszkaln/i.test(html || '') &&
    (isResult || (!SKIP_RE.test(html || '') && SALE_RE.test(html || '')))
  );
}

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const knownUrls = await loadKnownSourceUrls('oswiecim');
  let fetchedDocuments = 0;
  let inScopeCandidates = 0;

  const seen = new Set();
  const ids = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    const url = `${ORIGIN}${BOARD}/strona/${p}`;
    let html;
    try { html = await getText(url); } catch (err) { break; }
    let added = 0;
    for (const m of html.matchAll(/\/?5987\/dokument\/(\d+)/g)) { if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); added++; } }
    if (added === 0 && p > 0) break;
  }
  console.error(`  oswiecim: ${ids.length} dokument(y) on board ${BOARD}`);

  for (const id of ids) {
    const url = dokUrl(id);
    let html;
    try { html = await getText(url); } catch (err) { continue; }
    fetchedDocuments++;
    const isResult = RESULT_RE.test(html);
    if (isResidentialAuctionHtml(html)) {
      inScopeCandidates++;
    }

    if (isResult) {
      const att = /\/?api\/download\/file\?id=(\d+)/.exec(html);
      if (!att) continue;
      const attUrl = `${ORIGIN}/api/download/file?id=${att[1]}`;
      if (knownUrls.has(attUrl)) continue;
      const text = await attachmentText(attUrl);
      if (text) resultRefs.push({ text, auction_date: null, pdf_url: attUrl });
      continue;
    }

    if (SKIP_RE.test(html) || !SALE_RE.test(html)) continue;

    let recs = parseAnnouncement('', html, url);
    if (recs.length === 0) {
      const att = /\/?api\/download\/file\?id=(\d+)/.exec(html);
      if (att) {
        const text = await attachmentText(`${ORIGIN}/api/download/file?id=${att[1]}`);
        if (text) recs = parseAnnouncement('', text, url);
      }
    }
    for (const rec of recs) (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  oswiecim: ${listings.length} listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`);
  const validEmpty = fetchedDocuments > 0 && inScopeCandidates === 0;
  return { listings, land, resultRefs, validEmpty };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, validEmpty } = await crawlPromise;
  return { listings, wykaz: [], land, valid_empty: validEmpty };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const { resultRefs } = await crawlPromise;
  return resultRefs;
}
