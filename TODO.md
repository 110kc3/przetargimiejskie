# TODO

> Wave-2 work (Katowice SharePoint crawler + yearly-summary parser +
> per-site adapter registry + branding cleanup + year filter) shipped in
> v1.2.0 — see [CHANGELOG.md](./CHANGELOG.md). Items below are the
> remaining backlog.

## Pipeline

### Verify Bytom `.doc` history retention over time

The Bytom `.doc` enrichment (Wave 5) commits converted text to
`pipeline/doc-text-cache/`, and `refresh.js` history-merge is meant to retain
listings the source later drops. Not yet verified across runs: confirm that
when an auction rolls off both the i-BIIP catalog AND the BIP list, its
`properties.json` entry (with the figures recovered from the cached `.doc`)
still survives the merge. First clean run showed `retained 0` (nothing to
retain yet). Re-check after a few refresh cycles once older auctions age out.

### Zabrze active-list edge cases (remaining 0-flat warnings)

After the Wave-5 fixes (route non-PDF attachments → catdoc; skip published
"INFORMACJA O WYNIKU" result notices quietly), a few announcements still warn
`0 flats parsed`:
- **`de Gaulle'a`-type addresses** — the typographic apostrophe in
  "ul. Gen. de Gaulle'a 89/3" isn't in `ADDR_IN_LINE`'s char class, so the
  address (and thus the flat) is dropped. Widen the class to include `'`/`’`.
- **Old concluded announcements** lingering in the JSON document-list (e.g. a
  2022 single cooperative-ownership-right lokal). These pre-date the useful
  window and shouldn't count as *active*; consider dropping announcements whose
  auction date is well in the past.
- **Wire the result notices as a sold-price stream** — the skipped
  "INFORMACJA O WYNIKU PRZETARGÓW" PDFs are exactly the achieved-price data
  Zabrze otherwise lacks. Parsing them into `crawlResultDocs()` would give
  Zabrze real sold-price history (currently active-only).

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

- **Bytom — spiked + built (Wave 3, v1.4.0); `.doc` enrichment added (Wave 5).**
  Clean HTML catalog on i-BIIP; active-listings adapter shipped. See
  [SPIKE-WAVE2.md](./SPIKE-WAVE2.md). `.doc` announcement parsing now recovers
  price/area/auction-date for listings the i-BIIP catalog has dropped (past
  auctions still on the BIP list) — past-dated ones classify `archived` and
  populate the archive. See [SCOPE-BYTOM-DOC.md](./SCOPE-BYTOM-DOC.md).
  Remaining follow-up: sold-price *results* (JS-rendered `bytom.pl/bip`) — Bytom
  still has no achieved-price stream.
- **Chorzów — spiked + DROPPED.** Browser spike (May 2026) expanded the BIP
  menus: there is no `lokale mieszkalne na sprzedaż` category, the sale
  categories are empty 2014-era placeholders, flats are rental-only, and the
  only live sale content is occasional land/plot result notices as free-text
  HTML. No flat-sale stream → no adapter. See SPIKE-WAVE2.md. Revisit only if
  the product expands to municipal land sales.
- **Zabrze — spiked + BUILT (Wave 4, v1.6.0).** `cities/zabrze/` crawls the
  *Lokale mieszkalne* board (round + auction date per announcement) and parses
  each attachment for per-flat rows. Active-listings adapter; no sold-price
  stream. **Validate on first CI run:** (a) attachment MIME — assumed text PDF
  (pdftotext); if scanned → OCR, if DOC/DOCX → add an extractor; (b) pagination
  param `?page=N` (falls back to page 1). Watch the `zabrze list page N:` and
  `zabrze WARN: 0 flats parsed` log lines; tune `parse.js` regexes against the
  first real attachment. See SPIKE-WAVE2.md.
  - **List source corrected:** the board is a Vue SPA — announcements come from
    the JSON API `/api/v1/document-list/549` (all items, one call), not HTML
    scraping. The `/doc/<id>` pages are server-rendered (carry the attachment
    link). Pagination is moot (single API call).
  - **TLS resolved:** `bip.miastozabrze.pl` ships an incomplete cert chain
    (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`); the adapter now fetches it via a
    node:https path with relaxed chain verification (`insecureTLS`), scoped to
    this host (public, read-only). Secure alternative documented in
    `core/fetch.js` (supply the intermediate via `NODE_EXTRA_CA_CERTS`).
- **Kraków, Warszawa — still unspiked.** Plus the rest of the Silesian field
  (Ruda Śląska, Tychy, Dąbrowa Górnicza, Zagłębie + Rybnik subregion).
  Warszawa stays last (≈18 district BIPs, demand-gated).

### Bytom v2 — switch crawl to bytom.pl/bip + add announcement history

The v1 adapter (`cities/bytom/`) builds properties from the i-BIIP active
catalog alone — every listing is `outcome: 'active'`, and `detail_url` points
at the catalog page (the per-listing `LINK` is a `.doc` download, not a page).
A browser network spike (SPIKE-WAVE2.md "Update") corrected an earlier wrong
assumption: **`www.bytom.pl/bip` is server-rendered, not a JS SPA** — its
`zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie` list is paginated (36
items / 3 pages), date-range filterable, and links to real per-property pages
(`…/idn:<id>`) with the round in the title.

v2 plan: make that BIP list the primary crawl source —

- Use the `idn:` page as `detail_url` (fixes the file-download UX).
- Pull round + publication date from the list; enrich price/area from the
  `.doc` (`core/parse-docx.js`, EXPANSION.md §1.4) or by joining to i-BIIP.
- Walk the date filter backwards for prior-round announcements → per-property
  *announcement* history (rounds at descending starting prices).

Caveats: (a) the crawler must send a **browser-like User-Agent** — the bot UA
got an empty body from `web_fetch` (UA gating), unverified from CI sandbox;
(b) Bytom has **no "wyniki przetargu" / achieved-price stream** — only
announcements, so there are no sold prices, only starting-price-per-round
history. Bigger build than v1; not folded into the v1.4.x patch.

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
