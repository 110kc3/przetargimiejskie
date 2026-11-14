
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncement,
  isResultNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'https://bip.tarnowskiegory.pl';
const BOARDS = [
  { id: 5217, isLandBoard: false },
  { id: 5216, isLandBoard: true },
];
const PAGE = 500;

const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const listApi = (menuId, offset) =>
  `${ORIGIN}/api/menu/${menuId}/articles?limit=${PAGE}&offset=${offset}&archived=true`;
const articleApi = (id) => `${ORIGIN}/api/articles/${id}`;
const fileUrl = (attId) => `${ORIGIN}/e,pobierz,get.html?id=${attId}`;

function listItemTitle(a) {
  const f = (a?.aliasFields || []).find((x) => x.alias === 'title');
  return (f?.value || '').trim();
}

function listItemPubDate(a) {
  for (const c of a?.columnFields || []) {
    const v = (c?.value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  }
  return null;
}

export function selectArticles(json) {
  const arts = Array.isArray(json?.articles) ? json.articles : [];
  const out = [];
  const seen = new Set();
  for (const a of arts) {
    const id = a?.id;
    if (!id || seen.has(id)) continue;
    const title = listItemTitle(a);
    const slug = a?.link || '';
    if (isSkippableTitle(title, slug)) continue;
    let role = null;
    if (isResultTitle(title, slug)) role = 'result';
    else if (isAnnouncementTitle(title, slug)) role = 'ann';
    else continue;
    seen.add(id);
    out.push({ id, title, published_date: listItemPubDate(a), role });
  }
  return out;
}

async function listBoard(board) {
  const refs = [];
  let offset = 0;
  for (;;) {
    let json;
    try {
      json = JSON.parse(await getText(listApi(board.id, offset)));
    } catch (err) {
      console.error(`  tarnowskie-gory board ${board.id} list failed (offset ${offset}): ${err.message}`);
      break;
    }
    const selected = selectArticles(json);
    for (const s of selected) refs.push({ ...s, board: board.id, isLandBoard: board.isLandBoard });
    const total = Number(json?.total) || 0;
    const returned = Array.isArray(json?.articles) ? json.articles.length : 0;
    offset += PAGE;
    if (returned === 0 || returned < PAGE || offset >= total) break;
  }
  return refs;
}

async function articleAssets(id) {
  let json;
  try {
    json = JSON.parse(await getText(articleApi(id)));
  } catch (err) {
    console.error(`  tarnowskie-gory article ${id} fetch failed: ${err.message}`);
    return null;
  }
  const att = (json?.attachments || []).find(
    (x) => !x?.deleted && String(x?.extension || '').toLowerCase() === 'pdf',
  );
  if (!att) return null;
  const pdfUrl = att.id != null ? fileUrl(att.id) : `${ORIGIN}/${String(att.link).replace(/^\/+/, '')}`;
  const detailUrl = json?.link
    ? `${ORIGIN}/${String(json.link).replace(/^\/+/, '')}`
    : `${ORIGIN}/api/articles/${id}`;
  return { pdfUrl, detailUrl };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  for (const board of BOARDS) {
    const refs = await listBoard(board);
    const anns = refs.filter((r) => r.role === 'ann').length;
    const results = refs.filter((r) => r.role === 'result').length;
    console.error(
      `  tarnowskie-gory board ${board.id}: ${refs.length} relevant article(s) (${anns} announcement, ${results} result)`,
    );

    for (const ref of refs) {
      const assets = await articleAssets(ref.id);
      if (!assets) {
        console.error(`  tarnowskie-gory: no PDF attachment on article ${ref.id} (${ref.title.slice(0, 60)})`);
        continue;
      }
      const { pdfUrl, detailUrl } = assets;
      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  tarnowskie-gory: PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }

      if (isResultNotice(text)) {
        resultRefs.push({ text, pdf_url: pdfUrl, detail_url: detailUrl, auction_date: null, isLandBoard: ref.isLandBoard });
        continue;
      }

      const rec = parseAnnouncement(text, { board: ref.id, isLandBoard: ref.isLandBoard });
      if (!rec) {
        console.error(`  tarnowskie-gory WARN: announcement not parsed (article ${ref.id}, ${ref.title.slice(0, 60)})`);
        continue;
      }
      if (!rec.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
        rec.auction_date = ref.published_date;
        rec.auction_date_estimated = true;
      }
      if (rec.kind === 'grunt') {
        land.push({ ...rec, detail_url: detailUrl, source_url: pdfUrl });
      } else {
        listings.push({ ...rec, detail_url: detailUrl, source_url: pdfUrl });
      }
    }
  }

  console.error(
    `  tarnowskie-gory: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
