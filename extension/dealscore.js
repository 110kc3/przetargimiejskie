// Deal score — how a listing's zł/m² compares to the local (per-city) median.
//
// The pipeline already gives us starting price + area per listing; the median
// zł/m² for a city is the cheap, defensible "is this cheap for here?" signal
// that the popup and the on-page chip surface. Public records stay public — we
// just do the arithmetic the user would otherwise do in their head.
//
// Exposes window.ZGM_DEALSCORE:
//   buildCityMedians(properties, minSample?) -> Map<city, {median, n}>
//   score(price, area, kind, cityMedian)     -> {zlM2, median, pct, below} | null
//
// Notes:
//   - Residential only (mieszkalny / unknown). Garages and commercial units
//     have wildly different zł/m² and would poison a flat-price median.
//   - minSample (default 5): a city with too few priced flats has no
//     meaningful median, so it gets no badge rather than a noisy one.
//   - Works in both the popup (window) and a content script (window) — plain
//     IIFE, no module system, no deps.

(function () {
  const MIN_SAMPLE = 5;

  function isResidential(kind) {
    return kind == null || kind === 'mieszkalny' || kind === 'unknown';
  }

  function median(nums) {
    if (!nums || !nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // Map city -> { median, n } over every priced residential listing.
  function buildCityMedians(properties, minSample) {
    minSample = minSample || MIN_SAMPLE;
    const byCity = new Map();
    for (const p of properties || []) {
      const city = p.city;
      if (!city) continue;
      for (const l of p.listings || []) {
        const area = l.area_m2 ?? p.area_m2;
        const price = l.starting_price_pln;
        if (price == null || !area) continue;
        if (!isResidential(l.kind ?? p.kind)) continue;
        if (!byCity.has(city)) byCity.set(city, []);
        byCity.get(city).push(price / area);
      }
    }
    const out = new Map();
    for (const [city, vals] of byCity) {
      if (vals.length >= minSample) out.set(city, { median: median(vals), n: vals.length });
    }
    return out;
  }

  // cityMedian is the {median, n} for THIS listing's city (or undefined).
  function score(price, area, kind, cityMedian) {
    if (price == null || !area || !isResidential(kind)) return null;
    if (!cityMedian || !cityMedian.median) return null;
    const zlM2 = price / area;
    const raw = ((zlM2 - cityMedian.median) / cityMedian.median) * 100;
    const pct = Math.round(Math.abs(raw));
    if (pct < 1) return null; // within ~1% of median — not worth a badge
    return { zlM2, median: cityMedian.median, pct, below: raw < 0 };
  }

  window.ZGM_DEALSCORE = { buildCityMedians, score, median, isResidential };
})();
