# October 2026 batch evidence

Reviewed 18–19 October 2026. The accepted work and remaining verification live
in [TODO.md](TODO.md#accepted-implementation-batch--18-october-2026). This document
records implementation evidence, not an additional task queue.

## Priority feed repairs

| Feed | Cause and repair | Isolated live probe, 19 October |
| --- | --- | --- |
| Gliwice | Garage labels such as `Kozielska 13 g. 1` split the street/building key; pipeline and extension normalisation now agree | 15 property listings, 82 land records, 7 designations |
| Gniezno | Missing current R36 TLS intermediate, land titles routed as flats, case number read as a date, earliest announcement selected despite later rounds | Authenticated TLS and 7 property / 7 land records; calendar validation and latest-announcement selection |
| Rawa Mazowiecka | Year-menu discovery required a removed ARIA role and searched a short byte window | 7 announcement and 7 result boards (2020–2026), 4 property / 10 land records |
| Golub-Dobrzyń | A scanned four-flat table was treated as one text block; cellar area and adjacent columns bled into the flat | 10 property / 6 land records; the four November flats pass a geometry/column regression |

Golub's retained 300-DPI source extraction identifies Piłsudskiego 9/1
(24.52 m², 62,000 zł), Chopina 16/6 (23.83, 62,800), Zamkowa 18/5 (22.28,
56,300), PTTK 23/5 (29.74, 74,800), all 12 November 2026. Missing or ambiguous
row prices fail extraction instead of borrowing a neighbouring row.

The probes wrote diagnostics under `/tmp`, plus reusable Linux text/OCR caches.
They did not publish a crawl or advance any city's `generated_at`, last-success
or source-attempt timestamp. Hosted publication and the subsequent three-day
health observation remain pending after push.

The other failed attempts were investigated using hosted artifacts:

- **Poddębice:** expired source certificate, independently reproduced locally.
  No TLS verification bypass or private transport was added.
- **Świętochłowice:** repeated hosted connection timeouts to the canonical `www`
  host; both official host forms were reachable locally during diagnosis. This
  is not proof of hosted recovery.
- **Wałbrzych:** repeated result/archive work timed out. Daily result discovery
  now has a bounded budget, empty text PDFs use OCR, and result notices accept
  published negotiations as well as auctions. Incomplete or failed result work
  is recorded as a degraded result stream; it cannot masquerade as a complete
  healthy source. Manual backfill retains a separate long budget.

The ten degraded-stream findings were also classified from their source checks:
Bytom, Zgorzelec, Trzebnica, Żagań, Bolesławiec, Ząbkowice Śląskie and Kwidzyn had
empty property streams while land succeeded; Chrzanów and Wschowa had empty land
streams; Gorzów had two misclassified flats creating a phantom land stream.
The Gorzów identities were repaired and its non-existent land capability removed.
The other empty streams retain their degraded state until a source-specific
positive empty-board check or a successful non-empty crawl establishes recovery.
Returning no rows alone is not evidence of no auctions.

## Twenty-one validation quarantines

Every enabled city is enforced again; the quarantine map is empty. No expired
quarantine deadline, price threshold or error allowlist was extended. The
national integrity check is clean on the repaired retained corpus.

`source-corrections-data.js` retains 50 guarded repairs with exact source text
SHA-256 evidence. Captured HTML/text fragments use LF and trim trailing whitespace; hashes identify the exact retained evidence bytes. `ledger-repairs-data.js` retains 42 cross-ledger/seller repairs,
including the original rows. Rules match a city, identity, date and retained
source; unrelated history and newer differing numerical values survive.
`reconcile-source-corrections.js` defaults to read-only, writes atomically with
`--write`, asserts unchanged `generated_at`, and recounts affected metadata.
A second reconciliation is idempotent.

The repairs include:

- Bydgoszcz participant counts glued to prices; Grudziądz cadastral/table counts
  glued to money and cellar areas overriding the flat; Kwidzyn hectare parcel
  areas mistaken for flat floor area; Gorzów row/fraction bleed and explicit
  unsold results wrongly marked sold.
- Wrocław HTML entities, notice prefixes, joint building/flat identities;
  Jelenia Góra's shared building headline; Słupsk joint frontages;
  Świnoujście's building range; Chełmno's cadastral preface; Drawsko's table-header
  street; Trzebnica's dot-decimal money; Toruń's separate units and deposit
  mistaken for price; Kraków's separate HTML-list lots.
- Land notices routed out of properties for Gniezno, Głubczyce and Stargard;
  Skarżysko's many parcels formerly joined at the auction venue; Kielce's real
  parcel groups, source date and malformed repeated decimal suffix.
- Confirmed rental/lease records excluded from sale ledgers. Głogów's genuine
  1/8 ownership share retains its published 7,000 zł price, while the share is
  labelled and excluded from whole-flat comparison scores/medians.
- Twelve AMW ETO notices removed from Warsaw municipal counts. Eight dated rows
  join the separate AMW provider history; four undated records remain in
  `data/providers/amw/unresolved.json` without an invented auction date or active
  auction claim. Source evidence and original rows remain in the repair rules.

There are deliberate unknowns: one Skarżysko historical result lost its parcel
and URL in the original parser; two removed Stargard multi-lot notices lost
per-lot pricing/date evidence; Kielce's source has conflicting district numbers.
They remain explicitly unassigned/unknown with original evidence retained.
No arbitrary price, date, parcel, sold outcome or source URL was manufactured to
pass a gate. These are limitations of retained evidence, not fresh-source claims.

## National discovery and release

`data/catalog.json` joins all 1,026 official SIMC cities to the 121 enabled
feeds. It carries region/county, separate searchable/SEO/overlay flags, source
status and check dates, without embedding histories. Unknown counts are null.
Both website and extension use the same bounded search component. Only selected
city histories are loaded. The website keeps four city payloads; the extension
keeps at most eight within a six-MiB city-cache budget and scans only watched cities. Legacy watch keys and repaired
identity aliases migrate; failed cities do not clear notification fingerprints.

The website's ten-auction SEO threshold remains. It no longer hides low-volume
or land-only datasets from the archive. Institutional providers remain a separate
`/archiwum-all` pilot. In-page overlays retain the existing seven city adapters
and existing host permissions; discovering a city does not install an overlay
on every municipal website.

Extension v1.33.0 manifest, popup and changelog agree. `scripts/package-extension.py`
creates a deterministic ZIP with a root manifest and verified referenced assets.
The source `extension/` directory remains directly loadable as unpacked. Store
copy/privacy were updated; real local Chromium captures are documented in
`screenshots/chrome-store/RELEASE-1.33.0.md`. No store submission was performed.

## Verification and publication boundary

Targeted tests cover every affected city parser, source evidence, ownership,
normalisation parity, durable repairs, land history, strict policy, coverage
health, publication/shard isolation, TLS security, catalogue/cache/watch
migration, version consistency and the interest gate. Browser checks exercise
desktop and mobile, a newly exposed city, duplicate locality names, land-only
coverage, unknown/failing sources, the unpacked Chrome extension, and the local
interest-draft boundary. A 5,000-city synthetic catalogue exercises search.

The assembled site passes its sitemap/canonical audit. The extension linter has
zero Chrome-relevant errors; Firefox-only MV3 diagnostics remain the pre-existing
explicit exceptions. Provider health, national integrity and hosted-runner policy
pass locally. Operational health still has 25 findings against retained source
timestamps (7 failed attempts, 5 stale datasets, 9 degraded streams, 2 expired
egress exceptions and 2 empty-source rechecks); these were not hidden or waived. The deployment, hosted source publication and post-release health
remain pending; do not infer them from these local checks.

The live analytics mismatch is repaired: Cloudflare is disclosed, network
suppliers' connection metadata is acknowledged, and the optional interest flow
makes no automatic subscription/dispatch claim. See [ALERT-VALIDATION.md](ALERT-VALIDATION.md)
for evidence distinctions and the external 30-day demand gate.
