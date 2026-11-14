
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function stripTags(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // <sup>2</sup> in "56 m<sup>2</sup>" → keep the digit joined: "56 m2"
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s  ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, styczen: 1, lutego: 2, luty: 2, marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8, wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10, listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
  sty: 1, lut: 2, mar: 3, kwi: 4, cze: 6, lip: 7, sie: 8, wrz: 9, paz: 10, lis: 11, gru: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parsePolishDate(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
  if (num) {
    const d = +num[1], m = +num[2];
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return iso(num[3], m, d);
  }
  const word = /(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[toAscii(word[2])];
    if (mon) return iso(word[3], mon, +word[1]);
  }
  return null;
}

const ORDINALS = {
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, piaty: 5, szosty: 6,
  siodmy: 7, osmy: 8, dziewiaty: 9, dziesiaty: 10,
};
export function roundFromTitle(title) {
  const t = toAscii(title || '');
  const m = /\b(pierwszy|drugi|trzeci|czwarty|piaty|szosty|siodmy|osmy|dziewiaty|dziesiaty)\s+przetarg/.exec(t);
  return m ? ORDINALS[m[1]] : null;
}


export function extractTitle(html) {
  if (!html) return null;
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

export function extractBodyText(html) {
  if (!html) return '';
  const h1 = /<\/h1>/i.exec(html);
  const start = h1 ? h1.index + h1[0].length : 0;
  const meta = /<h2[^>]*>\s*Metadane/i.exec(html);
  const end = meta ? meta.index : html.length;
  return stripTags(html.slice(start, end));
}

export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /Data\s+publikacji\s*:(?:<[^>]*>|&nbsp;|\s)*(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,})\s+(\d{4})/i.exec(html);
  if (m) {
    const mon = PL_MONTHS[toAscii(m[2])];
    if (mon) return iso(m[3], mon, +m[1]);
  }
  return null;
}


const FIELD_STOP =
  'Cena wywoławcza|cena za metr|Wadium|Powierzchnia|Obręb|Numer działki|Numer ewidencyjny|Księga wieczysta|Tryb przetargu|Opis nieruchomości|Położenie|Linki|Załączniki|$';

function afterLabel(body, label) {
  const m = new RegExp(label + '\\s*:?\\s*([\\s\\S]*?)\\s*(?:' + FIELD_STOP + ')', 'i').exec(body || '');
  return m ? m[1].trim() : null;
}

export function extractCena(body) {
  const m = /Cena\s+wywoławcza\s*([\d\s .,]+?)\s*(?:PLN|z[łl])/i.exec(body || '');
  return m ? parsePLN(m[1]) : null;
}

export function extractWadium(body) {
  const m = /Wadium\s*([\d\s .,]+?)\s*(?:PLN|z[łl])/i.exec(body || '');
  return m ? parsePLN(m[1]) : null;
}

export function extractArea(body) {
  const m = /Powierzchnia\s*:?\s*(\d+(?:[.,]\d+)?)\s*m/i.exec(body || '');
  return m ? parseArea(m[1]) : null;
}

export function extractObreb(body) {
  const v = afterLabel(body, 'Obręb');
  return v || null;
}

export function extractDzialka(body) {
  const v = afterLabel(body, 'Numer działki');
  if (!v) return null;
  const m = /\d+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*\d+(?:\/\d+)?)*/.exec(v);
  return m ? m[0].replace(/\s*(?:,|i|oraz)\s*/g, ', ').trim() : null;
}

export function extractKW(body) {
  const m = /Księga\s+wieczysta\s*:?\s*([A-Z]{2}\d[A-Z]\/\d{6,}\/\d)/i.exec(body || '');
  return m ? m[1].toUpperCase() : null;
}


const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const UL_WITH_NUM = new RegExp(
  `\\b(?:ul|al|pl|os)\\.\\s+([${PL_UP}0-9][\\p{L}0-9.\\- ]*?)\\s+(\\d+[A-Za-z]?)\\b`, 'u');
const UL_ONLY = new RegExp(
  `\\b(?:ul|al|pl|os)\\.\\s+([${PL_UP}][\\p{L}.\\- ]*?)(?=[,.]|\\s+oznaczon|\\s+dzia[łl]|$)`, 'u');
const APT_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;
const BUD_RE = /budynku?\s+(?:mieszkaln\w+\s+)?nr\s+(\d+[A-Za-z]?)/i;

export function extractAddress(title, obreb) {
  const t = title || '';
  const apt = (APT_RE.exec(t) || [])[1] || null;
  let street = null, building = null;

  const withNum = UL_WITH_NUM.exec(t);
  if (withNum) {
    street = withNum[1].trim().replace(/\s+/g, ' ');
    building = withNum[2];
  } else {
    const bud = BUD_RE.exec(t);
    if (bud) building = bud[1];
    const only = UL_ONLY.exec(t);
    street = only ? only[1].trim().replace(/\s+/g, ' ') : (obreb || null);
  }
  if (!street || !building) return { address: null, address_raw: null };
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address: parseAddress(raw), address_raw: raw };
}


export function extractAuctionDate(text) {
  if (!text) return null;
  const m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,220}?(?:w\s+dniu\s+)?(\d{1,2}\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,}\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(text);
  return m ? parsePolishDate(m[1]) : null;
}


const HOST = 'https://bip.gminaznin.pl';

export function ogloszeniePdfUrl(html) {
  if (!html) return null;
  const links = [...html.matchAll(/href="((?:https?:\/\/bip\.gminaznin\.pl)?\/pliki\/umznin\/zalaczniki\/\d+\/[^"]*\.pdf)"/gi)]
    .map((m) => m[1])
    .filter((u) => !/plan-urzedu/i.test(u));
  const pick = links.find((u) => /og[łl]oszen/i.test(u)) || links[0] || null;
  if (!pick) return null;
  return pick.startsWith('http') ? pick : HOST + pick;
}


export function isCancelled(title) {
  const t = toAscii(title || '').trim();
  return /odwolan\w*\s+przetarg|uniewazni|^ogloszenie\s+o\s+odwolan/.test(t);
}

export function isRental(text) {
  return /dzierzaw|najem|najmu|wynajm|oddani\w+\s+w\s+(?:najem|dzierzaw)/.test(toAscii(text || ''));
}

export function parseNotice(html, url) {
  const title = extractTitle(html) || '';
  const body = extractBodyText(html);
  const kindLabelM = /Sprzedaż\s+([A-ZŻŚ][^.]*?)\s+Przeznaczenie/i.exec(body);
  const kindLabel = kindLabelM ? kindLabelM[1].trim() : '';
  const kind = classifyKind(`${kindLabel}. ${title}`);

  const obreb = extractObreb(body);
  const dzialka_nr = extractDzialka(body);
  const { address, address_raw } = kind === 'grunt'
    ? { address: null, address_raw: null }
    : extractAddress(title, obreb);

  return {
    kind,
    title,
    round: roundFromTitle(title),
    cancelled: isCancelled(title),
    area_m2: extractArea(body),
    starting_price_pln: extractCena(body),
    wadium_pln: extractWadium(body),
    obreb,
    dzialka_nr,
    kw: extractKW(body),
    address,
    address_raw,
    published_date: extractPublishedDate(html),
    detail_url: url,
    pdf_url: ogloszeniePdfUrl(html),
  };
}


const RESULT_NOTE =
  'no achieved-price document is published on bip.gminaznin.pl (see parse.js header) — ' +
  'outcome inferred from a later round of the same subject being published, not a source-stated result';

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const html = String(text);
  if (!/<[a-z]/i.test(html)) return [];
  const n = parseNotice(html, sourceUrl);
  if (n.cancelled) return [];
  if (!n.address && !n.dzialka_nr) return [];

  return [{
    auction_date: fallbackDate || n.published_date || null,
    source_url: sourceUrl,
    source_pdf: sourceUrl,
    kind: n.kind,
    address_raw: n.address_raw,
    address: n.address,
    dzialka_nr: n.dzialka_nr,
    obreb: n.obreb,
    round: n.round,
    starting_price_pln: n.starting_price_pln,
    final_price_pln: null,
    outcome: 'unsold',
    outcome_evidence: 'inferred',
    unsold_reason: 'superseded_by_next_round',
    area_m2: n.area_m2,
    notes: [RESULT_NOTE],
  }];
}
