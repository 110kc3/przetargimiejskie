// Ostrzeszów crawler — fetches both the city BIP (ostrzeszow.nowoczesnagmina.pl)
// and housing manager ZGM BIP (bip.zgm-ostrzeszow.pl).
//
// Extracts:
// - crawlActive(): { listings, wykaz, land, valid_empty, valid_empty_land }
// - crawlResultDocs(): Array<{ text, auction_date, pdf_url }>

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  stripTags,
  isSkippableEntryText,
  isGenuineSaleWykazText,
  isResultLabel,
  parseInlineTable,
  parseAnnouncementDoc,
  wykazRecordFromEntry,
} from './parse.js';

const CITY_ORIGIN = 'https://ostrzeszow.nowoczesnagmina.pl';
const CITY_BOARD_URL = `${CITY_ORIGIN}/?c=1274`;

const ZGM_ORIGIN = 'https://bip.zgm-ostrzeszow.pl';
const ZGM_ACTIVE_URL = `${ZGM_ORIGIN}/index.php?c=page&id=31`;
const ZGM_CONCLUDED_URL = (page) => `${ZGM_ORIGIN}/index.php?c=page&id=32&s=${page}`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

/** Unified document text loader: born-digital PDF -> doc/docx -> scanned PDF OCR (with psm: 1 for rotated scans). */
async function getDocText(url) {
  if (/\.docx?\b/i.test(url)) {
    try {
      return await docText(url, FETCH_OPTS);
    } catch {
      // fallback
    }
  }

  try {
    const text = await pdfText(url, FETCH_OPTS);
    if (text && text.trim().length >= 40) return text;
  } catch {
    // not valid pdf or failed
  }

  try {
    const dText = await docText(url, FETCH_OPTS);
    if (dText && dText.trim().length >= 40) return dText;
  } catch {
    // not a doc
  }

  return await ocrPdf(url, { ...FETCH_OPTS, psm: 1 });
}

function resolveCityUrl(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${CITY_ORIGIN}${href}`;
  return `${CITY_ORIGIN}/${href.replace(/^\?/, '?')}`;
}

function resolveZgmUrl(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${ZGM_ORIGIN}${href}`;
  return `${ZGM_ORIGIN}/${href}`;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];
  const seenPdf = new Set();
  const knownUrls = await loadKnownSourceUrls('ostrzeszow');

  // -------------------------------------------------------------------------
  // 1. City BIP (ostrzeszow.nowoczesnagmina.pl)
  // -------------------------------------------------------------------------
  try {
    const cityBoardHtml = await getText(CITY_BOARD_URL, FETCH_OPTS);
    const userContentIdx = cityBoardHtml.indexOf('id="user_content"');
    const userContent = userContentIdx !== -1 ? cityBoardHtml.substring(userContentIdx) : cityBoardHtml;

    const articleLinks = [...userContent.matchAll(/<a\s+[^>]*href="(\?a=(\d+))"[^>]*>([\s\S]*?)<\/a>/gi)];
    const seenArticles = new Set();

    for (const match of articleLinks) {
      const href = match[1];
      const artId = match[2];
      const title = stripTags(match[3]);

      if (seenArticles.has(artId)) continue;
      seenArticles.add(artId);

      if (isSkippableEntryText(title)) continue;

      const artUrl = resolveCityUrl(href);

      if (isGenuineSaleWykazText(title)) {
        const wRec = wykazRecordFromEntry(title, artUrl);
        if (wRec) wykaz.push(wRec);
        continue;
      }

      let artHtml = '';
      try {
        artHtml = await getText(artUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  ostrzeszow: failed to fetch city article (${artUrl}): ${err.message}`);
        continue;
      }

      const attSection = artHtml.substring(artHtml.indexOf('id="attachments"'), artHtml.indexOf('<!-- SPECIFICATION -->'));
      const attRows = [...attSection.matchAll(/<tr>\s*<td class="attachmentTableColumn1">([\s\S]*?)<\/td>\s*<td class="attachmentTableColumn2"><a href="([^"]+)"/gi)];

      const isConcluded =
        isResultLabel(title) ||
        attRows.some((r) => isResultLabel(stripTags(r[1])));

      // Harvest result attachments
      for (const r of attRows) {
        const attLabel = stripTags(r[1]);
        const attHref = r[2].replace(/&amp;/g, '&');
        const attUrl = resolveCityUrl(attHref);

        if (isResultLabel(attLabel)) {
          if (!seenPdf.has(attUrl)) {
            seenPdf.add(attUrl);
            if (knownUrls.has(attUrl)) {
              continue;
            }
            try {
              const text = await getDocText(attUrl);
              resultRefs.push({ text, auction_date: null, pdf_url: attUrl });
            } catch (err) {
              console.error(`  ostrzeszow: failed to load city result doc (${attUrl}): ${err.message}`);
            }
          }
        }
      }

      // If active (not concluded), harvest listings or land
      if (!isConcluded) {
        const isLand = /niezabudowan|grunt/i.test(title);
        // Check inline HTML table
        const inlineRecords = parseInlineTable(artHtml, artUrl, title);
        if (inlineRecords.length > 0) {
          land.push(...inlineRecords);
        } else {
          // Announcement document
          const annRow = attRows.find(
            (r) => !isResultLabel(stripTags(r[1])) && !/regulamin/i.test(stripTags(r[1]))
          );
          if (annRow) {
            const attHref = annRow[2].replace(/&amp;/g, '&');
            const attUrl = resolveCityUrl(attHref);
            if (!seenPdf.has(attUrl)) {
              seenPdf.add(attUrl);
              try {
                const text = await getDocText(attUrl);
                const record = parseAnnouncementDoc(text, artUrl, isLand);
                if (record) {
                  if (record.kind === 'grunt') land.push(record);
                  else listings.push(record);
                }
              } catch (err) {
                console.error(`  ostrzeszow: failed to load city announcement doc (${attUrl}): ${err.message}`);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`  ostrzeszow: city board crawl error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 2. Housing manager ZGM BIP (bip.zgm-ostrzeszow.pl)
  // -------------------------------------------------------------------------

  // (a) Active board id=31
  try {
    const activeHtml = await getText(ZGM_ACTIVE_URL, FETCH_OPTS);
    const articles = [...activeHtml.matchAll(/<div class="article">[\s\S]*?<h3><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>[\s\S]*?<div class="artDate">([\s\S]*?)<\/div>/gi)];

    for (const a of articles) {
      const artHref = a[1].replace(/&amp;/g, '&');
      const title = stripTags(a[2]);
      if (isSkippableEntryText(title)) continue;

      const artUrl = resolveZgmUrl(artHref);
      let artHtml = '';
      try {
        artHtml = await getText(artUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  ostrzeszow: failed to fetch ZGM active article (${artUrl}): ${err.message}`);
        continue;
      }

      const files = [...artHtml.matchAll(/href="([^"]*getfile[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const [_, rawHref, label] of files) {
        const fileHref = rawHref.replace(/&amp;/g, '&');
        const fileUrl = resolveZgmUrl(fileHref);
        const fileLabel = stripTags(label);

        if (isSkippableEntryText(fileLabel)) continue;

        if (isGenuineSaleWykazText(fileLabel) || isGenuineSaleWykazText(title)) {
          const wRec = wykazRecordFromEntry(title, artUrl);
          if (wRec) wykaz.push(wRec);
          // if it also has an auction notice in it, parse it
        }

        if (!seenPdf.has(fileUrl) && !/regulamin/i.test(fileLabel)) {
          seenPdf.add(fileUrl);
          try {
            const text = await getDocText(fileUrl);
            const isLand = /gruntow|niezabudowan/i.test(title);
            const rec = parseAnnouncementDoc(text, artUrl, isLand);
            if (rec) {
              if (rec.kind === 'grunt') land.push(rec);
              else listings.push(rec);
            }
          } catch (err) {
            console.error(`  ostrzeszow: failed to parse ZGM active doc (${fileUrl}): ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`  ostrzeszow: ZGM active board crawl error: ${err.message}`);
  }

  // (b) Concluded board id=32 (harvest results and archived wykazy)
  try {
    for (let s = 1; s <= 18; s++) {
      const pageUrl = ZGM_CONCLUDED_URL(s);
      let pageHtml = '';
      try {
        pageHtml = await getText(pageUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  ostrzeszow: failed to fetch ZGM concluded page ${s}: ${err.message}`);
        break;
      }

      const articles = [...pageHtml.matchAll(/<div class="article">[\s\S]*?<h3><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>[\s\S]*?<div class="artDate">([\s\S]*?)<\/div>/gi)];
      if (articles.length === 0) break;

      for (const a of articles) {
        const artHref = a[1].replace(/&amp;/g, '&');
        const title = stripTags(a[2]);
        if (isSkippableEntryText(title)) continue;

        const artUrl = resolveZgmUrl(artHref);

        if (isGenuineSaleWykazText(title)) {
          const wRec = wykazRecordFromEntry(title, artUrl);
          if (wRec) wykaz.push(wRec);
          continue;
        }

        let artHtml = '';
        try {
          artHtml = await getText(artUrl, FETCH_OPTS);
        } catch {
          continue;
        }

        const files = [...artHtml.matchAll(/href="([^"]*getfile[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const [_, rawHref, label] of files) {
          const fileHref = rawHref.replace(/&amp;/g, '&');
          const fileUrl = resolveZgmUrl(fileHref);
          const fileLabel = stripTags(label);

          if (/regulamin/i.test(fileLabel)) continue;

          // Check if it's a result or protocol or odwołanie doc
          if (isResultLabel(fileLabel) || isResultLabel(title) || /odwo[łl]anie|protok[oó][łl]/i.test(fileLabel)) {
            if (!seenPdf.has(fileUrl)) {
              seenPdf.add(fileUrl);
              if (knownUrls.has(fileUrl)) continue;
              try {
                const text = await getDocText(fileUrl);
                resultRefs.push({ text, auction_date: null, pdf_url: fileUrl });
              } catch (err) {
                console.error(`  ostrzeszow: failed to load ZGM result doc (${fileUrl}): ${err.message}`);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`  ostrzeszow: ZGM concluded crawl error: ${err.message}`);
  }

  return {
    listings,
    wykaz,
    land,
    resultRefs,
    valid_empty: listings.length === 0,
    valid_empty_land: false,
  };
}

export async function crawlActive() {
  if (!crawlPromise) crawlPromise = crawlAll();
  const res = await crawlPromise;
  return {
    listings: res.listings,
    wykaz: res.wykaz,
    land: res.land,
    valid_empty: res.valid_empty,
    valid_empty_land: res.valid_empty_land,
  };
}

export async function crawlResultDocs() {
  if (!crawlPromise) crawlPromise = crawlAll();
  const res = await crawlPromise;
  return res.resultRefs;
}
