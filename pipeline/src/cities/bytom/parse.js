// Bytom parsers.
//
// Two roles:
//   1. parseResultDoc — contract stub. Bytom publishes no machine-readable sold
//      results (crawlResultDocs() returns []), so it is never invoked.
//   2. parseAnnouncement — extracts price / area / auction-date / round from one
//      auction's .doc announcement text (converted by core/doc-text.js). Used by
//      crawl.js's enrichActive to recover listings the i-BIIP catalog has
//      dropped (concluded/past auctions that linger on the BIP list with no
//      inline data — their figures live ONLY inside the .doc).
//
// ⚠️ parseAnnouncement is BEST-EFFORT, written without a reachable sample (the
// CI sandbox can't resolve bytom.pl — see crawl.js). It anchors on the standard
// Polish ogłoszenie vocabulary ("cena wywoławcza … zł", "o powierzchni użytkowej
// … m²", "przetarg odbędzie się w dniu …", ordinal → round) and is tolerant of
// catdoc's flat text output. VALIDATE + TUNE against the first real CI run.

const ROUND_WORDS = [
  [/\bpierwsz/i, 1],
  [/\bdrug/i, 2],
  [/\btrzeci/i, 3],
  [/\bczwart/i, 4],
  [/\bpi[ąa]t/i, 5],
];

// Polish month names (nominative + genitive forms as they appear in dates).
const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9,
  października: 10, październik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "85 000,00 zł" / "85.000,00" / "170000" → integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

// "53,77" / "53.77" → 53.77
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Ordinal in the announcement → round number. Bare "przetarg" = first. */
export function roundFromText(text) {
  const t = text || '';
  for (const [re, n] of ROUND_WORDS) if (re.test(t)) return n;
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

/**
 * Auction date from the announcement body. Bytom announcements state it as
 * "przetarg odbędzie się w dniu 16 czerwca 2026 r." (month spelled out) or, less
 * often, "16.06.2026 r.". Anchored on the FUTURE-tense "odbędzie/odbędą się" so
 * we capture THIS auction's date, not a prior round quoted in the history. → ISO
 * or null.
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]d[ązie]+\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  // Spelled-out month: "16 czerwca 2026"
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  // Numeric: "16.06.2026"
  const num = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(scope);
  if (num) return iso(num[3], num[2], num[1]);
  return null;
}

/**
 * Starting price. The label "cena wywoławcza" is followed (possibly after
 * "nieruchomości"/"lokalu"/"wynosi") by the amount "… zł". We scan a bounded
 * window after the label and take the first "<num> zł".
 */
export function priceFromText(text) {
  if (!text) return null;
  const start = text.search(/cena\s+wywo[łl]awcza/i);
  if (start < 0) return null;
  const region = text.slice(start, start + 200);
  const m = /([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Flat/commercial area. Prefer the value labelled "powierzchni(a) użytkowej",
 * which names the unit itself; fall back to the first "<num> m²" token that
 * isn't a plot (działka) or cellar (piwnica / komórka / pomieszczenie
 * przynależne). Avoids picking up the plot area or the cellar area.
 */
export function areaFromText(text) {
  if (!text) return null;
  const M2 = /([\d][\d.,]*)\s*m\s*(?:[²2]|kw)(?!\d)/gi;
  // 1) labelled "powierzchni użytkowej … m²"
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (v && v > 0) return v;
  }
  // 2) fallback — collect bare m² tokens, drop plot/cellar, take the largest.
  const cands = [];
  let m;
  M2.lastIndex = 0;
  while ((m = M2.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt/i.test(before)) continue; // plot
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]/i.test(before)) continue; // cellar
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

/**
 * Extract one announcement's fields from its converted .doc text.
 * @param {string} text  catdoc output
 * @returns {{ round:number|null, auction_date:string|null, area_m2:number|null, starting_price_pln:number|null }}
 */
export function parseAnnouncement(text) {
  return {
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
  };
}

// Contract stub — Bytom has no machine-readable results stream; crawlResultDocs()
// returns [], so this is never invoked. Present only to satisfy the registry.
export function parseResultDoc(_text, _date, _url) {
  return [];
}
