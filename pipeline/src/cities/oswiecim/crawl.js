// Oświęcim crawler — REKORD SI BIP (bip.oswiecim.um.gov.pl), server-rendered list
// /5987 (Nieruchomości). Each /5987/dokument/<id> is a sale (symbol MK.6840) whose
// text is either inline HTML (older notices) or an attachment PDF (modern ones,
// often SCANNED → OCR). We parse the dokument HTML first; if it yields nothing,
// we extract the attachment PDF text (pdftotext → OCR fallback). Multi-property,
// so one dokument can yield several listings.
//
// Result notices ("Informacja o wyniku przetargu …") live on the SAME board as
// announcements — the crawl collects them in the one pass, OCRs each attachment
// (content-addressed cache makes that one-time), and parse.js parseResultDoc
// extracts the achieved price / outcome. Attachments already present in
// committed data (known source URLs) are skipped without re-fetching.
//
// OCR quality LIVE-VERIFIED 2026-07-07 (tesseract 5.3+pol is excellent);
// pagination depth is capped (active + recent) — raise MAX_PAGES for a deeper
// archive backfill.

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

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const knownUrls = await loadKnownSourceUrls('oswiecim');

  const seen = new Set();
  const ids = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    // REKORD pagination is 1-indexed (strona/0 → 404). The first page is strona/1.
    const url = `${ORIGIN}${BOARD}/strona/${p}`;
    let html;
    try { html = await getText(url); } catch (err) { break; }
    let added = 0;
    // REKORD now emits RELATIVE hrefs ("5987/dokument/123", no leading slash);
    // tolerate both forms with an optional slash so a CMS revert can't re-break it.
    for (const m of html.matchAll(/\/?5987\/dokument\/(\d+)/g)) { if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); added++; } }
    if (added === 0 && p > 0) break;
  }
  console.error(`  oswiecim: ${ids.length} dokument(y) on board ${BOARD}`);

  for (const id of ids) {
    const url = dokUrl(id);
    let html;
    try { html = await getText(url); } catch (err) { continue; }

    // Result notices share the board with announcements — route them to the
    // result stream (parse.js parseResultDoc filters flats / extracts price).
    // Concluded results already in committed data are skipped pre-OCR.
    if (RESULT_RE.test(html)) {
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
      const att = /\/?api\/download\/file\?id=(\d+)/.exec(html); // relative or absolute href
      if (att) {
        const text = await attachmentText(`${ORIGIN}/api/download/file?id=${att[1]}`);
        if (text) recs = parseAnnouncement('', text, url);
      }
    }
    for (const rec of recs) (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  oswiecim: ${listings.length} listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`);
  return { listings, land, resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const { resultRefs } = await crawlPromise;
  return resultRefs;
}
