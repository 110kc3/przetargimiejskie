// Olsztyn parsers.
//
// Two functions exported for the registry contract:
//
//   parseResultDoc(text, fallbackDate, sourceUrl)
//     Extracts one or more sold/unsold flat records from an Olsztyn result
//     notice page body (plain text, HTML-stripped by crawl.js).
//
//     Each result page covers ONE auction SESSION which may contain several
//     flats. The page body is structured as a series of paragraphs, one per
//     flat. Each flat block contains:
//       - a prose description: "przetarg ustny nieograniczony na sprzedaz
//         lokalu mieszkalnego nr X ... przy ul. Y Z ..."
//       - a price breakdown: "cena wywalawcza: N zl" OR "Cena wywalawcza
//         nieruchomosci: N zl" OR split "cena lokalu: X zl; cena gruntu: Y zl"
//       - an achieved price: "najwyzsza cena osiagnieta w przetargu - N zl"
//         OR "brak" / "brak wplat" / "0 osob" for unsold.
//       - sometimes: "nabywca nieruchomosci: NAME" for sold ones.
//     Non-residential lots ("lokal niemieszkaNY", "nieruchomosc gruntowa")
//     appear in the same page and are filtered out.
//
//   parseActiveDoc(title, bodyText)
//     Extracts structured data from one active-auction announcement page.
//     Returns { kind, address_raw, address, area_m2, starting_price_pln,
//               auction_date, round } or null if the page cannot be keyed.
//
// GROUNDTRUTH FIXTURES (verified 2026-06-27):
//   Result page /2905/ (17 Apr 2026 session) -- 4 flats, 3 sold, 1 unsold.
//     Curie-Sklodowskiej 10/2a: wywolawcza 380 000 zl -> osiagnieta 384 000 zl
//     Curie-Sklodowskiej 10/2:  wywolawcza 460 000 zl -> osiagnieta 464 600 zl
//     Kasprowicza 5b/13:        wywolawcza 540 000 zl -> brak wplat (unsold)
//     Partyzantow 69/8:         wywolawcza 640 000 zl -> osiagnieta 646 400 zl
//   Announcement /2626/ (Curie-Sklodowskiej 2a, April 2026):
//     area = 54.7 m2, wywolawcza = 380 000 zl, auction_date = 2026-04-17

import { parseAddress } from '../../core/normalize.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function stripTags(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&sup2;/gi, '²')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "380 000,00 zl" / "380.000,00" / "380000" -> integer PLN
function parsePLN(s) {
  if (!s) return null;
  const clean = String(s).replace(/\s/g, '').replace(/,\d{1,2}$/, '');
  const n = Number(clean.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "54,70" / "54.70" -> 54.7
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  'stycznia': 1, 'luty': 2, 'lutego': 2, 'marca': 3, 'kwietnia': 4, 'maja': 5, 'czerwca': 6,
  'lipca': 7, 'sierpnia': 8, 'wrzesnia': 9, 'pazdziernika': 10,
  'listopada': 11, 'grudnia': 12,
};

// Polish diacritics normalization for month matching
function normMonthKey(s) {
  return s.toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/Ż/g, 'z').replace(/Ź/g, 'z');
}

function parseDateSpelled(text) {
  const m = /(\d{1,2})\s+([a-zA-ZÀ-ž]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[normMonthKey(m[2])];
  if (!mon) return null;
  return m[3] + '-' + String(mon).padStart(2, '0') + '-' + m[1].padStart(2, '0');
}

function parseDateNumeric(text) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text || '');
  if (!m) return null;
  return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Shared address helpers
// ---------------------------------------------------------------------------

// Strip trailing multi-building address fragments from a street string.
// "Kasprowicza 5a, 5b"  -> "Kasprowicza"
// "Curie-Sklodowskiej"  -> "Curie-Sklodowskiej"  (unchanged)
// "3 Maja"              -> "3 Maja"               (leading digit, unchanged)
//
// Matches: optional comma/space + digit(s) + optional letter, repeated.
// Only strips from the END of the string so "3 Maja" (leading digit) is safe.
function stripMultiBuildingSuffix(street) {
  return street.replace(/[,\s]+\d+\w?(?:[,\s]+\d+\w?)*\s*$/, '').trim();
}

// ---------------------------------------------------------------------------
// parseResultDoc -- main contract function
// ---------------------------------------------------------------------------

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];

  // Detect session date. Patterns:
  //   "w dniu 17 kwietnia 2026 r."  (spelled month)
  //   "w dniu 17.04.2026 r."        (numeric)
  //   title text "z 20.03.2026 r."  (numeric in title)
  let sessionDate = null;
  const spelledM = /w\s+dniu\s+(\d{1,2}\s+[a-zA-ZÀ-ž]+\s+\d{4})/i.exec(text);
  if (spelledM) sessionDate = parseDateSpelled(spelledM[1]);
  if (!sessionDate) {
    const numM = /w\s+dniu\s+(\d{1,2}\.\d{1,2}\.\d{4})/i.exec(text);
    if (numM) sessionDate = parseDateNumeric(numM[1]);
  }
  if (!sessionDate) {
    // Fallback: first DD.MM.YYYY in the page (e.g. "z 20.03.2026 r." in title)
    const anyNum = /(\d{1,2}\.\d{1,2}\.\d{4})/.exec(text);
    if (anyNum) sessionDate = parseDateNumeric(anyNum[1]);
  }
  if (!sessionDate) sessionDate = fallbackDate || null;

  // Split into per-auction blocks.
  // Include optional Roman ordinal prefix so roundFromBlock() can read it.
  // Pattern: optional "II"/"III"/"IV"/"V"/"I" then "przetarg ustny nieograniczony na sprzedaz"
  const SPLIT_RE = /(?:(?:II|III|IV|V|I)\s+)?przetarg\s+ustny\s+nieograniczony\s+na\s+sprzeda[zzżź]/gi;
  const positions = [];
  let m;
  while ((m = SPLIT_RE.exec(text)) !== null) positions.push(m.index);
  if (positions.length === 0) return [];
  positions.push(text.length);

  const results = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const block = text.slice(positions[i], positions[i + 1]);
    // Skip land parcels
    if (/sprzeda[zżź]\s+nieruchomo[sś]ci\s+gruntow/i.test(block)) continue;
    // Skip non-residential ("lokal niemieszkaNY")
    if (/lokal\w*\s+niemiesz/i.test(block)) continue;
    // Must be residential flat
    if (!/lokal\w*\s+mieszkaln/i.test(block)) continue;

    try {
      const rec = parseOneResultBlock(block, sessionDate, sourceUrl);
      if (rec) results.push(rec);
    } catch (err) {
      console.error('  olsztyn parseResultDoc block ' + i + ' failed: ' + err.message);
    }
  }
  return results;
}

function parseOneResultBlock(block, sessionDate, sourceUrl) {
  // --- Address ---
  // Two sub-patterns observed in the live pages:
  //   A) "lokalu mieszkalnego nr APT ... budynku nr BLDG ... przy ul. STREET"
  //      e.g. "lokalu mieszkalnego nr 2a ... budynku nr 10 ... przy ul. Curie-Sklodowskiej"
  //   B) "lokalu mieszkalnego nr APT ... przy ul. STREET BLDG [w Olsztynie]"
  //      e.g. "lokalu mieszkalnego nr 4 ... przy ul. Baltyckiej 25B w Olsztynie"

  let address = null;
  let address_raw = null;

  // Pattern A: "lokalu mieszkalnego nr APT ... budynku nr BLDG ... przy ul. STREET"
  const reA = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\w+)[\s\S]{0,200}?budynku\s+(?:nr\s+)?(\w+)[\s\S]{0,80}?przy\s+ul\.\s+([\wÀ-ž.\- ]{2,40}?)(?:[,\s]+(?:obr\.|przy|wraz|w\s+Olsztynie|\n))/i;
  const mA = reA.exec(block);
  if (mA) {
    const apt = mA[1].toUpperCase();
    const bldg = mA[2].toUpperCase();
    const street = mA[3].trim().replace(/\s+/g, ' ');
    address_raw = street + ' ' + bldg + '/' + apt;
    address = parseAddress(address_raw);
  }

  // Pattern B: "przy ul. STREET BLDG" with apt from "lokalu mieszkalnego nr APT"
  if (!address) {
    const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\w+)/i.exec(block);
    const reB = /przy\s+ul\.\s+([\wÀ-ž.\-]+(?:\s+[\wÀ-ž.\-]+){0,2}?)\s+(\d+\w?)\b/i;
    const mB = reB.exec(block);
    if (mB) {
      // Strip any trailing multi-building suffix like "5a, 5b" -> just the street name.
      const street = stripMultiBuildingSuffix(mB[1].trim());
      // When the announcement covers multiple buildings (e.g. "budynku nr 5b
      // zlokalizowanego przy ul. Kasprowicza 5a,5b"), Pattern B picks the first
      // building number it sees in the street fragment (5a), not the correct one.
      // Override from "budynku nr BLDG" when present -- it is always the precise
      // building that contains the flat being sold.
      const bldgOverrideM = /budynku\s+(?:nr\s+)?(\w+)/i.exec(block);
      const bldg = (bldgOverrideM ? bldgOverrideM[1] : mB[2]).toUpperCase();
      const apt = aptM ? aptM[1].toUpperCase() : null;
      address_raw = apt ? (street + ' ' + bldg + '/' + apt) : (street + ' ' + bldg);
      address = parseAddress(address_raw);
    }
  }

  if (!address) return null;

  // --- Starting price (cena wywalawcza) ---
  // Form 1 (new, April 2026): "cena wywalawcza: 380 000,00 zl"
  // Form 2 (explicit total, Feb 2026): "Cena wywalawcza nieruchomosci: 800 000,00 zl"
  // Form 3 (split, March 2026): "cena lokalu -173 000,00 zl" + "cena N/M gruntu ... - 77 000,00 zl"
  let starting_price_pln = null;
  const wywoM = /cena\s+wywo[lł]awcz\w*[^0-9]{0,60}?([\d][\d\s.]*(?:,\d{2})?)\s*z[lł]/i.exec(block);
  if (wywoM) {
    starting_price_pln = parsePLN(wywoM[1]);
  } else {
    // Split format: line-anchored so "(dz. nr 229)" with digits doesn't block the match.
    const priceLineRe = /^cena\s+(?:lokalu|[\d]+\/[\d]+[\s\S]*?gruntu)[\s\S]*?[–\-]\s*([\d][\d\s.]*(?:,\d{2})?)\s*z[lł]/gim;
    let pm;
    let sum = 0;
    let count = 0;
    while ((pm = priceLineRe.exec(block)) !== null) {
      const v = parsePLN(pm[1]);
      if (v != null) { sum += v; count++; }
    }
    if (count > 0) starting_price_pln = sum;
  }

  // --- Achieved price ---
  // "najwyzsza cena osiagnieta w przetargu: 384 000,00 zl" (new, colon)
  // "najwyzsza cena osiagnieta w przetargu - 252 500,00 zl" (old, ndash/dash)
  const osiM = /najwy[zżź]sz\w*\s+cen\w*\s+osi[aą]gni[eę]t\w*\s+w\s+przetargu[^0-9a-zA-Z]{0,10}([\d][\d\s.]*(?:,\d{2})?)\s*z[lł]/i.exec(block);
  const final_price_pln = osiM ? parsePLN(osiM[1]) : null;

  // Unsold: "brak wplat", "0 osob dopuszczonych", or "brak" right after "przetargu"
  const unsold =
    /brak\s+wp[lł]at/i.test(block) ||
    /liczba\s+os[oó]b\s+dopuszczonych\s+do\s+przetargu\s*:\s*0/i.test(block) ||
    /najwy[zżź]sz\w*\s+cen\w*\s+osi[aą]gni[eę]t\w*\s+w\s+przetargu[^0-9a-zA-Z]{0,10}brak/i.test(block) ||
    (!osiM && !/nabywc/i.test(block) && final_price_pln == null);

  return {
    auction_date: sessionDate,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw,
    address,
    round: roundFromBlock(block),
    starting_price_pln,
    final_price_pln: unsold ? null : final_price_pln,
    outcome: unsold ? 'unsold' : 'sold',
    unsold_reason: unsold ? 'unknown' : null,
    area_m2: null,
    notes: [],
  };
}

function roundFromBlock(text) {
  const romM = /^(II|III|IV|V|I)\s+przetarg/im.exec(text || '');
  if (romM) {
    const ROM = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
    return ROM[romM[1].toUpperCase()] || 1;
  }
  if (/przetarg/i.test(text)) return 1;
  return null;
}

// ---------------------------------------------------------------------------
// parseActiveDoc -- for active-auction announcement pages
// ---------------------------------------------------------------------------

export function parseActiveDoc(title, bodyText) {
  if (!title && !bodyText) return null;
  const src = (title || '') + ' ' + (bodyText || '');

  // --- Address ---
  // From title: "nr APT w budynku nr BLDG przy ulicy STREET w Olsztynie"
  let address = null;
  let address_raw = null;

  const reT = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\w+)\s+w\s+budynku\s+(?:nr\s+)?(\w+)\s+przy\s+ulic[yi]\s+([\wÀ-ž.\-]+(?:\s*[\d\w,.\-]+){0,3}?)\s+(?:w\s+Olsztynie|obr\.|wraz)/i;
  const mT = reT.exec(title || '');
  if (mT) {
    const apt = mT[1].toUpperCase();
    const bldg = mT[2].toUpperCase();
    // The street capture may include trailing building-list fragments when an
    // announcement covers multiple buildings, e.g. "przy ulicy Kasprowicza 5a, 5b
    // w Olsztynie" -> mT[3] = "Kasprowicza 5a, 5b". Strip them so only the clean
    // street name remains; the correct building is already in mT[2] (bldg).
    const street = stripMultiBuildingSuffix(
      mT[3].trim().replace(/\s+/g, ' ').replace(/[,\s]+$/, ''),
    );
    address_raw = street + ' ' + bldg + '/' + apt;
    address = parseAddress(address_raw);
  }
  if (!address) {
    const reB = /przy\s+ul\.\s+([\wÀ-ž.\-]+(?:\s+[\wÀ-ž.\-]+){0,2}?)\s+(\d+\w?)(?:\s*[\/\\]\s*(\w+))?/i;
    const mB = reB.exec(src);
    if (mB) {
      const street = mB[1].trim();
      const bldg = mB[2].toUpperCase();
      const apt = mB[3] ? mB[3].toUpperCase() : null;
      address_raw = apt ? (street + ' ' + bldg + '/' + apt) : (street + ' ' + bldg);
      address = parseAddress(address_raw);
    }
  }
  if (!address) return null;

  // --- Starting price ---
  // "Cene wywalawcza nieruchomosci ustalono na kwote N zl" (aggregated total)
  // "cena wywalawcza: N zl" (inline)
  let starting_price_pln = null;
  const priceHdr = /cen[eę]\s+wywo[lł]awcz[aąę]\s+nieruchomo[sś]ci\s+ustalono\s+na\s+kwot[eę]\s+([\d][\d\s.]*(?:,\d{2})?)\s*z[lł]/i.exec(bodyText || '');
  if (priceHdr) {
    starting_price_pln = parsePLN(priceHdr[1]);
  } else {
    const priceInl = /cen[ayę]\s+wywo[lł]awcz\w*[^0-9]{0,40}?([\d][\d\s.]*(?:,\d{2})?)\s*z[lł]/i.exec(bodyText || '');
    if (priceInl) starting_price_pln = parsePLN(priceInl[1]);
  }

  // --- Area ---
  const areaM = /[Pp]owierzchnia\s+u[zżź]ytkowa\s+lokalu\s+(?:wynosi\s+)?([\d]+[\d.,]*)\s*m\s*[2²]/i.exec(bodyText || '');
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  // --- Auction date ---
  let auction_date = null;
  const dateCtx = /[Pp]rzetarg\s+odb[eę]dzie\s+si[eę]\s+([\s\S]{0,60}?)(?:o\s+godz|w\s+siedzibie)/i.exec(bodyText || '');
  if (dateCtx) {
    auction_date = parseDateSpelled(dateCtx[1]) || parseDateNumeric(dateCtx[1]);
  }
  if (!auction_date) {
    auction_date = parseDateSpelled(bodyText || '') || parseDateNumeric(bodyText || '');
  }

  // --- Round ---
  const round = roundFromTitle(title || '');

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    round,
    auction_date,
  };
}

function roundFromTitle(title) {
  const romM = /o\s+(II|III|IV|V|I)\s+przetargu/i.exec(title || '');
  if (romM) {
    const ROM = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
    return ROM[romM[1].toUpperCase()] || 1;
  }
  if (/o\s+przetargu/i.test(title || '')) return 1;
  return null;
}
