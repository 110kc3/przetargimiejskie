// Bielsko-Biała parsers.
//
// Source: the city's **Giełda Nieruchomości** (bielsko-biala.pl/gielda-nieruchomosci),
// a server-rendered Drupal marketplace. Flat *sales* are run by the city (Urząd
// Miejski, Wydział Mienia Gminnego) — NOT by ZGM Bielsko-Biała, which only does
// rentals/procurement (the housing-manager heuristic misfires here, see
// SPIKE-WAVE2.md "Bielsko-Biała"). Each offer is a node at `/nieruchomosc/<slug>`
// whose "Najważniejsze informacje" block is a labelled key-value list:
//
//   Adres:                     ul. Stanisława Wyspiańskiego 32/9
//   Cena:                      92 450,00 zł              (cena wywoławcza)
//   Rodzaj nieruchomości:      lokal mieszkalny          (classify on THIS,
//                                                          not the category chip)
//   Data przetargu / rokowań:  12.06.2026 r.
//   Forma przetargu:           Pierwszy przetarg pisemny nieograniczony
//                                                          (round handed to us)
//   Status oferty:             Przetarg ogłoszony / oczekujący na ogłoszenie
//   Wysokość wadium:           …
//   Powierzchnia:              <PLOT area — do NOT use for flats>
//
// The flat's usable area is in the description prose ("Powierzchnia użytkowa
// lokalu wynosi 17,75 m2"), not in the structured `Powierzchnia` field (that's
// the plot). Fully server-rendered HTML — no PDF/DOC/RTF/OCR. This adapter is an
// "active + archived-mode" one like Sosnowiec/Rybnik: the giełda only shows
// current/pending offers (no concluded-auction / sold-price stream), so
// crawlResultDocs() returns [] and parseResultDoc() is a stub.
//
// ⚠️ BEST-EFFORT against the documented structure (SPIKE-WAVE2.md) — the live
// site is unreachable from the CI sandbox. The label set + plausibility windows
// are defensive; VALIDATE + TUNE on the first real refresh.

import { parseAddress } from '../../core/normalize.js';

const ROUND_WORDS = [
  [/pierwsz/i, 1],
  [/drug/i, 2],
  [/trzeci/i, 3],
  [/czwart/i, 4],
  [/pi[ąa]t/i, 5],
];

// The labelled fields in the "Najważniejsze informacje" block. Order longest →
// shortest so the boundary lookahead in `field()` doesn't stop early on a prefix
// (e.g. "Cena wywoławcza" before "Cena", "Powierzchnia użytkowa" before
// "Powierzchnia", "Data przetargu / rokowań" before "Data przetargu").
const LABELS = [
  'Data przetargu / rokowań',
  'Data przetargu',
  'Rodzaj nieruchomości',
  'Forma przetargu',
  'Status oferty',
  'Wysokość wadium',
  'Powierzchnia użytkowa',
  'Powierzchnia',
  'Cena wywoławcza',
  'Cena',
  'Numer działki',
  'Typ działki',
  'Obręb',
  'Księga wieczysta',
  'Udział w częściach wspólnych',
  'Plan zagospodarowania/Studium',
  'Lokalizacja',
  'Galeria zdjęć',
  'Adres',
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const BOUNDARY = LABELS.map(escapeRe).join('|');

/**
 * Flatten a Drupal node's HTML to plain text. Block-level tag closes become
 * spaces so adjacent label/value divs don't run together; entities are decoded.
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h\d|\/span)\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&sup2;/gi, '²')
    .replace(/&sup3;/gi, '³')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&oacute;/gi, 'ó');
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Read a labelled field value: "<label>: <value>" up to the next known label
 * (or end of text). Returns the trimmed value, or null if the label is absent.
 * @param {string} text  flattened node text (from htmlToText)
 * @param {string} label  one of LABELS
 * @returns {string|null}
 */
export function field(text, label) {
  if (!text) return null;
  const re = new RegExp(
    escapeRe(label) + '\\s*:\\s*([\\s\\S]*?)\\s*(?=(?:' + BOUNDARY + ')\\s*:|$)',
    'i',
  );
  const m = re.exec(text);
  const v = m ? m[1].trim() : null;
  return v || null;
}

/** Is this node a residential flat sale? Classify on `Rodzaj nieruchomości`. */
export function isFlat(rodzaj) {
  return /lokal\w*\s+mieszkaln/i.test(rodzaj || '');
}

// "92 450,00" / "92.450,00" / "92450" → integer PLN.
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/z[łl].*$/i, '');
  const m = /^(\d{1,3}(?:[.\s]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.\s]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && fallback ? n : null;
}

// "17,75" / "17.75" → 17.75
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Round from `Forma przetargu` ("Pierwszy przetarg pisemny…" → 1). Negotiations
 *  ("rokowania") with no ordinal → null; a bare "przetarg" → 1. */
export function roundFromForma(forma) {
  const t = forma || '';
  for (const [re, n] of ROUND_WORDS) if (re.test(t)) return n;
  if (/rokowan/i.test(t)) return null; // post-tender negotiations, no round
  if (/przetarg/i.test(t)) return 1;
  return null;
}

/** `Cena` / `Cena wywoławcza` field → integer PLN; falls back to any
 *  "cena wywoławcza … zł" in the prose. */
export function priceFrom(text) {
  const f = field(text, 'Cena wywoławcza') || field(text, 'Cena');
  const direct = parsePLN(f);
  if (direct != null) return direct;
  const m = /cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d][\d  . ]*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** `Data przetargu / rokowań: 12.06.2026 r.` → ISO "2026-06-12". */
export function auctionDateFrom(text) {
  const f = field(text, 'Data przetargu / rokowań') || field(text, 'Data przetargu') || text || '';
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(f);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Flat usable area, from the description prose ("Powierzchnia użytkowa lokalu
 * wynosi 17,75 m2"). The structured `Powierzchnia` field is the PLOT and is
 * deliberately ignored. Plausibility window 8–300 m² rejects cellars/shares and
 * plot figures that leak through. → m² or null.
 */
export function areaFrom(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  // 1) "powierzchni(a) użytkowa lokalu wynosi 17,75 m2"
  const prose = /powierzchni\w*\s+u[żz]ytkow\w*\s+lokalu\s+wynosi\s+([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (prose) {
    const v = parseArea(prose[1]);
    if (plausible(v)) return v;
  }
  // 2) any "powierzchni użytkow… <num> m²" that isn't the labelled plot field
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,20}?([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (plausible(v)) return v;
  }
  // 3) fallback — bare "<num> m²" tokens that aren't the plot/cellar.
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|obr[ęe]b|o\s+pow\b/i.test(before)) continue; // plot
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]/i.test(before)) continue; // cellar
    const v = parseArea(m[1]);
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

/** `Adres: ul. Stanisława Wyspiańskiego 32/9` → keyed address (or null). */
export function addressFrom(text) {
  const raw = field(text, 'Adres');
  if (!raw) return null;
  // Joint-lot listings carry two addresses ("ul. Łukowa 15, Łukowa 17",
  // "ul. X 5+7") — key on the FIRST so the street stays clean (mirrors Bytom's
  // joint-lot handling). Fall back to the whole string if the split doesn't key.
  const first = raw.split(/\s*[,;+]\s*/)[0].trim();
  const address = parseAddress(first) || parseAddress(raw);
  if (!address) return null;
  // Defensive: never emit a junk street — the CI sanity gate (and the join key)
  // reject ':'/';'/digits in the street name; only leading "3 Maja"-style is OK.
  const street = address.street || '';
  const digitsOk = /^\d+\s/.test(street);
  if (/[;:]/.test(street) || (!digitsOk && /\d/.test(street))) return null;
  return { address_raw: raw, address };
}

/**
 * Parse one `/nieruchomosc/<slug>` node into a flat listing, or null if it isn't
 * a keyable residential-flat sale.
 * @param {string} html  the node's server-rendered HTML
 * @returns {null | {kind, address_raw, address, area_m2, starting_price_pln, round, auction_date, status}}
 */
export function parseNode(html) {
  const text = htmlToText(html);
  const rodzaj = field(text, 'Rodzaj nieruchomości');
  if (!isFlat(rodzaj)) return null;
  const addr = addressFrom(text);
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFrom(text),
    starting_price_pln: priceFrom(text),
    round: roundFromForma(field(text, 'Forma przetargu')),
    auction_date: auctionDateFrom(text),
    status: field(text, 'Status oferty'),
  };
}

/** A map/geoportal link the source embedded in the node, if any — so we can
 *  point straight at where the parcel is shown. Recognises the national
 *  geoportal, e-mapa.net / geoportal2 municipal instances and generic SIP/"mapa"
 *  hrefs. Returns null when the node links no map (the common case). */
export function findMapLink(html) {
  if (!html) return null;
  const re = /href=\"([^\"]*(?:geoportal\.gov\.pl|e-mapa\.net|geoportal2\.pl|sip\.[a-z]|msip\.|\/mapa\b)[^\"]*)\"/i;
  const m = re.exec(html);
  return m ? m[1].replace(/&amp;/gi, '&') : null;
}

/** Plot area from the structured `Powierzchnia` field — for LAND this IS the plot
 *  area (unlike flats, where it is ignored). "812 m2" / "1 234,50 m²" / "1234"
 *  → m² or null. */
export function plotAreaFrom(text) {
  const f = field(text, 'Powierzchnia');
  if (!f) return null;
  const m = /([\d][\d\s.\u00a0]*(?:,\d+)?)/.exec(f);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s.\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse a /nieruchomosc/ node that is a LAND (działka) offer into a parcel-shaped
 * land record, or null if it can't be keyed (no parcel number AND no address).
 * Land has no building/apt, so build-land keys it on its parcel, NOT the
 * street|building|apt property map.
 * @param {string} html  the node's server-rendered HTML
 * @param {string} url   the node URL (kept as detail_url + source_url)
 */
export function parseLandNode(html, url) {
  const text = htmlToText(html);
  const dzialka = field(text, 'Numer działki');
  const obreb = field(text, 'Obręb');
  const addrRaw = field(text, 'Adres');
  if (!dzialka && !addrRaw) return null; // unkeyable → skip (defensive)
  let address = null;
  let street = null;
  let building = null;
  if (addrRaw) {
    const a = parseAddress(addrRaw); // tolerate failure — land may have no street
    if (a) { address = a; street = a.street; building = a.building; }
  }
  return {
    kind: 'grunt',
    dzialka_nr: dzialka || null,
    obreb: obreb || null,
    zoning: field(text, 'Typ działki') || null,
    address_raw: addrRaw || null,
    street,
    building,
    address,
    area_m2: plotAreaFrom(text), // PLOT area
    starting_price_pln: priceFrom(text),
    auction_date: auctionDateFrom(text),
    round: roundFromForma(field(text, 'Forma przetargu')),
    detail_url: url,
    source_url: url,
    geoportal_url: findMapLink(html), // source-provided map link, if present
  };
}

/**
 * Parse a /nieruchomosc/ node that is an address-keyed sale (house 'zabudowana'
 * or commercial 'uzytkowy') into a listing, or null if it has no keyable address.
 * Mirrors parseNode (the flat path) but carries the supplied kind.
 * @param {string} html
 * @param {string} url
 * @param {'zabudowana'|'uzytkowy'} kind
 */
export function parseListingNode(html, url, kind) {
  const text = htmlToText(html);
  const addr = addressFrom(text);
  if (!addr) return null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFrom(text),
    starting_price_pln: priceFrom(text),
    round: roundFromForma(field(text, 'Forma przetargu')),
    auction_date: auctionDateFrom(text),
    detail_url: url,
  };
}

// Contract stub — the Bielsko giełda publishes no concluded-auction / sold-price
// stream (it only lists current + pending offers). crawlResultDocs() returns [],
// so this is never invoked. Present only to satisfy the registry.
export function parseResultDoc(_text, _date, _url) {
  return [];
}
