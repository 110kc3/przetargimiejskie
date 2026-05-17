// Address normalization. Turns whatever string the OCR or the HTML produced
// into a stable {street, building, apt} key we can join on.
//
// Examples it must handle:
//   "ul. Zygmunta Starego 29/4"             -> street: Zygmunta Starego, building: 29, apt: 4
//   "Zygmunta Starego 29/4"                 -> same
//   "ul. Pszczyńskiej 7A/14"                -> street: Pszczyńskiej, building: 7A, apt: 14
//   "ul. Skowrońskiego 18/1I" (OCR slip)    -> street: Skowrońskiego, building: 18, apt: 1 (warn)
//   "ul. Kurpiowska 16"      (garage)       -> street: Kurpiowska, building: 16, apt: null
//   "ul. Białej Bramy 5/15"                 -> street: Białej Bramy, building: 5, apt: 15

const POLISH_LOWER = (s) =>
  s
    .toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');

/**
 * @typedef {object} ParsedAddress
 * @property {string} street          original-case street, with diacritics
 * @property {string} street_norm     lowercased, no diacritics, single-spaced
 * @property {string} building        e.g. "29", "7A", "5"
 * @property {string|null} apt        e.g. "4", "14", or null for buildings without unit numbers
 * @property {string} key             stable join key: `${street_norm}|${building}|${apt||''}`
 * @property {string|null} warning    set when we made a tolerant guess (e.g. OCR 'I' for '1')
 */

const STRIP_LEAD =
  /^\s*(?:ul\.?|al\.?|pl\.?|os\.?)\s+/i;
const TRAIL_NOISE =
  /\s*(?:wraz\b.*|nr\s*\d+.*|m\.\s*\d+.*)$/i;

/**
 * @param {string} raw
 * @returns {ParsedAddress|null}
 */
export function parseAddress(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/\s+/g, ' ');
  // Strip leading "ul. / al. / pl."
  s = s.replace(STRIP_LEAD, '');
  // Strip trailing noise that sometimes ends up included
  s = s.replace(TRAIL_NOISE, '').trim();

  // Try "<street...> <bldg>/<apt>" or "<street...> <bldg>" (no apt — garages)
  // Building can be e.g. 7, 7A, 12B
  // Apt can be e.g. 4, 14, plus the OCR slip "1I" / "1l" → 1
  const re = /^(.+?)\s+(\d+[A-Za-z]?)(?:\s*[\/\\]\s*([\d]+[A-Za-z]?|[1-9][Il]|[1-9][il]))?$/;
  const m = re.exec(s);
  if (!m) return null;
  const street = m[1].trim();
  const building = m[2].toUpperCase();
  let aptRaw = m[3] || null;
  let warning = null;
  let apt = null;
  if (aptRaw) {
    // OCR slash-eaten "1I" / "1l" -> "1" (with warning)
    const ocrSlip = /^([1-9])[Iil]$/.exec(aptRaw);
    if (ocrSlip) {
      apt = ocrSlip[1];
      warning = `OCR-quirk: apt '${aptRaw}' interpreted as '${apt}'`;
    } else {
      apt = aptRaw.toUpperCase();
    }
  }
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
