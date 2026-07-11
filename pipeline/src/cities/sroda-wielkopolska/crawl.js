// Środa Wielkopolska crawler.
//
// Source: bip.umsroda.pl — IDcom.pl CMS, server-rendered HTML. Both boards
// live under the SAME department (struktura node 2905, Wydział Geodezji i
// Gospodarki Przestrzennej), differing only by dokumenty id:
//
//   ANNOUNCEMENTS ("Ogłoszenia o przetargach"):
//     https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/lista/{page}
//   RESULTS ("Wyniki przetargów"):
//     https://bip.umsroda.pl/struktura/1/2905/dokumenty/14925/lista/{page}
//
// (The spike guessed the results board lived under a DIFFERENT struktura
// node — 2911 or 2912 — both of which 200-OK but return an empty "Brak
// wiadomości" category. Confirmed live by browsing the department page's own
// sibling links: it's 2905/dokumenty/14925, same node as announcements. See
// parse.js's file header for the full note.)
//
// Both boards paginate identically (10 entries/page, unfiltered — reverse-
// chronological across ALL years, no year param needed; page 5 of the
// announcements board already reaches back to 2021). No auth, no CAPTCHA, no
// bot-block, and — unlike gniezno/zabrze — a COMPLETE TLS chain (verified
// live with node's plain `fetch`, no insecureTLS needed).
//
// crawlActive():
//   Paginates the announcements board (bounded — MAX_ANNOUNCE_PAGES). Each
//   list title is classified {mieszkalny|grunt|null} by
//   classifyAnnouncementTitle() BEFORE any detail fetch — leases and
//   procedural notices (qualification lists, cancellations) never get a
//   detail request. Flat detail pages parse to one listing each; land detail
//   pages may parse to SEVERAL records (multi-parcel notices — see
//   parse.js's parseLandAnnouncement). Returns { listings, wykaz: [], land }
//   — wykaz is always empty; the Wykazy board is explicitly out of scope
//   (pre-auction designations, not auctions — see config.js's header + the
//   task brief).
//
// crawlResultDocs():
//   Paginates the results board (bounded — MAX_RESULT_PAGES), filtered down
//   to classifyKind === 'mieszkalny' titles only (land results — the
//   majority of this board — aren't parsed yet; see parse.js §6). Returns
//   refs with `.text` already set (title + body) so refresh.js passes it
//   straight to parseResultDoc without a second fetch.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  parseBoardList,
  classifyAnnouncementTitle,
  isLeaseTitle,
  isProceduralTitle,
  publishedDateFromTitle,
  extractDetailText,
  parseFlatAnnouncement,
  parseLandAnnouncement,
} from './parse.js';

const ORIGIN = 'https://bip.umsroda.pl';
const ANNOUNCEMENTS_BASE = `${ORIGIN}/struktura/1/2905/dokumenty/14926`;
const RESULTS_BASE = `${ORIGIN}/struktura/1/2905/dokumenty/14925`;

// Bounded per ADAPTER-GUIDE §5.1 ("paginate, but bound it"). Volume here is
// low-to-modest (spike: a handful of property auctions/year); 8/6 pages
// (~60-80 entries unfiltered) comfortably covers several years of history
// without risking the CI wall-clock budget.
const MAX_ANNOUNCE_PAGES = 8;
const MAX_RESULT_PAGES = 6;

// ---- crawlActive ------------------------------------------------------------

export async function crawlActive() {
  const listings = [];
  const land = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_ANNOUNCE_PAGES; page++) {
    const url = `${ANNOUNCEMENTS_BASE}/lista/${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  sroda-wielkopolska: board page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseBoardList(html);
    if (items.length === 0) break;

    let kept = 0;
    for (const it of items) {
      if (seen.has(it.detail_url)) continue;
      seen.add(it.detail_url);
      const kind = classifyAnnouncementTitle(it.title);
      if (!kind) continue;

      let detailHtml;
      try {
        detailHtml = await getText(it.detail_url);
      } catch (err) {
        console.error(`  sroda-wielkopolska: detail fetch failed (${it.title.slice(0, 70)}): ${err.message}`);
        continue;
      }
      const bodyText = extractDetailText(detailHtml);
      if (!bodyText) {
        console.error(`  sroda-wielkopolska: empty body (${it.title.slice(0, 70)})`);
        continue;
      }
      const published_date = publishedDateFromTitle(it.title);

      if (kind === 'mieszkalny') {
        const parsed = parseFlatAnnouncement(bodyText);
        if (!parsed) {
          console.error(`  sroda-wielkopolska: flat parse failed (${it.title.slice(0, 70)})`);
          continue;
        }
        listings.push({ ...parsed, published_date, detail_url: it.detail_url });
        kept++;
      } else {
        const records = parseLandAnnouncement(bodyText);
        if (!records.length) {
          console.error(`  sroda-wielkopolska: land parse failed (${it.title.slice(0, 70)})`);
          continue;
        }
        for (const rec of records) {
          land.push({ ...rec, published_date, detail_url: it.detail_url, source_url: url });
        }
        kept++;
      }
    }
    console.error(`  sroda-wielkopolska board page ${page}: ${items.length} entries (${kept} sale-classified)`);
    // IDcom.pl paginates 10/page; fewer than 5 means last page.
    if (items.length < 5) break;
  }

  console.error(`  sroda-wielkopolska active: ${listings.length} flat listing(s), ${land.length} land record(s)`);
  return { listings, wykaz: [], land };
}

// ---- crawlResultDocs --------------------------------------------------------

export async function crawlResultDocs() {
  const refs = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_RESULT_PAGES; page++) {
    const url = `${RESULTS_BASE}/lista/${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  sroda-wielkopolska: wyniki page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseBoardList(html);
    if (items.length === 0) break;

    let flatCount = 0;
    for (const it of items) {
      if (seen.has(it.detail_url)) continue;
      seen.add(it.detail_url);
      if (isLeaseTitle(it.title) || isProceduralTitle(it.title)) continue;
      // Land results are the majority of this board but aren't parsed yet
      // (see parse.js §6) — only fetch detail pages for flat results.
      if (classifyKind(it.title) !== 'mieszkalny') continue;
      flatCount++;

      let detailHtml;
      try {
        detailHtml = await getText(it.detail_url);
      } catch (err) {
        console.error(`  sroda-wielkopolska: wyniki detail fetch failed (${it.title.slice(0, 70)}): ${err.message}`);
        continue;
      }
      const bodyText = extractDetailText(detailHtml);
      if (!bodyText) continue;
      // Prepend the list TITLE: a multi-round result's ordinal ("wyniku
      // DRUGIEGO przetargu…") sometimes appears ONLY in the title, not
      // repeated in the body prose — parseResultDoc's round regex reads
      // whatever text it's given, so this lets it see both sources.
      refs.push({ url: it.detail_url, text: `${it.title}. ${bodyText}`, date: null });
    }
    console.error(`  sroda-wielkopolska wyniki page ${page}: ${items.length} entries (${flatCount} flat result(s))`);
    if (items.length < 5) break;
  }

  console.error(`  sroda-wielkopolska: ${refs.length} flat result ref(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active flat listing(s), ${land.length} land record(s)`);
}
