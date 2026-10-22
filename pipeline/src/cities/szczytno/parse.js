// Parsers for Szczytno municipal auction notices (announcements, wykaz, results).
// Pure text/HTML extraction, no network calls here.
//
// Groundtruthed against real BIP bip.um.szczytno.pl fixtures:
//   - Flat announcement (.doc): Żeromskiego 3/4 (I przetarg ustny nieograniczony)
//   - Flat announcement (.pdf): Polska 20 m. 17 (I przetarg ustny nieograniczony)
//   - Building announcement (.doc): Pasymska 40 (III przetarg ustny nieograniczony)
//   - Land multi-parcel announcement (.doc): Norwida dz. 516/4 & 516/5 (II przetarg)
//   - Flat wykaz (.doc): Dąbrowskiego 4/4a (wykaz nieruchomości lokalowej)
//   - Flat result (inline HTML): Odrodzenia 36 (sold, 454.500 zł)
//   - Building result (inline HTML): Poznańska 20A (sold, 75.530 zł)
//   - Building result (inline HTML): Pasymska 40 (sold, 575.700 zł)
//   - Land result (inline HTML): Norwida dz. 516/4 (sold, 94.600 zł)
//   - Land result (inline HTML): Wołyńska dz. 68/3 (unsold, brak zainteresowania)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ------------------------------------------------------------------ month mapping

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// ------------------------------------------------------------------ text / HTML utils

export function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&oacute;/gi, 'ó')
    .replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripHtml(html) {
  if (!html) return '';
  const withBreaks = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/tr|\/td|\/li|\/h\d)\s*\/?>/gi, ' \n ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(withBreaks).replace(/[ \t]+/g, ' ').replace(/\n[ \t]*\n+/g, '\n').trim();
}

/** Extract text inside <div id="tresc"> container */
export function extractTresc(html) {
  if (!html) return '';
  const m = html.match(/<div[^>]*id="tresc"[^>]*>([\s\S]*?)<\/div>/i);
  return m ? stripHtml(m[1]) : '';
}

/** Extract article title from <h1> */
export function extractTitle(html) {
  if (!html) return '';
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripHtml(m[1]) : '';
}

/** Extract attachment URLs from download tables or tresc links */
export function extractAttachmentUrls(html, origin = 'https://bip.um.szczytno.pl') {
  if (!html) return [];
  const urls = [];

  // 1. "Załączniki do pobrania" section
  const zalMatch = html.match(/Załączniki do pobrania[\s\S]*?<\/table>/i);
  if (zalMatch) {
    const tableHtml = zalMatch[0];
    const dlMatches = [...tableHtml.matchAll(/href="([^"]+)"/gi)];
    for (const m of dlMatches) {
      const u = m[1].trim();
      if (u.includes('/pliki/szczytno/') || /\.(?:doc|docx|pdf)$/i.test(u)) {
        urls.push(u.startsWith('http') ? u : `${origin}${u.startsWith('/') ? '' : '/'}${u}`);
      }
    }
  }

  // 2. Links within tresc
  const trescMatch = html.match(/<div[^>]*id="tresc"[^>]*>([\s\S]*?)<\/div>/i);
  if (trescMatch) {
    const aMatches = [...trescMatch[1].matchAll(/href="([^"]+)"/gi)];
    for (const m of aMatches) {
      const u = m[1].trim();
      if (u.includes('/pliki/szczytno/') || /\.(?:doc|docx|pdf)$/i.test(u)) {
        urls.push(u.startsWith('http') ? u : `${origin}${u.startsWith('/') ? '' : '/'}${u}`);
      }
    }
  }

  return [...new Set(urls)];
}

/**
 * Parse rows of the server-rendered <table class="table ... lista_artykuly"> table.
 * Returns array of { url, title, date }.
 */
export function parseBoardTable(html, origin = 'https://bip.um.szczytno.pl') {
  if (!html) return [];
  const tableMatch = html.match(/<table[^>]*lista_artykuly[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const rows = tableMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const items = [];
  for (const r of rows.slice(1)) {
    // Note: The CMS template renders unclosed <a href="...">...</td>
    const linkMatch = r.match(/<a\s+href="([^"]+)">([\s\S]*?)(?:<\/a>|<\/td>)/i);
    const tds = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1].trim());
    if (linkMatch) {
      const rawUrl = linkMatch[1].trim();
      const absUrl = rawUrl.startsWith('http') ? rawUrl : `${origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      const title = stripHtml(linkMatch[2]);
      const dateText = tds[1] ? stripHtml(tds[1]) : null;
      items.push({
        url: absUrl,
        title,
        date: dateText,
      });
    }
  }
  return items;
}

// ------------------------------------------------------------------ number utils

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseAreaNum(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------------ classifiers

export function isSkippableTitle(title) {
  const t = (title || '').toLowerCase();
  return (
    /najem|u[żz]yczenie|u[żz]yczenia|dzier[żz]aw|odwo[łl]anie|rokowani/i.test(t) ||
    /lista\s+os[oó]b\s+zakwalifikowanych|uchwa[łl]a|oferta\s+inwestycyjna/i.test(t)
  );
}

export function isBezprzetargowyTitle(title) {
  return /bezprzetargow|najemcom/i.test(title || '');
}

export function roundFromText(text) {
  if (!text) return null;
  if (/pierwsz[a-ząćęłńóśźż]*\s+przetr?[a-z]*|\bI\s+przetr?[a-z]*/i.test(text)) return 1;
  if (/drugi[a-ząćęłńóśźż]*\s+przetr?[a-z]*|\bII\s+przetr?[a-z]*/i.test(text)) return 2;
  if (/trzeci[a-ząćęłńóśźż]*\s+przetr?[a-z]*|\bIII\s+przetr?[a-z]*/i.test(text)) return 3;
  if (/czwart[a-ząćęłńóśźż]*\s+przetr?[a-z]*|\bIV\s+przetr?[a-z]*/i.test(text)) return 4;
  if (/pi[ąa]t[a-ząćęłńóśźż]*\s+przetr?[a-z]*|\bV\s+przetr?[a-z]*/i.test(text)) return 5;
  if (/sz[oó]st[a-ząćęłńóśźż]*\s+przetr?[a-z]*|\bVI\s+przetr?[a-z]*/i.test(text)) return 6;
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;

  // 1. Prioritize explicit auction event date: "przetarg zostanie przeprowadzony w dniu...", "przetarg odbędzie się w dniu...", or "w dniu ... odbył się przetarg"
  const mEvent = text.match(/(?:przetarg\s+(?:zostanie\s+przeprowadzony|odb[eę]dzie\s+si[eę])\s+w\s+dniu|(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})[^\n.]+?odby[łl]\s+si[eę])/i);
  if (mEvent) {
    const sub = text.slice(mEvent.index);
    const mDate = sub.match(/(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
    if (mDate) {
      const day = Number(mDate[1]);
      const month = PL_MONTHS[mDate[2].toLowerCase()];
      const year = Number(mDate[3]);
      if (day >= 1 && day <= 31 && month && year >= 2000 && year <= 2050) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // 2. Generic "w dniu DD miesiąc YYYY" (ignoring header issuance date e.g. "Szczytno, dnia ...")
  const cleaned = text.replace(/Szczytno[,\s]+dn(?:ia|\.)?\s*\d{1,2}\s+[a-ząćęłńóśźż]+\s*\d{4}/gi, '');
  const m = cleaned.match(/(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (m) {
    const day = Number(m[1]);
    const month = PL_MONTHS[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (day >= 1 && day <= 31 && month && year >= 2000 && year <= 2050) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const mDot = cleaned.match(/(?:w\s+dniu|dnia)\s+(\d{1,2})[.](\d{1,2})[.](\d{4})/i);
  if (mDot) {
    const day = Number(mDot[1]);
    const month = Number(mDot[2]);
    const year = Number(mDot[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2050) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}

export function resolveKind(text) {
  if (!text) return 'unknown';
  if (/lokal(?:u|e|i)?\s+mieszkaln/i.test(text)) return 'mieszkalny';
  if (/lokal(?:u|e|i)?\s+(?:u[żz]ytkow|niemieszkaln)|gara[żz]/i.test(text)) return 'uzytkowy';
  if (/budyn(?:ek|kiem|ku)\s+mieszkaln|nieruchomo[śs][ćc]i?\s+zabudowan/i.test(text)) return 'zabudowana';
  if (/nieruchomo[śs][ćc]i?\s+lokalow/i.test(text)) return 'mieszkalny';
  if (/niezabudowan|dzia[łl][kc][a-ząćęłńóśźż]*/i.test(text)) return 'grunt';
  return classifyKind(text);
}

// ------------------------------------------------------------------ field extractors

/** Strip town hall / auction venue boilerplate so City Hall address never becomes property address */
export function cleanTextForAddress(text) {
  if (!text) return '';
  return text
    .replace(/(?:w\s+)?Urz[ęe]d(?:zie|u)?\s+Miejski(?:m|ego)?\s+w\s+Szczytnie(?:\s+przy\s+ul\.\s*(?:Henryka\s*)?Sienkiewicza\s*1)?/gi, ' ')
    .replace(/ul\.\s*(?:Henryka\s*)?Sienkiewicza\s*1\b/gi, ' ');
}

export function extractAddress(text) {
  if (!text) return null;
  const cleaned = cleanTextForAddress(text);

  // 1. Direct address with number: "przy ul. X 12/3" or "ul. X 20 A"
  // Note: single letter suffixes separated by space exclude 'w' / 'i' (prepositions/conjunctions e.g. "w Szczytnie")
  const m1 = cleaned.match(
    /(?:przy\s+)?(?:ul\.|ulicy)\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ.\s-]+?)\s+(\d+[A-Za-z]?(?:\s+[A-HJ-VXYZ])?(?:\s*[\/m.]\s*\d+[A-Za-z]?)?)(?=[,\s\n\(\.]|$)/i,
  );
  if (m1) {
    let street = m1[1].trim().replace(/\s+w\s+Szczytnie/i, '').replace(/\s+m\.\s*Szczytno/i, '');
    let num = m1[2].replace(/\s+/g, '').replace(/m\./i, '/');
    let apt = '';
    if (!num.includes('/')) {
      const aptM =
        cleaned.match(/lokal[ui]?\s+(?:mieszkalnego|użytkowego|niemieszkalnego)?\s*(?:nr|numer|oznaczonym numerem)\s*(\d+[A-Za-z]?)/i) ||
        cleaned.match(/składającej się z lokali nr\s*(\d+[A-Za-z]?)/i);
      if (aptM) apt = '/' + aptM[1];
    }
    const raw = `ul. ${street} ${num}${apt}`;
    const parsed = parseAddress(raw);
    if (parsed && !(parsed.street_norm.includes('sienkiewicza') && parsed.building === '1')) {
      return { raw, parsed, street };
    }
  }

  // 2. Street without building number, but building number specified later ("oznaczonym numerem 20A")
  const streetM = cleaned.match(
    /(?:przy\s+)?(?:ul\.|ulicy)\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ.\s-]+?)(?=,|\s+w\s+Szczytnie|\s+m\.\s*Szczytno|\s+działk|\s+\(znak|\n|$)/i,
  );
  if (streetM) {
    const street = streetM[1].trim().replace(/\s+w\s+Szczytnie/i, '').replace(/\s+m\.\s*Szczytno/i, '');
    const bldM = cleaned.match(/budynk(?:iem|u)\s+(?:mieszkalnym|użytkowym)?\s*(?:oznaczonym numerem|nr|numer)\s*(\d+[A-Za-z]?)/i);
    if (bldM) {
      const num = bldM[1];
      const raw = `ul. ${street} ${num}`;
      const parsed = parseAddress(raw);
      if (parsed && !(parsed.street_norm.includes('sienkiewicza') && parsed.building === '1')) {
        return { raw, parsed, street };
      }
    }
    return { raw: `ul. ${street}`, parsed: null, street };
  }
  return null;
}

export function extractParcelAndObreb(text) {
  if (!text) return { dzialka_nr: null, obreb: null };
  let dzialka_nr = null;
  const mParcels =
    text.match(/dzia[łl][kc][a-ząćęłńóśźż]*\s+(?:nr|numer|o\s+numerze)?\s*(\d+(?:\/\d+)?(?:\s*(?:i|,)\s*\d+(?:\/\d+)?)*)/i) ||
    text.match(/dz\.\s*(?:nr\s*)?(\d+(?:\/\d+)?(?:\s*(?:i|,)\s*\d+(?:\/\d+)?)*)/i);
  if (mParcels) dzialka_nr = mParcels[1].replace(/\s+i\s+/g, ', ').trim();
  let obreb = null;
  const mObreb = text.match(/obr[ęe]b\s*(\d+)/i) || text.match(/ob\.\s*(\d+)/i);
  if (mObreb) obreb = mObreb[1];
  return { dzialka_nr, obreb };
}

export function extractArea(text) {
  if (!text) return null;
  const mUnit = text.match(
    /(?:o\s+)?pow(?:\.|\b|ierzchni[a-ząćęłńóśźż]*)\s+u[żz]ytkow[a-ząćęłńóśźż]*\s*(?:budynku(?:\s+mieszkalnego)?)?\s*:?\s*(\d+[\d\s.,]*)\s*(?:m2|m²|m\b)/i,
  );
  if (mUnit) return parseAreaNum(mUnit[1]);
  const mGen = text.match(/(?:o\s+)?pow(?:\.|\b|ierzchni[a-ząćęłńóśźż]*)\s*:?\s*(\d+[\d\s.,]*)\s*(?:m2|m²|m\b)/i);
  if (mGen) return parseAreaNum(mGen[1]);
  return null;
}

export function extractStartingPrice(text) {
  if (!text) return null;
  const m = text.match(
    /(?:Cena\s+(?:wywo[łl]awcza|nieruchomo[śs]ci)|Cen[ęa]\s+wywo[łl]awcz[ąa]|wywo[łl]awcza)[^:\n\d]*[:=]?\s*(?:wynosi[łl]a\s*)?([\d][\d\s.,]*)\s*z[łl]/i,
  );
  if (m) return parsePLN(m[1]);
  return null;
}

export function extractAchievedPrice(text) {
  if (!text) return null;
  const m = text.match(
    /(?:Cena\s+(?:wylicytowana|sprzeda[żz]y(?:\s+uzyskana\s+w\s+wyniku\s+przetargu)?|nabycia)|Cen[ęa]\s+wylicytowan[ąa]|najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta)[^:\n\d]*[:=]?\s*(?:to\s+)?([\d][\d\s.,]*)\s*z[łl]/i,
  );
  if (m) return parsePLN(m[1]);
  return null;
}

export function isNegativeOutcome(text) {
  return /wynik(?:iem)?\s+negatywn|brak\s+zainteresowania|brak\s+ofert|nie\s+(?:wy[łl]oniono|zg[łl]osi[łl]|wp[łl]acono)|nikt\s+nie\s+przyst[ąa]pi[łl]/i.test(
    text || '',
  );
}

export function isPositiveOutcome(text) {
  return /wynik(?:iem)?\s+pozytywn|zosta[łl]\s+wy[łl]oniony\s+nabywca|jako\s+nabywc[ęe]\s+wy[łl]oniono|nabywc[ąa]\s+.*zosta[łl]/i.test(
    text || '',
  );
}

// ------------------------------------------------------------------ entry points

/**
 * Parse an announcement document/page into active listing(s) or land record(s).
 * @param {string} fullText
 * @param {string} detailUrl
 * @returns {Array<object>}
 */
export function parseAnnouncement(fullText, detailUrl) {
  if (!fullText) return [];
  const kind = resolveKind(fullText);
  const round = roundFromText(fullText);
  const auction_date = auctionDateFromText(fullText);
  const starting_price_pln = extractStartingPrice(fullText);
  const addrInfo = extractAddress(fullText);

  if (kind === 'grunt') {
    // Check if table contains multiple parcels (e.g. Norwida 516/4 and 516/5)
    const rowRegex = /(?:^|\n)\s*(\d+)\s*\t\s*(\d+(?:\/\d+)?)\s*[\t\n]\s*Obr[ęe]b\s*[\t\n]?\s*(\d+)\s*[\t\n]\s*(\d+)\s*m2/gi;
    const tableMatches = [...fullText.matchAll(rowRegex)];
    if (tableMatches.length > 1) {
      const records = [];
      for (let i = 0; i < tableMatches.length; i++) {
        const start = tableMatches[i].index;
        const end = i + 1 < tableMatches.length ? tableMatches[i + 1].index : fullText.indexOf('Przetarg zostanie', start);
        const chunk = fullText.slice(start, end !== -1 ? end : start + 1500);
        const chunkPriceM = chunk.match(/([\d][\d\s.,]*)\s*z[łl]\s*brutto/i);
        const rowPrice = chunkPriceM ? parsePLN(chunkPriceM[1]) : starting_price_pln;
        records.push({
          kind: 'grunt',
          dzialka_nr: tableMatches[i][2],
          obreb: tableMatches[i][3],
          area_m2: parseAreaNum(tableMatches[i][4]),
          street: addrInfo?.street || null,
          address_raw: addrInfo?.raw || null,
          starting_price_pln: rowPrice,
          auction_date,
          round,
          detail_url: detailUrl,
          source_url: detailUrl,
        });
      }
      return records;
    }

    const { dzialka_nr, obreb } = extractParcelAndObreb(fullText);
    if (!dzialka_nr) return [];
    return [
      {
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2: extractArea(fullText),
        street: addrInfo?.street || null,
        address_raw: addrInfo?.raw || null,
        starting_price_pln,
        auction_date,
        round,
        detail_url: detailUrl,
        source_url: detailUrl,
      },
    ];
  }

  if (!addrInfo || !addrInfo.parsed) return [];
  return [
    {
      kind,
      address_raw: addrInfo.raw,
      address: addrInfo.parsed,
      area_m2: extractArea(fullText),
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl,
      source_url: detailUrl,
    },
  ];
}

/**
 * Parse a wykaz document into pre-announcement record.
 * @param {string} fullText
 * @param {string} detailUrl
 * @returns {object|null}
 */
export function parseWykaz(fullText, detailUrl) {
  if (!fullText) return null;
  const kind = resolveKind(fullText);
  // Land is not in-scope for address-keyed wykaz[]
  if (kind === 'grunt') return null;

  const addrInfo = extractAddress(fullText);
  if (!addrInfo || !addrInfo.parsed) return null;

  return {
    kind,
    address_raw: addrInfo.raw,
    address: addrInfo.parsed,
    area_m2: extractArea(fullText),
    starting_price_pln: extractStartingPrice(fullText),
    round: roundFromText(fullText),
    auction_date: auctionDateFromText(fullText),
    detail_url: detailUrl,
    source_url: detailUrl,
  };
}

/**
 * Parse one CONCLUDED result notice into a 0- or 1-element array (adapter contract).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const kind = resolveKind(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const starting_price_pln = extractStartingPrice(text);
  const achieved = extractAchievedPrice(text);
  const negative = isNegativeOutcome(text);
  const positive = isPositiveOutcome(text);
  const sold = (achieved != null || positive) && !negative;
  const notes = [];

  if (kind === 'grunt') {
    const { dzialka_nr, obreb } = extractParcelAndObreb(text);
    if (!dzialka_nr) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2: extractArea(text),
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes,
      },
    ];
  }

  const addrInfo = extractAddress(text);
  if (!addrInfo || !addrInfo.parsed) return [];
  const address = addrInfo.parsed;
  const address_raw = addrInfo.raw;
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [
    {
      auction_date,
      source_url: sourceUrl,
      source_pdf: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: extractArea(text),
      notes,
    },
  ];
}
