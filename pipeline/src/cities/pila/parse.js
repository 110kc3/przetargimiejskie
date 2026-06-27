// Piła parsers.
//
// Every announcement on bip.pila.pl is a PDF attachment ("Treść ogłoszenia")
// on the BIP article page. The PDF contains a TABLE with columns:
//
//   Col 1: Położenie / oznaczenie wg KW i katastru / powierzchnia
//          → "Piła, ul. 11 Listopada 39/8"
//            "lokal mieszkalny nr 8 w budynku przy ul. … wraz z udziałem …"
//            "nieruchomość oznaczona geodezyjnie nr działki 242/44 (obręb 18)"
//            "powierzchnia działki: 0,0251 ha"
//   Col 2: Opis nieruchomości, przeznaczenie ...
//          → "lokal o powierzchni użytkowej 47,40 m2 składający się z: ..."
//   Col 3: Forma zbycia
//          → "lokal mieszkalny na własność …"
//   Col 4: Cena wywoławcza (netto)
//          → "167 000,00 zł"
//   Col 5: Wysokość wadium
//          → "33 400,00 zł"
//
//  Below the table:
//    "PRZETARG ODBĘDZIE SIĘ 17 LIPCA 2026 R. O GODZ. 9:00 …"
//
// pdftotext -layout preserves the table columns as space-separated text on the
// same line. The address in col 1 ("Piła, ul. 11 Listopada 39/8") appears at
// the start; the price appears far to the right on the same logical line.
//
// Multi-flat batches: the table has multiple rows (one per lokal). Each row
// parses as a separate record. Single-flat: one row.
//
// Result notices (post-auction):
// These are added as separate PDF attachments to the same article page.
// Their filename or label contains "wynik". The text structure follows the
// standard Polish municipal auction result format:
//   "Informacja o wyniku przetargu" header
//   Property description (address + lokal nr)
//   "Cena wywoławcza: NNN zł"
//   "Cena osiągnięta w przetargu: NNN zł" (if sold)  OR  "wynik negatywny" (unsold)
//
// Groundtruthed against live extraction 2026-06-27:
//   Announcement PDF: bip.pila.pl/files/file_add/download/11503_ogloszenie...pdf
//   → ul. 11 Listopada 39/8, area 47.40 m², price 167 000 zł, date 2026-07-17, round 1

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- shared helpers ----------------------------------------------------------

const PL_MONTHS = {
  stycznia: 1, 'styczeń': 1, styczen: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, 'kwiecień': 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, 'sierpień': 8, sierpien: 8,
  'września': 9, 'wrześień': 9, wrzesnia: 9, wrzesien: 9,
  'października': 10, 'październik': 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, 'grudzień': 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "167 000,00 zł" / "167.000,00" / "167000" → integer PLN.
// Handles space-thousands (regular + non-breaking space) and comma-grosze.
function parsePLN(s) {
  if (!s) return null;
  // Remove all whitespace, then strip optional ",NN" grosze
  const cleaned = String(s).replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "47,40" / "47.40" → 47.40
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---- title / kind routing (for the index list) ------------------------------

/**
 * True when an index entry's NAZWA title should be skipped entirely.
 * Skips: land (gruntow/dzialka), leases (najem/dzierzawa), commercial-only,
 * ruchomosci, cancellations/corrections.
 * Does NOT skip if title contains "lokal mieszkalny" (handles mixed batches).
 */
export function isSkippableTitle(title) {
  const t = (title || '').toLowerCase();
  // Always skip leases
  if (/\bnajem\b|dzier[zzżź]aw/i.test(t)) return true;
  // Skip ruchomosci (movables). Use negative lookbehind to avoid matching the
  // "ruchomo" substring inside "nieruchomosci" (real-estate = nieruchomosc).
  if (/(?<!nie)ruchomo/i.test(t)) return true;
  // Skip if clearly land/grunt-only (no residential flat mentioned)
  if (/nieruchomo\S*\s+gruntow|dzia[lł]k|gruntow/i.test(t) &&
      !/lokal\S*\s+mieszkaln/i.test(t)) return true;
  // Skip cancellations / corrections
  if (/odwo[lł]ani|uniewa[zżź]ni|sprostowanie/i.test(t)) return true;
  return false;
}

/**
 * True when the title looks like a flat-auction announcement (the primary
 * kind this adapter targets). Also returns true for mixed batches that include
 * residential locals.
 */
export function isFlatAnnouncementTitle(title) {
  return /lokal\S*\s+mieszkaln/i.test(title || '');
}

// ---- PDF text: announcement -------------------------------------------------

/**
 * True when a PDF's text body is a result notice rather than an announcement.
 * Pila result notices open with "Informacja o wyniku przetargu" or similar.
 */
export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wynik/i.test(text || '');
}

/**
 * Auction round from the announcement header. Pila uses word ordinals:
 *   "oglasza pierwszy przetarg" -> 1
 *   "oglasza przetargi …" (no ordinal, multi-flat batch) -> 1 (default)
 * Result notice: "o wyniku pierwszego / drugiego przetargu" -> same ordinal.
 */
export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[aą]t|sz[oó]st)\w*\s+(?:\w+\s+){0,4}?przetarg/i.exec(t);
  if (!m) return /\bprzetarg/i.test(t) ? 1 : null;
  const stem = m[1]
    .replace(/ą/g, 'a').replace(/ó/g, 'o').replace(/ę/g, 'e');
  if (/^pierwsz/.test(stem)) return 1;
  if (/^drug/.test(stem)) return 2;
  if (/^trzeci/.test(stem)) return 3;
  if (/^czwart/.test(stem)) return 4;
  if (/^piat/.test(stem)) return 5;
  if (/^szost/.test(stem)) return 6;
  return 1;
}

/**
 * Auction date. Pila states it in CAPS below the table:
 *   "PRZETARG ODBEDZIE SIE 17 LIPCA 2026 R. O GODZ. 9:00 …"
 * Also handles lowercase: "Przetarg odbedzie sie 17 lipca 2026 r."
 * -> ISO date or null.
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  // Primary: anchor on "PRZETARG ODBEDZIE SIE" (or lowercase) + date
  let m = /przetarg\w*\s+odb[eę]dzie\s+si[eę]\s+(\d{1,2})\s+([\wąćęłńóśżźŃĄĘÓŚŁŻŹĆ]+)\s+(\d{4})/i.exec(text);
  if (!m) {
    // Secondary: "odbedzie sie" anywhere followed quickly by a date
    m = /odb[eę]dzie\s+si[eę][^.]{0,30}?(\d{1,2})\s+([\wąćęłńóśżźŃĄĘÓŚŁŻŹĆ]+)\s+(\d{4})/i.exec(text);
  }
  if (!m) return null;
  const mo = PL_MONTHS[m[2].toLowerCase()];
  if (!mo) return null;
  return iso(m[3], mo, m[1]);
}

/**
 * Starting (asking) price from the announcement PDF.
 * In the PDF table the price appears after the property description.
 * The live PDF (2026-06-27) has "Cena wywolawcza\n167 000,00 zl" format —
 * label on one line, value on the next. A footnote superscript "1" may appear
 * inline ("(netto)1") and must not be captured as part of the price.
 * Strategy: find the "cena wywolawcza" label, then scan lines forward for the
 * first number >= 1000 followed by "zl".
 * -> integer PLN or null.
 */
export function startingPriceFromText(text) {
  if (!text) return null;
  // "wynosi … NNN zl" (common in result notices and some announcement phrasings)
  const wynosiM = /wynosi\s+([\d][\d\s]*(?:,\d{2})?)\s*z[lł]/i.exec(text);
  if (wynosiM) {
    const val = parsePLN(wynosiM[1]);
    if (val && val >= 1000) return val;
  }
  // "cena wywolawcza" label: find where it appears, scan lines forward.
  // The label appears in the table HEADER which is above the first "Pila," data row.
  // After splitPdfIntoRows(), the per-row text starts with the data line and does
  // NOT include the header — so the label search may miss. Fall through to row scan.
  const labelIdx = text.search(/cena\s+wywo[lł]awcz/i);
  if (labelIdx >= 0) {
    const region = text.slice(labelIdx, labelIdx + 300);
    const afterLabel = region.replace(/^cena\s+wywo[lł]awcz\w*/i, '');
    for (const line of afterLabel.split('\n')) {
      const lm = /([\d][\d ]*(?:,\d{2})?)\s*z[lł]/i.exec(line);
      if (!lm) continue;
      const val = parsePLN(lm[1]);
      if (val && val >= 1000) return val;
    }
  }
  // Fallback: in the per-row text (post-split), the cena wywolawcza is the FIRST
  // price >= 1000 zl that appears on the first "Pila," line of the table row.
  // The deposit (wadium) appears as the second price on the same line.
  // Scan lines from the start; pick the first price >= 1000.
  for (const line of text.split('\n')) {
    const lm = /([\d][\d ]*(?:,\d{2})?)\s*z[lł]/i.exec(line);
    if (!lm) continue;
    const val = parsePLN(lm[1]);
    if (val && val >= 1000) return val;
    break; // only look at the first line that has any price
  }
  return null;
}

/**
 * Achieved price from a result notice:
 *   "Cena osiagnieta w przetargu: 170 000,00 zl"
 * -> integer PLN or null.
 */
export function achievedPriceFromText(text) {
  const m =
    /osi[aą]gni[eę]t\w*\s+w\s+przetargu\s*[:\-–]?\s*([\d][\d\s]*(?:,\d{2})?)\s*z[lł]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/**
 * Usable floor area of the flat.
 * The Pila PDF states: "lokal o powierzchni uzytkowej 47,40 m2 skladajacy sie z:"
 * Anchored on "powierzchni uzytkowej" — takes the FIRST numeric value after it.
 * -> number (m2) or null.
 */
export function unitAreaFromText(text) {
  if (!text) return null;
  // Anchored on "lokal o powierzchni uzytkowej" or "powierzchni uzytkowej" alone
  const m =
    /lokal\w*\s+(?:o\s+)?powierzchni\w*\s+u[zżź]ytkow\w*\s+([\d,.\s]+?)\s*m\s*[2²]/i.exec(text) ||
    /powierzchni\w*\s+u[zżź]ytkow\w*\s+([\d,.]+)\s*m\s*[2²](?!\d)/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

/**
 * Extract address from the Pila announcement PDF.
 *
 * The PDF col-1 text rendered by pdftotext contains the address in two forms:
 *   (a) "Pila, ul. 11 Listopada 39/8"  (complete street/bldg/apt)
 *   (b) "lokal mieszkalny nr 8 w budynku przy ul. 11 Listopada 39 w Pile"
 *
 * We prefer (a) because it already has the "/apt" form parseAddress handles.
 *
 * @param {string} text  the full or per-row PDF text
 * @returns {import('../../core/normalize.js').ParsedAddress|null}
 */
export function addressFromPdfText(text) {
  if (!text) return null;

  // (a) "Pila, ul. <Street> <Bldg>/<Apt>" — the standard first-cell line
  let m = /Pi[lł]a,\s*(?:ul\.\s*|al\.\s*|os\.\s*|pl\.\s*)?(\w[\wąćęłńóśżźŃ\s.'\\-]+?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/i.exec(text);
  if (m) {
    const raw = `ul. ${m[1].trim()} ${m[2]}/${m[3]}`;
    const addr = parseAddress(raw);
    if (addr) return addr;
  }

  // (b) "lokal mieszkalny nr <apt> w budynku przy ul. <Street> <Bldg>"
  m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)\s+[\wąćęłńóśżź\s,]*przy\s+(?:ul\.\s*|al\.\s*|os\.\s*|pl\.\s*)?([A-ZŁŚĆĘĄÓŹŻŃ][\wąćęłńóśżź\s.'\\-]+?)\s+(\d+[A-Za-z]?)\s*(?:w\s+Pil|,|$)/i.exec(text);
  if (m) {
    const raw = `ul. ${m[2].trim()} ${m[3]}/${m[1]}`;
    const addr = parseAddress(raw);
    if (addr) return addr;
  }

  return null;
}

// ---- multi-flat PDF splitting ------------------------------------------------

/**
 * Split a multi-flat PDF text into per-flat chunks. Each chunk starts at a
 * "Pila, ul. …" / "Pila, al. …" line. Returns array of strings (length >= 1).
 * When no address anchor is found, returns the whole text as one element.
 *
 * @param {string} text  full pdftotext output
 * @returns {string[]}
 */
export function splitPdfIntoRows(text) {
  if (!text) return [''];
  const ANCHOR_RE = /^[ \t]*Pi[lł]a[,\s]/im;
  const indices = [];
  let match;
  const re = new RegExp(ANCHOR_RE.source, 'gim');
  while ((match = re.exec(text)) !== null) {
    indices.push(match.index);
  }
  if (indices.length === 0) return [text];
  return indices.map((start, i) => text.slice(start, indices[i + 1] ?? text.length));
}

// ---- main announcement parser -----------------------------------------------

/**
 * Parse the pdftotext output of one Pila announcement PDF and return an array
 * of structured listing records — one per flat.
 *
 * @param {string} text  pdftotext -layout output of the announcement PDF
 * @returns {Array<object>}  0..N records
 */
export function parseAnnouncementPdf(text) {
  if (!text) return [];

  // Round and auction date are document-level (one PDF = one auction session)
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);

  const rows = splitPdfIntoRows(text);
  const results = [];

  for (const rowText of rows) {
    const address = addressFromPdfText(rowText);
    if (!address) continue;

    const kind = classifyKind(rowText.slice(0, 400)) || 'mieszkalny';
    if (kind === 'grunt') continue; // land rows — not our stream

    const area_m2 = unitAreaFromText(rowText);
    const starting_price_pln = startingPriceFromText(rowText);

    results.push({
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: `ul. ${address.street} ${address.building}${address.apt ? `/${address.apt}` : ''}`,
      address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
    });
  }

  return results;
}

// ---- result notice parser ----------------------------------------------------

/**
 * Parse a result-notice PDF text. Standard Polish municipal format:
 *   "Informacja o wyniku [pierwszego/…] przetargu …"
 *   "na sprzedaz lokalu mieszkalnego nr N … przy ul. X Y/N …"
 *   "Cena wywolawcza: NNN zl"
 *   "Cena osiagnieta w przetargu: NNN zl"  OR  "wynik negatywny"
 *
 * VALIDATE on first live CI run against actual pdftotext output.
 *
 * @param {string} text  pdftotext output of the result PDF
 * @param {string|null} fallbackDate  published_date from the article (fallback)
 * @param {string} sourceUrl  the PDF URL (stored in source_pdf)
 * @returns {Array<object>}  0 or 1 record per flat
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultNotice(text)) return [];

  const t = text.replace(/\r/g, '');
  const notes = [];

  // Auction date: "w dniu 17 lipca 2026 r. odbyl sie …"
  let auction_date = null;
  let dm = /w\s+dniu\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s*r\.?\s+odby[lł]/i.exec(t);
  if (!dm) dm = /(\d{1,2})\s+(\w+)\s+(\d{4})\s*r\.?\s+odby[lł]/i.exec(t);
  if (dm) {
    const mo = PL_MONTHS[dm[2].toLowerCase()];
    if (mo) auction_date = iso(dm[3], mo, dm[1]);
  }
  if (!auction_date) auction_date = fallbackDate ?? null;

  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  const negativeStated =
    /wynik(?:iem)?\s+negatywn|nie\s+wy[lł]oniono\s+nabywcy|brak\s+uczestnik|brak\s+ofert/i.test(t);

  const sold = achieved != null;
  const outcome = sold ? 'sold' : 'unsold';
  const unsold_reason = sold ? null : 'unknown';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  // Try per-flat rows first (multi-flat batches); fall back to whole text
  const rows = splitPdfIntoRows(t);
  const records = [];

  for (const rowText of rows) {
    const address = addressFromPdfText(rowText);
    if (!address) {
      // Single-flat result: no "Pila," address anchor → try full text once
      if (rows.length === 1) {
        const addrFull = addressFromPdfText(t);
        if (!addrFull) break;
        const area_m2 = unitAreaFromText(t);
        const rowNotes = [...notes];
        if (addrFull.warning) rowNotes.push(addrFull.warning);
        records.push({
          auction_date,
          source_pdf: sourceUrl,
          kind: 'mieszkalny',
          address_raw: `ul. ${addrFull.street} ${addrFull.building}${addrFull.apt ? `/${addrFull.apt}` : ''}`,
          address: addrFull,
          round,
          starting_price_pln,
          final_price_pln: sold ? achieved : null,
          outcome,
          unsold_reason,
          area_m2,
          notes: rowNotes.length ? rowNotes : null,
        });
      }
      break;
    }

    const area_m2 = unitAreaFromText(rowText);
    const rowNotes = [...notes];
    if (address.warning) rowNotes.push(address.warning);

    records.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw: `ul. ${address.street} ${address.building}${address.apt ? `/${address.apt}` : ''}`,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome,
      unsold_reason,
      area_m2,
      notes: rowNotes.length ? rowNotes : null,
    });
  }

  return records;
}
