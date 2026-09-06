# Plan to cover every Polish city and town

Prepared 5 September 2026. **Phase A shipped for review on 6 September 2026; Phase B is next.** The inventory refresh and its tests run on GitHub-hosted infrastructure and require no local or private-network production component.

The proposed scope is every Polish city and town, across municipal property-sale auctions: flats, houses/buildings, commercial premises, garages and land. This interprets the request for “all cities” literally and replaces the old demand gate on researching smaller towns for this expansion. The B2G commercial strategy in [GTM.md](GTM.md) and [GTM-SPRINT.md](GTM-SPRINT.md) remains the product context.

## 1. Outcome and scope

Every city should be discoverable in the product with an accurate coverage status. Every accessible, in-scope municipal auction stream should be monitored, with announcements, repeat rounds and published results connected conservatively. A city with no current auctions should remain discoverable; a blocked source must be distinguishable from an empty board.

Use the official GUS city inventory as the denominator. GUS currently lists **1,026 cities/towns**, with the SIMC inventory dated 1 January 2026. Import a dated snapshot and reconcile identities before treating that count as the implementation manifest. [Source: GUS TERYT](https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/aktualnosci/aktualnosci.aspx).

Boundaries:

- Geography means a city/town and its responsible municipal seller(s), with property location recorded separately. Municipalities may sell property outside the city boundary. Distinguish urban, rural and urban-rural gminas sharing a name; distinguish a municipal seller from the powiat seated in the same city.
- Include municipal property sales and their pre-announcements, cancellations and follow-up negotiations, labeled by procedure. Audit written-auction exclusions and support them explicitly instead of pretending all tenders are oral auctions.
- Rentals, procurement and tenant-only direct sales must not become auction-sale records. Preserve the existing separation of PKP/AMW and other institutional sellers from municipal coverage and metrics.
- “Source surveyed,” “adapter enabled,” “healthy monitoring,” “available in search,” and “SEO-indexable” are separate measures. Documented absence counts toward survey completion, never toward live auction coverage.
- Published results are collected where available. Unpublished results remain unknown; no minimum sales volume or achieved-price availability is required to monitor a legitimate stream.

## 2. Verified starting point

These counts come from the working tree, including its existing uncommitted changes, rather than older README headings. Source availability was not re-audited city by city for this plan.

| Measure | Observed state | Consequence |
|---|---|---|
| Enabled pipeline registry / city data index | 121 / 121, across 16 voivodeships | Correct baseline; README's 117 and older docs' 55 are stale |
| Researched city ledger | 336: 121 built, 50 BUILD, 156 NO-BUILD, 6 dropped, 3 deferred | Existing evidence is useful, but reflects the older flat-focused selection policy |
| Powiat backlog | 380 entries, 335 distinct city slugs, all marked done | County entries cannot be counted as distinct cities |
| Backlog references | 45 missing spike paths; all 336 master-city spike paths exist | Link shared seat cities to canonical evidence; do not invent 45 new research tasks |
| Research inventory gap | Approximately 690 cities, subject to official identity reconciliation | Long-tail inventory and research are still required |
| Partially implemented cities | Dzierżoniów and Góra are imported but deliberately absent from the exported registry | Included in the 50 BUILD queue; finish existing work before writing replacements |
| Existing identity alias | Master uses `bielsko-biala`; pipeline/data use `bielsko` | Add explicit identity mapping; preserve existing URLs and watchlist keys |
| Extension | `extension/background.js` hardcodes nine cities and merges their data | National data is unavailable through this surface |
| Website | National geography enabled, but `MIN_PUBLIC_AUCTIONS = 10` controls `public` and archive visibility | Valid thin/land-only cities can be hidden |
| Validation | `pipeline/scripts/sanity-check.js` blocks only Śląskie cities; others are warning tier | Published national data and validation policy disagree |
| Restricted egress | Exported registry flags Racibórz and Pszczyna | Follow current working-tree [PL-EGRESS-PLAN.md](PL-EGRESS-PLAN.md); older four-city blocker lists are stale |

Authoritative local references: [master ledger](spikes/master-cities.json), [backlog](spikes/backlog.json), [generated progress](spikes/SPIKE-PROGRESS.md), [registry](pipeline/src/cities/index.js), [data index](data/index.json), [adapter guide](pipeline/ADAPTER-GUIDE.md), [operating model](OPERATING-MODEL.md), [TODO](TODO.md). `spikes/NO-BUILD.md` is an older 73-city consolidation, not the complete 156-city exclusion list.

## 3. Phase A — establish the complete inventory and coverage contract

Deliver this before counting expansion progress.

1. Add a reproducible importer for GUS TERC/SIMC snapshots. Store source URL, effective date and checksum; select actual cities/towns, excluding city parts and districts. GUS publishes full CSV/XML files and documents their identifiers and structures. [GUS distribution formats](https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/formy_i_zasady_udostepniania/formy_i_zasady_udostepniania.aspx?contrast=default), [file structures](https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne_struktury.aspx).
2. Enrich `spikes/master-cities.json` into the complete city manifest, preserving all previous verdicts and evidence. Add official locality and municipal identifiers, pipeline ID/aliases, seller/source references, research dates and review deadlines. New cities start as unresearched. Preserve string identifiers and leading zeros.
3. Keep source capability separate from the old build status: asset classes, supported procedures, announcement/result availability, CMS family, evidence URLs, coverage period and accessibility. A city can have several sources, including a housing manager and City Hall.
4. Track implementation and runtime separately: unresearched / researching / ready / implementing / validating / monitored / blocked / no-source-found. Retain the old verdict as historical evidence rather than destructively relabeling everything.
5. Repair county-to-city mappings in `backlog.json`, including the 45 non-existent duplicate-seat evidence paths. Generate county and city totals independently. Preserve `bielsko` as its existing pipeline ID.
6. Extend `spikes/build-progress.mjs` to generate accurate counts, pending defaults, queues and review dates. Generate an explicit discrepancy report across manifest, exported registry, data index and evidence paths.
7. Update the contradictory expansion instructions in `OPERATING-MODEL.md`, `ROADMAP.md`, `spikes/README.md` and `pipeline/ADAPTER-GUIDE.md`; refresh README/TODO headline counts from generated state.

Acceptance: every official city has exactly one canonical entry; aliases and county-seat mappings resolve; all evidence links exist or are explicitly pending; a repeat import makes no unexplained identity changes. Add targeted importer/ledger checks for duplicate names, aliases, shared seats and new city-status changes.

## 4. Phase B — make monitoring and distribution ready for national coverage

This can proceed alongside inventory work. Complete its relevant gates before promoting new cities.

### B1. Quality and operational gates

- Replace the Śląskie-only sanity rule with explicit validation status shared by publishing and refresh. All promoted cities receive blocking data-integrity checks. Stage existing cities in cohorts, preserve last-good data on failure and expose their degraded status.
- Make health capability-aware. Land-only monitoring must not fail merely because `unique_properties` is zero. Verify land schema, identifiers, history and freshness as well as address-based properties. Test mixed streams and partial failures independently; one successful board must not hide another failed board.
- Preserve `valid_empty` semantics: an official board must be reached and positively identified as empty. Network errors, anti-bot pages and parser misses never prove an empty source. Record last attempt and last successful source check separately from output generation time.
- Retain expiring exceptions, per-city triage and recovery checks. Publish source freshness and monitored asset classes. Reconcile any current broken sources before attributing failures to new work.
- Keep Racibórz and Pszczyna unconditionally excluded from hosted automation while they require residential egress. Preserve last-good data and report the limitation; do not attach Tailscale, a private proxy or a local runner to production automation.

### B2. Scheduling and publication

Current refresh/backfill use one matrix job per city and competing Git pushes. Change this before the enabled set approaches the platform limit: GitHub documents a maximum of 256 matrix jobs per workflow run. [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

- Extend `pipeline/scripts/refresh-matrix.js` to emit bounded shards, initially about 4–5 small cities per shard, with runtime-based balancing and dedicated treatment for heavy OCR/rendering sources. Cap total jobs with headroom for setup, publication and provider work; split dispatches further when needed.
- Exclude every `needsResidentialEgress` adapter from hosted shards. No private-network or proxy credentials may enter the workflow. Coordinate throttling by actual source host, including shared CMS origins.
- Run each city in an isolated subprocess with its own timeout, result and logs; one failed city must not prevent remaining cities in the shard from running. Preserve single-city manual dispatch and city-specific triage identities.
- Have workers upload validated outputs, cache changes and per-city outcome manifests. A single municipal publication job verifies expected outputs, merges successful city deltas into the latest checkout, retains failed cities' data, rebuilds the index and commits once. Reject missing/duplicate city artifacts and conflicting cache payloads. Preserve provider updates and existing workflow serialization.
- Start with daily discovery for monitored sources and incremental attachment extraction. Separate bounded historical backfill from daily refresh. Any later lower-frequency policy must have an explicit freshness target and appear in health/product status.
- Measure job duration, request count, artifact size, checkout size and commit/deploy time after each wave. Retain JSON/static hosting initially; change storage only when measured cost or size requires it.

Acceptance: a representative shard completes despite one injected city failure; missing output cannot produce a false recovery; no private-network or proxy credentials are present; publication preserves history and unrelated data; refresh/backfill dispatch and triage remain usable. Use targeted matrix, publication and triage tests, then a staged hosted run.

### B3. Website and extension

- Generate a compact coverage catalog for every city, separately from heavy auction data. Users can search by city and disambiguate by voivodeship/powiat. Show “monitored,” “temporarily unavailable,” “no current auctions” or “not yet researched” according to evidence.
- Split `searchable`/monitoring eligibility from `seo_indexable`. Retain a content-quality threshold for sitemap inclusion, while allowing users to find legitimate low-volume datasets in the archive. Unresearched cities show a coverage state, not invented auction pages.
- Update `scripts/build-seo-pages.mjs` and `site/archiwum/index.html` together. Current archive startup eagerly requests three files per city; use bounded loading, city selection and a compact searchable summary for an explicit nationwide view. Load complete history on demand. Include land in counts and asset filters.
- Replace the extension's nine-city constant with cached discovery from `data/index.json` plus coverage metadata. Fetch data for selected cities, the matching tab and watched properties; use bounded concurrency, cache eviction and last-good fallback. Preserve watchlist migration, namespace behavior, notification links and PL/EN labels.
- Audit `extension/popup.js`, `archive.js`, `watchlist.js`, HTML selectors and city metadata together. Distinguish data access from in-page overlays: all monitored cities get search/archive support; DOM overlays remain a separately tracked capability using existing site adapters.
- Browser-test a new city, duplicate names, land-only and empty cities, failed requests, cache migration and a large synthetic city catalog. Bump extension manifest/popup versions together and update the changelog/store drafts. Actual store submission remains the release/account step.

Acceptance: a healthy city with one auction or only land is discoverable; an unknown source is never displayed as zero auctions; first load does not fetch the country's complete history; all 121 current cities are available through website and extension data views. Existing overlays and watchlists still work.

## 5. Phase C — finish the known 50-city queue

Start with the work already present, then use source families to reduce repeated discovery effort.

| Batch | Candidates | Work and reason |
|---|---|---|
| C0: complete unfinished work | Dzierżoniów, Góra | Reconcile Dzierżoniów's one-active/123-archive discrepancy against official boards; verify Góra's municipal identifier and widen its five-PDF discovery set. These are registry comments describing prior checks, not fresh counts. Keep disabled until reconciled. |
| C1: first new adapters | Ełk, Iława, Kluczbork | Existing spikes describe straightforward HTML or text-document sources and published results; verify that those paths still work and establish the improved acceptance flow. |
| C2: clear research uncertainty | Goleniów, Grodzisk Mazowiecki, Jędrzejów, Kolno, Lidzbark Warmiński, Lubań | These six queue entries are marked DESK. Obtain direct source/fixture evidence before implementation. |
| C3: remaining queue | Remaining 39 cities in the generated BUILD queue | Rank by verified source accessibility, reusable CMS family, source volume and effort; release in batches of 5–10. |

All 50 remain accountable: 2 unfinished + 3 initial + 6 desk + 39 remaining. Current queue: [SPIKE-PROGRESS.md](spikes/SPIKE-PROGRESS.md). Recheck source URLs before coding even where the June/July spike says LIVE; this is a freshness check, not a restart of the research.

For each adapter:

1. Read its spike, manifest state, existing implementation and closest working analog. Check announcements, results, archive, sibling asset boards and the actual seller.
2. Fetch representative real fixtures: announcement and result where published, multiple lots, negative/cancelled outcome and an out-of-scope rental/direct-sale example. Record expected fields and source evidence.
3. Reuse `core/fetch`, text/OCR/DOC extraction, normalization, property/land builders and history merging. Extract common CMS discovery helpers when several inspected sources share behavior; retain source-specific parsers where document formats differ.
4. Validate seller/procedure, address or parcel identity, auction round, dates, prices, area units and provenance. Distinguish plot area from building/unit area; preserve unknowns and unmatched outcomes.
5. Run targeted parser/crawler tests and syntax checks, then a bounded live end-to-end crawl in isolated output. Compare extracted rows with the official board, including pagination and attachments. Prime caches and set a documented backfill period.
6. Register as validating only after those checks. Require three scheduled successful refreshes, or positively verified empty checks, plus reviewed sample records before promotion. A parser test alone does not demonstrate source completeness.
7. Commit/release the complete adapter, fixtures/caches, validated data and ledger changes together; regenerate progress and confirm website/extension discovery. If a release fails, hold that city, preserve history and continue unrelated cities.

Expected milestone: **171 enabled cities if every existing BUILD candidate still qualifies and passes validation**. Do not guarantee this count before source rechecks.

## 6. Phase D — revisit prior exclusions and audit existing asset coverage

The 156 NO-BUILD + 6 dropped + 3 deferred entries need a scope review. Many old exclusions explicitly say “land/commercial only,” “too few flats” or “no achieved-price stream”; those reasons do not exclude a city from this plan.

- First classify all 165 records from their existing evidence. Preserve the original verdict and reason; create a new dated review for the broader scope.
- Run a small mixed-asset pilot before a bulk reopening. Candidate reviews include Lublin, Tarnów and Konin, whose repository notes identify land/commercial or garage streams. They are research candidates, not live-verified BUILD commitments.
- Inspect direct municipal sources and sample documents. Record per-asset capabilities and limitations. A source blocked from CI remains blocked until access works; missing online results remain a limitation rather than guessed sales.
- Reopen only confirmed accessible sale streams. Sources with no discoverable in-scope records receive a dated evidence summary and a 90-day discovery review, not a permanent exclusion based on flat volume.
- In the same workstream, audit the existing 121 adapters for flat-only filters and missing City Hall/housing-manager boards. Existing “built” status does not establish all-asset completeness; deliver source/asset additions through the same release gate.

Acceptance: all legacy exclusions are assessed against the new scope; each existing city has an explicit source-by-asset coverage record; newly qualifying sources join the queue and absent/blocked sources have named next checks.

## 7. Phase E — research and onboard the remaining cities

Use the imported manifest to identify the exact remaining inventory, approximately 690 cities at the present baseline. Never infer coverage for a small town from its powiat seat's adapter.

1. Pilot 30 previously unresearched towns across all 16 voivodeships and several CMS/source types. Include urban-rural municipalities and duplicate names. Measure research time, source accessibility, qualification rate and build effort.
2. Research in batches of 20–30; finish qualifying adapters in smaller batches of 5–10. Each city gets an official seller/source map, checked announcement/result URLs, format evidence, asset/procedure scope, verification date, next action and a persistent spike file.
3. Group build work by verified CMS family, then complexity and source volume. Keep a reserved share of each cycle for difficult and low-volume cities so the complete inventory eventually closes.
4. A time-boxed investigation that cannot resolve a source becomes unresolved/blocked with a specific follow-up. It does not become NO-BUILD merely because research ran out of time.
5. Reuse the Phase C acceptance flow. Reconcile progress after every batch and reserve maintenance capacity for regressions and source changes.

Acceptance: every official city has current evidence and a user-visible status; every identified accessible sale stream is monitored; all remaining gaps are explicit, assigned and scheduled. Claim exhaustive monitoring only when blocking gaps are actually closed.

## 8. Delivery sequence and planning estimates

| Milestone | Deliverable | Planning allowance |
|---|---|---|
| M0 | Inventory/identity contract, generated discrepancy report, source/asset model | 3–5 engineering days |
| M1 | National validation, land-aware health, sharded publication, scalable website/extension discovery | 10–20 engineering days; release/account waits separate |
| M2 | Resolve two unfinished adapters and deliver first three new candidates | 3–8 engineering days after relevant M1 gates |
| M3 | Close the remaining known BUILD queue | Reforecast after M2; working throughput assumption of 5–10 accepted cities/week implies roughly 5–10 weeks for the full 50-city queue |
| M4 | Review 165 legacy exclusions, audit built-city asset coverage, research 30-town pilot | Size after M0/M2; new adapter effort is additional |
| M5 | Complete remaining official inventory and source monitoring | Several-month programme; derive delivery date from pilot evidence |

These are estimates, not observed performance or fixed commitments. They assume sustained engineering time and reserve roughly 20–30% of ongoing capacity for maintenance. Workstreams may overlap, so allowances should not be mechanically added. Historical “seven adapters/day” notes are not a validated estimate for fully monitored all-asset national coverage.

After the pilot, forecast from **remaining research / measured research rate + qualifying source work / measured accepted-build rate + existing-asset upgrades + maintenance**. Report a range for blocked and OCR-heavy sources. Geographic city counts alone cannot predict the number of required source adapters.

## 9. Definition of done and continuing operation

- The complete dated GUS city inventory is represented once, with resolved aliases and scheduled administrative-update imports.
- Every city has current source evidence and a visible status. No unresearched city, disabled adapter or stale exception is counted as healthy monitoring.
- Every identified accessible municipal sale source has validated coverage for its declared assets/procedures; missing results remain explicitly unknown.
- All monitored cities are searchable on the site and in the released extension data views. SEO eligibility and overlay support are reported separately.
- Scheduled refresh, class-aware health, per-source failure detection, history retention and publication pass at full scale for 14 consecutive days without silent omissions. Document genuine upstream outages as coverage gaps; do not reset freshness to hide them.
- Runtime, source request volume, storage and maintenance effort fit the measured operating budget. Quarterly source reviews and periodic GUS imports generate actionable changes.

Phase A is complete. Recommended next slice: Phase B1/B2 national quality gates and sharded publication, plus a read-only source/asset audit of the existing 121 cities; then expose current datasets through both product surfaces. This makes each subsequent city addition measurable and usable.
