// Ostrołęka parsers.
//
// Source: the city BIP (bip.um.ostroleka.pl, Logonet CMS) publishes flat
// auctions as HTML detail pages, each carrying a `table table-borderless`
// metadata table (Adres / Przetarg na / Typ / Rodzaj nieruchomości / Cena
// wywoławcza / Data przetargu) plus SCANNED-image PDF attachments:
//   - "Ogłoszenie …"                 — the sale announcement (a scanned TABLE;
//                                       area/unit are hard to OCR reliably)
//   - "Informacja o wyniku …" /
//     "Wyniki przetargu …"           — the RESULT notice (scanned PROSE — OCRs
//                                       cleanly; the achieved-price stream)
//
// The result-notice OCR is clean, well-structured prose and is the authoritative
// per-flat record. Every regex below was groundtruthed against the REAL OCR text
// of live fixtures (attachments 28040 / 28374 / 28668 Żeromskiego 29/4 and 28147
// Warszawska 25B/2 — see tests/parse-ostroleka.test.js).
//
// Ostrołęka phrasings that differ from the shared analog (Tarnowskie Góry):
//   - achieved price is "Najwyższa cena nieruchomości wyniosła 64 400,00 zł"
//     (NOT "cena osiągnięta"); it appears ONLY when the flat sold.
//   - the unit number is "… oznaczonej numerem 4 …" / "… oznaczonej Nr 2 …"
//     (must not be confused with the działka "… numerem geodezyjnym 61869/4").
//   - starting price is "Cena wywoławcza nieruchomości wyniosła 125 400,00 zł".
//   - sold ⇔ "Nabywcą nieruchomości został/zostali <name>";
//     unsold ⇔ "Nikt nie wpłacił wadium" / "Nie ustalono nabywcy nieruchomości".
//
// NBSP note: the OCR/HTML uses regular AND non-breaking spaces as the thousands
// separator, so numeric char classes below allow   explicitly.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "125 400,00 zł netto= brutto" / "69.300,00 zł" / "87.923,00" -> integer PLN.
// Extracts the FIRST amount-shaped token (spaced OR dotted thousands; optional
// grosze ",00" or dash ",-") so a trailing "zł netto= brutto" / "plus 23% VAT"
// tail on an HTML "Cena wywoławcza" field is ignored, then strips separators.
export function parsePLN(numStr) {
  if (numStr == null) return null;
  const m = /(\d[\d.  ]*(?:,\d{2}|[.,]-)?)/.exec(String(numStr));
  if (!m) return null;
  const cleaned = m[1]
    .replace(/[\s. ]/g, '')
    .replace(/,\d{2}$/, '')
    .replace(/,?-$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "54,60" / "35.70" / "1 050" -> number. Usable floor area (m²).
export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- HTML parsing

/** Strip tags + collapse whitespace + unescape the few entities the BIP emits. */
function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Value of one `<th>label</th><td>…</td>` metadata row, or null. */
function metaRow(html, label) {
  const re = new RegExp(`${label}<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
  const m = re.exec(html);
  return m ? stripHtml(m[1]) : null;
}

/**
 * Parse the `table table-borderless` metadata (works on a detail page OR one
 * listing card — same markup). Returns the HTML-known fields.
 * @param {string} html
 * @returns {{ title:string|null, rodzaj:string|null, cena:string|null,
 *             auction_date:string|null }}
 */
export function parseMetaTable(html) {
  const h = String(html || '');
  const title = metaRow(h, 'Adres nieruchomości');
  const rodzaj = metaRow(h, 'Rodzaj nieruchomości');
  const cena = metaRow(h, 'Cena wywoławcza');
  // The auction date lives in a <time datetime="…"> inside the "Data przetargu"
  // row; take the first <time> after that label (later <time>s are publish
  // dates on the detail page).
  const dm = /Data przetargu[\s\S]*?datetime="([^"]+)"/i.exec(h);
  const auction_date = dm ? dm[1].slice(0, 10) : null;
  return { title, rodzaj, cena, auction_date };
}

/**
 * All `/attachments/download/<id>` links with their (stripped) link text.
 * @param {string} html
 * @returns {Array<{ url:string, id:string, label:string }>}
 */
export function parseAttachments(html) {
  const out = [];
  const re = /href="([^"]*attachments\/download\/(\d+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html || ''))) !== null) {
    out.push({ url: m[1], id: m[2], label: stripHtml(m[3]) });
  }
  return out;
}

/** True for a result-notice attachment ("Informacja o wyniku …" / "Wyniki …"). */
export function isResultAttachment(label) {
  return /wynik/i.test(label || '');
}

/** True for a sale-announcement attachment ("Ogłoszenie …"). */
export function isAnnouncementAttachment(label) {
  return /og[łl]oszeni/i.test(label || '');
}

// -------------------------------------------------------------- shared fields

const ROUND_WORDS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5, 'piąt': 5 };

/** Round from a word ordinal qualifying "przetarg" ("drugiego przetargu" -> 2,
 *  "DRUGI PRZETARG USTNY" -> 2, "o trzecim przetargu" -> 3). null when unstated
 *  (a first-round notice carries no ordinal). */
export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(text || '');
  if (!m) return null;
  return ROUND_WORDS[m[1].toLowerCase()] ?? null;
}

// Street + building from the result-notice body. Two phrasings live:
//   "… przy ul. Stefana Żeromskiego 29, oznaczonej numerem 4 …"
//   "… położonej przy ul. Warszawskiej 25B w Ostrołęce (róg …)"
// The building number is required (address-keyed record). Stop the street at the
// first following number so it never swallows the building digits.
const STREET_RE =
  /przy\s+ul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)\b/i;

/** { street, building } from the result body, or null. OCR line-wraps the
 *  address ("Stefana\nŻeromskiego 29"), so collapse whitespace first. */
export function streetBuildingFromText(text) {
  const m = STREET_RE.exec(String(text || '').replace(/\s+/g, ' '));
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] };
}

// Flat unit number: "oznaczonej numerem 4" / "oznaczonej Nr 2". Anchored so the
// działka ("oznaczonej w ewidencji gruntów numerem geodezyjnym 61869/4") — where
// "oznaczonej" is followed by "w ewidencji", not a bare "Nr/numerem" — is never
// taken; a slash-bearing geodetic number is also excluded.
const UNIT_RE = /oznaczon\w*\s+(?:nr\.?|numerem)\s+(\d{1,3}[a-z]?)(?!\s*geodez)(?!\/)/i;

/** Flat unit number from the result body, or null. */
export function unitFromText(text) {
  const m = UNIT_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? m[1] : null;
}

// Usable floor area of the UNIT: "… oznaczonej numerem 4 o powierzchni użytkowej
// 54,60 m² …" / "… oznaczonej Nr 2 o pow. użytkowej 35,70 m* …". Anchored on the
// unit designation so the attached cellar ("pomieszczeniem przynależnym
// o powierzchni użytkowej 28,20 m²") — which comes AFTER — is never taken.
const UNIT_AREA_RE =
  /oznaczon\w*\s+(?:nr\.?|numerem)\s+\d{1,3}[a-z]?\s+o\s+(?:pow\.?|powierzchni)\s+u[żz]ytkow\w*\s+([\d  ]{1,7}[.,]\d{2})\s*m/i;

/** Usable floor area (m²) of the flat from the result body, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? parseArea(m[1]) : null;
}

// Starting price: "Cena wywoławcza nieruchomości wyniosła 125 400,00 zł".
const STARTING_RE =
  /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s+wynios[łl]a\s+([\d  .]+,\d{2})/i;

/** Starting price (PLN) from the result body, or null. */
export function startingPriceFromText(text) {
  const m = STARTING_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? parsePLN(m[1]) : null;
}

// Achieved price (SOLD only): "Najwyższa cena nieruchomości wyniosła 64 400,00 zł".
const ACHIEVED_RE =
  /najwy[żz]sza\s+cena\s+nieruchomo[śs]ci\s+wynios[łl]a\s+([\d  .]+,\d{2})/i;

/** Achieved price (PLN) — present only when the flat sold, else null. */
export function achievedPriceFromText(text) {
  const m = ACHIEVED_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? parsePLN(m[1]) : null;
}

// Result-notice auction date: "W dniu 15 października 2025 r. w Urzędzie Miasta".
// OCR sometimes glues the "W" to "dniu" ("Wdniu"/"Wdhniu"), so the anchor
// tolerates 0-2 stray letters between "W" and "…niu".
const RESULT_DATE_RE =
  /W\s*d\w{0,2}niu\s+(\d{1,2})\s+([a-ząęółśżźćń]+)\s+(\d{4})/i;

/** ISO auction date from the result body, or null. */
export function resultDateFromText(text) {
  const m = RESULT_DATE_RE.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** True when the OCR text is a published result notice (not an announcement). */
export function isResultNotice(text) {
  return /informuje\s+o\s+wyniku/i.test(text || '');
}

// ------------------------------------------------------------- announcement /
// active-listing address (from the HTML metadata title)

/**
 * Turn the HTML "Adres nieruchomości" title into a parseAddress-ready raw
 * string. Strips the leading city name and normalizes "ulica" → "ul.".
 *   "Ostrołęka ul. Żeromskiego 29/4"        -> "ul. Żeromskiego 29/4"
 *   "Ostrołęka, ul. Żeromskiego 29/4"       -> "ul. Żeromskiego 29/4"
 *   "Ostrołęka ulica Warszawska 25B"        -> "ul. Warszawska 25B"
 * Returns null for a title without a street token.
 */
export function titleToAddressRaw(title) {
  if (!title) return null;
  let s = String(title).replace(/\s+/g, ' ').trim();
  s = s.replace(/^Ostro[łl][ęe]ka\s*,?\s*/i, '');
  s = s.replace(/\bulica\b/i, 'ul.');
  if (!/\bul\.|\bal\.|\bpl\.|\bos\./i.test(s)) return null;
  return s.trim();
}

/**
 * Build one ACTIVE-listing record from the HTML metadata (+ optional
 * announcement OCR for round/area). Address comes from the HTML title (reliable,
 * and carries the unit for the older "…/4" titles); starting price / kind /
 * auction date are HTML-known. Round is read from the announcement label/header;
 * usable area is best-effort from the scanned-table OCR (often absent).
 *
 * @param {{ title:string|null, rodzaj:string|null, cena:string|null,
 *           auction_date:string|null }} meta
 * @param {{ ocrText?:string, label?:string, detailUrl?:string }} [ctx]
 * @returns {object|null}
 */
export function buildActiveListing(meta, ctx = {}) {
  if (!meta) return null;
  const raw = titleToAddressRaw(meta.title);
  if (!raw) return null;
  const address = parseAddress(raw);
  if (!address) return null;
  const rodzajKind = classifyKind(meta.rodzaj || '');
  const kind = rodzajKind === 'unknown' ? 'mieszkalny' : rodzajKind;
  const roundSrc = `${ctx.label || ''} ${(ctx.ocrText || '').slice(0, 300)}`;
  return {
    kind,
    address_raw: raw,
    address,
    area_m2: unitAreaFromText(ctx.ocrText || ''),
    starting_price_pln: parsePLN(meta.cena),
    auction_date: meta.auction_date,
    round: roundFromText(roundSrc),
    detail_url: ctx.detailUrl || null,
  };
}

// -------------------------------------------------------------- result parse

/**
 * Parse one RESULT-notice OCR text into a concluded auction record. Single-flat.
 * Called by refresh.js as parseResultDoc(ocrText, ref.auction_date, ref.pdf_url)
 * because config.source === 'pdf' (refresh OCRs the scanned result PDF first).
 * Joins its announcement by address (+ unit) in build-properties.
 *
 * @param {string} text        OCR text of the result PDF
 * @param {string|null} fallbackDate  HTML "Data przetargu" (authoritative backup)
 * @param {string} sourceUrl   result PDF URL (provenance)
 * @returns {Array<object>}    0 or 1 record (array = framework interface)
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = String(text).replace(/\r/g, '');
  const notes = [];

  const sb = streetBuildingFromText(t);
  if (!sb) {
    notes.push('parse: no street/building in result body');
    return [];
  }
  const unit = unitFromText(t);
  const address_raw = unit
    ? `ul. ${sb.street} ${sb.building}/${unit}`
    : `ul. ${sb.street} ${sb.building}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const area_m2 = unitAreaFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  // SOLD ⇔ an achieved ("Najwyższa cena …") price is published; it appears only
  // when the flat sold. UNSOLD notices state "Nikt nie wpłacił wadium" /
  // "Nie ustalono nabywcy nieruchomości".
  const sold = achieved != null;
  let unsold_reason = null;
  if (!sold) {
    if (/nikt\s+nie\s+wp[łl]aci[łl]\s+wadium/i.test(t)) unsold_reason = 'brak wadium';
    else if (/nie\s+ustalono\s+nabywc/i.test(t)) unsold_reason = 'nie ustalono nabywcy';
    else unsold_reason = 'unknown';
  }

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (area_m2 == null) notes.push('parse: missing usable area');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason,
      area_m2,
      notes,
    },
  ];
}
