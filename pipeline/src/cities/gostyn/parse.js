// Gostyń parsers (Logonet eUrząd v2.9.0 — see config.js).
//
// A single BIP article ("Oferty miasta", board 280) bundles ONE .docx carrying
// the sale ANNOUNCEMENT terms and (for concluded auctions) one SCANNED .pdf
// carrying the "INFORMACJA o wyniku" RESULT notice. BOTH documents are
// MULTI-PROPERTY: Gostyń groups several działki (or flats) that share one
// auction session into a single file, repeating the same "BURMISTRZ GOSTYNIA
// ogłasza … przetarg …" (announcement) / "Na podstawie § 12 Rozporządzenia …
// przeprowadzony został … przetarg …" (result) block once per property. So
// parseAnnouncement / parseResultDoc SPLIT into blocks and return an ARRAY of
// records — one per property.
//
// Groundtruthed against the only property article live on the BIP at build time
// (artykul/280/12356 — a 2022 land auction of działki 107/2, 107/5, 107/7 in
// Sikorzyn): the born-digital announcement .docx (attachments/download/19049)
// and the OCR of the scanned result .pdf (attachments/download/19214). No flat
// (lokal mieszkalny) auction was live anywhere on the BIP; the flat/building
// address helpers below are ported from the Tarnowskie Góry analog (same CMS
// family) and classify on the BODY, but are not yet groundtruthed on live
// Gostyń flat text — see tests/parse-gostyn.test.js.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "52.000,00" / "55 000,00 zł" / "136.000,-" -> integer PLN. Handles dotted
// thousands (Gostyń's usual form), spaced/NBSP thousands, a ",00"/",-"/".-"
// grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr)
    .replace(/[\s. ]/g, '')
    .replace(/,\d{2}$/, '')
    .replace(/,?[.-]$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "0,1010" / "0.1010" / "37,70" -> number. Used for ha (plots) and m² (flats).
export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
const WORD = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6 };

/** Round from "II przetarg ustny …" (Roman — Gostyń's form) or a word ordinal
 *  ("drugi przetarg" — kept for robustness). Returns null when unstated. */
export function roundFromText(text) {
  const t = text || '';
  let m = /\b(VI|IV|III|II|V|I)\s+przetarg\w*\s+ustn/i.exec(t);
  if (m) { const r = ROMAN[m[1].toLowerCase()]; if (r) return r; }
  m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(t);
  if (m) return WORD[m[1].toLowerCase()] ?? null;
  return null;
}

function isoDate(m) {
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Announcement auction date: "Przetarg odbędzie się w dniu 22 czerwca 2022
 *  roku …" -> ISO or null. */
export function announcementDateFromText(text) {
  return isoDate(
    /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || ''),
  );
}

/** Result auction date: "… Burmistrz Gostynia informuje, że w dniu 22 czerwca
 *  2022 roku … przeprowadzony został …". Anchored on "informuje … w dniu" so the
 *  rozporządzenie citation ("z dnia 14 września 2004 roku") is never taken.
 *  -> ISO or null. */
export function resultDateFromText(text) {
  return isoDate(
    /informuje[^.]{0,60}?\bw\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || ''),
  );
}

// Starting price. Announcement label is nominative "Cena wywoławcza: 52.000,00
// zł netto"; the result restates it as "Cenę wywoławczą nieruchomości ustalono w
// wysokości 52.000,00 zł netto." — one lazy [^.] bridge (bounded) spans the
// "nieruchomości ustalono w wysokości" connector, then the first amount token.
export function startingPriceFromText(text) {
  const m = /cen[aęy]\w*\s+wywo[łl]awcz\w*[^.\d]{0,60}?(\d[\d.,  ]{0,17})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Achieved price (result notices): "W wyniku przeprowadzonego przetargu
// osiągnięto cenę 55.000,00 zł netto." A numeric value => sold; none => unsold.
export function achievedPriceFromText(text) {
  const t = text || '';
  let m = /osi[ąa]gni[ęe]to\s+cen[ęe]\s+(\d[\d.,  ]{0,17})\s*z[łl]/i.exec(t);
  if (!m) m = /cen[aęy]\w*\s+osi[ąa]gni[ęe]t\w*[^.\d]{0,40}?(\d[\d.,  ]{0,17})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// Main plot: "… jako działka nr 107/2 o powierzchni 0,1010 ha …". Anchored on
// the singular "działka nr … o powierzchni … ha" so the shared-fraction udział
// ("… w działkach nr 107/3 i nr 107/8 o łącznej powierzchni 0,0742 ha") — a
// plural "działkach" + "łącznej powierzchni" — is never mistaken for the lot.
const PARCEL_RE = /dzia[łl]ka\s+nr\s+(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i;

/** { dzialka_nr, area_m2 } for a land plot (ha -> m², rounded), or nulls. */
export function parcelFromText(text) {
  const m = PARCEL_RE.exec((text || '').replace(/\s+/g, ' '));
  if (!m) return { dzialka_nr: null, area_m2: null };
  const ha = Number(m[2].replace(',', '.'));
  return { dzialka_nr: m[1], area_m2: ha > 0 ? Math.round(ha * 10000) : null };
}

// Locality (obręb proxy): "… nieruchomości położonej w Sikorzynie gmina Gostyń
// …" -> "Sikorzynie". One or two Capitalised words after "położon… w"; the
// lowercase "gmina" bounds it. Both the announcement and the result phrase it
// identically, so the land record keys join on it.
// NB: no /i flag — the capture's [A-ZŻŹĆŁŚĄĘÓŃ] must stay UPPERCASE-only so the
// second, optional word requires a real capital (a two-word village like "Stara
// Krobia"), and the trailing lowercase "gmina" is never swallowed. The "położon"
// anchor is spelled with [Pp] to still match a sentence-initial capital.
const LOCALITY_RE =
  /[Pp]o[łl]o[żz]on\w*\s+(?:jest\s+)?w\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+)?)/;

/** Locality name (obręb proxy), or null. */
export function localityFromText(text) {
  const m = LOCALITY_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// ----------------------------------------------------- flat / building helpers
//
// Ported from the Tarnowskie Góry analog (same CMS family). NOT yet groundtruthed
// on live Gostyń flat text (none was published on the BIP at build time), so
// classifyKind on the BODY is the authority and these only enrich a flat record.

// "… przy ulicy Powstańców Wielkopolskich 8 w Gostyniu" / "przy ul. Wrocławskiej
// 256 …". Street + optional building number; stops at a period / comma / "oraz"
// / " i " / " w Gostyni…" / newline.
const STREET_HEADER_RE =
  /przy\s+ul(?:ic[yą]|\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?))?\s*(?:\.|,|\s+oraz\b|\s+i\b|\s+w\s+Gostyni|\n|$)/i;

/** { street, building|null } from a flat/building header, or null. */
export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

// "lokalu mieszkalnego nr 7" / "lokal użytkowy nr 3".
const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;
// "o powierzchni użytkowej 37,70 m²".
const UNIT_AREA_RE =
  /powierzchni\s+u[żz]ytkow\w+[^.\d]{0,40}?(\d[\d.,\s ]*?)\s*m\s*[²2](?!\d)/i;

/** "ul. <street> <bldg>[/<apt>]" raw address for a flat/unit, or null. */
export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

/** Usable floor area (m²) of a flat/unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// Kind from the asset clause: a ~300-char window anchored on "na sprzedaż …"
// (Gostyń buries it under a long preamble in result notices), so "lokalu
// mieszkalnego" (flat) or "działka …" / "niezabudowana" (land -> 'grunt') is
// classified from the property phrase, not the boilerplate around it.
function kindFromHeader(text) {
  const t = text || '';
  const i = t.search(/na\s+sprzeda[żz]/i);
  return classifyKind(i >= 0 ? t.slice(i, i + 300) : t.slice(0, 500));
}

// -------------------------------------------------------------- block splitting

/** Slice `text` into blocks, one per occurrence of `startRe` (the marker is kept
 *  at the head of each block). Returns [text] when the marker never matches. */
function splitBlocks(text, startRe) {
  const re = new RegExp(startRe.source, startRe.flags.includes('g') ? startRe.flags : startRe.flags + 'g');
  const idx = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    idx.push(m.index);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (idx.length === 0) return [text];
  const out = [];
  for (let i = 0; i < idx.length; i++) out.push(text.slice(idx[i], idx[i + 1] ?? text.length));
  return out;
}

const ANN_BLOCK_RE = /(?:BURMISTRZ\s+GOSTYNIA|Burmistrz\s+Gostynia)\s+og[łl]asza/i;
const RESULT_BLOCK_RE = /Na\s+podstawie\s+[$§]?\s*12\s+Rozporz/i;

// --------------------------------------------------------------- title routing
//
// The XML board feed carries a clean title per article; these decide which
// articles are worth fetching (the body header re-confirms role in crawl.js).

/** SKIP outright (never a municipal SALE): rentals (najem/dzierżawa), sale-lists
 *  (wykazy), corrections, cancellations, negotiations (rokowania). */
export function isSkippableTitle(title) {
  const s = title || '';
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /(^|\W)wykaz\b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

/** RESULT notice title: "… przetarg … (wyniki przetargu)" / "informacja o
 *  wyniku przetargu". */
export function isResultTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /wynik/i.test(s);
}

/** SALE AUCTION announcement title: a przetarg to sprzedaż/zbycie a
 *  nieruchomość/lokal/działka. Call after isSkippableTitle / isResultTitle. */
export function isAnnouncementTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal|dzia[łl]k/i.test(s);
}

/** Body-level result marker (the authority over the noisy title): the OCR'd
 *  "INFORMACJA … przeprowadzony został … przetarg …" + "osiągnięto cenę". */
export function isResultNotice(text) {
  const t = text || '';
  return (
    /osi[ąa]gni[ęe]to\s+cen/i.test(t) ||
    /cen[aęy]\w*\s+osi[ąa]gni[ęe]t/i.test(t) ||
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /przeprowadzony\s+zosta[łl]\s+\S*\s*przetarg/i.test(t)
  );
}

// --------------------------------------------------------------- XML board feed

/** Parse the /artykuly/xml/<board>/<page>/1 feed into article refs.
 *  @returns {{ pages:number, items:Array<{url:string,title:string,date:string|null}> }} */
export function parseArticleList(xml) {
  const s = xml || '';
  const pagesM = /<ilosc-stron>\s*(\d+)\s*<\/ilosc-stron>/i.exec(s);
  const pages = pagesM ? Number(pagesM[1]) : 1;
  const items = [];
  const re = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    const blk = m[1];
    const url = (/<url>\s*([\s\S]*?)\s*<\/url>/i.exec(blk) || [])[1];
    let title = (/<tytul>\s*([\s\S]*?)\s*<\/tytul>/i.exec(blk) || [])[1] || '';
    title = unescapeXml(title).replace(/\s+/g, ' ').trim();
    const dRaw = (/<data>\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*<\/data>/i.exec(blk) || []);
    const date = dRaw.length ? `${dRaw[3]}-${dRaw[2].padStart(2, '0')}-${dRaw[1].padStart(2, '0')}` : null;
    if (url) items.push({ url: url.trim(), title, date });
  }
  return { pages: pages > 0 ? pages : 1, items };
}

function unescapeXml(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
}

// ------------------------------------------------------------- article HTML

/** Article <h1 id="content-header"> title. */
export function extractTitle(html) {
  const m = /<h1[^>]*id="content-header"[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

/** Article body text (the <section class="wysiwyg"> block; falls back to the
 *  #main-content contents div). Often a short description on Gostyń — the real
 *  detail is in the attachments — but used as a last-resort text source. */
export function extractBodyText(html) {
  const h = html || '';
  const m =
    /<section[^>]*class="[^"]*wysiwyg[^"]*"[\s\S]*?>([\s\S]*?)<\/section>/i.exec(h) ||
    /<div[^>]*class="[^"]*contents[^"]*"[^>]*>([\s\S]*?)<section[^>]*id="attachments"/i.exec(h);
  return m ? stripTags(m[1]) : '';
}

/** Attachments: [{ url, id, name, ext }]. ext is the on-page type label
 *  ("pdf"/"docx"/"doc") — crawl.js still magic-checks bytes as a fallback. */
export function extractAttachments(html) {
  const h = html || '';
  const secM = /<section[^>]*id="attachments"[\s\S]*?<\/section>/i.exec(h);
  const scope = secM ? secM[0] : h;
  const out = [];
  const seen = new Set();
  const re =
    /\/attachments\/download\/(\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,120}?class="files\s+text\w+"[^>]*>\s*([a-z0-9]+)/gi;
  let m;
  while ((m = re.exec(scope)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      url: `https://biuletyn.gostyn.pl/attachments/download/${id}`,
      id,
      name: stripTags(m[2]),
      ext: m[3].toLowerCase(),
    });
  }
  return out;
}

function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ----------------------------------------------------------- announcement parse

/** Parse ONE announcement block (one property). Land -> kind:'grunt' with
 *  dzialka_nr/obreb/plot-area; flat/building -> address-keyed. Or null. */
function parseAnnouncementBlock(t) {
  const kind = kindFromHeader(t);
  const round = roundFromText(t);
  const auction_date = announcementDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  if (kind === 'grunt') {
    const { dzialka_nr, area_m2 } = parcelFromText(t);
    const obreb = localityFromText(t);
    if (!dzialka_nr && !obreb) return null;
    return { kind: 'grunt', dzialka_nr, obreb, area_m2, address_raw: null, starting_price_pln, auction_date, round };
  }

  // Flat / building (address-keyed).
  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}

/** Parse an announcement document (one or several properties) into records.
 *  Bails on result text (symmetric with parseResultDoc) so a mis-routed "wynik"
 *  notice can never be booked as an active listing. */
export function parseAnnouncement(text) {
  if (!text || isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const out = [];
  for (const block of splitBlocks(t, ANN_BLOCK_RE)) {
    const rec = parseAnnouncementBlock(block);
    if (rec) out.push(rec);
  }
  return out;
}

// ------------------------------------------------------------------ result parse

/** Parse ONE result block (one property) into a concluded-auction record. */
function parseResultBlock(t, fallbackDate, sourceUrl) {
  const kind = kindFromHeader(t);
  const round = roundFromText(t);
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (kind === 'grunt') {
    const { dzialka_nr, area_m2 } = parcelFromText(t);
    const obreb = localityFromText(t);
    if (!dzialka_nr && !obreb) return null;
    return {
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb, area_m2, address_raw: null,
      round, starting_price_pln, final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);
  return {
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw, address, round, starting_price_pln, final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(t), notes,
  };
}

/**
 * Parse a result document ("INFORMACJA o wyniku …", one or several properties).
 * @param {string} text       extracted attachment text (OCR for the scanned pdf)
 * @param {string|null} fallbackDate  ISO date from the crawl ref
 * @param {string} sourceUrl  the attachment URL (provenance)
 * @returns {Array<object>}   0..N concluded-auction records
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const out = [];
  for (const block of splitBlocks(t, RESULT_BLOCK_RE)) {
    const rec = parseResultBlock(block, fallbackDate, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}
