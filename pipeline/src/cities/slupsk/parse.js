
import { parseAddress } from '../../core/normalize.js';


const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

export function roundFromTitle(title) {
  const t = (title || '').replace(/\s+/g, ' ');
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  if (/\bpi[ąa]t/i.test(t)) return 5;
  const m = /\b(VI{0,3}|IV|V?I{1,3})\s+przetarg/i.exec(t)
    || /^(VI{0,3}|IV|V?I{1,3})\s+/i.exec(t);
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

function dateFromSlupsk(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const n = Number(cleaned.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}


export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/mieszkaln/.test(t)) return false;
  if (/\bnajem\b/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/rokowania/.test(t)) return false;
  if (/gara[zż]/.test(t)) return false;
  if (/\bdzia[łl]k/.test(t) || /\bgrunty?\b/.test(t)) return false;
  if (/niemieszkalneg/.test(t)) return false;
  return true;
}

export function parseListingPage(html, origin) {
  if (origin === undefined) origin = 'https://bip.um.slupsk.pl';
  const out = [];
  const itemRe = /<div class="mx-list-item"><a href="([^"]+)"><h3>([^<]+)<\/h3><div class="mx-lead">([\s\S]*?)<\/div><\/a><\/div>/g;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const href = m[1];
    const rawTitle = m[2];
    const rawLead = m[3];
    const title = rawTitle.replace(/\s+/g, ' ').trim();
    if (!isFlatAuction(title)) continue;
    let detail_url;
    try {
      detail_url = new URL(href, origin + '/').href;
    } catch (e) {
      detail_url = origin + href;
    }
    const lead = stripTags(rawLead);
    const auction_date = dateFromSlupsk(lead);
    const statusM = /status:\s*(\S+)/i.exec(lead);
    const status = statusM ? statusM[1].replace(/[.,]$/, '') : null;
    out.push({ detail_url, title, round: roundFromTitle(title), auction_date, status });
  }
  return out;
}

export function hasNextPage(html) {
  return /<a[^>]*class="mx-next"/.test(html || '');
}

export function frontageAddress(raw) {
  const parts = raw.split(',').map((part) => parseAddress(part.trim()));
  if (parts.length < 2 || parts.some((part) => !part || part.apt
      || part.street_norm !== parts[0].street_norm)) return raw;
  return `${parts[0].street} ${parts.map((part) => part.building).join(',')}`;
}


export function parseNoticePage(html, detailUrl) {
  if (!html) return null;
  const titleM = /<h2>([^<]+)<\/h2>/.exec(html);
  const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : '';
  if (!isFlatAuction(title)) return null;

  const leadM = /<div class="mx-lead">([\s\S]*?)<\/div>/.exec(html);
  const lead = leadM ? stripTags(leadM[1]) : '';
  const auction_date = dateFromSlupsk(lead);

  const bodyM = /<div class="mx-html">([\s\S]*?)<\/div>\s*<div class="mx-files"/.exec(html)
    || /<div class="mx-html">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="metka"/.exec(html);
  const body = stripTags(bodyM ? bodyM[1] : html);

  const areaM = /o\s+powierzchni\s+\S+\s+([\d.,]+)\s*m\s*[2²]?/i.exec(body);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const priceM = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s+wynosi\s*:?\s*([\d][^z]*?)\s*z[łl]/i.exec(body);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  const kwM = /KW\s+nr\s+(SL\d[A-Z\/\d]+)/i.exec(body);
  const kw = kwM ? kwM[1] : null;

  const addrM = /przy\s+ul\.\s+([\s\S]+?)(?:\s+stanowi[ąa]c|\s+w\s+obr[ęe]bie|$)/i.exec(title);
  const addrRaw = addrM
    ? ('ul. ' + addrM[1].replace(/\s+/g, ' ').trim())
    : title;
  const address_raw = frontageAddress(addrRaw.replace(/\s+-\s+\S.*$/, '').trim());
  const address = parseAddress(address_raw);

  let finalAddress = address;
  if (address && !address.apt) {
    const aptM = /lokal\s+(?:nie)?mieszkaln\w+\s+nr\s+(\d+[a-z]?)/i.exec(body);
    if (aptM) {
      const rawWithApt = address_raw.replace(/\/\s*\d+[a-z]?$/i, '') + '/' + aptM[1];
      const withApt = parseAddress(rawWithApt);
      if (withApt) finalAddress = withApt;
    }
  }

  return {
    kind: 'mieszkalny',
    address_raw,
    address: finalAddress,
    round: roundFromTitle(title),
    auction_date,
    area_m2,
    starting_price_pln,
    kw,
    detail_url: detailUrl,
  };
}


export function parseResultArchive(html, origin) {
  if (origin === undefined) origin = 'https://bip.um.slupsk.pl';
  const out = [];
  const linkRe = /<div class="mx-files-item pdf"><a href="(file\/\d+)">([^<]+)<\/a><\/div>/g;
  let m;
  while ((m = linkRe.exec(html || '')) !== null) {
    out.push({
      pdf_url: `${origin}/${m[1]}`,
      name: m[2].replace(/\s*\(pdf[^)]*\)/, '').trim(),
    });
  }
  return out;
}


function resultRoundFromText(text) {
  const m = /\b(I{1,3}|IV|V)\s+(?:nieograniczon|ograniczon)/i.exec(text || '');
  if (!m) return null;
  return ROMAN[m[1].toUpperCase()] ?? null;
}

function resultDateFromText(text) {
  const m = /rozstrzygni[ęe]tym\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '').replace(/\s+/g, ' ').trim();

  if (!/Prezydent\s+Miasta\s+S[łl]upska\s+informuje/i.test(t)) return [];
  if (!/rozstrzygni[ęe]tym/i.test(t)) return [];

  const notes = [];
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = resultRoundFromText(t);

  const kindM = /sprzeda[ży]y\s+(?:cz[ęe][śs]ci\s+)?nieruchomo[śs]ci\s+\(lokalu\s+(mieszkalnego|niemieszkalnego)\)/i.exec(t);
  const kindWord = kindM ? kindM[1].toLowerCase() : '';
  const kind = /niemieszkalneg/.test(kindWord) ? 'uzytkowy' : 'mieszkalny';

  const bulletRe = /[-–]\s*lokal\s+\S+\s+nr\s+(\d+[a-zA-Z]?)\s+przy\s+ul\.\s+([\wÀ-ɏ\s.]+?\d+\w*),/i;
  const bulletM = bulletRe.exec(t);
  let address_raw, address;
  if (bulletM) {
    address_raw = 'ul. ' + bulletM[2].replace(/\s+/g, ' ').trim() + '/' + bulletM[1];
    address = parseAddress(address_raw);
  } else {
    const hdrM = /przy\s+ul\.\s+([\wÀ-ɏ\s.]+?\d+\w*)\s+stanowi[ąa]c/i.exec(t);
    if (hdrM) {
      address_raw = 'ul. ' + hdrM[1].replace(/\s+/g, ' ').trim();
      address = parseAddress(address_raw);
    } else {
      notes.push('parse: address not found');
    }
  }
  if (!address) notes.push('parse: address parse failed');

  const startM = /[-–]\s*cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*:\s*([\d][^z\n–-]*?)\s*z[łl]/i.exec(t);
  const starting_price_pln = startM ? parsePLN(startM[1]) : null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const achievedM =
    /najwy[żs]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:\s*([\d][^z\n–-]*?)\s*z[łl]/i.exec(t)
    || /najwy[żs]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:\s*(\d+)/i.exec(t);

  const negativeText =
    /wynikiem\s+negatywnym/i.test(t)
    || /brak\s+oferent/i.test(t)
    || /nie\s+dosz[łl]o\s+do/i.test(t);

  let final_price_pln = null;
  if (achievedM) {
    const raw = parsePLN(achievedM[1]);
    if (raw != null && raw > 0) final_price_pln = raw;
  }

  const negative = negativeText || final_price_pln == null;
  const outcome = negative ? 'unsold' : 'sold';
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw: address_raw || null,
    address: address || null,
    round,
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason: negative ? 'unknown' : null,
    area_m2: null,
    notes,
  }];
}
