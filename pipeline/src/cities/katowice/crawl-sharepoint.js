// Katowice — deeper history route via the city portal's SharePoint REST API.
//
// `bip.katowice.eu`'s live board only carries the last ~12 months of auctions.
// The real archive is on the city portal `katowice.eu`, in two SharePoint
// lists. The page (`AllItems.aspx`) is client-rendered, but the underlying
// REST endpoint `/_api/web/lists(guid'…')/items` is publicly readable, no
// auth, server-side JSON — see SPIKE-WAVE1.md "Appendix — katowice.eu
// SharePoint lists (May 2026, resolved)".
//
// Lists used here:
//   - Przetargi na zbycie nieruchomości (announcements)
//       GUID 45A01FD4-EF73-4E52-8294-C31CE3CEB738
//       body in Treść field; no PDF — full announcement inline
//   - Wykazy dotyczące wyników przetargów i inne ogłoszenia (results)
//       GUID 272ABCA8-EAFD-4D6A-AFFA-D418AB3630B2
//       body is a short summary + an <a href> to a "Wyniki…pdf" attachment
//
// Reality check (May 2026): the Treść body of older result wykazy contains
// hrefs to PDFs that no longer exist on katowice.eu (HTTP 404). Roughly 26 of
// ~292 referenced PDFs actually resolve. The survivors include the *yearly
// summary* PDFs ("Informacja w sprawie zbywania nieruchomości … za rok YYYY")
// which carry every auction's address + start price + achieved price for
// that year — i.e. the very dataset we wanted. We filter the dead hrefs out
// with a cheap HEAD probe before handing refs to the downstream parser, so
// refresh.js doesn't waste 5 minutes per cron run fetching 404s.

import { politeGet } from '../../core/fetch.js';
import { parseAnnouncement } from './parse.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { urlCacheKey } from '../../core/hash.js';

const ORIGIN = 'https://katowice.eu';
const ANNOUNCEMENTS_GUID = '45A01FD4-EF73-4E52-8294-C31CE3CEB738';
const RESULTS_GUID = '272ABCA8-EAFD-4D6A-AFFA-D418AB3630B2';

// SharePoint Polish-encoded field names — stable across the API regardless
// of what the URL slug looks like. (Treść → Tre_x015b__x0107_).
const F_TITLE = 'Title';
const F_BODY = 'Tre_x015b__x0107_';
const F_PUBLIKACJA = 'Data_x0020_publikacji';

// One request per list. Our two lists are 60 and 295 items today; growth is
// slow (~tens/year). $top=2000 gives ~6 years of safety margin. If a list
// ever truly grows past that, swap to the OData __next paging the API
// surfaces — every response carries d.__next when the result set is paged.
const PAGE_SIZE = 2000;

const CACHE_DIR = fileURLToPath(
  new URL('../../../pdf-text-cache/', import.meta.url),
);

// HEAD-probe knobs — used only to filter out broken hrefs inside Treść
// bodies before refresh.js hands them to pdfText(). Polite but parallel:
// at 5 concurrent we get through ~300 URLs in ~5 seconds without poking the
// server harder than a normal user clicking through the list.
const PROBE_CONCURRENCY = 5;
const UA =
  'przetargimiejskie-bot/0.1 (+https://github.com/110kc3/przetargimiejskie)';

/** GET the items of one SharePoint list as plain JSON. Throws on any non-2xx. */
async function fetchListItems(guid) {
  const fields = [F_TITLE, F_BODY, F_PUBLIKACJA, 'Id', 'Attachments'].join(',');
  const url =
    `${ORIGIN}/_api/web/lists(guid'${guid}')/items` +
    `?$select=${fields}` +
    `&$orderby=${F_PUBLIKACJA}%20asc` +
    `&$top=${PAGE_SIZE}`;
  const res = await politeGet(url, { accept: 'application/json;odata=verbose' });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const json = await res.json();
  const items = json?.d?.results;
  if (!Array.isArray(items)) {
    throw new Error(`unexpected SharePoint payload for list ${guid}`);
  }
  if (json?.d?.__next) {
    console.error(
      `  katowice SP list ${guid}: ${items.length} returned, __next present (list larger than $top=${PAGE_SIZE})`,
    );
  }
  return items;
}

// "DD.MM.YYYY[r.]" → "YYYY-MM-DD" (returns null when not present).
function extractAuctionDate(title) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(title || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// First PDF link in the result-wykaz body. Returns an absolute URL on
// katowice.eu (the body links are typically server-relative). The hrefs
// often contain literal Polish characters (ó, ą, ł, …) that need
// percent-encoding before fetch() will accept them; we route through the
// WHATWG URL parser to do that uniformly.
function extractResultPdfUrl(body) {
  if (!body) return null;
  const m = /href="([^"]*\.pdf[^"]*)"/i.exec(body);
  if (!m) return null;
  const raw = m[1].replace(/&amp;/gi, '&');
  try {
    return new URL(raw, ORIGIN).href;
  } catch {
    return null;
  }
}

// Lightweight HEAD probe — only used to filter out the SharePoint dead
// links described in the file header. Throttles itself across PROBE_CONCURRENCY
// workers so the city portal sees at most that many concurrent HEADs.
async function probeIsReachable(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    // A surviving SharePoint PDF answers with application/pdf; an evicted
    // one answers 200/text-html (a SharePoint "this page can't be found"
    // template) or 404. Treat anything non-pdf as a dead link.
    return ct.includes('pdf');
  } catch {
    return false;
  }
}

async function filterReachable(refs) {
  // Anything already in pdf-text-cache was OK on a previous run — skip the
  // HEAD probe for those, so cost amortises to ~0 once the cache is warm.
  const probeNeeded = [];
  const knownGood = [];
  for (const r of refs) {
    const cachePath = join(CACHE_DIR, urlCacheKey(r.pdf_url) + '.txt');
    if (existsSync(cachePath)) knownGood.push(r);
    else probeNeeded.push(r);
  }
  if (probeNeeded.length === 0) {
    console.error(`  katowice SP: all ${refs.length} PDF URL(s) already in cache, no HEAD probes`);
    return knownGood;
  }
  console.error(
    `  katowice SP: HEAD-probing ${probeNeeded.length} new PDF URL(s) (${knownGood.length} already cached)`,
  );
  const out = [...knownGood];
  let next = 0;
  let kept = 0;
  let dropped = 0;
  async function worker() {
    while (next < probeNeeded.length) {
      const i = next++;
      const r = probeNeeded[i];
      const ok = await probeIsReachable(r.pdf_url);
      if (ok) { out.push(r); kept++; }
      else dropped++;
    }
  }
  const workers = Array.from({ length: PROBE_CONCURRENCY }, () => worker());
  await Promise.all(workers);
  console.error(
    `  katowice SP: HEAD-probe done — kept ${kept} reachable, dropped ${dropped} dead-link(s)`,
  );
  return out;
}

/**
 * Walk the SharePoint announcements list and parse each item's Treść body
 * into the same `active listing` shape `crawl.js#crawlActive` produces.
 */
export async function crawlSharePointAnnouncements() {
  let items;
  try {
    items = await fetchListItems(ANNOUNCEMENTS_GUID);
  } catch (err) {
    console.error(`  katowice SP announcements: ${err.message}`);
    return [];
  }
  const listings = [];
  for (const it of items) {
    const title = (it[F_TITLE] || '').trim();
    const body = it[F_BODY] || '';
    if (!title || !body) continue;
    const docUrl =
      `${ORIGIN}/Lists/Nieruchomoci%20%20ogoszenia/DispForm.aspx?ID=${it.Id}`;
    const listing = parseAnnouncement(body, title, docUrl);
    if (listing) listings.push(listing);
  }
  console.error(
    `  katowice SP: ${listings.length} announcement(s) parsed from ${items.length} list item(s)`,
  );
  return listings;
}

/**
 * Walk the SharePoint results list and return one ref per linked PDF that
 * is actually reachable. Each ref is `{ pdf_url, auction_date }` — the
 * same shape `crawl.js#crawlResultDocs` returns and refresh.js feeds to
 * pdfText() + parseResultPdf(). Dead links inside the Treść bodies are
 * dropped here so downstream code never sees them.
 */
export async function crawlSharePointResultDocs() {
  let items;
  try {
    items = await fetchListItems(RESULTS_GUID);
  } catch (err) {
    console.error(`  katowice SP results: ${err.message}`);
    return [];
  }
  const candidates = [];
  for (const it of items) {
    const title = (it[F_TITLE] || '').trim();
    const body = it[F_BODY] || '';
    if (!title || !body) continue;
    const pdf_url = extractResultPdfUrl(body);
    if (!pdf_url) continue;
    candidates.push({ pdf_url, auction_date: extractAuctionDate(title) });
  }
  console.error(
    `  katowice SP: ${candidates.length} PDF href(s) in body of ${items.length} list item(s)`,
  );
  return filterReachable(candidates);
}
