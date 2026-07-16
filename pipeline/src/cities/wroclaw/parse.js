// Wrocław parsers — pure functions operating on real bip.um.wroc.pl HTML and
// gn.um.wroc.pl (Giełda Nieruchomości) HTML/doc text. Every BIP article
// ("przetarg-nieruchomosci") covers exactly ONE flat (unlike Kraków's
// multi-property notices), so each parsed ref yields at most one record.
//
// Groundtruthed live (2026-07-16) against:
//   - BIP search-results table row (status=Aktualne, kind=lokal mieszkalny):
//     "ulica Krzycka 3a lokal 1", cena wywoławcza 575 000,00 zł, data przetargu
//     30.09.2026.
//   - BIP "Informacja o wyniku (wersja tekstowa)" .docx (via core/doc-text.js),
//     attachment id 176660 on przetarg-nieruchomosci/89156 (ul. generała
//     Romualda Traugutta 141 lokal 4): cena wywoławcza 462 000,00 zł, cena
//     osiągnięta 466 620,00 zł, nabywca "54D Sp. z o. o.", pow. 82,26 m2,
//     round II, auction 01.07.2026.
//   - BIP result .docx, attachment id 176655 on przetarg-nieruchomosci/89757
//     (ulica Paulińska 2A "lokl" 12 — real source typo, missing the "a" in
//     "lokal"): cena wywoławcza 324 000,00 zł, cena osiągnięta 327 240,00 zł,
//     same nabywca, pow. 37,46 m2, round II, auction 01.07.2026.
//   - Giełda Nieruchomości detail page (gn.um.wroc.pl/oferta/lokal/1283,
//     katalog L/2/2026): "Ulica Bystrzycka 101/12", status "Sprzedane", cena
//     wywoławcza 500 000,00 zł, cena uzyskana 505 000,00 zł, data przetargu
//     02.06.2026, powierzchnia lokalu 47,10 m² (obok powierzchni działki
//     15 939 m² — the two "Powierzchnia" labels/values are template-squished
//     back to back, same order).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN } from '../../core/finn-bip.js';

export { htmlToText };

// ---- address label → parseAddress-ready raw string -------------------------

// Real "lokal"-suffix variants seen live: "lokal 1", "lokal nr 4", and a
// source typo "lokl 12" (missing the "a"). [al]{1,2} matches both "al" and
// the typo'd "l".
const APT_SUFFIX_RE = /\s+lok[al]{1,2}\.?\s*(?:nr\.?)?\s*([0-9]+[a-zA-Z]?)\s*$/i;
// Corner/multi-frontage buildings list BOTH street frontages plus a
// "(lokal w budynku przy ul. X Y)" clause naming the TRUE building address —
// e.g. "ulica gen. Józefa Haukego-Bosaka 1, Zygmunta Krasińskiego 40 (lokal w
// budynku przy ul. Zygmunta Krasińskiego 40) lokal 2" (real XML row, id 87845).
const BUDYNEK_CLAUSE_RE = /budynku\s+przy\s+ul\.?\s+([^)]+)\)/i;

/**
 * Turn a raw "Adres nieruchomości" field (XML `<adres-nieruchomosci>` or the
 * HTML table's same-named row) into a parseAddress()-ready string:
 * "ulica Krzycka 3a lokal 1 " → "ul. Krzycka 3a/1".
 * @param {string} label
 * @returns {string|null}
 */
export function addressRawFromLabel(label) {
  if (!label) return null;
  const s = label.trim().replace(/\s+/g, ' ');

  const budynekM = BUDYNEK_CLAUSE_RE.exec(s);
  if (budynekM) {
    const aptM = APT_SUFFIX_RE.exec(s);
    const base = `ul. ${budynekM[1].trim().replace(/\s+/g, ' ')}`;
    return aptM ? `${base}/${aptM[1]}` : base;
  }

  let out = s.replace(/^ulica\s+/i, 'ul. ');
  const aptM = APT_SUFFIX_RE.exec(out);
  if (aptM) out = out.slice(0, aptM.index) + `/${aptM[1]}`;
  return out.trim();
}

// ---- round ------------------------------------------------------------------

const ROUND_ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
/**
 * "sprzedaż wolnego lokalu mieszkalnego … (III przetarg)" → 3. No parenthetical
 * suffix ⇒ first auction (round 1). Case-sensitive Roman match (no /i) — a
 * case-insensitive bare "I" can false-positive on the Polish conjunction "i".
 * @param {string} przetargNaText
 * @returns {number}
 */
export function roundFromPrzetargNa(przetargNaText) {
  const m = /\((I{1,3}|IV|V|VI)\s+przetarg/.exec(przetargNaText || '');
  return m ? ROUND_ROMAN[m[1]] : 1;
}

// ---- BIP search-results / detail page: <table class="table table-borderless">

const TABLE_RE = /<table class="table table-borderless">([\s\S]*?)<\/table>/g;
const ROW_RE = /<th scope="row">([^<]+)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;

function cellText(cellHtml) {
  return (cellHtml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse ONE "Szczegóły" table block (shared by the detail page and each item
 * on a search-results page — both render the identical
 * `<table class="table table-borderless">` markup).
 * @param {string} blockHtml  the table's inner HTML (without the <table> tags)
 * @returns {{addressLabel:string, detailUrl:string|null, przetargNa:string,
 *   rodzaj:string, cenaText:string, auctionDate:string|null}}
 */
export function parseTableBlock(blockHtml) {
  const fields = {};
  ROW_RE.lastIndex = 0;
  let m;
  while ((m = ROW_RE.exec(blockHtml)) !== null) {
    fields[m[1].trim()] = m[2];
  }
  const addressCellRaw = fields['Adres nieruchomości'] || '';
  const hrefM = /href="([^"]+)"/.exec(addressCellRaw);
  const dateCellRaw = fields['Data przetargu'] || '';
  const isoM = /datetime="([^"]+)"/.exec(dateCellRaw);
  return {
    addressLabel: cellText(addressCellRaw),
    detailUrl: hrefM ? hrefM[1] : null,
    przetargNa: cellText(fields['Przetarg na'] || ''),
    rodzaj: cellText(fields['Rodzaj nieruchomości'] || ''),
    cenaText: cellText(fields['Cena wywoławcza'] || ''),
    auctionDate: isoM ? isoM[1].slice(0, 10) : null,
  };
}

/**
 * Split a BIP search-results (or detail) page into its "Szczegóły" table
 * blocks and parse each one. A search-results page embeds one full block per
 * row; a detail page has exactly one.
 * @param {string} html
 * @returns {ReturnType<typeof parseTableBlock>[]}
 */
export function parseListingBlocks(html) {
  const out = [];
  TABLE_RE.lastIndex = 0;
  let m;
  while ((m = TABLE_RE.exec(html)) !== null) {
    const f = parseTableBlock(m[1]);
    if (f.addressLabel) out.push(f);
  }
  return out;
}

/**
 * A parsed table block → an active-listing record (crawlActive). Returns null
 * for non-flat rows (defensive — callers already filter kind_id=3) or an
 * unparseable address.
 * @param {ReturnType<typeof parseTableBlock>} block
 * @returns {object|null}
 */
export function blockToListing(block) {
  if (!block.detailUrl) return null;
  const kind = classifyKind(`${block.rodzaj} ${block.przetargNa}`);
  if (kind !== 'mieszkalny') return null;
  const addressRaw = addressRawFromLabel(block.addressLabel);
  const address = parseAddress(addressRaw);
  if (!address) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    area_m2: null, // enriched from the announcement .docx by crawl.js's enrichActive()
    round: roundFromPrzetargNa(block.przetargNa),
    starting_price_pln: parsePLN(block.cenaText),
    auction_date: block.auctionDate,
    detail_url: block.detailUrl,
    source_url: block.detailUrl,
  };
}

// ---- announcement .docx (area_m2 enrichment) --------------------------------

/**
 * "Powierzchnia lokalu: 59,34 m2" → 59.34. Groundtruthed against the real
 * announcement .docx for ul. Krzycka 3a lokal 1 (attachment id 177152).
 * @param {string} text
 * @returns {number|null}
 */
export function areaFromAnnouncementText(text) {
  const m = /Powierzchnia\s+lokalu:\s*([\d]+[.,]\d+)\s*m\s*2/i.exec(text || '');
  return m ? Number(m[1].replace(',', '.')) : null;
}

// ---- result record (shared by both BIP-docx and Giełda refs) ---------------

/**
 * Header lines crawl.js prepends to every result ref's `.text` — the address/
 * round/starting-price/date are already reliably known from the same
 * structured field (BIP table row or Giełda page) that located the
 * achieved-price document, so parseResultDoc trusts THESE over anything it
 * could re-derive from the free-form doc/page text (which uses abbreviated
 * street forms like "ul. gen. Romualda Traugutta" that would mint a
 * DIFFERENT address key than the announcement's "ulica generała Romualda
 * Traugutta" and break the listings↔results join).
 * @param {string} text
 * @param {string} key
 * @returns {string|null}
 */
export function headerField(text, key) {
  const m = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(text || '');
  return m ? m[1].trim() : null;
}

const NEGATIVE_RE =
  /wynikiem\s+negatywnym|nie\s+wp[łl]aci\w*\s+wadi|nikt\s+nie\s+przyst[ąa]pi|nie\s+wy[łl]oniono\s+nabywc|nie\s+dosz[łl]o\s+do/i;

/**
 * Every zł-amount ("N NNN,NN zł") appearing in the free-form doc/page text,
 * parsed and de-duplicated in order of first appearance. The digit-group
 * structure is deliberately strict (single space/dot THOUSAND separator,
 * exactly 3 digits per group) — the BIP result .docx is a squished table
 * whose adjacent "Liczba osób (nie)dopuszczonych" single-digit cells sit
 * right before the price cell separated only by blank lines (e.g.
 * "…3\n\n\n1\n\n0\n\n462.000,00 zł…"); a loose `[\d\s.]*` run swallows those
 * stray digits into the amount (real bug caught by this adapter's own tests:
 * "1\n\n0\n\n462.000,00" parsed as 310462000 before this was tightened).
 * @param {string} text
 * @returns {number[]}
 */
export function amountsInText(text) {
  const seen = [];
  for (const m of (text || '').matchAll(/(\d{1,3}(?:[ .]\d{3})*,\d{2})\s*z[łl]/gi)) {
    const n = parsePLN(m[1]);
    if (n != null && !seen.includes(n)) seen.push(n);
  }
  return seen;
}

/**
 * The achieved price: the first zł-amount in the doc/page text that ISN'T the
 * already-known starting price. Returns null (unsold/unknown) when no such
 * amount exists or an explicit negative-outcome phrase is present.
 * @param {string} text
 * @param {number|null} startingPricePln
 * @returns {number|null}
 */
export function achievedPriceFromText(text, startingPricePln) {
  if (NEGATIVE_RE.test(text || '')) return null;
  const amounts = amountsInText(text);
  const distinct = startingPricePln != null ? amounts.filter((a) => a !== startingPricePln) : amounts;
  if (distinct.length) return distinct[0];
  return amounts.length >= 2 ? amounts[1] : null;
}

/**
 * Buyer name from the BIP result .docx: it follows the achieved amount's
 * spelled-out "…00/100" line, ending at "Opracowała". Giełda pages don't
 * expose a buyer name — returns null there.
 * @param {string} text
 * @returns {string|null}
 */
export function buyerFromText(text) {
  const m = /00\/100\s*\n*\s*([^\n]+?)\s*\n\s*Opracowa/i.exec(text || '');
  return m ? m[1].trim() : null;
}

/**
 * "pow. 82,26 m2" (BIP result .docx) or the Giełda "Powierzchnia lokalu:"
 * value — best-effort, returns null when absent.
 * @param {string} text
 * @returns {number|null}
 */
export function areaFromResultText(text) {
  const t = text || '';
  const bip = /pow\.\s*([\d]+[.,]\d+)\s*m\s*2/i.exec(t);
  if (bip) return Number(bip[1].replace(',', '.'));
  const gielda = /Powierzchnia\s+dzia[łl]ki:\s*Powierzchnia\s+lokalu:\s*[\d\s]+\s*m[²2]\s*([\d]+[.,]\d+)\s*m[²2]/i.exec(t);
  if (gielda) return Number(gielda[1].replace(',', '.'));
  return null;
}

/**
 * Parse ONE result ref's `.text` (a synthetic `ADRES:`/`RUNDA:`/
 * `CENA_WYWOLAWCZA:`/`DATA:` header block, prepended by crawl.js, followed by
 * the real BIP .docx or Giełda page text) into a result record. Every
 * Wrocław board article/lot covers exactly one flat, so this returns at most
 * one record.
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string|null} sourceUrl
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  const addressRaw = headerField(t, 'ADRES');
  if (!addressRaw) return [];
  const address = parseAddress(addressRaw);
  if (!address) return [];

  const roundHeader = headerField(t, 'RUNDA');
  const round = roundHeader ? Number(roundHeader) : 1;
  const startingHeader = headerField(t, 'CENA_WYWOLAWCZA');
  const starting_price_pln = startingHeader ? Number(startingHeader) : null;
  const dateHeader = headerField(t, 'DATA');
  const auction_date = dateHeader || fallbackDate || null;

  const achieved = achievedPriceFromText(t, starting_price_pln);
  const buyer = achieved != null ? buyerFromText(t) : null;
  const area_m2 = areaFromResultText(t);

  return [{
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    area_m2,
    round,
    starting_price_pln,
    final_price_pln: achieved,
    outcome: achieved != null ? 'sold' : 'unsold',
    unsold_reason: achieved != null ? null : (NEGATIVE_RE.test(t) ? 'negatywny' : 'unknown'),
    auction_date,
    source_pdf: sourceUrl || null,
    notes: buyer ? [`nabywca: ${buyer}`] : [],
  }];
}
