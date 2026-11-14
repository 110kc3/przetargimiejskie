import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseActiveItem, parseWykazItem, parseResultDoc, polishDateToIso } from './parse.js';

const PORTAL = 'https://xn--bolesawiec-e0b.pl';
const BIP = 'https://www.um.boleslawiec.bip-gov.pl';
const RESULTS_BOARD = `${BIP}/public/?id=110553`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

const SALE_CATEGORIES = [
  'lokale-mieszkalne',
  'lokale-budynki-użytkowe',
  'działki-mieszkaniowe',
  'działki-mieszkaniowe-2',
  'działki-usługowe-przemysłowe',
  'garaże',
  'inne',
];
const WYKAZ_CATEGORIES = ['lokale-mieszkalne', 'lokale-budynki-użytkowe'];

const MAX_ITEMS_PER_FEED = 50;

function feedUrl(board, category) {
  return `${PORTAL}/index.php/mig/${board}/${encodeURIComponent(category)}?format=feed&type=rss`;
}


function decodeXml(s) {
  return (s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function parseRssItems(xml) {
  const out = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null && out.length < MAX_ITEMS_PER_FEED) {
    const block = m[1];
    const title = decodeXml((/<title>([\s\S]*?)<\/title>/i.exec(block) || [])[1] || '').trim();
    const link = ((/<link>([\s\S]*?)<\/link>/i.exec(block) || [])[1] || '').trim();
    let description = (/<description>([\s\S]*?)<\/description>/i.exec(block) || [])[1] || '';
    description = description.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
    const pubDate = ((/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block) || [])[1] || '').trim();
    out.push({ title, link, description, pubDate });
  }
  return out;
}


export function parseResultsBoard(html) {
  const out = [];
  const seen = new Set();
  const linkRe = /<a\s+href="(\/public\/getFile\?id=(\d+))"[\s\S]*?<span>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = decodeXml(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const dateM = /z\s+dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(title);
    out.push({
      pdf_url: `${BIP}${m[1]}`,
      title,
      auction_date: dateM ? polishDateToIso(dateM[1]) : null,
    });
  }
  return out;
}


let activePromise = null;

export async function crawlAll({ fetchText = getText } = {}) {
  const listings = [];
  const land = [];
  const wykaz = [];

  for (const category of SALE_CATEGORIES) {
    let xml;
    try {
      xml = await fetchText(feedUrl('sp-estate', category), FETCH_OPTS);
    } catch (err) {
      console.error(`  boleslawiec sp-estate/${category} feed failed: ${err.message}`);
      continue;
    }
    const items = parseRssItems(xml);
    let addL = 0, addLand = 0;
    for (const it of items) {
      const { listings: ls, land: lands } = parseActiveItem(it.title, it.description, it.link);
      listings.push(...ls); addL += ls.length;
      land.push(...lands); addLand += lands.length;
    }
    if (items.length) console.error(`  boleslawiec sp-estate/${category}: ${items.length} item(s) → ${addL} listing(s), ${addLand} land`);
  }

  for (const category of WYKAZ_CATEGORIES) {
    let xml;
    try {
      xml = await fetchText(feedUrl('przetargi-planowane', category), FETCH_OPTS);
    } catch (err) {
      console.error(`  boleslawiec przetargi-planowane/${category} feed failed: ${err.message}`);
      continue;
    }
    const items = parseRssItems(xml);
    let addW = 0;
    for (const it of items) {
      const entries = parseWykazItem(it.title, it.description, it.pubDate);
      wykaz.push(...entries); addW += entries.length;
    }
    if (items.length) console.error(`  boleslawiec przetargi-planowane/${category}: ${items.length} item(s) → ${addW} wykaz`);
  }

  console.error(`  boleslawiec crawlActive: ${listings.length} listing(s), ${wykaz.length} wykaz, ${land.length} land`);
  return { listings, wykaz, land, land_complete: false };
}

export async function crawlActive() {
  activePromise ??= crawlAll();
  return activePromise;
}


export async function crawlResultDocs() {
  let html;
  try {
    html = await getText(RESULTS_BOARD, FETCH_OPTS);
  } catch (err) {
    console.error(`  boleslawiec results board fetch failed: ${err.message}`);
    return [];
  }
  const board = parseResultsBoard(html);
  console.error(`  boleslawiec results board: ${board.length} PDF result notice(s)`);

  const refs = [];
  for (const b of board) {
    let text;
    try {
      text = await pdfText(b.pdf_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  boleslawiec result PDF failed (${b.pdf_url}): ${err.message}`);
      continue;
    }
    refs.push({ text, pdf_url: b.pdf_url, auction_date: b.auction_date });
  }
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const refs = await crawlResultDocs();
  const records = refs.flatMap((r) => parseResultDoc(r.text, r.auction_date, r.pdf_url));
  process.stdout.write(JSON.stringify({
    listings: active.listings.length,
    wykaz: active.wykaz.length,
    land: active.land.length,
    resultDocs: refs.length,
    resultRecords: records.length,
    sampleListing: active.listings[0],
    sampleLand: active.land[0],
    sampleResult: records[0],
  }, null, 2) + '\n');
}
