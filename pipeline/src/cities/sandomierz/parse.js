// Sandomierz parsers. bip.um.sandomierz.pl (SkyCMS) article bodies are plain
// inline HTML (no PDF, no OCR). Reuses core/finn-bip.js body helpers
// (htmlToText, areaFromText, auctionDateFromText, roundFromTitle, addressFrom,
// resolveKind, parsePLN); the price + kind + land deviations below are
// Sandomierz-specific. Groundtruthed against REAL live bodies (verified
// 2026-07-10, all fetched directly from bip.um.sandomierz.pl):
//   flat announcement + own result — Portowa 18/16, I przetarg ustny
//     nieograniczony, 17,08 m², cena wywoławcza 76 500 zł, held 2024-10-24,
//     sold for 92 000 zł (matches the spike's confirmed "cena osiągnięta
//     92000 zł")
//   flat announcement + own result — K.K.Baczyńskiego 9/14, I przetarg,
//     27,30 m², 99 698 zł, held 2023-07-03, sold for 100 698 zł
//   land result UNSOLD — Piaski dz. 2133/24, II przetarg, 0,1036 ha,
//     66 420 zł, "zakończył się wynikiem negatywnym" (no wadium paid)
//   land result UNSOLD — Zaleśnej dz. 816/5, III przetarg USTNY OGRANICZONY,
//     0,2648 ha, 199 260 zł, same negative outcome
//   land announcement (multi-parcel) — Piaski, II przetargi, two plots
//     (dz. 2133/10 + 2133/24) in ONE document, each with its own price/date;
//     only the FIRST parcel is kept (documented limitation, see below)
//   three real "Wykaz lokalu mieszkalnego przeznaczonego do sprzedaży na
//     rzecz najemcy" tenant-sale designations (Por.T.Króla 6/48,
//     K.K.Baczyńskiego 9/16, Por.T.Króla 8/16) — bezprzetargowo, correctly
//     never reach an auction (isAnnouncementTitle excludes "Wykaz..." titles)
//
// TWO REAL PARSER BUGS found + fixed here (not workable by reusing shared
// helpers verbatim):
//   1. finn-bip's priceFromText has a 140-char label-to-amount gap cap. The
//      Portowa 18/16 WYNIK doc's "Cena wywoławcza ... wynosiła ... zł"
//      sentence interposes the whole "wraz z udziałem w częściach wspólnych
//      budynku i w prawie własności działki nr 1406/53 udziału wynoszącego
//      2238/103205 części" clause (~162 chars) between the label and
//      "wynosiła" — verified live that finn-bip's priceFromText returns null
//      on this real fixture. startingPriceFromText below anchors on the
//      "wynosi\w*" that immediately PRECEDES the amount (with a wider,
//      250-char outer gap) instead of widening the generic gap, which also
//      sidesteps the unrelated digit runs ("1406/53", "2238/103205") sitting
//      in that clause.
//   2. classifyKind's GARAGE_RE is checked before its LAND_RE, so a land
//      announcement whose zoning-boilerplate mentions "...zabudowę domami
//      jednorodzinnymi ... z garażami..." (real fixture: the Piaski
//      multi-parcel announcement, article 17543) misclassifies as 'garaz'
//      instead of 'grunt' — verified live. stripGarageZoningNoise() strips
//      only the plural/amenity forms ("garażami"/"garaże"/"garażach" — a
//      garage FOR SALE is always singular: "garaż"/"garażu"/"garażem"/"lokal
//      garażowy") before classification.
//
// Sandomierz deviations vs the shared FINN helpers:
//   - auctionDateFromText (reused UNMODIFIED from finn-bip) already handles
//     both phrasings seen live: announcements ("Przetarg odbędzie się w dniu
//     <date>") and results ("... przeprowadzono w dniu <date>", which falls
//     through to auctionDateFromText's "w dniu <spelled>" fallback branch).
//   - achieved price reads "Ustalona w wyniku przetargu cena nabycia [lokalu
//     ...] wynosi brutto <kwota> zł" — present tense "wynosi", NOT bochnia's
//     "wylicytowana cena ... wyniosła" / "cena osiągnięta ... wyniosła".
//   - parcel number: announcements say "dz. nr N/N"; WYNIK docs say "nr
//     ewid. N/N" instead — NEITHER form is the "działk..." stem bochnia's/
//     olkusz's parcelFromText requires, so neither would match live
//     Sandomierz text.
//   - the office address "Plac/Pl. Poniatowskiego 3" (Urząd Miejski) must
//     never be taken as the property street.
//   - the board's preambule blurb is NOT a reliable sale/rental signal: a
//     real live counter-example (article 17919, "Ogłoszenie o II przetargu
//     licytacyjnym ustnym nieograniczonym") has a board preambule reading "na
//     sprzedaż lokalu użytkowego ..." while the article's own body reads "na
//     wynajem lokalu użytkowego ..." (rental) — apparently a reused/wrong
//     blurb. isAnnouncementTitle therefore only pre-filters on TITLE (cheap,
//     pre-fetch); isSaleBody() on the fetched BODY is the sole authority for
//     sale-vs-rental.

import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText, parsePLN, areaFromText, auctionDateFromText, roundFromTitle,
  addressFrom, resolveKind,
} from '../../core/finn-bip.js';

export { htmlToText };

const OFFICE_STREET_RE = /poniatowskiego/i; // Urząd: Plac/Pl. Poniatowskiego 3

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

// ---------------------------------------------------------------- title routing

export function isResultTitle(title) {
  const t = (title || '').toLowerCase();
  if (!/informacj\w*\s+o\s+wynik\w*\s+(?:\w+\s+)?przetarg/.test(t)) return false;
  if (/najem|wynajem|dzier[żz]aw/.test(t)) return false;
  return /sprzeda/.test(t);
}

// Title-only gate (cheap, run at harvest time before any detail fetch) — see
// the file header for why the board's preambule is NOT used here to resolve
// sale-vs-rental.
export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(title)) return false;
  if (/^\s*wykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni|informacj\w*\s+komisj/.test(t)) return false;
  return /przetarg/.test(t);
}

// Body-level, AUTHORITATIVE sale-vs-rental gate (see file header).
export function isSaleBody(text) {
  const t = text || '';
  if (/na\s+wynajem|w\s+dzier[żz]aw[ęe]|na\s+najem/i.test(t)) return false;
  return /na\s+sprzeda[żz]/i.test(t);
}

// -------------------------------------------------------------- unit extractors

// Body round fallback: "<ROMAN> przetarg ustn(y/ego) [nieograniczon.../
// ograniczon...]". Case-SENSITIVE roman (a lowercase "i" is the Polish
// conjunction, not round 1). Also matches "ustny ograniczony" (Zaleśnej —
// restricted to adjoining-property owners), not just "nieograniczony".
export function roundFromBody(text) {
  const m = /\b(VIII|VII|VI|IX|IV|V|X|I{1,3})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? ROMAN[m[1]] ?? null : null;
}

// Starting price: "Cena wywoławcza ... wynosi(ła) [brutto] <kwota> zł". See
// file header bug #1 — anchors on the "wynosi\w*" immediately preceding the
// amount (250-char outer gap) rather than widening finn-bip's generic
// label-to-amount gap, so the unrelated digit runs in a long udział/działka
// clause between the label and the amount can't be mistaken for the price.
export function startingPriceFromText(text) {
  const m = /cen[aęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,250}?wynosi[a-ząćęłńóśźż]*\s*(?:brutto\s*)?[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Achieved price: "Ustalona w wyniku przetargu cena nabycia [lokalu ...]
// wynosi brutto 92.000,00 zł" (present tense; NOT bochnia's "wylicytowana
// cena ... wyniosła").
export function achievedPriceFromText(text) {
  const m = /cen[aęy]\s+nabycia[\s\S]{0,80}?wynosi\s*(?:brutto\s*)?[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// NOTE a bare "nie przyst[ąa]pi" alternative (as bochnia's equivalent inline
// check uses) is deliberately NOT included: real fixture Portowa 18/16's
// SOLD result reads "Pomimo wpłaconego wadium jedna osoba nie przystąpiła do
// przetargu" — ONE bidder out of several who paid the wadium was a no-show,
// which is routine and does not mean the auction failed (achievedPriceFromText
// still finds a buyer+price on that same doc). "nikt nie ..." (nobody at all)
// is the real failure signal and is covered by the bare `nikt\s+nie` alt below.
const NEGATIVE_RE = /wynikiem\s+negatywnym|brak\s+(?:ofert|oferent|uczestnik)|nie\s+wy[łl]oniono|nie\s+odnotowano|nikt\s+nie/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

// ----------------------------------------------------------------- land helpers

// Parcel number: announcements say "dz. nr N/N" or "działka nr N/N"; WYNIK
// docs say "nr ewid. N/N" / "nr ewid. działki N/N" instead (verified live:
// the Piaski/Zaleśnej WYNIK docs never say "działka" at all).
export function parcelFromText(text) {
  const t = text || '';
  let m = /dz(?:iałk\w*)?\.?\s+nr\.?\s*([\d]+\/\d+)/i.exec(t);
  if (m) return m[1];
  m = /nr\s+ewid(?:\.|ency\w*)?\s*(?:działki\s*)?([\d]+\/\d+)/i.exec(t);
  return m ? m[1] : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/.exec(text || '');
  return m ? m[1].trim() : null;
}

export function plotAreaFromText(text) {
  const t = text || '';
  const ha = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(t);
  if (m2) { const v = Number(m2[1].replace(/[\s ]/g, '')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

// Land street: "przy ul. <Street>". A PROSE-continuation stop set (vs
// bochnia's plain lookahead set) because Sandomierz land sentences keep going
// well past the street name without a comma ("przy ul. Piaski stanowiących
// własność Gminy Sandomierz, przeznaczonych ..." — an unguarded lookahead
// captures "Piaski stanowiących własność Gminy Sandomierz" as the "street",
// stopping only at "księgi"). A short length cap is the backstop.
const LAND_STREET_STOP =
  '(?=\\s*[,;.]|\\s+stanowi|\\s+przeznaczon|\\s+wpisan|\\s+po[łl]o[żz]on|\\s+oznaczon\\w*\\s+w\\s+ewidencj|\\s+w\\s+[A-ZŻŹĆŁŚ]|\\s+obr[ęe]b|\\s+ksi|\\n|$)';
const LAND_STREET_RE = new RegExp(
  `(?:przy|w\\s+rejonie|po[łl]o[żz]on\\w+\\s+przy)\\s+ul(?:icy)?\\.?\\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\\- ]+?)${LAND_STREET_STOP}`,
);
export function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(text || '');
  if (!m) return null;
  const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!s || s.length > 30 || OFFICE_STREET_RE.test(s)) return null;
  return s;
}

// See file header bug #2: "...z garażami..." in a zoning/amenity clause is
// never the sale's subject — a garage FOR SALE is always singular. Stripped
// before classifyKind runs (GARAGE_RE is checked before LAND_RE there).
function stripGarageZoningNoise(text) {
  return (text || '').replace(/gara[żz]ami|gara[żz]ac?h|gara[żz]e\b/gi, '');
}

// Sandomierz land WYNIK docs never say "działka"/"niezabudowana"/"grunt" —
// just "nieruchomości ... oznaczoną nr ewid. N/N o pow. 0,NNNN ha" — so
// finn-bip's classifyKind (title/body vocabulary match) returns 'unknown' on
// them. Treat an explicit parcel/hectare combination with no "lokal" mention
// as land.
export function resolveKindLocal(title, text) {
  const generic = resolveKind(title, stripGarageZoningNoise(text));
  if (generic !== 'unknown') return generic;
  const t = text || '';
  if (/nr\s+ewid|dz(?:iałk\w*)?\.?\s+nr/i.test(t) && /\bha\b/i.test(t) && !/\blokal/i.test(t)) return 'grunt';
  return generic;
}

function addressFromSafe(title, text) {
  const addr = addressFrom(title, text);
  if (addr && OFFICE_STREET_RE.test(addr.address.street)) return null;
  return addr;
}

// --------------------------------------------------------------------- parsers

// NOTE multi-parcel limitation: a single Sandomierz land announcement can
// bundle SEVERAL independently-priced/dated parcels in one document (real
// fixture: the Piaski announcement lists "1.dz. nr 2133/10 ... 2.dz. nr
// 2133/24 ..." as two separate auctions on the same day). Only the FIRST
// parcel's fields (parcel/price/date/round all anchor on the first "cena
// wywoławcza"/"dz. nr"/"odbędzie się" occurrence) are kept — a documented,
// low-risk simplification (bounded scope; land is a secondary stream here).
export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  if (!isSaleBody(text)) return null;
  const kind = resolveKindLocal(title, text);
  const round = roundFromTitle(title) ?? roundFromBody(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return {
      kind: 'grunt', dzialka_nr, obreb: obrebFromText(text), area_m2: plotAreaFromText(text),
      address_raw, address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln, auction_date, round, detail_url: url, source_url: url,
    };
  }

  const addr = addressFromSafe(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(text),
    starting_price_pln, auction_date, round, detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!/o\s+wyniku|cena\s+nabycia|wynikiem\s+negatywnym/i.test(t)) return [];
  // Defensive, body-level rental exclusion (crawl.js's isResultTitle already
  // filters "na dzierżawę"/"na najem" result titles before a doc ever reaches
  // here — this is a second layer in the same spirit as isSaleBody for
  // announcements, given a real title/body mismatch WAS found live for the
  // announcement side, see parse header).
  if (/na\s+najem|na\s+wynajem|na\s+dzier[żz]aw[ęe]/i.test(t)) return [];
  const notes = [];
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromTitle(t) ?? roundFromBody(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(t);
  const kind = resolveKindLocal('', t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const street = landStreetFromText(t);
    if (!dzialka_nr && !street) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: obrebFromText(t),
      area_m2: plotAreaFromText(t), address_raw: street ? `ul. ${street}` : null, round,
      starting_price_pln, final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    }];
  }

  const addr = addressFromSafe('', t);
  if (!addr) return [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: areaFromText(t), notes,
  }];
}
