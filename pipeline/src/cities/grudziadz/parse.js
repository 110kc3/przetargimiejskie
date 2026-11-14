import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9, wrzesnia: 9,
  października: 10, październik: 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

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

const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5 };
export function roundFromText(text) {
  if (!text) return null;
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(text);
  if (!m) return null;
  const key = m[1].toLowerCase().replace(/ą/g, 'a');
  return ORDINALS[key] ?? null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]d[a-ząęćłńóśźż]*\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  if (anchor) {
    const wide = /organizowan\w*\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
    if (wide) {
      const w2 = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(wide[1]);
      if (w2) {
        const mon2 = PL_MONTHS[w2[2].toLowerCase()];
        if (mon2) return iso(w2[3], mon2, w2[1]);
      }
    }
  }
  const opener = /organizowan\w*\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
  if (opener) {
    const w = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(opener[1]);
    if (w) {
      const mon = PL_MONTHS[w[2].toLowerCase()];
      if (mon) return iso(w[3], mon, w[1]);
    }
  }
  return null;
}

export function areaFromText(text) {
  if (!text) return null;
  const labelled = /(?:powierzchni\w*|pow\.?)\s+u(?:[żz]ytkow\w*|[żz]\.?)\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (labelled) return parseArea(labelled[1]);
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  M2.lastIndex = 0;
  while ((m = M2.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null) continue;
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|obr[ęe]b/i.test(before)) continue;
    if (/piwnic|kom[óo]rk|przynale[żz]/i.test(before)) continue;
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function priceFromText(text) {
  if (!text) return null;
  const m = /(?<![\d.,])((?:[1-9]\d{0,2}(?:(?:\.|[ \t\u00a0]+)\d{3})+|[1-9]\d*))(?:[,.]\d{2}|[,\.]\s*-)?\s*z[łl]\.?(?:otych)?(?![a-zążźćęłńóśż])/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

const LOT_RE =
  /ul\.\s*([^\n]+?)\s*\n+\s*lokal\w*\s+mieszkaln\w*\s*nr\.?\s*(\d+[a-zA-Z]?)/gi;

export function parseAnnouncement(text) {
  if (!text) return [];
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);

  const starts = [];
  let m;
  LOT_RE.lastIndex = 0;
  while ((m = LOT_RE.exec(text)) !== null) {
    starts.push({ index: m.index, end: LOT_RE.lastIndex, street: m[1].trim(), apt: m[2] });
  }
  if (starts.length === 0) return [];

  const uwagiIdx = text.search(/\bUWAGI!/i);
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    const blockStart = starts[i].end;
    const blockEnd =
      i + 1 < starts.length ? starts[i + 1].index : uwagiIdx >= 0 ? uwagiIdx : text.length;
    const block = text.slice(blockStart, blockEnd);

    const address_raw = `${starts[i].street}/${starts[i].apt}`;
    const address = parseAddress(address_raw);
    if (!address) continue;

    out.push({
      address_raw,
      address,
      area_m2: areaFromText(block),
      starting_price_pln: priceFromText(block),
      round,
      auction_date,
    });
  }
  return out;
}


function streetFromResultText(text) {
  const m = /przy\s+ul\.\s*([^\n,.]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

function aptFromResultText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s*nr\.?\s*(\d+[a-zA-Z]?)/i.exec(text);
  return m ? m[1] : null;
}

function resultDateFromText(text) {
  const m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

function outcomeFromText(text) {
  const t = text || '';
  const noWadium = /nie\s+wp[łl]acon[oy]\s+wadium|nie\s+wp[łl]yn[ęe][łl]o\s+wadium|nie\s+wniesiono\s+wadium/i.test(t);
  const noBidder =
    /[żz]adna\s+osoba\s+nie\s+przyst[ąa]pi[łl]|nikt\s+nie\s+przyst[ąa]pi[łl]|nie\s+przyst[ąa]pi[łl]\w*\s+do\s+przetargu/i.test(t);
  const negative = /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|wynikiem\s+negatywnym/i.test(t);
  if (noWadium) return { outcome: 'unsold', unsold_reason: 'no_wadium' };
  if (noBidder || negative) return { outcome: 'unsold', unsold_reason: 'no_participants' };
  return null;
}

function achievedPriceFromText(text) {
  const m = /cena[^.\n]{0,40}?osi[ąa]gni[ęe]t\w*[^0-9]{0,30}([\d][\d\s.,]*)\s*z[łl]\.?(?:otych)?/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  if (!/INFORMACJA/i.test(text) || !/PRZEPROWADZ\w*\s+.{0,20}?PRZETARG|PRZEPROWADZON\w*\s+PRZETARG/i.test(text)) {
    return [];
  }

  const streetRaw = streetFromResultText(text);
  const apt = aptFromResultText(text);
  if (!streetRaw || !apt) return [];

  const address_raw = `${streetRaw}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return [];

  const auction_date = resultDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const kind = classifyKind(text.slice(0, 1200));

  const negative = outcomeFromText(text);
  const final_price_pln = negative ? null : achievedPriceFromText(text);
  const outcome = negative ? 'unsold' : final_price_pln != null ? 'sold' : 'unsold';
  const unsold_reason = negative ? negative.unsold_reason : outcome === 'unsold' ? 'unknown' : null;

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (outcome === 'unsold' && unsold_reason === 'unknown') {
    notes.push('parse: could not determine unsold reason');
  }

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln: null,
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2: null,
      notes,
    },
  ];
}
