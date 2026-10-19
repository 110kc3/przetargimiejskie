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

## Continuation — 19 October 2026

Current production data is `9bae21dd6`. Its operational check has **16 findings**:
ten degraded streams, one failed attempt, one stale dataset, two expired egress
exceptions and two empty-source rechecks. This supersedes the earlier 25-finding
snapshot without claiming that the following local work has reached production.

The scheduled [refresh 39230259387](https://github.com/110kc3/przetargimiejskie/actions/runs/39230259387)
published municipal output. Committed metadata shows ready/healthy property and
land streams for Gliwice, Gniezno, Rawa Mazowiecka, Golub-Dobrzyń and Poddębice.
Oświęcim and Nakło also have fresh healthy hosted output. Three-day recovery is
still unverified. That workflow failed its separate provider gate: PKP's primary
runner and both fresh-runner retries timed out connecting to `www.pkp.pl`.
Retained provider health did not imply a successful latest crawl.

CodeQL alerts [#130](https://github.com/110kc3/przetargimiejskie/security/code-scanning/130)
and [#131](https://github.com/110kc3/przetargimiejskie/security/code-scanning/131)
identify chained entity replacements in `core/finn-bip.js`. One-pass entity
decoding now preserves nested escapes and replaces invalid Unicode references
without crashing parsers. Shared parser and durable-heal regression checks pass;
the alerts remain open until hosted analysis observes the fix.

Lubin's current board contains two genuine sales that its parser missed:

| Official text-PDF source | Parcel / district | Area | Starting price | Auction / round |
|---|---|---:|---:|---|
| [30174](https://bip.um.lubin.pl/attachments/30174/download) | 963 / 3 | 739 m² | 150,000 zł | 23 October 2026 / II |
| [30173](https://bip.um.lubin.pl/attachments/30173/download) | 1030/34 / 9 | 11,107 m² | 1,700,000 zł | 6 November 2026 / II |

Exact `pdftotext -layout` fixtures retain source text. The new reader handles
KW-first and parcel-first tables, whole parcel numbers, wrapped headers and
zoning prose naming housing/services/garages without misclassifying the plot.
The first sale's restricted participation is retained in listing notes. A full
isolated Lubin refresh recovers both plots and passes strict data sanity and
land-schema checks. Its old empty-source exemption was not renewed.

Wschowa's [active board](https://bip.gminawschowa.pl/przetargi/29/status/0/)
explicitly reports no entries. Żagań's [active board](https://bip.zagan.pl/przetargi/344/status/0/)
has one lease, outside the sale scope. Source board-region fixtures (line endings
and trailing blanks normalized) prove these observations. Adapters now emit
positive empty-stream checks only after
identifying the active board and its explicit empty message or fully parsed
complete rows. Fetch/layout failures, unknown or unparsed sales, unsupported
assets and incomplete pagination cannot establish an empty stream. Existing
last-good history remains subject to the normal refresh preservation rules.
Full isolated Wschowa/Żagań refreshes pass strict sanity and coverage health:
Wschowa retains five properties/nine historical plots with a verified-empty
current land stream; Żagań retains 13 properties/59 plots with a verified-empty
current property stream. Their historical records are preserved.

Bytom's property-board probe returned HTTP 403, while its separate catalogue
returned 13 land plots and no units. This does not establish a genuinely empty
property source. Other degraded streams remain in the accepted repair queue.
No threshold, TLS check, timeout budget or egress exclusion was relaxed.

The continuation's local checks do not prove hosted recovery. Production files
and source timestamps are untouched; isolated crawl output is validation only.
Push verification is pending at [Actions on main](https://github.com/110kc3/przetargimiejskie/actions?query=branch%3Amain).


## Further source repair and partial asset audit — 19 October 2026

Bolesławiec's portal now presents a Let's Encrypt YR1 certificate and omits its
intermediates. The previous Certum compatibility mapping fails; the existing
reviewed YR1 + ISRG cross-sign chain verifies it against Node's public roots
without disabling hostname, expiry or complete-chain checks. No new trust anchor
is added. The separate result-BIP mapping remains Certum.

The official residential RSS has two rows: Rynek 29/30 unit 9, 48.52 m²,
225,000 zł, III round on 15 October; Mazowiecka 13b/5, 107.90 m²,
399,000 zł on 5 November. The source RSS fixture covers parsing both rows and
uppercase `III PRZETARG`; lowercase conjunction `i` still cannot become round I.
Targeted parser and TLS security-policy checks pass.

Trzebnica's known-history lookup previously read only properties. It now opts
into resolved property and land outcomes without changing other adapters'
default lookup. Archived announcements remain eligible for later result
attachments; an expired announcement is not treated as a captured result. A corrupt/missing stream does not erase the
other stream's known URLs. Land output is explicitly incremental and merges
with retained plots/listing outcomes. Complete XML enumeration checks precede
positive empty proof; current records are never skipped merely because their
URLs are known. Failed pages/details/attachments and unparsed records withhold
empty proof, and incomplete result discovery is exposed to refresh. Exact board
article excerpts and targeted failure/history tests cover these boundaries.
Historical rows missing an identity now use their own announcement PDFs, capped
at 12 uncached identity extractions per pass within the existing crawl budget.
Cached documents do not consume that cap, so unsupported older rows cannot starve
later uncached material. Remaining unparsed rows keep discovery incomplete.
A source fixture also reproduces `149.450.00 ` being parsed as 14,945,000 zł;
trimming before decimal-tail handling restores the source's 149,450 zł amount.
Bolesławiec's rolling RSS output likewise merges into retained land history.

Eight partial source/asset checks now live in `spikes/master-cities.json` and the
owning city notes, including the earlier committed Lubin/Wschowa/Żagań evidence.
The generated ledger reports 0 complete, 8 partial and 113 unchecked enabled cities. `observed` means source evidence, not complete parser
support. No full-review deadline, runtime declaration, official identity or
historic build verdict was changed. Full asset/result audits remain open.

Two source/implementation gaps were positively identified:

- Zgorzelec's current board has one land sale and one procurement notice. Its
  announcement index links year boards that the adapter does not walk. The
  result root is a subcategory placeholder; the linked public year views tested
  empty. A zero result count is not a complete-source claim.
- Ząbkowice notice 11008/PDF 23628 sells a 19.43 m² garage for 44,000 zł on
  18 November, linked to a 1/6 share of parcel 10/21, Osiedle Wschód-04.
  The source publishes no street number. The current address-keyed parser drops
  it. This remains a visible implementation gap; no identity or asset class was
  fabricated to clear health. The 129 m² plot and 19.43 m² garage are distinct.

The prior push `046f3b07c` was checked once: its refresh was queued and Security
running. No additional workflow was dispatched or polled to completion. Current
production health and this batch's hosted acceptance remain unverified.


Chrzanów's current official SPA article 2950984 is a real missed sale. A live
Chromium render and retained article-body fixture show parcels 6297, 1535 and
1559/1 sold together: individual areas 4.0914/0.0897/0.1628 ha, displayed total
4.3439 ha (43,439 m²), one starting price of 8,005,000 zł, auction 17 December
2026. The five-column reader emits one parcel-group record and verifies the
area total, single price and date. Contradictory totals, multiple price lines
and invalid dates are rejected. Earlier legacy individual-lot tables still pass.
Unrelated `m,` BIP menu links are no longer rendered as articles. Rolling land
output retains historical plots. An isolated actual Chromium refresh has four
plots (the previous three plus the combined current lot) and passes strict
sanity and coverage health. Hosted recovery remains pending.


Final local verification: targeted parser, source-state, known-URL, land-history,
TLS and inventory tests pass. All three final isolated city outputs pass strict
sanity. Bolesławiec has 13 properties/five plots and no coverage-health findings;
Chrzanów has four plots and no coverage-health findings. Trzebnica has
13 properties/44 plots (41 before), with previous property identities (including verified aliases), plot keys
and listing dates retained. Its property/land checks are healthy, while one
result-discovery degradation remains explicitly visible. No global health success
is claimed. Production files/timestamps and caches were not changed by the local
probes. The new push's hosted verification is pending; check its exact commit
once next session without waiting after push.


The completed crawl reached two previously unparsed result PDFs:
[7167](https://bip.trzebnica.pl/attachments/download/7167) and
[7396](https://bip.trzebnica.pl/attachments/download/7396). Both explicitly name
Boleścin building 50/unit 2, starting at 149,450 zł, with negative outcomes on
10 August / 21 September 2026. Exact extracted-text fixtures retain the evidence.
The parser now reads that explicit identity and supplies canonical `source_pdf`
provenance, so property building and same-date deduplication retain the unsold
outcome rather than preferring an archived announcement.

The [February announcement 6341](https://bip.trzebnica.pl/attachments/download/6341)
independently prints Boleścin 50/2. An exact date + announcement-URL migration
moves only the three confirmed historical events from `bolescin|0|2` to
`bolescin|50|2`; unrelated unknown-building rows cannot be swept into it. The
legacy watch alias is emitted only when the whole old identity is resolved.
The February outcome remains archived/unknown, not inferred from later results.
A replay of the two actual result texts through the real property builder,
history merge and durable healer retains 93.4 m², all three dates, the old watch
alias and both published unsold outcomes; strict city sanity passes afterwards.
