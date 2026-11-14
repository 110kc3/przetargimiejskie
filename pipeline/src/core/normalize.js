
const POLISH_LOWER = (s) =>
  s
    .toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');

const STRIP_LEAD = /^\s*(?:ul\.?|al\.?|pl\.?|os\.?)\s+/i;
const TRAIL_NOISE = /\s*wraz\b.*/i;

const ROMAN_OK = /^(I{1,3}|IV|V|VI{0,3}|IX|X)$/i;


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


export function parseAddress(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/\s+/g, ' ');
  s = s.replace(STRIP_LEAD, '');
  s = s.replace(TRAIL_NOISE, '').trim();
  s = s.replace(/\s+m\.?\s*(\d+[A-Za-z]?)\s*$/i, '/$1');

  const garageMatch = /^(.+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s+(?:gara[żz](?:\s*nr\.?)?|g\.(?:\s*nr\.?)?|g\s+nr\.?)\s*(\d+)$/i.exec(s);
  if (garageMatch) {
    const [, street, building, garageNo] = garageMatch;
    return buildAddress(street, building.toUpperCase(), `garaz-${garageNo}`, null);
  }
  const rejonMatch = /^(.+?)\s+(?:gara[żz](?:\s*nr\.?)?|g\.(?:\s*nr\.?)?|g\s+nr\.?)\s*(\d+)$/i.exec(s);
  if (rejonMatch) {
    const [, street, garageNo] = rejonMatch;
    return buildAddress(street, '0', `garaz-${garageNo}`, null);
  }


  // Preserve the stated joint identity instead of putting numbers in street.
  const jointUnits = /^(.+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s*\/\s*(\d+[A-Za-z]?)\s*,\s*(\d+[A-Za-z]?)$/i.exec(s);
  if (jointUnits) {
    return buildAddress(jointUnits[1], jointUnits[2].toUpperCase(),
      `${jointUnits[3]}-${jointUnits[4]}`.toUpperCase(), null);
  }
  const jointBuildings = /^(.+?)\s+(\d+[A-Za-z]?(?:\s*,\s*\d+[A-Za-z]?)+)(?:\s*\/\s*([\d]+[A-Za-z]?))?$/i.exec(s);
  if (jointBuildings) {
    return buildAddress(jointBuildings[1], jointBuildings[2].replace(/\s/g, '').toUpperCase(),
      jointBuildings[3]?.toUpperCase() || null, null);
  }

  const re =
    /^(.+?)\s+(\d+(?:-\d+)?[A-Za-z]?)(?:\s*[\/\\]\s*([0-9]+[A-Za-z]?(?:-[0-9]+[A-Za-z]?)?|[IVX]+|T[IVX]+|[1-9][Il]))?$/i;
  const m = re.exec(s);
  if (!m) return null;
  const street = m[1].trim();
  const building = m[2].toUpperCase();
  const aptRaw = m[3] || null;
  let warning = null;
  let apt = null;
  if (aptRaw) {
    const ocrSlip = /^([1-9])[Il]$/.exec(aptRaw);
    const ocrTPrefix = /^T(I+|V|X)$/i.exec(aptRaw);
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
