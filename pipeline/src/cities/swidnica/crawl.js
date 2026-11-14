import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  htmlToText,
  isOutOfScopeTitle,
  isCancelledTitle,
  titleInScopeKind,
  isSaleTitle,
  isResultText,
  buildAnnouncementRecord,
} from './parse.js';

const ORIGIN = 'https://bip.swidnica.nv.pl';
const BOARD_MENU_ID = 11962;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const BOARD_PAGE_LIMIT = 150;
const MAX_BOARD_PAGES = 4;
const MIN_YEAR = Number(process.env.SWIDNICA_MIN_YEAR) || 2020;
const MAX_ITEMS = Number(process.env.SWIDNICA_MAX_ITEMS) || 35;
const CRAWL_BUDGET_MS = Number(process.env.SWIDNICA_CRAWL_BUDGET_MS) || 5 * 60 * 1000;

function articleUrl(article, fallbackId) {
  const link = article?.link || article?.actualLink;
  return link ? `${ORIGIN}/${link}` : `${ORIGIN}/a,${fallbackId}.html`;
}

async function fetchBoardPage(archived, offset) {
  const url = `${ORIGIN}/api/menu/${BOARD_MENU_ID}/articles?limit=${BOARD_PAGE_LIMIT}&offset=${offset}&archived=${archived}`;
  const json = JSON.parse(await getText(url, FETCH_OPTS));
  const items = (json.articles || []).map((a) => ({
    id: String(a.id),
    title: a.columnFields?.find((c) => c.fieldId === 42)?.value || '',
    published: a.columnFields?.find((c) => c.fieldId === 46)?.value || null,
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
        console.error(`  swidnica: board fetch failed (archived=${archived}, offset=${offset}): ${err.message}`);
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

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('swidnica');
  const board = await harvestBoard();
  console.error(`  swidnica: ${board.length} board item(s) harvested (archived=0 + archived=1)`);

  const candidates = board.filter((it) => {
    const year = Number((it.published || '').slice(0, 4));
    if (Number.isFinite(year) && year < MIN_YEAR) return false;
    if (isOutOfScopeTitle(it.title) || isCancelledTitle(it.title)) return false;
    if (!titleInScopeKind(it.title)) return false;
    return isSaleTitle(it.title);
  });
  candidates.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  const selected = candidates.slice(0, MAX_ITEMS);
  console.error(
    `  swidnica: ${selected.length}/${candidates.length} in-scope candidate(s) selected (published >= ${MIN_YEAR})`,
  );

  const listings = [];
  const resultRefs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let fetchCount = 0;

  for (const cand of selected) {
    if (Date.now() > deadline) {
      console.error('  swidnica: crawl budget exhausted — stopping early');
      break;
    }
    let article;
    try {
      article = await fetchArticle(cand.id);
      fetchCount++;
    } catch (err) {
      console.error(`  swidnica: article fetch failed (${cand.id}): ${err.message}`);
      continue;
    }
    const url = articleUrl(article, cand.id);
    const text = htmlToText(article.content || '');
    if (text.length < 100) {
      console.error(`  swidnica: WARN empty/short content (${cand.id}) "${cand.title.slice(0, 70)}"`);
      continue;
    }
    if (isResultText(text)) {
      if (known.has(url)) continue;
      resultRefs.push({ text, pdf_url: url, detail_url: url, auction_date: null });
    } else if (/cena\s+wywo[łl]awcz/i.test(text)) {
      const rec = buildAnnouncementRecord(cand.title, text, url);
      if (rec) listings.push(rec);
      else console.error(`  swidnica: WARN unkeyable announcement (${cand.id}) "${cand.title.slice(0, 70)}"`);
    } else {
      console.error(`  swidnica: WARN unclassifiable content (${cand.id}) "${cand.title.slice(0, 70)}"`);
    }
  }

  console.error(
    `  swidnica: ${listings.length} listing(s), ${resultRefs.length} result ref(s) (${fetchCount} article fetches)`,
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
