# Changelog

All user-visible changes to the Chrome extension. The number shown in the
popup footer matches the latest entry here. Versioning per CLAUDE.md (semver:
MAJOR = breaking, MINOR = new feature/permission/host, PATCH = fixes/copy).

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
