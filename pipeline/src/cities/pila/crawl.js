
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncementPdf, parseResultDoc, isSkippableTitle, isFlatAnnouncementTitle } from './parse.js';

const ORIGIN = 'https://bip.pila.pl';
const LIST_URL = `${ORIGIN}/542-aktualne-przetargi-na-nieruchomosci.html`;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';


function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


const ENTRY_LINK_RE = /href="([^"]+\.html\??)"[^>]*>\s*Kliknij[^<]*<\/a>/gi;
const NAMED_LINK_RE = /href="([^"]*\.html\??)"[^>]*>([\s\S]*?)<\/a>/gi;

export function parseListPage(html) {
  if (!html) return [];
  const out = [];
  const RE_ATTR =
    /href="([^"]+\.html\??)"[^>]*title="Kliknij\s+aby\s+przej[sSśŚ][cCćĆ]\s+do\s+([^"]*?)\.?\s*"[^>]*>([\s\S]*?)<\/a>/gi;
  const RE_TEXT =
    /href="([^"]+\.html\??)"[^>]*>\s*Kliknij\s+aby\s+przej[sSśŚ][cCćĆ]\s+do\s+([\s\S]*?)\.\s*<\/a>/gi;
  const RE = RE_ATTR.test(html) ? RE_ATTR : RE_TEXT;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const rawHref = m[1].replace(/\?$/, '');
    if (/^(https?:|#|rejestr|mapa|instrukcja|statysty|informacja|rss)/i.test(rawHref)) continue;
    const title = stripTags(m[2]).trim();
    if (!title) continue;
    const afterPos = m.index + m[0].length;
    const rest = html.slice(afterPos, afterPos + 900);
    const dm = /(\d{4}-\d{2}-\d{2})/.exec(rest);
    out.push({
      href: rawHref,
      title,
      added_date: dm ? dm[1] : null,
    });
  }
  return out;
}


const ATTACH_RE =
  /href="(files\/file_add\/download\/[^"]+\.pdf)"[^>]*>[\s\S]*?(?:<[^>]+>)*([^<]*)/gi;

export function parseArticleAttachments(html) {
  if (!html) return [];
  const out = [];
  ATTACH_RE.lastIndex = 0;
  let m;
  const fullRE = /href="(files\/file_add\/download\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = fullRE.exec(html)) !== null) {
    const path = m[1];
    const url = `${ORIGIN}/${path}`;
    const rawLabel = stripTags(m[2]);
    const accessibleRE = /Kliknij\s+aby\s+pobra[cCćĆ]\s+plik:\s+([^.\s][^.]*\.pdf)/i;
    const forwardWindow = html.slice(m.index, m.index + m[0].length + 100);
    const accessM = accessibleRE.exec(forwardWindow);
    const label = accessM ? accessM[1] : rawLabel;
    const lLower = (path + ' ' + label).toLowerCase();
    let role = 'other';
    if (/ogloszenie|ogłoszenie|tresc|tre[sś][cć]/.test(lLower)) role = 'announcement';
    else if (/wyniki|wynik(?!iem)/.test(lLower)) role = 'result';
    out.push({ url, label, role });
  }
  return out;
}


async function crawlAll() {
  let listHtml;
  try {
    listHtml = await getText(LIST_URL, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  pila: list page fetch failed: ${err.message}`);
    return { listings: [], resultRefs: [] };
  }

  const stubs = parseListPage(listHtml);
  const flat = stubs.filter(s => !isSkippableTitle(s.title) && isFlatAnnouncementTitle(s.title));

  console.error(
    `  pila: list page: ${stubs.length} total entries, ${flat.length} flat announcement(s)`,
  );

  const listings = [];
  const resultRefs = [];

  for (const stub of flat) {
    const articleUrl = `${ORIGIN}/${stub.href}`;
    let articleHtml;
    try {
      articleHtml = await getText(articleUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  pila: article fetch failed (${stub.href}): ${err.message}`);
      continue;
    }

    const attachments = parseArticleAttachments(articleHtml);
    const annPdf = attachments.find(a => a.role === 'announcement');
    const resultPdf = attachments.find(a => a.role === 'result');

    if (annPdf) {
      let pdfTxt;
      try {
        pdfTxt = await pdfText(annPdf.url, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  pila: announcement PDF failed (${annPdf.url}): ${err.message}`);
      }
      if (pdfTxt) {
        const rows = parseAnnouncementPdf(pdfTxt);
        if (rows.length === 0) {
          console.error(`  pila WARN: no records parsed from ${stub.href}`);
        }
        for (const rec of rows) {
          listings.push({ ...rec, detail_url: articleUrl, source_url: annPdf.url });
        }
      }
    } else {
      console.error(`  pila: no announcement PDF on article ${stub.href}`);
    }

    if (resultPdf) {
      resultRefs.push({
        pdfUrl: resultPdf.url,
        detail_url: articleUrl,
        published_date: stub.added_date,
      });
    }
  }

  console.error(
    `  pila: ${listings.length} active listing(s), ${resultRefs.length} result PDF ref(s)`,
  );
  // not qualify and still trigger the global preserve-on-empty safety net.
  const validEmpty = stubs.length > 0 && flat.length === 0;
  return { listings, resultRefs, validEmpty };
}

let crawlPromise = null;

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, validEmpty } = await crawlPromise;
  return { listings, wykaz: [], land: [], valid_empty: validEmpty };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, results: results.length, sampleListing: listings[0] }, null, 2) + '\n',
  );
}
