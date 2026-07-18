// Płock (ARS Sp. z o.o.) parsers.
//
// ARS runs two boards, both server-rendered HTML with the SAME per-notice
// detail-page template (a short <div class="standard-content"> body prose +
// "Załączniki" PDF attachment links), regardless of whether the URL is
// /pl/przetargi/<id>/<slug> or /pl/Auction/Details/<id>?title=<slug> — verified
// live 2026-07-18 (both routes render byte-identical markup).
//
//   Ogłoszenia o przetargach (crawlActive)  — announcements: title states the
//     kind + address; price/date/area live in the "Ogloszenie.pdf" attachment.
//   Wyniki przetargów (crawlResultDocs)     — results: title states the kind +
//     (usually) the address; achieved price/buyer/outcome live in the
//     "protokol.pdf" attachment.
//
// Both boards mix real property-SALE auctions with rentals (wynajem/najem/
// dzierżawa) and unrelated construction/procurement notices ("Remont i
// przebudowa lokalu mieszkalnego ...", "Zawiadomienie o wyborze oferty
// najkorzystniejszej ...", "Sukcesywna dostawa oleju ...") that happen to
// mention "lokalu mieszkalnego" as the renovation's SUBJECT, not a property for
// sale — isSaleTitle() gates on a plain "sprzeda" substring, verified against
// every live title fetched 2026-07-18 to cleanly separate the two without a
// fragile allow/deny list.
//
// ADDRESS EXTRACTION IS SCOPED TO THE TITLE, never the PDF/OCR body. Why: the
// announcement PDF's later paragraphs restate ARS's OWN office address ("ul.
// Synagogalna 9/11", the Biuro Obsługi Klienta) — which, for the Synagogalna 13
// flat, is the SAME street as the property being sold, just a different
// building number. The short notice TITLE never mentions the office, so
// street+building always come from the title; the PDF/OCR text is used ONLY to
// backfill a missing unit number (a title can omit "nr N" — see the id-142
// result fixture below) and for price/date/area/outcome, whose anchor phrases
// are specific enough not to collide with the office paragraph.
//
// KIND is likewise classified from the TITLE ONLY (classifyKind(title)), not
// the combined body+PDF text: a building-sale announcement's OCR'd "Opis
// nieruchomości" section describes the OLD flats inside the building being
// sold ("powierzchnia użytkowa 5 lokali mieszkalnych; 117,81 m2"), which
// contains "lokal... mieszkaln..." and would wrongly flip classifyKind's
// FLAT_RE match ahead of the correct HOUSE_RE/'zabudowana' result if the whole
// body were classified. The title alone ("... na sprzedaż nieruchomości
// (gruntowej) zabudowanej ...") is unambiguous and never contains "lokal".
//
// OUTCOME: the result-protocol template ALWAYS prints both the "sold" clause
// (5, filled in with the winner + achieved price when there is one) and the
// "negative" boilerplate (6, "Przetarg zakończył się wynikiem negatywnym z
// uwagi na brak uczestników przetargu.") REGARDLESS of the actual outcome —
// verified live 2026-07-18 against a genuine SOLD protocol (Synagogalna 13
// lokal 9, GetAttachment/573: clause 5 filled with "ASTORGA MED Sp. z o.o. ...
// za cenę brutto 299 630,00 zł", clause 6's boilerplate still printed
// unconditionally) and a genuine UNSOLD one (a rental protocol, same
// template, clause 5 left as blank dots). So the outcome is decided by
// whether clause 5 yields a real achieved price — NEVER by the presence of
// clause 6's static boilerplate — with a fallback signal (a winner
// NIP/REGON registration block after the signature line) for the rare case
// where OCR mangles the price line beyond parsing (see
// hasWinnerRegistrationBlock).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- basic numeric parsers -------------------------------------------------

// "299.130,00" (announcement PDF convention) / "299 130,00" (protocol
// convention, space thousands) / "1.150.000,00" -> integer PLN. The trailing
// "\b" anchors the grosze-strip to the FINAL 2-digit group (any earlier
// 2-digit run inside a 3-digit thousands group is immediately followed by
// another digit, so it never satisfies the word-boundary and is left alone).
export function parsePLN(numStr) {
  if (numStr == null) return null;
  let s = String(numStr).trim();
  s = s.replace(/[.,]\d{2}\b/, ''); // drop grosze ",00" / ".00"
  s = s.replace(/[^\d]/g, ''); // drop thousands separators (space/dot/comma)
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "46,02" / "0.12431" -> number. Comma or dot decimal separator.
export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---- sale-vs-noise title gate ----------------------------------------------

/** True when a board-item title is a property SALE (announcement or result),
 *  false for a rental (wynajem/najem/dzierżawa) or unrelated procurement
 *  notice (which never contains "sprzeda"). See header note. */
export function isSaleTitle(title) {
  const t = (title || '').toLowerCase();
  if (/wynaj|dzier[żz]aw|\bnajem\b|\bnajmu\b/.test(t)) return false;
  return /sprzeda/.test(t);
}

// ---- address extraction (TITLE ONLY — see header note) --------------------

// The boundary after the building number accepts a trailing "/" (not just
// space/punctuation/end) because some multi-building complexes are written
// "Jerozolimskiej 14/16/18" (three adjoining building numbers slash-joined,
// verified live 2026-07-18 on a real result notice) — we key on the FIRST
// number only (parseAddress has no notion of a 3-way building complex) and
// simply leave "/16/18" unconsumed; the unit number (if any) still comes from
// unitNoFromText's separate "lokal ... nr N" search, never from this tail.
const BUILDING_BOUNDARY = '(?=[\\s.,)/]|$)';
const STREET_UL_RE = new RegExp(
  `(?:przy\\s+)?ul\\.?\\s+([A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*)*?)\\s+(\\d+[A-Za-z]?)${BUILDING_BOUNDARY}`,
  'u',
);
const STREET_BUDYNEK_RE = new RegExp(
  `w\\s+budynku\\s+([A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*)*?)\\s+(\\d+[A-Za-z]?)${BUILDING_BOUNDARY}`,
  'u',
);
// Bare fallback: a title can state the kind directly against the street with
// NEITHER "ul."/"przy ul." NOR "w budynku" ("... sprzedaż nieruchomości
// zabudowanej Bielska 23A" — verified live 2026-07-18). Anchored on the same
// kind vocabulary classifyKind() itself recognises, immediately followed by a
// capitalised street name + number, so it never fires on unrelated prose.
const STREET_BARE_RE = new RegExp(
  `(?:zabudowan\\w*|niezabudowan\\w*|mieszkaln\\w*|niemieszkaln\\w*|u[żz]ytkow\\w*|gara[żz]\\w*)\\s+` +
    `([A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*)*?)\\s+(\\d+[A-Za-z]?)${BUILDING_BOUNDARY}`,
  'u',
);

/** { street, building } from a notice TITLE, or null. Tries "ul. <street>
 *  <bldg>" first (unambiguous), then "w budynku <street> <bldg>" (some
 *  titles omit "ul." entirely — e.g. przetarg 132, see fixtures), then the
 *  bare "<kind-word> <street> <bldg>" form with neither marker (przetarg 108,
 *  see fixtures). */
export function streetBuildingFromTitle(title) {
  const t = title || '';
  const m = STREET_UL_RE.exec(t) || STREET_BUDYNEK_RE.exec(t) || STREET_BARE_RE.exec(t);
  if (!m) return null;
  return { street: m[1].trim(), building: m[2].toUpperCase() };
}

const UNIT_NO_RE =
  /lokal\w*\s+(?:mieszkaln\w*|u[żz]ytkow\w*|niemieszkaln\w*)\s*,?\s*nr\.?\s*(\d+[A-Za-z]?)/i;

/** Flat/commercial unit number ("lokal(u) ... nr N"). Searched in whatever
 *  text is passed — try the title first, then the PDF/OCR body as a backfill
 *  when the title omits it (see crawl.js). */
export function unitNoFromText(text) {
  const m = UNIT_NO_RE.exec(text || '');
  return m ? m[1] : null;
}

/** Raw "ul. <street> <bldg>[/<unit>]" address string from a title (+ an
 *  optional backfilled unit number), or null when no street/building is
 *  found in the title. */
export function addressRawFromTitle(title, unitNo) {
  const sb = streetBuildingFromTitle(title);
  if (!sb) return null;
  return unitNo ? `ul. ${sb.street} ${sb.building}/${unitNo}` : `ul. ${sb.street} ${sb.building}`;
}

// ---- price / date / area extraction (PDF/OCR body + title) ----------------

/** "Cena wywoławcza (brutto|netto)? wynosi X zł" (announcement), or the
 *  protocol's restatement "kwocie/cenie wywoławczej ... w wysokości X zł" —
 *  the starting price, or null. */
export function startingPriceFromText(text) {
  const t = text || '';
  const m =
    /cena\s+wywo[łl]awcz\w*\s*(?:brutto|netto)?\s*wynosi\s*([\d][\d.,\s]*?)\s*z[łl]/i.exec(t) ||
    /(?:kwocie|cenie)\s+wywo[łl]awcz\w*[\s\S]{0,60}?wysoko[śs]ci\s*([\d][\d.,\s]*?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** "Przetarg odbędzie się ... w dniu DD.MM.RRRRr. o godz(inie) HH:MM" — the
 *  SCHEDULED auction date/time from an announcement. Anchored on "w dniu ...
 *  o godz" (not "do dnia"/"w terminie do", which are deadline phrasings) so a
 *  wadium/document-submission deadline elsewhere in the same PDF is never
 *  picked up. -> ISO or null. */
export function auctionDateFromText(text) {
  const m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*(?:o\s+godz)/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Result-protocol date: the header "PROTOKÓŁ z dn.DD.MM.RRRRr." (preferred,
 *  always present at the top of every protocol), else "w dniu DD.MM.RRRRr. ...
 *  przeprowadził(a)". -> ISO or null. */
export function resultDateFromText(text) {
  const t = text || '';
  const m = /z\s+dn\.?\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})[^\n]{0,20}przeprowadzi/i.exec(t);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return null;
}

/** "wadium ... w terminie do (dnia)? DD.MM.RRRRr." -> ISO or null. */
export function wadiumDeadlineFromText(text) {
  // Window is generous (160 chars): the spelled-out amount clause
  // ("(słownie: pięćdziesiąt siedem tysięcy pięćset złotych)") sitting
  // between the wadium amount and "w terminie do" can run past 80 chars.
  const m = /wadium[\s\S]{0,160}?w\s+terminie\s+do\s+(?:dnia\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(
    text || '',
  );
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Usable floor area (flat/commercial unit): prefer the labelled "Powierzchnia
 *  lokalu wynosi X m2" / "powierzchni użytkowej ... X m2"; else the first bare
 *  "o powierzchni X m2" token that isn't a plot/cellar/building-footprint
 *  mention (a flat announcement also lists each room's own area — those never
 *  carry the "o powierzchni" phrasing, only "<room> o powierzchni", which the
 *  labelled patterns above are tried first to avoid entirely). m2 only. */
export function flatAreaFromText(text) {
  const t = text || '';
  const lab =
    /Powierzchnia\s+lokalu\s+wynosi\s*([\d]+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(t) ||
    /powierzchni\w*\s+u[żz]ytkow\w*(?:\s+mieszkania)?\s*([\d]+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(t);
  if (lab) {
    const v = parseArea(lab[1]);
    if (v) return v;
  }
  const re = /o\s+powierzchni\s+([\d]+[.,]\d+|\d+)\s*m\s*[²2]/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 30), m.index);
    if (/piwnic|dzia[łl]k|grunt|przynale[żz]|kondygnacj|zabudowy/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (v) return v;
  }
  return null;
}

/** Plot area for a "zabudowana" (whole-building) sale: "o powierzchni X ha" ->
 *  m2 (x10 000, rounded), or null. */
export function plotAreaHaFromText(text) {
  const m = /o\s+powierzchni\s+([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

// ---- result outcome ---------------------------------------------------------

/** Achieved price: "za cenę/stawkę (brutto|netto)? X zł" — present only when
 *  clause 5 was actually filled in (a SOLD auction). Returns null on a blank
 *  clause 5 (dots) or when OCR garbled the phrase beyond recognition. */
export function achievedPriceFromResult(text) {
  const m = /za\s+(?:cen[ęe]|staw[kc][ęe])\s*(?:brutto|netto)?\s*([\d][\d.,\s]*?)\s*z[łl]/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

/** A company registration block (NIP/REGON) right after "Podpis wygrywającego
 *  przetarg:" — the winner's letterhead/stamp. Used as a fallback SOLD signal
 *  when the achieved-price line itself is too OCR-garbled to parse (verified
 *  live: a genuine SOLD building-sale protocol whose price line OCR'd to
 *  noise, but the winner's "Przedsiębiorstwo Budowlane ... NIP 774-24-70-489,
 *  REGON 611318918" letterhead survived cleanly — see fixtures). */
export function hasWinnerRegistrationBlock(text) {
  const idx = (text || '').search(/Podpis\s+wygrywaj/i);
  if (idx < 0) return false;
  const tail = text.slice(idx, idx + 400);
  return /\bNIP[\s:.-]*\d{3}|\bREGON[\s:.-]*\d{6,}/i.test(tail);
}

/** True when the protocol explicitly states the negative-outcome clause.
 *  Informational only (used to label `unsold_reason`) — NEVER authoritative
 *  on its own, since the template prints this boilerplate unconditionally
 *  regardless of the real outcome (see header note). */
export function isNegativeResult(text) {
  return /wynikiem\s+negatywn|brak\s+(?:uczestnik[oó]w|nabywc[oó]w)/i.test(text || '');
}

// ---- announcement (crawlActive) --------------------------------------------

/**
 * Parse one ANNOUNCEMENT into an active-listing record, or null (rental/
 * procurement noise, land, or an unparseable address).
 * @param {{title:string, bodyText?:string, pdfText?:string,
 *   detailUrl?:string, publishedDate?:string|null}} input
 * @returns {object|null}
 */
export function parseAnnouncement({ title, bodyText = '', pdfText = '', detailUrl, publishedDate = null }) {
  if (!isSaleTitle(title)) return null;
  const kind = classifyKind(title);
  if (kind === 'grunt' || kind === 'unknown') return null; // out of scope / unrecognised

  const combined = `${title}\n${bodyText}\n${pdfText}`;
  const unitNo = unitNoFromText(title) || unitNoFromText(combined);
  const address_raw = addressRawFromTitle(title, unitNo);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const starting_price_pln = startingPriceFromText(combined);
  const auction_date = auctionDateFromText(combined);
  const wadium_deadline = wadiumDeadlineFromText(combined);
  const area_m2 = kind === 'zabudowana' ? null : flatAreaFromText(combined);
  const land_area_m2 = kind === 'zabudowana' ? plotAreaHaFromText(combined) : null;

  return {
    kind,
    address_raw,
    address,
    area_m2,
    ...(land_area_m2 != null ? { land_area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round: null,
    published_date: publishedDate,
    ...(wadium_deadline ? { wadium_deadline } : {}),
    detail_url: detailUrl || null,
    source_url: detailUrl || null,
  };
}

// ---- result (crawlResultDocs) ----------------------------------------------
//
// crawl.js builds `text` as "TYTUL: <notice title>\n\n<body>\n\n<pdf/ocr
// text>" so parseResultDoc stays self-contained under the registry's fixed
// (text, auction_date, pdf_url) contract while still using the clean TITLE
// for kind/address (see the header note) and the full text for price/date/
// outcome.

const TITLE_MARKER_RE = /^TYTUL:\s*(.*)$/m;

/**
 * @param {string} text        "TYTUL: <title>\n\n<body>\n\n<pdf/ocr text>"
 * @param {string|null} fallbackDate  ISO date from the board (rarely needed —
 *   the protocol restates its own date, see resultDateFromText)
 * @param {string} sourceUrl    the notice detail-page URL (provenance)
 * @returns {Array<object>}    0 or 1 record
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  const title = TITLE_MARKER_RE.exec(t)?.[1] ?? '';
  if (!isSaleTitle(title)) return [];
  const kind = classifyKind(title);
  if (kind === 'grunt' || kind === 'unknown') return [];

  const unitNo = unitNoFromText(title) || unitNoFromText(t);
  const address_raw = addressRawFromTitle(title, unitNo);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const achieved = achievedPriceFromResult(t);
  const winnerBlock = achieved == null && hasWinnerRegistrationBlock(t);
  const sold = achieved != null || winnerBlock;
  const starting_price_pln = startingPriceFromText(t);
  const auction_date = fallbackDate || resultDateFromText(t) || null;
  const area_m2 = kind === 'zabudowana' ? null : flatAreaFromText(t);
  const land_area_m2 = kind === 'zabudowana' ? plotAreaHaFromText(t) : null;

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (winnerBlock) {
    notes.push(
      'achieved price unrecoverable (OCR); inferred SOLD from a winner registration block (NIP/REGON) after the signature line',
    );
  }

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      detail_url: sourceUrl,
      source_url: sourceUrl,
      kind,
      address_raw,
      address,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : isNegativeResult(t) ? 'no_bidders' : 'unknown',
      area_m2,
      ...(land_area_m2 != null ? { land_area_m2 } : {}),
      notes,
    },
  ];
}
