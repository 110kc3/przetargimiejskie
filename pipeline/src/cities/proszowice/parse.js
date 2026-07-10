// Proszowice parsers. proszowice.pl is a bespoke ASP city-portal CMS; both sale
// announcements and result notices are plain inline HTML article bodies (no
// PDF, no OCR) on the single "Nieruchomości gminne" board. Reuses
// core/finn-bip.js's htmlToText/areaFromText/auctionDateFromText/resolveKind
// and core/classify-kind.js/core/normalize.js; everything else below is
// Proszowice-specific, because Proszowice's own vocabulary deviates from the
// bochnia/olkusz/finn-bip norm in ways that silently break the shared helpers:
//
//   - SALE VERB: every real announcement/result uses "zbycie"/"zbyć" (dispose
//     of, transfer) — "sprzedaż" (sale) NEVER appears in an operative sentence
//     (confirmed: zero hits across 20+ real live bodies fetched 2026-07-10).
//     finn-bip's isSaleAuction/isFlatAuction and bochnia/olkusz's own gates all
//     hard-require "sprzeda" — reusing any of them unmodified would silently
//     drop every Proszowice listing. isSaleText() below gates on "zbyci" instead.
//   - ROUND ORDINALS: Proszowice auctions recur past round V (dz. 18/3 in
//     Wolwanowice reached IX; dz. 2274/2 reached VI) and always as SPELLED-OUT
//     Polish words, never Roman numerals. finn-bip's roundFromTitle only
//     resolves pierwszy..piąty (1-5) + Roman numerals, silently undercounting
//     rounds VI-IX to 1. roundFromText() below extends the ordinal table
//     through dziesiąty (10) and takes whichever ordinal occurs EARLIEST in the
//     title+body (the operative "ogłasza <ordinal> przetarg" / "Informacja o
//     przeprowadzonym <ordinal> przetargu" clause always precedes any later
//     prior-rounds history recap — verified against the real dz. 18/3 and dz.
//     2274/2 history sentences, which list every earlier round by name).
//   - PRICE TABLE TRAP (real bug, found + fixed): the 2026-vintage result
//     template renders an address/parcel/price TABLE. Flattened to text, its
//     header row ("...Cena wywoławcza brutto Udział ... Wadium ...") is
//     separated from its data row ("... KR1H/00009288/2   280.000,00 zł ...")
//     by ~120 chars, including a KW number ending "...288/2" immediately before
//     the real price. finn-bip's generic priceFromText (gap {0,140}, capture
//     class allows embedded whitespace) lets the trailing "2" of "…288/2" glue
//     across the intervening spaces into "280.000,00", producing 2280000
//     instead of 280000 — CONFIRMED empirically against the real live body of
//     https://proszowice.pl/aktualnosc-10934-informacja_o_pierwszym_przetargu_ustnym.html.
//     startingPriceFromText() below adds a `(?<!\/)` guard on the amount's
//     leading digit so a capture can never start immediately after a "/"
//     (which is exactly what every KW/parcel-number fragment ends with);
//     verified to reproduce identical (correct) output to the shared helper on
//     every OTHER fixture and to fix this one.
//
// Groundtruthed against REAL live bodies (verified 2026-07-10, all fetched
// directly from proszowice.pl — see tests/parse-proszowice.test.js header for
// the exact per-fixture provenance).

import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText as finnHtmlToText, parsePLN, areaFromText, auctionDateFromText, resolveKind,
} from '../../core/finn-bip.js';

// Proszowice's CMS entity-encodes "ó" (handled by the shared decoder already)
// but also uses a few entities the shared decoder doesn't know: &ndash; (en
// dash), &sect; (§), curly quotes, capital &Oacute;. Extended locally rather
// than touching core/finn-bip.js.
export function htmlToText(html) {
  return finnHtmlToText(html)
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&ndash;/gi, '-')
    .replace(/&sect;/gi, '§')
    .replace(/&[rl]dquo;/gi, '"')
    .replace(/&bdquo;/gi, '"');
}

// ---------------------------------------------------------------- title gates

export function isCancelledTitle(title) {
  return /odwo[łl]ani|uniewa[żz]ni/i.test(title || '');
}

export function isWykazTitle(title) {
  return /^\s*wykaz/i.test(title || '');
}

// Cheap board-level pre-filter (title only) — decides whether crawl.js bothers
// fetching an article at all, and which role to try first. The DEFINITIVE
// accept/reject gate is body-based (isSaleText/isLeaseText below), because a
// chunk of real announcements ("Ogłoszenie przetargu - lokal mieszkalny
// 70/53...") carry no round ordinal and no sale/lease hint in the title at all.
export function isAnnouncementTitle(title) {
  const t = title || '';
  if (isCancelledTitle(t) || isWykazTitle(t)) return false;
  return /^\s*og[łl]oszenie\b/i.test(t) && /przetarg/i.test(t);
}

export function isResultTitle(title) {
  const t = title || '';
  if (isCancelledTitle(t)) return false;
  return /^\s*informacja\b/i.test(t) && /przetarg/i.test(t);
}

// ------------------------------------------------------------- body-level gates

// The operative sale gate. Every genuine sale announcement/result says
// "zbycie"/"zbyć" somewhere; rentals ("na oddanie w najem", "na wynajem") never
// do. "sprzeda[żz]" is deliberately NOT required (see file header).
export function isSaleText(text) {
  return /zbyci|zbyci[ae]|zby[ćc]/i.test(text || '');
}

export function isLeaseText(text) {
  return /\bnajem\b|najmu|dzier[żz]aw|wynajem|najemc[ąa]/i.test(text || '');
}

// -------------------------------------------------------------- round ordinal

// Deliberately stops at 9 (dziewiąty) — "dziesiąty" (10th) has no safe stem:
// "dziesiąt" also matches the routine boilerplate "...zaokrągleniem w górę do
// pełnych DZIESIĄTEK złotych" (rounding to the nearest ten, present in nearly
// every announcement) AND the shared "-dziesiąt" suffix of every Polish
// decade word from 50 to 90 (pięćDZIESIĄT, sześćDZIESIĄT, ..., dziewięćDZIESIĄT)
// — which appears whenever a price's spelled-out form falls in that range
// (confirmed false-positive: dz. 18/3's 96 200 zł spells to "dziewięćdziesiąt
// sześć tysięcy..." and matched round 10 before this was found). No real
// Proszowice auction has been observed past round IX (dz. 18/3), so 10 is
// simply not worth the ambiguity.
const ORDINAL_PATTERNS = [
  [1, /pierwsz\w*/i], [2, /drug\w*/i], [3, /trzeci\w*/i], [4, /czwart\w*/i],
  [5, /pi[ąa]t(?!ek\b|ku\b)\w*/i], [6, /sz[óo]st\w*/i], [7, /si[óo]dm\w*/i],
  [8, /[óo]sm\w*/i], [9, /dziewi[ąa]t\w*/i],
];

// Takes the EARLIEST-occurring ordinal in the given text (not the first
// pattern in priority order) — both announcements and results state their
// OPERATIVE round before any later prior-rounds history recap ("Pierwszy
// przetarg ... odbył się w dniu ..., drugi przetarg ... odbył się ...", which
// always trails the "ogłasza <ordinal> przetarg" opening). Falls back to round
// 1 when "przetarg" appears with no ordinal at all (the older result/announcement
// template genuinely omits it).
export function roundFromText(text) {
  const t = text || '';
  let best = null;
  let bestIdx = Infinity;
  for (const [n, re] of ORDINAL_PATTERNS) {
    const m = re.exec(t);
    if (m && m.index < bestIdx) { bestIdx = m.index; best = n; }
  }
  if (best) return best;
  return /przetarg/i.test(t) ? 1 : null;
}

// ------------------------------------------------------------------- pricing

// Starting price ("cena wywoławcza"). See file header for the KW-number
// price-table trap this guards against. `(?<!\/)` blocks a capture from
// starting immediately after a "/", which is exactly how every KW/parcel
// fragment ("...288/2", "72/4") ends right before the real amount in the
// table-flattened result template.
export function startingPriceFromText(text) {
  const m = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,160}?(?<!\/)(\d[\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Achieved price — the older result template's "Cena ustalona w przetargu
// <kwota> złotych" (distinct from cena wywoławcza when a postąpienie occurred).
export function achievedPriceFromText(text) {
  const m = /cena\s+ustalona\s+w\s+przetargu\s*[:\-–]?\s*(?<!\/)(\d[\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ------------------------------------------------------------------- outcome

// Positive/sold: either explicit ("uważa się za zakończony wynikiem
// pozytywnym") or evidenced by a named buyer, in either template's phrasing
// ("Nabywcą nieruchomości została <Imię>" / "Osoba ustalona jako nabywca w
// przetargu <Imię>"). Deliberately does NOT match "Najemcą ... została <Imię>"
// (a rental result) — isLeaseText() is checked first by parseResultDoc anyway,
// but the buyer-stem is "nabywc", never "najemc", so there is no overlap.
export function isSoldOutcome(text) {
  return /nabywc[ąa]\s+(?:nieruchomo[śs]ci\s+)?(?:zosta[łl]|zostali|zosta[łl]y)|osoba\s+ustalona\s+jako\s+nabywca|wynikiem\s+pozytywnym/i.test(text || '');
}

export function isUnsoldOutcome(text) {
  return /wynikiem\s+negatywnym|nikt\s+nie\s+wp[łl]aci[łl]\s+wadium|nie\s+wp[łl]acono\s+wadium|brak\s+(?:ofert|oferent)|nie\s+wy[łl]oniono/i.test(text || '');
}

// ---------------------------------------------------------------- flat address

// Apartment number: "lokalu mieszkalnego {nr|numer} <apt>" (both forms seen).
const APT_RE = /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i;

// Building + street: "w budynku [wielorodzinnym] {nr|numerze porządkowym}
// <bldg> przy ul(icy) <Street> w Proszowicach" — building number BEFORE the
// street (unlike finn-bip's default "przy ul. X 12" pattern), with a variable
// adjective ("wielorodzinnym") between "budynku" and its number that breaks
// finn-bip's own building-first pattern (which requires "budynku" immediately
// followed by "nr").
//
// The street's leading-char class allows a DIGIT too (real bug, found via the
// live smoke test): "ul. 3 Maja" (May 3rd Constitution Day — an extremely
// common Polish street name, and literally the Urząd's own street) starts
// with "3", not a capital letter, so a letter-only class silently dropped
// every "ul. 3 Maja NN/N" flat (confirmed live: aktualnosc-7730, ul. 3 Maja
// 61/8, 160 000 zł). Safe to allow here specifically because this regex is
// anchored to the "budynku ... nr <bldg> przy ul. <street>" property clause,
// which never wraps the office's own "w siedzibie ... ul. 3 Maja 72" mention
// (a differently-shaped sentence with no "budynku" at all) — so this can't
// pick up the office address instead of the property's.
const BUILDING_STREET_RE =
  /budynku\w*(?:\s+[a-ząćęłńóśźż]+)?\s+(?:o\s+numerze\s+porz[ąa]dkowym|nr\.?|numer)\s*(\d+[A-Za-z]?)\s+przy\s+(?:ul\.|ulicy)?\s*([A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ0-9.\- ]+?)(?=\s+w\s+[A-ZŻŹĆŁŚ]|\s+wraz|\s+o\s+pow|[,.;]|$)/i;

export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt = APT_RE.exec(src)?.[1] || null;
  const b = BUILDING_STREET_RE.exec(src);
  if (!b) return null;
  const building = b[1].toUpperCase();
  const street = b[2].replace(/\s+/g, ' ').trim();
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

// ----------------------------------------------------------------- land / grunt

// "działki [o] {numerze ewidencyjnym|nr|numer [ewid.]} <NNN[/N]>[, <NNN>...]"
// — Proszowice inserts an extra "o " before "numerze ewidencyjnym" that the
// bochnia/olkusz parcel regexes don't allow for.
export function parcelFromText(text) {
  const t = text || '';
  const m =
    /dzia[łl][ekią]*\s+(?:o\s+)?numer(?:ze)?\s+ewidencyjn\w*\s+([\d]+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*(?:nr\.?\s*)?\d+(?:\/\d+)?)*)/i.exec(t) ||
    /dzia[łl][ekią]*\s+(?:o\s+)?(?:nr\.?|numer\w*)\s+(?:ewid\.?\w*\s+)?([\d]+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*(?:nr\.?\s*)?\d+(?:\/\d+)?)*)/i.exec(t);
  if (!m) return null;
  const nums = m[1].split(/\s*(?:,|i|oraz)\s*/).map((x) => x.replace(/^nr\.?\s*/i, '').trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

// Plot area is always given in hectares ("o powierzchni 0,0343 ha") — never m².
export function plotAreaFromText(text) {
  const m = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return v > 0 ? Math.round(v * 10000) : null;
}

// Village/town locality: "położonej w <Miejscowość>" (locative case, kept
// as-is — same "genitive/locative kept verbatim" convention used for street
// names elsewhere: Proszowice's own text never spells these in nominative).
export function locationFromText(text) {
  const m = /po[łl]o[żz]on\w*\s+w\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-ząćęłńóśźż]+)/.exec(text || '');
  return m ? m[1] : null;
}

// A handful of land plots are "zabudowana" (built) rather than pure grunt —
// e.g. Wolwanowice dz. 18/3, a former milk-collection point — and carry a
// rural house number instead of a street: "budynkiem o numerze porządkowym
// [<Village>] <nr>" (Polish villages address by house number alone, no
// street). classifyKind/resolveKind still resolves these as 'grunt' because
// the TITLE only ever says "działki" (parcel), never "zabudowanej" — the
// "zabudowanej budynkiem" phrase lives in the body — and resolveKind is
// intentionally title-first (see core/finn-bip.js resolveKind doc). Reused
// here only to enrich the land record's address, not to change its kind.
export function villageBuildingFromText(text) {
  const m = /budynkiem\s+o\s+numerze\s+porz[ąa]dkowym\s+(?:([A-ZŻŹĆŁŚĄĘÓŃ][a-ząćęłńóśźż]+)\s+)?(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? { village: m[1] || null, bldg: m[2].toUpperCase() } : null;
}

function landAddress(text) {
  const location = locationFromText(text);
  const vb = villageBuildingFromText(text);
  if (vb) {
    const village = vb.village || location;
    if (village) {
      const raw = `${village} ${vb.bldg}`;
      const address = parseAddress(raw);
      if (address) return { address_raw: raw, address };
    }
  }
  return location ? { address_raw: location, address: null } : { address_raw: null, address: null };
}

// --------------------------------------------------------------------- parsers

export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  const full = `${title} ${text}`;
  if (isLeaseText(full) || !isSaleText(full)) return null;

  const kind = resolveKind(title, text);
  const round = roundFromText(full);
  const auction_date = auctionDateFromText(full);
  const starting_price_pln = startingPriceFromText(full);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(full);
    const { address_raw, address } = landAddress(full);
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt', dzialka_nr, obreb: null, area_m2: plotAreaFromText(full),
      address_raw, address, starting_price_pln, auction_date, round,
      detail_url: url, source_url: url,
    };
  }

  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(full),
    starting_price_pln, auction_date, round, detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (isLeaseText(t)) return [];
  if (!/przetarg/i.test(t)) return [];

  const notes = [];
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const soldSignal = isSoldOutcome(t);
  const unsoldSignal = isUnsoldOutcome(t);
  const sold = soldSignal && !unsoldSignal;
  if (!soldSignal && !unsoldSignal) notes.push('parse: outcome not explicitly stated (assumed unsold)');
  if (sold && achieved == null) notes.push('parse: achieved price not stated; using cena wywoławcza (no postąpienie recorded)');
  const final_price_pln = sold ? (achieved ?? starting_price_pln) : null;

  // `text` arrives as `${title}. ${body}` (crawl.js folds the board title into
  // the result ref so round/kind detection stays robust). Recover that title
  // portion for resolveKind's title-first discipline: without it, a plot whose
  // TITLE only ever says "działki" (→ 'grunt', matching the announcement-side
  // classification) but whose BODY happens to mention "zabudowanej budynkiem"
  // (e.g. Wolwanowice dz. 18/3, a former milk depot) would flip to 'zabudowana'
  // for the RESULT only — inconsistent with its own announcement, and fatal
  // here since it would then miss the parcel-keyed 'grunt' branch entirely.
  const titleGuess = t.split(/\.\s/)[0] || '';
  const kind = resolveKind(titleGuess, t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const { address_raw, address } = landAddress(t);
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: null,
      area_m2: plotAreaFromText(t), address_raw, address, round,
      starting_price_pln, final_price_pln,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    }];
  }

  const addr = addressFrom('', t);
  if (!addr) return [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: areaFromText(t), notes,
  }];
}
