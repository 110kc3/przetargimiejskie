# TODO

> Wave-2 work (Katowice SharePoint crawler + yearly-summary parser +
> per-site adapter registry + branding cleanup + year filter) shipped in
> v1.2.0 — see [CHANGELOG.md](./CHANGELOG.md). Items below are the
> remaining backlog.

## Pipeline

### City-namespaced keys in the data files

[EXPANSION.md §1.5](./EXPANSION.md) wants the property key namespaced at the
*pipeline* layer (`city|street|building|apt`) with `schema_version: 2`,
instead of the current `street|building|apt` + late-namespacing inside
`extension/background.js` `mergeCityPayloads()`. Pure tidying — only matters
once a third city lands, because today's two-city setup works fine with the
extension-side namespacing. Touches `core/build-properties.js`,
`refresh.js`, and the extension's `background.js` migration code (which can
then be deleted once everyone's on the new schema).

### Per-city CI matrix in `refresh.yml`

`.github/workflows/refresh.yml` runs a single job that walks all cities
sequentially. Switch to a `strategy.matrix` over the city registry so a
Bytom parser break doesn't block the Gliwice / Katowice refresh. Each job
commits its own `data/<city>/`. Bonus: the per-city run time becomes
visible in the Actions UI.

### Katowice yearly-summary parser — recover 2024 + tighten "unknown" kinds

`parseYearlySummaryPdf` now recovers 477 records across 2011-2026, but two
small gaps remain:

- **2024 is a single record**, because the 2024 yearly-summary PDF is one
  of the 266 dead-link 404s inside `katowice.eu` (the body href points at a
  file that no longer exists). Worth one probe-cycle of likely alternative
  paths (`/SiteAssets/dla-mieszkańca/…/Wykaz nieruchomości sprzedanych w
  roku 2024.pdf`, plus the same in the BIP attachments index) before giving
  up. If the file genuinely isn't published anywhere, only a content-team
  ticket at UM Katowice can fix it.
- **A few 2012-13 rows still produce `kind: "unknown"`** when the "lokal
  mieszkalny" cell falls outside the midpoint window AND the address has no
  apartment number (a building sold whole, no apt). Low priority — the row
  is still correct on date / address / prices / area.

### Katowice: 29 of 60 SharePoint announcements aren't picked up

`parseAnnouncement` requires an `<street> <building>[/<apt>]` shape in the
title. ~29 of the 60 items on the announcements list are land-plot sales
(`przy ul. Kochłowickiej (dz. nr 207/15, …)`) with no building number; they
genuinely don't fit our `street|building|apt` data model. Two options if we
want to surface them anyway:

1. Treat `dz. nr <parcel>` as a synthetic "apt" so the property key is
   stable across re-listings of the same parcel. Cheapest fix.
2. Introduce a separate `kind: "grunt"` property type with its own key
   (`city|street|parcel`). More principled but invasive.

Not load-bearing for the flat-flipper product the extension is currently
aimed at — these are vacant lots / multi-parcel land sales.

## Extension

### Popup: city column in the watchlist

`popup.js` renders the watching section, but the address cell mixes
properties from Gliwice and Katowice without a visual city marker. The
archive table already does this via `cityTagHtml(city)` from `archive.js` —
lift that helper into a shared file (or duplicate the markup inline) and
prepend the city chip in `popup.js`'s watching row. Same CSS classes
(`.zgm-city-tag`) already live in `popup.css`.

### Detail-page sidebar: city tag in the panel header

`content.js` `injectPanel` shows `Auction history — Sienkiewicza 3/9` but
doesn't disambiguate which city the address belongs to. Once the
content-script runs on more than one host (Wave 2 shipped it for Katowice),
prefix the panel title with the same `<span class="zgm-city-tag">` the
archive uses. The site adapter already knows its `city`.

### Popup: mirror the min-year filter

`v1.2.0` added the `From year` dropdown to the archive only. The popup
shows `prior` counts in its watching section (`popup.watching.historical_only`
"Not currently active — Nx prior") that don't respect `minHistoryYear`. The
fix is one line in `popup.js`'s prior-count filter to call the same
`window.ZGM_SETTINGS.getMinHistoryYear()` the archive uses, mirrors what
`content.js` already does.

### Background: per-city notification fallback URL

`extension/background.js` line 231:

```js
reg[id] = entry.detail_url || `https://zgm-gliwice.pl/`;
```

The fallback URL when a watchlist entry has no `detail_url` is hardcoded to
the Gliwice site. Switch to a per-city map (`gliwice` → `zgm-gliwice.pl`,
`katowice` → `bip.katowice.eu`) keyed off `entry.city`, with a generic
fallback to the project home page when neither is set. Cosmetic — modern
watchlist entries always carry `detail_url`.

## Spikes (not started)

### Wave 3 city candidates

[EXPANSION.md Part 2](./EXPANSION.md) flagged Chorzów (ZK PGM), Bytom
(Bytomskie Mieszkania), Kraków (ZBK), Warszawa (ZGN per district) as
unspiked. Same discipline as the Katowice spike — find the city BIP's
sales board, answer (a) does this city sell municipal property at auction,
(b) where are results published, (c) in what format.

- **Bytom — spiked + built (Wave 3, v1.4.0).** Clean HTML catalog on i-BIIP;
  active-listings adapter shipped. See [SPIKE-WAVE2.md](./SPIKE-WAVE2.md).
  Follow-up: sold-price *results* (JS-rendered `bytom.pl/bip`) and/or `.doc`
  announcement parsing — Bytom currently ships active-only.
- **Chorzów — spiked, deferred.** Prominent flat board is rentals; sale
  documents sit behind JS-expandable BIP menus. Needs a headless-browser spike
  to confirm a residential-sale stream exists before an adapter. See
  SPIKE-WAVE2.md.
- **Kraków, Warszawa — still unspiked.** Kraków next; Warszawa stays last
  (≈18 district BIPs, demand-gated).

### Bytom sold-price results (active-only today)

The Bytom adapter (`cities/bytom/`) builds properties from the i-BIIP active
catalog alone — every listing is `outcome: 'active'`. Bytom's auction
*results* ("Informacja o wyniku przetargu") live on JS-rendered
`bytom.pl/bip` pages that plain `fetch()` can't read. To populate sold-price
history: either parse the per-listing `.doc` announcements
(`core/parse-docx.js`, anticipated in EXPANSION.md §1.4) or reach the results
pages via a non-JS endpoint / headless browser. Until then Bytom contributes
no historical zł/m² medians, only live listings with their relisting round.

### City-namespaced keys now that a third city (Bytom) has landed

The note below predicted this becomes relevant "once a third city lands."
Bytom is that third city — but the extension-side namespacing in
`background.js` `mergeCityPayloads()` still handles all three cleanly, so this
remains optional tidying, not a correctness fix. Revisit when convenient.

### Monetization: alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid-product slice over
the Gliwice + Katowice data we already publish: email alerts off a saved
search ("new active listing in district X under N zł / m²"). Needs a tiny
hosted layer (Vercel + Supabase + Resend would do it), independent of the
extension. Not started; decide whether to do this before adding more
cities.
