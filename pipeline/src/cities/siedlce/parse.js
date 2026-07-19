// Siedlce (siedlce.pl "Aktualności" — Vela/ESC SA CMS) parsers. Announcement
// bodies are plain server-rendered HTML (<p> tags inside
// "velacms-widget-rich-content" blocks) — no PDF, no OCR. Reuses the shared
// core/finn-bip.js body helpers (htmlToText, resolveKind, areaFromText,
// priceFromText, addressFrom, parseLandAnnouncement, isSaleAuction); the three
// deviations below are Siedlce-specific. Groundtruthed against 5 REAL live
// article bodies (fetched + verified 2026-07-18):
//   flat announcement (bare/I przetarg) — Jana III Sobieskiego 5/58, 38,38 m²,
//     260 000 zł, held 2024-07-11
//   flat announcement (II przetarg) — Józefa Piłsudskiego 96/16, 50,37 m²,
//     340 000 zł, held 2024-07-04 (I przetarg 2024-04-24 ended negative)
//   built-property/office announcement, I/II/III przetarg — Świętojańska 4
//     (zabudowana, NOT a lokal mieszkalny — a biurowa/office building),
//     850,71 m², held 2025-12-19 (4 300 000 zł) / 2026-04-09 (4 300 000 zł,
//     both negative) / 2026-07-29 (3 900 000 zł, price cut for round III)
//
// Siedlce deviations vs the shared FINN helpers:
//   - APARTMENT NUMBER: given as "…przy ulicy <Street> <bldg>, oznaczony(ego)
//     Nr <apt>…", DETACHED from "lokal mieszkalny" (finn-bip's own apt regex
//     expects them adjacent, e.g. "lokalu mieszkalnego nr 5") — extracted
//     separately here and merged onto the finn-bip street+building match.
//   - ROUND: the Świętojańska title/search-snippet (unlike the two flat
//     titles) carries NO ordinal at all — "Przetarg na sprzedaż nieruchomości
//     przy ulicy Świętojańskiej 4" for every round. The ordinal only appears
//     in the body's OPERATIVE opening sentence ("Prezydent Miasta Siedlce
//     ogłasza II przetarg…"). finn-bip's shared roundFromTitle always
//     defaults to 1 once "przetarg" appears anywhere in the title, so
//     `roundFromTitle(title) ?? roundFromText(text)` never actually reaches
//     the body fallback (round 1 is never null/undefined) — all 3
//     Świętojańska rounds silently collapsed to round 1 on the first live
//     refresh. Fixed below: only trust the title when it carries an EXPLICIT
//     ordinal marker (ordinal word or a Roman numeral directly before
//     "przetarg"); otherwise fall through to the shared roundFromText, which
//     anchors on the body's "ogłasza … przetarg" verb phrase and so can't be
//     fooled by an unrelated "I przetarg … odbył się" prior-round mention
//     elsewhere in the text.
//   - AUCTION DATE: Siedlce narrates a PRIOR failed round FIRST ("I przetarg
//     … odbył się w dniu 24 kwietnia 2024 r. zakończył się wynikiem
//     negatywnym…") using the SAME "w dniu <date>" phrasing as the upcoming
//     auction ("Przetarg odbędzie się … w dniu 4 lipca 2024r."). The shared
//     auctionDateFromText requires the date within 40 digit-free chars of
//     "odbędzie się" (fails here — the office address "Skwer Niepodległości
//     2" / room "sali 144" sit in between) and then falls back to the FIRST
//     bare "w dniu" match in the whole text — the WRONG (past) one on the
//     Piłsudskiego fixture. Overridden below to anchor on the future-tense
//     verb stem "odb[ęe]dzie" specifically (never matches "odbył/odbyła"),
//     with a digit-tolerant gap up to the operative "w dniu <date>".
//   - Achieved prices are never published online (only a 7-day physical
//     noticeboard posting per §12 of the auction regulation — see spike);
//     parseResultDoc is a no-op stub, same contract as the plain FINN-BIP
//     cities.

import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText, areaFromText, priceFromText, roundFromText,
  addressFrom as finnAddressFrom, resolveKind, parseLandAnnouncement, isSaleAuction,
  auctionDateFromText as finnAuctionDateFromText,
} from '../../core/finn-bip.js';

export { htmlToText };

// "…lokalu mieszkalnego … oznaczonego Nr 16" / "…oznaczony Nr 58" — the flat
// number sits right after "oznaczony/oznaczonego Nr/nr", not next to "lokal
// mieszkalny" itself. Requires plain adjacency (just whitespace between), so
// it does NOT false-positive on parcel phrasing like "oznaczonej w ewidencji
// gruntów jako działka nr 27/3" (extra words in between).
const APT_RE = /oznaczon\w*\s+(?:nr\.?|numer\w*)\s*(\d+[A-Za-z]?)/i;

// Local Roman-numeral map for the title-only round check (see header "ROUND"
// deviation) — core/finn-bip.js keeps its own copy private, so this is
// duplicated here rather than modifying the shared file. Case-sensitive on
// purpose: a case-insensitive scan would read the Polish conjunction "i" as
// Roman I.
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMAN_RE_SRC = '(VIII|VII|VI|IX|IV|V|X|I{1,3})';

// EXPLICIT title-level round only — an ordinal word ("drugi przetarg") or a
// Roman numeral directly before "przetarg" ("II przetarg"). Returns null
// (never defaults to 1) when the title has no such marker, so the caller can
// safely fall through to the body.
function explicitRoundFromTitle(title) {
  const t = title || '';
  if (/pierwsz/i.test(t)) return 1;
  if (/drug/i.test(t)) return 2;
  if (/trzeci/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  const r = new RegExp(`\\b${ROMAN_RE_SRC}\\s+(?:[Uu]stnym\\s+|USTNYM\\s+)?(?:[Pp]rzetarg|PRZETARG)`).exec(t);
  return r ? ROMAN[r[1]] ?? null : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, września: 9, pazdziernika: 10,
  października: 10, listopada: 11, grudnia: 12,
};

export function isAnnouncementTitle(title) {
  return isSaleAuction(title);
}

// LIVE-VERIFIED (2026-07-18): siedlce.pl has never published a result notice —
// achieved prices are posted only on the physical noticeboard. Kept so a
// future site change (or a stray "informacja o wyniku" article) is still
// routed correctly instead of silently mis-parsed as an announcement.
export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik|^\s*wynik\w*\s+\w*\s*przetarg/i.test(title || '');
}

function addressFrom(title, text) {
  const base = finnAddressFrom(title, text);
  if (!base) return null;
  if (base.address?.apt) return base;
  const m = APT_RE.exec(`${title} ${text}`);
  if (!m) return base;
  const raw = `${base.address.street} ${base.address.building}/${m[1]}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : base;
}

// See header: anchors the FUTURE-tense "odbędzie się … w dniu <date>" so a
// prior negative round ("odbył się w dniu <date>") mentioned earlier in the
// body can never win. Falls back to the shared finn-bip heuristic for any
// phrasing this doesn't cover.
export function auctionDateFromText(text) {
  const t = text || '';
  const spelled =
    /odb[ęe]dzie\s+si[ęe][\s\S]{0,200}?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  const numeric =
    /odb[ęe]dzie\s+si[ęe][\s\S]{0,200}?w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;
  return finnAuctionDateFromText(t);
}

export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  const kind = resolveKind(title, text);

  if (kind === 'grunt') {
    return parseLandAnnouncement(title, contentHtml, url);
  }

  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: explicitRoundFromTitle(title) ?? roundFromText(text) ?? 1,
    auction_date: auctionDateFromText(text),
    detail_url: url,
    source_url: url,
  };
}

/** No online achieved-price stream (see header) — contract stub. */
export function parseResultDoc(_text, _date, _url) {
  return [];
}
