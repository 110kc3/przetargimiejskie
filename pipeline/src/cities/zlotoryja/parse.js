// Złotoryja parsers.
//
// Gmina Miejska Złotoryja (Burmistrz Miasta Złotoryja) sells municipal flats
// and land at `<ROMAN> (nieograniczony) przetarg ustny` and publishes them on
// `bip.zlotoryja.pl` — see config.js / crawl.js for the source-platform story
// (a modern Angular front-end backed by a JSON:API-shaped REST API, NOT the
// server-HTML bip.info.pl BIP the spike found — that legacy host is dead; see
// crawl.js header). crawl.js fetches each article's `title` + `content` (HTML)
// via the API and assembles them into ONE labelled blob via buildRecordText(),
// exactly like the chelmno/zgorzelec family; every parser below reads that
// blob. The test builds the SAME blob from real captured title+content
// strings, so the parsers are groundtruthed against live data.
//
// TWO SOURCES (both server-side JSON, unlike Chełmno's XML or Zgorzelec's
// HTML board):
//   Przetargi   (category id "przedmiotowe74") -> active announcements
//   Ogłoszenia  (category id "przedmiotowe5", filtered to titles containing
//               "wyniku") -> "Informacja o wyniku przetargu" result notices.
//   NOTE: the legacy idmp taxonomy (74 = Przetargi) survived the platform
//   migration verbatim in these category ids — "Zakończone" (przedmiotowe1)
//   was ALSO checked live and turned out to just re-list past-date
//   announcements with no outcome text; the real result stream lives in the
//   general "Ogłoszenia" board instead (verified 2026-07-10 — see crawl.js).
//   Because that board is NOT dedicated to property auctions (it also carries
//   job-posting and works-contract "wyniku" results), every result candidate
//   is put through the SAME isSaleAuction/isLease gates as announcements, on
//   top of the isResultDoc() title gate.
//
// All regexes groundtruthed against live documents (verified 2026-07-10):
//   LAND active, restricted round I (no "nieograniczony" — see roundFromText):
//     "OGŁASZA I PRZETARG USTNY NA SPRZEDAŻ NIERUCHOMOŚCI GRUNTOWEJ
//      NIEZABUDOWANEJ PRZY UL. GÓRNICZEJ W ZŁOTORYI OGRANICZONY DO
//      WŁAŚCICIELI NIERUCHOMOŚCI SĄSIEDNICH ... działka nr 207/5 o
//      powierzchni 0,0164 ha, położona w obrębie 0002 miasta Złotoryja przy
//      ul. Górniczej. ... Cena wywoławcza nieruchomości: 24 698 zł netto. ...
//      Termin i miejsce przetargu: 31 lipca 2026 r. godz. 9:00, ..."
//   LAND active round II (carries a PRIOR-ROUND-history trap the parser must
//   avoid): "OGŁASZA II NIEOGRANICZONY PRZETARG USTNY NA SPRZEDAŻ
//      NIERUCHOMOŚCI GRUNTOWEJ NIEZABUDOWANEJ PRZY UL. PIASTOWEJ ... działka
//      nr 156/9 o powierzchni 0,0755 ha położona w obrębie 0001 miasta
//      Złotoryja przy ul. Piastowej. ... Cena wywoławcza nieruchomości: 82
//      869 zł netto . ... Termin i miejsce przetargu: 30 lipca 2026 r. godz.
//      10:00, ... Terminy poprzednich przetargów: 05.03.2026 r. – I
//      przetarg." (that trailing sentence is a WORD/bare-"przetarg" trap with
//      no "ustny", so it can't win the round/date anchors below).
//   FLAT active round I: "I NIEOGRANICZONY PRZETARG USTNY NA SPRZEDAŻ LOKALU
//      MIESZKALNEGO ... Lokal mieszkalny nr 1 o powierzchni użytkowej 89,90 m
//      2 położony na parterze ... w budynku przy ul. Marszałka Józefa
//      Piłsudskiego 26 w Złotoryi. ... Cena wywoławcza nieruchomości: 254 237
//      zł brutto w tym: cena lokalu – 241 817 zł ... Termin i miejsce
//      przetargu: 7 maja 2026 r. godz. 10:00, ..."
//   FLAT result UNSOLD: "INFORMACJA O WYNIKU PRZETARGU I nieograniczony
//      przetarg ustny na sprzedaż lokalu mieszkalnego nr 1 wraz z udziałem w
//      częściach wspólnych budynku i prawie własności gruntu o powierzchni
//      użytkowej 89,90 m 2, położonego ... w budynku przy ul. Marszałka
//      Józefa Piłsudskiego 26 w Złotoryi, ... wyznaczony na dzień 7 maja 2026
//      r. o godz. 10:00 nie odbył się z uwagi na to, iż nikt nie przystąpił
//      do przetargu. ... Cena wywoławcza przedmiotowej nieruchomości wyniosła
//      254 237 zł brutto."
//   LAND result SOLD: "INFORMACJA O WYNIKU PRZETARGU W dniu 14 stycznia 2026
//      r. o godzinie 10:00 ... odbył się I nieograniczony przetarg ustny na
//      sprzedaż nieruchomości gruntowej niezabudowanej ... działka nr 173/43
//      ... położonej w obrębie 0002 miasta Złotoryja w okolicy ul.
//      Diamentowej ... Cena wywoławcza przedmiotowej nieruchomości wyniosła
//      196 665 zł netto, a najwyższa cena osiągnięta w przetargu to 198 635
//      zł netto. Nabywcą nieruchomości został Pan Artur Misaczek, ..."
//   LAND-WITH-GARAGE result SOLD (kindFromText override — see
//   LAND_GARAGE_RE): "...II nieograniczony przetarg ustny na sprzedaż
//      nieruchomości gruntowej zabudowanej garażem nr 36 ... działka nr
//      545/13 ... Najwyższa cena nieruchomości osiągnięta w przetargu
//      wyniosła 73 447,60 zł brutto (w tym cena działki nr 545/13 zabudowanej
//      garażem – 72 676,40 zł ...). Nabywcą nieruchomości zostali Państwo
//      Mariusz i Beata Turchan." — classify-kind's GARAGE_RE would otherwise
//      claim this as an address-keyed 'garaz' before the land check runs;
//      LAND_GARAGE_RE reclassifies "grunt...zabudowan...garaż" as 'grunt' so
//      it is correctly parcel-keyed (no street+number address exists to key
//      it by).
//   LEASE result (gate-exclusion fixture): "...odbył się I nieograniczony
//      przetarg ustny na dzierżawę części nieruchomości gruntowej
//      niezabudowanej ... Dzierżawcą nieruchomości został Pan Przemysław
//      Niedźwiecki ..." — excluded by isLease() (and independently by
//      isSaleAuction()'s missing "sprzedaż").
//
// The round is anchored on "<ROMAN> (nieograniczony) przetarg ustny" — the
// "nieograniczony" clause is OPTIONAL because a restricted auction ("...
// ograniczony do właścicieli nieruchomości sąsiednich") drops it. The prior-
// round history ("Terminy poprzednich przetargów: 05.03.2026 r. – I
// przetarg.") uses a bare "przetarg" with no "ustny", so it never matches.
// The auction date is anchored on "Termin i miejsce przetargu:" (announcement,
// future), "w dniu … odbył się" (result, sold — with a negative lookbehind so
// "nie odbył się" can't win it), or "wyznaczony na dzień … r." (result,
// unsold), so the wadium deadline and prior-round history dates never win.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "24 698" / "254 237" / "73 447,60" / "1 500 000,00" -> integer PLN. Space OR
// dot thousands separator; optional ",NN" grosze tail (dropped, like every
// other adapter in this repo — amounts are stored as whole złoty).
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "89,90" / "0,0164" / "755" -> number. Comma OR dot decimal; space stripped.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML fragment (the API's `content` field, or a plain title) to
 *  a single line of plain text. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#8221;|&#8222;|&#8220;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * API's `title` + `content` (HTML) fields; the test passes the raw captured
 * strings and lets stripHtml run. One line per field so `^LABEL:`
 * (multiline) reads each.
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

/** Read a single labelled line's value from the blob. The inter-label gap is
 *  matched with [ \t]* (NOT \s*) so an EMPTY field can't let the match slide
 *  across the newline and capture the next label's line. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/** TITLE + BODY concatenated — the searchable surface for anchored regexes. */
function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'BODY')}`.trim();
}

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a SALE auction ("… przetarg … na sprzedaż …").
 *  The Ogłoszenia board (results source) also carries job-posting / works-
 *  contract "wyniku" notices that share the "przetarg(u)" word but never
 *  "sprzedaż" (they use "naboru", "postępowania", or a non-property "przetarg
 *  nieograniczony na <usługę/dostawę>"), so this doubles as noise-exclusion
 *  for that board, not just the lease/works split it handles on Przetargi. */
export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

/** True when this is a DZIERŻAWA / NAJEM lease (rent), not a sale — skipped. */
export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$/i.test(t);
}

/** True when this looks like a "Informacja o wyniku"/result notice (title-
 *  anchored — the Ogłoszenia board's non-property noise mostly fails here
 *  already: "Informacja o wyniku NABORU/KONKURSU" and "Ogłoszenie o wyniku
 *  POSTĘPOWANIA" don't say "wyniku przetargu" or start with "informacja o
 *  wyniku" immediately followed by a przetarg clause). */
export function isResultDoc(text) {
  const t = whole(text);
  return /informacj\w*\s+o\s+wyniku\s+przetargu|wyniku\s+(?:\w+\s+)?przetargu|zosta[łl]\s+przeprowadzon|osi[ąa]gni[ęe]t/i.test(t);
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium|nie\s+odby[łl]\s+si[ęe]/i.test(t);
}

// ----------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XXXIX range used here) -> int, or null if malformed. */
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

/**
 * Auction round. Anchored on "<ROMAN> (nieograniczony) przetarg ustn…" — the
 * "nieograniczony" clause is OPTIONAL (a RESTRICTED auction, "ograniczony do
 * właścicieli nieruchomości sąsiednich", drops it: "I PRZETARG USTNY…" with
 * no "nieograniczony"). The prior-round history ("Terminy poprzednich
 * przetargów: 05.03.2026 r. – I przetarg.") uses a bare "przetarg" with no
 * "ustny" following, so it never matches. Returns null when unstated.
 */
export function roundFromText(text) {
  const m = /\b([IVXL]{1,5})\s+(?:nieograniczon\w*\s+)?przetarg\w*\s+ustn\w*/i.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}

// ----------------------------------------------------------------- date

/** "31 lipca 2026" (word month) or "01.07.2026" (numeric) -> ISO. */
function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

/**
 * Auction date. PRIMARY (announcement): "Termin i miejsce przetargu: 31
 * lipca 2026 r. godz. 9:00, …" — anchored on the literal label (singular
 * "Termin", not the prior-round-history "Terminy poprzednich przetargów:"
 * label, and distinct from the wadium deadline's "w nieprzekraczalnym
 * terminie do dnia …" clause). FALLBACK 1 (result, sold): "W dniu 14
 * stycznia 2026 r. o godzinie 10:00 … odbył się …" — a negative lookbehind
 * keeps "nie odbył się" (unsold) from matching here. FALLBACK 2 (result,
 * unsold): "wyznaczony na dzień 7 maja 2026 r. … nie odbył się". -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  let m = /Termin\s+i\s+miejsce\s+przetargu\s*:\s*([\s\S]{0,28})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /\bw\s+dniu\s+([\s\S]{0,24}?)\s*r\.[\s\S]{0,80}?(?<!nie\s)odby[łl]\s+si[ęe]/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /wyznaczon\w*\s+na\s+dzie[ńn]\s+([\s\S]{0,24}?)\s*r\./i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. Anchored on "cena wywoławcz(a|ej) [przedmiotowej]
 *  nieruchomości[:|wyniosła] <amount> zł" (announcement uses ":", result
 *  uses "wyniosła"). The no-digit gap keeps this from skipping past the
 *  first (=total) amount into a sub-component price ("w tym: cena lokalu –
 *  241 817 zł"). The wadium clause has its own separate "Wadium:" label, so
 *  it is never matched. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz[ae]\w*[^0-9]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is named ("… Nabywcą …", never true for
 *  a "Dzierżawcą" lease-taker), anchored on "najwyższa cena [nieruchomości]
 *  osiągnięta w przetargu (to|wyniosła) <amount> zł" — the FIRST amount
 *  after that clause, so a VAT sub-component breakdown in parentheses can't
 *  win. A numeric value ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /najwy[żz]sz[aą]\s+cen[aę][\s\S]{0,60}?osi[ąa]gni[ęe]t\w*[\s\S]{0,30}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

// A LAND parcel that happens to carry a garage structure ("nieruchomości
// gruntowej zabudowanej garażem … działka nr 545/13") is still a PARCEL sale
// (grunt) — classify-kind's GARAGE_RE would otherwise claim it as an
// address-keyed 'garaz' before the land check even runs, and such a notice
// has no street+number to key a 'garaz' record by, only a "przy ul. X" area
// reference. The mandatory "\s+" before "zabudowan" keeps the land NEGATIVE
// form ("gruntowej NIEzabudowanej") from tripping this override.
const LAND_GARAGE_RE = /grunt\w*\s+zabudowan\w*\s+gara[żz]/i;

/** Kind from the TITLE (unambiguous sale-object phrase) first, falling back
 *  to the full text; the land-with-garage override runs first (see
 *  LAND_GARAGE_RE). "lokalu mieszkalnego" → mieszkalny; "nieruchomości
 *  gruntowej niezabudowanej"/"Działka" → grunt. */
export function kindFromText(text) {
  const t = whole(text);
  if (LAND_GARAGE_RE.test(t)) return 'grunt';
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(t);
}

// ----------------------------------------------------------------- address

// Property street+building for FLATS/units — anchored on "położon…"/"w
// budynku" (within a generous gap, to bridge the room-layout / floor clause)
// followed by "przy ul. <STREET> <BLDG>". Deliberately "ul." ONLY (not
// "Pl.") — the office address ("Urząd Miejski w Złotoryi, pl. Orląt
// Lwowskich 1") uses "pl.", and no flat in this data sits on a Plac, so this
// also acts as a safety margin against ever capturing the office address.
const PROP_ADDR_RE =
  /(?:po[łl]o[żz]on\w*|w\s+budynku)[\s\S]{0,110}?przy\s+ul\.\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s+(\d+[A-Za-z]?)\b/i;

// Land street (no building) — same "położon…" anchor, "ul." OR "Pl.",
// connector "przy" OR "w okolicy", terminated before a comma / period /
// "w Złotoryi" / "który"/"której" / "dla której".
const LAND_STREET_RE =
  /po[łl]o[żz]on\w*[\s\S]{0,90}?(?:przy|w\s+okolicy)\s+(?:ul\.|Pl\.)\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)(?:\.|,|\s+w\s+Z[łl]otoryi|\s+dla\s+kt[óo]r|\s+kt[óo]r|$)/i;

/** Flat/unit number from "lokal(u) (nie)mieszkaln… nr <N>". */
function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat / commercial unit, or null. */
export function addressRawFromText(text) {
  const m = PROP_ADDR_RE.exec(whole(text));
  if (!m) return null;
  const street = m[1].trim().replace(/\s+/g, ' ');
  const building = m[2];
  const apt = unitNoFromText(text);
  return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
}

/** Land street name (for context/display on parcel-keyed records), or null. */
function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(whole(text));
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

// Usable floor area of the unit: "Lokal mieszkalny nr 1 o powierzchni
// użytkowej 89,90 m 2" (announcement, short gap) / "lokalu mieszkalnego nr 1
// wraz z udziałem w częściach wspólnych budynku i prawie własności gruntu o
// powierzchni użytkowej 89,90 m 2" (result, long gap — bridges the
// co-ownership clause). Anchored on the unit noun + number so the room
// breakdown ("kuchnia o pow. 18,85 m2") is never taken (it's the FIRST "o
// powierzchni użytkowej" after the unit-number anchor that wins).
const UNIT_AREA_RE =
  /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?\d+[A-Za-z]?[\s\S]{0,130}?o\s+powierzchni\s+u[żz]ytkow\w*\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m²) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// Parcel(s) + area for LAND records. Parcel from "działk… nr <N>[/<M>]"
// (case-insensitive). Area from the first "o [łącznej] powierzchni <N> ha"
// (hectares, converted to m²) or "… m²".
function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const reP = /dzia[łl]k\w*\s+nr\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const am = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction, Przetargi board) blob into a
 * single active record, or null. Land (kind 'grunt') → parcel-keyed record
 * for land.json; flats / commercial units → address-keyed record. The
 * Przetargi board is a DEDICATED property-auction board (unlike the results
 * source), so an unresolved kind safely defaults to 'mieszkalny' like the
 * chelmno/zgorzelec family.
 * @param {string} text  blob from buildRecordText
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED "Informacja o wyniku przetargu" blob (Ogłoszenia board,
 * filtered to "wyniku" titles) into a result record. Returns 0 or 1 record
 * (array = framework interface). Self-gates on isResultDoc/isSaleAuction/
 * isLease so it is safe to call directly against the noisy general board
 * (unlike the announcement parser's board, which is dedicated and already
 * pre-filtered by crawl.js) — an unresolved kind or a non-property/lease
 * notice returns [] rather than defaulting to 'mieszkalny'. Joins its
 * property by address (+ unit-no) or parcel + round in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  if (isLease(text)) return [];
  if (!isSaleAuction(text)) return [];

  const kind = kindFromText(text);
  if (kind === 'unknown') return [];

  const notes = [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_url: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
