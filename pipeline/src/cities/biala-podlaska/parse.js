// Biała Podlaska (ZGL) parsers — pure text-extraction functions, unit-tested
// against real fetched fixtures (tests/parse-biala-podlaska.test.js). No
// network here; crawl.js does the fetching and hands these functions plain
// strings: a list-row title, or a detail page's tag-stripped body text.
//
// See crawl.js for the full source-shape rationale (spikes/lubelskie/
// biala-podlaska/biala-podlaska.md, live-verified 2026-06-27).

import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';

// "330.000,00 zł" / "250 000,00 zł" / "16.500,00" -> integer PLN. Both DOT and
// SPACE thousands separators are used on-site (Kopernika's announcement uses
// dots; Plac Wolności's uses spaces), so both must be stripped.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "77,80" / "40,9" / "353" -> float m2.
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Starting price: "Cena wywoławcza ... wynosi ... zł" (also seen: "lokalu
 * wynosi" / "nieruchomości wynosi"). Scans a bounded window after the label
 * so the wadium clause ("wadium w wysokości ... zł", a few lines later) is
 * never matched instead.
 */
export function priceFromText(text) {
  if (!text) return null;
  const start = text.search(/cena\s+wywo[łl]awcza/i);
  if (start < 0) return null;
  const region = text.slice(start, start + 200);
  const m = /wynosi\s+([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

// `\w` doesn't cover Polish diacritics (ą ć ę ł ń ó ś ź ż), so any pattern that
// needs to consume the rest of a declined Polish word ("działkę", "działka")
// must use this class instead of `\w*`.
const PL_WORD = 'a-ząćęłńóśźż';

/**
 * Usable floor area. PRIMARY: the labelled "powierzchni użytkowej 77,80 m²"
 * clause (Plac Wolności; also both buildings in the Brzeska multi-building
 * case — a multi-building parcel carries TWO such phrases, and this returns
 * the FIRST, a documented simplification, not a sum). FALLBACK: an unlabelled
 * "o powierzchni NNN m²" that is NOT the parcel's own "łącznej powierzchni"
 * (total) mention — some announcements (Kopernika 7/9) never say "użytkowej"
 * for the flat itself, only "o łącznej powierzchni ... m²" for the parcel
 * followed later by the flat's own bare "o powierzchni 77,80 m²".
 */
export function areaFromText(text) {
  if (!text) return null;
  const labeled = new RegExp(
    `powierzchni[${PL_WORD}]*\\s+u[żz]ytkow[${PL_WORD}]*[^0-9]{0,30}?([\\d][\\d.,]*)\\s*m\\s*[²2]`,
    'i',
  ).exec(text);
  if (labeled) {
    const v = parseArea(labeled[1]);
    if (v != null && v > 0) return v;
  }
  const M2 = /(?:o\s+)?powierzchni\s+([\d][\d.,]*)\s*m\s*[²2]/gi;
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/ł[ąa]cznej/i.test(before)) continue; // the parcel's own TOTAL area — skip
    const v = parseArea(m[1]);
    if (v != null && v > 0) return v;
  }
  return null;
}

/**
 * Plot/parcel area: the "... działkę ... o (łącznej )?powierzchni NNN m²"
 * clause that names the PARCEL itself, not a unit inside it. NOTE: this is a
 * pure text-extraction primitive — it fires on ANY "działka ... powierzchni"
 * clause, including the boilerplate a FLAT announcement uses to describe the
 * building's underlying plot (e.g. Kopernika 7/9's "... stanowiącej działkę
 * nr ewid. 1217/8 o łącznej powierzchni 353 m²"). It is crawl.js's job to only
 * attach the result as `land_area_m2` on 'grunt'/'zabudowana' (whole-property)
 * records, where a parcel area is meaningful — never on a single flat/unit.
 */
export function landAreaFromText(text) {
  if (!text) return null;
  const m = new RegExp(
    `dzia[łl]k[${PL_WORD}]*[\\s\\S]{0,80}?o\\s+(?:ł[ąa]cznej\\s+)?powierzchni\\s+([\\d][\\d.,]*)\\s*m\\s*[²2]`,
    'i',
  ).exec(text);
  return m ? parseArea(m[1]) : null;
}

/** Cadastral parcel number: "działkę nr ew. 1650/2" / "działka 1923/182". */
export function dzialkaNrFromText(text) {
  if (!text) return null;
  const m = new RegExp(
    `dzia[łl]k[${PL_WORD}]*\\s*(?:nr\\s*)?(?:ew(?:id)?\\.?\\s*)?(\\d+(?:/\\d+)?)`,
    'i',
  ).exec(text);
  return m ? m[1] : null;
}

const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, szóst: 6, szost: 6 };

/**
 * Round from an ordinal qualifying "przetarg" in the title ("Trzeci przetarg
 * ..." -> 3); a bare "przetarg" (no ordinal) -> 1; no "przetarg" word at all
 * (the rare bare "Sprzedaż ..." 2020 announcement, which predates a scheduled
 * auction) -> null (unknown — build-properties derives it from attempt order).
 */
export function roundFromTitle(title) {
  const t = (title || '').toLowerCase();
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)[\wąćęłńóśźż]*\s+przetarg/i.exec(t);
  if (m) return ORDINALS[m[1]] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

/**
 * "oznaczonego nr 9" / "oznaczonym nr 14" -> "9" / "14" — the lokal/flat
 * number inside the building (the apartment slot in parseAddress terms).
 */
export function lokalNrFromTitle(title) {
  const m = /oznaczon\w*\s+nr\s*(\d+[A-Za-z]?)/i.exec(title || '');
  return m ? m[1] : null;
}

/**
 * "przy ul. Kopernika 7 w Białej Podlaskiej[,.]" -> "Kopernika 7". Tolerant of
 * the "ul./al./pl." prefix (even redundant, e.g. "ul. Plac Wolności 12" — the
 * source itself prefixes "ul." onto a Plac address), doubled internal spaces,
 * and a trailing comma/period/nothing.
 */
export function streetBuildingFromTitle(title) {
  const m =
    /przy\s+(?:ul\.?|al\.?|pl\.?)\s*([^\n,.;]+?\s+\d+[A-Za-z]?)\s+w\s+Bia[łl]ej\s*Podlaskiej/i.exec(
      title || '',
    );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/**
 * Full parsed address from a list/detail title: joins the street+building
 * with the lokal number (if any) into the "<street> <bldg>/<apt>" form
 * parseAddress expects. Returns null if the title carries no "przy ul. ..."
 * clause (defensive — every real sprzedaz_nieruchomosci title observed has one).
 */
export function addressFromTitle(title) {
  const sb = streetBuildingFromTitle(title);
  if (!sb) return null;
  const apt = lokalNrFromTitle(title);
  return parseAddress(apt ? `${sb}/${apt}` : sb);
}

/**
 * Kind from the FULL text (title + detail body, when the body has prose). A
 * titled "nieruchomości gruntowej" (land) is not reliably empty land: one
 * verified example (Brzeska 36) turned out — per its own body prose — to
 * carry two commercial buildings on the parcel ("zabudowaną budynkiem
 * handlowo-usługowym..."), i.e. kind 'zabudowana', not 'grunt'. classifyKind
 * resolves this correctly once the body is included. Falls back to
 * classifying the title alone when the detail page carries no prose
 * (observed for Narutowicza 30 — an attachment-only/sparse announcement with
 * no inline "Ogłoszenie o przetargu" text).
 */
export function kindFromText(title, body) {
  return classifyKind(`${title || ''} ${body || ''}`.trim());
}

// Contract stub — ZGL Biała Podlaska publishes no machine-readable results
// stream (no "informacja o wyniku"/"cena osiągnięta" anywhere on-site; see
// crawl.js). crawlResultDocs() returns [], so this is never invoked. Present
// only to satisfy the registry contract.
export function parseResultDoc(_text, _date, _url) {
  return [];
}
