import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  stripHtml,
  parseAnnouncement,
  parseWykaz,
  isLease,
  isExchange,
  isBezprzetargowo,
  isSaleAuction,
  hasScheduledDate,
  isResultDoc,
  isWykazNotice,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.pisz.hi.pl';
const ANNOUNCE_K = 84;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_YEAR_BOARDS = 1;
const MAX_DETAIL_FETCHES = 260;

const boardUrl = (k) => `${ORIGIN}/index.php?k=${k}`;
const docUrl = (id) => `${ORIGIN}/index.php?wiad=${id}`;

const PL_MONTH_ABBR = {
  sty: 1, lut: 2, mar: 3, kwi: 4, maj: 5, cze: 6, lip: 7, sie: 8, wrz: 9,
  'paź': 10, paz: 10, lis: 11, gru: 12,
};

export function boardDateToIso(raw) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(raw || '');
  if (!m) return null;
  const mo = PL_MONTH_ABBR[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

export function parseBoardPage(html) {
  const out = [];
  const chunks = String(html || '').split('<article id="zajawka-').slice(1);
  for (const chunk of chunks) {
    const idM = /^(\d+)/.exec(chunk);
    if (!idM) continue;
    const id = idM[1];
    const titleM = /zajawka__tytul">([\s\S]*?)<\/h2>/.exec(chunk);
    const subM = /zajawka__podtytul">([\s\S]*?)<\/div>/.exec(chunk);
    const dateM = /zajawka__data">([\s\S]*?)<\/div>/.exec(chunk);
    out.push({
      id,
      title: titleM ? stripHtml(titleM[1]) : '',
      podtytul: subM ? stripHtml(subM[1]) : '',
      dateRaw: dateM ? stripHtml(dateM[1]) : '',
      url: docUrl(id),
    });
  }
  return out;
}

export function discoverYearBoards(html) {
  const out = [];
  const re = /<a href="index\.php\?k=(\d+)" class="list-group-item">Rok\s+([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const label = m[2].trim();
    const yearNum = parseInt(label, 10);
    out.push({ k: m[1], label, year: Number.isFinite(yearNum) ? yearNum : 0 });
  }
  return out;
}

export function extractDetail(html) {
  const src = String(html || '');
  const titleM = /wiadomosc-tytul">([\s\S]*?)<\/h2>/.exec(src);
  const subM = /class="podtytul">([\s\S]*?)<\/div>/.exec(src);
  let body = '';
  const i = src.indexOf('class="tresc">');
  if (i >= 0) {
    const j = src.indexOf('</div>', i);
    if (j > i) body = src.slice(i + 'class="tresc">'.length, j);
  }
  return {
    title: titleM ? stripHtml(titleM[1]) : '',
    podtytul: subM ? stripHtml(subM[1]) : '',
    body: stripHtml(body),
  };
}

function boardHintsSkip(item) {
  const t = `${item.title} ${item.podtytul}`;
  return /dzier[żz]aw|u[żz]yczeni|w\s+drodze\s+zamiany/i.test(t);
}

async function fetchBoardHtml(k) {
  try {
    return await getText(boardUrl(k), FETCH_OPTS);
  } catch (err) {
    console.error(`  pisz: board k=${k} fetch failed: ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];

  const currentHtml = await fetchBoardHtml(ANNOUNCE_K);
  const boards = [{ k: ANNOUNCE_K, html: currentHtml }];
  const yearBoards = discoverYearBoards(currentHtml)
    .sort((a, b) => b.year - a.year)
    .slice(0, MAX_YEAR_BOARDS);
  for (const yb of yearBoards) {
    boards.push({ k: yb.k, html: await fetchBoardHtml(yb.k) });
  }

  const seenIds = new Set();
  let fetched = 0;
  for (const board of boards) {
    if (!board.html) continue;
    for (const item of parseBoardPage(board.html)) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      if (boardHintsSkip(item)) continue;
      if (fetched >= MAX_DETAIL_FETCHES) continue;
      fetched++;

      let detailHtml;
      try {
        detailHtml = await getText(item.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  pisz: detail ${item.id} fetch failed: ${err.message}`);
        continue;
      }
      const text = buildRecordText(extractDetail(detailHtml));
      const publishedDate = boardDateToIso(item.dateRaw);

      if (isLease(text) || isExchange(text) || isBezprzetargowo(text)) continue;

      if (isResultDoc(text)) {
        resultRefs.push({
          text,
          source_url: item.url,
          auction_date: auctionDateFromText(text) || publishedDate || null,
        });
        continue;
      }
      if (isSaleAuction(text) && hasScheduledDate(text)) {
        const parsed = parseAnnouncement(text);
        if (parsed) {
          const enriched = { ...parsed, detail_url: item.url, source_url: item.url };
          (parsed.kind === 'grunt' ? land : listings).push(enriched);
        }
        continue;
      }
      if (isWykazNotice(text)) {
        const w = parseWykaz(text, publishedDate);
        if (w) wykaz.push({ ...w, detail_url: item.url });
      }
    }
  }

  console.error(
    `  pisz: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s), ${resultRefs.length} result record(s) (${fetched} detail fetch(es), ${boards.length} board(s))`,
  );
  return { listings, land, wykaz, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land } = await crawlPromise;
  return { listings, wykaz, land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land, wykaz } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        wykaz: wykaz.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleWykaz: wykaz[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
