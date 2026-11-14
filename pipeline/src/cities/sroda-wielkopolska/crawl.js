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

const MAX_ANNOUNCE_PAGES = 8;
const MAX_RESULT_PAGES = 6;


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
    if (items.length < 5) break;
  }

  console.error(`  sroda-wielkopolska active: ${listings.length} flat listing(s), ${land.length} land record(s)`);
  return { listings, wykaz: [], land };
}


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
