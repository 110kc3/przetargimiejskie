import { nominativeStreetDisplay } from './normalize.js';
import { normalizeKind } from './classify-kind.js';

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
  const byDateless = new Map(); // collapse byte-identical dateless rows (no date key)
  const out = [];
  for (const l of p.listings) {
    // Wykaz pre-announcements are intents, not auction events — never dedupe them.
    if (l.outcome === 'announced') {
      out.push(l);
      continue;
    }
    if (!l.date) {
      // No date to key on, so collapse only TRULY identical dateless rows (same
      // kind + outcome + starting price + detail_url) — two streams can emit the
      // same dateless auction (observed: katowice gorna|4| had two identical
      // dateless active rows). Distinct dateless listings (different price/url)
      // still coexist; missing fields are back-filled from the duplicate.
      const fp = [l.kind || '', l.outcome || '', l.starting_price_pln ?? '', l.detail_url || ''].join('|');
      const prevDl = byDateless.get(fp);
      if (!prevDl) {
        byDateless.set(fp, l);
        out.push(l);
        continue;
      }
      for (const k of [
        'round', 'area_m2', 'land_area_m2', 'detail_url',
        'bip_url', 'wadium_deadline', 'viewing_date', 'source_pdf', 'final_price_pln',
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
    for (const k of [
      'round', 'starting_price_pln', 'area_m2', 'land_area_m2', 'detail_url',
      'bip_url', 'wadium_deadline', 'viewing_date',
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
  const healed = [...map.values()];
  applyDisplayStreets(healed);
  healPlotAreas(healed);
  return healed;
}

/**
 * Migrate plot/building totals out of the flat-area field, in place. A
 * mieszkalny/unknown property cannot have a 300+ m² unit — such a value is a
 * parcel or building total that an older parser published (and that
 * mergeProperties re-imports from the committed file on EVERY run, which is
 * why this lives in the post-merge heal and not only in the parsers). The CI
 * sanity gate fails on exactly these, so without this hook one bad historical
 * value would block a city's refresh forever.
 * @param {Array} properties
 */
export function healPlotAreas(properties) {
  const MAX_FLAT_M2 = 300;
  // mieszkalny/unknown are flats (a >300 m² value is a parcel/building total).
  // zabudowana (house) is reconciled from listings (see buildCityData) and its
  // area_m2 is likewise a building/plot total, not usable floor area — heal it
  // too so zł/m² is never computed off a plot. uzytkowy/garaz can legitimately
  // be large, and grunt has its own land handling, so those are left alone.
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

/**
 * Coerce every property- and listing-level `kind` to the canonical
 * vocabulary (classify-kind's normalizeKind). mergeProperties re-seeds each
 * key from the previously-committed file, so a non-canonical kind an OLD run
 * published (e.g. "zabudowa", a truncated "zabudowana") is otherwise
 * resurrected on every run — leaking the raw value into the extension/site TYP
 * column and excluding the row from the houses filter. Runs on the POST-merge
 * array, mirroring healPlotAreas. Mutates in place; returns the heal count.
 * @param {Array} properties
 * @returns {number}
 */
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

/**
 * Display-only street naming over a built properties array. Two rules:
 *   1. Unambiguous adjectival genitive endings flip via
 *      nominativeStreetDisplay ("Sportowej" → "Sportowa").
 *   2. -skiej/-ckiej/-dzkiej (ambiguous with female-patron surnames) flip
 *      ONLY when the dataset itself contains the nominative twin street —
 *      evidence the name is adjectival ("Częstochowskiej" + a property on
 *      "Częstochowska" elsewhere), never for "Skłodowskiej"-style patrons.
 * Keys and street_norm are untouched (presentation only).
 */
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

/**
 * Today's date in Europe/Warsaw as "YYYY-MM-DD". The UTC-based
 * `toISOString().slice(0,10)` lags the Polish civil date by 1-2 hours around
 * midnight, keeping yesterday's auctions 'active' one extra cycle.
 *
 * Assembled from formatToParts rather than an `en-CA` format string: on a
 * small-ICU Node build (e.g. Debian/apt Node on the RPi5 self-hosted runner)
 * only `en-US` locale data ships, so `en-CA` silently falls back to US
 * "MM/DD/YYYY" and this returned garbage. The timezone conversion still works
 * (tz data is bundled independently of locale data), so reading numeric parts
 * and formatting them ourselves is locale-independent and correct everywhere.
 */
export function todayWarsaw() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
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
      // Whole-property sales: plot/building total — kept separate from the
      // unit area so zł/m² is never computed from a 1 920 m² plot.
      ...(r.land_area_m2 != null ? { land_area_m2: r.land_area_m2 } : {}),
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
  let activeDroppedNoAddress = 0;
  for (const a of active) {
    if (!a.address) { activeDroppedNoAddress++; continue; }
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
      ...(a.land_area_m2 != null ? { land_area_m2: a.land_area_m2 } : {}),
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
  // A crawled active listing with no parsed `.address` can't be keyed, so it's
  // silently dropped above — which is exactly how an adapter that forgets to
  // attach parseAddress() lands 0 unique_properties despite N active cards
  // (walbrzych + gniezno, 2026-07). An occasional unparseable address is fine;
  // ALL of them dropping means the adapter is broken — so surface the count.
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

  // Heal same-run splits/duplicates BEFORE enrichment and round derivation:
  // first fold street case-variant properties together, then collapse the
  // same auction seen from two streams into one listing.
  coalesceStreetVariants(props);
  for (const p of props.values()) dedupeListingsByDate(p);

  // Reconcile each property's kind with its listings. ensureProperty froze the
  // kind from whichever record FIRST created the property (often a wykaz/result
  // row tagged 'unknown', or a stream that disagrees with the others); when its
  // listings settle on a more specific kind, adopt the most-recent dated
  // non-unknown one so property-keyed views (the houses/land filters, the
  // summary tiles) agree with the row's own TYP column. (Observed: a katowice
  // flat read 'mieszkalny' at property level while every listing was 'zabudowana'.)
  for (const p of props.values()) {
    const dated = p.listings
      .filter((l) => l.date && l.kind && l.kind !== 'unknown' && l.outcome !== 'announced')
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const best = dated.length
      ? dated[dated.length - 1].kind
      : p.listings.find((l) => l.kind && l.kind !== 'unknown' && l.outcome !== 'announced')?.kind;
    if (best && best !== p.kind) p.kind = best;
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
  applyDisplayStreets(properties);

  return { properties };
}
