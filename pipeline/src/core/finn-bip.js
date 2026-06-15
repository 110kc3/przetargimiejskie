// Reusable FINN eUrząd ("FINN-BIP") crawl + parse helper.
//
// Most Silesian municipal BIPs run on the FINN eUrząd platform. On these sites:
//   - every page (category list AND announcement) is an `/artykul/<slug>` URL;
//   - a category page server-renders the full list of its child article links
//     (no JS, no pagination param — one page lists them all);
//   - flat-sale announcements use a consistent vocabulary:
//       "ogłasza ustny przetarg nieograniczony … na sprzedaż … lokalu
//        mieszkalnego nr <apt> … w budynku nr <bldg> przy ul. <street>",
//       "Cena wywoławcza … wynosi <kwota> zł" (often "154.000,-zł"),
//       "o pow. użytkowej <area> m2",
//       "Przetarg odbędzie się w dniu <d miesiąca rrrr>".
//
// VERIFIED LIVE against bip.myslowice.pl (June 2026) via a rendered-DOM spike —
// the index pages and article bodies above are real, server-rendered, and the
// parsers below are tuned to that exact phrasing. Mysłowice is the first user;
// Świętochłowice / Jaworzno / Częstochowa are intended to reuse it (re-confirm
// their phrasing — FINN markup is shared, wording can vary slightly).
//
// All parsing functions are pure (string → value) and unit-tested against
// fixtures reproducing the real article HTML.

import { getText } from './fetch.js';
import { parseAddress } from './normalize.js';
import { classifyKind } from './classify-kind.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Which `/artykul/` links on a category page are announcements (vs. the site's
// nav, which is also made of /artykul/ links). FINN announcement slugs start
// with these stems.
const DEFAULT_LINK_PATTERN = /\/artykul\/(?:ogloszenie|obwieszczenie|wykaz)/i;

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
  // Nominative forms — announcements occasionally typo "w dniu 17 styczeń
  // 2024" (Świętochłowice) instead of the correct genitive.
  styczeń: 1, styczen: 1, luty: 2, marzec: 3, kwiecień: 4, kwiecien: 4, maj: 5,
  czerwiec: 6, lipiec: 7, sierpień: 8, sierpien: 8, wrzesień: 9, wrzesien: 9,
  październik: 10, pazdziernik: 10, listopad: 11, grudzień: 12, grudzien: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
// Roman ordinal as written in titles/bodies. NO /i flag downstream: a
// case-insensitive `\bI\b` matched the Polish conjunction "i" → round 1.
// Longest alternatives first so "VII" isn't read as "VI".
const ROMAN_RE_SRC = '(VIII|VII|VI|IX|IV|V|X|I{1,3})';

/**
 * Flatten FINN article HTML to plain text. Block-level closers become spaces so
 * adjacent cells/labels don't run together; numeric + named entities decoded.
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h\d|\/span|\/strong|\/b)\s*\/?>/gi, ' ');
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
 * Is this announcement an OPEN auction selling a residential flat?
 * Keeps `przetarg … na sprzedaż … lokal(u) mieszkalny(ego)` (incl. share sales
 * "sprzedaż udziału … lokalu mieszkalnego"); drops bezprzetargowe tenant sales,
 * rentals (najem/dzierżawa) and land (nieruchomość niezabudowana/zabudowana).
 * @param {string} title
 * @returns {boolean}
 */
export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
}

/**
 * Auction round from the title's ordinal: "Ogłoszenie o I przetargu …" → 1,
 * "o II przetargu" → 2, "o czwartym … przetargu" → 4. Bare "przetarg" → 1.
 * Reads the title only, so a prior round in the body history can't win.
 * @param {string} title
 * @returns {number|null}
 */
export function roundFromTitle(title) {
  const t = title || '';
  if (/pierwsz/i.test(t)) return 1;
  if (/drug/i.test(t)) return 2;
  if (/trzeci/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  if (/pi[ąa]t(?!ek\b|k)/i.test(t)) return 5; // "piąty", not "piątek/piątku"
  // Roman group stays case-SENSITIVE (lowercase "i" is the conjunction);
  // surrounding literals tolerate Title-/ALL-CAPS spellings explicitly.
  const r =
    new RegExp(`\\b[oO]\\s+${ROMAN_RE_SRC}\\s+(?:[Uu]stnym\\s+|USTNYM\\s+)?(?:[Pp]rzetarg|PRZETARG)`).exec(t) ||
    new RegExp(`\\b${ROMAN_RE_SRC}\\s+(?:[Pp]rzetarg|PRZETARG)`).exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

/**
 * Body-level round fallback ("ogłasza … drugi przetarg"), scoped to the verb so
 * a prior round in the history section can't win.
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
  // Case-SENSITIVE on purpose: /i matched the conjunction "i" in
  // "ogłasza … i … przetarg" as Roman I (round 1). Take the LAST Roman in the
  // scope — it abuts "przetarg" (the scope's end), so an ALL-CAPS conjunction
  // "I" earlier in "OGŁASZA I ZAPRASZA NA II PRZETARG" can't win either.
  const ms = [...scope.matchAll(new RegExp(`\\b${ROMAN_RE_SRC}\\b`, 'g'))];
  if (ms.length) return ROMAN[ms[ms.length - 1][1]] ?? null;
  return /og[łl]asza/i.test(text || '') ? 1 : null;
}

/**
 * Parse a Polish auction amount to an integer PLN. Handles the local quirks:
 * dot/space thousands separators and the ",-" grosze placeholder, e.g.
 * "154.000,-" → 154000, "215 000,00" → 215000, "92450" → 92450.
 * @param {string} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  let c = String(s).replace(/[\s ]/g, '');
  c = c.replace(/z[łl].*$/i, '');           // drop "zł" + anything after
  c = c.replace(/,-+$/, '').replace(/,\d{1,2}$/, ''); // drop ",-" or ",dd" grosze
  c = c.replace(/[^\d]/g, '');               // thousands dots/dashes → gone
  return c ? Number(c) : null;
}

// "17,75" / "17.75" → 17.75
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Starting price: "Cena wywoławcza … wynosi 154.000,-zł" → 154000.
 * Captures the amount run (digits + dot/space thousands + ",-"/",dd" grosze)
 * up to "zł". → integer PLN or null.
 * @param {string} text
 * @returns {number|null}
 */
export function priceFromText(text) {
  // Label accepts DECLINED forms too — Świętochłowice writes the operative
  // sentence in the accusative ("Cenę wywoławczą … ustala się na kwotę
  // 195 000,00 zł"); JS \w doesn't match ę/ą, so the endings are explicit.
  //
  // The gap is `[\s\S]` (was a `[^0-9]` non-digit window): a non-digit window
  // broke on a number sitting BETWEEN the label and the amount — most often a
  // fractional-share sale ("Cena wywoławcza udziału 4/6 części … nr 3 … wynosi
  // 169 000 zł"), which left Mysłowice share listings priceless. The `\s*zł`
  // anchor plus the non-greedy gap still lock onto the FIRST "<amount> zł" after
  // the label — the operative price — so the share fraction and the apartment
  // number are skipped, not captured. Boilerplate like "1% ceny wywoławczej …"
  // can't be reached first because the real "Cena wywoławcza … zł" sentence
  // precedes it (exec returns the leftmost match). Bounded to 140 chars so a
  // deviant doc can't scan halfway across the body to an unrelated amount.
  const m = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,140}?([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/**
 * Fractional-share sale flag. Many municipal flat auctions sell only a co-owned
 * SHARE of the flat ("sprzedaż udziału 4/6 części prawa własności …"), so the
 * cena wywoławcza is the price of the share — not the whole flat — which left
 * unflagged reads as an impossibly cheap zł/m². Returns the share as "num/den"
 * (e.g. "4/6"), or null for an ordinary whole-flat sale.
 * @param {string} title  the announcement title (carries the share reliably)
 * @param {string} [text]  optional body, scanned only as a fallback
 * @returns {string|null}
 */
export function shareFromTitle(title, text = '') {
  const m = /udzia[łl]\w*(?:\s+\S+){0,3}?\s+(\d{1,3}\/\d{1,3})\s+cz[ęe][śs]/i.exec(`${title} ${text}`);
  return m ? m[1] : null;
}

/**
 * Flat usable area. Prefers the labelled value — both "powierzchnia użytkowa"
 * and the abbreviated "pow. użytkowej" — and rejects the plot ("o łącznej pow.
 * 1138 m2"), shares ("udział … pow.") and the cellar ("piwnicę o powierzchni
 * 2,68 m2"). Plausibility window 8–300 m². → m² or null.
 * @param {string} text
 * @returns {number|null}
 */
export function areaFromText(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  // Labelled flat area: "pow[ierzchni]. użytkow… <num> m²". Scanned as a
  // GLOBAL match with a cellar/plot guard: announcements label the cellar the
  // same way ("wraz z piwnicą o powierzchni użytkowej 8,36 m2"), and the REAL
  // flat label can sit further from its number ("Łączna powierzchnia użytkowa
  // lokalu mieszkalnego wynosi: 71,10 m2" — 28 chars, over the old {0,20}
  // gap), so the first *unguarded* labelled hit used to be the cellar —
  // producing 8 m² "flats" at 21 000+ zł/m² in the archive.
  const LAB_EXCLUDE = /piwnic|kom[óo]rk|przynale[żz]|gara[żz]|strych|dzia[łl]k|grunt/i;
  const LAB = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*([^0-9]{0,40}?)([\d.,]+)\s*m\s*[²2]/gi;
  let lm;
  while ((lm = LAB.exec(text)) !== null) {
    const before = text.slice(Math.max(0, lm.index - 30), lm.index);
    if (LAB_EXCLUDE.test(before) || LAB_EXCLUDE.test(lm[1])) continue;
    const v = parseArea(lm[2]);
    if (plausible(v)) return v;
  }
  // Fallback: a bare "<num> m²". Prefer one tagged "użytkow…"; skip plot/share/cellar.
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    // Exclusions FIRST: a cellar is often itself labelled "użytkow…" ("wraz z
    // piwnicą o powierzchni użytkowej 8,36 m2"), so the użytkow fast-path must
    // not fire on a guarded value.
    if (/dzia[łl]k|grunt|obr[ęe]b|[łl][ąa]cznej|udzia[łl]/i.test(before)) continue; // plot / share
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]|strych/i.test(before)) continue; // cellar / attic
    const v = parseArea(m[1]);
    if (/u[żz]ytkow/i.test(before)) {
      if (plausible(v)) return v;
      continue;
    }
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

/**
 * Auction date: "Przetarg odbędzie się w dniu 9 grudnia 2025 r." (spelled month)
 * or a numeric "w dniu 09.12.2025". → ISO "2025-12-09" or null.
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  // Primary anchor: the operative future-tense sentence.
  const spelled = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  const numAnchored = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numAnchored) {
    return `${numAnchored[3]}-${numAnchored[2].padStart(2, '0')}-${numAnchored[1].padStart(2, '0')}`;
  }
  // Fallbacks REQUIRE the "w dniu" prefix. The body passed in is the whole
  // FINN document including page chrome — an unanchored scan used to return
  // the leftmost date anywhere ("Data publikacji: …", the town dateline,
  // a wadium deadline) whenever the operative sentence deviated. A "w dniu"
  // date can still be a non-auction date, but it can't be page chrome; better
  // to return null (caller keeps the listing dateless) than a wrong date that
  // misclassifies the auction as archived.
  const anySpelled = /w\s+dniu\s+(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[śs]nia|pa[źz]dziernika|listopada|grudnia)\s+(\d{4})/i.exec(text);
  if (anySpelled) {
    const mon = PL_MONTHS[anySpelled[2].toLowerCase()];
    if (mon) return `${anySpelled[3]}-${String(mon).padStart(2, '0')}-${anySpelled[1].padStart(2, '0')}`;
  }
  const num = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  return null;
}

/**
 * Build the keyed address from a FINN flat-auction title/body. Two phrasings are
 * handled:
 *   B (Mysłowice): "… lokalu mieszkalnego nr <apt> … w budynku nr <bldg> przy
 *      ul. <Street> w <City>"  — building number BEFORE the street.
 *   A (Sosnowiec/general): "… przy ul. <Street> <bldg>"  — number after street.
 * @param {string} title
 * @param {string} text  flattened article body
 * @returns {{address_raw:string, address:object}|null}
 */
export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt =
    /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i.exec(src)?.[1] || null;

  // Pattern B: "… budynku nr <bldg> przy ul(icy) <Street> [w <City> | , | wraz | o pow]"
  const b =
    /budynku\s+(?:nr\.?\s*)?(\d+[A-Za-z]?)\s+przy\s+(?:ul\.|ulicy|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=\s+w\s+[A-ZŻŹĆŁŚ]|\s+w\s+dzielnic|\s+wraz|\s+o\s+pow|[,.;]|$)/i.exec(src);
  // The /i flag (needed for "Budynku"/"PRZY" case variance) also lowers the
  // street's deliberate uppercase first-letter guard — re-check it here so
  // "…nr 5 przy czym nabywca…" can't capture "czym nabywca" as a street.
  if (b && !/^[A-ZŻŹĆŁŚĄĘÓŃ]/.test(b[2])) b[2] = null;
  if (b && b[2]) {
    const building = b[1].toUpperCase();
    const street = b[2].replace(/\s+/g, ' ').trim();
    const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }

  // Pattern A: "przy ul. <Street> <bldg>[/<apt>]"
  const aRe =
    /przy\s+(?:ul\.|ulicy|al\.|alei|placu|pl\.|os\.|osiedlu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/;
  const a = aRe.exec(title) || aRe.exec(src);
  if (a) {
    const street = a[1].replace(/\s+/g, ' ').trim();
    let buildingApt = a[2];
    if (!/\//.test(buildingApt) && apt) buildingApt = `${buildingApt}/${apt}`;
    const raw = `${street} ${buildingApt}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  return null;
}

/**
 * Parse one FINN article into a flat listing, or null if it isn't a keyable
 * residential-flat sale.
 * @param {string} title
 * @param {string} contentHtml  article body HTML
 * @returns {null | {kind, address_raw, address, area_m2, starting_price_pln, round, auction_date, share}}
 */
export function parseAnnouncement(title, contentHtml) {
  const text = htmlToText(contentHtml);
  const addr = addressFrom(title, text);
  if (!addr) return null;
  const kind = classifyKind(title);
  return {
    kind: kind === 'mieszkalny' || kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFromTitle(title) ?? roundFromText(text),
    auction_date: auctionDateFromText(text),
    share: shareFromTitle(title, text),
  };
}

/**
 * Parse one FINN article body for LAND (działka/grunt) fields.
 * Extracts parcel number, obręb, plot area, street, price, date, round.
 * Normalises CMS-injected spaces: "106 .000,-zł" → 106000, "2 3 czerwca 202 6" → 2026-06-23.
 * Returns null when the record is not keyable (no parcel nr AND no street).
 * @param {string} title
 * @param {string} contentHtml  article body HTML (or plain text wrapped in <p>)
 * @param {string} url
 * @returns {object|null}
 */
export function parseLandAnnouncement(title, contentHtml, url) {
  const rawText = htmlToText(contentHtml);
  // Fix "NNN .NNN" — space before decimal point inside amount
  let text = rawText.replace(/(\d)\s+\./g, '$1.').replace(/\.\s+(\d)/g, '.$1');
  // Fix spaced-out year "202 6" → "2026"
  text = text.replace(/\b(20[23])\s+(\d)\b/g, '$1$2');
  // Fix spaced-out day digits before a Polish month name
  text = text.replace(
    /\b(\d)\s+(\d)\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrzesnia|wrze[śs]nia|pa[źz]dziernika|pa[źz]dziernik|listopada|grudnia|stycze[ńn]|luty|marzec|kwiecie[ńn]|czerwiec|lipiec|sierpie[ńn]|wrzesie[ńn]|listopad|grudzie[ńn])/gi,
    '$1$2 $3',
  );

  // --- Parcel number ---
  const parcelM = /dzia[łl][ek]{1,2}\w*\s+(?:nr\.?|numer)?\s*([\d/][\d/,\s]+)/i.exec(text);
  let dzialka_nr = null;
  if (parcelM) {
    const run = parcelM[1].slice(0, 80);
    const parcels = [...run.matchAll(/(\d+\/?\d*)/g)].map((m) => m[1]);
    const clean = parcels.filter((p) => /^\d+(?:\/\d+)?$/.test(p));
    if (clean.length) dzialka_nr = clean.join(', ');
  }

  // --- Obręb ---
  const obrebM = /obr[eę]b[u]?\s+(?:nr\.?\s*)?(\d{4}(?:\s+\S+)?|[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ\s-]{1,40})/i.exec(text);
  const obreb = obrebM ? obrebM[1].replace(/\s+/g, ' ').trim().replace(/\s*,.*$/, '') : null;

  // --- Plot area ---
  let area_m2 = null;
  const AREA_RE = /(?:(?:[łl]ącznej\s+)?pow(?:ierzchni)?\.?\s*|powierzchni[a]?\s+)([\d.,\s]+)\s*m\s*[²2]/gi;
  let am;
  while ((am = AREA_RE.exec(text)) !== null) {
    const before = text.slice(Math.max(0, am.index - 40), am.index);
    if (/u[żz]ytkow/i.test(before) || /u[żz]ytkow/i.test(am[0])) continue;
    const raw = am[1].replace(/\s/g, '');
    const n = Number(raw.replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1e7) {
      if (area_m2 == null || n > area_m2) area_m2 = n;
    }
  }

  // --- Street address ---
  let street = null;
  let address_raw = null;
  let address = null;
  const streetM = /(?:przy|w\s+rejonie|po[łl]o[żz]onej?\s+(?:przy\s+)?(?:ul\.|ulicy)?)\s+(?:ul\.|ulicy|al\.|alei)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=\s*[,;.]|\s+w\s+[A-Z]|\s+obejmują|\s+(?:o\s+)?łączn|\s+na\s+arkusz|$)/i.exec(text);
  if (streetM) {
    street = streetM[1].replace(/\s+/g, ' ').trim();
    address_raw = 'ul. ' + street;
    const parsed = parseAddress(address_raw);
    if (parsed) address = parsed;
  }

  if (!dzialka_nr && !street) return null;

  return {
    kind: 'grunt',
    dzialka_nr,
    obreb,
    zoning: null,
    address_raw: address_raw ?? null,
    street,
    building: null,
    address,
    area_m2,
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromTitle(title) ?? roundFromText(text),
    detail_url: url,
    source_url: url,
    geoportal_url: null,
  };
}


/**
 * Harvest unique announcement article URLs from one FINN index page's HTML.
 * @param {string} html
 * @param {string} origin  e.g. "https://bip.myslowice.pl"
 * @param {RegExp} [pattern]  which hrefs count as announcements
 * @returns {string[]}
 */
export function parseIndexLinks(html, origin, pattern = DEFAULT_LINK_PATTERN) {
  const out = [];
  const seen = new Set();
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/gi, '&');
    if (!pattern.test(href)) continue;
    if (!/^https?:/i.test(href)) href = origin + (href.startsWith('/') ? '' : '/') + href;
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

/**
 * Extract an article's title from its FINN HTML (the announcement <h1>); the
 * body is the whole document (the body parsers tolerate surrounding chrome).
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
 * @param {string[]} cfg.indexUrls  category pages to harvest announcement links from
 * @param {string} cfg.id           city id, for log lines
 * @param {RegExp} [cfg.linkPattern]  which /artykul/ hrefs are announcements
 * @param {RegExp} [cfg.linkFilter]   extra href filter applied to URL slugs.
 *   Pass null to inspect every matched announcement — classifyKind decides kind.
 *   Example: /lokal|niezabudow|zabudow|uzytkow|dzialk/i admits flats + land.
 * @param {(title:string)=>boolean} [cfg.isFlat]  override the flat-auction guard.
 * @returns {() => Promise<{listings:object[], wykaz:object[], land:object[]}>}
 */
export function makeCrawlActive(cfg) {
  const {
    origin, indexUrls, id,
    linkPattern = DEFAULT_LINK_PATTERN,
    linkFilter = null,
    isFlat = isFlatAuction,
  } = cfg;
  const FETCH_OPTS = { userAgent: BROWSER_UA };

  return async function crawlActive() {
    // 1) Harvest announcement URLs from every index page.
    const urls = [];
    const seen = new Set();
    for (const idx of indexUrls) {
      let html;
      try {
        html = await getText(idx, FETCH_OPTS);
      } catch (err) {
        console.error(`  ${id} index fetch failed (${idx}): ${err.message}`);
        continue;
      }
      const links = parseIndexLinks(html, origin, linkPattern).filter(
        (u) => !linkFilter || linkFilter.test(u),
      );
      let added = 0;
      for (const u of links) {
        if (seen.has(u)) continue;
        seen.add(u);
        urls.push(u);
        added++;
      }
      console.error(`  ${id} index ${idx}: ${links.length} announcement link(s) (${added} new)`);
    }
    console.error(`  ${id}: ${urls.length} candidate announcement(s) to inspect`);

    // 2) Fetch each, keep the flat-sale auctions, parse the body.
    const listings = [];
    const land = [];
    let flats = 0;
    let plots = 0;
    for (const url of urls) {
      let html;
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  ${id} article fetch failed (${url}): ${err.message}`);
        continue;
      }
      let title, body;
      try {
        ({ title, body } = extractArticle(html));
      } catch (err) {
        console.error(`  ${id} article extract failed (${url}): ${err.message}`);
        continue;
      }

      // Classify on the title; route grunt -> land[], flats -> listings[].
      const kindFromTitle = classifyKind(title);

      if (kindFromTitle === 'grunt') {
        try {
          const lr = parseLandAnnouncement(title, body, url);
          if (lr) { land.push(lr); plots++; }
          else console.error(`  ${id} WARN: unkeyable land ${url} (${title.slice(0, 70)})`);
        } catch (err) {
          console.error(`  ${id} land parse failed (${url}): ${err.message}`);
        }
        continue;
      }

      // Flat path -- guard with isFlatAuction to drop rentals/bezprzetargowe.
      if (!isFlat(title)) continue;
      flats++;
      try {
        const parsed = parseAnnouncement(title, body);
        if (!parsed) {
          console.error(`  ${id} WARN: unkeyable flat ${url} (${title.slice(0, 70)})`);
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
          share: parsed.share,
        });
      } catch (err) {
        console.error(`  ${id} flat parse failed (${url}): ${err.message}`);
      }
    }
    console.error(
      `  ${id} active: ${listings.length} flat listing(s) from ${flats}; ${plots} land plot(s)`,
    );
    return { listings, wykaz: [], land };
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
