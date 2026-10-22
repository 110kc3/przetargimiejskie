import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function parsePLN(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^\d.,]/g, '').trim();
  const withoutGrosze = cleaned.replace(/,\d{2}$/, '').replace(/\.\d{2}$/, '');
  const num = parseInt(withoutGrosze.replace(/[\s.,\u00a0]/g, ''), 10);
  return Number.isFinite(num) ? num : null;
}

export function parseArea(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/\s+/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? val : null;
}

const MONTHS = {
  stycz: '01', lut: '02', mar: '03', kwiec: '04', maj: '05', czerw: '06',
  lip: '07', sierp: '08', wrzes: '09', wrze: '09', paz: '10', paź: '10', paźdz: '10',
  list: '11', grud: '12',
};

export function parseDateText(str, fallbackYear = null) {
  if (!str) return null;
  const s = String(str).trim();

  // "18.10.2022" or "18-10-2022" or "18/10/2022"
  const numM = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  if (numM) {
    const d = numM[1].padStart(2, '0');
    const m = numM[2].padStart(2, '0');
    return `${numM[3]}-${m}-${d}`;
  }

  // "18.10." with fallbackYear
  const dotTwoM = /^(\d{1,2})\.(\d{2})\.?$/.exec(s);
  if (dotTwoM && fallbackYear) {
    return `${fallbackYear}-${dotTwoM[2]}-${dotTwoM[1].padStart(2, '0')}`;
  }

  // "3 czerwca 2025" or "26 października"
  const textM = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{4}))?/i.exec(s);
  if (textM) {
    const day = textM[1].padStart(2, '0');
    const stem = textM[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 4);
    let month = null;
    for (const [key, val] of Object.entries(MONTHS)) {
      const normK = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (stem.startsWith(normK) || normK.startsWith(stem)) {
        month = val;
        break;
      }
    }
    const year = textM[3] || fallbackYear;
    if (month && year) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

export function extractAuctionDate(text, fallbackYear = null) {
  if (!text) return null;
  const patterns = [
    /(?:przetarg\w*|licytacj\w*)\s+(?:odb[eęy]\p{L}*\s+si[eę]|zaplanowan\w*|wyznaczono\s+na|ustalono\s+na)\s*(?:w\s+dniu\s+|dnia\s+)?(\d{1,2}(?:\s+[a-ząćęłńóśźż]+|\.\d{2}\.\d{4}|\.\d{2})(?:\s+\d{4})?)/iu,
    /odb[eęy]\p{L}*\s+si[eę]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2}(?:\s+[a-ząćęłńóśźż]+|\.\d{2}\.\d{4}|\.\d{2})(?:\s+\d{4})?)/iu,
    /(?:termin|data)\s+przetargu[^\d]{0,30}?(\d{1,2}(?:\s+[a-ząćęłńóśźż]+|\.\d{2}\.\d{4}|\.\d{2})(?:\s+\d{4})?)/iu,
    /og[łl]asza\s+(?:na\s+dzień|w\s+dniu)\s+(\d{1,2}(?:\s+[a-ząćęłńóśźż]+|\.\d{2}\.\d{4}|\.\d{2})(?:\s+\d{4})?)[\s\S]{0,250}?przetarg/iu,
    /(?:przeprowadzon\w*|rozstrzygni[eę]t\w*)\s+w\s+dniu\s+(\d{1,2}(?:\s+[a-ząćęłńóśźż]+|\.\d{2}\.\d{4}|\.\d{2})(?:\s+\d{4})?)/iu,
    /w\s+dniu\s+(\d{1,2}(?:\s+[a-ząćęłńóśźż]+|\.\d{2}\.\d{4}|\.\d{2})(?:\s+\d{4})?)[\s\S]{0,60}?(?:przeprowadzono|odby[łl]\s+si[eę])/iu,
  ];

  for (const pat of patterns) {
    const m = pat.exec(text);
    if (m) {
      const parsed = parseDateText(m[1], fallbackYear);
      if (parsed) return parsed;
    }
  }
  return null;
}

const ORDINAL_MAP = {
  pierwszy: 1, drug: 2, trzeci: 3, czwart: 4, 'pi[ąa]t': 5, 'sz[óo]st': 6,
  'si[óo]dm': 7, '[óo]sm': 8, 'dziewi[ąa]t': 9, 'dziesi[ąa]t': 10,
};
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function extractRound(text) {
  if (!text) return null;
  const romM = /\b(VIII|VII|VI|IX|IV|V|X|I{1,3})\s+przetarg/u.exec(text);
  if (romM) return ROMAN_MAP[romM[1]] ?? null;
  for (const [prefix, num] of Object.entries(ORDINAL_MAP)) {
    const r = new RegExp(`\\b${prefix}\\w*\\s+przetarg`, 'i');
    if (r.test(text)) return num;
  }
  return null;
}

export function resolveKind(text) {
  if (/lokal\w*\s+mieszkaln/i.test(text)) return 'mieszkalny';
  if (/lokal\w*\s+u[żz]ytkow/i.test(text)) return 'uzytkowy';
  if (/niezabudowan/i.test(text)) return 'grunt';
  if (/(?:sprzeda[żz]\s+)?gara[żz]u?\b|lokal\w*\s+(?:użytkow\w*|niemieszkaln\w*)?\s*-\s*gara[żz]/i.test(text) && !/budyn\w*\s+mieszkaln|zabudowan/i.test(text)) {
    return 'garaz';
  }
  if (/(?<!nie)zabudowan|budyn\w*\s+mieszkaln|jednorodzinn/i.test(text)) return 'zabudowana';
  if (/dzia[łl]k|grunt/i.test(text)) return 'grunt';
  return classifyKind(text);
}

export function extractAddress(lotText) {
  let apt = null;
  const aptM = /(?:lokal\w*|mieszkani\w*)\s+(?:mieszkaln\w*|u[żz]ytkow\w*)?\s*(?:nr\s*)?([0-9]+[A-Za-z]?)/i.exec(lotText)
    || /\bm\.\s*([0-9]+[A-Za-z]?)\b/i.exec(lotText);
  if (aptM) {
    apt = aptM[1];
  } else {
    const slashAptM = /(?:UL\.|ULICY)\s*[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s.]+\s+\d+[A-Za-z]?\/([0-9]+[A-Za-z]?)/i.exec(lotText);
    if (slashAptM) apt = slashAptM[1];
  }

  // Look for street and building number, skipping City Hall (Konopnickiej 14)
  const streetRe = /(?:przy\s+)?(?:ul\.|ulicy|al\.|Plac\w*)\s*([a-z.\s]*\p{Lu}[\p{L}.''’-]*(?:\s+[\p{L}.''’-]+){0,3}?)\s+(?:nr\.?\s*)?(\d{1,4}[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?\b/giu;
  let sm;
  let chosenStreet = null;
  let streetBldg = null;
  let streetApt = null;
  while ((sm = streetRe.exec(lotText)) !== null) {
    const candidateStreet = sm[1].trim();
    const candidateBldg = sm[2];
    if (/Marii\s+Konopnickiej/i.test(candidateStreet) && candidateBldg === '14') continue;
    chosenStreet = candidateStreet;
    streetBldg = candidateBldg;
    if (sm[3]) streetApt = sm[3];
    break;
  }

  const finalApt = apt || streetApt;
  if (chosenStreet && streetBldg) {
    const full = `ul. ${chosenStreet} ${streetBldg}${finalApt ? '/' + finalApt : ''}`;
    return { raw: full, parsed: parseAddress(full), parcel: null };
  }

  // If no street address, try parcel number for land
  const plotM = /dzia[łl]k\w*\s+(?:nr\s+)?(\d+(?:\/\d+)?)/i.exec(lotText);
  if (plotM) {
    const full = `Łęczyca, dz. ${plotM[1]}`;
    return { raw: full, parsed: parseAddress(full), parcel: plotM[1] };
  }

  return { raw: null, parsed: null, parcel: null };
}

export function isRental(text) {
  if (!text) return false;
  return /do\s+wynaj[ęe]cia|oddani[ae]\s+w\s+najem|czynszu\s+najmu|najem\s+lokal/i.test(text) &&
    !/sprzeda[żz]/i.test(text);
}

export function isCancellation(text) {
  if (!text) return false;
  if (text.length < 200) {
    return /odwo[łl]ani|uniewa[żz]ni/i.test(text);
  }
  return /og[łl]oszenie\s+o\s+odwo[łl]aniu|informacj[ae]\s+o\s+odwo[łl]aniu|przetarg\s+zosta[łl]\s+odwo[łl]any|uniewa[żz]nia\s+si[eę]\s+przetarg/i.test(text);
}

export function splitLots(html) {
  const raw = decodeEntities(html)
    .replace(/<\s*(?:br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const splitPatterns = [
    // 1. Time-stamped lots: "09.00 – lokal...", "9.40 – trzeci przetarg...", "12.45 – nieruchomość..."
    /(?:^|\n)\s*\d{1,2}[.:]\d{2}\s*[\-–—]\s*(?:(?:\p{L}+|[I|V|X]+)\s+przetarg\s+na\s+sprzedaż\s+)?(?:lokal|nieruchomo|działk)/giu,
    // 2. Heading lots: "LOKAL MIESZKALNY – UL...", "KAMIENICA- UL..."
    /(?:^|\n)\s*(?:LOKAL\s+(?:MIESZKALNY|UŻYTKOWY)|KAMIENICA)\s*[\-–—]\s*UL/giu,
    // 3. Repeating land auction paragraphs: "przetarg na sprzedaż nieruchomości gruntowej..."
    /(?:^|\n)\s*(?:\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}\s+roku\s+)?przetarg\s+na\s+sprzedaż\s+nieruchomości\s+gruntowej/giu,
    // 4. Numbered lots: "1. Lokal...", "I. Nieruchomość..."
    /(?:^|\n)\s*(?:[IVX]+|[0-9]{1,2})[.)]\s+(?:Lokal|Nieruchomo|Działk|Garaż)/giu,
  ];

  const combined = [];
  for (const pat of splitPatterns) {
    let m;
    while ((m = pat.exec(raw)) !== null) {
      combined.push(m.index);
    }
  }
  const uniqueIndices = Array.from(new Set(combined)).sort((a, b) => a - b);

  if (uniqueIndices.length >= 2) {
    const preamble = raw.slice(0, uniqueIndices[0]);
    const lots = [];
    for (let i = 0; i < uniqueIndices.length; i++) {
      const start = uniqueIndices[i];
      const end = i + 1 < uniqueIndices.length ? uniqueIndices[i + 1] : raw.length;
      lots.push(raw.slice(start, end));
    }
    return { preamble, lots };
  }

  return { preamble: '', lots: [raw] };
}

export function parseLot(lotText, meta = {}, preambleDate = null, preambleRound = null) {
  if (!lotText || lotText.trim().length < 30) return null;

  // Filter rentals and cancellations
  if (isRental(lotText) || isCancellation(lotText)) return null;

  const kind = resolveKind(lotText);

  let price = null;
  const priceM = /cena\s+wywo[łl]awcza[^\d]{0,40}?\b([\d\s\u00a0.,]+?)\s*z[łl]/i.exec(lotText)
    || /cena[^:\d]{0,30}:\s*([\d\s\u00a0.,]+?)\s*z[łl]/i.exec(lotText);
  if (priceM) price = parsePLN(priceM[1]);

  let area = null;
  const areaM = /(?:powierzchni\s+u[żz]ytkowej|powierzchni|o\s+pow\.)\s*([\d\s\u00a0.,]+?)\s*(?:m\s*[2²]|ha)/i.exec(lotText);
  if (areaM) {
    if (/ha/i.test(areaM[0])) {
      const ha = parseFloat(areaM[1].replace(',', '.'));
      if (ha) area = Math.round(ha * 10000);
    } else {
      area = parseArea(areaM[1]);
    }
  }

  const date = extractAuctionDate(lotText, meta.publishedDate?.slice(0, 4)) || preambleDate;
  const round = extractRound(lotText) ?? preambleRound;

  const kwM = /([A-Z0-9]{4}\/\d{8}\/\d)/.exec(lotText);
  const kw_nr = kwM ? kwM[1] : null;

  const { raw: rawAddr, parsed: address, parcel } = extractAddress(lotText);
  if (!address && !rawAddr) return null;

  const record = {
    kind,
    address_raw: rawAddr,
    address,
    area_m2: area,
    starting_price_pln: price,
    auction_date: date,
    round,
    kw_nr,
    detail_url: meta.postUrl || null,
    source_url: meta.postUrl || null,
    published_date: meta.publishedDate || null,
    title: meta.postTitle || null,
  };

  if (kind === 'grunt') {
    record.dzialka_nr = parcel;
  }

  return record;
}

export function parsePost(post) {
  const listings = [];
  const land = [];
  if (!post) return { listings, land };

  const title = post.title?.rendered || '';
  if (isCancellation(title) || isRental(title)) {
    return { listings, land };
  }

  const html = post.content?.rendered || '';
  const postUrl = post.link || null;
  const publishedDate = post.date ? post.date.slice(0, 10) : null;
  const postYear = post.date ? post.date.slice(0, 4) : null;

  const plainText = decodeEntities(html).replace(/<[^>]+>/g, ' ');

  const preambleDate = extractAuctionDate(plainText, postYear);
  const preambleRound = extractRound(title) ?? extractRound(plainText);

  const { lots } = splitLots(html);

  const meta = { postUrl, publishedDate, postTitle: title };

  for (const lotText of lots) {
    const item = parseLot(lotText, meta, preambleDate, preambleRound);
    if (!item) continue;
    if (item.kind === 'grunt') {
      land.push(item);
    } else {
      listings.push(item);
    }
  }

  return { listings, land };
}

export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = decodeEntities(String(text));

  const isResult = /informacj\w*\s+o\s+wynik|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|cena\s+osi[ąa]gni[ęe]ta|wylicytowan|wynik(?:iem)?\s+negatywn/i.test(t);
  if (!isResult) return [];

  const kind = resolveKind(t);
  if (isRental(t)) return [];

  const { raw: rawAddr, parsed: address, parcel } = extractAddress(t);
  if (!address && !rawAddr) return [];

  const achievedM = /(?:wylicytowan\w*\s+cen\w*|(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta)[\s\S]{0,80}?wynios[łl]a\s*[:\-–]?\s*([\d\s\u00a0.,]+?)\s*z[łl]/i.exec(t)
    || /cena\s+osi[ąa]gni[ęe]ta[^:\d]{0,40}:\s*([\d\s\u00a0.,]+?)\s*z[łl]/i.exec(t);
  const achievedPrice = achievedM ? parsePLN(achievedM[1]) : null;

  const negativeStated = /wynik(?:iem)?\s+negatywn|brak\s+(?:ofert|oferent|uczestnik)|nie\s+wy[łl]oniono|nie\s+przyst[ąa]pi|nie\s+odnotowano\s+wp[łl]at|brak\s+wadium/i.test(t);
  const sold = achievedPrice != null && !negativeStated;

  let price = null;
  const priceM = /cena\s+wywo[łl]awcza[^\d]{0,40}?\b([\d\s\u00a0.,]+?)\s*z[łl]/i.exec(t)
    || /cena[^:\d]{0,30}:\s*([\d\s\u00a0.,]+?)\s*z[łl]/i.exec(t);
  if (priceM) price = parsePLN(priceM[1]);

  let area = null;
  const areaM = /(?:powierzchni\s+u[żz]ytkowej|powierzchni|o\s+pow\.)\s*([\d\s\u00a0.,]+?)\s*(?:m\s*[2²]|ha)/i.exec(t);
  if (areaM) {
    if (/ha/i.test(areaM[0])) {
      const ha = parseFloat(areaM[1].replace(',', '.'));
      if (ha) area = Math.round(ha * 10000);
    } else {
      area = parseArea(areaM[1]);
    }
  }

  const auction_date = extractAuctionDate(t) || fallbackDate || null;
  const round = extractRound(t);

  const notes = [];
  if (price == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const rec = {
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: rawAddr,
    address,
    round,
    starting_price_pln: price,
    final_price_pln: sold ? achievedPrice : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : (/brak\s+wadium|nie\s+odnotowano\s+wp[łl]at|brak\s+wp[łl]at/i.test(t) ? 'brak wadium' : 'wynik negatywny'),
    area_m2: area,
    notes,
  };

  if (rec.kind === 'grunt') {
    rec.dzialka_nr = parcel;
  }

  return [rec];
}
