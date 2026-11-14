import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&[a-z]{2,8};/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBodyText(html) {
  const m = html.match(
    /Tre[śs][ćc]\s+informacji\s*([\s\S]+?)(?:Pliki\s+powi[aą]zane|METRYKA\s+INFORMACJI|Informacja\s+powi[aą]zana)/i,
  );
  return m ? stripTags(m[1]) : stripTags(html);
}

const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9,
  wrzesnia: 9,
  października: 10, październik: 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function isoDate(d, m, y) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s)
    .replace(/\s/g, '')
    .replace(/\.(\d{3})/g, '$1')
    .replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (!s) return null;
  const m = /(\d[\d ]*[.,]\d+|\d+)/.exec(String(s).replace(/\s/g, ''));
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function parseListingPage(html) {
  const items = [];
  const seen = new Set();

  const itemRe =
    /href='index\.php\?n=i&amp;id=(\d+)&amp;akcja=info&amp;menu=346[^']*'\s+data-bs-toggle='tooltip'[^>]*title='([^']+)'[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = m[3].trim();

    const pos = m.index;
    const window = html.slice(pos, pos + 1500);
    const dateM = /Data\s+wprowadzenia\s+do\s+BIP:[\s\S]*?(\d{2})\.(\d{2})\.(\d{4})/.exec(window);
    const published_date = dateM
      ? `${dateM[3]}-${dateM[2]}-${dateM[1]}`
      : null;

    items.push({ id, title, published_date });
  }
  return items;
}


export function roundFromText(text) {
  if (!text) return null;
  const t = text;
  const romanM = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg\s+ustny/i.exec(t);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  if (/\bpierwsz\w+\s+przetarg/i.test(t)) return 1;
  if (/\bdrugI\w*\s+przetarg|\bdrug\w+\s+przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/i.test(t)) return 3;
  if (/\bczwart\w+\s+przetarg/i.test(t)) return 4;
  if (/\bpi[ąa]t\w+\s+przetarg/i.test(t)) return 5;
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const numM = /(?:odbędzie\s+się\s+dnia|w\s+dniu)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return isoDate(numM[1], numM[2], numM[3]);
  const wordM = /(?:odbędzie\s+się\s+dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[wordM[2].toLowerCase()];
    if (mo) return isoDate(wordM[1], mo, wordM[3]);
  }
  return null;
}

export function startingPriceFromText(text) {
  if (!text) return null;
  const m = /CENA\s+WYWO[ŁL]AWCZA\s*[–\-:]\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  if (m) return parsePLN(m[1]);
  const fb = /cena\s+wywo[łl]awcza[^0-9]{0,30}([\d\s.,]+)\s*z[łl]/i.exec(text);
  return fb ? parsePLN(fb[1]) : null;
}

export function unitAreaFromText(text) {
  if (!text) return null;
  const labM =
    /(?:łącznej\s+)?(?:powierzchni\s+u[żz]ytkowej|powierzchni)\s+([\d,.\s]+)\s*m[²2]/i.exec(text);
  if (labM) {
    const v = parseArea(labM[1]);
    if (v && v > 0) return v;
  }
  const M2_RE = /([\d][\d ,.]*)[\s]*m[²2²](?!\d)/gi;
  const cands = [];
  let m2m;
  M2_RE.lastIndex = 0;
  while ((m2m = M2_RE.exec(text)) !== null) {
    const v = parseArea(m2m[1]);
    if (!v || v <= 0) continue;
    const before = text.slice(Math.max(0, m2m.index - 50), m2m.index);
    if (/piwnic|kom[óo]rk|przynale[żz]|grunt|dzia[łl]k/i.test(before)) continue;
    cands.push(v);
  }
  if (cands.length) return cands[0];
  return null;
}

export function addressFromText(text, titleHint) {
  if (!text) return null;

  const atM =
    /przy\s+(ul|al|pl|os)\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.''\s-]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s*(?:\/\s*(\d+[A-Za-z]?))?\s+(?:o\s+powierzchni|wraz\s+z|zlokalizowanego|składa|lokal)/i.exec(
      text,
    );
  if (atM) {
    const street = `${atM[1]}. ${atM[2].trim()}`;
    const bldg = atM[3];
    const apt = atM[4] || null;

    let aptFinal = apt;
    if (!aptFinal) {
      const lokaM = /lokal\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
      if (lokaM) aptFinal = lokaM[1];
    }
    if (!aptFinal && titleHint) {
      const titleAddr = /(\d+)\/(\d+)/i.exec(titleHint);
      if (titleAddr && titleAddr[1] === bldg) aptFinal = titleAddr[2];
    }

    const raw = aptFinal ? `${street} ${bldg}/${aptFinal}` : `${street} ${bldg}`;
    return { address_raw: raw, address: parseAddress(raw) };
  }

  if (titleHint) {
    const m = /(ul|al|pl|os)\.\s+[A-ZŻŹĆŁŚĄĘÓŃa-ząćęłńóśźż\s.'-]+\s+\d+(?:\/\d+)?/i.exec(titleHint);
    if (m) {
      const raw = m[0].trim();
      return { address_raw: raw, address: parseAddress(raw) };
    }
  }
  return null;
}


export function isResultNotice(text) {
  return /INFORMACJA\s+BURMISTRZA.*WYNIKU\s+PRZETARGU|WYNIKU\s+PRZETARGU/i.test(text || '');
}

export function resultDateFromText(text) {
  if (!text) return null;
  const wordM = /Data\s+przetargu\s*:\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[wordM[2].toLowerCase()];
    if (mo) return isoDate(wordM[1], mo, wordM[3]);
  }
  const numM = /Data\s+przetargu\s*:\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return isoDate(numM[1], numM[2], numM[3]);
  return null;
}

export function resultRoundFromText(text) {
  if (!text) return null;
  const m = /Rodzaj\s+przetargu\s*:\s*([\s\S]{0,80})/i.exec(text);
  const scope = m ? m[1] : text;
  return roundFromText(scope);
}

export function resultAddressFromText(text) {
  if (!text) return null;
  const m =
    /przy\s+(ul|al|pl|os)\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.''\s-]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s*(?:\/\s*(\d+[A-Za-z]?))?\s+(?:o\s+powierzchni|wraz\s+z|,|\.|składa)/i.exec(
      text,
    );
  if (!m) return null;
  const street = `${m[1]}. ${m[2].trim()}`;
  const bldg = m[3];
  let apt = m[4] || null;
  if (!apt) {
    const lokaM = /lokal\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
    if (lokaM) apt = lokaM[1];
  }
  const raw = apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

export function achievedPriceFromText(text) {
  if (!text) return null;
  const m = /Cena\s+nabycia\s*[–\-:]\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}


export function parseDetailPage(html, id, titleHint) {
  const text = extractBodyText(html);
  if (!text) return null;

  if (isResultNotice(text)) {
    return {
      kind: 'result',
      text,
      auction_date: resultDateFromText(text),
    };
  }

  if (!/lokal\s+mieszkaln/i.test(text)) {
    return null;
  }

  const addrResult = addressFromText(text, titleHint);
  if (!addrResult) {
    console.error(`  klodzko: could not parse address from detail id=${id}`);
    return null;
  }

  const listing = {
    kind: classifyKind(text),
    address_raw: addrResult.address_raw,
    address: addrResult.address,
    area_m2: unitAreaFromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text),
    detail_url: `https://um.bip.klodzko.pl/index.php?n=i&id=${id}&akcja=info&menu=346`,
  };

  return { kind: 'announcement', text, listing };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];

  const notes = [];
  const auctionDate = resultDateFromText(text) || fallbackDate || null;
  const round = resultRoundFromText(text);

  const addrResult = resultAddressFromText(text);
  if (!addrResult) {
    console.error(`  klodzko parseResultDoc: could not extract address from ${sourceUrl}`);
    return [];
  }
  if (addrResult.address?.warning) notes.push(addrResult.address.warning);

  const area_m2 = unitAreaFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const final_price_pln = achievedPriceFromText(text);

  const negative =
    /negatywn|nie\s+dosz[łl]o\s+do\s+zawarcia|nie\s+wy[łl]oniono/i.test(text) ||
    (!final_price_pln && !/Nabywc/i.test(text));

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  return [
    {
      auction_date: auctionDate,
      source_pdf: sourceUrl,
      kind: classifyKind(text),
      address_raw: addrResult.address_raw,
      address: addrResult.address,
      round,
      area_m2,
      starting_price_pln,
      final_price_pln: negative ? null : final_price_pln,
      outcome: negative ? 'unsold' : 'sold',
      unsold_reason: negative ? 'unknown' : null,
      notes,
    },
  ];
}
