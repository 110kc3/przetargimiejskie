
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


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

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

const PL_MONTHS = {
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

function dateFromNumeric(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

function dateFromWords(s) {
  const m = /(\d{1,2})\s+([a-zÀ-ž]+)\s+(\d{4})/i.exec(s || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAscii(m[2])];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

export function roundFromText(text) {
  const t = toAscii(text || '');
  if (/\bpierwsz\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 1;
  if (/\bdrug\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 3;
  if (/\bczwart\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 4;
  if (/\bpiat\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 5;
  const romanM = /\b(I{1,3}|IV|V|VI{0,3})\s+przetarg/i.exec(t);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  if (/\bkolejn\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return null;
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}


export function parseListPage(html, baseHost) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const RE_OLD = /<(?:h2|h3)[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/(?:h2|h3)>/gi;
  const RE_NEW = /<a[^>]+href="([^"]+)"[^>]*class="post__link"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const RE = RE_NEW.test(html) ? RE_NEW : RE_OLD;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(html)) !== null) {
    let url = m[1].replace(/&amp;/gi, '&').trim();
    const title = stripTags(m[2]).trim();
    if (!title || !url) continue;
    if (url.startsWith('/')) {
      url = baseHost.replace(/\/$/, '') + url;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
  }
  return out;
}

export function mentionsLokal(title) {
  return /\blokal/i.test(toAscii(title || ''));
}

export function isResultTitle(title) {
  const t = toAscii(title || '');
  return /wynik\w*\s+(?:\w+\s+){0,3}przetarg/.test(t) || /\bprotok/.test(t);
}

export function isAnnounceTitle(title) {
  const t = toAscii(title || '').trim();
  if (isResultTitle(title)) return false;
  return /^ogloszenie/.test(t) || /^[ivx]+\s+przetarg/.test(t);
}


export function extractArticleText(html) {
  if (!html) return '';
  const contentM = /<div class="bip-page__content">([\s\S]*?)<div class="bip-page__footer"/i.exec(html);
  if (contentM) return stripTags(contentM[1]);

  const printM = /id="printArea"[^>]*>([\s\S]*?)<\/(?:div|section|main)>/i.exec(html);
  const articleM = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainM = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  let raw;
  if (printM) {
    raw = printM[1];
  } else if (articleM) {
    raw = articleM[1];
  } else if (mainM) {
    raw = mainM[1].replace(/Metryczka[\s\S]*/, '').replace(/Rejestr zmian[\s\S]*/, '');
  } else {
    raw = html;
  }
  return stripTags(raw);
}


function expandStreetAbbrev(street) {
  return street.replace(/^M\.?\s+Przedmie[śs]cie$/i, 'Małe Przedmieście');
}

function extractAddress(body) {
  const aptM = /lokal\w*\s+(?:mieszkaln\w*\s+)?nr\.?\s*(\d+[A-Za-z]?)/i.exec(body);
  const apt = aptM ? aptM[1] : null;

  const wspM = /Wsp[óo]lnoty\s+Mieszkaniowej\s+([A-Za-zÀ-ž][A-Za-zÀ-ž0-9.\-]*(?:\s+[A-Za-zÀ-ž.]+)?)\s+(\d+[A-Za-z]?)\b/i.exec(body);
  if (wspM) {
    const street = expandStreetAbbrev(wspM[1].trim());
    let raw = `${street} ${wspM[2]}`;
    if (apt) raw += '/' + apt;
    const address = parseAddress(raw);
    return { address_raw: raw, address };
  }

  const przyM = /przy\s+ul\.?\s+([A-Za-zÀ-ž][A-Za-zÀ-ž0-9À-ž\s.''\-]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(body);
  if (przyM) {
    let raw = przyM[1].trim();
    if (apt && !/\/\d/.test(raw)) raw += '/' + apt;
    raw = 'ul. ' + raw;
    const address = parseAddress(raw);
    return { address_raw: raw, address };
  }

  return { address_raw: null, address: null };
}

function extractAreaM2(body) {
  const areaLab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,40}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (areaLab) return parseArea(areaLab[1]);

  const areaLab2 = /\bo\s+powierzchni\s+([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (areaLab2) return parseArea(areaLab2[1]);

  const M2_RE = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let mm;
  M2_RE.lastIndex = 0;
  while ((mm = M2_RE.exec(body)) !== null) {
    const v = parseArea(mm[1]);
    if (v == null || v <= 0) continue;
    const before = toAscii(body.slice(Math.max(0, mm.index - 50), mm.index));
    if (/dzialk|grunt|lacznej\s+pow/.test(before)) continue;
    if (/piwnic|komorka?|przynale|garaz/.test(before)) continue;
    cands.push(v);
  }
  if (!cands.length) return null;
  return Math.min(...cands);
}


export function parseAnnouncement(html, sourceUrl) {
  const body = extractArticleText(html);
  const t = toAscii(body);

  const kind = classifyKind(body);
  const round = roundFromText(body);

  let auction_date = null;
  const anchorIdx = t.search(/odbedzie\s+sie/);
  const scope = anchorIdx >= 0 ? body.slice(anchorIdx, anchorIdx + 200) : body.slice(0, 500);
  auction_date = dateFromWords(scope) || dateFromNumeric(scope);

  let starting_price_pln = null;
  const priceStart = t.search(/cena\s+wywolawcza/);
  if (priceStart >= 0) {
    const priceRegion = body.slice(priceStart, priceStart + 300);
    const pm = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(priceRegion);
    if (pm) starting_price_pln = parsePLN(pm[1]);
  }

  const area_m2 = extractAreaM2(body);
  const { address_raw, address } = extractAddress(body);

  return {
    kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const body = /<[a-z]/.test(text) ? extractArticleText(text) : text;
  const t = toAscii(body);
  const notes = [];

  if (!/odby[łl]\s+si[ęe]\s[\s\S]{0,80}przetarg|wynik\w*\s+(?:\w+\s+){0,3}przetarg|przeprowadzon\w*\s[\s\S]{0,80}przetarg/i.test(body)) {
    return [];
  }

  let auction_date = fallbackDate || null;
  const dateM1 = /[Ww]\s+dniu\s+([\d]{1,2})\s+([a-zÀ-ž]+)\s+(\d{4})/i.exec(body);
  const dateM2 = /[Ww]\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(body);
  if (dateM1) {
    const mon = PL_MONTHS[toAscii(dateM1[2])];
    if (mon) auction_date = iso(dateM1[3], mon, dateM1[1]);
  } else if (dateM2) {
    auction_date = iso(dateM2[3], dateM2[2], dateM2[1]);
  }

  const round = roundFromText(body);

  const kind = classifyKind(body);
  if (kind !== 'mieszkalny') {
    return [];
  }

  const { address_raw, address } = extractAddress(body);
  if (!address) {
    notes.push('parse: address parse failed');
    return [];
  }
  if (address.warning) notes.push(address.warning);

  let starting_price_pln = null;
  const spStart = t.search(/cena\s+wywolawcza/);
  if (spStart >= 0) {
    const spRegion = body.slice(spStart, spStart + 300);
    const spm = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(spRegion);
    if (spm) starting_price_pln = parsePLN(spm[1]);
  }
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  let final_price_pln = null;
  const fpM = /(?:[Nn]ajwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+wynios[łl]a|cena\s+nieruchomo[śs]ci\s+zosta[łl]a\s+ustalona\s+na\s+kwot[ęe])\s+([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  if (fpM) final_price_pln = parsePLN(fpM[1]);

  const negative =
    /wynikiem\s+negatywnym|nie\s+wp[łl]aci[łl]\w*\s+(?:jakakolwiek|[żz]aden|nikt|wadium)|nikt\s+nie\s+przyst[ąa]pi[łl]|nikt\s+nie\s+wp[łl]aci[łl]/i.test(body);
  const outcome = (negative || final_price_pln == null) ? 'unsold' : 'sold';
  let unsold_reason = null;
  if (outcome === 'unsold') {
    if (/brak\s+uczestnik|nie\s+wp[łl]aci[łl]\w*\s+(?:jakakolwiek|[żz]aden|nikt|wadium)|nikt\s+nie\s+wp[łl]aci[łl]/i.test(body)) {
      unsold_reason = 'brak_uczestnikow';
    } else {
      unsold_reason = 'unknown';
    }
  }

  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price on positive result');

  const area_m2 = extractAreaM2(body);

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    area_m2,
    notes,
  }];
}
