import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  sect: '§', ndash: '–', mdash: '—', hellip: '…',
  oacute: 'ó', Oacute: 'Ó', aacute: 'á', eacute: 'é',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', deg: '°', middot: '·',
};

export function decodeEntities(s) {
  return (s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : m);
}

export function cleanText(s) {
  return decodeEntities(String(s || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


export function extractArticleBody(html) {
  if (!html) return null;
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let best = null;
  while ((m = re.exec(html)) !== null) {
    let json;
    try { json = JSON.parse(m[1]); } catch { continue; }
    const nodes = Array.isArray(json) ? json : [json];
    for (const node of nodes) {
      if (node && typeof node === 'object' && node.articleBody) best = node;
    }
  }
  if (!best) return null;
  return {
    headline: cleanText(best.headline || ''),
    body: cleanText(best.articleBody || ''),
    datePublished: isoFromPublished(best.datePublished),
  };
}

function isoFromPublished(s) {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}


export function isFlatSlug(slug) {
  const s = (slug || '').toLowerCase();
  if (/niemieszkaln/.test(s)) return false;
  return /lokal/.test(s) && /mieszkaln/.test(s);
}

export function isResultSlug(slug) {
  return /informacja-o-wyniku|wyniku-przetargu/i.test(slug || '');
}

export function isAnnouncementSlug(slug) {
  const s = (slug || '').toLowerCase();
  if (isResultSlug(s)) return false;
  if (/wykaz|dzierzaw|najem|odwolani|uniewazni/.test(s)) return false;
  return /przetarg-ustny/.test(s);
}

export function parseListingLinks(html, origin) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"/]+)?\/aktualnosci-2\/33-nieruchomosci\/([^"]+?\.html))"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const slug = m[2];
    if (/^strona-/i.test(slug)) continue;
    const url = href.startsWith('http') ? href : `${origin}${href}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, slug });
  }
  return out;
}


export function parsePLN(s) {
  if (!s) return null;
  let c = String(s).replace(/[\s ]/g, '');
  c = c.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(c)) c = c.replace(/[.,]/g, '');
  const n = Number(c);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function normMonth(name) {
  return (name || '').toLowerCase()
    .replace(/ó/g, 'o').replace(/ł/g, 'l').replace(/ń/g, 'n')
    .replace(/ź|ż/g, 'z').replace(/ś/g, 's').replace(/ć/g, 'c')
    .replace(/ą/g, 'a').replace(/ę/g, 'e');
}

function iso(day, monthName, year) {
  const mon = PL_MONTHS[normMonth(monthName)];
  if (!mon) return null;
  return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const m = /\b(VIII|VII|VI|IX|IV|V|III|II|I|X)\s+(?:przetarg|rokowan)/i.exec(text || '');
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  if (/\bprzetarg|\brokowan/i.test(text || '')) return 1;
  return 1;
}


function announcementAddressRaw(body, headline) {
  const cell = /\b\d+\.\s+((?:ul\.|pl\.|al\.|os\.)\s*[\s\S]*?)\s+\d{2}-\d{3}\s+Drawsko/i.exec(body);
  if (cell) return cell[1].replace(/\s+/g, ' ').trim();
  const h = /lokal\w*\s+mieszkaln\w*\s+(.+?)\s*$/i.exec(headline || '');
  return h ? h[1].trim() : null;
}

export function parseAnnouncement(body, headline, url) {
  if (!body) return null;
  const raw = announcementAddressRaw(body, headline);
  if (!raw) return null;
  const address = parseAddress(raw);
  if (!address) return null;

  const areaM =
    /pow\w*\.?\s+lokalu\s+([\d.,]+)\s*m\s?[²³⁴]?2?/i.exec(body) ||
    /powierzchni\w*\s+lokalu\s*[–—-]?\s*([\d.,]+)\s*m/i.exec(body) ||
    /powierzchnia\s+wynosi\s+([\d.,]+)\s*m/i.exec(body);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const priceM = /(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(body);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  let auction_date = null;
  const dM = /Przetarg\s+odb[ęe]dzie\s+si[ęe][\s\S]*?dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(body);
  if (dM) auction_date = iso(dM[1], dM[2], dM[3]);

  const kind = classifyKind(body);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round: roundFromText(headline) ?? 1,
    detail_url: url,
  };
}



function resultAddressRaw(text) {
  const m = /adres\s+nieruchomo[śs]ci\s*[–—:-]\s*(.+?)\s*(?:,|\s[–—-]\s|$)/i.exec(text);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  if (!/wynik/i.test(t)) return [];
  if (!/lokal\w*\s+mieszkaln/i.test(t)) return [];
  if (/niemieszkaln/i.test(t)) return [];

  const raw = resultAddressRaw(t);
  if (!raw) return [];
  const address = parseAddress(raw);
  if (!address) return [];

  let auction_date = fallbackDate ?? null;
  const dM = /\bW\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (dM) {
    const d = iso(dM[1], dM[2], dM[3]);
    if (d) auction_date = d;
  }

  const cwM = /Cena\s+wywo[łl]awcza\s*:?\s*(\d{1,3}(?:[.\s ]\d{3})*,\d{2})/i.exec(t);
  const starting_price_pln = cwM ? parsePLN(cwM[1]) : null;

  const coM = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:?\s*(\d{1,3}(?:[.\s ]\d{3})*,\d{2})/i.exec(t);
  const final_price_pln = coM ? parsePLN(coM[1]) : null;

  const nbM = /Nabywc[ąa]\s+nieruchomo[śs]ci\s+zosta[łl]\w*\s*:?\s*([^\d][^.]*?)(?:\s+Informacj|\.\s|$)/i.exec(t);
  const buyer = nbM ? nbM[1].replace(/\s+/g, ' ').trim() : null;

  const unsold = /wynik(?:iem)?\s+negatywn|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywn|nie\s+wy[łl]oniono\s+nabywcy|nikt\s+nie\s+przyst[ąa]pi[łl]/i.test(t);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'archived');

  const shM = /udzia[łl]\w*\s+(\d+\/\d+)/i.exec(t);

  const kind = classifyKind(t);
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: raw,
    address,
    area_m2: null,
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    buyer,
    auction_date,
    round: roundFromText(t),
    source_pdf: sourceUrl || null,
    notes: [],
    ...(shM ? { share: shM[1] } : {}),
  }];
}
