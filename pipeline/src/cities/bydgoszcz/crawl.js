// Bydgoszcz crawler — server-rendered Logonet BIP (v2.9.x), board 1208.
// Live markup groundtruthed 2026-07-06.
//
// Single board holds announcements AND result notices for all property types:
//   Index:   https://bip.um.bydgoszcz.pl/artykuly/1208/{page}/{per}/ogloszenia-o-przetargach-na-zbycie-nieruchomosci
//            Article links are ABSOLUTE ("https://bip.um.bydgoszcz.pl/artykul/1208/{id}/{slug}")
//            inside <article><header><h2><a …>TITLE</a>. At 25/page the whole
//            board (~14 items) fits on page 1; page 2 MIRRORS page 1, so
//            pagination stops when a page yields no NEW article ids.
//   Article: /artykul/1208/{id}/{slug} — HTML stub; the content is in the
//            "Załączniki" attachments:
//              announcement: PDF (scanned) + .doc (born-digital OLE) + rzut PDF
//              result:       PDF + .docx (born-digital OOXML, 15-20 kB)
//            Attachment rows look like:
//              <a … href="https://bip.um.bydgoszcz.pl/attachments/download/32143">
//                 NAME</a></span> <span class="files textWord">doc, 54 kB</span>
//            The extension text can be EMPTY ("…textWord">, 19 kB" seen live on
//            download/32640) — select by the textWord CLASS, never by the
//            extension label. doc-text.js detects .doc vs .docx by magic bytes.
//
// Routing: title/slug classify (flat announcement / result / skip), body header
// (isResultNotice) as the authoritative fallback. Land+building results are kept
// in crawlResultDocs (parseResultDoc returns [] for grunt); land announcements
// are skipped from the flat stream.
//
// source:'html' ⇒ crawlResultDocs() refs already carry `.text`.

import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.um.bydgoszcz.pl';
const BOARD = 1208;
const PER_PAGE = 25;
const MAX_PAGES = 4; // board shows ~14 items; the cap only guards a runaway loop

const abs = (p) => (/^https?:/.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url));
  } catch (err) {
    console.error(`  bydgoszcz: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

/**
 * Article stubs from one index page. Live hrefs are absolute.
 * @returns {Array<{id:string, slug:string, title:string}>}
 */
export function parseIndexPage(html) {
  const out = [];
  const seen = new Set();
  const linkRe = new RegExp(
    `href="(?:https?://[^"/]+)?/artykul/${BOARD}/(\\d+)/([a-z0-9-]+)"[^>]*>([\\s\\S]*?)</a>`,
    'gi',
  );
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({ id, slug: m[2], title });
  }
  return out;
}

/**
 * Classify an article stub by title/slug → 'flat-ann' | 'result' | 'skip'.
 * Live titles (2026-07-06):
 *   "Lokal przeznaczony do sprzedaży w drodze przetargu ustnego nieograniczonego
 *    w dniu 09.07.2026 r., ul.H.Sienkiewicza 37m2"                → flat-ann
 *   "Informacja o wyniku przetargu przeprowadzonego w dniu 26.06.2026r,
 *    ul. Chodkiewicza 2, lokal nr 1"                              → result
 *   "Sprzedaż nieruchomości niezabudowanych, w drodze III przetargu …" → skip
 */
export function classifyArticle(title, slug) {
  const t = (title || '').toLowerCase();
  const s = (slug || '').toLowerCase();
  if (/odwo[łl]ani/.test(t) || /odwolani/.test(s)) return 'skip'; // cancellations
  if (/informacja\s+o\s+wyniku/.test(t) || /informacja-o-wyniku/.test(s)) return 'result';
  if (/lokal\w*\s+przeznaczon\w+\s+do\s+sprzeda[żz]y/.test(t) || /^lokal-przeznaczony-do-sprzedazy/.test(s)) return 'flat-ann';
  return 'skip'; // land / buildings / wykaz — out of the flat stream
}

/**
 * Word-processor attachments (the born-digital .doc/.docx) on an article page.
 * Selected by the `class="files textWord"` span that FOLLOWS the link — the
 * extension label text is unreliable (seen empty live). PDFs are class textPDF
 * (announcement PDFs are scanned; pdftotext yields nothing) and are skipped.
 * @returns {Array<{url:string, name:string}>}
 */
export function docAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"/]+)?\/attachments\/download\/\d+)"[^>]*>\s*([^<]*?)\s*<\/a><\/span>\s*<span class="files\s+textWord">/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = abs(m[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, name: m[2].replace(/\s+/g, ' ').trim() });
  }
  return out;
}

/**
 * Publication date from the article metryczka:
 *   <th>Data opublikowania:</th> … <time datetime="2026-07-03T00:00:01">
 * Used only as an auction_date fallback for result refs.
 */
export function pubDateFromHtml(html) {
  const m = /Data\s+(?:opublikowania|wytworzenia):[\s\S]{0,200}?datetime="(\d{4}-\d{2}-\d{2})/i.exec(html || '');
  return m ? m[1] : null;
}

// One memoised crawl per refresh run (refresh.js calls both streams).
let crawlPromise = null;

async function crawlAll() {
  const listings = [];   // active flat announcements (address-keyed)
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date } — all asset types

  const articlesSeen = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${ORIGIN}/artykuly/${BOARD}/${page}/${PER_PAGE}/ogloszenia-o-przetargach-na-zbycie-nieruchomosci`;
    const html = await fetchHtml(url);
    if (!html) break;

    const stubs = parseIndexPage(html);
    const fresh = stubs.filter((s) => !articlesSeen.has(s.id));
    if (fresh.length === 0) break; // past the last page (Logonet mirrors it)

    for (const stub of fresh) {
      articlesSeen.add(stub.id);

      const role = classifyArticle(stub.title, stub.slug);
      if (role === 'skip') continue;

      const detail_url = abs(`/artykul/${BOARD}/${stub.id}/${stub.slug}`);
      const articleHtml = await fetchHtml(detail_url);
      if (!articleHtml) continue;

      const atts = docAttachments(articleHtml);
      if (atts.length === 0) {
        console.error(`  bydgoszcz: no doc/docx attachment on ${detail_url}`);
        continue;
      }

      let text = null;
      let docUrl = null;
      for (const att of atts) {
        try {
          const candidate = await docText(att.url);
          if (candidate && candidate.trim().length > 50) {
            text = candidate;
            docUrl = att.url;
            break;
          }
        } catch (err) {
          console.error(`  bydgoszcz: doc-text failed ${att.url}: ${err.message}`);
        }
      }
      if (!text) {
        console.error(`  bydgoszcz: empty text from attachment(s) on ${detail_url}`);
        continue;
      }

      if (role === 'result' || isResultNotice(text)) {
        resultRefs.push({ text, pdf_url: docUrl, detail_url, auction_date: pubDateFromHtml(articleHtml) });
        continue;
      }

      // Flat announcement
      const rec = parseAnnouncement(text);
      if (!rec || rec.kind === 'grunt' || !rec.address) {
        console.error(`  bydgoszcz: announcement not parsed (article ${stub.id})`);
        continue;
      }
      listings.push({ ...rec, detail_url, source_url: docUrl });
    }

    if (stubs.length < PER_PAGE) break; // short page ⇒ last page
  }

  console.error(`  bydgoszcz: ${listings.length} flat listing(s), ${resultRefs.length} result notice(s)`);
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
  // wykaz board 1071 exists (pre-auction designations, no date/price) — not
  // wired; land announcements are skipped (parcel stream not built for this city).
  return { listings, wykaz: [], land: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
