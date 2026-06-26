// Oświęcim crawler — REKORD SI BIP (bip.oswiecim.um.gov.pl), server-rendered list
// /5987 (Nieruchomości). Each /5987/dokument/<id> is a sale (symbol MK.6840) whose
// text is either inline HTML (older notices) or an attachment PDF (modern ones,
// often SCANNED → OCR). We parse the dokument HTML first; if it yields nothing,
// we extract the attachment PDF text (pdftotext → OCR fallback). Multi-property,
// so one dokument can yield several listings.
//
// NEEDS-LIVE-VERIFY: the OCR output quality of the scanned PDFs is the gate (see
// config.js) — confirm on the first run. Pagination depth is capped (active +
// recent); raise MAX_PAGES for a deeper archive once confirmed. Result notices
// (scanned) are not yet ingested.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
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

async function crawlAll() {
  const listings = [];
  const land = [];

  const seen = new Set();
  const ids = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const url = `${ORIGIN}${BOARD}/strona/${p}`;
    let html;
    try { html = await getText(url); } catch (err) { break; }
    let added = 0;
    for (const m of html.matchAll(/\/5987\/dokument\/(\d+)/g)) { if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); added++; } }
    if (added === 0 && p > 0) break;
  }
  console.error(`  oswiecim: ${ids.length} dokument(y) on board ${BOARD}`);

  for (const id of ids) {
    const url = dokUrl(id);
    let html;
    try { html = await getText(url); } catch (err) { continue; }
    if (SKIP_RE.test(html) || !SALE_RE.test(html)) continue;

    let recs = parseAnnouncement('', html, url);
    if (recs.length === 0) {
      const att = /\/api\/download\/file\?id=(\d+)/.exec(html);
      if (att) {
        const text = await attachmentText(`${ORIGIN}/api/download/file?id=${att[1]}`);
        if (text) recs = parseAnnouncement('', text, url);
      }
    }
    for (const rec of recs) (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  oswiecim: ${listings.length} listing(s), ${land.length} land plot(s)`);
  return { listings, land };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}
