import { parseAddress } from '../../core/normalize.js';


function parsePLN(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t || t === '-') return null;
  const cleaned = t
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,\d{2}/, '')
    .replace(/[^0-9]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function firstPLN(seg) {
  const m = /(\d[\d.,]+)\s*z[lł]/i.exec(seg || '');
  return m ? parsePLN(m[1]) : null;
}

function tablePLNs(line) {
  return [...String(line || '').matchAll(/\b\d{1,3}(?:[.\s]\d{3})+,\d{2}\b/g)]
    .map((match) => parsePLN(match[0]))
    .filter((value) => value != null);
}

export function isResultNotice(text) {
  return /Informacja\s+o\s+wynik(?:u|ach)\s+(?:przetarg|rokowa)/i.test(text || '');
}

export function auctionDateFromTitle(text) {
  const m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const POLISH_MONTHS = new Map([
  ['stycznia', 1], ['lutego', 2], ['marca', 3], ['kwietnia', 4],
  ['maja', 5], ['czerwca', 6], ['lipca', 7], ['sierpnia', 8],
  ['wrzesnia', 9], ['pazdziernika', 10], ['listopada', 11], ['grudnia', 12],
]);

function proseAuctionDate(text) {
  const m = /(?:na\s+dzie[nń]|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r?\.?/iu.exec(text || '');
  if (!m) return null;
  const monthName = m[2]
    .toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const month = POLISH_MONTHS.get(monthName);
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function proseRound(text) {
  const m = /\b(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[aą]t\w*|sz[oó]st\w*)\s+przetarg/iu.exec(text || '');
  if (!m) return null;
  const word = m[1].toLocaleLowerCase('pl-PL');
  if (word.startsWith('pierwsz')) return 1;
  if (word.startsWith('drug')) return 2;
  if (word.startsWith('trzeci')) return 3;
  if (word.startsWith('czwart')) return 4;
  if (/^pi[aą]t/u.test(word)) return 5;
  if (/^sz[oó]st/u.test(word)) return 6;
  return null;
}

function priceAfter(text, label) {
  const m = label.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

function parseProseResult(text, fallbackDate, sourceUrl) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const aptM = /lokal\w*\s+mieszkaln\w*(?:\s+nr)?\s+(\d+[A-Za-z]?)/iu.exec(flat);
  let propertyText = aptM ? flat.slice(aptM.index) : '';
  if (aptM) {
    const nextItem = /\s\d+\)\s/.exec(propertyText.slice(aptM[0].length));
    if (nextItem) propertyText = propertyText.slice(0, aptM[0].length + nextItem.index);
  }
  const streetM = /przy\s+ul(?:icy|\.)?\s+([\p{L}.' -]*?\p{L})\s+(\d+[A-Za-z]?)\s*(?:,|\b)/iu.exec(propertyText);
  if (!aptM || !streetM) return [];

  const address_raw = `ul. ${streetM[1].trim()} ${streetM[2]}/${aptM[1]}`;
  const address = parseAddress(address_raw);
  if (!address) return [];

  const starting_price_pln = priceAfter(
    propertyText,
    /Cena\s+wywo[łl]awcza(?:\s+nieruchomo[śs]ci)?\s*[-–—:]\s*(\d[\d\s.,]*)\s*z[łl]/iu,
  );
  const final_price_pln = priceAfter(
    propertyText,
    /(?:Najwy[żz]sza\s+cena(?:\s+osi[aą]gni[eę]ta(?:\s+w\s+przetargu)?)?|Cena\s+osi[aą]gni[eę]ta)\s*[-–—:]\s*(\d[\d\s.,]*)\s*z[łl]/iu,
  );
  const explicitlyUnsold = /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[aą]pi[łl]|nie\s+podj[eę]to\s+licytacji/iu.test(flat);
  const explicitlySold = /wynikiem\s+pozytywnym/iu.test(flat) || final_price_pln != null;
  if (!explicitlyUnsold && !explicitlySold) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date: auctionDateFromTitle(flat) || proseAuctionDate(flat) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw,
    address,
    round: proseRound(flat),
    starting_price_pln,
    final_price_pln: explicitlyUnsold ? null : final_price_pln,
    outcome: explicitlyUnsold ? 'unsold' : 'sold',
    unsold_reason: explicitlyUnsold ? 'no_bidders' : null,
    notes,
  }];
}

export function roundFromCell(cell) {
  const s = (cell || '').trim();
  const rm = /^(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg/i.exec(s);
  if (rm) {
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return roman[rm[1].toUpperCase()] ?? null;
  }
  return null;
}


export function isFlatAddressLine(line) {
  const s = (line || '').trim();
  if (!s) return false;
  if (/^(?:(?:cz\.\s*)?dz\.?|dzia[łl]k|obr\.|KW\b|SW\d|SW1W)/i.test(s)) return false;
  if (/^(?:Informacja|Oznaczenie|Rodzaj|Liczba|Cena|Najwy|Data\s+i|Urz)/i.test(s)) return false;
  if (/^\d+(?:\/\d+)?$/.test(s)) return false;
  return /^(?:(?:ul|al|os|pl)\.\s+)?[A-Za-z][A-Za-zÀ-ɏ.\- ]*\s+\d+[A-Za-z]?\/\d+[A-Za-z]?(?:\s|$)/i.test(s);
}

export function normaliseAddressLine(raw) {
  let s = (raw || '').trim()
    .replace(/\s{5,}.*$/, '')
    .replace(/\s+dz\..*$/i, '')
    .replace(/^ul\.\s+gen\.\s+(?:W\.\s*)?Andersa\b/i, 'ul. Andersa')
    .replace(/^ul\.\s+P\.\s+Skargi\b/i, 'ul. Piotra Skargi')
    .trim();
  if (/^(?:ul|al|os|pl)\./i.test(s)) return s;
  return `ul. ${s}`;
}


const COL_RODZAJ  = 33;
const COL_CENA_WY = 113;
const COL_CENA_OS = 130;
const COL_NABYWCA = 163;
const ADDR_WIDTH  = 90;

function col(line, startX, endX) {
  if (!line || startX >= line.length) return '';
  return line.slice(startX, endX ?? line.length).trim();
}


export function parseTableRows(text) {
  const lines = text.replace(/\r/g, '').replace(/\f/g, '').split('\n');
  const rows = [];

  function addressCandidate(line) {
    const firstNS = /\S/.exec(line);
    if (!firstNS) return null;

    const starts = [...line.matchAll(/(?:ul|al|os|pl)\.\s+/gi)].map((match) => match.index);
    starts.push(firstNS.index);
    for (const start of [...new Set(starts)]) {
      if (/^\s*\d{1,2}\s+/.test(line.slice(0, start))) continue;
      const possible = line.slice(start, start + ADDR_WIDTH).trim();
      if (isFlatAddressLine(possible)) return possible;
    }
    return null;
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const candidate = addressCandidate(ln);
    if (!candidate) continue;

    let lpIdx = -1;
    for (let j = i + 1; j <= i + 6 && j < lines.length; j++) {
      if (/^ {0,5}\d+\s/.test(lines[j])) { lpIdx = j; break; }
    }
    if (lpIdx < 0) continue;

    let rowEnd = lpIdx + 1;
    for (let j = lpIdx + 1; j <= lpIdx + 6 && j < lines.length; j++) {
      if (addressCandidate(lines[j])) break;
      if (/^ {0,5}\d+\s/.test(lines[j])) break;
      rowEnd = j + 1;
    }

    const lpLine = lines[lpIdx];
    let   rodzaj  = col(lpLine, COL_RODZAJ, COL_CENA_WY - 16).trim();
    let   cenaWy  = col(lpLine, COL_CENA_WY, COL_CENA_OS).trim();
    let   cenaOs  = col(lpLine, COL_CENA_OS, COL_NABYWCA).trim();
    let   nabywca = col(lpLine, COL_NABYWCA).trim();

    const rowPrices = lines.slice(lpIdx, rowEnd).flatMap(tablePLNs);
    const preRowPrices = lines.slice(i, lpIdx).flatMap(tablePLNs);
    if (rowPrices.length > 0) {
      cenaWy = String(rowPrices[0]);
      cenaOs = rowPrices.length > 1 ? String(rowPrices[1]) : '';
    } else if (preRowPrices.length > 0) {
      cenaWy = String(preRowPrices[0]);
      cenaOs = preRowPrices.length > 1 ? String(preRowPrices[1]) : '';
    }
    const rowBlock = lines.slice(i, rowEnd).join(' ');
    const rowRound = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg\b/i.exec(rowBlock);
    if (rowRound) rodzaj = `${rowRound[1]} przetarg`;
    else if (/\brokowania\b/i.test(rowBlock)) rodzaj = 'rokowania';

    if (!parsePLN(cenaOs)) {
      for (let k = i + 1; k < lpIdx; k++) {
        const contPrice = tablePLNs(lines[k])[0] ?? firstPLN(col(lines[k], COL_CENA_OS));
        if (contPrice != null) { cenaOs = String(contPrice); break; }
      }
    }

    for (let j = lpIdx + 1; j < lines.length && j < lpIdx + 8; j++) {
      const lnj = lines[j];
      if (!lnj.trim()) break;
      if (/^ {0,5}\d+\s/.test(lnj)) break;
      const cont = col(lnj, COL_NABYWCA);
      if (cont) nabywca = nabywca ? nabywca + ' ' + cont : cont;
    }
    nabywca = `${nabywca} ${rowBlock}`.trim();

    rows.push({ address1stLine: candidate, rodzaj, cenaWy, cenaOs: cenaOs.trim(), nabywca: nabywca.trim() });
    i = lpIdx + 1;
  }

  return rows;
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text || '')) return [];

  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromTitle(t) || fallbackDate || null;
  const tableRows = parseTableRows(t);
  const results = [];

  for (const row of tableRows) {
    const { address1stLine, rodzaj, cenaWy, cenaOs, nabywca } = row;

    if (!isFlatAddressLine(address1stLine)) continue;

    const address_raw = normaliseAddressLine(address1stLine);
    const address = parseAddress(address_raw);
    if (!address) continue;

    const notes = [];
    if (address.warning) notes.push(address.warning);

    const round = roundFromCell(rodzaj);
    const starting_price_pln = parsePLN(cenaWy);
    const achieved = parsePLN(cenaOs);
    const sold = achieved != null;
    const unsoldText = /nie\s+podj[e]to\s+licytacji|brak\s+zainteresowanych/i.test(
      nabywca + ' ' + cenaOs,
    );

    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !unsoldText && cenaOs !== '-' && cenaOs !== '') {
      notes.push('parse: no achieved price and no explicit unsold text');
    }

    results.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    });
  }

  return results.length > 0 ? results : parseProseResult(t, fallbackDate, sourceUrl);
}
