// Rybnik city-BIP crawler — "Ogłoszenia o przetargach" register (Page=339).
//
//   LIST:   https://bip.um.rybnik.eu/Default.aspx?Page=339
//   DETAIL: https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=<N>
//   RTF:    https://bip.um.rybnik.eu/Download.ashx?id=<M>
//
// The city (Urząd Miasta Rybnika) publishes BOTH municipal land AND ZGM's flat
// auctions on this one page (the standalone ZGM BIP page — crawl.js — is dead).
// Real column order in the list table (observed June 2026):
//   [publish_date, title, auction_date, "Sprzedaż", Pokaż-link]
//
// We: 1. fetch the list page -> parse rows.
//     2. fetch each detail page -> extract the RTF URL, download + rtfText().
//     3. classify each on TITLE + BODY (the title alone is 'unknown' for flats):
//          - 'grunt'      -> parseLandRtf  -> `land`     (parcel-keyed)
//          - 'mieszkalny' -> parseFlatRtf  -> `listings` (address-keyed)
//        result-notice rows ("Informacja o wyniku …") and anything else skip.
//
// Whole crawl is try/catch: unreachable host -> returns empty (pipeline safe).

import { getText } from '../../core/fetch.js';
import { rtfText } from '../../core/rtf-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import {
  roundFromText as flatRoundFromText,
  auctionDateFromText as flatAuctionDateFromText,
  priceFromText as flatPriceFromText,
  areaFromText as flatAreaFromText,
} from './parse.js';

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
    .replace(/ę/g, 'e').replace(/ź/g, 'z').replace(/ś/g, 's')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ą/g, 'a')
    .replace(/ć/g, 'c').replace(/ł/g, 'l').replace(/ż/g, 'z');
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
 * Column order: [publish_date, title, auction_date, category, Pokaż-link].
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
    const SKIP_RE = /^(?:Sprzeda[zż]|Kupno|Dzier[zż]awa|Najem|Wynajem)$/i;
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

// --- RTF body parsers (land) ---

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function landPriceFromText(text) {
  // "Cena wywolawcza : 208600 zlotych" -- RTF may split wywoławcza as "wywol awcza"
  const m = /cena\s+wywo[lł]\s*awcza\s*:?\s*([\d][\d\s.,]*)\s*z[lł]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function landAreaFromText(text) {
  const m = /(?:o\s+(?:[lł][aą]cznej\s+)?powierzchni|powierzchnia)\s+([\d,.\s]+)\s*ha/i.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(ha) || ha <= 0) return null;
  return Math.round(ha * 10000 * 10) / 10;
}

export function parcelFromText(text) {
  if (!text) return null;
  // dzia[lł]\w* matches all inflected forms: dzialki, dzialek, dzialka...
  const m = /dzia[lł]\w*\s+nr\s+([\d/,\s]+(?:i\s+[\d/,\s]+)*)/i.exec(text);
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
  const m = /obr[eę]b\s+([A-ZÀ-ž][a-zÀ-ž\s\-]+?)(?:[,.\s]|$)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

export function streetFromText(text) {
  const m = /przy\s+ul\.\s+([^\n,]+?)(?:\s+\d|[,.\n]|$)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

// A re-listed (round >= 2) announcement carries the mandatory history clause
// "Przetarg przeprowadzony w dniu <D> r. zakończony został wynikiem negatywnym",
// whose date is the FAILED earlier round, not this auction. A first-match scan
// grabbed it and stamped round-2 plots with the past round-1 date (→ wrongly
// 'archived'). Skip any "w dniu <date>" that sits in such a clause — the
// operative "Przetarg rozpocznie się w dniu <D>" then wins. Mirrors the same
// history-clause guard in parse.js roundFromText.
const HISTORY_DATE_BEFORE = /(?:przeprowadzon\w*|odby[łl]\w*|zako[ńn]czon\w*)\s+(?:[\wąćęłńóśźż]+\s+){0,3}?$/i;
const HISTORY_DATE_AFTER = /^\s*r?\.?\s*(?:[\wąćęłńóśźż]+\s+){0,6}?(?:zako[ńn]czy|negatywn|odby[łl])/i;

function isHistoryDateMatch(text, matchIndex, matchStr) {
  const before = text.slice(Math.max(0, matchIndex - 40), matchIndex);
  if (HISTORY_DATE_BEFORE.test(before)) return true;
  const after = text.slice(matchIndex + matchStr.length, matchIndex + matchStr.length + 60);
  return HISTORY_DATE_AFTER.test(after);
}

export function landAuctionDateFromText(text) {
  if (!text) return null;
  // Numeric dd.mm.yyyy — scan all, skip history-clause dates, take the first
  // operative one (fall back to the first match if every hit is a history date).
  const numRe = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/gi;
  let fallbackNum = null;
  let nm;
  while ((nm = numRe.exec(text)) !== null) {
    const iso = `${nm[3]}-${nm[2].padStart(2, '0')}-${nm[1].padStart(2, '0')}`;
    if (fallbackNum == null) fallbackNum = iso;
    if (!isHistoryDateMatch(text, nm.index, nm[0])) return iso;
  }
  if (fallbackNum) return fallbackNum;
  // Spelled-out month — same operative-vs-history scan.
  const wordRe = /w\s+dniu\s+(\d{1,2})\s+([a-zÀ-ž]+)\s+(\d{4})/gi;
  let fallbackWord = null;
  let wm;
  while ((wm = wordRe.exec(text)) !== null) {
    const mo = PL_MONTHS[normMonth(wm[2])];
    if (!mo) continue;
    const iso = `${wm[3]}-${String(mo).padStart(2, '0')}-${wm[1].padStart(2, '0')}`;
    if (fallbackWord == null) fallbackWord = iso;
    if (!isHistoryDateMatch(text, wm.index, wm[0])) return iso;
  }
  return fallbackWord;
}

export function landRoundFromText(text) {
  if (!text) return null;
  // Normalise accented chars for simpler regex matching
  const t = text.toLowerCase()
    .replace(/[ą]/g, 'a').replace(/[ę]/g, 'e').replace(/[ó]/g, 'o')
    .replace(/[ś]/g, 's').replace(/[źż]/g, 'z').replace(/[ń]/g, 'n')
    .replace(/[ć]/g, 'c').replace(/[ł]/g, 'l');
  const MAP = [
    [/\bpierwsz\w*\s+(?:\w+\s+){0,3}?przetarg/, 1],
    [/\bdrug\w+\s+(?:\w+\s+){0,3}?przetarg/, 2],
    [/\btrze[ct]i\w*\s+(?:\w+\s+){0,3}?przetarg/, 3],
    [/\bczwart\w*\s+(?:\w+\s+){0,3}?przetarg/, 4],
    [/\bpi\s*[aą]t\w*\s+(?:\w+\s+){0,3}?przetarg/, 5],
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

// --- Flat (lokal mieszkalny) path on Page=339 ---
//
// The city BIP runs ZGM's flat auctions on this SAME page (the standalone ZGM
// BIP page is dead — see crawl.js). Their list titles carry the address inline,
// e.g. "Przetarg 9.06.2026 ul. Zgrzebnioka 7b/6" / "Przetarg 9 czerwca br. ul.
// św. Józefa 18/47"; the RTF body says "lokal mieszkalny" + price/area/date. The
// title alone classifies as 'unknown' (no kind keyword), so the body is what
// marks it a flat — classify on title + body, never title alone.

/** Strip a "Przetarg <date>"-style prefix and pull "<street> <bldg>/<apt>" out
 *  of a city-BIP flat list title; reuses the shared address normaliser.
 *  "Przetarg 9.06.2026 ul. Cierpioła 6 a/3" → address{ key: 'cierpiola|6A|3' }.
 *  Returns null when no street/number can be found (e.g. a land title). */
export function addressFromTitle(title) {
  if (!title) return null;
  const m = /\bul\.?\s+([\s\S]+)$/i.exec(title);
  if (!m) return null;
  let s = m[1]
    .replace(/\s+/g, ' ')
    .replace(/\s*\br\.\s*$/i, '') // trailing " r."
    .trim();
  // Collapse a space between building number and its letter: "6 a/3" → "6a/3",
  // "5 b/2" → "5b/2", "28 a/17" → "28a/17" (BIP titles are typed by hand).
  s = s.replace(/(\d)\s+([A-Za-z])(?=\s*[\/\\]|\s*$)/g, '$1$2');
  const address = parseAddress(s);
  return address ? { address_raw: s, address } : null;
}

/** Assemble a flat property record from a Page=339 flat announcement. The
 *  address comes from the list title (fallback: the RTF body's "przy ul. …");
 *  price/area/date/round come from the RTF, via parse.js's flat parsers. */
export function parseFlatRtf(title, text, detailUrl, rtfUrl) {
  const addr =
    addressFromTitle(title) ||
    (() => {
      // Body fallback: "… przy ul. św. Józefa 18/47 ." → address.
      // Street names carry internal periods ("św.", "gen."), so anchor on the
      // building/apartment number rather than stopping at the first '.'.
      const bm = /przy\s+ul\.?\s+([A-Za-z\u00C0-\u017E.\s]+?\s+\d+[A-Za-z]?(?:\s*[\/\\]\s*[0-9A-Za-z]+)?)/i.exec(text || '');
      if (!bm) return null;
      const s = bm[1].replace(/\s+/g, ' ').replace(/(\d)\s+([A-Za-z])(?=\s*[\/\\]|\s*$)/g, '$1$2').trim();
      const a = parseAddress(s);
      return a ? { address_raw: s, address: a } : null;
    })();
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    auction_date: flatAuctionDateFromText(text),
    published_date: null,
    round: flatRoundFromText(text),
    area_m2: flatAreaFromText(text),
    starting_price_pln: flatPriceFromText(text),
    detail_url: detailUrl,
    source_url: rtfUrl,
  };
}

/**
 * Crawl Page=339 once and route each row by what it is. Land plots ('grunt')
 * go through parseLandRtf into `land`; residential flats (body = "lokal
 * mieszkalny") go through parseFlatRtf into `listings`. Result-notice rows
 * ("Informacja o wyniku przetargu …") and anything unclassifiable are skipped.
 * @returns {Promise<{ land: object[], listings: object[] }>}
 */
export async function crawlLand() {
  let listHtml;
  try {
    listHtml = await getText(LIST_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  rybnik-land: list page fetch failed: ${err.message}`);
    return { land: [], listings: [] };
  }
  const rows = parseListPage(listHtml);
  console.error(`  rybnik-land: ${rows.length} total row(s) to triage`);

  const land = [];
  const listings = [];
  for (const row of rows) {
    // Skip result/info notices — these are achieved-price summaries, not
    // open-auction announcements, and there is no results stream wired.
    if (/informacja\s+o\s+(?:wyniku|przetargu)|wykaz\s+nieruchomo/i.test(row.title)) continue;

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

    // Classify on title + body (the title alone is usually 'unknown' for flats;
    // the body always carries "lokal mieszkalny" / "nieruchomość gruntowa").
    const kind = classifyKind(`${row.title}\n${text}`);
    try {
      if (kind === 'mieszkalny') {
        const rec = parseFlatRtf(row.title, text, detailUrl, rtfUrl);
        if (!rec) {
          console.error(`  rybnik-land: flat unkeyable (Id=${row.detailId}, "${row.title}")`);
          continue;
        }
        if (!rec.auction_date && row.listDate) rec.auction_date = row.listDate;
        listings.push(rec);
      } else if (kind === 'grunt') {
        const rec = parseLandRtf(row.title, text, detailUrl, rtfUrl);
        if (!rec.auction_date && row.listDate) rec.auction_date = row.listDate;
        land.push(rec);
      } else {
        console.error(`  rybnik-land: skipping ${kind} row (Id=${row.detailId}, "${row.title}")`);
      }
    } catch (err) {
      console.error(`  rybnik-land: parse failed (Id=${row.detailId}): ${err.message}`);
    }
  }
  console.error(`  rybnik-land: emitting ${land.length} land plot(s) + ${listings.length} flat(s)`);
  return { land, listings };
}
