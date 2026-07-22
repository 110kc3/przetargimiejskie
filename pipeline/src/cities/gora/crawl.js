// Góra crawler — server-rendered 2ClickPortal BIP (bip.gora.com.pl). See
// config.js. NO SPA / NO needsRender: a plain GET with a browser User-Agent
// returns the full attachment list for BOTH boards (confirmed live 2026-07-21;
// the spike's "announcements board is JS-rendered" was a bot-UA artefact).
//
// Two boards, each one big page listing files under
// files/file_add/download/<id>_<slug>.<ext>:
//   /233-przetargi.html      ANNOUNCEMENTS → crawlActive()     → { listings }
//   /wyniki-przetargow.html  RESULTS       → crawlResultDocs() → result refs
//
// Both boards mix flats, land (działki), dzierżawa and lokale użytkowe. FLATS
// are selected by the SLUG: classifyKind(slug with dashes→spaces) must be
// 'mieszkalny' (the slug always spells out "lokal(u)-mieszkaln…" even when the
// human anchor text is terser, e.g. the Starogórska result whose visible text
// is just "lokal ul. Starogórska 15/6"). Each selected file is downloaded and
// its text extracted (docText for .doc/.docx, pdfText for born-digital .pdf —
// no OCR needed on this host), then routed by BODY content as a backstop.
//
// One memoised pass serves both streams (refresh.js calls crawlResultDocs()
// then crawlActive()). source:'html' ⇒ each result ref carries `.text`, which
// refresh.js hands straight to parseResultDoc with the attachment URL.
//
// See spike: spikes/dolnoslaskie/powiat-gorowski/gora.md

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.gora.com.pl';
// The default bot UA returns a partial/JS-gated body for the announcements
// board; a browser UA renders both boards fully server-side (confirmed live).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ANN_BOARD = '/233-przetargi.html';
const RES_BOARD = '/wyniki-przetargow.html';

// Wall-clock budget for the whole crawl (both boards). Góra runs ~2–4 flat
// events/yr, so a handful of files at most; this only guards a pathological
// cold run. Env-overridable for local backfills.
const CRAWL_BUDGET_MS = Number(process.env.GORA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

const abs = (p) => (/^https?:/i.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url), { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gora: board fetch failed ${url}: ${err.message}`);
    return '';
  }
}

/**
 * Harvest the file attachments on a board page: [{ url, id, ext, slug }] sorted
 * by id descending (newest first). Matches
 * files/file_add/download/<id>_<slug>.<pdf|doc|docx>; images and other assets
 * are dropped by the extension gate. The full href is kept so the
 * content-addressed doc/pdf caches stay stable.
 * @param {string} html
 */
export function harvestAttachments(html) {
  const byId = new Map();
  const re = /href="([^"]*files\/file_add\/download\/(\d+)_([^"?]*?)\.(pdf|docx|doc)\b[^"]*)"/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const href = m[1].replace(/&amp;/gi, '&');
    const id = Number(m[2]);
    if (!byId.has(id)) {
      byId.set(id, { url: abs(href), id, slug: m[3].toLowerCase(), ext: m[4].toLowerCase() });
    }
  }
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

/** True when a harvested file's SLUG classifies as a flat (lokal mieszkalny). */
export function isFlatSlug(slug) {
  return classifyKind(String(slug || '').replace(/[-_]+/g, ' ')) === 'mieszkalny';
}

async function extractText(att) {
  try {
    return att.ext === 'pdf'
      ? await pdfText(att.url, { userAgent: BROWSER_UA })
      : await docText(att.url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gora: extract failed ${att.url}: ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active flat records
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date:null }
  const deadline = Date.now() + CRAWL_BUDGET_MS;

  // 1) RESULTS (/wyniki-przetargow.html) — achieved-price stream.
  const resAtts = harvestAttachments(await fetchHtml(RES_BOARD)).filter((a) => isFlatSlug(a.slug));
  for (const att of resAtts) {
    if (Date.now() > deadline) { console.error('  gora: crawl budget reached (results)'); break; }
    const text = await extractText(att);
    if (!text || !isResultNotice(text)) continue; // not a result (misfiled) — skip
    resultRefs.push({ text, pdf_url: att.url, detail_url: att.url, auction_date: null });
  }

  // 2) ANNOUNCEMENTS (/233-przetargi.html) — active listings. No isResultNotice
  //    gate here: parseAnnouncement self-gates on the "… odbędzie się … w dniu"
  //    auction-date anchor, which a past result notice ("odbył się") never has,
  //    and every ogłoszenie carries a "Cena osiągnięta w przetargu płatna …"
  //    clause that would otherwise trip a result-notice heuristic.
  const annAtts = harvestAttachments(await fetchHtml(ANN_BOARD)).filter((a) => isFlatSlug(a.slug));
  for (const att of annAtts) {
    if (Date.now() > deadline) { console.error('  gora: crawl budget reached (announcements)'); break; }
    const text = await extractText(att);
    if (!text) continue;
    const rec = parseAnnouncement(text, att.url);
    if (rec) listings.push(rec);
  }

  console.error(`  gora: ${listings.length} flat listing(s), ${resultRefs.length} flat result notice(s)`);
  return { listings, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

// live smoke test: `node src/cities/gora/crawl.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        results: results.length,
        sampleListing: listings[0] || null,
        sampleResult: results[0]
          ? { pdf_url: results[0].pdf_url, text: results[0].text.slice(0, 100) + '…' }
          : null,
      },
      null,
      2,
    ) + '\n',
  );
}
