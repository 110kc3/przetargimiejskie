// Merges parsed result records + active listings + wykaz announcements into
// the one-entry-per-property structure the extension consumes, then enriches
// each property with unit area from the detail-page crawl.
//
// City-agnostic: it takes already-crawled, already-parsed inputs and returns
// the `properties` array. Extracted verbatim from refresh.js — the per-city
// refactor changes file layout only, not behaviour.

/**
 * @param {object} input
 * @param {Array} input.allRecords  parsed auction records (from parseResultDoc)
 * @param {Array} input.active      active listings (from crawlActive)
 * @param {Array} input.wykaz       wykaz announcements (from crawlActive)
 * @param {Map<string, number>} input.detailAreas  property key → area m²
 * @returns {{ properties: Array }}
 */
export function buildCityData({ allRecords, active, wykaz, detailAreas }) {
  const props = new Map();
  function ensureProperty(addr, kind) {
    if (!addr) return null;
    const key = addr.key;
    let p = props.get(key);
    if (!p) {
      p = {
        key,
        street: addr.street,
        street_norm: addr.street_norm,
        building: addr.building,
        apt: addr.apt,
        kind,
        listings: [],
      };
      props.set(key, p);
    }
    return p;
  }

  for (const r of allRecords) {
    if (!r.address) continue;
    const p = ensureProperty(r.address, r.kind);
    if (!p) continue;
    p.listings.push({
      date: r.auction_date,
      round: r.round,
      kind: r.kind,
      starting_price_pln: r.starting_price_pln,
      outcome: r.outcome,
      unsold_reason: r.unsold_reason,
      final_price_pln: r.final_price_pln,
      source_pdf: r.source_pdf,
      notes: r.notes,
      // Some sources (e.g. Katowice result PDFs) carry the unit area on the
      // sold record itself; Gliwice does not, so add the key only when present.
      ...(r.area_m2 != null ? { area_m2: r.area_m2 } : {}),
    });
  }
  // A listing crawled from a "currently active" source is only really active
  // if its auction date hasn't passed. Announcement-only cities (Bytom, Zabrze)
  // surface years of past auctions whose date is in the past — those concluded
  // (with an outcome the city doesn't publish), so we mark them 'archived'
  // rather than 'active'. This keeps the popup's active view current and lets
  // past auctions populate the archive. A dateless listing stays 'active'.
  const TODAY = new Date().toISOString().slice(0, 10);
  for (const a of active) {
    if (!a.address) continue;
    const p = ensureProperty(a.address, a.kind);
    if (!p) continue;
    const isPast = a.auction_date && a.auction_date < TODAY;
    p.listings.push({
      date: a.auction_date,
      round: a.round ?? null,
      kind: a.kind,
      starting_price_pln: a.starting_price_pln,
      outcome: isPast ? 'archived' : 'active',
      area_m2: a.area_m2,
      detail_url: a.detail_url,
      wadium_deadline: a.wadium_deadline || null,
      viewing_date: a.viewing_date || null,
    });
  }
  for (const w of wykaz) {
    if (!w.address) continue;
    const p = ensureProperty(w.address, 'unknown');
    if (!p) continue;
    p.listings.push({
      date: w.published_date,
      round: null,
      kind: p.kind,
      outcome: 'announced',
      wykaz_no: w.wykaz_no,
    });
  }

  // ---- enrich with area from detail pages
  for (const [key, area] of detailAreas) {
    const p = props.get(key);
    if (!p) continue;
    if (p.area_m2 == null) p.area_m2 = area;
    for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = area;
  }
  // Fuzzy retry to bridge street-name spelling differences between the source
  // that produced the property key (e.g. Gliwice result PDFs, which use the
  // FULL street name "Karola Libelta", "Ignacego Daszyńskiego") and the
  // detail-page source of area (which uses the SHORT form "Libelta",
  // "Daszyńskiego"). Two families:
  //   (a) Polish-case suffix swaps (genitive ↔ nominative);
  //   (b) dropping a leading given-name token (full → short street name).
  const variants = (street) => {
    const out = new Set([street]);
    const subs = [
      ['ej$', 'a'], ['iej$', 'a'], ['ego$', 'y'], ['ego$', ''],
      ['skiej$', 'ska'], ['skiego$', 'ski'], ['ckiej$', 'cka'], ['ckiego$', 'cki'],
    ];
    const apply = (s) => {
      for (const [re, repl] of subs) {
        const v = s.replace(new RegExp(re), repl);
        if (v !== s) out.add(v);
      }
    };
    apply(street);
    // (b) Patronymic/given-name prefix: "karola libelta" → "libelta",
    // "ignacego daszynskiego" → "daszynskiego". Add the last word and last two
    // words as candidates (and their suffix variants).
    const words = street.split(' ').filter(Boolean);
    if (words.length > 1) {
      const last1 = words[words.length - 1];
      out.add(last1);
      apply(last1);
      if (words.length > 2) {
        const last2 = words.slice(-2).join(' ');
        out.add(last2);
        apply(last2);
      }
    }
    return [...out];
  };
  let fuzzyHits = 0;
  for (const p of props.values()) {
    if (p.area_m2 != null) continue;
    for (const altStreet of variants(p.street_norm)) {
      const altKey = `${altStreet}|${p.building}|${p.apt ?? ''}`;
      if (altKey === p.key) continue;
      const area = detailAreas.get(altKey);
      if (area != null) {
        p.area_m2 = area;
        for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = area;
        fuzzyHits++;
        break;
      }
    }
  }
  if (fuzzyHits) console.error(`  fuzzy-key area matches: ${fuzzyHits}`);

  // Propagate area across all listings of the same property.
  for (const p of props.values()) {
    const known = p.listings.find((l) => l.area_m2 != null)?.area_m2;
    if (known == null) continue;
    p.area_m2 = known;
    for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = known;
  }

  for (const p of props.values()) {
    p.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  }
  const properties = [...props.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });

  return { properties };
}
