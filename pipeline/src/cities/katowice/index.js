// Katowice city adapter — implements the registry contract (see ../index.js).
//
// Katowice has TWO crawl routes that we merge:
//   1) bip.katowice.eu live board (crawl.js)              — last ~12 months
//   2) katowice.eu SharePoint lists (crawl-sharepoint.js) — full archive,
//      announcements list (~15 months) + result wykazy list (back to 2012)
//
// Both routes feed the same parsers: parseAnnouncement() for active-listing
// HTML, parseResultPdf() for result-PDF tables (pdftotext -layout). The only
// new code is the *enumeration* — the SharePoint REST API. See SPIKE-WAVE1.md
// "Appendix — katowice.eu SharePoint lists (May 2026, resolved)" for the
// endpoint discovery.
//
// Dedup:
//   - announcements: by (auction_date, address.key). Same auction may surface
//     in both routes (a current listing on the live BIP board is also on the
//     city portal). First-seen wins — BIP first so we keep the dokument.aspx
//     detail URL the existing extension content-script already targets.
//   - result PDFs: by basename. The two stores host the same PDFs at
//     different paths (e.g. `bip.katowice.eu/Lists/Dokumenty/Attachments/<id>`
//     vs. `katowice.eu/SiteAssets/Lists/<list>/AllItems/`), but the filename
//     ("Wyniki przetargów 28.04.2026.pdf") is stable across both — and using
//     it as the dedup key means we OCR / pdftotext each PDF only once.

import { config } from './config.js';
import { crawlActive as crawlActiveBip, crawlResultDocs as crawlResultDocsBip } from './crawl.js';
import {
  crawlSharePointAnnouncements,
  crawlSharePointResultDocs,
} from './crawl-sharepoint.js';
import { parseResultPdf } from './parse.js';

// Final segment of a URL, ignoring query string. Used as the dedup key for
// result PDFs that the same auction can publish at two different paths.
function pdfBasename(url) {
  const stripped = (url || '').split('?')[0];
  const idx = stripped.lastIndexOf('/');
  return decodeURIComponent(idx >= 0 ? stripped.slice(idx + 1) : stripped);
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
async function crawlActive() {
  const bip = await crawlActiveBip();
  const spListings = await crawlSharePointAnnouncements();

  const seen = new Set();
  const merged = [];
  for (const l of bip.listings) {
    const key = `${l.auction_date || ''}|${l.address?.key || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(l);
  }
  let spAdds = 0;
  for (const l of spListings) {
    const key = `${l.auction_date || ''}|${l.address?.key || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(l);
    spAdds++;
  }
  console.error(
    `  katowice merged active: ${merged.length} unique (BIP ${bip.listings.length} + SP ${spListings.length} → SP added ${spAdds})`,
  );
  return { listings: merged, wykaz: bip.wykaz };
}

/** @returns {Promise<Array<{ pdf_url: string, auction_date: string|null }>>} */
async function crawlResultDocs() {
  const bip = await crawlResultDocsBip();
  const sp = await crawlSharePointResultDocs();

  const seen = new Set();
  const refs = [];
  for (const r of bip) {
    const key = pdfBasename(r.pdf_url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    refs.push(r);
  }
  let spAdds = 0;
  for (const r of sp) {
    const key = pdfBasename(r.pdf_url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    refs.push(r);
    spAdds++;
  }
  console.error(
    `  katowice merged result docs: ${refs.length} unique (BIP ${bip.length} + SP ${sp.length} → SP added ${spAdds})`,
  );
  return refs;
}

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc: parseResultPdf,
  crawlActive,
};
