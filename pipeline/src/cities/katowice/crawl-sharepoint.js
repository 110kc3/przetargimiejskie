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
import { parseAnnouncements, parseLandAnnouncement } from './parse.js';
import { classifyKind } from '../../core/classify-kind.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { urlCacheKey } from '../../core/hash.js';

const ORIGIN = 'https://katowice.eu';
const ANNOUNCEMENTS_GUID = '45A01FD4-EF73-4E52-8294-C31CE3CEB738';
const RESULTS_GUID = '272ABCA8-EAFD-4D6A-AFFA-D418AB3630B2';

const F_TITLE = 'Title';
const F_BODY = 'Tre_x015b__x0107_';
const F_PUBLIKACJA = 'Data_x0020_publikacji';

const PAGE_SIZE = 2000;

const CACHE_DIR = fileURLToPath(
  new URL('../../../pdf-text-cache/', import.meta.url),
);

const PROBE_CONCURRENCY = 5;
const UA =
  'przetargimiejskie-bot/0.1 (+https://github.com/110kc3/przetargimiejskie)';

// Hard ceiling on paging, purely defensive — a buggy/looping __next chain
// must not turn the cron run into an infinite crawl. 10 pages × 2000 rows is
// far beyond either list's realistic growth.
const MAX_PAGES = 10;

async function fetchListItems(guid) {
  const fields = [F_TITLE, F_BODY, F_PUBLIKACJA, 'Id', 'Attachments'].join(',');
  let url =
    `${ORIGIN}/_api/web/lists(guid'${guid}')/items` +
    `?$select=${fields}` +
    `&$orderby=${F_PUBLIKACJA}%20asc` +
    `&$top=${PAGE_SIZE}`;
  const all = [];
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res = await politeGet(url, { accept: 'application/json;odata=verbose' });
    if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
    const json = await res.json();
    const items = json?.d?.results;
    if (!Array.isArray(items)) {
      throw new Error(`unexpected SharePoint payload for list ${guid}`);
    }
    all.push(...items);
    // Follow server-driven paging once the list outgrows $top — items past the
    // first page used to be silently dropped (logged but never fetched).
    url = json?.d?.__next || null;
    if (url) {
      console.error(
        `  katowice SP list ${guid}: ${all.length} item(s) so far, following __next…`,
      );
    }
  }
  if (url) {
    console.error(
      `  katowice SP list ${guid}: stopped after ${MAX_PAGES} pages with __next still present (${all.length} items)`,
    );
  }
  return all;
}

function extractAuctionDate(title) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(title || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

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

// The SharePoint "Wykazy … wyników przetargów i inne ogłoszenia" list mixes
// auction-result PDFs with unrelated documents that have no auction records:
// rent-rate tables ("stawki czynszu …"), a literal test file ("plik testowy"),
// and a pre-2020 multi-year summary ("… za rok 2005-2011"). The parser returns
// 0 records from these (→ "WARN null" noise). Skip them up front. Matched on the
// decoded URL + title so URL-encoding (%20 etc.) doesn't hide the keywords.
const NON_AUCTION_DOC =
  /stawki\s+czynszu|plik\s+testowy|2005-2011|cennik|regulamin/i;

function isNonAuctionDoc(pdfUrl, title) {
  let name = pdfUrl;
  try {
    name = decodeURIComponent(pdfUrl);
  } catch {
    /* keep raw */
  }
  return NON_AUCTION_DOC.test(name) || NON_AUCTION_DOC.test(title || '');
}

async function probeIsReachable(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    return ct.includes('pdf');
  } catch {
    return false;
  }
}

async function filterReachable(refs) {
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

// Not every item on the announcements list is actually an auction-to-bid-on.
// SharePoint also carries procedural notices (qualified-participants lists,
// cancellation announcements, sale-price recalculations) — those have titles
// like "Lista osób zakwalifikowanych" or "Ogłoszenie o odwołaniu przetargów".
// Without a filter, parseAnnouncement returns a listing object whose body
// regexes all fall through to null, and the user sees a row with empty
// Date / Ask / Ask/m² cells. Reject them by title shape.
const NON_AUCTION_TITLE_RE =
  /^\s*(?:Lista\s+os[óo]b|Og[lł]oszenie\s+o\s+odwo[lł]a|Informacja\s+o\s+wynik|Wykaz\s+nieruchomo|Zmiana\s+ceny)/i;

// Conversely, valid auction-announcement titles always carry some form of
// "[Drugi/Trzeci/…] [P]przetarg ustny … na sprzedaż" or open with "Przetarg
// ustny". Matching this positively as well makes the filter robust against
// the long tail of one-off SharePoint notices nobody anticipated.
const AUCTION_TITLE_RE =
  /(?:^|\s)(?:Drugi|Trzeci|Czwarty|Pi[ąa]ty)?\s*[Pp]rzetarg\w*\s+ustn\w+\s+(?:nie)?ograniczon\w+\s+na\s+sprzeda[żz]/i;

export async function crawlSharePointAnnouncements() {
  let items;
  try {
    items = await fetchListItems(ANNOUNCEMENTS_GUID);
  } catch (err) {
    console.error(`  katowice SP announcements: ${err.message}`);
    return [];
  }
  const listings = [];
  const land = [];
  let droppedNonAuction = 0;
  for (const it of items) {
    const title = (it[F_TITLE] || '').trim();
    const body = it[F_BODY] || '';
    if (!title || !body) continue;
    if (NON_AUCTION_TITLE_RE.test(title) || !AUCTION_TITLE_RE.test(title)) {
      droppedNonAuction++;
      continue;
    }
    const docUrl =
      `${ORIGIN}/Lists/Nieruchomoci%20%20ogoszenia/DispForm.aspx?ID=${it.Id}`;
    try {
      const titleKind = classifyKind(title);
      if (titleKind === 'grunt') {
        const lr = parseLandAnnouncement(body, title, docUrl);
        if (lr) land.push(lr);
      } else {
        // Multi-unit announcements ("… N lokali …") emit one listing per unit.
        for (const listing of parseAnnouncements(body, title, docUrl)) {
          listings.push(listing);
        }
      }
    } catch (err) {
      console.error(`  katowice SP item ${it.Id} parse error: ${err.message}`);
    }
  }
  console.error(
    `  katowice SP: ${listings.length} listing(s), ${land.length} land record(s) from ${items.length} item(s) (dropped ${droppedNonAuction} non-auction)`,
  );
  return { listings, land };
}

export async function crawlSharePointResultDocs() {
  let items;
  try {
    items = await fetchListItems(RESULTS_GUID);
  } catch (err) {
    console.error(`  katowice SP results: ${err.message}`);
    return [];
  }
  const candidates = [];
  let skippedNoise = 0;
  for (const it of items) {
    const title = (it[F_TITLE] || '').trim();
    const body = it[F_BODY] || '';
    if (!title || !body) continue;
    const pdf_url = extractResultPdfUrl(body);
    if (!pdf_url) continue;
    if (isNonAuctionDoc(pdf_url, title)) {
      skippedNoise++;
      continue;
    }
    candidates.push({ pdf_url, auction_date: extractAuctionDate(title) });
  }
  if (skippedNoise) {
    console.error(`  katowice SP: skipped ${skippedNoise} non-auction doc(s) (rent tables / test files / pre-2020 summaries)`);
  }
  console.error(
    `  katowice SP: ${candidates.length} PDF href(s) in body of ${items.length} list item(s)`,
  );
  return filterReachable(candidates);
}
