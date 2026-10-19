// National validation policy shared by refresh workers, publishers and the
// generated data index. New registry entries are strict by default. The only
// report-only entries are a dated remediation cohort whose existing committed
// data currently trips one or more legacy sanity rules.

// The September remediation cohort was repaired from retained official source
// evidence on 2026-10-19. Strict publication checks apply to every enabled feed.
export const RESTORED = new Set(["bydgoszcz", "chelmno", "drawsko-pomorskie", "glogow", "glubczyce", "gniezno", "gorzow-wielkopolski", "grudziadz", "jarocin", "jelenia-gora", "kielce", "krakow", "kwidzyn", "skarzysko-kamienna", "slupsk", "stargard", "swinoujscie", "torun", "trzebnica", "warszawa", "wroclaw"]);
export const QUARANTINED = new Map();
export const QUARANTINE_REVIEW_DUE = null;

export function validationPolicy(cityId) {
  const reason = QUARANTINED.get(cityId);
  return reason
    ? { status: 'quarantined', since: '2026-09-06', review_due: QUARANTINE_REVIEW_DUE, reason }
    : { status: 'enforced', since: RESTORED.has(cityId) ? '2026-10-19' : '2026-09-06', review_due: null, reason: null };
}

export function validatePolicyRegistry(registry) {
  const ids = new Set(registry.map((city) => city.id));
  const unknown = [...QUARANTINED.keys()].filter((id) => !ids.has(id));
  if (unknown.length) throw new Error(`validation quarantine contains unknown city ids: ${unknown.join(', ')}`);
  return {
    enforced: registry.filter((city) => validationPolicy(city.id).status === 'enforced').length,
    quarantined: registry.filter((city) => validationPolicy(city.id).status === 'quarantined').length,
  };
}
