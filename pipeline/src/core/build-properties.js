import { nominativeStreetDisplay } from './normalize.js';
import { normalizeKind } from './classify-kind.js';


const SUFFIX_SUBS = [
  ['ej$', 'a'], ['iej$', 'a'], ['ego$', 'y'], ['ego$', ''],
  ['skiej$', 'ska'], ['skiego$', 'ski'], ['ckiej$', 'cka'], ['ckiego$', 'cki'],
];

function streetSuffixVariants(street) {
  const out = new Set();
  for (const [re, repl] of SUFFIX_SUBS) {
    const v = street.replace(new RegExp(re), repl);
    if (v !== street) out.add(v);
  }
  return [...out];
}

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

export function dedupeListingsByDate(p) {
  const byDate = new Map();
  const byDateless = new Map();
  const out = [];
  for (const l of p.listings) {
    if (l.outcome === 'announced') {
      out.push(l);
      continue;
    }
    if (!l.date) {
      const fp = [l.kind || '', l.outcome || '', l.starting_price_pln ?? '', l.detail_url || ''].join('|');
      const prevDl = byDateless.get(fp);
      if (!prevDl) {
        byDateless.set(fp, l);
        out.push(l);
        continue;
      }
      for (const k of [
        'round', 'area_m2', 'land_area_m2', 'detail_url',
        'bip_url', 'wadium_deadline', 'viewing_date', 'source_pdf', 'final_price_pln', 'owner_type',
      ]) {
        if (prevDl[k] == null && l[k] != null) prevDl[k] = l[k];
      }
      continue;
    }
    const prev = byDate.get(l.date);
    if (!prev) {
      byDate.set(l.date, l);
      out.push(l);
      continue;
    }
    const [primary, secondary] = prev.source_pdf || !l.source_pdf ? [prev, l] : [l, prev];
    const primaryRoundSource = roundSource(primary);
    const secondaryRoundSource = roundSource(secondary);
    if (
      secondary.round != null &&
      secondaryRoundSource === 'explicit' &&
      primaryRoundSource !== 'explicit'
    ) {
      primary.round = secondary.round;
      primary.round_source = 'explicit';
    } else if (primary.round == null && secondary.round != null) {
      primary.round = secondary.round;
      if (secondaryRoundSource) primary.round_source = secondaryRoundSource;
    }
    for (const k of [
      'starting_price_pln', 'area_m2', 'land_area_m2', 'detail_url',
      'bip_url', 'wadium_deadline', 'viewing_date', 'owner_type',
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

function roundSource(listing) {
  const marker = String(listing?.round_source ?? listing?.round_provenance ?? '').toLowerCase();
  if (
    listing?.round_inferred === true ||
    marker === 'inferred' || marker === 'derived' || marker === 'history'
  ) return 'inferred';
  if (
    listing?.round_explicit === true || listing?.round_inferred === false ||
    marker === 'explicit' || marker === 'source' || marker === 'source-stated'
  ) return 'explicit';
  return null;
}

export function deriveAuctionRounds(property) {
  property.listings.sort((left, right) =>
    (left.date || '9999').localeCompare(right.date || '9999'));
  let attempt = 0;
  for (const listing of property.listings) {
    if (listing.outcome === 'announced') continue;
    const nextAttempt = attempt + 1;
    const source = roundSource(listing);
    const validRound = Number.isInteger(listing.round) && listing.round > 0;
    if (validRound && source !== 'inferred') {
      attempt = listing.round;
      if (source === 'explicit') listing.round_source = 'explicit';
      continue;
    }
    listing.round = nextAttempt;
    listing.round_source = 'inferred';
    attempt = nextAttempt;
  }
  return property;
}

export function syncActiveListingRounds(active, properties, { inferUnmarked = false } = {}) {
  const byKey = new Map(properties.map((property) => [property.key, property]));
  for (const listing of active) {
    if (!listing.address) continue;
    const source = roundSource(listing);
    const legacyInferred =
      inferUnmarked && source == null && listing.round != null && listing.source !== 'bip';
    if (listing.round != null && source !== 'inferred' && !legacyInferred) continue;
    const property = byKey.get(listing.address.key);
    if (!property) continue;
    const event = property.listings.find((candidate) =>
      candidate.outcome === 'active' &&
      (!listing.auction_date || candidate.date === listing.auction_date));
    if (!event || event.round == null) continue;
    listing.round = event.round;
    listing.round_source = roundSource(event) || 'inferred';
  }
}

export function healStreetVariants(properties) {
  const map = new Map((properties || []).map((p) => [p.key, p]));
  coalesceStreetVariants(map);
  for (const p of map.values()) {
    dedupeListingsByDate(p);
    p.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  }
  const healed = [...map.values()];
  applyDisplayStreets(healed);
  healPlotAreas(healed);
  return healed;
}

export function healPlotAreas(properties) {
  const MAX_FLAT_M2 = 300;
  const HEAL_KINDS = new Set(['mieszkalny', 'unknown', 'zabudowana']);
  for (const p of properties) {
    if (!HEAL_KINDS.has(p.kind)) continue;
    if (p.area_m2 != null && p.area_m2 > MAX_FLAT_M2) {
      p.land_area_m2 = p.land_area_m2 ?? p.area_m2;
      p.area_m2 = null;
    }
    for (const l of p.listings) {
      if (l.area_m2 != null && l.area_m2 > MAX_FLAT_M2) {
        l.land_area_m2 = l.land_area_m2 ?? l.area_m2;
        l.area_m2 = null;
        console.error(`  plot-area healed: ${p.key} ${l.date || ''} ${l.land_area_m2} m² → land_area_m2`);
      }
    }
  }
}

export function healKinds(properties) {
  let n = 0;
  for (const p of properties || []) {
    if (p.kind != null) {
      const pk = normalizeKind(p.kind);
      if (pk !== p.kind) {
        console.error(`  kind healed: ${p.key} '${p.kind}' \u2192 '${pk}'`);
        p.kind = pk;
        n++;
      }
    }
    for (const l of p.listings || []) {
      if (l.kind == null) continue;
      const lk = normalizeKind(l.kind);
      if (lk !== l.kind) {
        console.error(`  kind healed: ${p.key} ${l.date || ''} '${l.kind}' \u2192 '${lk}'`);
        l.kind = lk;
        n++;
      }
    }
  }
  return n;
}

export function applyDisplayStreets(properties) {
  const byNorm = new Map();
  for (const p of properties) if (!byNorm.has(p.street_norm)) byNorm.set(p.street_norm, p);
  for (const p of properties) {
    p.street = nominativeStreetDisplay(p.street);
    if (/[\s-]/.test(p.street) || !/(skiej|ckiej|dzkiej)$/i.test(p.street)) continue;
    for (const alt of streetSuffixVariants(p.street_norm)) {
      if (alt === p.street_norm) continue;
      const twin = byNorm.get(alt);
      if (twin && !/[\s-]/.test(twin.street)) {
        p.street = twin.street;
        break;
      }
    }
  }
}

export function todayWarsaw() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

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
      ...(r.round_source ? { round_source: r.round_source } : {}),
      ...(r.round_inferred === true ? { round_inferred: true } : {}),
      kind: r.kind,
      starting_price_pln: r.starting_price_pln,
      outcome: r.outcome,
      ...(r.outcome_evidence ? { outcome_evidence: r.outcome_evidence } : {}),
      unsold_reason: r.unsold_reason,
      final_price_pln: r.final_price_pln,
      source_pdf: r.source_pdf,
      notes: r.notes,
      ...(r.area_m2 != null ? { area_m2: r.area_m2 } : {}),
      ...(r.land_area_m2 != null ? { land_area_m2: r.land_area_m2 } : {}),
      ...(r.share ? { share: r.share } : {}),
    });
  }
  const TODAY = todayWarsaw();
  let activeDroppedNoAddress = 0;
  for (const a of active) {
    if (!a.address) { activeDroppedNoAddress++; continue; }
    const p = ensureProperty(a.address, a.kind);
    if (!p) continue;
    const isPast = a.auction_date && a.auction_date < TODAY;
    p.listings.push({
      date: a.auction_date,
      round: a.round ?? null,
      ...(a.round_source
        ? { round_source: a.round_source }
        : a.source === 'bip' && a.round != null
          ? { round_source: 'explicit' }
          : {}),
      ...(a.round_inferred === true ? { round_inferred: true } : {}),
      kind: a.kind,
      starting_price_pln: a.starting_price_pln,
      outcome: isPast ? 'archived' : 'active',
      area_m2: a.area_m2,
      ...(a.land_area_m2 != null ? { land_area_m2: a.land_area_m2 } : {}),
      detail_url: a.detail_url,
      wadium_deadline: a.wadium_deadline || null,
      viewing_date: a.viewing_date || null,
      ...(a.bip_url ? { bip_url: a.bip_url } : {}),
      ...(a.source ? { source: a.source } : {}),
      ...(a.owner_type ? { owner_type: a.owner_type } : {}),
      ...(a.share ? { share: a.share } : {}),
    });
  }
  if (activeDroppedNoAddress) {
    console.error(`  WARN: buildCityData dropped ${activeDroppedNoAddress}/${active.length} active listing(s) with no parsed .address — adapter should attach parseAddress()`);
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

  coalesceStreetVariants(props);
  for (const p of props.values()) dedupeListingsByDate(p);

  for (const p of props.values()) {
    const dated = p.listings
      .filter((l) => l.date && l.kind && l.kind !== 'unknown' && l.outcome !== 'announced')
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const best = dated.length
      ? dated[dated.length - 1].kind
      : p.listings.find((l) => l.kind && l.kind !== 'unknown' && l.outcome !== 'announced')?.kind;
    if (best && best !== p.kind) p.kind = best;
  }

  for (const [key, area] of detailAreas) {
    const p = props.get(key);
    if (!p) continue;
    if (p.area_m2 == null) p.area_m2 = area;
    for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = area;
  }
  const variants = (street) => {
    const out = new Set([street]);
    const apply = (s) => {
      for (const v of streetSuffixVariants(s)) out.add(v);
    };
    apply(street);
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

  for (const p of props.values()) {
    const known = p.listings.find((l) => l.area_m2 != null)?.area_m2;
    if (known == null) continue;
    p.area_m2 = known;
    for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = known;
  }

  for (const p of props.values()) {
    deriveAuctionRounds(p);
  }
  const properties = [...props.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });
  applyDisplayStreets(properties);

  return { properties };
}
