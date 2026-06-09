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

import { htmlToText } from '../../core/finn-bip.js';

export {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  addressFrom,
  roundFromTitle,
  roundFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../../core/finn-bip.js';

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
