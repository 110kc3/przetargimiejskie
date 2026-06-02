// Sosnowiec parsers.
//
// Sosnowiec's BIP (bip.um.sosnowiec.pl) is a React SPA backed by a JSON API.
// Each auction is one article whose `content` is HTML holding the full
// announcement text inline (no PDF needed for flats). We keep only the open
// `przetarg ustny … na sprzedaż lokalu mieszkalnego` auctions (the city also
// auctions land/działki and sells flats bezprzetargowo to tenants — both
// skipped). One flat per announcement. See crawl.js.
//
// Confirmed phrasings (June 2026), parsed below:
//   title:  "… na sprzedaż lokalu mieszkalnego nr 15 … przy Alei Zwycięstwa 25"
//   price:  "Cena wywoławcza do przetargu wynosi 77 000,00 zł"
//   area:   "powierzchnia użytkowa: 17,85 m2"  (plot is "działka … o pow. 438 m2")
//   date:   "Przetarg odbędzie się w dniu 23 stycznia 2026 r."  (spelled month)

import { parseAddress } from '../../core/normalize.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/**
 * Decode a BIP `content` HTML string to plain text. The API entity-encodes
 * Polish letters as numeric refs (e.g. `&#380;` = ż), so a numeric decoder plus
 * a few named entities covers it; tags are stripped.
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, ' ');
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

/** Is this article an open auction selling a residential flat? */
export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln|prawa\s+w[łl]asno[śs]ci\s+lokalu\s+mieszkaln/.test(t);
}

/**
 * Auction round, anchored on the announcement verb: "ogłasza <ordinal> przetarg".
 * Scanning the whole body is unsafe — it recounts prior rounds in the history
 * section and a list item "3. Przetarg odbędzie się…". So we only read the span
 * between "ogłasza" and the next "przetarg". No ordinal there (e.g. "ogłasza
 * ustny przetarg") = first/unstated → 1.
 */
export function roundFromText(text) {
  const m = /og[łl]asza\s+([\s\S]{0,60}?)przetarg/i.exec(text || '');
  const scope = m ? m[1] : '';
  if (/pierwsz/i.test(scope)) return 1;
  if (/drug/i.test(scope)) return 2;
  if (/trzeci/i.test(scope)) return 3;
  if (/czwart/i.test(scope)) return 4;
  const r = /\b(VI|IV|V|I{1,3})\b/i.exec(scope);
  if (r) return ROMAN[r[1].toUpperCase()] ?? null;
  return /og[łl]asza/i.test(text || '') ? 1 : null;
}

/** "Przetarg odbędzie się w dniu 23 stycznia 2026 r." → "2026-01-23". */
export function auctionDateFromText(text) {
  if (!text) return null;
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const num = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  return null;
}

// "77 000,00" → 77000
function parsePLN(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Starting price: "Cena wywoławcza … wynosi 77 000,00 zł". */
export function priceFromText(text) {
  const m = /cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d][\d  .]*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/**
 * Flat area: prefer the labelled "powierzchnia użytkowa: X m²". Falls back to a
 * bare "<num> m²" that is NOT the plot ("działka … o pow. Y m2"). Returns m².
 */
export function areaFromText(text) {
  if (!text) return null;
  // Plausible flat-area window: excludes the plot ("o pow. 488 m²") and
  // cellar/share fragments ("4,5 m²") that otherwise leak through.
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,20}?([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (plausible(v)) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  let m;
  const cands = [];
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|o\s+pow\b/i.test(before)) continue; // plot
    const v = parseArea(m[1]);
    if (plausible(v)) cands.push(v);
  }
  // largest remaining plausible value is the flat (cellars are smaller)
  return cands.length ? Math.max(...cands) : null;
}

/**
 * Address: title says "… lokalu mieszkalnego nr 15 … przy Alei Zwycięstwa 25".
 * Build "<street> <building>/<apt>" and normalise to the join key.
 * @returns {{address_raw:string, address:object}|null}
 */
export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt = /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|nr)\s*(\d+[A-Za-z]?)/i.exec(src)?.[1] || null;
  const loc = /przy\s+(?:ul\.|al\.|alei|placu|pl\.|os\.)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(title)
    || /przy\s+(?:ul\.|al\.|alei|placu|pl\.|os\.)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(src);
  if (!loc) return null;
  const street = loc[1].replace(/\s+/g, ' ').trim();
  const building = loc[2];
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

/**
 * Parse one flat-auction article into a listing (or null if unkeyable).
 * @param {string} title  article title
 * @param {string} content  article `content` HTML
 * @returns {null | {kind, address_raw, address, area_m2, starting_price_pln, round, auction_date}}
 */
export function parseAnnouncement(title, content) {
  const text = htmlToText(content);
  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
  };
}

// Contract stub — Sosnowiec results ("informacja o wyniku przetargu") are a
// separate, not-yet-wired stream; crawlResultDocs() returns [], so this is never
// invoked. Present only to satisfy the registry.
export function parseResultDoc(_text, _date, _url) {
  return [];
}
