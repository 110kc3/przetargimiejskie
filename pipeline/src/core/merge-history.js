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
//     the FRESH copy normally replaces the old one — so corrections propagate
//     (a fixed area/price, an 'active' that became 'sold', a now-derived round)
//     without creating a duplicate. One exception is durable outcome evidence:
//     an old result-backed terminal row beats a fresh active/archive-board row
//     that has no result document. This covers boards that keep a concluded
//     auction visible after its result PDF has entered the known-document cache.
//     A missing secondary BIP URL or owner-scope marker is retained because those
//     facts may come from a source no longer on the live board. Events only in
//     the OLD data (gone upstream) are frozen at last-seen.
//     (Price, outcome AND round are deliberately NOT in
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

const TERMINAL_RESULT_OUTCOMES = new Set(['sold', 'unsold', 'no_winner', 'cancelled']);

/** A concluded row supported by a result document, rather than inferred only
 * from an announcement disappearing or its date passing. */
function isResultBackedTerminal(listing) {
  return Boolean(listing?.source_pdf) && TERMINAL_RESULT_OUTCOMES.has(listing?.outcome);
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
 * Close every retained active listing after an adapter has positively verified
 * that its authoritative live source contains no in-scope records. This is the
 * dateless counterpart to archivePastActive(): without it, an old listing whose
 * source never exposed an auction date would survive a valid-empty refresh as
 * active forever.
 * @param {Array} properties
 * @returns {number} count of reclassified listings
 */
export function archiveAllActive(properties) {
  let n = 0;
  for (const p of properties || []) {
    for (const l of p.listings || []) {
      if (l.outcome === 'active') {
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
    // Union listings by fingerprint; fresh normally overwrites a matching old event.
    const merged = new Map();
    for (const l of old.listings) merged.set(listingFingerprint(l), l);
    const freshFps = new Set((fp.listings || []).map(listingFingerprint));
    for (const l of fp.listings || []) {
      const fingerprint = listingFingerprint(l);
      const previousListing = merged.get(fingerprint);
      if (!previousListing) {
        merged.set(fingerprint, l);
        continue;
      }
      // Fresh values normally remain authoritative. A cached result document is
      // deliberately not reparsed on every run, though, and some boards retain
      // the concluded announcement. Do not let that weaker active/archived row
      // erase a previously parsed terminal result.
      const keepPreviousResult =
        isResultBackedTerminal(previousListing) && !l.source_pdf &&
        (l.outcome === 'active' || l.outcome === 'archived');
      const primary = keepPreviousResult ? previousListing : l;
      const secondary = keepPreviousResult ? l : previousListing;

      // These are durable scope/provenance facts often learned from a secondary
      // city-BIP stream. The board may disappear from a later crawl while the
      // result PDF remains; retaining the facts keeps the frozen event sourced.
      // dropping its URL or State Treasury marker would silently change a frozen
      // report's source and owner scope even though it is the same dated event.
      merged.set(fingerprint, {
        ...primary,
        ...(primary.detail_url == null && secondary.detail_url != null
          ? { detail_url: secondary.detail_url }
          : {}),
        ...(primary.area_m2 == null && secondary.area_m2 != null
          ? { area_m2: secondary.area_m2 }
          : {}),
        ...(primary.land_area_m2 == null && secondary.land_area_m2 != null
          ? { land_area_m2: secondary.land_area_m2 }
          : {}),
        ...(primary.bip_url == null && secondary.bip_url != null
          ? { bip_url: secondary.bip_url }
          : {}),
        ...(primary.owner_type == null && secondary.owner_type != null
          ? { owner_type: secondary.owner_type }
          : {}),
      });
    }
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
