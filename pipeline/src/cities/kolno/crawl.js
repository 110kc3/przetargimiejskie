// Kolno crawler — bip-umkolno.podlaskie.eu SmartSite BIP boards.
//
// Boards crawled:
//   ANNOUNCEMENTS: /616c955210c658b/ ("Przetargi i zamówienia publiczne")
//   PROPERTY / WYKAZ: /4634573d2ce9367/ ("Obrót nieruchomości i dzierżawy")
//
// Both boards organize publications into year directories (rok-2026, rok-2025, ...).
// We walk directories from 2021 to current year.
//
// Flat announcements -> crawlActive() listings
// Wykaz announcements -> crawlActive() wykaz
// Unbuilt parcel announcements -> crawlActive() land
// Result notices ("INFORMACJA O WYNIKU PRZETARGU", attached as .docx/.doc/.pdf) -> crawlResultDocs() refs

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { todayWarsaw } from '../../core/build-properties.js';
import {
  parseYearLinks,
  parseArticleLinks,
  extractAttachments,
  isResultAttachment,
  parseAnnouncementDetail,
  parseWykazDetail,
  parseLandParcels,
  stripHtml,
} from './parse.js';

const ORIGIN = 'https://bip-umkolno.podlaskie.eu';
const ANNOUNCEMENT_BASE = `${ORIGIN}/616c955210c658b/`;
const PROPERTY_BASE = `${ORIGIN}/4634573d2ce9367/`;

// Memoised crawl for the entire refresh cycle.
let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const wykaz = [];
  const land = [];
  const resultRefs = [];

  const seenArticleUrls = new Set();
  const seenResultUrls = new Set();

  for (const base of [ANNOUNCEMENT_BASE, PROPERTY_BASE]) {
    let mainHtml;
    try {
      mainHtml = await getText(base);
    } catch (err) {
      console.error(`  kolno board fetch failed (${base}): ${err.message}`);
      continue;
    }

    const years = parseYearLinks(mainHtml, base, 2021);
    for (const yr of years) {
      let yHtml;
      try {
        yHtml = await getText(yr.url);
      } catch (err) {
        console.error(`  kolno year fetch failed (${yr.url}): ${err.message}`);
        continue;
      }

      const articles = parseArticleLinks(yHtml, ORIGIN);
      for (const art of articles) {
        if (seenArticleUrls.has(art.url)) continue;
        seenArticleUrls.add(art.url);

        let dHtml;
        try {
          dHtml = await getText(art.url);
        } catch (err) {
          console.error(`  kolno detail fetch failed (${art.url}): ${err.message}`);
          continue;
        }

        const atts = extractAttachments(dHtml, ORIGIN);

        // 1. Collect result notice attachments
        for (const a of atts) {
          if (isResultAttachment(a.name || a.url)) {
            if (seenResultUrls.has(a.url)) continue;
            seenResultUrls.add(a.url);
            let text = '';
            try {
              if (/\.docx?$/i.test(a.url)) {
                text = await docText(a.url);
              } else {
                text = await pdfText(a.url);
                if (text.trim().length < 50) text = await ocrPdf(a.url);
              }
              resultRefs.push({
                text,
                pdf_url: a.url,
                auction_date: null,
                source_url: a.url,
              });
            } catch (err) {
              console.error(`  kolno result extract failed (${a.url}): ${err.message}`);
            }
          }
        }

        // 2. Extract announcement / wykaz body
        let docxText = '';
        const mainDoc = atts.find((a) => !isResultAttachment(a.name || a.url) && /\.(?:docx?|pdf)$/i.test(a.url));
        if (mainDoc && /\.docx?$/i.test(mainDoc.url)) {
          try {
            docxText = await docText(mainDoc.url);
          } catch (err) {
            console.error(`  kolno doc extract failed (${mainDoc.url}): ${err.message}`);
          }
        }
        const bodyText = stripHtml(dHtml);
        const combined = bodyText + '\n' + docxText;

        // Classify publication
        if (/wykaz/i.test(art.title) || (base === PROPERTY_BASE && /wykaz/i.test(combined))) {
          const wItems = parseWykazDetail(combined, art.url, art.title);
          wykaz.push(...wItems);
        } else if (/pod\s+zabudow[ęe]\s+gara[żz]/i.test(combined) || /niezabudowan\w*\s+dzia[łl]k/i.test(art.title)) {
          const lItems = parseLandParcels(combined, art.url, art.title);
          if (lItems.length > 0) {
            land.push(...lItems);
          } else {
            const lDetail = parseAnnouncementDetail(combined, art.url, art.title);
            if (lDetail.kind === 'grunt') land.push(lDetail);
            else listings.push(lDetail);
          }
        } else {
          const detail = parseAnnouncementDetail(combined, art.url, art.title);
          if (detail.address || detail.area_m2) {
            if (detail.kind === 'grunt') land.push(detail);
            else listings.push(detail);
          }
        }
      }
    }
  }

  const today = todayWarsaw();
  const activeFlats = listings.filter((l) => !l.auction_date || l.auction_date >= today);
  const activeLand = land.filter((l) => !l.auction_date || l.auction_date >= today);

  console.error(
    `  kolno crawl complete: ${listings.length} listings (${activeFlats.length} active), ` +
    `${wykaz.length} wykaz, ${land.length} land (${activeLand.length} active), ` +
    `${resultRefs.length} result docs`,
  );

  return {
    listings,
    wykaz,
    land,
    resultRefs,
    valid_empty: activeFlats.length === 0,
    valid_empty_land: activeLand.length === 0,
  };
}

/** Crawl active/announced listings, wykaz, and land */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const res = await crawlPromise;
  return {
    listings: res.listings,
    wykaz: res.wykaz,
    land: res.land,
    valid_empty: res.valid_empty,
    valid_empty_land: res.valid_empty_land,
  };
}

/** Crawl result document references */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const res = await crawlPromise;
  return res.resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  console.log(JSON.stringify({ active, resultsCount: results.length }, null, 2));
}
