// Szydłowiec crawler — bip.szydlowiec.pl (SystemDoBIP platform).
//
// Board: https://bip.szydlowiec.pl/44/Komunikaty_i_ogloszenia/
// Mixed board containing announcements, wykazy, and result notices.
// Pages: /44/Komunikaty_i_ogloszenia/{page}/
// Bot User-Agent is required to avoid 403 on bip.szydlowiec.pl.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isResultNotice,
} from './parse.js';

export const ORIGIN = 'https://bip.szydlowiec.pl';
export const BOARD_PATH = '/44/Komunikaty_i_ogloszenia/';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const FETCH_OPTS = { userAgent: BROWSER_UA };

export const MAX_PAGES = Number(process.env.SZYDLOWIEC_MAX_PAGES) || 10;
export const CRAWL_BUDGET_MS = Number(process.env.SZYDLOWIEC_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

export function boardUrl(page = 1) {
  return page <= 1 ? `${ORIGIN}${BOARD_PATH}` : `${ORIGIN}${BOARD_PATH}${page}/`;
}

export function resolveUrl(href) {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&'), ORIGIN).toString();
  } catch {
    return null;
  }
}

export function harvestItemsFromHtml(html) {
  if (!html) return [];
  const out = [];
  const parts = html.split(/<div class="information">/i).slice(1);
  for (const block of parts) {
    const titleM = /<p class="phx ph3">\s*([\s\S]*?)\s*<\/p>/i.exec(block);
    if (!titleM) continue;
    const title = titleM[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');

    let url = null;
    const linkM = /href="([^"]*\/44\/(\d+)\/([^"\/]+)\/(?:rejestr\/)?)"/i.exec(block);
    if (linkM) {
      url = `${ORIGIN}/44/${linkM[2]}/${linkM[3]}/`;
    } else {
      const aM = /<a[^>]+href="([^"]+)"[^>]*>/i.exec(titleM[1]);
      if (aM) url = resolveUrl(aM[1]);
    }

    // Extract inline paragraph text
    const paragraphs = [];
    const pRegex = /<div class="paragraph">([\s\S]*?)<\/div>/gi;
    let pm;
    while ((pm = pRegex.exec(block)) !== null) {
      paragraphs.push(pm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    }
    const inlineText = paragraphs.join('\n');

    // Extract attachments
    const attachments = [];
    const attRegex = /<a[^>]+href="([^"]*pobierz\.php[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = attRegex.exec(block)) !== null) {
      const href = resolveUrl(am[1]);
      const label = am[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
      if (href) {
        attachments.push({ href, label });
      }
    }

    let pdfUrl = null;
    let docUrl = null;
    for (const a of attachments) {
      const l = a.href.toLowerCase();
      if (!docUrl && (l.includes('.doc') || l.includes('.docx'))) {
        docUrl = a.href;
      } else if (!pdfUrl && l.includes('.pdf')) {
        pdfUrl = a.href;
      }
    }

    // Date from metadata if available
    let date_published = null;
    const dateM = /Data (?:wprowadzenia do BIP|wytworzenia informacji): <em>([0-9]{4}-[0-9]{2}-[0-9]{2})/i.exec(block);
    if (dateM) {
      date_published = dateM[1];
    }

    out.push({
      title,
      url: url || ORIGIN,
      inlineText,
      pdfUrl,
      docUrl,
      date_published,
    });
  }
  return out;
}

export function isIrrelevant(title) {
  return /polowa[ńn]|odpad|wybor|referendum|konsultacj|stypend|zebrani|sesj|taryf/i.test(title);
}

export function isPropertySaleNotice(title, text = '') {
  const combined = `${title}\n${text}`;
  return /przetarg.*sprzeda[żz]|og[łl]oszenie.*przetarg|przetarg ustny|sprzeda[żz]\s+lokalu|sprzeda[żz]\s+nieruchomo/i.test(combined);
}

export function isWykazNotice(title, text = '') {
  const combined = `${title}\n${text}`;
  return /wykaz.*nieruchomo|wywieszeni.*wykaz/i.test(combined);
}

export async function extractAttachmentText(docUrl, pdfUrl) {
  if (docUrl) {
    try {
      const text = await docText(docUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch {
      // ignore
    }
  }
  if (pdfUrl) {
    try {
      const text = await pdfText(pdfUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch {
      // ignore
    }
    try {
      const text = await ocrPdf(pdfUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch {
      // ignore
    }
  }
  return '';
}

export async function crawlActive() {
  const started = Date.now();
  const known = await loadKnownSourceUrls('szydlowiec');
  const listings = [];
  const land = [];
  const wykaz = [];

  let page = 1;
  while (page <= MAX_PAGES) {
    if (Date.now() - started > CRAWL_BUDGET_MS) break;

    const url = boardUrl(page);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`szydlowiec: failed to fetch page ${page}: ${err.message}`);
      break;
    }

    const items = harvestItemsFromHtml(html);
    if (items.length === 0) break;

    for (const it of items) {
      if (isIrrelevant(it.title)) continue;
      if (isResultNotice(it.title)) continue;

      if (isWykazNotice(it.title, it.inlineText)) {
        wykaz.push({
          source_url: it.url,
          title: it.title,
          date_published: it.date_published,
        });
        continue;
      }

      if (isPropertySaleNotice(it.title, it.inlineText)) {
        let text = it.inlineText;
        if (it.pdfUrl || it.docUrl) {
          const attText = await extractAttachmentText(it.docUrl, it.pdfUrl);
          if (attText) text = `${text}\n${attText}`;
        }

        const parsed = parseAnnouncement(
          text,
          it.title,
          it.url,
        );

        if (parsed.kind === 'grunt') {
          land.push(parsed);
        } else {
          listings.push(parsed);
        }
      }
    }

    // Check pagination
    if (!html.includes(`/44/Komunikaty_i_ogloszenia/${page + 1}/`)) {
      break;
    }
    page++;
  }

  return {
    listings,
    wykaz,
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlResultDocs() {
  const started = Date.now();
  const results = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    if (Date.now() - started > CRAWL_BUDGET_MS) break;

    const url = boardUrl(page);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch {
      break;
    }

    const items = harvestItemsFromHtml(html);
    if (items.length === 0) break;

    for (const it of items) {
      if (!isResultNotice(it.title)) continue;

      let text = it.inlineText;
      if (it.pdfUrl || it.docUrl) {
        const attText = await extractAttachmentText(it.docUrl, it.pdfUrl);
        if (attText) text = `${text}\n${attText}`;
      }

      results.push({
        source_url: it.url,
        title: it.title,
        text,
        date: it.date_published,
      });
    }

    if (!html.includes(`/44/Komunikaty_i_ogloszenia/${page + 1}/`)) {
      break;
    }
    page++;
  }

  return results;
}
