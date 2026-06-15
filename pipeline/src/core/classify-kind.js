// Shared property-KIND classifier — the single source of truth for mapping a
// Polish municipal auction's text/title to one asset kind. Introduced in HL-0 of
// the houses/land expansion (see SPIKE-HOUSES-LAND.md + TODO.md "Houses, land &
// commercial"). City parsers SHOULD call this instead of hand-rolling per-city
// kind regexes, so the vocabulary stays in one place.
//
//   mieszkalny  — residential flat (lokal mieszkalny)            [address-keyed]
//   zabudowana  — built property / house (nieruchomość zabudowana,
//                 budynek mieszkalny, dom)                        [address-keyed]
//   uzytkowy    — commercial unit (lokal użytkowy / niemieszkalny)[address-keyed]
//   garaz       — garage (garaż)                                  [address-keyed]
//   grunt       — land / plot (działka, nieruchomość niezabudowana,
//                 grunt)                            [PARCEL-keyed → land.json]
//   unknown     — could not be determined
//
// Ordering is load-bearing (first match wins) because the Polish phrases nest:
//   - "lokalu mieszkalnego" (flat) must beat the bare "mieszkaln" inside
//     "budynek mieszkalny" (house);
//   - "niezabudowana" (land) CONTAINS "zabudowana" (house) as a substring, so
//     land's negative form is resolved before the house rule via a lookbehind
//     and an explicit land-before-house guard.

/** Residential flat — a self-contained unit ("lokal mieszkalny nr 5"). */
const FLAT_RE = /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln|samodzieln\w+\s+lokal\w*\s+mieszkaln|prawa\s+w[łl]asno[śs]ci\s+lokalu\s+mieszkaln/i;
/** Commercial unit ("lokal użytkowy" / "lokal niemieszkalny"). */
const COMMERCIAL_RE = /lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)/i;
/** Garage. */
const GARAGE_RE = /gara[żz]/i;
/** Land / undeveloped plot. "grunt" only when NOT immediately qualified
 *  "...zabudowana" (a built plot is a house, handled below). */
const LAND_RE = /niezabudowan|dzia[łl]k|grunt(?!\w*\s+zabudowan)/i;
/** A positive "zabudowana" that is NOT the "nie-" (un-) form. */
const BUILT_RE = /(?<!nie)zabudowan/i;
/** Built property / house: a positive "zabudowana", a residential building, a
 *  single-family marker, or the noun "dom" in its common declensions. The dom
 *  endings are enumerated (not \w*) so street/surname roots like "Domański",
 *  "Domowa", "Domagała" do NOT false-positive. */
const HOUSE_RE = /(?<!nie)zabudowan|budyn\w*\s+mieszkaln|jednorodzinn|\bdom(?:u|em|y|ek|ku|kiem|ki|ków|kach)?\b/i;

/**
 * Classify one announcement's text (title and/or body, or a source "Rodzaj
 * nieruchomości" field) into a kind.
 * @param {string} text
 * @returns {'mieszkalny'|'zabudowana'|'uzytkowy'|'garaz'|'grunt'|'unknown'}
 */
export function classifyKind(text) {
  const t = (text == null ? '' : String(text));
  if (!t.trim()) return 'unknown';
  if (FLAT_RE.test(t)) return 'mieszkalny';
  if (COMMERCIAL_RE.test(t)) return 'uzytkowy';
  if (GARAGE_RE.test(t)) return 'garaz';
  // Land BEFORE house so "niezabudowana" can't fall through to the house rule.
  // The guard rejects "gruntowa zabudowana" (a built plot → house).
  if (LAND_RE.test(t) && !BUILT_RE.test(t)) return 'grunt';
  if (HOUSE_RE.test(t)) return 'zabudowana';
  if (LAND_RE.test(t)) return 'grunt';
  return 'unknown';
}

/** All kinds the pipeline can emit (ordering = display order). */
export const KINDS = ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'grunt'];
/** The one kind that is parcel-keyed and lives in land.json, not properties.json. */
export const LAND_KIND = 'grunt';
/** Kinds that are address-keyed and live in properties.json/active.json. */
export const ADDRESS_KINDS = ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'unknown'];

/** True when this kind belongs in the separate land.json store. */
export function isLandKind(kind) {
  return kind === LAND_KIND;
}
