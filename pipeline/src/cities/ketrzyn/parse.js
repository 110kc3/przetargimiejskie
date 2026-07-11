// Kętrzyn parsers — announcement + result documents.
//
// Both streams are BORN-DIGITAL text (pdftotext -layout output from the PDFs
// attached to bip.miastoketrzyn.pl detail pages, OR the article HTML text of a
// standalone "Informacja o wyniku przetargu" card). The two document families
// share one highly regular structure, so both parsers reuse the same subject/
// area/price/date/address primitives.
//
// Groundtruthed 2026-07-11 against live documents (verbatim text captured from
// this Pi's Polish IP):
//
//   Announcement (flat, born-digital):
//     .../sprzedaz-lokalu-mieszkalnego-nr-1-.../gen.-wladyslawa-sikorskiego-72a-lok.-1.pdf
//     "…na sprzedaż lokalu mieszkalnego nr 1 o powierzchni 33,20 m², położonego
//      w budynku przy ul. Gen. Władysława Sikorskiego 72A w Kętrzynie … Cena
//      wywoławcza - 50 400,00 zł … Przetarg odbędzie się 28 maja 2026 r."
//   Result (flat, SOLD):
//     .../informacja-o-wyniku-przetargu-sikorskiego-72a-lok.-1.pdf
//     "…dnia 28 maja 2026 r. … Najwyższa cena osiągnięta w przetargu - 51 000,00
//      zł … nabywcą … został Pan Ireneusz Bladowski za kwotę 51 000,00 zł."
//   Result (commercial, NEGATIVE):
//     .../informacja-o-wyniku-przetargu-chrobrego-6-lok.-38.pdf  (lokal
//     niemieszkalny → 'uzytkowy'; "Przetarg zakończył się wynikiem negatywnym")
//   Announcement + Result (land):
//     .../s.-batorego-dz.-12.61.pdf / informacja-o-wyniku-przetargu-dz.-12.61.pdf
//     ("działki gruntu nr 12/61 … o pow. 0,3032 ha" → 'grunt', parcel-keyed)
//
// KIND is decided by the DOCUMENT BODY (classifyKind on the "na sprzedaż
// <subject>" phrase), never the URL slug or the card title — the source
// mislabels cards (e.g. a card titled "lokal mieszkalny nr 38" embeds a doc
// that reads "lokalu niemieszkalnego nr 38"), so classifying the isolated
// subject phrase is load-bearing.
//
// TRAPS handled: (1) the flat subject line also carries a land-SHARE area
// ("udział … w działce gruntu nr 39/5 o powierzchni 0,1980 ha") and later
// cellar areas ("piwnice o powierzchni 6,75 m²") — the subject area is bound to
// the FIRST "na sprzedaż … o pow. X" so those never win; (2) result docs carry
// a top "Kętrzyn, dnia 5 czerwca 2026 r." issue date AND a "…dnia 05.06.2026 r."
// noticeboard date — the auction date is taken only from the "informuje, że
// dnia D <miesiąc> YYYY" clause; (3) prices use space-thousands + comma-grosze
// with either a hyphen or an en-dash after the label.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── whitespace ───────────────────────────────────────────────────────────────

// pdftotext -layout wraps a single logical sentence across lines (e.g. "Gen.
// Władysława\nSikorskiego") and pads with runs of spaces; the docs are single-
// record so line structure carries no meaning — collapse it all to one space.
function norm(text) {
  return String(text == null ? '' : text)
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Diacritic-fold + lowercase (survives an extractor that drops ą/ę/ł/…). */
export function fold(s) {
  return norm(s)
    .toLowerCase()
    .replace(/[ąà]/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/[óò]/g, 'o')
    .replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

// ── money / area / month primitives ─────────────────────────────────────────

/**
 * Space-thousands, comma-grosze PLN → integer złoty. "50 400,00" → 50400,
 * "1 205 200,00" → 1205200. "brak" (and empty) → null. Grosze are discarded.
 * @param {string} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (s == null) return null;
  const str = norm(s);
  if (!str || /^brak$/i.test(str)) return null;
  const cleaned = str.replace(/[\s .]/g, ''); // drop space/nbsp/dot thousands
  const m = /^(\d+)(?:,\d{1,2})?/.exec(cleaned);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Area number (comma or dot decimal) + unit → m². ha is ×10 000. */
function areaToM2(numStr, unit) {
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/ha/i.test(unit)) return Math.round(n * 10000 * 100) / 100;
  return Math.round(n * 100) / 100;
}

/** Polish genitive month token → 'MM' (prefix-based, diacritic-tolerant). */
export function monthNum(token) {
  const t = fold(token);
  if (/^sty/.test(t)) return '01';
  if (/^lut/.test(t)) return '02';
  if (/^mar/.test(t)) return '03';
  if (/^kwi/.test(t)) return '04';
  if (/^maj/.test(t)) return '05';
  if (/^cze/.test(t)) return '06';
  if (/^lip/.test(t)) return '07';
  if (/^sie/.test(t)) return '08';
  if (/^wrz/.test(t)) return '09';
  if (/^pa[zd]/.test(t)) return '10';
  if (/^lis/.test(t)) return '11';
  if (/^gru/.test(t)) return '12';
  return null;
}

function isoFromDMY(d, monthToken, y) {
  const mo = monthNum(monthToken);
  if (!mo) return null;
  return `${y}-${mo}-${String(d).padStart(2, '0')}`;
}

// ── dates ────────────────────────────────────────────────────────────────────

/**
 * Auction date from an ANNOUNCEMENT body: "Przetarg odbędzie się 28 maja 2026 r."
 * (\S+ tolerance survives a diacritic-dropping extractor: "odbdzie si"). Does
 * NOT match the separate wadium deadline ("Wadium należy wnieść … do 22 maja").
 * @param {string} text @returns {string|null} ISO
 */
export function announceDate(text) {
  const t = norm(text);
  const m = /przetarg\s+odb\S+\s+si\S+\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  return m ? isoFromDMY(m[1], m[2], m[3]) : null;
}

/**
 * Auction date from a RESULT body: "…informuje, że dnia 28 maja 2026 r. o godz…".
 * Anchored on "informuje, że dnia" (primary) or "dnia D <miesiąc> YYYY r. o godz"
 * (fallback) so it never grabs the document's top issue date ("Kętrzyn, dnia 5
 * czerwca 2026 r.") or the numeric noticeboard date ("dnia 05.06.2026 r.").
 * @param {string} text @returns {string|null} ISO
 */
export function resultDate(text) {
  const t = norm(text);
  let m = /informuje,?\s+[żz]e\s+dnia\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  if (!m) m = /dnia\s+(\d{1,2})\s+([A-Za-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+o\s+godz/i.exec(t);
  return m ? isoFromDMY(m[1], m[2], m[3]) : null;
}

// ── round ────────────────────────────────────────────────────────────────────

/**
 * Auction round from the ordinal word before "przetarg ustny". "kolejny"
 * (subsequent, count unknown) and no ordinal both → null.
 * @param {string} text @returns {number|null}
 */
export function roundFromText(text) {
  const m = /(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|szóst\w*|szost\w*)\s+przetarg\s+ustn/i.exec(
    norm(text),
  );
  if (!m) return null;
  const w = fold(m[1]);
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  if (/^pia?t/.test(w)) return 5;
  if (/^szo?st/.test(w)) return 6;
  return null;
}

// ── outcome / notice guards ──────────────────────────────────────────────────

/** True when the text is a "Informacja o wyniku przetargu" result notice. */
export function isResultNotice(text) {
  const f = fold(text);
  return /informacj\w*\s+o\s+wyniku\s+przetargu/.test(f) ||
    (/wynik\w*\s+(?:przetargu|negatywnym)/.test(f) && /cena\s+osiagnieta|zostal\s+przeprowadzony/.test(f));
}

/** True when the auction ended without a sale (negative / no bidders). */
export function isNegativeOutcome(text) {
  const f = fold(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przystapil|nie\s+odnotowano\s+wplat|zakonczyl\s+sie\s+wynikiem\s+negatywnym/.test(f);
}

/** Defensive backstop — a cancelled/invalidated notice (NOT the standing
 *  "prawo odwołania" reservation clause). */
export function isCancelled(text) {
  const f = fold(text);
  if (/prawo\s+(?:do\s+)?odwolania/.test(f)) return false; // reservation clause, not a cancellation
  return /uniewazni|odwolanie\s+przetargu|odwoluje\s+przetarg|przetarg\s+zostal\s+odwolan|o\s+odwolaniu\s+przetargu/.test(f);
}

// ── prices ───────────────────────────────────────────────────────────────────

const MONEY = '(\\d[\\d \\u00a0.]*,\\d{2})';

/** "Cena wywoławcza - 50 400,00 zł" / "… – 205 200,00 zł" / inline "… 42 000,00 zł". */
export function startingPrice(text) {
  const m = new RegExp(`cena\\s+wywo[łl]awcza\\s*[-–—:]?\\s*${MONEY}`, 'i').exec(norm(text));
  return m ? parsePLN(m[1]) : null;
}

/**
 * Achieved price. "Najwyższa cena osiągnięta w przetargu - 51 000,00 zł" → 51000;
 * "… - brak" → null. Falls back to the "…za kwotę 51 000,00 zł" buyer clause.
 * @param {string} text @returns {number|null}
 */
export function achievedPrice(text) {
  const t = norm(text);
  const m = new RegExp(`najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetargu\\s*[-–—:]?\\s*(brak|${MONEY})`, 'i').exec(t);
  if (m && !/^brak$/i.test(m[1])) {
    const p = parsePLN(m[1]);
    if (p) return p;
  }
  const kw = new RegExp(`za\\s+kwot[ęe]\\s+${MONEY}`, 'i').exec(t);
  return kw ? parsePLN(kw[1]) : null;
}

/** Buyer name from "…nabywcą … został Pan/Pani NAME za kwotę …". The bounded
 *  [\s\S]{0,80}? span crosses the "ww. nieruchomości" abbreviation period. */
export function buyerName(text) {
  const m = /nabywc[ąa][\s\S]{0,80}?zosta[łl][ao]?\s+(Pan[i]?\s+[A-ZŚŁŻŹĆŃÓĄĘ][^,]{1,60}?)\s+za\s+kwot[ęe]/i.exec(norm(text));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// ── subject (kind + area + address/parcel) ───────────────────────────────────

// "na sprzedaż <subject> o [łącznej] pow[ierzchni] <X> <unit>" — the one phrase
// present in every announcement AND every result, carrying the subject + area.
const SUBJECT_RE =
  /na\s+sprzeda[żz]y?\s+(.+?)\s+o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*(\d+(?:[.,]\d+)?)\s*(m²|m2|m\b|ha)/i;

// Street + building from "…przy ul. STREET BLDG w Kętrzynie" (or before a comma/
// period). Land has no building number here, so this correctly fails for grunt.
const ADDR_RE =
  /przy\s+ul\.\s+(.+?)\s+(\d+[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)(?:\s+w\s+K[ęe]trzynie|\s*[,.])/i;

// Apartment/unit number from "lokalu (nie)mieszkalnego nr N".
const APT_RE = /lokal\w*\s+(?:nie)?mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;

function extractObreb(t) {
  const m = /obr[ęe]b\w*\s+(?:nr\s+)?\d+\s+(?:miasta\s+(K[ęe]trzyn)|w\s+miejscowo[śs]ci\s+([A-ZŁŚŻŹ][A-Za-ząćęłńóśźż-]+(?:\s+[A-ZŁŚŻŹ][A-Za-ząćęłńóśźż-]+)?))/i.exec(
    t,
  );
  if (!m) return null;
  if (m[1]) return 'Kętrzyn';
  return m[2] ? m[2].replace(/\s+/g, ' ').trim() : null;
}

function extractParcels(subject) {
  const nums = [...String(subject || '').matchAll(/\bnr\s+(\d+(?:\/\d+)?)/gi)].map((m) => m[1]);
  return nums.length ? [...new Set(nums)].join(', ') : null;
}

/**
 * Pull the kind + area + subject identity (address for address-kinds, parcel +
 * obręb for land) out of one announcement/result body.
 * @param {string} text
 * @returns {{ kind:string, subject:string|null, area_m2:number|null,
 *   address:object|null, address_raw:string|null, dzialka_nr:string|null,
 *   obreb:string|null }}
 */
export function extractSubject(text) {
  const t = norm(text);
  const sm = SUBJECT_RE.exec(t);
  const subject = sm ? sm[1].trim() : null;
  const area_m2 = sm ? areaToM2(sm[2], sm[3]) : null;
  const kind = classifyKind(subject || t.slice(0, 300));

  if (kind === 'grunt') {
    return {
      kind,
      subject,
      area_m2,
      address: null,
      address_raw: null,
      dzialka_nr: extractParcels(subject) || extractParcels(t),
      obreb: extractObreb(t),
    };
  }

  // Address-keyed (mieszkalny / uzytkowy / zabudowana / garaz / unknown).
  const am = ADDR_RE.exec(t);
  const aptM = APT_RE.exec(t);
  let address = null;
  let address_raw = null;
  if (am) {
    const street = am[1].replace(/\s+/g, ' ').trim();
    const building = am[2].replace(/\s+/g, '');
    const apt = aptM ? aptM[1] : null;
    address_raw = `${street} ${building}${apt ? `/${apt}` : ''}`;
    address = parseAddress(address_raw);
  }
  return { kind, subject, area_m2, address, address_raw, dzialka_nr: null, obreb: null };
}

// ── announcement parser ──────────────────────────────────────────────────────

/**
 * Parse one Kętrzyn announcement (auction on offer). Returns a single record,
 * or null when the text carries no recognisable auction subject.
 * @param {string} text  pdftotext output (or detail-HTML article text)
 * @param {{ detailUrl?:string, sourceUrl?:string, fallbackAuctionDate?:string|null }} [ctx]
 * @returns {object|null}
 */
export function parseAnnouncement(text, ctx = {}) {
  const t = norm(text);
  if (!t || !/przetarg/i.test(t) || !/sprzeda[żz]/i.test(t)) return null;

  const subj = extractSubject(t);
  if (!subj.address && !subj.dzialka_nr) return null; // no keyable subject

  return {
    kind: subj.kind,
    address_raw: subj.address_raw,
    address: subj.address,
    dzialka_nr: subj.dzialka_nr,
    obreb: subj.obreb,
    area_m2: subj.area_m2,
    starting_price_pln: startingPrice(t),
    auction_date: announceDate(t) || ctx.fallbackAuctionDate || null,
    round: roundFromText(t),
    cancelled: isCancelled(t),
    detail_url: ctx.detailUrl || null,
    source_url: ctx.sourceUrl || ctx.detailUrl || null,
  };
}

// ── result parser ────────────────────────────────────────────────────────────

/**
 * Parse one Kętrzyn "Informacja o wyniku przetargu" into a concluded-auction
 * record. Returns [] for non-result / empty input (defensive; the crawler is
 * the primary filter). Wrapped in an array to match the registry contract
 * (parseResultDoc → record[]).
 * @param {string} text  pdftotext output (or inline result-card HTML text)
 * @param {string|null} fallbackDate  ISO auction date from the crawl ref
 * @param {string|null} sourceUrl  provenance (PDF or detail URL)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  const t = norm(text);
  if (!t || !isResultNotice(t) || isCancelled(t)) return [];

  const subj = extractSubject(t);
  if (!subj.address && !subj.dzialka_nr) return []; // cannot key the row

  const negative = isNegativeOutcome(t);
  const achieved = negative ? null : achievedPrice(t);
  const starting = startingPrice(t);
  const sold = !negative && achieved != null;

  const notes = [];
  if (subj.address?.warning) notes.push(subj.address.warning);
  if (starting == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');
  if (sold && starting != null && achieved < starting) {
    notes.push('parse: achieved price below starting price — verify row');
  }
  const buyer = sold ? buyerName(t) : null;
  if (buyer) notes.push(`nabywca: ${buyer}`);

  return [
    {
      kind: subj.kind,
      address_raw: subj.address_raw,
      address: subj.address,
      dzialka_nr: subj.dzialka_nr,
      obreb: subj.obreb,
      area_m2: subj.area_m2,
      round: roundFromText(t),
      starting_price_pln: starting,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : negative ? 'negative_no_bidders' : 'unknown',
      auction_date: resultDate(t) || fallbackDate || null,
      source_pdf: sourceUrl,
      notes,
    },
  ];
}
