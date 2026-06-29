// History accumulation: merge a freshly-crawled `properties` array with the
// previously-committed one so the dataset is monotonic — a property or listing
// that the source later removes is RETAINED rather than lost.
//
// Rationale: the crawl only ever sees what the municipal site currently
// publishes. Auctions roll off the board, result documents get unpublished,
// active listings conclude and disappear. Without this merge, each refresh
// would overwrite data/<city>/properties.json with only the currently-visible
// records and silently drop everything else. Merging against the last commit
// turns properties.json into an append-only archive.
//
// Merge rules:
//   - Properties are unioned by `key`. A property present only in the OLD data
//     (gone upstream) is kept as-is.
//   - Listings within a property are unioned by a fingerprint (date; kind only
//     for dateless rows) — one auction event per property/date. When the SAME
//     event is seen in both,
//     the FRESH copy fully REPLACES the old one — so corrections propagate (a
//     fixed area/price, an 'active' that became 'sold', a now-derived round)
//     without creating a duplicate. Events only in the OLD data (gone upstream)
//     are frozen at last-seen. (Price, outcome AND round are deliberately NOT in
//     the fingerprint: price/outcome get corrected on re-crawl, and `round` is a
//     value DERIVED from history — including it once caused old null-round rows
//     and new derived-round rows to both survive, doubling every historical row.)
//   - Property-level fields prefer the fresh non-null value; a known area is
//     propagated to any listing missing it.
//
// Escape hatch: delete data/<city>/properties.json (or run with
// MERGE_HISTORY=0) to rebuild that city from scratch — useful after a parser
// fix, so a past bad run doesn't stay frozen in the archive forever.

/** Stable identity for one auction event within a property: the DATE.
 * A single unit cannot be auctioned twice on the same day, and `kind` is
 * parsed differently by different streams of the same city (Katowice result
 * PDF: 'unknown' vs announcement: 'mieszkalny') — including kind made the two
 * spellings of one event coexist as duplicates. Price, outcome AND round are
 * likewise excluded so a re-crawl corrects them in place instead of producing
 * a duplicate row (`round` is DERIVED from history — including it once doubled
 * every historical row when derivation started filling null rounds). Dateless
 * rows fall back to kind so distinct dateless listings don't collapse. */
export function listingFingerprint(l) {
  // Wykaz pre-announcements are dated by PUBLICATION, not auction — keep them
  // from colliding with a same-day auction row.
  const prefix = l.outcome === 'announced' ? 'w|' : '';
  if (l.date) return prefix + l.date;
  // Dateless rows have no date to key on. Prefer detail_url as the stable
  // per-listing identity so two genuinely-different dateless listings on one
  // property don't collide (and collapse to one) on kind alone; fall back to
  // kind when there's no url. Price/outcome stay OUT so a re-crawl still
  // corrects a dateless row in place rather than duplicating it (see header).
  return prefix + '|' + (l.detail_url || ('k:' + (l.kind || '')));
}

/** The stable source-document identity of a listing (the announcement/result
 * page or attachment it was parsed from), or null if unknown. */
export function listingSource(l) {
  return l.detail_url || l.source_pdf || l.source_url || null;
}

/** Collapse "null-twin" duplicates within one property's listings: drop a
 * DATELESS listing when a DATED listing parsed from the SAME source document
 * exists. The dateless row is a superseded pre-date version of the same event
 * (e.g. after a parser fix learned the auction date); it has a different
 * fingerprint (detail_url vs date) so the plain union keeps both. Listings with
 * no source id, or with no dated twin from the same source, are untouched. */
export function dropSupersededDateless(listings) {
  const datedSources = new Set(
    (listings || []).filter((l) => l.date && listingSource(l)).map((l) => listingSource(l)),
  );
  return (listings || []).filter(
    (l) => !(!l.date && listingSource(l) && datedSources.has(listingSource(l))),
  );
}

/**
 * Reclassify past-dated 'active' listings as 'archived'. buildCityData does
 * this for FRESHLY-crawled listings only — a listing the source removed before
 * its auction concluded is retained by the merge frozen at 'active' forever,
 * permanently inflating meta.active_auctions. Run this on the post-merge
 * properties so retained rows age out too. Dateless listings stay 'active'.
 * @param {Array} properties
 * @param {string} todayIso  "YYYY-MM-DD"
 * @returns {number} count of reclassified listings
 */
export function archivePastActive(properties, todayIso) {
  let n = 0;
  for (const p of properties || []) {
    for (const l of p.listings || []) {
      if (l.outcome === 'active' && l.date && l.date < todayIso) {
        l.outcome = 'archived';
        n++;
      }
    }
  }
  return n;
}

/**
 * @param {Array} previous  properties[] from the last committed file ([] if none)
 * @param {Array} fresh      properties[] just built from the current crawl
 * @returns {{ properties: Array, stats: { kept_properties:number, kept_listings:number } }}
 */
export function mergeProperties(previous, fresh) {
  const byKey = new Map();
  // Seed with previous (deep-ish copy of the bits we mutate).
  for (const p of previous || []) {
    byKey.set(p.key, { ...p, listings: [...(p.listings || [])] });
  }

  let keptProperties = 0;
  let keptListings = 0;

  for (const fp of fresh || []) {
    const old = byKey.get(fp.key);
    if (!old) {
      byKey.set(fp.key, { ...fp, listings: [...(fp.listings || [])] });
      continue;
    }
    // Union listings by fingerprint; fresh overwrites a matching old event.
    const merged = new Map();
    for (const l of old.listings) merged.set(listingFingerprint(l), l);
    const freshFps = new Set((fp.listings || []).map(listingFingerprint));
    for (const l of fp.listings || []) merged.set(listingFingerprint(l), l);
    // listings retained only from old (not re-seen in this crawl)
    for (const fpKey of merged.keys()) if (!freshFps.has(fpKey)) keptListings++;
    old.listings = [...merged.values()].sort((a, b) =>
      (a.date || '9999').localeCompare(b.date || '9999'),
    );
    // Property-level fields: prefer fresh non-null.
    old.kind = fp.kind || old.kind;
    old.street = fp.street || old.street;
    old.street_norm = fp.street_norm || old.street_norm;
    old.building = fp.building || old.building;
    old.apt = fp.apt ?? old.apt;
    old.area_m2 = fp.area_m2 ?? old.area_m2;
    if (old.area_m2 != null) {
      for (const l of old.listings) if (l.area_m2 == null) l.area_m2 = old.area_m2;
    }
  }

  // Count what survived only because of the merge (present in old, not fresh).
  const freshKeys = new Set((fresh || []).map((p) => p.key));
  for (const p of byKey.values()) if (!freshKeys.has(p.key)) keptProperties++;

  // Collapse null-twin duplicates: a dateless row superseded by a dated row from
  // the same source document (e.g. a parser fix that later learned the date).
  for (const p of byKey.values()) p.listings = dropSupersededDateless(p.listings);

  const properties = [...byKey.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });

  return { properties, stats: { kept_properties: keptProperties, kept_listings: keptListings } };
}
// (listing identity = date, kind only as dateless fallback; round excluded — derived, see header.)
