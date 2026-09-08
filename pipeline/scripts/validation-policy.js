// National validation policy shared by refresh workers, publishers and the
// generated data index. New registry entries are strict by default. The only
// report-only entries are a dated remediation cohort whose existing committed
// data currently trips one or more legacy sanity rules.

export const QUARANTINED = new Map([
  ['bydgoszcz', 'legacy price parsing findings'],
  ['chelmno', 'legacy address parsing findings'],
  ['drawsko-pomorskie', 'legacy address parsing findings'],
  ['glogow', 'legacy address/price findings'],
  ['glubczyce', 'legacy address/price findings'],
  ['gniezno', 'legacy address parsing findings'],
  ['gorzow-wielkopolski', 'legacy area/price findings'],
  ['grudziadz', 'legacy price parsing findings'],
  ['jarocin', 'legacy address parsing findings'],
  ['jelenia-gora', 'legacy address parsing findings'],
  ['kielce', 'legacy land identity findings'],
  ['krakow', 'legacy address parsing findings'],
  ['kwidzyn', 'legacy area parsing findings'],
  ['skarzysko-kamienna', 'legacy price parsing findings'],
  ['slupsk', 'legacy address parsing findings'],
  ['stargard', 'legacy land/address parsing findings'],
  ['swinoujscie', 'legacy address parsing findings'],
  ['torun', 'legacy address/price findings'],
  ['trzebnica', 'legacy price parsing findings'],
  ['warszawa', 'legacy area parsing findings'],
  ['wroclaw', 'legacy entity/address parsing findings'],
]);
export const QUARANTINE_REVIEW_DUE = '2026-10-06';

export function validationPolicy(cityId) {
  const reason = QUARANTINED.get(cityId);
  return reason
    ? { status: 'quarantined', since: '2026-09-06', review_due: QUARANTINE_REVIEW_DUE, reason }
    : { status: 'enforced', since: '2026-09-06', review_due: null, reason: null };
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
