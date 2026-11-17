const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  oacute: 'ó', Oacute: 'Ó', bdquo: '„', rdquo: '”', ldquo: '“', lsquo: '‘', rsquo: '’',
  ndash: '–', mdash: '—', hellip: '…', sup2: '²', sup3: '³', raquo: '»', laquo: '«',
  shy: '\u00ad', deg: '°', sect: '§', plusmn: '±',
};
const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi;
const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi;
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi;
const TAG = /<[^>]*>/g;
const REPLACEMENT_CHARACTER = '�';

export function replaceUntilStable(text, pattern, replacement) {
  let current = String(text ?? '');
  let previous;
  do {
    previous = current;
    current = current.replace(pattern, replacement);
  } while (current !== previous);
  return current;
}

function codePointText(digits, radix) {
  const point = parseInt(digits, radix);
  const valid = point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff);
  return valid ? String.fromCodePoint(point) : REPLACEMENT_CHARACTER;
}

function entityText(entity, name) {
  if (name[0] !== '#') return NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? entity;
  const hex = name[1] === 'x' || name[1] === 'X';
  return codePointText(name.slice(hex ? 2 : 1), hex ? 16 : 10);
}

export function decodeEntities(text) {
  return String(text ?? '').replace(ENTITY, entityText);
}

export function removeScriptsAndStyles(html, replacement = '') {
  return replaceUntilStable(replaceUntilStable(html, SCRIPT_BLOCK, replacement), STYLE_BLOCK, replacement);
}

export function stripTags(html, replacement = '') {
  return replaceUntilStable(html, TAG, replacement);
}

export function htmlToFlatText(html) {
  if (!html) return '';
  const withoutMarkup = stripTags(removeScriptsAndStyles(html), ' ');
  return decodeEntities(withoutMarkup).replace(/\s+/g, ' ').trim();
}
