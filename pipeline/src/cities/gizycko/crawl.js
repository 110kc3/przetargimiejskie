// Giżycko crawler — bip.gizycko.pl, IDcom.pl bip-v1, site 3080.
// Confirmed live 2026-06-29. Result PDFs are Xerox-scanned images (pdftotext empty).
// See spikes/warminsko-mazurskie/powiat-gizycki/gizycko.md.

import { getText } from '../../core/fetch.js';
import { parseAddress } from '../../core/normalize.js';

const ORIGIN = 'https://bip.gizycko.pl';
const BOARD = '11525';
const MAX_PAGES = 4;

export function yearListUrl(year, page = 1) {
  return `${ORIGIN}/wiadomosci/${BOARD}/lista/${page}/${year}`;
}

function currentYear() {
  return new Date().getFullYear();
}

function toAsciiPL(s) {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// ---- list-page parser -------------------------------------------------------

const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a><\/p>/g;

export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&').trim();
    const title = m[2].trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

// ---- title classifiers -------------------------------------------------------

export function isAnnouncementTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  if (!/lokal/.test(t)) return false;
  if (!/przetarg|obwieszczenie/.test(t)) return false;
  if (/wynik|informacja\s+o\s+wyniku|odwo[lł]anie|uniewa[zż]nienie/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/najem|dzier[zż]awa|dzia[lł]k|niezabudowa|grunt/.test(t)) return false;
  return true;
}

export function isResultTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return /wynik|informacja\s+o\s+wyniku/.test(t) && /lokal/.test(t);
}

// ---- detail-page helpers -----------------------------------------------------

export function publishedDateFromDetail(html) {
  if (!html) return null;
  const isoM = /Data wytworzenia dokumentu:\s*<span>(\d{4}-\d{2}-\d{2})<\/span>/i.exec(html);
  if (isoM) return isoM[1];
  const dmyM = /Data wytworzenia dokumentu:\s*<span>(\d{2})-(\d{2})-(\d{4})<\/span>/i.exec(html);
  if (dmyM) return `${dmyM[3]}-${dmyM[2]}-${dmyM[1]}`;
  const PL_MONTHS = {
    stycznia: '01', lutego: '02', marca: '03', kwietnia: '04',
    maja: '05', czerwca: '06', lipca: '07', sierpnia: '08',
    wrzesnia: '09', pazdziernika: '10', listopada: '11', grudnia: '12',
  };
  const m2 = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([\wÀ-ɏ]+)\s+(\d{4})/i.exec(html);
  if (m2) {
    const mon = PL_MONTHS[toAsciiPL(m2[2])];
    if (mon) return `${m2[3]}-${mon}-${String(m2[1]).padStart(2, '0')}`;
  }
  return null;
}

export function attachmentPdfUrlsFromDetail(html) {
  if (!html) return [];
  const out = [];
  const RE = /href="(https?:\/\/bip-v1-files\.idcom-jst\.pl[^"]+\.pdf(?:\?[^"]*)?)"/gi;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

// ---- body-text helpers -------------------------------------------------------

function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bodyTextFromDetail(html) {
  if (!html) return '';
  const m = /<div[^>]+class="tresc"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return m ? stripTags(m[1]) : stripTags(html);
}

const PL_MONTHS_NUM = {
  stycznia: 1, styczen: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3, kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9, pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11, grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function roundFromTitle(title) {
  if (!title) return null;
  const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
  const roman = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(title);
  if (roman) {
    const val = ROMAN[roman[1].toLowerCase()];
    if (val) return val;
  }
  const t = toAsciiPL(title);
  if (/\bpierwsz/.test(t)) return 1;
  if (/\bdrugim?|drugi/.test(t)) return 2;
  if (/\btrzecim?|trzeci/.test(t)) return 3;
  if (/\bczwartym?|czwart/.test(t)) return 4;
  if (/\bpiatym?|piat/.test(t)) return 5;
  return null;
}

export function auctionDateFromBody(text) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const anchorRE = /odbedzie\s+sie\s+w\s+dniu|przetarg[^.]{0,30}w\s+dniu/i;
  const anchorM = anchorRE.exec(t);
  const scope = anchorM ? t.slice(anchorM.index, anchorM.index + 120) : t.slice(0, 500);
  const numM = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(scope);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  const wordM = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(scope);
  if (wordM) {
    const mon = PL_MONTHS_NUM[wordM[2]];
    if (mon) return iso(wordM[3], mon, wordM[1]);
  }
  return null;
}

export function areaFromBody(text) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const labM = /pow(?:ierzchni[a-z]*)?\.\s+uzytkow[a-z]*\s+lokalu\s+([\d,]+)\s*m\s*2/i.exec(t);
  if (labM) return parseArea(labM[1]);
  const altM = /powierzchni[a-z]*\s+uzytkow[a-z]*[\s\S]{0,60}?([\d,]+)\s*m\s*2/i.exec(t);
  if (altM) return parseArea(altM[1]);
  return null;
}

export function startingPriceFromBody(text) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const start = t.search(/cena\s+wywolawcza/i);
  if (start < 0) return null;
  const region = text.slice(start, start + 200);
  const m = /([\d][\d\s.,]*)(?:,\d{2})?\s*z[lł]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function addressFromBody(text, title) {
  const source = text || title || '';

  // Pattern A: body two-part form "lokal nr APT ... nr BLDG przy ul. STREET w Gizycku"
  const patA = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\s+(\d+[A-Za-z]?)[\s\S]{0,200}?nr\s+(\d+[A-Za-z]?)\s+przy\s+ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\n,]+?)\s+w\s+Gi[zż]ycku/i.exec(source);
  if (patA) {
    return parseAddress(`${patA[3].replace(/\s+$/, '')} ${patA[2]}/${patA[1]}`);
  }

  // Pattern B: "przy ul. STREET BLDG/APT"
  const patB = /przy\s+ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃ][\wÀ-ɏ ]+?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/i.exec(source);
  if (patB) {
    return parseAddress(`${patB[1].trim()} ${patB[2]}/${patB[3]}`);
  }

  // Pattern C: title "lokal[u] STREET BLDG/APT"
  const patC = /lokal[au]?\s+([A-ZŁŚĆĘĄÓŹŻŃ][\wÀ-ɏ ]+?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/i.exec(title || '');
  if (patC) {
    return parseAddress(`${patC[1].trim()} ${patC[2]}/${patC[3]}`);
  }

  // Pattern D: "przy ul. STREET NR w Gizycku" (no apt)
  const patD = /przy\s+ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃ][\wÀ-ɏ ]+?)\s+(\d+[A-Za-z]?)\s+w\s+Gi[zż]ycku/i.exec(source);
  if (patD) {
    return parseAddress(`${patD[1].trim()} ${patD[2]}`);
  }

  // Pattern E (title fallback): "CAPITALIZED-WORDS BLDG/APT"
  // Street words must start with UPPERCASE (no /i flag) to avoid matching
  // lowercase tokens like "nr", "na", "do". The digit-slash guard prevents
  // matching announcement numbers like "111/2024".
  const patE = /\b([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zÀ-ɏ]+(?: [A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zÀ-ɏ]+)*)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)(?:[^/]|$)/.exec(title || '');
  if (patE) {
    // Skip if street name looks like an announcement number prefix
    const street = patE[1].trim();
    if (/^[A-Z][a-z]/.test(street) || /\s/.test(street)) {
      return parseAddress(`${street} ${patE[2]}/${patE[3]}`);
    }
  }

  return null;
}

// ---- crawlActive ------------------------------------------------------------

export async function crawlActive() {
  const allEntries = [];
  const seen = new Set();

  const years = [currentYear(), currentYear() - 1];
  for (const year of years) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = yearListUrl(year, page);
      let html = '';
      try {
        html = await getText(url);
      } catch (err) {
        console.error(`  gizycko: list fetch failed (${url}): ${err.message}`);
        break;
      }
      const items = parseListPage(html);
      if (items.length === 0) break;
      let added = 0;
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        allEntries.push(item);
        added++;
      }
      console.error(`  gizycko: ${year} page ${page}: ${items.length} entries (${added} new)`);
      if (items.length < 5) break;
    }
  }

  const announcements = allEntries.filter((e) => isAnnouncementTitle(e.title));
  console.error(`  gizycko: ${allEntries.length} total entries, ${announcements.length} flat announcement(s)`);

  const listings = [];
  for (const entry of announcements) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  gizycko: detail fetch failed (${entry.url}): ${err.message}`);
    }

    const published_date = detailHtml ? publishedDateFromDetail(detailHtml) : null;
    const bodyText = detailHtml ? bodyTextFromDetail(detailHtml) : '';
    const round = roundFromTitle(entry.title);
    const address = addressFromBody(bodyText, entry.title);
    const area_m2 = areaFromBody(bodyText);
    const starting_price_pln = startingPriceFromBody(bodyText);
    const auction_date = auctionDateFromBody(bodyText);

    if (!address) {
      console.error(`  gizycko: could not parse address from: "${entry.title}"`);
    }

    listings.push({
      kind: 'mieszkalny',
      address_raw: entry.title,
      address,
      auction_date,
      published_date,
      round,
      area_m2,
      starting_price_pln,
      detail_url: entry.url,
    });
  }

  console.error(`  gizycko active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---- crawlResultDocs --------------------------------------------------------

export async function crawlResultDocs() {
  const allEntries = [];
  const seen = new Set();

  const years = [currentYear(), currentYear() - 1, currentYear() - 2];
  for (const year of years) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = yearListUrl(year, page);
      let html = '';
      try {
        html = await getText(url);
      } catch (err) {
        console.error(`  gizycko: crawlResultDocs list fetch failed (${url}): ${err.message}`);
        break;
      }
      const items = parseListPage(html);
      if (items.length === 0) break;
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        allEntries.push(item);
      }
      if (items.length < 5) break;
    }
  }

  const flatEntries = allEntries.filter(
    (e) => isAnnouncementTitle(e.title) || isResultTitle(e.title),
  );

  const refs = [];
  for (const entry of flatEntries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  gizycko: result detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }
    const pdfUrls = attachmentPdfUrlsFromDetail(detailHtml);
    if (pdfUrls.length === 0) continue;
    const resultPdfs = pdfUrls.filter((u) => /wynik|informacja|rezultat/i.test(u));
    const pdfsToUse = resultPdfs.length > 0 ? resultPdfs : pdfUrls;
    const published_date = publishedDateFromDetail(detailHtml);
    for (const pdfUrl of pdfsToUse) {
      refs.push({ url: entry.url, pdfUrl, published_date });
    }
  }

  console.error(`  gizycko: ${refs.length} result PDF ref(s) (scanned image PDFs — parseResultDoc returns [])`);
  return refs;
}
