// Kołobrzeg crawler.
//
// Dual-board crawler for Gmina Miasto Kołobrzeg (Prezydent Miasta Kołobrzeg):
// Source: bip.um.kolobrzeg.pl (Madkom SIP platform, JSON HTTP API).
//
// Endpoints:
//   GET /api/menu/<menuId>/articles?limit=N&offset=K   -> board articles list
//   GET /api/articles/<id>                             -> article details + attachments
//   GET /api/files/<id>                                -> raw file bytes (.doc / .pdf)
//
// Menus:
//   - Announcements (Sprzedaż):       menu 31009 ("Przetargi - sprzedaż")
//   - Results (Rozstrzygnięcia):       menu 30712 ("Rozstrzygnięcia - sprzedaż")
//   - Pre-auction designations (Wykaz): menu 31012 ("Wykazy - zbycie")

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { todayWarsaw } from '../../core/build-properties.js';
import {
  isFlat,
  isLand,
  isSkippable,
  parseAnnouncement,
  parseWykazItem,
  parseResultDoc,
} from './parse.js';

const ORIGIN = 'https://bip.um.kolobrzeg.pl';
const API = `${ORIGIN}/api`;

const ANNOUNCE_MENU = 31009; // "Przetargi - sprzedaż"
const RESULT_MENU = 30712;   // "Rozstrzygnięcia - sprzedaż"
const WYKAZ_MENU = 31012;    // "Wykazy - zbycie"

const LIST_LIMIT = 100;
const MAX_RESULT_DETAILS = Number(process.env.KOLOBRZEG_MAX_DETAILS) || 100;
const CRAWL_BUDGET_MS = Number(process.env.KOLOBRZEG_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

function listUrl(menuId, offset = 0) {
  const p = new URLSearchParams({ limit: String(LIST_LIMIT), offset: String(offset) });
  return `${API}/menu/${menuId}/articles?${p.toString()}`;
}

const articleUrl = (id) => `${API}/articles/${id}`;
const fileUrl = (id) => `${API}/files/${id}`;
const pageUrl = (link) => `${ORIGIN}/${link}`;

function itemTitle(item) {
  const af = (item.aliasFields || []).find((f) => f.alias === 'title');
  if (af?.value) return af.value.trim();
  const cf = (item.columnFields || []).find((f) => f.fieldId === 22);
  return cf?.value ? cf.value.trim() : '';
}

function itemPublishDate(item) {
  const cf = (item.columnFields || []).find((f) => f.fieldId === 26);
  return cf?.value ? cf.value.trim().slice(0, 10) : null;
}

/** Fetch articles from a BIP menu board */
async function fetchMenuArticles(menuId) {
  const items = [];
  try {
    const raw = await getText(listUrl(menuId, 0), FETCH_OPTS);
    const json = JSON.parse(raw);
    const arts = Array.isArray(json?.articles) ? json.articles : [];
    for (const a of arts) {
      if (a?.id == null) continue;
      items.push({
        id: a.id,
        link: a.link,
        title: itemTitle(a),
        publishDate: itemPublishDate(a),
      });
    }
  } catch (err) {
    console.error(`  kolobrzeg: menu ${menuId} fetch failed: ${err.message}`);
  }
  return items;
}

/** Fetch details and attachments for one article */
async function fetchArticleDetails(articleId) {
  try {
    const raw = await getText(articleUrl(articleId), FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`  kolobrzeg: article ${articleId} fetch failed: ${err.message}`);
    return null;
  }
}

/** Extract text from an attachment: handles .doc/.docx via docText, .pdf via pdfText or ocrPdf */
async function extractAttachmentText(att) {
  const url = fileUrl(att.id);
  const ext = String(att.extension || '').toLowerCase();

  if (ext === 'doc' || ext === 'docx') {
    try {
      return await docText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  kolobrzeg: docText failed for ${url}: ${err.message}`);
      return null;
    }
  }

  if (ext === 'pdf') {
    let text = '';
    try {
      text = await pdfText(url, FETCH_OPTS);
    } catch {
      // Ignore pdftotext error and fall back to OCR
    }

    // Scanned PDFs yield empty or whitespace-only text from pdftotext
    if (!text || text.trim().length < 50) {
      try {
        text = await ocrPdf(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  kolobrzeg: ocrPdf failed for ${url}: ${err.message}`);
        return null;
      }
    }
    return text;
  }

  return null;
}

/**
 * Crawl active announcements board for flat listings, land plots, and pre-auction designations.
 * @returns {Promise<{ listings: Array, wykaz: Array, land: Array, valid_empty: boolean, valid_empty_land: boolean }>}
 */
export async function crawlActive() {
  const listings = [];
  const land = [];
  const wykaz = [];

  // 1. Announcements board
  const announceArticles = await fetchMenuArticles(ANNOUNCE_MENU);
  console.error(`  kolobrzeg: found ${announceArticles.length} announcement articles in menu ${ANNOUNCE_MENU}`);

  for (const art of announceArticles) {
    if (isSkippable(art.title)) continue;

    const details = await fetchArticleDetails(art.id);
    if (!details) continue;

    const atts = Array.isArray(details.attachments) ? details.attachments : [];
    // Filter out RODO attachments
    const relevantAtts = atts.filter(
      (a) => a?.id != null && !/rodo|przetwarzani.*danych/i.test(a.name || '')
    );
    if (!relevantAtts.length) continue;

    // Prefer .doc / .docx (accessible WCAG Word format), otherwise .pdf
    const docAtt = relevantAtts.find((a) => ['doc', 'docx'].includes(String(a.extension || '').toLowerCase()));
    const pdfAtt = relevantAtts.find((a) => String(a.extension || '').toLowerCase() === 'pdf');
    const mainAtt = docAtt || pdfAtt;
    if (!mainAtt) continue;

    const text = await extractAttachmentText(mainAtt);
    if (!text) continue;

    const parsed = parseAnnouncement(text, {
      title: art.title,
      publishDate: art.publishDate,
      detail_url: art.link ? pageUrl(art.link) : fileUrl(mainAtt.id),
      source_url: fileUrl(mainAtt.id),
    });

    for (const rec of parsed) {
      if (rec.kind === 'grunt') {
        land.push(rec);
      } else {
        listings.push(rec);
      }
    }
  }

  // 2. Pre-auction designations (Wykaz) board
  const wykazArticles = await fetchMenuArticles(WYKAZ_MENU);
  console.error(`  kolobrzeg: found ${wykazArticles.length} wykaz articles in menu ${WYKAZ_MENU}`);

  for (const art of wykazArticles) {
    if (!isFlat(art.title) && !/lokal/i.test(art.title)) continue;

    const details = await fetchArticleDetails(art.id);
    if (!details) continue;

    const atts = Array.isArray(details.attachments) ? details.attachments : [];
    const mainAtt =
      atts.find((a) => ['doc', 'docx'].includes(String(a.extension || '').toLowerCase())) ||
      atts.find((a) => String(a.extension || '').toLowerCase() === 'pdf');
    if (!mainAtt) continue;

    const text = await extractAttachmentText(mainAtt);
    if (!text) continue;

    const recs = parseWykazItem(text, {
      title: art.title,
      publishDate: art.publishDate,
      detail_url: art.link ? pageUrl(art.link) : fileUrl(mainAtt.id),
      source_url: fileUrl(mainAtt.id),
    });
    wykaz.push(...recs);
  }

  // Keep genuinely upcoming auctions as active
  const today = todayWarsaw();
  const active = listings.filter((l) => !l.auction_date || l.auction_date >= today);

  const valid_empty = active.length === 0 && wykaz.length === 0 && announceArticles.length > 0;
  const valid_empty_land = land.length === 0 && announceArticles.length > 0;

  console.error(
    `  kolobrzeg crawlActive: ${active.length} active flat listing(s) (of ${listings.length} parsed), ${land.length} land plot(s), ${wykaz.length} wykaz record(s)`,
  );

  return { listings: active, wykaz, land, valid_empty, valid_empty_land };
}

/**
 * Crawl result documents from menu 30712 (Rozstrzygnięcia - sprzedaż) and 31009.
 * @returns {Promise<Array<object>>} Result doc refs for parseResultDoc
 */
export async function crawlResultDocs() {
  const known = await loadKnownSourceUrls('kolobrzeg');
  const resultRefs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let processed = 0;
  let skippedKnown = 0;

  // 1. Annual result articles in menu 30712
  const resultArticles = await fetchMenuArticles(RESULT_MENU);
  console.error(`  kolobrzeg: found ${resultArticles.length} annual result articles in menu ${RESULT_MENU}`);

  for (const art of resultArticles) {
    const details = await fetchArticleDetails(art.id);
    if (!details) continue;

    const atts = (Array.isArray(details.attachments) ? details.attachments : []).filter(
      (a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf',
    );

    for (const att of atts) {
      const url = fileUrl(att.id);
      if (known.has(url)) {
        skippedKnown++;
        continue;
      }

      // Filter for residential notices (or unclassified notices)
      if (!isFlat(att.name) && isLand(att.name)) continue;

      if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) {
        console.error(`  kolobrzeg: result crawl budget reached (${processed} docs processed)`);
        break;
      }
      processed++;

      const text = await extractAttachmentText(att);
      if (!text) continue;

      if (!isFlat(text) && !isFlat(att.name)) continue;

      const blob = `[ATTACHMENT: ${att.name}]\n[ARTICLE: ${art.title}]\n\n${text}`;

      resultRefs.push({
        text: blob,
        pdf_url: url,
        auction_date: art.publishDate,
        detail_url: art.link ? pageUrl(art.link) : url,
      });
    }

    if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) break;
  }

  // 2. Check 31009 for any direct result notice articles
  const announceArticles = await fetchMenuArticles(ANNOUNCE_MENU);
  for (const art of announceArticles) {
    if (!/wynik|rozstrzyg/i.test(art.title)) continue;

    const details = await fetchArticleDetails(art.id);
    if (!details) continue;

    const atts = (Array.isArray(details.attachments) ? details.attachments : []).filter(
      (a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf',
    );

    for (const att of atts) {
      const url = fileUrl(att.id);
      if (known.has(url)) {
        skippedKnown++;
        continue;
      }

      if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) break;
      processed++;

      const text = await extractAttachmentText(att);
      if (!text) continue;

      if (!isFlat(text) && !isFlat(att.name)) continue;

      const blob = `[ATTACHMENT: ${att.name}]\n[ARTICLE: ${art.title}]\n\n${text}`;

      resultRefs.push({
        text: blob,
        pdf_url: url,
        auction_date: art.publishDate,
        detail_url: art.link ? pageUrl(art.link) : url,
      });
    }
  }

  console.error(
    `  kolobrzeg crawlResultDocs: ${resultRefs.length} result doc(s) collected (${skippedKnown} skipped as known)`,
  );

  return resultRefs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  console.log(
    JSON.stringify(
      {
        activeCount: active.listings.length,
        landCount: active.land.length,
        wykazCount: active.wykaz.length,
        resultsCount: results.length,
        sampleActive: active.listings[0],
        sampleResult: results[0]
          ? {
              url: results[0].pdf_url,
              preview: results[0].text.slice(0, 200).replace(/\s+/g, ' '),
              parsed: parseResultDoc(results[0].text, results[0].auction_date, results[0].pdf_url),
            }
          : null,
      },
      null,
      2,
    ),
  );
}
