export function listingFingerprint(l) {
  const prefix = l.outcome === 'announced' ? 'w|' : '';
  if (l.date) return prefix + l.date;
  return prefix + '|' + (l.detail_url || ('k:' + (l.kind || '')));
}

export function listingSource(l) {
  return l.detail_url || l.source_pdf || l.source_url || null;
}

const TERMINAL_RESULT_OUTCOMES = new Set(['sold', 'unsold', 'no_winner', 'cancelled']);

function isResultBackedTerminal(listing) {
  return Boolean(listing?.source_pdf) && TERMINAL_RESULT_OUTCOMES.has(listing?.outcome);
}

export function dropSupersededDateless(listings) {
  const datedSources = new Set(
    (listings || []).filter((l) => l.date && listingSource(l)).map((l) => listingSource(l)),
  );
  return (listings || []).filter(
    (l) => !(!l.date && listingSource(l) && datedSources.has(listingSource(l))),
  );
}

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

export function mergeProperties(previous, fresh) {
  const byKey = new Map();
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
      const keepPreviousResult =
        isResultBackedTerminal(previousListing) && !l.source_pdf &&
        (l.outcome === 'active' || l.outcome === 'archived');
      const primary = keepPreviousResult ? previousListing : l;
      const secondary = keepPreviousResult ? l : previousListing;

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
    for (const fpKey of merged.keys()) if (!freshFps.has(fpKey)) keptListings++;
    old.listings = [...merged.values()].sort((a, b) =>
      (a.date || '9999').localeCompare(b.date || '9999'),
    );
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

  const freshKeys = new Set((fresh || []).map((p) => p.key));
  for (const p of byKey.values()) if (!freshKeys.has(p.key)) keptProperties++;

  for (const p of byKey.values()) p.listings = dropSupersededDateless(p.listings);

  const properties = [...byKey.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });

  return { properties, stats: { kept_properties: keptProperties, kept_listings: keptListings } };
}
