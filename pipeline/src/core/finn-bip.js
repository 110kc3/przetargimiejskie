// Reusable FINN eUrząd ("FINN-BIP") crawl + parse helper.
//
// Most Silesian municipal BIPs run on the FINN eUrząd platform, which shares a
// common URL shape and announcement vocabulary (see SPIKE-WAVE2.md, Wave 3):
//
//   CATEGORY INDEX:  /bipkod/<code>            (a category's article list)
//                    /artykuly/<id>            (alternate index path on some sites)
//   ARTICLE:         /artykul/<slug>           (server-rendered announcement HTML)
//                    /Article/get/id,<n>.html  (numeric alternate on some sites)
//
// and a consistent flat-auction vocabulary:
//   "przetarg ustny nieograniczony … na sprzedaż lokalu mieszkalnego",
//   "cena wywoławcza", "powierzchnia użytkowa", "I / II / III przetarg" /
//   "pierwszy / drugi / trzeci przetarg".
//
// This module factors that into one place so each FINN-BIP city is a thin
// config (origin + index URLs) rather than a bespoke adapter. Mysłowice is the
// first user; Świętochłowice, Jaworzno and Częstochowa are intended to reuse it.
//
// The parsing functions are pure (string → value) and unit-tested against
// fixtures (the live BIPs aren't reachable from CI sandboxes). The crawler walks
// each configured index page, harvests `/artykul/` links, keeps the flat-sale
// auctions, fetches each article and parses its body.

import { getText } from './fetch.js';
import { parseAddress } from './normalize.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/**
 * Flatten FINN article HTML to plain text. Block-level closers become spaces so
 * adjacent cells don't run together; numeric + named entities are decoded (the
 * FINN editor entity-encodes Polish letters, e.g. `&#322;` = ł).
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
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Is this announcement an OPEN auction selling a residential flat?
 * Keeps `przetarg … na sprzedaż … lokal(u) mieszkalny(ego)`; drops
 * bezprzetargowe tenant sales, rentals (najem/dzierżawa), and land (działka).
 * @param {string} title
 * @returns {boolean}
 */
export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (/najem|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln|mieszkani\w*/.test(t);
}

/**
 * Auction round from the title's ordinal: "Ogłoszenie o I przetargu …" → 1,
 * "drugi przetarg" → 2. A bare "przetarg" with no ordinal → 1.
 * Reads the title (not the body) so a prior round mentioned in the announcement
 * history can't win. → 1..6 or null.
 * @param {string} title
 * @returns {number|null}
 */
export function roundFromTitle(title) {
  const t = title || '';
  if (/pierwsz/i.test(t)) return 1;
  if (/drug/i.test(t)) return 2;
  if (/trzeci/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  if (/pi[ąa]t/i.test(t)) return 5;
  // Roman ordinal immediately before "przetarg(u)": "o I przetargu", "II przetarg".
  const r = /\b(VI|IV|V|I{1,3})\s+przetarg/i.exec(t);
  if (r) return ROMAN[r[1].toUpperCase()] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

// "92 450,00" / "92.450,00" / "92450" → integer PLN.
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// "17,75" / "17.75" → 17.75
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Starting price: "cena wywoławcza … 92 450,00 zł". → integer PLN or null. */
export function priceFromText(text) {
  const m = /cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d][\d  . ]*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/**
 * Flat usable area: prefer the labelled "powierzchnia użytkowa … X m²"; fall
 * back to a bare "<num> m²" that is NOT the plot ("działka … o pow. Y m2") or a
 * cellar/share. Plausibility window 8–300 m². → m² or null.
 * @param {string} text
 * @returns {number|null}
 */
export function areaFromText(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,20}?([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (plausible(v)) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|obr[ęe]b|o\s+pow\b/i.test(before)) continue; // plot
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]|strych/i.test(before)) continue; // cellar/attic
    const v = parseArea(m[1]);
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

/**
 * Auction date: "Przetarg odbędzie się w dniu 23 kwietnia 2026 r." (spelled
 * month) or a numeric "w dniu 23.04.2026". → ISO "2026-04-23" or null.
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  const spelled = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  // generic spelled-month date anywhere ("w dniu 23 kwietnia 2026 r.")
  const anySpelled = /(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[śs]nia|pa[źz]dziernika|listopada|grudnia)\s+(\d{4})/i.exec(text);
  if (anySpelled) {
    const mon = PL_MONTHS[anySpelled[2].toLowerCase()];
    if (mon) return `${anySpelled[3]}-${String(mon).padStart(2, '0')}-${anySpelled[1].padStart(2, '0')}`;
  }
  const num = /(?:w\s+dniu\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  return null;
}

/**
 * Build the keyed address. FINN flat-auction titles read like
 *   "… na sprzedaż lokalu mieszkalnego nr 47 … przy ul. Armii Krajowej 6B"
 * so the apt comes from "lokalu mieszkalnego nr N" and the street+building from
 * the "przy (ul.) <Street> <bldg>" locative. Looks in title first, then body.
 * @param {string} title
 * @param {string} text  flattened article body
 * @returns {{address_raw:string, address:object}|null}
 */
export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt =
    /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|nr|nr\.)\s*(\d+[A-Za-z]?)/i.exec(src)?.[1] || null;
  const STREET = /(?:przy\s+)?(?:ul\.|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/;
  const loc =
    /przy\s+(?:ul\.|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/.exec(title)
    || /przy\s+(?:ul\.|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/.exec(src)
    || STREET.exec(title);
  if (!loc) return null;
  const street = loc[1].replace(/\s+/g, ' ').trim();
  // The locative may already carry "<bldg>/<apt>"; otherwise glue the apt from
  // "lokalu mieszkalnego nr N".
  let buildingApt = loc[2];
  if (!/\//.test(buildingApt) && apt) buildingApt = `${buildingApt}/${apt}`;
  const raw = `${street} ${buildingApt}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

/**
 * Parse one FINN article into a flat listing, or null if it isn't a keyable
 * residential-flat sale.
 * @param {string} title
 * @param {string} contentHtml  the article body HTML
 * @returns {null | {kind, address_raw, address, area_m2, starting_price_pln, round, auction_date}}
 */
export function parseAnnouncement(title, contentHtml) {
  const text = htmlToText(contentHtml);
  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFromTitle(title) ?? roundFromText(text),
    auction_date: auctionDateFromText(text),
  };
}

/**
 * Body-level round fallback ("ogłasza … drugi przetarg"), scoped to the verb so
 * a prior round in the history section can't win. Mirrors the Sosnowiec heuristic.
 * @param {string} text
 * @returns {number|null}
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

/**
 * Harvest unique article URLs from one FINN index page's HTML. Matches the two
 * common FINN article URL shapes (`/artykul/<slug>` and `/Article/get/id,<n>`)
 * plus the `/artykuly/<id>` variant, absolutising against `origin`.
 * @param {string} html
 * @param {string} origin  e.g. "https://bip.myslowice.pl"
 * @returns {string[]}
 */
export function parseIndexLinks(html, origin) {
  const out = [];
  const seen = new Set();
  const re =
    /href="((?:https?:\/\/[^"\/]+)?\/(?:artyku[łl]?y?|Article\/get\/id,)[^"#\s]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/gi, '&');
    if (!/^https?:/i.test(href)) href = origin + href;
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

/**
 * Extract an article's title + body from its FINN HTML. FINN renders the
 * announcement title in an <h1>/<h2> and the body in the main content; we pull
 * the first heading as the title and flatten the whole document as the body
 * (the body parsers tolerate the extra chrome). A caller that has the title from
 * the index can pass it through `fallbackTitle`.
 * @param {string} html
 * @param {string} [fallbackTitle]
 * @returns {{title:string, body:string}}
 */
export function extractArticle(html, fallbackTitle = '') {
  const h = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  const title = (h ? htmlToText(h[1]) : '') || fallbackTitle;
  return { title, body: html };
}

/**
 * Build a FINN-BIP `crawlActive` for one city.
 *
 * @param {object} cfg
 * @param {string} cfg.origin       e.g. "https://bip.myslowice.pl"
 * @param {string[]} cfg.indexUrls  category/listing pages to harvest article links from
 * @param {string} cfg.id           city id, for log lines
 * @param {(title:string)=>boolean} [cfg.isFlat]  override the flat-auction filter
 * @returns {() => Promise<{listings:object[], wykaz:object[]}>}
 */
export function makeCrawlActive(cfg) {
  const { origin, indexUrls, id, isFlat = isFlatAuction } = cfg;
  const FETCH_OPTS = { userAgent: BROWSER_UA };

  return async function crawlActive() {
    // 1) Harvest candidate article URLs from every index page.
    const articleUrls = [];
    const seen = new Set();
    for (const idx of indexUrls) {
      let html;
      try {
        html = await getText(idx, FETCH_OPTS);
      } catch (err) {
        console.error(`  ${id} index fetch failed (${idx}): ${err.message}`);
        continue;
      }
      const links = parseIndexLinks(html, origin);
      let added = 0;
      for (const u of links) {
        if (seen.has(u)) continue;
        seen.add(u);
        articleUrls.push(u);
        added++;
      }
      console.error(`  ${id} index ${idx}: ${links.length} article link(s) (${added} new)`);
    }
    console.error(`  ${id}: ${articleUrls.length} candidate article(s) to inspect`);

    // 2) Fetch each article, keep the flat-sale auctions, parse the body.
    const listings = [];
    let flats = 0;
    for (const url of articleUrls) {
      let html;
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  ${id} article fetch failed (${url}): ${err.message}`);
        continue;
      }
      const { title, body } = extractArticle(html);
      if (!isFlat(title)) continue;
      flats++;
      const parsed = parseAnnouncement(title, body);
      if (!parsed) {
        console.error(`  ${id} WARN: unkeyable flat auction ${url} (${title.slice(0, 60)})`);
        continue;
      }
      listings.push({
        kind: parsed.kind,
        address_raw: parsed.address_raw,
        address: parsed.address,
        auction_date: parsed.auction_date,
        published_date: null,
        round: parsed.round,
        area_m2: parsed.area_m2,
        starting_price_pln: parsed.starting_price_pln,
        detail_url: url,
      });
    }
    console.error(`  ${id} active: ${listings.length} flat listing(s) from ${flats} flat article(s)`);
    return { listings, wykaz: [] };
  };
}

/** Contract stub for FINN-BIP cities with no separate sold-price results stream. */
export async function crawlResultDocs() {
  return [];
}

/** Contract stub — FINN-BIP active-mode cities publish no concluded-price doc. */
export function parseResultDoc(_text, _date, _url) {
  return [];
}
