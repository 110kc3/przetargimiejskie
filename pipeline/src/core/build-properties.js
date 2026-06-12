// Merges parsed result records + active listings + wykaz announcements into
// the one-entry-per-property structure the extension consumes, then enriches
// each property with unit area from the detail-page crawl.
//
// City-agnostic: it takes already-crawled, already-parsed inputs and returns
// the `properties` array. Extracted verbatim from refresh.js — the per-city
// refactor changes file layout only, not behaviour.

// Polish-case street-suffix swaps (genitive ↔ nominative): "Staromiejskiej" ↔
// "Staromiejska", "Daszyńskiego" ↔ "Daszyński". Used both to bridge property
// IDENTITY (the results PDF and the announcement spell the same street in
// different cases — without this, one flat becomes two properties and the
// history/round linkage is lost) and to fuzzy-match detail-page area keys.
const SUFFIX_SUBS = [
  ['ej$', 'a'], ['iej$', 'a'], ['ego$', 'y'], ['ego$', ''],
  ['skiej$', 'ska'], ['skiego$', 'ski'], ['ckiej$', 'cka'], ['ckiego$', 'cki'],
];

/** Case-suffix variants of a normalized street name (family a only). */
function streetSuffixVariants(street) {
  const out = new Set();
  for (const [re, repl] of SUFFIX_SUBS) {
    const v = street.replace(new RegExp(re), repl);
    if (v !== street) out.add(v);
  }
  return [...out];
}

/**
 * Merge properties whose keys differ ONLY by a street case-suffix variant
 * (same building + apt). The genitive-keyed property is folded into the
 * nominative-keyed one (the suffix subs map genitive → nominative), so no
 * standalone key is ever renamed — only same-run splits are healed.
 */
export function coalesceStreetVariants(props) {
  for (const p of [...props.values()]) {
    for (const alt of streetSuffixVariants(p.street_norm)) {
      const altKey = `${alt}|${p.building}|${p.apt ?? ''}`;
      const target = props.get(altKey);
      if (!target || target === p) continue;
      target.listings.push(...p.listings);
      if (target.kind === 'unknown' && p.kind && p.kind !== 'unknown') target.kind = p.kind;
      if (target.apt == null) target.apt = p.apt;
      if (target.area_m2 == null && p.area_m2 != null) target.area_m2 = p.area_m2;
      props.delete(p.key);
      console.error(`  coalesced street variant: ${p.key} → ${altKey}`);
      break;
    }
  }
}

/**
 * One auction event per property per date — a single unit cannot be auctioned
 * twice on the same day. Cities with TWO streams (Katowice: results PDF +
 * announcement archive) surface the same auction in both; without this the
 * announcement row either replaced the result record in merge-history (same
 * fingerprint) or survived next to it and inflated the derived round.
 * The result-backed row (has source_pdf, i.e. a concluded outcome) wins;
 * missing fields are back-filled from the other row.
 */
export function dedupeListingsByDate(p) {
  const byDate = new Map();
  const out = [];
  for (const l of p.listings) {
    if (!l.date || l.outcome === 'announced') {
      out.push(l);
      continue;
    }
    const prev = byDate.get(l.date);
    if (!prev) {
      byDate.set(l.date, l);
      out.push(l);
      continue;
    }
    const [primary, secondary] = prev.source_pdf || !l.source_pdf ? [prev, l] : [l, prev];
    for (const k of [
      'round', 'starting_price_pln', 'area_m2', 'detail_url', 'bip_url',
      'wadium_deadline', 'viewing_date',
    ]) {
      if (primary[k] == null && secondary[k] != null) primary[k] = secondary[k];
    }
    if ((primary.kind == null || primary.kind === 'unknown') && secondary.kind && secondary.kind !== 'unknown') {
      primary.kind = secondary.kind;
    }
    if (primary !== prev) {
      out[out.indexOf(prev)] = primary;
      byDate.set(l.date, primary);
    }
  }
  p.listings = out;
}

/**
 * Heal street case-variant DUPLICATES in an already-built properties ARRAY —
 * the post-merge counterpart of coalesceStreetVariants. buildCityData
 * coalesces within one run, but mergeProperties re-seeds every key from the
 * previously-committed file, so a genitive key written by an OLD run (before
 * a parser fix, or when its nominative twin wasn't visible that run) is
 * resurrected forever — e.g. "sportowej|6|2" duplicating "sportowa|6|2" with
 * the same sold auction in both. Run this on the post-merge array; listings
 * folded together are then deduped per date.
 * @param {Array} properties
 * @returns {Array} healed array (same objects, zombie variants folded in)
 */
export function healStreetVariants(properties) {
  const map = new Map((properties || []).map((p) => [p.key, p]));
  coalesceStreetVariants(map);
  for (const p of map.values()) {
    dedupeListingsByDate(p);
    p.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  }
  return [...map.values()];
}

/**
 * Today's date in Europe/Warsaw as "YYYY-MM-DD". The UTC-based
 * `toISOString().slice(0,10)` lags the Polish civil date by 1-2 hours around
 * midnight, keeping yesterday's auctions 'active' one extra cycle.
 * (en-CA locale formats as YYYY-MM-DD.)
 */
export function todayWarsaw() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

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
      // Fractional-share sale ("udziału 4/6 części") — present only on share
      // listings; carried so the archive can flag the share price as such.
      ...(r.share ? { share: r.share } : {}),
    });
  }
  // A listing crawled from a "currently active" source is only really active
  // if its auction date hasn't passed. Announcement-only cities (Bytom, Zabrze)
  // surface years of past auctions whose date is in the past — those concluded
  // (with an outcome the city doesn't publish), so we mark them 'archived'
  // rather than 'active'. This keeps the popup's active view current and lets
  // past auctions populate the archive. A dateless listing stays 'active'.
  const TODAY = todayWarsaw();
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
      // Secondary "verify at the source" link: a city-BIP page for an auction
      // whose primary row is the ZGM listing (see gliwice foldBipDuplicates).
      ...(a.bip_url ? { bip_url: a.bip_url } : {}),
      ...(a.source ? { source: a.source } : {}),
      ...(a.share ? { share: a.share } : {}),
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

  // Heal same-run splits/duplicates BEFORE enrichment and round derivation:
  // first fold street case-variant properties together, then collapse the
  // same auction seen from two streams into one listing.
  coalesceStreetVariants(props);
  for (const p of props.values()) dedupeListingsByDate(p);

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
    const apply = (s) => {
      for (const v of streetSuffixVariants(s)) out.add(v);
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

    // Derive the auction round from history when the source didn't state it
    // (e.g. Gliwice publishes "II ustny przetarg" on the page but the data has
    // no explicit round). Walking the property's attempts oldest-first, each
    // successive auction is the next round — so a flat with one prior attempt is
    // round 2 (II przetarg), matching the city's own wording and the extension's
    // "1 poprzednia próba". Explicit rounds (cities that parse them) are kept and
    // keep the counter aligned; wykaz pre-announcements aren't attempts.
    let attempt = 0;
    for (const l of p.listings) {
      if (l.outcome === 'announced') continue;
      attempt++;
      if (l.round == null) l.round = attempt;
      else attempt = l.round;
    }
  }
  const properties = [...props.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });

  return { properties };
}
