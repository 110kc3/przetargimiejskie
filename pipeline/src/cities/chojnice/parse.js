// Chojnice parsers.
// Handles both active announcements and concluded auction results from miastochojnice.pl.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function isResultTitle(title) {
  return /wynik\w*|o\s+wyniku|rozstrzyg/i.test(title || '');
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem|bezprzetarg|ogródk|ogrodk/i.test(t)) return false;
  if (/^\s*wykaz|odwo[łl]ani|uniewa[żz]ni/i.test(t)) return false;
  return /przetarg/i.test(t) && (/sprzeda/i.test(t) || /zbyci/i.test(t));
}

export function parseDatePL(str) {
  if (!str) return null;
  const m1 = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(str);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${String(mon).padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  const m2 = /(\d{1,2})[.-](\d{1,2})[.-](\d{4})/.exec(str);
  if (m2) {
    return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

export function auctionDateFromText(text, title = '') {
  const t = text || '';
  let m = /odbędzie się w dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(t);
  if (m) { const d = parseDatePL(m[1]); if (d) return d; }
  m = /odbył się w dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(t);
  if (m) { const d = parseDatePL(m[1]); if (d) return d; }
  m = /rozstrzygniecie nastąpiło\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(t);
  if (m) { const d = parseDatePL(m[1]); if (d) return d; }
  return parseDatePL(title);
}

export function roundFromText(title, text) {
  const combined = `${title || ''} ${text || ''}`;
  const mOrd = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|piąt\w*|szóst\w*|siódm\w*|ósm\w*|dziewiąt\w*|dziesiąt\w*)\s+przetarg/i.exec(combined);
  if (mOrd) {
    const w = mOrd[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzec')) return 3;
    if (w.startsWith('czwart')) return 4;
    if (w.startsWith('piąt') || w.startsWith('piat')) return 5;
    if (w.startsWith('szóst') || w.startsWith('szost')) return 6;
    if (w.startsWith('siódm') || w.startsWith('siodm')) return 7;
    if (w.startsWith('ósm') || w.startsWith('osm')) return 8;
    if (w.startsWith('dziewiąt') || w.startsWith('dziewiat')) return 9;
    if (w.startsWith('dziesiąt') || w.startsWith('dziesiat')) return 10;
  }
  const mRom = /\b(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s+przetarg/i.exec(combined);
  if (mRom) {
    const rom = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return rom[mRom[1].toUpperCase()] || null;
  }
  if (/kolejny\s+przetarg/i.test(combined)) {
    const mPrev = /Poprzedni\w*\s+przetarg\w*\s+odby[łl]\w*\s+się\s+w\s+dniu\s+([\s\S]*?)(?:i\s+zako[ńn]czy[łl]y|\n|Zdjęto|Wywieszono|$)/i.exec(text || '');
    if (mPrev) {
      const dates = [...mPrev[1].matchAll(/\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4}/gi)];
      if (dates.length > 0) return dates.length + 1;
    }
  }
  return null;
}

export function wadiumDeadlineToISO(text) {
  const m = /Wadium\s+(?:na\s+przetarg\s+)?należy\s+wpłacić\s+do\s+dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(text || '');
  return m ? parseDatePL(m[1]) : null;
}

export function extractPriceAndWadium(chunk) {
  const re = /(?<!\/)\b(\d{1,3}(?:[ \xa0]\d{3})*|\d+)(?:,\d{2})?\s+(\d{1,3}(?:[ \xa0]\d{3})*|\d+)(?:,\d{2})?\b/g;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    const p1 = parseFloat(m[1].replace(/[ \xa0]/g, '').replace(',', '.'));
    const p2 = parseFloat(m[2].replace(/[ \xa0]/g, '').replace(',', '.'));
    if (p1 >= 10000 && p2 >= 500 && p2 < p1) {
      return { starting_price_pln: Math.round(p1), wadium_pln: Math.round(p2) };
    }
  }
  const mSingle = /(?:cena\s+wywoławcza|wywoławcza)[\s\S]{0,40}?(\d{1,3}(?:[ \xa0]\d{3})*(?:,\d{2})?)\s*(?:zł|brutto)/i.exec(chunk);
  if (mSingle) {
    const val = parseFloat(mSingle[1].replace(/[ \xa0]/g, '').replace(',', '.'));
    if (!isNaN(val) && val >= 10000) return { starting_price_pln: Math.round(val), wadium_pln: null };
  }
  return { starting_price_pln: null, wadium_pln: null };
}

export function extractOutcomeAndFinalPrice(chunk) {
  let final_price_pln = null;
  let outcome = 'unsold';
  let unsold_reason = null;

  const mAch = /(?:za\s+)?(?:cen[ęe]|kwot[ęe]|cenie|kwocie)\s*[:\-–]?\s*([\d\s\xa0]+(?:,\d{2})?)\s*(?:zł|brutto)/i.exec(chunk);
  if (mAch) {
    const val = parseFloat(mAch[1].replace(/[ \xa0]/g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      final_price_pln = Math.round(val);
      outcome = 'sold';
    }
  }

  if (outcome === 'unsold') {
    if (/po\s+terminie/i.test(chunk)) {
      unsold_reason = 'wadia po terminie';
    } else if (/(?:nie\s+wp[łl]yn[ęe][łl]o|brak|nie\s+odnotowano)[\s\S]{0,200}?wadium/i.test(chunk)) {
      unsold_reason = 'brak wadium';
    } else if (/brak\s+ofert/i.test(chunk)) {
      unsold_reason = 'brak ofert';
    } else if (/wynikiem\s+negatywnym/i.test(chunk)) {
      unsold_reason = 'wynik negatywny';
    } else {
      unsold_reason = 'brak ofert';
    }
  }

  return { outcome, final_price_pln, unsold_reason };
}

export function unitAreaFromText(text) {
  const re = /(?:o\s+)?(?:powierzchni|pow\w*\.?)\s*(?:użytkowej\s+)?(\d+(?:[.,]\d+)?)\s*m\s*[²2]/gi;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const val = parseFloat(m[1].replace(',', '.'));
    const precede = (text || '').slice(Math.max(0, m.index - 60), m.index);
    if (/dzia[łl]k/i.test(precede)) continue; // plot area
    if (/piwnic/i.test(precede)) continue; // cellar area
    if (val > 0) return val;
  }
  return null;
}

export function plotAreaFromText(text) {
  const ha = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+(?:łącznej\s+)?pow\w*\.?\s+([\d\s]+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(text || '');
  if (m2) {
    const v = parseFloat(m2[1].replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(v) && v > 0) return v;
  }
  return null;
}

export function parcelFromText(text) {
  const m = /dzia[łl]k\w*\s+(?:o\s+)?(?:nr\s*(?:ewid\.?\s*)?)?(\d+(?:\/\d+)?(?:\s*(?:,|i)\s*(?:nr\s*)?\d+(?:\/\d+)?)*)/i.exec(text || '');
  if (!m) return null;
  const nums = m[1].split(/\s*(?:,|i)\s*/).map((x) => x.replace(/^nr\s*/i, '').trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/.exec(text || '');
  return m ? m[1].trim() : null;
}

export function landStreetFromText(text, title) {
  const combined = `${text || ''} ${title || ''}`;
  const mUl = /(?:Chojnice,\s*)?ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\-/ ]+?)(?=[.,\n]|działk|obręb)/i.exec(combined);
  if (mUl) {
    const s = mUl[1].trim();
    if (!/stary\s+rynek/i.test(s)) return `ul. ${s}`;
  }
  if (/osiedl\w*\s+bajkow\w*/i.test(combined)) return 'Osiedle Bajkowe';
  if (/metalowiec/i.test(combined)) return 'ROD Metalowiec';
  return null;
}

export function extractAddress(text, title = '') {
  const t = text || '';
  const m = /Chojnice,\s*(?:ul\.\s*)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\s-]+?)\s+(\d+\s*[A-Za-z]?)\.?\s*(?:(?:Spółdzielcze|lokal\s+mieszkalny)[^\n]*?nr\s*(\d+[A-Za-z]?)|lokal\s+użytkowy\s+([A-Za-z0-9]+))?/i.exec(t);
  if (m) {
    const street = m[1].trim();
    const bld = m[2].replace(/\s+/g, '').trim();
    const apt = m[3] ? m[3].trim() : (m[4] && /^\d+$/.test(m[4]) ? m[4].trim() : null);
    if (!/stary\s+rynek/i.test(street)) {
      const raw = apt ? `${street} ${bld}/${apt}` : `${street} ${bld}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
  }
  const mTitle = /(?:przy\s+)?(?:ul(?:icy)?\.?\s+|Pl\.\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń\s-]+?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?\b/i.exec(title || '');
  if (mTitle) {
    const street = mTitle[1].trim();
    const bld = mTitle[2];
    const apt = mTitle[3] || null;
    if (!/stary\s+rynek/i.test(street)) {
      const raw = apt ? `${street} ${bld}/${apt}` : `${street} ${bld}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
  }
  return null;
}

export function splitOffers(text) {
  const lines = (text || '').split('\n');
  const chunks = [];
  let current = [];
  const offerRe = /^\s*(\d{1,2}\/\d{2})\b/;
  let inTable = false;
  for (const line of lines) {
    if (offerRe.test(line)) {
      if (current.length > 0) {
        chunks.push(current.join('\n'));
        current = [];
      }
      inTable = true;
    }
    if (inTable) {
      current.push(line);
    }
  }
  if (current.length > 0) chunks.push(current.join('\n'));
  return chunks.length > 0 ? chunks : [text || ''];
}

export function parseAnnouncement(title, text, url, docUrl) {
  const offers = splitOffers(text);
  const auction_date = auctionDateFromText(text, title);
  const round = roundFromText(title, text);
  const wadium_deadline = wadiumDeadlineToISO(text);

  const results = [];
  for (const chunk of offers) {
    const kind = classifyKind(`${chunk} ${title}`);
    const { starting_price_pln, wadium_pln } = extractPriceAndWadium(chunk);

    if (kind === 'grunt') {
      const dzialka_nr = parcelFromText(chunk) || parcelFromText(title);
      const obreb = obrebFromText(chunk) || obrebFromText(title);
      const area_m2 = plotAreaFromText(chunk);
      const address_raw = landStreetFromText(chunk, title);
      const address = address_raw ? parseAddress(address_raw) : null;
      if (!dzialka_nr && !address_raw) continue;
      results.push({
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2,
        address_raw,
        address,
        starting_price_pln,
        auction_date,
        round,
        wadium_deadline,
        wadium_pln,
        detail_url: url,
        source_url: docUrl || url,
      });
      continue;
    }

    const addr = extractAddress(chunk, title);
    if (!addr) continue;
    const area_m2 = unitAreaFromText(chunk);
    results.push({
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addr.address_raw,
      address: addr.address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      wadium_deadline,
      wadium_pln,
      detail_url: url,
      source_url: docUrl || url,
    });
  }
  return results;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!/wynik|o\s+wyniku|rozstrzyg/i.test(text || '')) return [];

  const offers = splitOffers(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText('', text);

  const results = [];
  for (const chunk of offers) {
    const kind = classifyKind(chunk);
    const { starting_price_pln } = extractPriceAndWadium(chunk);
    const { outcome, final_price_pln, unsold_reason } = extractOutcomeAndFinalPrice(chunk);
    const notes = [];

    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (outcome === 'sold' && final_price_pln == null) notes.push('parse: sold but missing achieved price');

    if (kind === 'grunt') {
      const dzialka_nr = parcelFromText(chunk);
      const obreb = obrebFromText(chunk);
      const area_m2 = plotAreaFromText(chunk);
      const address_raw = landStreetFromText(chunk);
      if (!dzialka_nr && !address_raw) continue;
      results.push({
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln,
        outcome,
        unsold_reason,
        notes,
      });
      continue;
    }

    const addr = extractAddress(chunk, text);
    if (!addr) continue;
    const area_m2 = unitAreaFromText(chunk);
    results.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addr.address_raw,
      address: addr.address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2,
      notes,
    });
  }
  return results;
}
