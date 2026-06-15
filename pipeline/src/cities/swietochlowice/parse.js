// Świętochłowice parsers.
//
// The announcement vocabulary is the standard Polish auction language, so the
// field extractors (address/price/area/date/round) are the shared finn-bip
// parsers, re-exported here. What's Świętochłowice-specific is the Liferay
// index: each announcement is an `<a href="/res/serwisy/pliki/<id>">title</a>`
// whose title carries the address + round, and whose target is the .doc body.
//
// `parseDocLinks` harvests those (title, url) pairs from a category page's HTML;
// `isFlatAnnouncement` keeps only the actual flat-sale auction announcements,
// dropping the result notices ("Informacja o wyniku …"), intents ("Zamiar
// sprzedaży …"), wykazy, and the .docx "KW" land-registry annex.

import {
  htmlToText,
  priceFromText,
  addressFrom,
  roundFromTitle,
  parsePLN,
} from '../../core/finn-bip.js';

export { classifyKind } from '../../core/classify-kind.js';

export {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  addressFrom,
  roundFromTitle,
  roundFromText,
  shareFromTitle,
  parseAnnouncement,
  parseLandAnnouncement,
} from '../../core/finn-bip.js';


/**
 * Is this a GENERIC przetarg announcement (not a result notice / intent / wykaz)?
 * Used for sibling category boards (houses + land + commercial) where the title
 * may not contain "lokal mieszkalny". HL-27.
 * @param {string} title
 * @returns {boolean}
 */
export function isAuctionAnnouncement(title) {
  const t = (title || '').toLowerCase();
  if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni|zamiar\s+sprzeda|^\s*wykaz|za[łl][ąa]cznik/.test(t)) {
    return false;
  }
  if (/^\s*(?:kw\b|ksi[eę]g)/.test(t)) return false;
  if (!/przetarg/.test(t)) return false;
  return /sprzeda/.test(t);
}

/**
 * Is this index link an actual flat-sale AUCTION announcement (the .doc we want),
 * as opposed to a result notice / intent / wykaz / KW annex?
 * @param {string} title  the link's anchor text
 * @returns {boolean}
 */
export function isFlatAnnouncement(title) {
  const t = (title || '').toLowerCase();
  // Drop notices that aren't a live auction announcement: any "informacja o …"
  // (result / cancellation), explicit result/cancellation/annulment wording,
  // intents ("zamiar sprzedaży") and listings (wykaz).
  if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni|zamiar\s+sprzeda|^\s*wykaz|za[łl][ąa]cznik/.test(t)) {
    return false;
  }
  // The .docx land-registry annex is dropped only when "KW"/"księga" LEADS the
  // title — a genuine announcement merely CITING the KW number used to be
  // over-rejected by a bare `\bkw\b` match anywhere.
  if (/^\s*(?:kw\b|ksi[eę]g)/.test(t)) return false;
  if (!/przetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
}

/**
 * Harvest unique (title, url) pairs for `/res/serwisy/pliki/<id>` attachment
 * links from one Liferay category page's HTML.
 * @param {string} html
 * @param {string} origin  e.g. "https://www.bip.swietochlowice.pl"
 * @returns {{title:string, url:string}[]}
 */
export function parseDocLinks(html, origin) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href="(\/res\/serwisy\/pliki\/\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = origin + m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: htmlToText(m[2]) });
  }
  return out;
}

// ----------------- result notices ("Informacja o wyniku …") -----------------
//
// The same board carries published results as small PDFs (~45 KB), titled
// e.g. "Informacja o wyniku z III przetargu na sprzedaż spółdzielczego
// własnościowego prawa do lokalu mieszkalnego przy ul. Polaka 7/6 w
// Świętochłowicach." — the TITLE alone gives the address key + round; the PDF
// body carries the auction date, cena wywoławcza and the achieved price.
// crawl.js extracts each PDF (pdftotext, catdoc fallback) and hands
// parseResultDoc `"<title>\n<body text>"`.
//
// ⚠️ The body parsing is BEST-EFFORT (no result-PDF sample was extractable at
// build time — Zabrze precedent): a record is emitted only when the outcome
// is determinable (explicit negative wording, or an achieved price). A body
// that matches neither parses to [] and surfaces as the refresh loop's
// "parser returned 0 records" WARN — validate + tune on the first CI run.

/** Is this link a published flat-sale RESULT notice (not a cancellation)? */
export function isFlatResultNotice(title) {
  const t = (title || '').toLowerCase();
  if (!/informacj\w*\s+o\s+wynik/.test(t)) return false;
  if (/odwo[łl]ani|uniewa[żz]ni/.test(t)) return false;
  return /lokalu\s+mieszkaln|prawa\s+do\s+lokalu\s+mieszkaln/.test(t);
}

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/**
 * Parse one result notice into a concluded record (framework shape).
 * @param {string} text  `"<title>\n<extracted PDF text>"` from crawlResultDocs
 * @param {string|null} fallbackDate  board publish date (body date preferred)
 * @param {string} sourceUrl  the PDF's /res/serwisy/pliki/<id> URL
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const s = String(text || '');
  const nlAt = s.indexOf('\n');
  const title = nlAt >= 0 ? s.slice(0, nlAt) : s;
  const body = nlAt >= 0 ? s.slice(nlAt + 1).replace(/\s+/g, ' ') : '';
  if (!isFlatResultNotice(title)) return [];

  const notes = [];
  const addr = addressFrom(title, body);
  if (!addr) return [];
  const round = roundFromTitle(title);

  // Past-tense operative date: "w dniu D.M.YYYY" or "w dniu D <miesiąca> YYYY".
  let auction_date = null;
  const dn = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(body);
  if (dn) {
    auction_date = `${dn[3]}-${dn[2].padStart(2, '0')}-${dn[1].padStart(2, '0')}`;
  } else {
    const ds = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(body);
    const mon = ds ? PL_MONTH[ds[2].toLowerCase()] : null;
    if (mon) auction_date = `${ds[3]}-${String(mon).padStart(2, '0')}-${ds[1].padStart(2, '0')}`;
  }
  if (!auction_date) {
    // The board's own phrasing puts the date BEFORE the verb, with no "w dniu":
    // "w Urzędzie Miejskim w Świętochłowicach, 21 kwietnia 2026 r., przeprowadzono
    // trzeci publiczny przetarg …" — spelled or numeric variant.
    const pr = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r?\W{0,5}przeprowadzono/i.exec(body);
    const mon = pr ? PL_MONTH[pr[2].toLowerCase()] : null;
    if (mon) {
      auction_date = `${pr[3]}-${String(mon).padStart(2, '0')}-${pr[1].padStart(2, '0')}`;
    } else {
      const pn = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\W{0,5}przeprowadzono/i.exec(body);
      if (pn) auction_date = `${pn[3]}-${pn[2].padStart(2, '0')}-${pn[1].padStart(2, '0')}`;
    }
  }
  if (!auction_date && fallbackDate) {
    auction_date = fallbackDate;
    notes.push('date: board publish-date fallback');
  }

  // Achieved price — the standard wordings ("najwyższa cena", "cena osiągnięta
  // / osiągnięto cenę", "cena nabycia/sprzedaży").
  const achievedM =
    /(?:najwy[żz]sz\w+\s+cen|cen[aąęy]\s+osi[ąa]gni[ęe]t|osi[ąa]gni[ęe]t[ao][^0-9]{0,20}cen|cen[aąęy]\s+nabycia|cen[aąęy]\s+sprzeda[żz]y)[^0-9]{0,80}?([\d][\d  .]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  const negative =
    /negatywn|nie\s+wy[łl]oniono|nikt\s+nie\s+przyst[ąa]pi|brak\s+ofert|nie\s+dosz[łl]o\s+do/i.test(body);

  // Outcome not determinable → no record (refresh logs the 0-records WARN).
  if (!negative && !achievedM) return [];

  const starting_price_pln = priceFromText(body);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    starting_price_pln,
    final_price_pln: negative ? null : parsePLN(achievedM[1]),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2: null, // result notices rarely repeat the area; merge keeps the announcement's
    notes,
  }];
}
