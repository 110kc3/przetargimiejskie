// Nidzica crawler — bip.nidzica.pl (SystemDoBIP / E-LINE platform).
//
// Surfaces:
//   - Structured tender module (primary): https://bip.nidzica.pl/przetargi/257/status/
//       * Current/active (Ogłoszone):     .../przetargi/257/status/0/
//       * Concluded (Rozstrzygnięte):     .../przetargi/257/status/1/
//       * Cancelled (Unieważnione):       .../przetargi/257/status/2/
//   - Dated article board:                https://bip.nidzica.pl/258/Ogloszenia_o_przetargach/
//       * Archive:                        https://bip.nidzica.pl/258/1/archiwum/Ogloszenia_o_przetargach/
//   - Wykaz / notices board:              https://bip.nidzica.pl/259/Informacje_i_komunikaty/
//
// Bot User-Agent:
//   bip.nidzica.pl requires a standard browser User-Agent in HTTP headers.

import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isLease,
  isResultNotice,
} from './parse.js';

export const ORIGIN = 'https://bip.nidzica.pl';
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const FETCH_OPTS = { userAgent: BROWSER_UA };

export const MODULE_BASE = `${ORIGIN}/przetargi/257`;
export const BOARD_258_URL = `${ORIGIN}/258/Ogloszenia_o_przetargach/`;
export const BOARD_259_URL = `${ORIGIN}/259/Informacje_i_komunikaty/`;

export const MAX_RESULT_PAGES = Number(process.env.NIDZICA_MAX_PAGES) || 5;
export const MAX_RESULT_DOCS = Number(process.env.NIDZICA_MAX_RESULT_DOCS) || 200;
export const FETCH_DELAY_MS = Number(process.env.NIDZICA_FETCH_DELAY_MS) || 1000;
export const CRAWL_BUDGET_MS = Number(process.env.NIDZICA_CRAWL_BUDGET_MS) || 8 * 60 * 1000;

// ── URL & HTML helpers ───────────────────────────────────────────────────────

export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deamp(u) {
  return (u || '').replace(/&amp;/g, '&');
}

export function resolveUrl(href) {
  try {
    return new URL(deamp(href), ORIGIN).toString();
  } catch {
    return null;
  }
}

export function moduleStatusUrl(status, page = 1) {
  return page <= 1
    ? `${MODULE_BASE}/status/${status}/`
    : `${MODULE_BASE}/${page}/status/${status}/`;
}

/**
 * Extract tender table rows from structured module HTML (/przetargi/257/status/...).
 * @param {string} html
 * @returns {Array<object>}
 */
export function parseTenderRows(html) {
  if (!html) return [];
  const rows = [];
  const rowMatches = html.matchAll(/<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/gi);

  for (const m of rowMatches) {
    const rHtml = m[1];

    const titleM = /<td class="td-title-1"><div>Dotyczy<\/div><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/td>/i.exec(
      rHtml,
    );
    if (!titleM) continue;

    const detailUrl = resolveUrl(titleM[1]);
    const title = stripTags(titleM[2]);

    const dateM = /<td class="td-date-2"><div>Data i godzina przetargu<\/div>([\s\S]*?)<\/td>/i.exec(rHtml);
    const dateRaw = dateM ? stripTags(dateM[1]) : '';
    const auctionDate = dateRaw.match(/^\d{4}-\d{2}-\d{2}/) ? dateRaw.slice(0, 10) : null;

    const priceM = /<td class="td-title-2"><div>Cena wywoławcza<\/div>([\s\S]*?)<\/td>/i.exec(rHtml);
    const priceRaw = priceM ? stripTags(priceM[1]) : '';

    const wynikM = /<td class="td-title-1"><div>Wynik<\/div>([\s\S]*?)<\/td>/i.exec(rHtml);
    const wynikRaw = wynikM ? stripTags(wynikM[1]) : '';

    const attachments = parseAttachments(rHtml);

    rows.push({
      detailUrl,
      title,
      auctionDate,
      priceRaw,
      wynikRaw,
      attachments,
    });
  }

  return rows;
}

/**
 * Extract articles from a standard SystemDoBIP article listing (/258/ or /259/).
 * @param {string} html
 * @returns {Array<{url:string, title:string}>}
 */
export function parseInformationList(html) {
  if (!html) return [];
  const out = [];
  const regex = /<div class="information">\s*<p class="phx ph3">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    const title = stripTags(m[2]);
    if (url && title) {
      out.push({ url, title });
    }
  }
  return out;
}

/**
 * Extract attachments from HTML fragment or detail page.
 * @param {string} html
 * @returns {Array<{url:string, filename:string}>}
 */
export function parseAttachments(html) {
  if (!html) return [];
  const out = [];
  const re = /href="((?:https:\/\/bip\.nidzica\.pl)?\/system\/pobierz\.php\?plik=([^"&]+)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const fullUrl = resolveUrl(m[1]);
    let filename = m[2];
    try {
      filename = decodeURIComponent(filename);
    } catch {
      /* keep raw */
    }
    if (fullUrl && !out.some((a) => a.url === fullUrl)) {
      out.push({ url: fullUrl, filename });
    }
  }
  return out;
}

/**
 * Fetch a page with error handling.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchPage(url) {
  try {
    return await getText(url, FETCH_OPTS);
  } catch (err) {
    console.error(`  nidzica: fetchPage failed (${url}): ${err.message}`);
    return null;
  }
}

/**
 * Extract text from document attachment with fallbacks.
 * @param {string} docUrl
 * @param {string} [pdfUrl]
 * @param {string} [inlineHtml]
 * @returns {Promise<string>}
 */
export async function extractDocumentText(docUrl, pdfUrl = null, inlineHtml = '') {
  if (docUrl) {
    try {
      const text = await docText(docUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch (err) {
      console.error(`  nidzica: docText failed (${docUrl}): ${err.message}`);
    }
  }

  if (pdfUrl) {
    try {
      const text = await pdfText(pdfUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch (err) {
      console.error(`  nidzica: pdfText failed (${pdfUrl}): ${err.message}`);
    }

    try {
      const text = await ocrPdf(pdfUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch (err) {
      console.error(`  nidzica: ocrPdf fallback failed (${pdfUrl}): ${err.message}`);
    }
  }

  if (inlineHtml) {
    return stripTags(inlineHtml);
  }

  return '';
}

// ── Shared crawl pass ────────────────────────────────────────────────────────

let crawlPromise = null;

async function crawlAll() {
  const startTime = Date.now();
  const deadline = startTime + CRAWL_BUDGET_MS;
  const known = await loadKnownSourceUrls('nidzica', { includeLand: true });

  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];
  const seenUrls = new Set();

  let activeBoardReached = false;
  let skippedKnown = 0;

  // 1. Walk active structured tenders (/przetargi/257/status/0/)
  const status0Url = moduleStatusUrl(0);
  const status0Html = await fetchPage(status0Url);

  if (status0Html) {
    activeBoardReached = true;
    const activeRows = parseTenderRows(status0Html);

    for (const row of activeRows) {
      if (isLease(row.title)) continue;

      let primaryDoc = null;
      for (const a of row.attachments) {
        if (/\.(docx?|pdf)$/i.test(a.filename)) {
          primaryDoc = a.url;
          break;
        }
      }

      let text = '';
      if (primaryDoc) {
        await sleep(FETCH_DELAY_MS);
        text = await extractDocumentText(primaryDoc);
      }

      if (!text || text.trim().length < 30) {
        text = `${row.title}\nCena wywoławcza: ${row.priceRaw}`;
      }

      const recs = parseAnnouncement(text, {
        detailUrl: row.detailUrl,
        sourceUrl: primaryDoc || row.detailUrl,
        fallbackAuctionDate: row.auctionDate,
      });

      for (const rec of recs) {
        (rec.kind === 'grunt' ? land : listings).push(rec);
      }
    }
  }

  // 2. Check active article board (/258/Ogloszenia_o_przetargach/)
  const board258Html = await fetchPage(BOARD_258_URL);
  if (board258Html) {
    activeBoardReached = true;
    const items = parseInformationList(board258Html);

    for (const item of items) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      if (isLease(item.title)) continue;

      await sleep(FETCH_DELAY_MS);
      const detailHtml = await fetchPage(item.url);
      if (!detailHtml) continue;

      const attachments = parseAttachments(detailHtml);
      const doc = attachments.find((a) => /\.(docx?|pdf)$/i.test(a.filename));
      const docUrl = doc ? doc.url : null;

      let text = '';
      if (docUrl) {
        await sleep(FETCH_DELAY_MS);
        text = await extractDocumentText(docUrl, null, detailHtml);
      } else {
        text = stripTags(detailHtml);
      }

      const recs = parseAnnouncement(text, {
        detailUrl: item.url,
        sourceUrl: docUrl || item.url,
      });

      for (const rec of recs) {
        (rec.kind === 'grunt' ? land : listings).push(rec);
      }
    }
  }

  // 3. Walk active wykaz board (/259/Informacje_i_komunikaty/)
  const wykazHtml = await fetchPage(BOARD_259_URL);
  if (wykazHtml) {
    const wykazItems = parseInformationList(wykazHtml);

    for (const item of wykazItems) {
      if (isLease(item.title)) continue;
      if (!/wykaz\s+nieruchomo/i.test(item.title)) continue;

      await sleep(FETCH_DELAY_MS);
      const detailHtml = await fetchPage(item.url);
      if (!detailHtml) continue;

      const attachments = parseAttachments(detailHtml);
      const doc = attachments[0];

      wykaz.push({
        title: item.title,
        url: item.url,
        doc_url: doc ? doc.url : item.url,
      });
    }
  }

  // 4. Walk concluded tenders (/przetargi/257/{page}/status/1/)
  for (let page = 1; page <= MAX_RESULT_PAGES; page++) {
    if (Date.now() > deadline || resultRefs.length >= MAX_RESULT_DOCS) {
      console.error('  nidzica: crawl budget reached or max results reached');
      break;
    }

    const pageUrl = moduleStatusUrl(1, page);
    await sleep(FETCH_DELAY_MS);
    const pageHtml = await fetchPage(pageUrl);
    if (!pageHtml) break;

    const rows = parseTenderRows(pageHtml);
    if (rows.length === 0) break;

    for (const row of rows) {
      if (Date.now() > deadline || resultRefs.length >= MAX_RESULT_DOCS) break;
      if (isLease(row.title)) continue;

      // Find dedicated result doc if present, else announcement doc
      let wynikDoc = null;
      let annDoc = null;

      for (const a of row.attachments) {
        const fn = a.filename.toLowerCase();
        if (/wynik|inf/i.test(fn) && /\.(docx?|pdf)$/i.test(fn)) {
          wynikDoc = a.url;
          break;
        } else if (!annDoc && /\.(docx?|pdf)$/i.test(fn)) {
          annDoc = a.url;
        }
      }

      const primaryDoc = wynikDoc || annDoc || row.detailUrl;

      if (known.has(primaryDoc) || known.has(row.detailUrl)) {
        skippedKnown++;
        continue;
      }

      if (seenUrls.has(primaryDoc)) continue;
      seenUrls.add(primaryDoc);

      let text = '';
      if (wynikDoc) {
        await sleep(FETCH_DELAY_MS);
        text = await extractDocumentText(wynikDoc);
      } else if (annDoc) {
        await sleep(FETCH_DELAY_MS);
        text = await extractDocumentText(annDoc);
        if (text && text.trim().length > 30) {
          text += `\n\nWynik przetargu: ${row.wynikRaw}\n`;
        }
      }

      if (!text || text.trim().length < 30) {
        text = `${row.title}\nData przetargu: ${row.auctionDate}\nCena wywoławcza: ${row.priceRaw}\nWynik przetargu: ${row.wynikRaw}`;
      }

      resultRefs.push({
        text,
        pdf_url: primaryDoc,
        detail_url: row.detailUrl,
        auction_date: row.auctionDate,
      });
    }
  }

  const valid_empty = activeBoardReached && listings.length === 0;
  const valid_empty_land = activeBoardReached && land.length === 0;

  if (skippedKnown > 0) {
    console.error(`  nidzica: skipped ${skippedKnown} already-known result URL(s)`);
  }
  console.error(
    `  nidzica: ${listings.length} flat listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz, ${resultRefs.length} result doc(s)`,
  );

  return { listings, wykaz, land, resultRefs, valid_empty, valid_empty_land };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

// ── CLI harness ──────────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  console.log(
    JSON.stringify(
      {
        listings: active.listings.length,
        land: active.land.length,
        wykaz: active.wykaz.length,
        results: results.length,
        valid_empty: active.valid_empty,
        valid_empty_land: active.valid_empty_land,
        sampleLand: active.land[0] || null,
        sampleResult: results[0] ? { ...results[0], text: `[${results[0].text.length} chars]` } : null,
      },
      null,
      2,
    ),
  );
}
