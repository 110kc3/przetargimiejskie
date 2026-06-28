// Gniezno parsers.
//
// Roles:
//   1. isFlatSaleTitle / parseBipList    BIP listing page (IDcom.pl CMS)
//   2. pdfAttachmentUrlsFromDetail       BIP per-entry page PDF links
//   3. parseResultNotice / parseResultDoc gniezno.eu HTML result notices
//   4. parseAnnouncement                 ogloszenie PDF text parser
//
// Polish letters in regex classes use Unicode escapes or toAsciiPL() normalisation.

import { parseAddress } from '../../core/normalize.js';

// ---- helpers -----------------------------------------------------------------

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

// parsePLN: parse Polish price string to integer PLN
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

// toAsciiPL: 1:1 char replacement so output index == input index
function toAsciiPL(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z');
}

function iso(y, m, d) {
  return String(y) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function dateFromPolishWords(text) {
  const m = /(\d{1,2})\s+([A-Za-zÀ-ɏ]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAsciiPL(m[2])];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

function dateFromNumeric(text) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text || '');
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

// ---- 1. BIP listing parser ---------------------------------------------------

export function isFlatSaleTitle(title) {
  const t = toAsciiPL(title || '');
  if (/lokal\s+mieszkaln/.test(t)) return true;
  if (/^sprzedaz\s*[-]\s*ul\./.test(t)) return true;
  if (/najem|niezabudowa|dzialek|dzialki|bezprzetargow|lokal\s+uzytkow/.test(t)) return false;
  return false;
}

export function parseBipList(html) {
  if (!html) return [];
  const out = [];
  const RE = /<p[^>]+class="title"[^>]*>\s*<a[^>]+href="([^"]+\/wiadomosc\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/gi, '&');
    const title = stripTags(m[2]);
    if (!isFlatSaleTitle(title)) continue;
    out.push({ title, detail_url: url, round: roundFromTitle(title) });
  }
  return out;
}

export function roundFromTitle(title) {
  const raw = title || '';
  const romanM = /\b(IV|III|II|I|V)\s+przetarg/i.exec(raw);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  const t = toAsciiPL(raw);
  if (/pierwsz/.test(t)) return 1;
  if (/\bdrugim?\b|drug/.test(t)) return 2;
  if (/\btrzecim?\b|trzeci/.test(t)) return 3;
  if (/\bczwartym?\b|czwart/.test(t)) return 4;
  if (/\bpiatym?\b|piat/.test(t)) return 5;
  return null;
}

// ---- 2. BIP detail page: PDF attachment URL extraction ----------------------

export function pdfAttachmentUrlsFromDetail(html) {
  if (!html) return [];
  const out = [];
  const RE = /href="(https?:\/\/bip-v1-files\.idcom-jst\.pl[^"]+\.pdf(?:\?[^"]*)?)"/gi;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/gi, '&');
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

// ---- 3. gniezno.eu HTML result notice parser --------------------------------

export function parseResultNotice(text, sourceUrl) {
  if (!text) return [];
  const raw = text.replace(/\r/g, '').replace(/\s+/g, ' ');
  const t = toAsciiPL(raw);
  const notes = [];

  const auction_date = dateFromPolishWords(raw) || dateFromNumeric(raw) || null;
  const round = resultRoundFromText(t);

  // Match apt on raw to preserve uppercase letter (e.g. "5A" not "5a")
  const aptM = /lokal[a-z]*\s+mieszkaln[a-z]*\s+nr\s+(\d+[A-Za-z]?)/i.exec(raw);
  const streetM = /przy\s+ulicy\s+([A-Za-z][A-Za-z0-9 .']*?)\s+(\d+[A-Za-z]?)(?:\s*[,.]|$|\s+stanowi|\s+wraz)/i.exec(raw);

  if (!aptM || !streetM) return [];

  const apt = aptM[1];
  const street = streetM[1].replace(/\s+/g, ' ').trim();
  const building = streetM[2];
  const address_raw = 'ul. ' + street + ' ' + building + '/' + apt;
  const address = parseAddress(address_raw);
  if (!address) {
    notes.push('parse: address parse failed');
    return [];
  }
  if (address.warning) notes.push(address.warning);

  const startM = /cena\s+wywolawcza\s+wynosila\s+([\d\s.,]+)\s*zl/i.exec(t);
  const starting_price_pln = startM ? parsePLN(startM[1]) : null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  // wyniosla (perfective: osiagnieta cena) vs wynosila (imperfective: cena wywolawcza)
  // After toAsciiPL: wyniosla / wynosila -- accept both with wynios[a-z]*
  const finalM = /najwyzsza\s+cena\s+osiagnieta\s+w\s+przetargu\s+wynios[a-z]*\s+([\d\s.,]+)\s*zl/i.exec(t);

  const positive = /wynikiem\s+pozytywnym/i.test(t);
  const negative = /wynikiem\s+negatywnym/i.test(t);
  if (!positive && !negative) notes.push('parse: outcome unclear');

  let unsold_reason = null;
  if (/brak\s+wplaty\s+wadium/i.test(t) || /brak\s+uczestnik/i.test(t)) {
    unsold_reason = 'brak_uczestnikow';
  } else if (/uniewazni/i.test(t)) {
    unsold_reason = 'uniewaznienie';
  }

  const outcome = positive ? 'sold' : 'unsold';
  const final_price_pln = positive && finalM ? parsePLN(finalM[1]) : null;
  if (positive && final_price_pln == null) notes.push('parse: missing final price on positive result');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    area_m2: null,
    notes,
  }];
}

function resultRoundFromText(t) {
  const romanM = /oglosil[a-z]*\s+(IV|III|II|I|V)\s+przetarg/i.exec(t || '');
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  const ordM = /oglosil[a-z]*\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|piat\w*)\s+przetarg/i.exec(t || '');
  if (ordM) {
    const w = ordM[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzeci')) return 3;
    if (w.startsWith('czwart')) return 4;
    return 5;
  }
  return null;
}

// ---- 4. Announcement PDF text parser ----------------------------------------

export function parseAnnouncement(text) {
  const empty = { round: null, auction_date: null, area_m2: null, starting_price_pln: null, address_raw: null };
  if (!text) return empty;
  const raw = text.replace(/\r/g, '');
  const t = toAsciiPL(raw);

  const round = (() => {
    const romanM = /oglasza\s+(IV|III|II|I|V)\s+przetarg/i.exec(t);
    if (romanM) {
      const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
      return ROMAN[romanM[1].toUpperCase()] ?? null;
    }
    const ordM = /oglasza\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|piat\w*)\s+przetarg/i.exec(t);
    if (ordM) {
      const w = ordM[1].toLowerCase();
      if (w.startsWith('pierwsz')) return 1;
      if (w.startsWith('drug')) return 2;
      if (w.startsWith('trzeci')) return 3;
      if (w.startsWith('czwart')) return 4;
      return 5;
    }
    if (/przetarg/i.test(t)) return 1;
    return null;
  })();

  // Auction date anchored on odbedzie sie w dniu in t.
  // toAsciiPL is 1:1 char replacement so t index == raw index.
  const auction_date = (() => {
    const anchorIdx = t.search(/odbedzie\s+sie\s+w\s+dniu/i);
    const scope = anchorIdx >= 0 ? t.slice(anchorIdx) : t.slice(0, 500);
    const num = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(scope);
    if (num) return iso(num[3], num[2], num[1]);
    const rawScope = anchorIdx >= 0 ? raw.slice(anchorIdx) : raw.slice(0, 500);
    return dateFromPolishWords(rawScope);
  })();

  const area_m2 = (() => {
    const lab = /powierzchni[a-z]*\s+uzytkow[a-z]*[^0-9]{0,30}?([\d][\d.,]*)\s*m\s*2/i.exec(t);
    if (lab) {
      const v = parseArea(lab[1]);
      if (v && v > 0) return v;
    }
    const M2_RE = /([\d][\d.,]*)\s*m\s*2(?!\d)/gi;
    const cands = [];
    let m;
    M2_RE.lastIndex = 0;
    while ((m = M2_RE.exec(t)) !== null) {
      const v = parseArea(m[1]);
      if (v == null || v <= 0) continue;
      const before = t.slice(Math.max(0, m.index - 40), m.index);
      if (/dzialki?|grunt/i.test(before)) continue;
      if (/piwnic|komorka?|przynale|garaz/i.test(before)) continue;
      cands.push(v);
    }
    return cands.length ? Math.max(...cands) : null;
  })();

  const starting_price_pln = (() => {
    const start = t.search(/cena\s+wywolawcza/i);
    if (start < 0) return null;
    const region = t.slice(start, start + 250);
    const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*zl/i.exec(region);
    return m ? parsePLN(m[1]) : null;
  })();

  const address_raw = (() => {
    const m = /przy\s+ul\.?\s+([A-Za-z][A-Za-z0-9 .']*?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(raw);
    return m ? 'ul. ' + m[1].replace(/\s+/g, ' ').trim() : null;
  })();

  return { round, auction_date, area_m2, starting_price_pln, address_raw };
}

// ---- 5. Contract entry-point -------------------------------------------------

export function parseResultDoc(text, _date, sourceUrl) {
  return parseResultNotice(text, sourceUrl);
}
