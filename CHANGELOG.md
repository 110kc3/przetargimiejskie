# Changelog

All user-visible changes to the Chrome extension. The number shown in the
popup footer matches the latest entry here. Versioning per CLAUDE.md (semver:
MAJOR = breaking, MINOR = new feature/permission/host, PATCH = fixes/copy).

## v1.10.1 — 2026-06-02

- Fixed: a city whose data isn't published yet (e.g. just added) no longer blanks
  the whole extension — `background.js` now skips an unavailable city instead of
  failing the entire data load.
- Fixed: the archive **city filter** now includes Sosnowiec (the dropdown was
  hardcoded and missed it).

## v1.10.0 — 2026-06-02

- Added a fifth city: **Sosnowiec**. Open `przetarg ustny` sales of municipal
  flats from the city BIP (bip.um.sosnowiec.pl JSON API) now appear in the popup
  and archive, with a Sosnowiec city tag. (Sosnowiec also auctions land and sells
  flats bezprzetargowo to tenants — both excluded; only open flat auctions are
  tracked.)

## v1.9.1 — 2026-06-01

- Renamed the extension to **przetargimiejskie - śląsk** (manifest name + toolbar
  tooltip) to reflect its Silesian-cities scope.

## v1.9.0 — 2026-05-31

- The auction archive now shows a **round column** ("1. / 2. / 3. przetarg") for
  every past listing, sortable like the other columns.
- Popup no longer labels re-listings as "nowa" (new). A 2nd/3rd-round auction
  now shows its round ("2. / 3. przetarg") instead; "nowa" is reserved for genuine
  first-round listings with no recorded history.
- Round labels use plain numbers ("2. przetarg") rather than Roman numerals, for
  consistency with how rounds are stored across all cities.
- On listing pages, a re-listing (2./3. przetarg) whose earlier rounds aren't in
  our dataset now shows "brak danych archiwalnych" (no archive data) instead of
  the contradictory "brak wcześniejszych aukcji".

## v1.8.1 — 2026-05-31

- Fixed listing badges/chips vanishing entirely on pages with past-dated
  ("archived") auctions. An `archived` listing was wrongly treated as its own
  "prior history" and threw while rendering the history tooltip, which aborted
  decoration for the whole page. `archived` is now treated as a current posting
  (like `active`), and per-card decoration is wrapped so one bad card can no
  longer blank the rest.

## v1.8.0 — 2026-05-31

- Listing cards now show a **stats chip next to the auction name**: the auction
  round (I / II / III przetarg), starting price, area, zł/m², and auction date —
  read from the dataset, so it appears even on source pages that carry no inline
  numbers (e.g. Bytom's BIP list).
- Fixed the misleading green badge: the "no prior history" marker previously read
  "pierwsza aukcja", which looked like an auction-round label even when the
  listing was clearly a second or third przetarg. It now reads "brak
  wcześniejszych aukcji" / "no prior auctions", and the actual round is shown in
  the new stats chip.

## v1.7.0 — 2026-05-30

- Past auctions now leave the "active" view and appear in the **archive as
  history**. Announcement-only cities (Bytom, Zabrze) surface years of past
  auctions; a listing whose auction date has passed is marked `archived`
  (concluded — the city doesn't publish the achieved price) instead of
  `active`. The archive's historical table + outcome filter gain an
  **"past (result not published)"** category (`outcome.archived`); the popup and
  archive active sections show only current/upcoming auctions.
- Zabrze: auction dates are now filled from the announcement body
  ("Przetargi odbędą się w dniu …") when the title omits them — most Zabrze rows
  were showing no date. (Pipeline; re-run to apply.)
- Zabrze parser handles the second (column-wrapped) PDF layout from v1.6.x —
  correct flat area (not the plot/cellar) and price across both layouts.

## v1.6.1 — 2026-05-29

- Archive year filter changed from a "From year" (minimum) dropdown to a **pick
  a specific year** dropdown listing every year present in the data, with an
  "All years" default. Filtering is now exact-year, and the dropdown is built
  from the loaded records (no longer tied to the global min-history setting).
- Pipeline (Gliwice area backfill): the detail-page area now also matches when
  the result PDF uses the **full street name** ("Karola Libelta", "Ignacego
  Daszyńskiego") while the detail page uses the **short** form ("Libelta",
  "Daszyńskiego") — a leading given-name token is dropped when matching. Fills
  area on the affected historical Gliwice rows (e.g. Libelta 10/1 → 47.67 m²).
  Re-run the pipeline to apply. (Remaining size-less rows are garages / whole
  buildings / OCR-garbled addresses with no detail page carrying a flat area.)

## v1.6.0 — 2026-05-29

- **New city: Zabrze** (Wave 4). The popup and archive now include Zabrze
  municipal flat auctions alongside Gliwice, Katowice and Bytom.
  - Source: the city BIP's dedicated *Lokale mieszkalne* sale board
    (`bip.miastozabrze.pl/.../zabrze_pns_mieszkalne`) — a deep, server-rendered,
    paginated list (113+ announcements) where each title carries the round
    (I/II) and the auction date. Per-flat rows (address/area/price) come from
    each announcement's attachment.
  - Pipeline: `cities/zabrze/{config,crawl,parse,index}.js`, registered in the
    city registry; shared `fetch`/`pdf-text` gained an optional browser-UA
    parameter (the BIP gates the default bot UA). Active-listings adapter (no
    sold-price stream); `crawlResultDocs()` is `[]`.
  - Extension: `background.js` fetches Zabrze data; `city.zabrze` label, an
    orange city chip, and a Zabrze archive filter option added. No
    content-script overlay — the Zabrze board lists announcements without
    per-flat addresses, so there's nothing to badge in-context.
  - ⚠️ Two pieces validate on the first GitHub Actions run (the host was
    unreachable from the dev environment): the announcement attachment is
    assumed to be a text PDF (pdftotext), and the list pagination param
    (`?page=N`). If CI shows otherwise, the extractor/pager adjust. The list +
    title + per-flat parsers are unit-tested against fixtures. See SPIKE-WAVE2.md.

## v1.5.0 — 2026-05-29

- Bytom v2: switched the crawl from the i-BIIP catalog to the **city BIP sales
  list** (`www.bytom.pl/bip/zbycie-nieruchomosci-bytom`), which a browser
  network spike confirmed is server-rendered (not a JS SPA — the earlier
  assumption was wrong). This fixes the two reported issues:
  - **Listings now link to a real per-property page** (`…/idn:N`) instead of
    triggering a `.doc` download.
  - **Broader coverage + reliable round.** The BIP list is paginated
    (`?strona=N`) and carries more flats than the catalog, with the relisting
    round ("drugi/trzeci przetarg") in each entry. Price, area and auction date
    are still filled from the i-BIIP catalog, joined by address.
  - The pipeline fetches Bytom with a browser-like User-Agent (the default bot
    UA is served an empty body). A catalog-only fallback keeps the city from
    going empty if the BIP list is ever unreachable.
  - Extension: `sites/bytom.js` now badges the BIP list/detail pages as well as
    the catalog; manifest gains the `www.bytom.pl` host + content-script match.
  - Honest limit: Bytom publishes **no achieved sale prices** and the list only
    spans recent months, so there is still no sold-price/zł-m² history — every
    listing is a current auction with its round. See SPIKE-WAVE2.md.

## v1.4.1 — 2026-05-29

- Bytom UI polish (the v1.4.0 city add was missing its presentation bits):
  - `i18n.js` — registered the `city.bytom` label (PL + EN) so the city chip
    reads "Bytom" instead of falling back to a raw id.
  - `popup.css` / `archive.css` — added the Bytom chip colour (green, vs.
    Gliwice-blue / Katowice-red) across all three theme scopes, plus the
    sold/unsold row-cascade override in the archive.
  - `archive.html` — added Bytom to the city filter dropdown (it was only
    reachable under "all" before).
- No data or pipeline change. If Bytom listings aren't showing after updating:
  reload the unpacked extension (so the city list includes `bytom`) and hit
  Refresh in the popup to bypass the 6h data cache.

## v1.4.0 — 2026-05-29

- **New city: Bytom** (Wave 3). The extension now badges and tracks Bytom
  municipal sale auctions alongside Gliwice and Katowice.
  - Source: the city's i-BIIP "Katalog nieruchomości do zbycia"
    (`i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html`) — one
    server-rendered HTML page listing every active auction with address, type,
    round (I/II/III Przetarg), date, starting price and area inline. No OCR, no
    PDF: the new `source: 'html'` adapter type skips the OCR/parse phase.
  - Pipeline: `cities/bytom/{config,crawl,parse,index}.js`, registered in
    `cities/index.js`. Flats + commercial units only; land parcels (`grunt…`,
    sold by plot number) are skipped — they don't fit the street|building|apt
    model. Active-listings only for now: Bytom's sold-price *results* are on
    JS-rendered `bytom.pl/bip` pages and remain a follow-up.
  - Extension: new `sites/bytom.js` DOM adapter for the catalog page; manifest
    gains the `i-biip.um.bytom.pl` host permission + content-script match and
    loads the new adapter; `background.js` adds `bytom` to the fetched city
    list. Spike findings in [SPIKE-WAVE2.md](./SPIKE-WAVE2.md).
  - Chorzów was spiked alongside Bytom but **deferred** — its prominent
    municipal-flat stream is rentals (wynajem), and its sale categories are
    empty/behind JS menus. No clean residential-sale source found yet.

## v1.3.3 — 2026-05-29

- Data: Katowice active listings no longer ship with empty Date / Ask /
  Ask/m² cells.
  - **`crawl-sharepoint.js`** — title-shape filter on the SP announcements
    list. Procedural notices ("Lista osób zakwalifikowanych", "Ogłoszenie
    o odwołaniu przetargów", "Informacja o wynikach", "Wykaz nieruchomości",
    "Zmiana ceny") are dropped before parsing, and only titles matching the
    auction pattern (`[Drugi/Trzeci/…] przetarg ustny (nie)ograniczony na
    sprzedaż`) pass through. The cancellation- and qualified-participants
    rows that showed empty cells in the popup are now skipped at source.
  - **`parse.js#kindFromText`** — recognises whole-building sales
    ("budynkiem mieszkalnym", "nieruchomość zabudowana budynkiem
    mieszkalnym") as `mieszkalny`, not just unit-only "lokal mieszkalny".
  - **`parse.js` area regex** — accepts both the abbreviated `o pow.` (BIP)
    and the full word `o powierzchni / o powierzchni użytkowej` (city-portal
    SharePoint) plus `m 2` with a space.
  - Counts: `no-date` 2 → 0, `no-price` 2 → 0, `no-area` 12 → 4,
    `kind=unknown` 11 → 4 on the 29 active listings (down from 31 — the
    two skipped rows were the procedural notices).

## v1.3.2 — 2026-05-28

- Fix: popup tables had mismatched `<th>` / `<td>` counts which shifted every
  column header one slot to the right of its data.
  - **Active table** (8 columns per row) had 7 `<th>` — was missing a header
    cell for the star column, so `Property` appeared above the star, `Kind`
    above Property, etc.
  - **Watching table** (4 columns per row) had 5 `<th>` — one too many empty
    cells at the start, so `Property` and `Status` were over Status and the
    link.
  Both heads now match their rows. The new star-column `<th>` is styled
  with the same `.zgm-star-cell` class as the body cell (24px wide,
  centered), so it doesn't bloat into a regular column's worth of space.

## v1.3.1 — 2026-05-28

- Fix: the "OGLĘDZINY" label in the popup/archive dates cell overflowed
  its 50/56px box and visually overlapped the date next to it. Widened
  the label column to 72 px (with `box-sizing: border-box` and 6 px
  right-padding) so all three Polish labels — AUKCJA, WADIUM, OGLĘDZINY —
  align cleanly without colliding with their dates.

## v1.3.0 — 2026-05-28

- Sortable column headers on the "Currently active" tables in both the popup
  and the archive. Click `Dates` / `Ask` / `Ask/m²` / `Prior` to sort; click
  the same column again to reverse direction. Date defaults to ascending
  (soonest auction first); the other columns default to descending. Until
  the user clicks anything, the default ordering remains "most-relisted
  first, then prior count, then area" — same as before.
- Indicators (↕ idle, ↑ asc, ↓ desc) match the affordance the historical
  archive table already used. Missing values always go to the bottom of the
  sort regardless of direction.

## v1.2.0 — 2026-05-28

- Historical-data year filter. Two layers:
  - Pipeline floor: `refresh.js` drops sold/unsold records whose auction year
    is older than 2020 before writing `data/<city>/properties.json`. Active
    listings and wykaz pre-announcements are never dropped. Override per-run
    with `MIN_HISTORY_YEAR=YYYY npm run refresh`.
  - Extension UI window: a new `From year` dropdown in the archive lets the
    user narrow the visible history further. Default = current year − 3
    (= 2023 today), persisted to `chrome.storage.local`. The same setting
    also filters the content-script's prior-history tooltips on listing-card
    badges and the timeline table in the detail-page sidebar — so the badge
    "prev 3× — 1 unsold" counts always match what the archive shows.
- New module `extension/settings.js` exposes `window.ZGM_SETTINGS` with
  `getMinHistoryYear()`, `setMinHistoryYear(year)`, `minYearOptions()`,
  `onChange(fn)` and a `ready` promise — mirrors the i18n module's pattern.
  Cross-tab change events are honoured (popup/archive/content all re-render).
- Archive summary tiles (median PLN, median PLN/m²) now respect the city +
  min-year filters too — previously they always mixed cities and years.

## v1.1.0 — 2026-05-27

- Katowice support in the in-context overlay. The content script now decorates
  the city BIP's auction board (`bip.katowice.eu/ogloszenia/tablicaogloszen/…`)
  with prior-history badges, and injects the timeline sidebar on individual
  `dokument.aspx?idr=…` pages. New host permission and content-script match
  for `https://bip.katowice.eu/*`.
- Introduced a per-site DOM adapter registry under `extension/sites/`. The
  content script is now generic — it picks an adapter by `location.hostname`,
  and each city ships its own selectors / URL regexes / inject target. Adding
  another city is now a single new file in `sites/` + one host in the manifest.
- Fixed a latent join bug where the content script looked up unnamespaced
  property keys against a city-namespaced map (no Gliwice card got a real
  history badge after the Wave 0 merge). Lookups now namespace via the
  adapter's `city`, matching what `background.js` stores.
- Branding cleanup: the extension name, short name, action title, popup tab
  title, archive tab title, notification title (PL + EN), and the PL/EN
  `popup.title` / `notif.title` / `archive.title` i18n strings no longer
  claim to be ZGM-Gliwice-only — they read "przetargimiejskie" instead. The
  popup's GitHub footer link now points at the actual data repo
  (`110kc3/przetargimiejskie`). Popup footer also shows the version string.
