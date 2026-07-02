// Stargard parsers.
// Groundtruthed against live fixtures (2026-06-27):
//   - TBS: Aleja Gryfa 15/1, III przetarg, 52.83 m2, 221 000 zl, 13.08.2026
//   - BIP Wynik095/2026: Koscuszki 35/5, II rokowania, 14.38 m2

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia:1,luty:2,lutego:2,marca:3,kwietnia:4,maja:5,
  czerwca:6,lipca:7,sierpnia:8,wrzesnia:9,pazdziernika:10,
  listopada:11,grudnia:12,styczen:1,marzec:3,kwiecien:4,maj:5,
  czerwiec:6,lipiec:7,sierpien:8,wrzesien:9,pazdziernik:10,
  listopad:11,grudzien:12,
};

function isoDate(day, monthName, year) {
  const key = monthName.toLowerCase()
    .replace(/[óo]/g,'o').replace(/[ń]/g,'n').replace(/[ź]/g,'z')
    .replace(/[ś]/g,'s').replace(/[ć]/g,'c').replace(/[ł]/g,'l')
    .replace(/[ą]/g,'a').replace(/[ę]/g,'e').replace(/[ż]/g,'z');
  const mon = PL_MONTHS[key];
  if (!mon) return null;
  return `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g,'').replace(',','.');
  const m = /^(\d+(?:\.\d{3})*)(?:\.\d+)?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/\./g,''));
  const fallback = Number(cleaned.replace(/,.*/, '').replace(/\./g,''));
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

export function parseArea(s) {
  if (!s) return null;
  const n = Number(s.replace(/\s/g,'').replace(',','.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  const m = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+(?:przetarg|rokowania)/i.exec(t);
  if (m) {
    const ROMAN = {I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
    return ROMAN[m[1].toUpperCase()] ?? null;
  }
  if (/\bpierwsz\w+\s+(?:przetarg|rokowania)/i.test(t)) return 1;
  if (/\bdrug\w+\s+(?:przetarg|rokowania)/i.test(t)) return 2;
  if (/\btrzeci\w*\s+(?:przetarg|rokowania)/i.test(t)) return 3;
  if (/\bczwart\w+\s+(?:przetarg|rokowania)/i.test(t)) return 4;
  if (/\bpi[ąa]t\w+\s+(?:przetarg|rokowania)/i.test(t)) return 5;
  if (/\bprzetarg\b|\brokowania\b/i.test(t)) return 1;
  return null;
}

export function htmlToText(html) {
  if (!html) return '';
  let s = html
    .replace(/<br\s*\/?>/gi,' ').replace(/<\/p>/gi,' ')
    .replace(/<\/div>/gi,' ').replace(/<\/li>/gi,' ');
  s = s.replace(/<[^>]+>/g,' ');
  s = s
    .replace(/&#x([0-9a-fA-F]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(parseInt(d,10)))
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
  return s.replace(/\s+/g,' ').trim();
}

export function isSaleAnnouncement(titleOrSlug) {
  const t = (titleOrSlug || '').toLowerCase();
  if (/najem|dzier[zz]aw|wynajem|bezprzetarg/.test(t)) return false;
  if (/\bwykaz\b|informacj\w+\s+o\s+wynik|odwo[ll]ani|uniewa[zz]ni/.test(t)) return false;
  return /sprzeda/.test(t) && (/przetarg|rokowania/.test(t));
}

export function isFlatAnnouncement(text) {
  const t = (text || '').toLowerCase();
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const lab = /DATA\s+PRZETARGU\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (lab) return isoDate(lab[1],lab[2],lab[3]);
  const inline = /odb[ęe]d[ąz]\w*\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (inline) return isoDate(inline[1],inline[2],inline[3]);
  const num = /DATA\s+PRZETARGU[\s\S]{0,40}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2,'0')}-${num[1].padStart(2,'0')}`;
  return null;
}

export function areaFromText(text) {
  if (!text) return null;
  const lab = /POWIERZCHNIA\s+([\d.,]+)\s*m[²2]/i.exec(text);
  if (lab) return parseArea(lab[1]);
  const ut = /powierzchni\w*\s+u.+ytkow\w*\s+([\d.,]+)\s*m[²2]/i.exec(text);
  if (ut) return parseArea(ut[1]);
  return null;
}

export function priceFromText(text) {
  if (!text) return null;
  const lab = /WARTO.{1,3}\s+NIERUCHOMO.{1,3}\s+([\d\s.,]+)\s*z./i.exec(text);
  if (lab) return parsePLN(lab[1]);
  const cena = /cena\s+wywo.+awcza[\s\S]{0,80}?([\d\s.,]+)\s*z./i.exec(text);
  if (cena) return parsePLN(cena[1]);
  return null;
}

export function addressFromTitle(title, url) {
  let t = (title || '').replace(/\s*[-–—|].*?TBS.*$/i,'').trim();
  t = t.replace(/^\s*Lokal\s+mieszkaln\w*\s+/i,'').trim();
  t = t.replace(/\s*[-–—]\s*(i{1,3}|iv|vi{0,3}|ix|x)\s+(przetarg|rokowania)[\s\S]*/i,'').trim();
  t = t.replace(/\s*[-–—]\s*(pierwszy|drugi|trzeci|czwart|pi[ąa]t)\w*[\s\S]*/i,'').trim();
  t = t.replace(/\s*(i|ii|iii|iv|v)\s+przetarg[\s\S]*/i,'').trim();
  if (!t) return null;
  const address = parseAddress(t);
  if (address) return { address_raw:t, address };
  if (url) {
    const slug = url.replace(/\/$/,'').split('/').pop() || '';
    const addrSlug = slug
      .replace(/^lokal-mieszkaln\w*-/,'')
      .replace(/-(i{1,3}|iv|vi{0,3}|ix|x)-(?:przetarg|rokowania).*$/,'')
      .replace(/-na-sprzedaz.*$/,'');
    const raw = addrSlug.replace(/-/g,' ');
    const addr2 = parseAddress(raw);
    if (addr2) return { address_raw:raw, address:addr2 };
  }
  return null;
}

export function parseTbsDetail(html, url) {
  const text = htmlToText(html);
  if (!isFlatAnnouncement(text)) return null;
  const titleM = /<title[^>]*>([^<]+)<\/title>/i.exec(html) ||
    /property="og:title"[^>]*content="([^"]+)"/i.exec(html) ||
    /content="([^"]+)"[^>]*property="og:title"/i.exec(html);
  const title = titleM ? htmlToText(titleM[1]) : '';
  const addrResult = addressFromTitle(title, url);
  if (!addrResult) return null;
  const kind = classifyKind(text);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addrResult.address_raw,
    address: addrResult.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(title + ' ' + text.slice(0,400)),
    detail_url: url,
  };
}

export function parseBipResultList(html, baseUrl) {
  if (!html) return [];
  const BIP_BASE = baseUrl || 'https://bip.stargard.eu';
  let h = html
    .replace(/&#x([0-9a-fA-F]+);/gi,(_,c)=>String.fromCodePoint(parseInt(c,16)))
    .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(parseInt(d,10)))
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&');
  const out = [];
  const entryRe = /<span[^>]*class="[^"]*text-uppercase[^"]*"[^>]*>\s*(Wynik\d+\/\d+)\s*<\/span>([\s\S]*?)(?=<span[^>]*class="[^"]*text-uppercase|$)/gi;
  let m;
  while ((m = entryRe.exec(h)) !== null) {
    const symbol = m[1].trim();
    const chunk = m[2];
    const dateM = /(\d{4}-\d{2}-\d{2})/.exec(chunk);
    const date = dateM ? dateM[1] : null;
    const linkM = /href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(chunk);
    if (!linkM) continue;
    const hrefRaw = linkM[1];
    const summaryText = htmlToText(linkM[2]);
    const href = hrefRaw.startsWith('http')
      ? hrefRaw
      : `${BIP_BASE}/${hrefRaw.replace(/^\//,'')}`;
    const kind = classifyKind(summaryText);
    if (kind !== 'mieszkalny' && kind !== 'uzytkowy' && kind !== 'garaz') continue;
    out.push({ symbol, date, href, text:summaryText, kind });
  }
  return out;
}

const TBS_OFFICE_RE = /andrzeja\s+struga/i;

export function addressFromBipText(text) {
  if (!text) return null;
  const m1 = /lokalu\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)[\s\S]{0,400}?przy\s+ul\.\s+([A-Z][A-Za-zÀ-ɏ.\- ]+?)\s+(\d+[A-Za-z]?)\s+w\s+Stargardzie/i.exec(text);
  if (m1) {
    const raw = `ul. ${m1[2].trim()} ${m1[3]}/${m1[1]}`;
    const address = parseAddress(raw);
    if (address) return { address_raw:raw, address };
  }
  const priRe = /przy\s+(?:ul\.|al\.|pl\.|os\.)?\s*([A-Z][A-Za-zÀ-ɏ.\- ]+?)\s+(\d+[A-Za-z]?)\s+w\s+Stargardzie/gi;
  let m2;
  while ((m2 = priRe.exec(text)) !== null) {
    if (TBS_OFFICE_RE.test(m2[1])) continue;
    const before = text.slice(0, m2.index);
    const aptM = /\bnr\s+(\d+[A-Za-z]?)\b/.exec(before);
    const raw = aptM
      ? `ul. ${m2[1].trim()} ${m2[2]}/${aptM[1]}`
      : `ul. ${m2[1].trim()} ${m2[2]}`;
    const address = parseAddress(raw);
    if (address) return { address_raw:raw, address };
  }
  return null;
}

export function parseResultDoc(text, date, url) {
  if (!text) return [];
  const kind = classifyKind(text);
  if (kind !== 'mieszkalny' && kind !== 'uzytkowy' && kind !== 'garaz') return [];
  const addrResult = addressFromBipText(text);
  if (!addrResult) return [];
  const areaM = /pow(?:ierzchni\w*)?\.\s+u.+ytkow\w*\s+([\d.,]+)\s*m[²2]/i.exec(text);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;
  let auction_date = null;
  const dateM = /(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-zÀ-ɏ]+)\s+(\d{4})/i.exec(text);
  if (dateM) auction_date = isoDate(dateM[1],dateM[2],dateM[3]);
  // Record shape follows the adapter contract consumed by refresh.js /
  // build-properties.js (notes, outcome, final_price_pln, source_pdf).
  // Stargard's §12 notices publish only the summary paragraph — no achieved
  // price and no negative-result sentence — so the concluded auction is
  // recorded as 'archived' (same convention build-properties uses for
  // past listings whose outcome the city doesn't publish).
  return [{
    kind,
    address_raw: addrResult.address_raw,
    address: addrResult.address,
    area_m2,
    starting_price_pln: null,
    final_price_pln: null,
    outcome: 'archived',
    unsold_reason: null,
    buyer: null,
    auction_date: auction_date || date || null,
    round: roundFromText(text),
    source_pdf: url || null,
    notes: [],
  }];
}
