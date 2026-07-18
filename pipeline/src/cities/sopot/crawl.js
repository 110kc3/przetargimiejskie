// Sopot crawler — bip.sopot.pl's JSON API (see config.js for the "no
// rendering needed" finding). One memoised crawl over the "Przetargi" board
// (menu id 107, both the archived=0 "current" list and the DISTINCT
// archived=1 older archive) serves both streams: qualifying announcement
// articles feed crawlActive() (and, once concluded, also surface a "wynik"
// attachment that feeds crawlResultDocs()); pre-~2020 articles instead
// publish a SEPARATE "Informacja dotycząca rozstrzygnięcia ..." result
// article, harvested independently.
//
// Politeness / bounding: the board itself is cheap (2–8 JSON fetches cover
// the whole ~400-item board via a large page size). The per-article stage
// (1 fetch for the article JSON + 0–3 attachment fetches) is the expensive
// part, so candidates are (a) title-filtered to only address-keyed SALE
// kinds (flat/commercial/garage — land is out of scope, see config.js), (b)
// bounded to items published >= MIN_YEAR (the pipeline's own
// PIPELINE_MIN_HISTORY_YEAR floor in refresh.js already drops dateless-free
// result records older than 2020, so backfilling further back wastes
// fetches), and (c) capped by MAX_ANNOUNCEMENTS / MAX_RESULT_STANDALONE +a
// wall-clock budget. A prior build agent got a different host rate-limited
// at ~150 requests — this adapter's first run stays well under that.

import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  htmlToText,
  isOutOfScopeTitle,
  isCancelledTitle,
  titleInScopeKind,
  isSaleAnnouncementTitle,
  isResultStandaloneTitle,
  isAnnouncementText,
  isResultText,
  buildAnnouncementRecord,
} from './parse.js';

const ORIGIN = 'https://bip.sopot.pl';
const BOARD_MENU_ID = 107; // "Przetargi"
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const BOARD_PAGE_LIMIT = 150; // one page comfortably covers the whole current (~116) or archive (~282) list
const MAX_BOARD_PAGES = 4; // safety cap in case the archive grows a lot
const MIN_YEAR = Number(process.env.SOPOT_MIN_YEAR) || 2018;
const MAX_ANNOUNCEMENTS = Number(process.env.SOPOT_MAX_ANNOUNCEMENTS) || 30;
const MAX_RESULT_STANDALONE = Number(process.env.SOPOT_MAX_RESULTS) || 20;
const CRAWL_BUDGET_MS = Number(process.env.SOPOT_CRAWL_BUDGET_MS) || 8 * 60 * 1000;

// Attachments whose NAME marks them as non-text (floor plans / photos) —
// never carry price/date prose, so skip the fetch entirely.
const SKIP_ATTACHMENT_NAME_RE = /rzut|zdj[ęe]c|fotograf|mapa\b|wypis|wyrys/i;

function attachmentUrl(id) {
  return `${ORIGIN}/e,pobierz,get.html?id=${id}`;
}

function articleUrl(article, fallbackId) {
  const link = article?.link || article?.actualLink;
  return link ? `${ORIGIN}/${link}` : `${ORIGIN}/a,${fallbackId}.html`;
}

async function fetchBoardPage(archived, offset) {
  const url = `${ORIGIN}/api/menu/${BOARD_MENU_ID}/articles?limit=${BOARD_PAGE_LIMIT}&offset=${offset}&archived=${archived}`;
  const json = JSON.parse(await getText(url, FETCH_OPTS));
  const items = (json.articles || []).map((a) => ({
    id: String(a.id),
    title: a.columnFields?.find((c) => c.fieldId === 22)?.value || '',
    published: a.columnFields?.find((c) => c.fieldId === 26)?.value || null,
  }));
  return { items, total: Number(json.total) || 0 };
}

/** Harvest every board item across BOTH archived flags (archived=1 is a
 *  distinct older archive, not a superset — see config.js), deduped by id. */
async function harvestBoard() {
  const byId = new Map();
  for (const archived of [0, 1]) {
    let offset = 0;
    for (let page = 0; page < MAX_BOARD_PAGES; page++) {
      let res;
      try {
        res = await fetchBoardPage(archived, offset);
      } catch (err) {
        console.error(`  sopot: board fetch failed (archived=${archived}, offset=${offset}): ${err.message}`);
        break;
      }
      for (const it of res.items) if (!byId.has(it.id)) byId.set(it.id, it);
      offset += BOARD_PAGE_LIMIT;
      if (offset >= res.total) break;
    }
  }
  return [...byId.values()];
}

async function fetchArticle(id) {
  const json = JSON.parse(await getText(`${ORIGIN}/api/articles/${id}`, FETCH_OPTS));
  return json;
}

// A pdftotext extraction this short cannot be a real announcement/result body
// (the real ones run hundreds of words) — it's the classic scanned-PDF tell
// (pdftotext on an image-only PDF returns a 1–3 byte form-feed stub; see
// pdf-text-cache/ — several Sopot attachments are scans, e.g. ul. Gen.
// Władysława Sikorskiego 9 lokal 3A's announcement). Route those to OCR.
const MIN_PLAUSIBLE_PDF_TEXT_LEN = 40;

async function extractAttachmentText(att) {
  if (SKIP_ATTACHMENT_NAME_RE.test(att.name || '')) return null;
  const ext = (att.extension || '').toLowerCase();
  const url = attachmentUrl(att.id);
  try {
    if (ext === 'doc' || ext === 'docx') return await docText(url, FETCH_OPTS);
    if (ext === 'pdf') {
      const text = await pdfText(url, FETCH_OPTS);
      if (text && text.trim().length >= MIN_PLAUSIBLE_PDF_TEXT_LEN) return text;
      const ocr = await ocrPdf(url, FETCH_OPTS);
      return ocr || text || null;
    }
  } catch (err) {
    console.error(`  sopot: attachment extract failed (${url}, "${att.name}"): ${err.message}`);
  }
  return null;
}

/**
 * Resolve BOTH text roles for one announcement article: the inline `content`
 * HTML (the pre-~2020 "all in one" shape) and every relevant (non-image,
 * non-floorplan) attachment (the modern doc-attachment shape, where a
 * concluded article carries an announcement .doc AND a "wynik" .doc side by
 * side). Stops fetching once both roles are resolved.
 * @returns {Promise<{announcementText: string|null, resultText: string|null}>}
 */
async function resolveArticleTexts(article) {
  let announcementText = null;
  let resultText = null;

  const inline = htmlToText(article.content || '');
  if (inline.length > 200) {
    if (isResultText(inline)) resultText = inline;
    else if (isAnnouncementText(inline)) announcementText = inline;
  }

  for (const att of article.attachments || []) {
    if (announcementText && resultText) break;
    const text = await extractAttachmentText(att);
    if (!text) continue;
    if (!resultText && isResultText(text)) {
      resultText = text;
      continue;
    }
    if (!announcementText && isAnnouncementText(text)) {
      announcementText = text;
    }
  }
  return { announcementText, resultText };
}

let crawlPromise = null;

async function crawlAll() {
  const board = await harvestBoard();
  console.error(`  sopot: ${board.length} board item(s) harvested (archived=0 + archived=1)`);

  const announcementCandidates = [];
  const resultCandidates = [];
  for (const it of board) {
    const year = Number((it.published || '').slice(0, 4));
    if (Number.isFinite(year) && year < MIN_YEAR) continue;
    if (isOutOfScopeTitle(it.title) || isCancelledTitle(it.title)) continue;
    const kind = titleInScopeKind(it.title);
    if (!kind) continue; // land / other out-of-scope kind for this build
    if (isResultStandaloneTitle(it.title)) resultCandidates.push(it);
    else if (isSaleAnnouncementTitle(it.title)) announcementCandidates.push(it);
  }
  announcementCandidates.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  resultCandidates.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  const announcements = announcementCandidates.slice(0, MAX_ANNOUNCEMENTS);
  const results = resultCandidates.slice(0, MAX_RESULT_STANDALONE);
  console.error(
    `  sopot: ${announcements.length}/${announcementCandidates.length} announcement candidate(s), ` +
      `${results.length}/${resultCandidates.length} standalone-result candidate(s) selected (published >= ${MIN_YEAR})`,
  );

  const listings = [];
  const resultRefs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let fetchCount = 0;

  for (const cand of announcements) {
    if (Date.now() > deadline) {
      console.error('  sopot: crawl budget exhausted — stopping announcement pass early');
      break;
    }
    let article;
    try {
      article = await fetchArticle(cand.id);
      fetchCount++;
    } catch (err) {
      console.error(`  sopot: article fetch failed (${cand.id}): ${err.message}`);
      continue;
    }
    const url = articleUrl(article, cand.id);
    const { announcementText, resultText } = await resolveArticleTexts(article);
    if (announcementText) {
      const rec = buildAnnouncementRecord(cand.title, announcementText, url);
      if (rec) listings.push(rec);
      else console.error(`  sopot: WARN unkeyable announcement (${cand.id}) "${cand.title.slice(0, 70)}"`);
    } else {
      console.error(`  sopot: WARN no announcement text (${cand.id}) "${cand.title.slice(0, 70)}"`);
    }
    if (resultText) {
      resultRefs.push({ text: resultText, pdf_url: url, detail_url: url, auction_date: null });
    }
  }

  for (const cand of results) {
    if (Date.now() > deadline) {
      console.error('  sopot: crawl budget exhausted — stopping standalone-result pass early');
      break;
    }
    let article;
    try {
      article = await fetchArticle(cand.id);
      fetchCount++;
    } catch (err) {
      console.error(`  sopot: article fetch failed (${cand.id}): ${err.message}`);
      continue;
    }
    const url = articleUrl(article, cand.id);
    const inline = htmlToText(article.content || '');
    let text = inline.length > 100 ? inline : null;
    if (!text) {
      for (const att of article.attachments || []) {
        const t = await extractAttachmentText(att);
        if (t) {
          text = t;
          break;
        }
      }
    }
    if (!text) {
      console.error(`  sopot: WARN no text for standalone result (${cand.id}) "${cand.title.slice(0, 70)}"`);
      continue;
    }
    resultRefs.push({ text, pdf_url: url, detail_url: url, auction_date: null });
  }

  console.error(
    `  sopot: ${listings.length} listing(s), ${resultRefs.length} result ref(s) (${fetchCount} article fetches)`,
  );
  return { listings, resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}
