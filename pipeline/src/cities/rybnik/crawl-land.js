// Rybnik land crawler — city BIP "Oglosenia o przetargach" (Page=339).
//
//   LIST:   https://bip.um.rybnik.eu/Default.aspx?Page=339
//   DETAIL: https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=<N>
//   RTF:    https://bip.um.rybnik.eu/Download.ashx?id=<M>
//
// The city (Urzad Miasta Rybnika) auctions municipal land on this page --
// a DIFFERENT host from ZGM (flats only, bip.zgm.rybnik.pl, crawl.js).
// Real column order in the list table (observed June 2026):
//   [publish_date, title, auction_date, "Sprzedaz", Pokaz-link]
//
// We: 1. fetch list page -> parse rows -> keep only classifyKind=='grunt'.
//     2. fetch each detail page -> extract RTF URL.
//     3. download + rtfText() decode.
//     4. parse parcel / obreb / area / price / round.
//     5. emit kind:'grunt' records.
//
// Whole crawl is try/catch: unreachable host -> returns [] (pipeline safe).

import { getText } from '../../core/fetch.js';
import { rtfText } from '../../core/rtf-text.js';
import { classifyKind } from '../../core/classify-kind.js';

const ORIGIN = 'https://bip.um.rybnik.eu';
const LIST_URL = `${ORIGIN}/Default.aspx?Page=339`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Month names for spelled-out dates in RTF auction conditions.
const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};
function normMonth(s) {
  return s.toLowerCase()
    .replace(/e/g, 'e').replace(/z/g, 'z').replace(/s/g, 's')
    .replace(/n/g, 'n').replace(/o/g, 'o').replace(/a/g, 'a')
    .replace(/c/g, 'c').replace(/l/g, 'l')
    .replace(/\u0119/g, 'e') // e-ogonek
    .replace(/\u017a/g, 'z') // z-acute
    .replace(/\u015b/g, 's') // s-acute
    .replace(/\u0144/g, 'n') // n-acute
    .replace(/\u00f3/g, 'o') // o-acute
    .replace(/\u0105/g, 'a') // a-ogonek
    .replace(/\u0107/g, 'c') // c-acute
    .replace(/\u0142/g, 'l') // l-stroke
    .replace(/\u017c/g, 'z');// z-dot
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function absUrl(href) {
  const clean = (href || '').replace(/&amp;/gi, '&');
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${ORIGIN}/${clean.replace(/^\//, '')}`;
}

/**
 * Parse the list page table into rows: { title, listDate, detailId }.
 * Column order: [publish_date, title, auction_date, category, Pokaz-link].
 * Deduplicates by detailId (history-log section re-emits the same Ids).
 */
export function parseListPage(html) {
  const rows = [];
  const seen = new Set();
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const row = rowMatch[0];
    const idM = /Page=339&(?:amp;)?Id=(\d+)/.exec(row);
    if (!idM) continue;
    const detailId = idM[1];
    if (seen.has(detailId)) continue;
    seen.add(detailId);
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellM;
    while ((cellM = cellRe.exec(row)) !== null) {
      cells.push(stripTags(cellM[1]));
    }
    if (cells.length < 2) continue;
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const SKIP_RE = /^(?:Sprzeda[zz]|Kupno|Dzier[zz]awa|Najem|Wynajem)$/i;
    const title = cells.find((c) => c && !DATE_RE.test(c) && !SKIP_RE.test(c)) || '';
    const dateCells = cells.filter((c) => DATE_RE.test(c));
    const listDate = dateCells.length > 1 ? dateCells[dateCells.length - 1] : (dateCells[0] || null);
    rows.push({ title, listDate, detailId });
  }
  return rows;
}

/**
 * Extract the RTF Download.ashx URL from a detail page.
 */
export function parseDetailPage(html) {
  const m = /href=["']?(Download\.ashx\?id=\d+)["']?/i.exec(html || '');
  return m ? absUrl(m[1]) : null;
}

// --- RTF body parsers ---

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function landPriceFromText(text) {
  // "Cena wywolawcza : 208600 zlotych" -- RTF may split wywoławcza as "wywol awcza"
  const m = /cena\s+wywo[l\u0142]\s*awcza\s*:?\s*([\d][\d\s.,]*)\s*z[l\u0142]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function landAreaFromText(text) {
  const m = /(?:o\s+(?:[l\u0142][a\u0105]cznej\s+)?powierzchni|powierzchnia)\s+([\d,.\s]+)\s*ha/i.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(ha) || ha <= 0) return null;
  return Math.round(ha * 10000 * 10) / 10;
}

export function parcelFromText(text) {
  if (!text) return null;
  // dzia[lł]\w* matches all inflected forms: dzialki, dzialek, dzialka...
  const m = /dzia[l\u0142]\w*\s+nr\s+([\d/,\s]+(?:i\s+[\d/,\s]+)*)/i.exec(text);
  if (!m) return null;
  const raw = m[1].split('(')[0];
  const parts = raw
    .split(/\s+i\s+|,\s*/)
    .map((p) => p.trim().replace(/\s+/g, ''))
    .filter((p) => /^\d/.test(p));
  if (!parts.length) return null;
  return parts.join('/');
}

export function obrebFromText(text) {
  const m = /obr[e\u0119]b\s+([A-Z\u00C0-\u017E][a-z\u00C0-\u017E\s\-]+?)(?:[,.\s]|$)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

export function streetFromText(text) {
  const m = /przy\s+ul\.\s+([^\n,]+?)(?:\s+\d|[,.\n]|$)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

export function landAuctionDateFromText(text) {
  if (!text) return null;
  const num = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  const word = /w\s+dniu\s+(\d{1,2})\s+([a-z\u00C0-\u017E]+)\s+(\d{4})/i.exec(text);
  if (word) {
    const key = normMonth(word[2]);
    const mo = PL_MONTHS[key];
    if (mo) return `${word[3]}-${String(mo).padStart(2, '0')}-${word[1].padStart(2, '0')}`;
  }
  return null;
}

export function landRoundFromText(text) {
  if (!text) return null;
  // Normalise accented chars for simpler regex matching
  const t = text.toLowerCase()
    .replace(/[\u0105]/g, 'a').replace(/[\u0119]/g, 'e').replace(/[\u00f3]/g, 'o')
    .replace(/[\u015b]/g, 's').replace(/[\u017a\u017c]/g, 'z').replace(/[\u0144]/g, 'n')
    .replace(/[\u0107]/g, 'c').replace(/[\u0142]/g, 'l');
  const MAP = [
    [/\bpierwsz\w*\s+(?:\w+\s+){0,3}?przetarg/, 1],
    [/\bdrug\w+\s+(?:\w+\s+){0,3}?przetarg/, 2],
    [/\btrze[ct]i\w*\s+(?:\w+\s+){0,3}?przetarg/, 3],
    [/\bczwart\w*\s+(?:\w+\s+){0,3}?przetarg/, 4],
    [/\bpi\s*[a\u0105]t\w*\s+(?:\w+\s+){0,3}?przetarg/, 5],
    [/\bszost\w*\s+(?:\w+\s+){0,3}?przetarg/, 6],
  ];
  for (const [re, n] of MAP) {
    if (re.test(t)) return n;
  }
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}

export function parseLandRtf(title, text, detailUrl, rtfUrl) {
  const dzialka_nr = parcelFromText(text);
  const obreb = obrebFromText(text);
  const street = streetFromText(text) || streetFromText(title) || null;
  const address_raw = street ? `ul. ${street}` : null;
  return {
    kind: 'grunt',
    dzialka_nr: dzialka_nr || null,
    obreb: obreb || null,
    zoning: null,
    address_raw,
    street,
    area_m2: landAreaFromText(text),
    starting_price_pln: landPriceFromText(text),
    auction_date: landAuctionDateFromText(text),
    round: landRoundFromText(text),
    detail_url: detailUrl,
    source_url: rtfUrl,
  };
}

export async function crawlLand() {
  let listHtml;
  try {
    listHtml = await getText(LIST_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  rybnik-land: list page fetch failed: ${err.message}`);
    return [];
  }
  const rows = parseListPage(listHtml);
  const landRows = rows.filter((r) => classifyKind(r.title) === 'grunt');
  console.error(
    `  rybnik-land: ${rows.length} total row(s), ${landRows.length} land row(s) to process`,
  );
  const results = [];
  for (const row of landRows) {
    const detailUrl = `${ORIGIN}/Default.aspx?Page=339&Id=${row.detailId}`;
    let rtfUrl;
    try {
      const detailHtml = await getText(detailUrl, FETCH_OPTS);
      rtfUrl = parseDetailPage(detailHtml);
    } catch (err) {
      console.error(`  rybnik-land: detail fetch failed (Id=${row.detailId}): ${err.message}`);
      continue;
    }
    if (!rtfUrl) {
      console.error(`  rybnik-land: no RTF link (Id=${row.detailId})`);
      continue;
    }
    let text;
    try {
      text = await rtfText(rtfUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  rybnik-land: RTF failed (${rtfUrl}): ${err.message}`);
      continue;
    }
    try {
      const rec = parseLandRtf(row.title, text, detailUrl, rtfUrl);
      if (!rec.auction_date && row.listDate) rec.auction_date = row.listDate;
      results.push(rec);
    } catch (err) {
      console.error(`  rybnik-land: parse failed (Id=${row.detailId}): ${err.message}`);
    }
  }
  console.error(`  rybnik-land: emitting ${results.length} land plot record(s)`);
  return results;
}
