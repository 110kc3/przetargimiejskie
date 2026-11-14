const FLAT_RE = /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln|samodzieln\w+\s+lokal\w*\s+mieszkaln|prawa\s+w[łl]asno[śs]ci\s+lokalu\s+mieszkaln/i;
const COMMERCIAL_RE = /lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)/i;
const GARAGE_RE = /gara[żz]/i;
const LAND_RE = /niezabudowan|dzia[łl]k|grunt(?!\w*\s+zabudowan)/i;
const BUILT_RE = /(?<!nie)zabudowan/i;
const HOUSE_RE = /(?<!nie)zabudowan|budyn\w*\s+mieszkaln|jednorodzinn|\bdom(?:u|em|y|ek|ku|kiem|ki|ków|kach)?\b/i;

export function classifyKind(text) {
  const t = (text == null ? '' : String(text));
  if (!t.trim()) return 'unknown';
  if (FLAT_RE.test(t)) return 'mieszkalny';
  if (COMMERCIAL_RE.test(t)) return 'uzytkowy';
  if (GARAGE_RE.test(t)) return 'garaz';
  if (LAND_RE.test(t) && !BUILT_RE.test(t)) return 'grunt';
  if (HOUSE_RE.test(t)) return 'zabudowana';
  if (LAND_RE.test(t)) return 'grunt';
  return 'unknown';
}

export const KINDS = ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'grunt'];
export const LAND_KIND = 'grunt';
export const ADDRESS_KINDS = ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'unknown'];

export const KIND_ALIASES = {
  zabudowa: 'zabudowana',
  zabudowy: 'zabudowana',
  'lokal mieszkalny': 'mieszkalny',
};

const VALID_KINDS = new Set([...KINDS, 'unknown']);

export function normalizeKind(kind) {
  if (!kind) return 'unknown';
  if (VALID_KINDS.has(kind)) return kind;
  if (Object.prototype.hasOwnProperty.call(KIND_ALIASES, kind)) return KIND_ALIASES[kind];
  return 'unknown';
}

export function isLandKind(kind) {
  return kind === LAND_KIND;
}
