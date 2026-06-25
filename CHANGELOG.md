# Changelog

All user-visible changes to the Chrome extension. The number shown in the
popup footer matches the latest entry here. Versioning per CLAUDE.md (semver:
MAJOR = breaking, MINOR = new feature/permission/host, PATCH = fixes/copy).

## v1.31.1 — 2026-06-25

Hardening. No new features or permissions.

- **Active-list map links use the structured address.** The popup's Google-Maps
  link is now built from the listing's `street` + `building` (the same logic the
  web archive already uses), falling back to the raw address. Closes a latent
  case where a listing missing `address_raw` would show no map link even though
  it had a structured address.

## v1.31.0 — 2026-06-23

- **Filter the active list by city and type.** The popup now has two dropdowns
  above the list: pick a city and/or a property type (flat, house, commercial,
  garage, land) to narrow the currently-active auctions. The dropdowns only
  offer the cities and types actually present right now, and a small "X of Y"
  counter shows how many rows the filter leaves. Mirrors the filters on the web
  archive. Selection resets when you close the popup.

## v1.30.2 — 2026-06-23

Bug-fix sweep from a full code audit. No new features or permissions.

- **Watched-property alerts no longer go quiet.** A single watched record with
  missing listing data used to abort the whole background check, silently
  stopping new-listing notifications and wadium/auction reminders for every
  other watched property. The check now skips the bad record and carries on.
- **Clicking a notification reliably opens the right page.** Overlapping
  notification writes could erase each other's target links, so a click
  occasionally opened nothing. Notification bookkeeping is now serialized.
- **Reminders follow the next auction.** When a property has more than one live
  listing, wadium/auction reminders now track the soonest upcoming auction
  instead of whichever listing happened to be first.
- **Wadium deadline urgency shows even for oddly-formatted dates.** A deadline
  written in a non-standard format no longer loses its red "due soon" highlight
  (and no longer shows a stray "NaNd" tooltip).
- **`zabudowy` now reads as "dom" / "house".** Added the genitive spelling as an
  alias of `zabudowana`, alongside the existing `zabudowa`, so the TYP column
  and the houses filter group it correctly.
- **Detail-panel discount uses the true first attempt.** The "vs first attempt"
  price change now always compares against the earliest auction, even when the
  listing history isn't in date order.
- **Archive sorting:** rows with no date or no value now always sink to the
  bottom in both sort directions, instead of floating to the top when sorting
  ascending.
- **Popup footer counts** no longer slightly over-count when a city legitimately
  reports zero active listings.

## v1.30.1 — 2026-06-22

- **TYP column no longer shows a raw code like "kind.zabudowa".** When a
  listing's type didn't have a translation, the Active and Archive tables (and
  the on-page table on city sites) printed the internal key instead of a word.
  Unmapped types now fall back to a readable label, and the specific stray value
  `zabudowa` (a built-up parcel) is mapped to **dom** / *house*, the same as
  `zabudowana`. Affects the popup, the archive page, and the injected on-site
  table. Reload the extension to pick it up.

## v1.30.0 — 2026-06-20

- **Land plots now show their source, not only a map link.** Each działka row
  gets a city-portal "portal ↗" link (the human MSIP offers page it was crawled
  from) beside the announcement link, in both the Active and Archive tables —
  the geoportal stays as the separate parcel/map link. The land source no longer
  points at the raw MSIP JSON export.
- **Gliwice land prices.** The starting price (cena wywoławcza) is now captured
  for every *announced* Gliwice plot (BIP price-fetch cap raised 30 → 80, the
  extractor hardened against page-wording drift). Plots still in pre-announcement
  ("przetarg wkrótce" / "oferta do wznowienia") carry no published price yet and
  show "—".

## v1.29.0 — 2026-06-15

Google Maps column. Every non-land listing (flats, houses, commercial, garages) now
has a direct "Mapa" link that opens Google Maps at the street address — a new column
in the popup and the archive (and on the website). Land plots keep their geoportal
parcel link instead. The popup widened to 800px to fit the extra column.

## v1.28.0 — 2026-06-15

Houses: building area vs plot area. When a house has both a usable (building) area
and a plot area, the usable area stays in the Powierzchnia column and the plot area
now shows in the Działka column (extension archive + website), or inline as
"· dz. N m²" in the popup. zł/m² is computed on the usable area. Bielsko house
listings now parse the two areas separately.

Wider popup (540 → 760 px) so the right-most active-table columns (deal score, prior
round, last unsold, source) and the median-delta badge no longer clip; the badge now
wraps to a second line instead of being cut off at the popup edge.

## v1.27.0 — 2026-06-15

Land area completeness. Bielsko land plots now show their area (read from the
giełda's "Powierzchnia działki" field) and houses fall back to the structured
area when no usable-area figure is in the prose. Houses/whole-property sales
whose area is stored as the plot/building total now display that area instead
of a blank (Katowice domy).

## v1.26.0 — 2026-06-15

Land filter + geoportal polish. Merged the duplicate property-type filters into
a single **Rodzaj** dropdown (mieszkania / domy / działki / lokale użytkowe /
garaże). Multi-parcel plots ("263/2, 263/6") now show **one geoportal link per
parcel** instead of linking only the first. Land rows with no auction date show
the source **status** (e.g. Gliwice's "oferta do wznowienia" / "przetarg
wkrótce") instead of a blank — those municipal land *offers* have no price/date
until an auction is formally announced (every other city has full price/date
coverage).

## v1.25.0 — 2026-06-15

Land — Bielsko-Biała plots + geoportal links. The Bielsko-Biała adapter now
captures działki/grunty (plus houses/commercial) from the Giełda Nieruchomości,
so `data/bielsko/land.json` fills with real parcels. The archive (extension +
website) gains a **Działka** column that links each plot to a geoportal where
the parcel resolves on a map — the portal is configurable per city (a
source-provided link, a municipal-SIP override, the national geoportal
deep-link when a full TERYT id is known, or a geoportal-scoped search
otherwise). Land is aged out by date and kept out of the flat zł/m² median.

## v1.24.0 — 2026-06-15

Houses & land — phase 1 (HL-0). Adds two property kinds: **dom** (house /
`nieruchomość zabudowana`) and **działka** (land / `grunt`), plus a dedicated
**"Rodzaj nieruchomości"** filter in the archive (extension + website) so plots
and houses can be shown or hidden on their own — alongside the existing
mieszkalny / użytkowy / garaż type filter. Land is stored separately
(`data/<city>/land.json`, parcel-keyed) and is excluded from the flat zł/m²
median. Katowice residential buildings now classify as houses, not flats.
Per-city land crawlers follow in later waves; the filter surfaces land as each
city starts publishing it.

## v1.23.0 — 2026-06-14

- **Deal score: zł/m² vs the local median** (MINOR): every priced flat now
  shows how its price per m² compares to the **median for that city** — a green
  "▼ N% below median" or amber "▲ N% above median" badge. It appears next to
  zł/m² in the popup's "Currently active" table and on the on-page stats chip
  the content script injects on listing pages, so the "is this cheap for here?"
  read is right where you're looking. The median is computed client-side from
  the data already fetched (residential flats only — garages/commercial are
  excluded so they can't skew it), per city, requiring at least 5 priced flats
  before a badge is shown. New `extension/dealscore.js` helper, loaded in the
  popup and as a content script. PL/EN strings added. No new permissions.

## v1.22.0 — 2026-06-13

- **On-page detail panel for Bielsko-Biała** (MINOR): opening a Giełda
  Nieruchomości offer (bielsko-biala.pl/nieruchomosc/<slug>) now shows the
  auction-history panel, keyed off the node's "Adres:" field
  (`sites/bielsko.js`, mirroring the pipeline's cities/bielsko/parse.js). The
  giełda's index cards don't carry a reliable address block, so only the
  per-offer detail pages are decorated. With this, 7 of 9 cities have the
  on-page overlay; Zabrze and Sosnowiec remain popup/archive-only — both are
  JS SPAs and the content script runs once at document_idle (Zabrze also keeps
  each flat's address inside a downloaded attachment, not the page DOM).

## v1.21.0 — 2026-06-13

- **On-page badges for three more cities** (MINOR): the in-page history badges,
  stats chips and detail panels — previously only on Gliwice, Katowice and
  Bytom — now also work on the BIP boards of **Rybnik** (ZGM,
  bip.zgm.rybnik.pl), **Mysłowice** (bip.myslowice.pl) and **Świętochłowice**
  (bip.swietochlowice.pl). These three were already in the popup, archive and
  watchlist; this adds the live on-site overlay. New site adapters
  (`sites/rybnik.js`, `sites/myslowice.js`, `sites/swietochlowice.js`) plus a
  shared `sites/finn-common.js` that mirrors the pipeline's FINN-BIP title/
  address parsing so badges join the same property keys. Adds the three hosts
  to the content-script matches (Chrome will ask you to approve the new sites
  on update). Zabrze, Sosnowiec and Bielsko-Biała are still popup/archive-only
  (their listing pages are JS SPAs or put the flat address inside a downloaded
  document, not the page DOM).

## v1.20.1 — 2026-06-13

- **Fixes (PATCH)** from the 13 June code audit:
  - The wadium-deadline urgency flag (popup + archive) now computes "days
    left" against Warsaw civil time like everything else, instead of the
    viewer's local midnight — a non-Polish-timezone user's "pilne" marker
    could be a day off.
  - The popup's area now renders with the Polish decimal comma
    ("37,91 m²"), matching the archive/content fix from v1.19.1.
  - `t(key, { default })` fallback actually works now: an unknown
    `unsold_reason` enum value renders as the raw reason instead of the
    literal `reason.xyz` key (the call sites passed a `default` option the
    i18n layer never implemented).
  - Escaping hardening: auction/wadium/viewing dates and unknown
    outcome/reason enum values are now esc()'d before reaching innerHTML in
    popup, archive and content-script tables (parser-normalized today, but
    they're crawled-derived — same invariant as v1.14.3).
  - The archive's "Currently active" prior counts now respect the saved
    min-history-year setting, matching the popup (the two surfaces could
    disagree on "listed N× before" for the same property).

## v1.20.0 — 2026-06-12

- **Archived rounds now count as history** (MINOR): on detail pages and badge
  tooltips, a flat's earlier rounds from announcement-only cities (Bytom,
  Zabrze — outcome "zakończone, brak wyniku") are listed as prior auctions
  with their prices, instead of the panel claiming "brak wcześniejszych
  aukcji" while the chip said "3. przetarg". New badge wording for properties
  whose history has no published results.

## v1.19.1 — 2026-06-12

- **Fix (PATCH):** Gliwice listing cards without an area no longer lose their
  price too (the two figures are parsed independently now), and the archive
  tables render areas with the Polish decimal comma ("37,91 m²" instead of
  "37.91 m²"), matching the rest of the UI.

## v1.19.0 — 2026-06-12

- **City-BIP added as a second Gliwice source** (MINOR): Gliwice now also crawls
  the City of Gliwice BIP (bip.gliwice.eu) property-sale board alongside the ZGM
  board. New lokale found only there appear as normal listings. When an auction
  is published on **both** boards (same unit + date), the listing is not
  duplicated — the ZGM row stays primary and the city-BIP page is shown as an
  extra **"BIP ↗"** source link next to "źródło", in the popup (active +
  watchlist) and the archive page. Land plots, rent and lease notices on the BIP
  are ignored. Source links still point only at official municipal pages.

## v1.18.0 — 2026-06-11

- **"Źródło" verify link on every listing** (MINOR): each row in the popup
  (active + watchlist) and the archive page (active + historical) now carries a
  dedicated **source link** that opens the listing straight at the city
  BIP/ZGM page or result PDF, so anyone can confirm the data first-hand. The
  historical table's old PDF-only cell now also links announcement-page sources
  (not just result PDFs); rows with no source URL show nothing. Links point only
  at the official municipal source, never at the project's own site.

## v1.17.0 — 2026-06-10

- **Deadline reminders for watched properties** (MINOR): the background
  watchlist check now also notifies the day before (and, as a catch-up, on
  the day of) the **wadium payment deadline** and the **auction date** of
  every starred listing — previously it only notified when a new listing
  appeared. One notification per deadline (deduped across the 4-hourly
  checks, pruned after 14 days), Europe/Warsaw dates, click opens the
  listing's detail page. Wadium reminders fire where the source publishes a
  wadium date (e.g. Gliwice); auction-day reminders work for every city.

## v1.16.0 — 2026-06-10

- **City chip in the detail-page panel header** (MINOR): the injected
  "Auction history — …" sidebar now opens with the same city tag the popup
  and archive use, so multi-city users see at a glance which city's data the
  panel shows (neutral chip styling, self-contained on host pages).
- **Popup prior counts respect the saved min-history-year**: the active table
  and watching section now filter sold/unsold history through
  `minHistoryYear` exactly like the detail-page panel does (archived rows
  always count — they're the listing itself, not its history).
- **Per-city notification fallback**: clicking a notification for a legacy
  watchlist entry with no detail URL now opens that city's source site (or
  przetargimiejskie.pl) instead of always zgm-gliwice.pl.
- Store-listing description updated to reflect the current city set.

## v1.15.0 — 2026-06-10

- Cleared the low-priority extension bug-review backlog (L1–L8):
  - **Auctions expire on Warsaw time, not UTC.** popup.js and archive.js use a
    `todayWarsaw()` civil date, so a listing whose auction is today no longer
    lingers as "active" for the hour or two between UTC and local midnight.
  - **Watching-row "unsold" is translated.** The popup's active-with-history
    status text now goes through i18n (new `popup.watching.active_prior` key,
    PL + EN) instead of a hardcoded English word.
  - **Archive year dropdown retranslates.** The "All years" option is rebuilt
    on language toggle (selection preserved) instead of keeping its old label.
  - **Removed the dead historical-sort ternary** (`'desc' : 'desc'`) — a new
    column now explicitly starts descending (newest/largest first), documented
    as the deliberate opposite of the active table's soonest-first default.
  - **Gliwice hyphenated building ranges parse.** The detail-title split now
    breaks on the space-padded dash before the date, so "Kozielska 10-12" is no
    longer truncated to "Kozielska 10" at its own hyphen.
  - **New host coverage** (MINOR): the content script now also runs on
    `katowice.eu` (city-portal SharePoint DispForm detail pages that archive
    links point to) and non-www `bytom.pl`, so the adapter host checks are no
    longer dead. The Katowice adapter recognises the DispForm detail path.
  - **No more content-script listener leak.** The detail panel's watchlist
    `onChange` listener is registered once at page level instead of on every
    render, so listeners (and the detached DOM they retained) no longer pile up
    in long-lived tabs.
  - **Bytom detail title is more robust.** Address detection tries the
    announcement-title containers, then the page `<h1>`, then `document.title`
    (split on `|`/dash and whole), using the first that parses — a banner `<h1>`
    no longer shadows a usable title.

## v1.14.3 — 2026-06-10

- Fixed five more extension bug-review findings (E5–E9):
  - **`no_winner` auctions now appear in the archive.** They were dropped
    entirely from the historical table; they're now flattened in, labelled,
    and selectable in the outcome filter (new dropdown option).
  - **Archive street search now matches diacritics.** The query is
    Polish-folded (like the indexed `street_search`), so typing "Zwycięstwa"
    finds `zwyciestwa`; the active-table search folds both the query and the
    address so it matches either way.
  - **Crawled data is escaped before going into innerHTML** in popup.js,
    archive.js and content.js (addresses, detail/source URLs, watch labels,
    city tags). Values are HTML-escaped and URLs are restricted to http(s),
    closing off attribute-breakout and `javascript:`/`data:` href injection on
    the privileged pages.
  - **Watchlist writes are serialized.** `watch`/`unwatch`/`markSeenActive`
    chain their read-modify-write on a single promise, so rapid toggles (or the
    popup racing the background scan) can't clobber each other — no dropped
    watches or lost fingerprints that re-notify.
  - **Bytom catalog badge no longer attaches to the wrong container.** The
    ancestor walk now requires an actual ADRES/TYP match; with no match within
    six levels the listing is skipped instead of badging a wrapper that may hold
    every listing with the first one's address.

## v1.14.2 — 2026-06-10

- Fixed four extension/pipeline join-key bugs that hid auction history (E1–E4):
  - **Address normalizer drifted behind the pipeline.** `normalize.js` now
    converts a trailing "m. N" into the `/N` apartment form (instead of
    stripping it) and adds the bare "street garaż nr N" → building `0` branch,
    so the extension produces the same join keys as the pipeline. Affected live
    Gliwice garage listings.
  - **Genitive titles stopped matching after street-coalescing.** The pipeline
    folds genitive street keys ("Staromiejskiej") into the nominative
    ("Staromiejska"), but `content.js` did an exact lookup — so Katowice's
    genitive page titles missed exactly the multi-round properties. It now
    retries the lookup with street-suffix variants.
  - **A network outage no longer poisons the cache.** `background.js` treats
    "0 cities fetched" as a failure: it serves the stale cache instead of
    saving an empty merge with a fresh timestamp, so the popup no longer shows
    zeros during an outage and watched properties aren't re-notified once the
    network recovers.
  - **Katowice card titles with trailing words now parse.** The adapter's
    title regex captures street + number and stops, so
    "…przy ul. Gliwickiej 50 w Katowicach" is recognised instead of silently
    skipped.

## v1.14.1 — 2026-06-09

- Removed the redundant auction date from the listing-page stats chip on
  Gliwice (`zgm-gliwice.pl`). The Elementor card title there already shows the
  date ("… - DD.MM.YYYY r."), so the chip was repeating it. Suppression is
  driven by a new `cardShowsDate` flag on the site adapter, so cities whose
  cards have no inline date (e.g. Bytom's BIP list) still show it in the chip.

## v1.14.0 — 2026-06-05

- Added a ninth city: **Świętochłowice**. Open `przetarg ustny nieograniczony`
  sales of municipal flats now appear in the popup and archive with a
  Świętochłowice city tag. Sales are run by the City Hall and published on the
  city BIP's flats-only board ("Przetargi na lokale mieszkalne",
  bip.swietochlowice.pl). Each announcement's address and round come from its
  title; the starting (wywoławcza) price, usable area and auction date are read
  from the announcement's Word `.doc` attachment (the same catdoc path Bytom and
  Zabrze use). Active + archive only (the board's "Informacja o wyniku" result
  notices aren't wired as a sold-price stream yet). Verified live: the
  announcement/notice filter kept 21 real auctions and dropped 30 notices across
  the recent archive, all keyed cleanly.

## v1.13.0 — 2026-06-04

- Added an eighth city: **Mysłowice**. Open `przetarg ustny nieograniczony` sales
  of municipal flats now appear in the popup and archive with a Mysłowice city
  tag. Sales are run by the City Hall (the housing manager MZGK only handles
  rentals) and published on the city BIP (bip.myslowice.pl), which runs on the
  **FINN eUrząd** platform — server-rendered `/artykul/…` announcement pages, no
  PDF/OCR. The auction round comes from the title (I / II / III przetarg);
  address, starting (wywoławcza) price, usable area and auction date from the
  body. Active + archive only (the BIP publishes no achieved sale prices).
- New shared **`finn-bip` crawl+parse helper** (`pipeline/src/core/finn-bip.js`):
  a reusable extractor for the many Silesian BIPs on the FINN platform, so each
  is a thin per-city config rather than a bespoke adapter. Mysłowice is its first
  user; Świętochłowice / Jaworzno / Częstochowa are next.
- Fixed the Bielsko-Biała wiring that shipped incomplete in v1.12.0: the city
  now has its chip colour (popup + archive + public archive site) and a city
  option in the archive filter dropdown (previously only reachable under "all").

## v1.12.0 — 2026-06-04

- Added a seventh city: **Bielsko-Biała** — the largest Silesian city the
  extension hadn't covered. Municipal flat sales here are run by the City Hall
  (not the ZGM, which only handles rentals) and published on the city's
  server-rendered *Giełda Nieruchomości*. Open flat auctions now appear in the
  popup and archive with a Bielsko-Biała city tag. Address, starting
  (wywoławcza) price, auction date and round (from "Forma przetargu":
  Pierwszy/Drugi/Trzeci) come straight from each offer's labelled detail page;
  usable area from the listing description. No PDF/OCR — the lowest-effort
  source in the project. Active + archive only (the giełda publishes no achieved
  sale prices).

## v1.11.1 — 2026-06-03

- Archive summary now counts correctly for cities without an achieved-price
  stream (Bytom, Zabrze, Sosnowiec, Rybnik): instead of "0 sprzedanych / —", each
  tile shows the number of archived auctions ("N w archiwum") and the median
  **starting** (wywoławcza) price + zł/m². Gliwice still shows sold counts +
  median sale price where that data exists.

## v1.11.0 — 2026-06-02

- Added a sixth city: **Rybnik**. Open `przetarg ustny` sales of municipal flats
  from ZGM Rybnik (the housing manager) now appear in the popup and archive, with
  a Rybnik city tag. Announcements are RTF, decoded by a new pure-JS RTF reader
  (no external tool). Address comes from the announcement label; price/area/date/
  round from the RTF body.
- The data cache key now embeds the city set, so adding a city automatically
  refetches instead of serving a stale cached payload that omits it (this is why
  a newly-added city could look "empty" until the 6h TTL expired).

## v1.10.3 — 2026-06-02

- Simplified the popup's history label: a first-time listing shows "nowa" (new),
  and a re-listing shows plainly "wystawiona N× wcześniej" — dropped the
  "(0 bez sprzedaży)" parenthetical, which was noise for cities without a
  sold/unsold result stream.

## v1.10.2 — 2026-06-02

- Fixed Sosnowiec not appearing after the update: the merged-data cache key was
  bumped (v2 → v3) so a new build with a new city ignores the stale 6h-cached
  payload and refetches immediately, instead of waiting out the TTL. (You can
  also force this any time with the popup's **Refresh data** button.)
- Fixed "0 zł/m²" showing in the popup when a listing has an area but no parsed
  price — it now shows "—".

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
  title, archive tab title, notification title (PL + EN), 