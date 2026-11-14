
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { parseAnnouncement, isResultDoc, isBezprzetargowoDoc } from './parse.js';

const ORIGIN = 'https://bip.elblag.eu';
const BOARD_URL = `${ORIGIN}/przetargi-nieruchomosci/190`;
const FETCH_OPTS = { insecureTLS: true };

function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detailUrlsFromBoard(html) {
  const out = new Map();
  const re = /href="(https:\/\/bip\.elblag\.eu\/przetarg-nieruchomosci\/(\d+)\/[a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    if (!out.has(m[2])) out.set(m[2], m[1]);
  }
  return [...out.values()];
}

export function fieldFromHtml(html, label) {
  const re = new RegExp(`<th scope="row">\\s*${label}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = re.exec(html || '');
  return m ? stripTags(m[1]) : null;
}

export function auctionDateIsoFromHtml(html) {
  const m = /<th scope="row">\s*Data przetargu\s*<\/th>[\s\S]{0,300}?<time datetime="([^"]+)"/i.exec(html || '');
  return m ? m[1].slice(0, 10) : null;
}

export function isResolved(html) {
  return /addon-bip-result[\s\S]{0,300}?Wyniki\s+z\s+przetargu\s+w\s+za[łl]/i.test(html || '');
}

export function isRokowania(typPrzetargu) {
  return /rokowani/i.test(typPrzetargu || '');
}

export function attachmentsFromHtml(html) {
  const out = [];
  const re =
    /href="([^"]*\/attachments\/download\/(\d+))"[^>]*>\s*([^<]*?)\s*<\/a>\s*<\/span>\s*<span class="files[^"]*">\s*([a-z0-9]+)\s*,/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    out.push({ id: m[2], url: m[1], name: m[3].replace(/\s+/g, ' ').trim(), ext: m[4].toLowerCase() });
  }
  return out;
}

function pickAttachment(atts, namePredicate) {
  return atts.find((a) => namePredicate(a.name) && !/skan/i.test(a.name)) || null;
}

async function extractText(att) {
  return att.ext === 'pdf' ? pdfText(att.url, FETCH_OPTS) : docText(att.url, FETCH_OPTS);
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const seenResultText = new Set();

  let boardHtml;
  try {
    boardHtml = await getText(BOARD_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  elblag: board fetch failed: ${err.message}`);
    return { listings, land, resultRefs };
  }
  const detailUrls = detailUrlsFromBoard(boardHtml);
  console.error(`  elblag: ${detailUrls.length} item(s) on the Przetargi - zbycie board`);

  for (const detailUrl of detailUrls) {
    let html;
    try {
      html = await getText(detailUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  elblag: detail fetch failed ${detailUrl}: ${err.message}`);
      continue;
    }

    const typPrzetargu = fieldFromHtml(html, 'Typ przetargu');
    if (isRokowania(typPrzetargu)) continue;

    const kindText = fieldFromHtml(html, 'Rodzaj nieruchomości');
    const roundText = fieldFromHtml(html, 'Przetarg na');
    const priceText = fieldFromHtml(html, 'Cena wywoławcza');
    const auctionDateIso = auctionDateIsoFromHtml(html);
    const atts = attachmentsFromHtml(html);

    const annAtt = pickAttachment(atts, (n) => /og[łl]oszenie/i.test(n));
    if (annAtt) {
      let text = '';
      try {
        text = await extractText(annAtt);
      } catch (err) {
        console.error(`  elblag: announcement extract failed ${annAtt.url}: ${err.message}`);
      }
      const rec = parseAnnouncement({ kindText, roundText, priceText, auctionDateIso, pdfText: text });
      if (rec) {
        const enriched = { ...rec, detail_url: detailUrl, source_url: annAtt.url };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      } else {
        console.error(`  elblag WARN: announcement not parsed (${detailUrl})`);
      }
    } else {
      console.error(`  elblag: no announcement attachment on ${detailUrl}`);
    }

    if (isResolved(html)) {
      const resAtt = pickAttachment(atts, (n) => /wyniki/i.test(n));
      if (!resAtt) {
        console.error(`  elblag WARN: resolved item with no Wyniki attachment (${detailUrl})`);
        continue;
      }
      let text;
      try {
        text = await extractText(resAtt);
      } catch (err) {
        console.error(`  elblag: result extract failed ${resAtt.url}: ${err.message}`);
        continue;
      }
      if (isResultDoc(text) && !isBezprzetargowoDoc(text) && !seenResultText.has(text)) {
        seenResultText.add(text);
        resultRefs.push({ text, pdf_url: resAtt.url, detail_url: detailUrl, auction_date: null });
      }
    }
  }

  console.error(
    `  elblag: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result document(s)`,
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
