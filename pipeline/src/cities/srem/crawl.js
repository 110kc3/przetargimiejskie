
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isAnnouncementTitle,
  isResultTitle,
} from './parse.js';

export const BASE_URL = 'http://bip.srem.pl';
export const BOARD_URL = `${BASE_URL}/public/?id=1162`;

export function resolveUrl(href) {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&'), BASE_URL).toString();
  } catch {
    return null;
  }
}

export function extractSubcategories(html) {
  const items = [];
  const regex = /<a href="([^"]*\/public\/\?id=\d+)"[^>]*class="nazwa_pliku[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    const label = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (url && label) {
      items.push({ url, label });
    }
  }
  return items;
}

export function extractFileAttachments(html) {
  const files = [];
  const regex = /<a href="([^"]*\/public\/getFile\?id=\d+)"[^>]*class="nazwa_pliku[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    const label = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (url && label) {
      files.push({ url, label });
    }
  }
  return files;
}

export async function extractAttachmentText(fileUrl) {
  if (!fileUrl) return '';
  try {
    const text = await docText(fileUrl);
    if (text && text.trim().length > 30) return text;
  } catch {
    // ignore
  }
  try {
    const text = await pdfText(fileUrl);
    if (text && text.trim().length > 30) return text;
  } catch {
    // ignore
  }
  try {
    const text = await ocrPdf(fileUrl);
    if (text && text.trim().length > 30) return text;
  } catch {
    // ignore
  }
  return '';
}

export async function crawlActive() {
  const started = Date.now();
  const known = await loadKnownSourceUrls('srem');
  const listings = [];
  const land = [];
  const wykaz = [];

  let rootHtml;
  try {
    rootHtml = await getText(BOARD_URL);
  } catch (err) {
    console.error(`srem: failed to fetch board root: ${err.message}`);
    return { listings, wykaz, land, valid_empty: false, valid_empty_land: false };
  }

  const yearCategories = extractSubcategories(rootHtml).filter((c) =>
    /202[4-6]/i.test(c.label),
  );

  for (const yearCat of yearCategories) {
    let yearHtml;
    try {
      yearHtml = await getText(yearCat.url);
    } catch {
      continue;
    }

    const subcats = extractSubcategories(yearHtml);
    for (const sub of subcats) {
      if (/wykaz/i.test(sub.label)) {
        try {
          const wykazHtml = await getText(sub.url);
          const files = extractFileAttachments(wykazHtml);
          for (const f of files) {
            wykaz.push({
              source_url: f.url,
              title: f.label,
            });
          }
        } catch {
          // ignore
        }
      } else if (/sprzeda[żz]/i.test(sub.label) && !/wynik/i.test(sub.label)) {
        try {
          const saleHtml = await getText(sub.url);
          const noticeLinks = extractSubcategories(saleHtml);

          for (const notice of noticeLinks) {
            let noticeHtml;
            try {
              noticeHtml = await getText(notice.url);
            } catch {
              continue;
            }

            const files = extractFileAttachments(noticeHtml);
            const annFile = files.find((f) => !isResultTitle(f.label)) || files[0];
            let docTextContent = '';
            if (annFile) {
              docTextContent = await extractAttachmentText(annFile.url);
            }

            const parsed = parseAnnouncement(
              docTextContent,
              notice.label,
              notice.url,
            );

            if (parsed.kind === 'grunt') {
              land.push(parsed);
            } else {
              listings.push(parsed);
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return {
    listings,
    wykaz,
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlResultDocs() {
  const results = [];
  let rootHtml;
  try {
    rootHtml = await getText(BOARD_URL);
  } catch {
    return results;
  }

  const yearCategories = extractSubcategories(rootHtml).filter((c) =>
    /202[4-6]/i.test(c.label),
  );

  for (const yearCat of yearCategories) {
    let yearHtml;
    try {
      yearHtml = await getText(yearCat.url);
    } catch {
      continue;
    }

    const subcats = extractSubcategories(yearHtml);
    const resultSub = subcats.find((s) => /wynik/i.test(s.label));
    if (!resultSub) continue;

    try {
      const resHtml = await getText(resultSub.url);
      const files = extractFileAttachments(resHtml);
      for (const f of files) {
        const text = await extractAttachmentText(f.url);
        results.push({
          source_url: f.url,
          title: f.label,
          text,
        });
      }
    } catch {
      // ignore
    }
  }

  return results;
}
