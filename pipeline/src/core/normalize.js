// Address normalization. Turns whatever string the OCR or the HTML produced
// into a stable {street, building, apt} key we can join on.
//
// Variants seen in real ZGM data:
//   "ul. Zygmunta Starego 29/4"              -> street=Zygmunta Starego, bldg=29,  apt=4
//   "Pszczyńskiej 7A/14"                     -> street=Pszczyńskiej,    bldg=7A,  apt=14
//   "Skowrońskiego 18/1I"  (OCR /1 -> 1I)    -> bldg=18, apt=1            (warn)
//   "Kurpiowska 16"        (garage)          -> bldg=16, apt=null
//   "Barlickiego 12/I"     (Roman apt)       -> bldg=12, apt=I            (commercial)
//   "Na Piasku 3/II"                         -> bldg=3,  apt=II
//   "Chorzowska 40/TII"    (OCR T -> I)      -> bldg=40, apt=III          (warn)
//   "Kozielska 13 garaż nr 3"                -> bldg=13, apt=garaz-3
//   "Zwycięstwa 34/9a"                       -> bldg=34, apt=9A

const POLISH_LOWER = (s) =>
  s
    .toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');

const STRIP_LEAD = /^\s*(?:ul\.?|al\.?|pl\.?|os\.?)\s+/i;
// We *don't* strip trailing "garaż nr N" — kept as apt info. Nor "m. N"
// (mieszkanie N): that IS the apartment number — stripping it collapsed
// distinct flats ("Zwycięstwa 34 m. 9" and "… m. 7") into one bare-building
// key. It's converted to the "/N" form below instead.
const TRAIL_NOISE = /\s*wraz\b.*/i;

const ROMAN_OK = /^(I{1,3}|IV|V|VI{0,3}|IX|X)$/i;


// Display-only genitive → nominative for SINGLE-WORD adjectival street names:
// sources write "przy ul. Sportowej 6", so the stored display name ends up
// genitive ("Sportowej 6/2" in every table). Only unambiguous adjectival
// endings are converted — -skiej/-ckiej stay untouched here because they are
// morphologically identical to female-patron surnames ("Bytomskiej" should
// flip, "Skłodowskiej" must not; callers may flip those only with evidence,
// e.g. a nominative twin elsewhere in the dataset). Multi-word and hyphenated
// names (patron full names, "Królewskiej Tamy") are left alone. Keys and
// street_norm are NEVER touched — this is presentation only.
const NOMINATIVE_ENDINGS = [
  ['owej', 'owa'],   // Sportowej → Sportowa, Kalinowej → Kalinowa
  ['niej', 'nia'],   // Średniej → Średnia
  ['czej', 'cza'],   // Hutniczej → Hutnicza
  ['nej', 'na'],     // Cmentarnej → Cmentarna, Piwnej → Piwna
];
export function nominativeStreetDisplay(street) {
  if (!street || /[\s\-]/.test(street)) return street;
  for (const [gen, nom] of NOMINATIVE_ENDINGS) {
    if (street.toLowerCase().endsWith(gen) && street.length > gen.length) {
      return street.slice(0, -gen.length) + nom;
    }
  }
  return street;
}

/**
 * @typedef {object} ParsedAddress
 * @property {string} street
 * @property {string} street_norm
 * @property {string} building
 * @property {string|null} apt
 * @property {string} key
 * @property {string|null} warning
 */

/** @param {string} raw @returns {ParsedAddress|null} */
export function parseAddress(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/\s+/g, ' ');
  s = s.replace(STRIP_LEAD, '');
  s = s.replace(TRAIL_NOISE, '').trim();
  // Trailing "m. N" / "m N" (mieszkanie) → the standard "/N" apartment form:
  // "Zwycięstwa 34 m. 9" → "Zwycięstwa 34/9".
  s = s.replace(/\s+m\.?\s*(\d+[A-Za-z]?)\s*$/i, '/$1');

  // Try the "garaż nr N" suffix first: "<street> <bldg> garaż nr <N>"
  const garageMatch = /^(.+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s+gara[żz]\s*nr\s*(\d+)$/i.exec(s);
  if (garageMatch) {
    const [, street, building, garageNo] = garageMatch;
    return buildAddress(street, building.toUpperCase(), `garaz-${garageNo}`, null);
  }
  // Bare "<street> garaż nr <N>" (no building number — "rejon" garages in
  // older auction listings). Synthesize building="0" to match the
  // convention used by parse-result.js for the same input.
  const rejonMatch = /^(.+?)\s+gara[żz]\s*nr\s*(\d+)$/i.exec(s);
  if (rejonMatch) {
    const [, street, garageNo] = rejonMatch;
    return buildAddress(street, '0', `garaz-${garageNo}`, null);
  }

  // Standard "<street...> <bldg>/<apt>" or "<street...> <bldg>" (no apt — bare garages).
  // apt: arabic-with-optional-letter, OR roman numeral (I,II,III,IV,V,VI,VII,VIII,IX,X),
  // OR OCR slip "1I"/"1l" (slash eaten by OCR), OR "TII"/"TI"-style (T from "I"),
  // OR "9a" style with lowercase letter.
  const re =
    /^(.+?)\s+(\d+(?:-\d+)?[A-Za-z]?)(?:\s*[\/\\]\s*([0-9]+[A-Za-z]?|[IVX]+|T[IVX]+|[1-9][Il]))?$/i;
  const m = re.exec(s);
  if (!m) return null;
  const street = m[1].trim();
  const building = m[2].toUpperCase();
  const aptRaw = m[3] || null;
  let warning = null;
  let apt = null;
  if (aptRaw) {
    // OCR slash-eaten "1I"/"1l" -> "1" (with warning).
    // Only triggers for single-digit-then-I; "II" alone is a real Roman 2.
    const ocrSlip = /^([1-9])[Il]$/.exec(aptRaw);
    const ocrTPrefix = /^T(I+|V|X)$/i.exec(aptRaw); // "TII" -> "III"
    if (ocrSlip) {
      apt = ocrSlip[1];
      warning = `OCR-quirk: apt '${aptRaw}' interpreted as '${apt}'`;
    } else if (ocrTPrefix) {
      apt = ('I' + ocrTPrefix[1]).toUpperCase();
      warning = `OCR-quirk: apt '${aptRaw}' interpreted as '${apt}'`;
    } else if (ROMAN_OK.test(aptRaw)) {
      apt = aptRaw.toUpperCase();
    } else {
      apt = aptRaw.toUpperCase();
    }
  }
  return buildAddress(street, building, apt, warning);
}

function buildAddress(street, building, apt, warning) {
  const streetNorm = POLISH_LOWER(street).replace(/[^\w]+/g, ' ').trim().replace(/\s+/g, ' ');
  return {
    street,
    street_norm: streetNorm,
    building,
    apt,
    key: `${streetNorm}|${building}|${apt ?? ''}`,
    warning,
  };
}
