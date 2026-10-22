// Zakopane parsers — bip.zakopane.eu (ESC S.A. / VelaBIP).
// Notices render as:
//   <article id="cnt" class="document">
//     <header><h2>TITLE</h2></header>
//     <article class="lead">LEAD</article>
//     <article class="content">BODY</article>
//     <h3>Pliki do pobrania</h3>
//     <ul class="attach_show_list">...</ul>
//
// Operative notice texts live in born-digital attachments (PDF or Word DOC)
// or occasionally inline HTML.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const ORIGIN = 'https://bip.zakopane.eu';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN_ROUNDS = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5,
  vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
};

export function htmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#187;/gi, '»')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------- title routing

export function isResult(title, lead = '') {
  const t = `${title || ''} ${lead || ''}`.toLowerCase();
  return /(?:informacj[\węi]*\s+o\s+wynik|og[łl]oszenie\s+wyniku|wynik(?:i)?\s+(?:\w+\s+)?przetarg)/i.test(t);
}

export function isLease(title, lead = '') {
  const t = `${title || ''} ${lead || ''}`.toLowerCase();
  return /(?:dzier[żz]aw|\bnajem\b|najmu|wynajem|u[żz]yczeni|oddanie\s+w\s+u[żz]ytkowanie)/i.test(t);
}

export function isMovable(title, lead = '') {
  const t = `${title || ''} ${lead || ''}`.toLowerCase();
  return /\b(?:mienia\s+ruchomego|samoch[oó]d\w*|pojazd\w*|z[łl]om\w*|drewn[ao]|kosiark\w*|sprz[ęe]t\w*|opa[łl]\w*)\b/i.test(
    t,
  );
}

export function isAnnouncement(title, lead = '') {
  const combo = `${title || ''} ${lead || ''}`.toLowerCase();
  if (isResult(title, lead)) return false;
  if (isLease(title, lead)) return false;
  if (isMovable(title, lead)) return false;
  if (/bezprzetarg/.test(combo)) return false;
  if (/\bwykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni/.test(combo)) return false;
  return /przetarg/.test(combo) && /(?:sprzeda[żz]|zbyci[ae])/.test(combo);
}

// ------------------------------------------------------------- detail extraction

const H2_RE = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i;
const LEAD_RE = /<article\s+class="lead">([\s\S]*?)<\/article>/i;
const CONTENT_RE = /<article\s+class="content">([\s\S]*?)<\/article>/i;
const ATTACH_ARIA_RE =
  /<a\s+aria-label="Pobierz\s+za[łl][ąa]cznik:\s*([^"]*?)\s+w\s+formacie\s+(\w+)[^"]*"\s+href="([^"]+)"/gi;
const ATTACH_FALLBACK_RE = /<a\s+[^>]*href="(\/zalacznik\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi;

export function extractDetail(html) {
  if (!html || !html.includes('id="cnt"')) return null;
  const titleM = H2_RE.exec(html);
  const title = titleM ? htmlToText(titleM[1]) : '';

  const leadM = LEAD_RE.exec(html);
  const lead = leadM ? htmlToText(leadM[1]) : '';

  const contentM = CONTENT_RE.exec(html);
  const contentHtml = contentM ? contentM[1].trim() : '';
  const contentText = contentM ? htmlToText(contentM[1]) : '';

  const attachments = [];
  const seenUrls = new Set();
  let m;
  ATTACH_ARIA_RE.lastIndex = 0;
  while ((m = ATTACH_ARIA_RE.exec(html)) !== null) {
    const rawUrl = m[3].trim();
    const url = rawUrl.startsWith('http') ? rawUrl : `${ORIGIN}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      attachments.push({
        name: htmlToText(m[1]),
        format: (m[2] || '').toLowerCase(),
        url,
      });
    }
  }

  if (!attachments.length) {
    ATTACH_FALLBACK_RE.lastIndex = 0;
    while ((m = ATTACH_FALLBACK_RE.exec(html)) !== null) {
      const rawUrl = m[1].trim();
      const url = rawUrl.startsWith('http') ? rawUrl : `${ORIGIN}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        const name = htmlToText(m[2]);
        const formatMatch = /\.([a-zA-Z0-9]+)$/.exec(name);
        attachments.push({
          name,
          format: formatMatch ? formatMatch[1].toLowerCase() : '',
          url,
        });
      }
    }
  }

  return { title, lead, contentText, contentHtml, attachments };
}

/** Pick the operative notice attachment (PDF or Word DOC), skipping regulations and maps. */
export function pickAttachment(attachments) {
  if (!attachments || !attachments.length) return null;

  const isDocFormat = (a) =>
    /\.pdf$/i.test(a.name) ||
    a.format === 'pdf' ||
    /docx?$/i.test(a.name) ||
    /docx?$/i.test(a.format);

  // 1. Operative announcement or result document
  const operative = attachments.find(
    (a) =>
      /og[łl]oszenie|informacja|wynik|przetarg/i.test(a.name) &&
      !/regulamin|mapa|rzut|geodezyjn|za[łl][ąa]cznik\s*nr\s*[2-9]/i.test(a.name) &&
      isDocFormat(a),
  );
  if (operative) return operative;

  // 2. Any PDF or DOC that is not a map or regulations
  const candidate = attachments.find(
    (a) => !/regulamin|mapa|rzut|geodezyjn/i.test(a.name) && isDocFormat(a),
  );
  if (candidate) return candidate;

  // 3. Fallback to first PDF or DOC
  return attachments.find(isDocFormat) || null;
}

// ---------------------------------------------------------------- field parsers

export function cleanStreet(s) {
  return (s || '')
    .replace(/^ul(?:icy)?\.?\s+/i, '')
    .replace(/[.,\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract property address from announcement or result notice text.
 * Prevents false-matching the Urząd Miasta address (ul. Kościuszki 13).
 */
export function extractPropertyAddress(text) {
  const full = text || '';

  // Flat unit number (e.g. "lokal mieszkalny nr 24", "lokalowa, mieszkalna nr 5")
  const flatM = /(?:lokal\w*|nieruchomo[sś][cć]\s+lokalow\w*)[\s,]+(?:mieszkaln\w*[\s,]+)?nr\.?\s*(\d+[A-Za-z]?(?:\/\d+)?)/i.exec(
    full,
  );
  const flatId = flatM ? flatM[1] : null;

  // Street with building number: "przy [ul.] Street 5 w Zakopanem"
  const bldgRe =
    /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+(?:ul(?:\.|\b|\s+icy)?\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ0-9.\- ]+?)\s+(\d+[A-Za-z]?(?:\s*[\-–]\s*\d+[A-Za-z]?)?)(?:\s+w\s+Zakopanem|\s*,|\s+oraz|\s+wraz|\s*\n|$)/gi;
  let m;
  let street = null;
  let bldg = null;
  while ((m = bldgRe.exec(full)) !== null) {
    const s = cleanStreet(m[1]);
    const nr = m[2].trim();
    if (/Ko[sś]ciuszki/i.test(s) && nr === '13') continue; // Skip Town Hall
    street = s;
    bldg = nr;
    break;
  }

  if (street && bldg) {
    const raw = flatId ? `ul. ${street} ${bldg}/${flatId}` : `ul. ${street} ${bldg}`;
    const address = parseAddress(raw);
    return { address_raw: raw, address, flatId };
  }

  // Undeveloped land street (no building number): "w rejonie ul. Droga do Olczy w Zakopanem"
  const landRe =
    /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:\.|\b|\s+icy)?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ0-9.\- ]+?)(?=\s+w\s+Zakopanem|\s*,|\s+stanowi|\s+oznaczon|\s*\n|$)/gi;
  while ((m = landRe.exec(full)) !== null) {
    const s = cleanStreet(m[1]);
    if (/Ko[sś]ciuszki/i.test(s)) continue;
    const raw = `ul. ${s}`;
    const address = parseAddress(raw);
    return { address_raw: raw, address, flatId: null };
  }

  return null;
}

export function extractArea(text, kind) {
  const t = text || '';

  if (kind === 'grunt') {
    // Look for hectares first (e.g. "o łącznej powierzchni 0,0337 ha" -> 337 m2)
    const haM = /o\s+(?:[łl][ąa]czn\w+\s+)?(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
    if (haM) {
      const v = Number(haM[1].replace(',', '.'));
      if (v > 0) return Math.round(v * 10000);
    }
    const m2M = /o\s+(?:[łl][ąa]czn\w+\s+)?(?:pow|powierzchni)\w*\.?\s+([\d\s]+(?:,\d+)?)\s*m\s*[²2]/i.exec(t);
    if (m2M) {
      const v = Number(m2M[1].replace(/\s+/g, '').replace(',', '.'));
      if (v > 0) return Math.round(v);
    }
    return null;
  }

  if (kind === 'zabudowana') {
    const bldgM =
      /budyn\w*\s+mieszkaln\w*[\s\S]{0,60}?(?:pow|powierzchni)\w*\.?\s*(?:zabudowy|u[żz]ytkow\w*)?\s*([\d\s]+(?:,\d+)?)\s*m\s*[²2]/i.exec(
        t,
      );
    if (bldgM) {
      const v = Number(bldgM[1].replace(/\s+/g, '').replace(',', '.'));
      if (v > 0) return v;
    }
  }

  // Flat (or fallback building)
  const unitM =
    /(?:lokal\w*|nieruchomo[sś][cć]\s+lokalow\w*)[\s\S]{0,60}?(?:o\s+)?(?:pow|powierzchni)\w*\.?\s*(?:u[żz]ytkow\w*)?\s*([\d\s]+(?:,\d+)?)\s*m\s*[²2]/i.exec(
      t,
    );
  if (unitM) {
    const v = Number(unitM[1].replace(/\s+/g, '').replace(',', '.'));
    if (v > 0) return v;
  }

  // Generic m2
  const genM = /(?:pow|powierzchni)\w*\.?\s*(?:u[żz]ytkow\w*|zabudowy)?\s*([\d\s]+(?:,\d+)?)\s*m\s*[²2]/i.exec(t);
  if (genM) {
    const v = Number(genM[1].replace(/\s+/g, '').replace(',', '.'));
    if (v > 0 && v < 10000) return v;
  }

  return null;
}

export function parsePlnAmount(str) {
  if (!str) return null;
  const cleaned = str.replace(/\s+/g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? Math.round(v) : null;
}

export function extractStartingPrice(text) {
  const m = /Cena\s+wywo[łl]awcza(?:\s+nieruchomo[sś]ci)?\s*:\s*([\d\s]+(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePlnAmount(m[1]) : null;
}

export function extractFinalPrice(text) {
  const m =
    /(?:Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu|Cena\s+osi[ąa]gni[ęe]ta)\s*:\s*([\d\s]+(?:,\d{2})?)\s*z[łl]/i.exec(
      text || '',
    );
  return m ? parsePlnAmount(m[1]) : null;
}

export function extractAuctionDate(text) {
  const t = text || '';
  // Numbered point format: "Data i miejsce przetargu: 19.05.2026 r." / "Termin i miejsce przetargu: 02.09.2026 r."
  const ptM = /(?:Data|Termin)\s+(?:i\s+miejsce\s+)?przetargu:\s*(\d{1,2})[.\s](\d{1,2}|[a-ząćęłńóśźż]+)[.\s](\d{4})/i.exec(
    t,
  );
  if (ptM) {
    const day = String(ptM[1]).padStart(2, '0');
    let month = ptM[2];
    if (isNaN(month)) {
      const num = PL_MONTHS[month.toLowerCase()];
      if (num) month = String(num);
    }
    month = String(month).padStart(2, '0');
    const year = ptM[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback pattern: DD.MM.YYYY
  const m = /\b(\d{1,2})\.(\d{2})\.(\d{4})\b/.exec(t);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export function extractRound(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const m = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\s+(?:ustn|pisemn)/i.exec(src);
  if (m) {
    return ROMAN_ROUNDS[m[1].toLowerCase()] || null;
  }
  return /przetarg/i.test(src) ? 1 : null;
}

export function extractOutcomeAndBuyer(text, finalPrice) {
  const t = text || '';
  const isNegative =
    /wynik(?:em)?\s+negatywn|brak\s+nabywcy|nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium|brak\s+os[óo]b\s+dopuszczonych/i.test(
      t,
    );
  const buyerM = /Nabywca(?:\s+nieruchomo[sś]ci)?\s*:\s*([^\n\r]+)/i.exec(t);
  let buyer = buyerM ? buyerM[1].replace(/\s+/g, ' ').trim() : null;
  if (buyer && /brak\s+nabywcy/i.test(buyer)) buyer = null;

  if (finalPrice != null && !isNegative) {
    return { outcome: 'sold', buyer: buyer || null, unsold_reason: null };
  }
  if (isNegative || finalPrice == null) {
    return { outcome: 'unsold', buyer: null, unsold_reason: 'wynik negatywny' };
  }
  return { outcome: 'unknown', buyer: null, unsold_reason: 'unknown' };
}

function plausibleParcel(v) {
  return /\//.test(v) || v.length >= 2;
}

export function extractParcelAndObreb(text) {
  const full = text || '';
  const cut = full.search(/słu[żz]ebno[śs]/i);
  const t = cut >= 0 ? full.slice(0, cut) : full;

  const obrebM = /obr[ęe]b\w*\s+(\d+|[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/i.exec(t);
  const obreb = obrebM ? obrebM[1].trim() : null;

  const DZIALKA_STEM = 'dzia[łl]k[\\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*\\s*(?:(?:ewidencyjn\\w*\\s*)?nr\\.?:?\\s*)?';
  const seen = new Set();
  const nums = [];
  const RE = new RegExp(`${DZIALKA_STEM}(\\d+(?:\\/\\d+)?)`, 'gi');
  const CONT_RE = /^(?:\s*(?:,|i|oraz)\s*\d+(?:\/\d+)?)+/;
  let m;
  while ((m = RE.exec(t)) !== null) {
    if (!plausibleParcel(m[1])) continue;
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      nums.push(m[1]);
    }
    const contM = CONT_RE.exec(t.slice(RE.lastIndex));
    if (!contM) continue;
    for (const tok of contM[0].split(/\s*(?:,|i|oraz)\s*/)) {
      const v = tok.trim();
      if (v && plausibleParcel(v) && !seen.has(v)) {
        seen.add(v);
        nums.push(v);
      }
    }
  }

  return { dzialka_nr: nums.length ? nums.join(', ') : null, obreb };
}

export function resolveKindZakopane(title, text) {
  const combo = `${title || ''} ${text || ''}`;
  if (/nieruchomo[sś][cć]\s+lokalow|lokal\w*\s+mieszkaln/i.test(combo)) return 'mieszkalny';
  if (/zabudowan\w*\s+nieruchomo[sś][cć]|budyn(?:ek|ku)\s+mieszkaln|dom\w*\s+jednorodzinn/i.test(combo))
    return 'zabudowana';
  if (/nieruchomo[sś][cć]\s+gruntow|dzia[łl]k\w*\s+ewidencyjn|niezabudowan/i.test(combo)) return 'grunt';
  if (/lokal\w*\s+u[żz]ytkow/i.test(combo)) return 'uzytkowy';
  if (/gara[żz]/i.test(combo)) return 'garaz';
  return classifyKind(combo);
}

// ------------------------------------------------------------- announcement parser

export function parseAnnouncement(title, bodyText, url) {
  const text = htmlToText(bodyText);
  if (isLease(title, text) || isMovable(title, text)) return null;

  const kind = resolveKindZakopane(title, text);
  if (kind === 'uzytkowy' || kind === 'garaz') return null;

  const round = extractRound(title, text);
  const auction_date = extractAuctionDate(text);
  const starting_price_pln = extractStartingPrice(text);
  const addr = extractPropertyAddress(text);

  if (kind === 'grunt') {
    const { dzialka_nr, obreb } = extractParcelAndObreb(text);
    const area_m2 = extractArea(text, 'grunt');
    const address_raw = addr ? addr.address_raw : null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw,
      address: addr ? addr.address : null,
      starting_price_pln,
      auction_date,
      round,
      detail_url: url,
      source_url: url,
    };
  }

  if (!addr) return null;
  const area_m2 = extractArea(text, kind);

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
  };
}

// ----------------------------------------------------------------- result parser

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!isResult('', t)) return [];
  if (isLease('', t) || isMovable('', t)) return [];

  const kind = resolveKindZakopane('', t);
  if (kind === 'uzytkowy' || kind === 'garaz') return [];

  const auction_date = extractAuctionDate(t) || fallbackDate || null;
  const round = extractRound('', t);
  const starting_price_pln = extractStartingPrice(t);
  const final_price_pln = extractFinalPrice(t);
  const { outcome, buyer, unsold_reason } = extractOutcomeAndBuyer(t, final_price_pln);
  const addr = extractPropertyAddress(t);
  const notes = [];

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'unsold' && !unsold_reason) notes.push('parse: no explicit negative outcome');

  if (kind === 'grunt') {
    const { dzialka_nr, obreb } = extractParcelAndObreb(t);
    const area_m2 = extractArea(t, 'grunt');
    const address_raw = addr ? addr.address_raw : null;
    return [
      {
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2,
        address_raw,
        address: addr ? addr.address : null,
        starting_price_pln,
        final_price_pln,
        outcome,
        unsold_reason,
        buyer,
        auction_date,
        round,
        source_pdf: sourceUrl,
        notes,
      },
    ];
  }

  if (!addr) return [];
  const area_m2 = extractArea(t, kind);

  return [
    {
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addr.address_raw,
      address: addr.address,
      area_m2,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      buyer,
      auction_date,
      round,
      source_pdf: sourceUrl,
      notes,
    },
  ];
}
