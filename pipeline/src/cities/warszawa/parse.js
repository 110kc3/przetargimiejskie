// Warszawa parsers — ETO category/165 list + dzielnica detail pages.
//
// TWO announcement types on ETO /category/165/:
//
//   A. CITY-OWNED items — ETO item links to <dzielnica>.um.warszawa.pl/-/<slug>
//      The dzielnica article body contains flat number, address, area, auction date.
//      No DOCX attachment observed on current live samples (2026-06-29).
//      Starting price NOT in article body (wykaz phase only).
//
//   B. AMW items — ETO item links to eto.um.warszawa.pl/category/165/announcement/<id>
//      PDF attachment at /announcement/attachment/<eto-id>/<att-id>.
//      The PDF is a scanned image; pdftotext returns empty; ocrPdf (tesseract) is used.
//      parseAmwPdfText() extracts starting_price_pln, area_m2, auction_date, address.
//
// AMW PDF OCR structure (groundtruthed 2026-06-29, items 153692 + 154506 + 258223):
//   Page 1: "na sprzedaz lokalu mieszkalnego nr NR, przy ul. STREET BLDG,"
//           table row "Powierzchnia lokalu | X,XX m2"
//   Page 2: oglosenie: "NNN 000,00 zt netto" near "Cena wywolawcza" label
//           wykaz:     "6 Cena NNN 000,00 zl" (no wywoławcza/netto nearby)
//   Page 3: oglosenie only: "Przetarg odbedzie sie w dniu DD.MM.YYYY r."
//   OCR artefacts: zt/zl for zl, m* for m2.
//
// Groundtruthed on live fixtures fetched 2026-06-29:
//   LIST:   https://eto.um.warszawa.pl/category/165/announcement (11 items)
//   DETAIL: https://srodmiescie.um.warszawa.pl/-/marszalkowska-81-m-19-...
//   AMW:    https://eto.um.warszawa.pl/category/165/announcement/153692

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- helpers ----------------------------------------------------------------

const PL_MONTHS = {
  stycznia: 1, styczen: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function normPL(s) {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ł/g, 'l').replace(/ń/g, 'n');
}

function iso(y, m, d) {
  return String(y) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function etoDMY(s) {
  if (!s) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
  return m ? iso(m[3], m[2], m[1]) : null;
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr).replace(/\s/g, '');
  const commaDecimal = /^[\d.]+,\d{2}$/.test(s);
  if (commaDecimal) {
    return Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) | 0;
  }
  const digits = s.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

const ORDINALS_MAP = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5 };
const ROMAN_PRE_RE = /(?:\b(I{1,3}|IV|VI{0,3}|IX|X)\s+przetarg|\((I{1,3}|IV|VI{0,3}|IX|X)\)\s+przetarg)/i;
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const t = text || '';
  const rm = ROMAN_PRE_RE.exec(t);
  if (rm) {
    const r = ROMAN_MAP[(rm[1] || rm[2]).toUpperCase()];
    if (r) return r;
  }
  const ordRe = /\b(pierwsz(?!e[nn])|drug|trzeci|czwart|pi[ao]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg/gi;
  let m;
  while ((m = ordRe.exec(t)) !== null) {
    const stem = normPL(m[1]);
    for (const [key, val] of Object.entries(ORDINALS_MAP)) {
      if (stem.startsWith(key)) return val;
    }
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

// ---- ETO list page parser ---------------------------------------------------

export function parseEtoListPage(html) {
  const out = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liM;
  while ((liM = liRe.exec(html)) !== null) {
    const li = liM[1];
    if (!li.includes('announcement-link')) continue;

    const hrefAlt = /<a\s+href="([^"]+)"\s[^>]*class="announcement-link"|<a\s[^>]*class="announcement-link"[^>]*href="([^"]+)"/i.exec(li);
    let detailUrl = hrefAlt ? (hrefAlt[1] || hrefAlt[2]) : null;
    if (!detailUrl) continue;
    detailUrl = detailUrl.replace(/&amp;/gi, '&');

    const etoId   = /data-id="(\d+)"/.exec(li)?.[1] ?? '';
    const dataTitle = /data-title="([^"]+)"/.exec(li)?.[1] ?? '';

    const nrM = /Og[^<]{0,10}<br\s*\/?>\s*nr\s*([\d/]+)/i.exec(li)
             || /nr\s+([\d]+\/\d+)/i.exec(li);
    const etoNr = nrM ? nrM[1].trim() : '';

    const h3M = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(li);
    const title = h3M ? stripHtml(h3M[1]) : dataTitle.trim();
    if (!title) continue;

    const odM = /<span>Od<\/span>\s*([\d-]+)/i.exec(li);
    const doM = /<span>Do<\/span>\s*([\d-]+)/i.exec(li);
    const publishedFrom = odM ? etoDMY(odM[1]) : null;
    const publishedTo   = doM ? etoDMY(doM[1]) : null;

    const isEtoHosted = detailUrl.includes('eto.um.warszawa.pl/category/165/announcement/');
    const kind = classifyKind(title);

    out.push({ eto_nr: etoNr, eto_id: etoId, title, detail_url: detailUrl,
               published_from: publishedFrom, published_to: publishedTo,
               is_eto_hosted: isEtoHosted, kind });
  }
  return out;
}

// ---- result notice title check ----------------------------------------------

export function isResultNoticeTitle(title) {
  return /informacja\s+o\s+wyniku\s+przetargu/i.test(title || '');
}

// ---- dzielnica article text parser -----------------------------------------
// Handles three input forms:
//   A. Article body text from dzielnica portal (primary)
//      e.g. "...wykaz lokalu mieszkalnego nr 19 polozonego przy ul. Marszalkowskiej 81,..."
//   B. ETO list title for dzielnica items (fallback when article fetch fails)
//      e.g. "Marszalkowska 81 m 19 - lokal mieszkalny przeznaczony do sprzedazy..."
//   C. AMW ETO list title (fallback for AMW items when PDF parse misses address)
//      e.g. "...lokalu mieszkalnego nr 78, ul. Grocjecka 66 w Dzielnicy..."

export function parseDetailText(text) {
  if (!text) {
    return { apt: null, address: null, address_raw: null,
             area_m2: null, auction_date: null, round: null };
  }
  const t = text;

  const aptM = /lokal[ui]\s+mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const apt = aptM ? aptM[1] : null;

  let address = null;
  let address_raw = null;

  // Form A: "przy ul. STREET BLDG[,]" — article body narrative
  const addrNarrM = /przy\s+(?:ul|ulicy|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń .]+?)\s+(\d+[A-Za-z]?)(?=[,\s.]|$)/i.exec(t);
  if (addrNarrM) {
    const streetRaw = addrNarrM[1].trim().replace(/\s+/g, ' ');
    const bldg = addrNarrM[2];
    address_raw = 'ul. ' + streetRaw + ' ' + bldg + (apt ? '/' + apt : '');
    address = parseAddress(address_raw);
  }

  // Form B: ETO title "STREET BLDG m APT - lokal mieszkalny..."
  // Only runs when Form A did not match (i.e. input is a title string, not article body).
  if (!address) {
    const titleAptM = /^([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń.][A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń .]*?)\s+(\d+[A-Za-z]?)\s+m\.?\s+(\d+[A-Za-z]?)\s*(?:-|$)/i.exec(t);
    if (titleAptM) {
      const streetRaw = titleAptM[1].trim().replace(/\s+/g, ' ');
      const bldg = titleAptM[2];
      const titleApt = titleAptM[3];
      address_raw = 'ul. ' + streetRaw + ' ' + bldg + '/' + titleApt;
      address = parseAddress(address_raw);
    }
  }

  // Form C: "ul. STREET BLDG w Dzielnicy / w Warszawie" — AMW title or body
  // Matches bare "ul." without "przy" prefix.
  if (!address) {
    const ulM = /(?:ul|ulicy|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń .]+?)\s+(\d+[A-Za-z]?)(?:\s+w\s|\s*,)/i.exec(t);
    if (ulM) {
      const streetRaw = ulM[1].trim().replace(/\s+/g, ' ');
      const bldg = ulM[2];
      address_raw = 'ul. ' + streetRaw + ' ' + bldg + (apt ? '/' + apt : '');
      address = parseAddress(address_raw);
    }
  }

  const areaM = /powierzchni\w*\s+u[zz]ytkow\w*[^0-9]{0,30}?([\d]+[.,][\d]+)\s*m/i.exec(t)
             || /([\d]+[.,][\d]+)\s*m\s*(?:[24]|kw)/i.exec(t);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  let auction_date = null;
  const dateAnchorRe = /odb[eę]d[aązie]+\s+si[eę]\s+(?:w\s+dniu\s+)?([\s\S]{0,60})/gi;
  let dateM;
  while ((dateM = dateAnchorRe.exec(t)) !== null && !auction_date) {
    const scope = dateM[1];
    const wordM = /(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(scope);
    if (wordM) {
      const mo = PL_MONTHS[normPL(wordM[2])];
      if (mo) { auction_date = iso(wordM[3], mo, wordM[1]); break; }
    }
    const numM = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(scope);
    if (numM) { auction_date = iso(numM[3], numM[2], numM[1]); break; }
  }

  const round = roundFromText(t);
  return { apt, address, address_raw, area_m2, auction_date, round };
}

// ---- attachment URL from ETO detail page ------------------------------------
// Live ETO pages (2026-06-29) use absolute https:// URLs; test fixtures use
// relative /announcement/attachment/... paths. Handle both.

export function attachmentUrlFromEtoDetail(html) {
  if (!html) return null;
  const absM = /href="(https:\/\/eto\.um\.warszawa\.pl\/announcement\/attachment\/\d+\/\d+)"/i.exec(html);
  if (absM) return absM[1];
  const relM = /href="(\/announcement\/attachment\/\d+\/\d+)"/i.exec(html);
  if (!relM) return null;
  return 'https://eto.um.warszawa.pl' + relM[1];
}

// ---- AMW PDF OCR text parser ------------------------------------------------
// AMW PDFs are scanned (200 dpi JPEG); pdftotext returns empty; caller must
// use ocrPdf() first. This function is pure text -> structured data.
//
// Groundtruthed on:
//   153692 / 255542 (Andersa 20 m 62):  466 000 zl, 20.76 m2, auction 2026-08-10
//   154506 / 256690 (Smocza 4 m 13):    340 000 zl, 19.60 m2, auction 2026-07-24
//   155716 / 258223 (Grojecka 66 m 78): 536 000 zl, 26.02 m2, wykaz (no auction date)
//
// OCR quirks: zt/zl for zl, m*/m? for m2, Cena label may follow price number.
// Wykaz PDFs: price row is "6 Cena NNN 000,00 zl" — no wywoławcza/netto nearby.

export function parseAmwPdfText(ocrText) {
  if (!ocrText) {
    return { starting_price_pln: null, area_m2: null, auction_date: null,
             address: null, address_raw: null, apt: null, round: null };
  }
  const t = ocrText;

  // Price: scan all "NNN 000,00 zl/zt/zł" patterns and select the one most
  // likely to be the asking price.
  //
  // AMW ogloszenie PDFs (Andersa, Smocza): price appears BEFORE the
  //   "Cena wywoławcza" row label, preceded by "netto" on same line.
  //   e.g. "466 000,00 zl netto\nCena wywolawcza | sprzedazy."
  //
  // AMW wykaz PDFs (Grojecka 258223, Smocza 255012): price appears in a table
  //   row labelled "6 Cena" with no "wywoławcza" or "netto" nearby.
  //   e.g. "6 Cena 536 000,00 zl\nnieruchomosci + ..."
  //
  // Strategy: prefer a price within 300 chars of "Cena wywo..." / "netto";
  // if none qualify, fall back to any price within 150 chars of a bare "Cena"
  // label (wykaz table row "N Cena NNN,NN zl") that is not "Cena nabycia".
  let starting_price_pln = null;
  const allPriceRe = /([\d][\d\s]{1,12}[\d][.,][\d]{2})\s*z[tlł]/gi;
  let pm;
  const primaryCandidates = [];
  const fallbackCandidates = [];
  while ((pm = allPriceRe.exec(t)) !== null) {
    const n = parsePLN(pm[1]);
    if (n && n >= 50000 && n <= 50000000) {
      const lo = Math.max(0, pm.index - 300);
      const hi = Math.min(t.length, pm.index + 300);
      const ctx = t.slice(lo, hi);
      if (/cena\s+wywo[tlł]/i.test(ctx) || /netto/i.test(ctx)) {
        primaryCandidates.push(n);
      } else {
        // Wykaz-format: "N Cena NNN zl" table row.
        // Check only the text BEFORE the price for the bare "Cena" label and
        // confirm "Cena nabycia" (a different row) does NOT appear before the match.
        // "Cena nabycia" may appear AFTER the price in the next row — that's fine.
        const lo2 = Math.max(0, pm.index - 150);
        const ctxBefore = t.slice(lo2, pm.index);
        if (/\bcena\b/i.test(ctxBefore) && !/cena\s+nabycia/i.test(ctxBefore)) {
          fallbackCandidates.push(n);
        }
      }
    }
  }
  if (primaryCandidates.length) starting_price_pln = primaryCandidates[0];
  else if (fallbackCandidates.length) starting_price_pln = fallbackCandidates[0];

  // Area: "Powierzchnia lokalu | X,XX m2" or "o powierzchni X,XX m*"
  const areaRe1 = /(?:powierzchni\w*\s+lokalu[^|\n]{0,30}[|:]?\s*|o\s+powierzchni\s+)([\d]+[.,][\d]+)\s*m[*2?]/i;
  const areaRe2 = /lokal\w*\s+(?:mieszkaln\w+\s+)?(?:nr\s+\d+\w*\s+)?[o0]\s+powierzchni\s+([\d]+[.,][\d]+)\s*m/i;
  const areaM = areaRe1.exec(t) || areaRe2.exec(t);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  // Auction date: "Przetarg odbedzie sie w dniu DD.MM.YYYY r."
  const amwDateRe = /przetarg\s+odb[eęé]dzie\s+si[eę]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r/i;
  const amwDateM = amwDateRe.exec(t);
  const auction_date = amwDateM ? iso(amwDateM[3], amwDateM[2], amwDateM[1]) : null;

  // Address: try table header "Warszawa, ul. STREET BLDG m. APT" first
  let address = null;
  let address_raw = null;
  let apt = null;

  const headerRe = /Warszawa,\s+ul\.\s+([A-Za-z\u00C0-\u017E][A-Za-z\u00C0-\u017E\s.]*?)\s+(\d+[A-Za-z]?)\s+m\.\s+(\d+[A-Za-z]?)/i;
  const headerM = headerRe.exec(t);
  if (headerM) {
    const street = headerM[1].trim();
    const bldg = headerM[2];
    apt = headerM[3];
    address_raw = 'ul. ' + street + ' ' + bldg + '/' + apt;
    address = parseAddress(address_raw);
  }

  if (!address) {
    // Narrative: "przy ul. STREET BLDG," with apt nearby
    const addrRe = /przy\s+ul\.\s+([A-Za-z\u00C0-\u017E][A-Za-z\u00C0-\u017E\s.]*?)\s+(\d+[A-Za-z]?)\s*[,\n]/i;
    const addrM = addrRe.exec(t);
    if (addrM) {
      const street = addrM[1].trim();
      const bldg = addrM[2];
      const after = t.slice(addrM.index + addrM[0].length, addrM.index + addrM[0].length + 100);
      const aptM2 = /(?:m\.|nr)\s+(\d+[A-Za-z]?)/i.exec(after);
      apt = aptM2 ? aptM2[1] : null;
      address_raw = 'ul. ' + street + ' ' + bldg + (apt ? '/' + apt : '');
      address = parseAddress(address_raw);
    }
  }

  const round = roundFromText(t);
  return { starting_price_pln, area_m2, auction_date, address, address_raw, apt, round };
}

// ---- Liferay article text extractor ----------------------------------------
// Two Liferay HTML variants observed:
//   OLD (pre-2026): class="journal-content-article" is on the <article> tag itself.
//   NEW (live 2026-06-29): class is on an outer <div>; bare <article> is a child.
//
// Strategy: find the first occurrence of the class string, then walk back to the
// opening '<' of that element, then search forward for the first <article>...</article>
// pair. Works for both variants:
//   - OLD: walk back lands on the <article> tag itself; regex matches it directly.
//   - NEW: walk back lands on the outer <div>; the <article> child is found in the
//          substring that follows.

export function articleTextFromHtml(html) {
  if (!html) return '';
  const jcaIdx = html.search(/journal-content-article/i);
  if (jcaIdx < 0) return '';
  // Walk back to the opening '<' so we include the full tag, not just its attributes.
  const tagStart = html.lastIndexOf('<', jcaIdx);
  const artM = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(
    tagStart >= 0 ? html.slice(tagStart) : html.slice(jcaIdx),
  );
  return artM ? stripHtml(artM[1]) : '';
}

// ---- result notice parsers --------------------------------------------------

export function isResultNotice(text) {
  return /informacja\s+o\s+wyniku\s+przetargu/i.test(text || '');
}

export function auctionDateFromResultText(text) {
  if (!text) return null;
  const spM = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (spM) {
    const mo = PL_MONTHS[normPL(spM[2])];
    if (mo) return iso(spM[3], mo, spM[1]);
  }
  const numM = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  return null;
}

export function startingPriceFromResultText(text) {
  if (!text) return null;
  const m = /cena\s+wywo[lł]awcza\s*:?\s*([\d\s.,]+)\s*z[lł]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromResultText(text) {
  if (!text) return null;
  const m = /najwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta\s+w\s+przetargu\s*:?\s*([\d\s.,]+)\s*z[lł]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

function isNegativeOutcome(text) {
  return /przetarg\s+zako[nń]czy[lł]\s+si[eę]\s+wynikiem\s+negatywnym|nie\s+wy[lł]oniono\s+nabywcy/i.test(text || '');
}

export function addressFromResultText(text) {
  if (!text) return null;
  const m = /(?:lokal[ui]\s+mieszkaln\w*\s+nr\s+\d+[A-Za-z]?,?\s*)?przy\s+(?:ul|ulicy|al|pl|os)\.?\s+([A-ZĄĆĘŁŃÓŚŹŻ a-ząćęłńóśźż][^,\n]{2,60}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?/i.exec(text);
  if (!m) return null;
  const apt = m[3] || null;
  return parseAddress('ul. ' + m[1].trim() + ' ' + m[2] + (apt ? '/' + apt : ''));
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const auctionDate = auctionDateFromResultText(t) || fallbackDate || null;
  const starting_price_pln = startingPriceFromResultText(t);
  const final_price_pln = achievedPriceFromResultText(t);
  const negative = isNegativeOutcome(t) || (!final_price_pln && !/nabywc/i.test(t));

  const address = addressFromResultText(t);
  if (!address) notes.push('parse: address not found in result text');

  const kind = classifyKind(t);

  const areaM = /(?:lokalu|lokal\s+mieszkaln\w+)[^.]{0,80}?([\d]+[.,][\d]+)\s*m\s*[24]/i.exec(t)
             || /o\s+powierzchni\s+u[zż]ytkow\w*\s+([\d]+[.,][\d]+)\s*m/i.exec(t);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const aptM = /lokal[ui]\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const apt = aptM ? aptM[1] : null;

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  const addressRaw = address
    ? 'ul. ' + address.street + ' ' + address.building + (address.apt ? '/' + address.apt : '')
    : null;

  return [{
    auction_date: auctionDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addressRaw,
    address,
    apt,
    round: roundFromText(t),
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: negative ? null : (final_price_pln ?? null),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2,
    notes,
  }];
}
