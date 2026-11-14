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
const BOARD_MENU_ID = 107;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const BOARD_PAGE_LIMIT = 150;
const MAX_BOARD_PAGES = 4;
const MIN_YEAR = Number(process.env.SOPOT_MIN_YEAR) || 2018;
const MAX_ANNOUNCEMENTS = Number(process.env.SOPOT_MAX_ANNOUNCEMENTS) || 30;
const MAX_RESULT_STANDALONE = Number(process.env.SOPOT_MAX_RESULTS) || 20;
const CRAWL_BUDGET_MS = Number(process.env.SOPOT_CRAWL_BUDGET_MS) || 8 * 60 * 1000;

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
    if (!kind) continue;
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
