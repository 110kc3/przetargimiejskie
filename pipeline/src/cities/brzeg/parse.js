
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { pdfText } from '../../core/pdf-text.js';


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s  ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I)\b/i;
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

export function roundFromTitle(title) {
  const m = ROMAN_RE.exec((title || '').toUpperCase());
  if (m) return ROMAN_MAP[m[1]] ?? null;
  const nm = /\b([1-9])\s+przetarg/i.exec(title || '');
  if (nm) return Number(nm[1]);
  return 1;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, października: 10, listopada: 11, grudnia: 12,
  wrzesnia: 9, pazdziernika: 10,
  styczeń: 1, luty: 2, marzec: 3, kwiecień: 4, maj: 5, czerwiec: 6,
  lipiec: 7, sierpień: 8, wrzesień: 9, październik: 10, listopad: 11, grudzień: 12,
  styczen: 1, kwiecien: 4, sierpien: 8, wrzesien: 9, pazdziernik: 10, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}



function bipUrlFromBlock(text) {
  const m = /https?:\/\/bip\.brzeg\.pl\/\S+/i.exec(text);
  return m ? m[0].trim() : null;
}

function addrFromHeading(heading) {
  const m = /nr\s+(\d+[A-Za-z]?)\s+przy\s+ul(?:icy)?\.?\s+(.+)/i.exec(heading);
  if (!m) return null;
  const apt = m[1];
  const rest = m[2].trim();
  const parts = rest.split(/\s+/);
  if (parts.length < 2) return null;
  const bldg = parts[parts.length - 1];
  const street = parts.slice(0, -1).join(' ');
  return parseAddress(`${street} ${bldg}/${apt}`);
}

export function parseListingPage(html) {
  if (!html) return [];
  const out = [];

  const chunks = html.split(/(?=<h[1-6][^>]*>\s*Lokal\s+mieszkaln)/i).filter(Boolean);

  for (const chunk of chunks) {
    const isLokal = /^<h[1-6]/i.test(chunk.trimStart()) || /Lokal\s+mieszkaln\w*\s+nr\s+\d/i.test(chunk);
    if (!isLokal) continue;

    const text = stripTags(chunk);
    if (!/lokal\s+mieszkaln\w*\s+nr\s+\d/i.test(text)) continue;

    const headingM = /^(Lokal\s+mieszkaln\w*\s+nr\s+\d+[A-Za-z]?\s+przy\s+\S+\.?\s+[\w\s]+?\d+[A-Za-z]?)(?=\s+Lokal\s+mieszkaln|\s+Cena\s*:|\s+Tryb|\s+Wadium|\s+Termin|\s+Kontakt|\s+Poka|$)/i.exec(text);
    const heading = headingM ? headingM[1].trim() : '';
    if (!heading) continue;

    const address = addrFromHeading(heading);
    if (!address) continue;

    const cenaM = /Cena\s*:\s*([\d  .,]+?)\s*z[łlł]/i.exec(text);
    const starting_price_pln = cenaM ? parsePLN(cenaM[1]) : null;

    const trybM = /Tryb\s+sprzeda[zż]y\s*:\s*([IVX\d]+\s+przetarg[^C]*?)(?=\s+(?:Wadium|Termin|Kontakt|Poka|$))/i.exec(text);
    const round = trybM ? (roundFromTitle(trybM[1].trim()) ?? 1) : 1;

    const terminM = /Termin\s+przetargu\s*:\s*([\d.\s\w,]+?)(?=\s+(?:Kontakt|Poka[zż]|Termin\s+wp|$))/i.exec(text);
    const auction_date = terminM ? parseDateText(terminM[1]) : null;

    const bip_url = bipUrlFromBlock(text);

    out.push({
      kind: 'mieszkalny',
      address_raw: heading,
      address,
      round,
      starting_price_pln,
      auction_date,
      bip_url: bip_url ?? null,
      detail_url: bip_url ?? null,
    });
  }
  return out;
}


const BIP_BASE = 'https://bip.brzeg.pl';

export function parseBipIndexMonth(html) {
  const out = [];
  const seen = new Set();
  const re = /href="(\/przetargi,9_1-\d{4}-\d+_\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({
      title: stripTags(m[2]).trim(),
      url: BIP_BASE + path,
    });
  }
  return out;
}


export function parseBipItemPage(html, pageUrl) {
  if (!html) return null;

  let title = '';
  const h1M = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1M) {
    title = stripTags(h1M[1]).trim();
  } else {
    const nameM = /Nazwa(?:\s+przetargu)?\s*:\s*([\s\S]*?)(?:\n|<)/i.exec(html);
    if (nameM) title = stripTags(nameM[1]).trim();
  }

  const attachRe = /href="(\/uploaded_files\/serwis_files\/attachments\/przetargi\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let announcementPdf = null;
  let resultPdf = null;
  let am;
  while ((am = attachRe.exec(html)) !== null) {
    const href = am[1];
    const linkText = stripTags(am[2]).toLowerCase();
    const absUrl = BIP_BASE + href;
    if (/informacj\w*\s+o\s+wynik/i.test(linkText)) {
      resultPdf = absUrl;
    } else if (/og[łl]oszeni/i.test(linkText)) {
      if (!announcementPdf) announcementPdf = absUrl;
    } else if (!announcementPdf && !resultPdf) {
      if (!resultPdf) announcementPdf = absUrl;
    }
  }

  const dateM = /Data\s+wytworzenia\s+informacji\s*:\s*(\d{2}\.\d{2}\.\d{4})/i.exec(html);
  const publishedDate = dateM ? parseDateText(dateM[1]) : null;

  return { title, announcementPdf, resultPdf, publishedDate };
}



function priceFromResultText(text, labelPattern) {
  const re = new RegExp(labelPattern + '[^\\d]{0,25}([\\d][\\d\\u00a0 .,]*)\\s*z[łl\\u0142]', 'i');
  const m = re.exec(text);
  return m ? parsePLN(m[1]) : null;
}

function addressFromResultText(text) {
  const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  if (!aptM) return null;
  const apt = aptM[1];

  const addrM = /przy\s+ul(?:icy)?\.?\s+([\w\s.\-]+?)\s+(\d+[A-Za-z]?)(?=[.,;\s])/i.exec(text);
  if (!addrM) return null;

  return parseAddress(`${addrM[1].trim()} ${addrM[2]}/${apt}`);
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const isResultNotice =
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /Cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /wynik(?:iem)?\s+negatywn/i.test(t);
  if (!isResultNotice) return [];

  if (/niezabudowan\w*\s+dzia[łl]k|sprzeda[żz]\s+dzia[łl]k/i.test(t)) return [];
  const kind = 'mieszkalny';

  const address = addressFromResultText(t);
  if (!address) return [];

  let auction_date = fallbackDate ?? null;
  const dateM1 = /w\s+dniu\s+(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})\s+(?:roku\s+)?(?:o\s+godz|odby[łl])/i.exec(t);
  const dateM2 = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(?:roku\s+)?(?:o\s+godz|odby[łl])/i.exec(t);
  if (dateM1) {
    const mon = PL_MONTHS[dateM1[2].toLowerCase()];
    if (mon) auction_date = iso(dateM1[3], mon, dateM1[1]);
  } else if (dateM2) {
    auction_date = iso(dateM2[3], dateM2[2], dateM2[1]);
  }

  const starting_price_pln = priceFromResultText(t, 'Cena\\s+wywo[łl\\u0142]awcza\\s*:?');
  const final_price_pln =
    priceFromResultText(t, 'Cena\\s+osi[ąa]gni[ęe]ta\\s*:?') ??
    priceFromResultText(t, 'cena\\s+nabycia\\s*:?');

  const unsold = /wynik(?:iem)?\s+negatywn|nikt\s+nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik|wadium)/i.test(t);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/brak\s+wadium/i.test(t) ? 'brak wadium' : 'wynik negatywny')
    : null;

  return [{
    kind,
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}

export { pdfText };
