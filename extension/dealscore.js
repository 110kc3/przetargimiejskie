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

  function buildCityMedians(properties, minSample) {
    minSample = minSample || MIN_SAMPLE;
    const byCity = new Map();
    for (const p of properties || []) {
      const city = p.city;
      if (!city) continue;
      for (const l of p.listings || []) {
        const area = l.area_m2 ?? p.area_m2;
        const price = l.starting_price_pln;
        if (price == null || !area || l.share || p.share) continue;
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

  function score(price, area, kind, cityMedian, share = null) {
    if (share || price == null || !area || !isResidential(kind)) return null;
    if (!cityMedian || !cityMedian.median) return null;
    const zlM2 = price / area;
    const raw = ((zlM2 - cityMedian.median) / cityMedian.median) * 100;
    const pct = Math.round(Math.abs(raw));
    if (pct < 1) return null;
    return { zlM2, median: cityMedian.median, pct, below: raw < 0 };
  }

  window.ZGM_DEALSCORE = { buildCityMedians, score, median, isResidential };
})();
