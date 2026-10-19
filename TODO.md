# TODO

> **Open backlog only** — shipped work lives in [CHANGELOG.md](./CHANGELOG.md)
> (extension) and git history (pipeline/site/data). **City inventory refreshed
> 6 September 2026; city-health/security follow-up refreshed 19 October 2026.** Structure/tiers/gates live in
> [ROADMAP.md](./ROADMAP.md); manual headless RPi5 work is specified in
> [REMOTE.md](./REMOTE.md), residential-egress operating policy in
> [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md); city coverage is the generated ledger
> [spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md) (1,026 official cities ·
> 121 enabled feeds · 50 BUILD-ready · 690 unresearched).
>
> Recently shipped (see git log, not re-listed here): the entire 3-July handover
> landed in `45dcb09` (extension CI, P2-D verified-heals in refresh, TG PDF
> price/area fix, newsletter generator + first seeded run 2026-07-06); daily
> refresh + failure-triage issues live; Bydgoszcz/Gorzów rebuilt 2026-07-06;
> 2026-07-07 session — brzeg waiting-room handling, the former proxy-egress
> experiment (removed 2026-09-08), EXEMPT_NEW cleanup + busko-zdrój entry, docs truth pass
> (ROADMAP/REMOTE/TODO/README); 2026-07-07 ops-hygiene pass — issue-sync
> anti-flap close guard + title-ownership guard (kills the busko-zdrój
> open/close flap and dual-failing title churn), generalized challenge-page
> detector (`pipeline/src/core/challenge-page.js` wired into `getText` so any
> future anti-bot/waiting-room page auto-classifies source-unreachable),
> `LEGIT_EMPTY` slow-recheck allowlist for gdansk/augustow, P2-D Katowice junk
> allowlist dropped (fold now runs inside refresh), and a `todayWarsaw`
> small-ICU fix (was returning `MM/DD/YYYY` on minimal Debian Node builds);
> 2026-07-07 zero-data investigation
> (live-crawled from the Pi) — busko-zdrój/oswiecim/chrzanow are NOT broken,
> their boards just have no active flats right now; busko→LEGIT_EMPTY,
> oswiecim/chrzanow reasons corrected + clocks reset (OCR verified excellent, CI
> Chromium present — the "OCR quality"/"SPA" worries were misdiagnoses);
> 2026-07-07 zero-data batch 2 — **3 real crawler bugs found + fixed**:
> walbrzych (0→12) + gniezno (0→4) both dropped every listing for a missing
> parsed `.address`, wejherowo (0→8 active) mis-parsed an unclosed-anchor grid;
> added a `buildCityData` guard + regression tests (verified live end-to-end);
> 2026-07-10 session — **belchatów #28 crash fixed** (its first live result
> post tripped `r.notes.length` in refresh.js → whole-city TypeError since
> 07-08; refresh.js accumulation now defensive `?.length ?? 0`, belchatów emits
> `notes:[]` and skips price-less result stubs, canonical ref fields); **opole
> #14 un-broken 0→45 unique / 93 active** — the 07-07 challenge-page detector
> false-positived on SISCO's benign "Proszę czekać" spinner + `<noscript>`
> meta-refresh and threw opole's whole harvest; added a link-sparseness gate
> (`anchorCount < 10`) that hardens all 12 `bip.um.*` SISCO cities; **raciborz
> rokowania price** fixed (3 flats `null`→130k/90k/105k via "Cena wywoławcza do
> rokowań" label); **bytom .doc retention VERIFIED** (0 concluded dropped over 6
> refreshes/3 wk); **chełm 10-doc gap investigated → all land, deferred** (zero
> flats lost); **RODO site-policy draft** written (`RODO-DRAFT.md`, awaiting
> Kamil + lawyer before the newsletter/lead launch).
>
> **Env tags** (ROADMAP legend): **[RPI5]** headless-ok · **[GUI]** needs
> desktop Chrome · **[ACCOUNT]** Kamil-only account/business action.

## 1 · Ops / health

### Current continuation — 19 October 2026

The current request is to finish the accepted tasks in this queue and its linked
plans. Continue implementation, verification and documentation; historical ideas,
owner-account actions and explicitly deferred commercial work retain their gates.
The older dated sections below preserve diagnosis and do not override this state.

- **Security repair implemented:** CodeQL alerts #130/#131 identify repeated HTML
  entity decoding in `pipeline/src/core/finn-bip.js`. The decoder now processes
  entities in one pass and tolerates invalid Unicode references. Targeted shared
  parser and durable-heal tests pass. Alerts remain open until hosted CodeQL
  observes the fix; no alert was dismissed and no gate was weakened.
- **Lubin repaired:** the current official announcement board is not empty. Its
  two PDF table layouts were both missed by the parser. Exact source fixtures now
  recover parcel **963**, district 3, **739 m² / 150,000 zł**, auction 23 October,
  and **1030/34**, district 9, **11,107 m² / 1,700,000 zł**, auction 6 November.
  Both are second rounds; the first retains a restricted-participation note.
  Isolated end-to-end refresh and strict integrity pass. The production exemption
  date was not renewed and no locally generated dataset was published.
- **Wschowa / Żagań source checks repaired:** the former's active board explicitly
  says there are no entries; the latter has one lease and no current sales.
  Adapters return positive empty-stream evidence only after identifying the
  authoritative active board. Fetch failures, changed markup, unparsed/unsupported
  sales and incomplete pagination cannot establish emptiness. Exact board fixtures
  and targeted negative tests pass. Full isolated refreshes pass strict integrity
  and coverage health while retaining history; hosted recovery remains pending.
- **Bolesławiec follow-up implemented:** the portal rotated from Certum to
  Let's Encrypt YR1 and omits intermediates. Its host now uses the already
  reviewed YR1 chain with full hostname/expiry/root verification. A verified
  live RSS read recovers two flats; uppercase `III PRZETARG` now retains round 3.
  The separate result-BIP certificate mapping is unchanged. Targeted parser
  and security-policy checks pass; hosted source recovery remains pending.
- **Trzebnica incremental-source repair implemented:** known historical URLs
  now include resolved outcomes from its separate land ledger. Unresolved
  archived announcements remain eligible for later result attachments.
  Incremental parcel output uses the history merge instead of replacing retained
  plots. Missing historical identities are extracted from source PDFs in bounded
  uncached slices; a real decimal-dot/trailing-space price defect is fixed.
  Complete XML page/count checks, current-record fetches and extraction checks precede positive empty
  proof; incomplete result discovery stays degraded. Targeted tests cover known
  history, pagination/detail/PDF failures and retained sold outcomes. Final
  isolated output retains prior property identities (including verified aliases),
  plot keys and listing dates, has
  13 properties / 44 plots (previously 41 plots), and passes strict integrity.
  Incomplete result discovery remains explicitly degraded; this is not a green
  whole-source claim. Local evidence is recorded in the repair document.
  Two newly reached result PDFs also identify Boleścin 50/2 and confirm the
  August/September auctions were unsold. Their canonical `source_pdf` provenance
  now survives property building/deduplication. Exact-source migration moves the
  former unknown-building events with a watch alias; unrelated rows remain
  untouched. A replay through the actual builder/merge/healer and strict sanity
  passes. The February announcement confirms the same building number, while
  its historical outcome stays unknown/archived.
- **Chrzanów repaired:** official article 2950984 uses a new HTML table for
  one jointly priced lot (parcels 6297, 1535, 1559/1; 43,439 m²; 8,005,000 zł;
  17 December 2026). The parser now retains the grouping and validates its total
  instead of dropping the sale or repeating its price per parcel. Discovery
  excludes unrelated BIP menu links, and rolling land output merges history.
  Targeted tests and an isolated actual Chromium crawl, strict sanity and
  coverage-health checks pass. Hosted recovery remains pending.
- **Existing-city asset audit is now recorded in the canonical manifest:**
  **0 complete / 8 partial / 113 unchecked**, generated in
  [SPIKE-PROGRESS.md](spikes/SPIKE-PROGRESS.md). The partial checks cover
  Bolesławiec, Trzebnica, Chrzanów, Zgorzelec, Ząbkowice Śląskie, Lubin, Wschowa
  and Żagań (the latter three fold in evidence committed in `046f3b07c`).
  They retain the full
  review deadlines and do not promote hosted runtime status. Zgorzelec's linked
  year archives are not crawled. Ząbkowice notice 11008 is a genuine 19.43 m²
  garage / 44,000 zł sale missed because no street number is published; its
  parcel/share must not be relabelled as a street address or bare-land sale.
- **Hosted feed recovery observed:** current committed data from scheduled
  [refresh 39230259387](https://github.com/110kc3/przetargimiejskie/actions/runs/39230259387)
  has ready, healthy streams for Gliwice, Gniezno, Rawa Mazowiecka,
  Golub-Dobrzyń and Poddębice. This proves one successful publication, not three
  days of stability. Oświęcim and Nakło also have fresh healthy hosted output;
  their July repair checkboxes below are closed as superseded.
- **Shared land retention repaired:** complete current boards now merge into
  published history under the default `MERGE_HISTORY` policy. An explicit fresh
  rebuild remains possible; partial/empty-source safety remains enforced.
  Verified empty boards archive retained active announcements, and past retained
  announcements age without fabricating results. Regression checks pass.
  The scheduled `c02fab47c` publication replaced two land windows. Recovery from
  the immediately preceding published `046f3b07c` restores **43 missing plot keys /
  85 auction events**, retaining the newer records: Sandomierz **22 plots / 39
  events**, Ząbkowice **71 / 120**. Only land counts change in metadata/index;
  all source attempt/success timestamps remain unchanged. National integrity passes.
- **Current production health: 15 findings** against scheduled `c02fab47c`:
  eight degraded streams, four failed attempts, two expired egress exceptions
  and one empty-source recheck. The local source fixes are not counted as hosted
  recovery. Świętochłowice, Kraków, Olkusz and Jarocin retain failed-attempt status;
  Lubin, Wschowa and Żagań now have healthy/verified-empty hosted source checks.
- **Latest refresh workflow failure diagnosed:** municipal publication completed;
  the provider gate failed because PKP timed out connecting to `www.pkp.pl` on
  the primary and both fresh-runner retries. Last-good provider health alone
  does not prove the latest crawl worked. No additional retry budget, private
  transport or workflow dispatch was introduced.

**Next accepted work:** inspect the natural hosted Security/source outcomes once
for the next push; continue source-specific repairs for Bytom, Zgorzelec,
Ząbkowice Śląskie and Kwidzyn, Trzebnica's remaining unparsed history/completeness,
and Wałbrzych's incomplete
result stream and Busko-Zdrój's expired empty-board review. The Bytom property
board returns HTTP 403 in the current local probe while its catalogue yields 13
land plots and no units; that does not prove an empty property board. Continue
the current 121-city source/asset audit before the separate new-adapter queue.
Triage the new Kraków/Olkusz/Jarocin failed publications next.
PKP/Świętochłowice reachability and Racibórz/Pszczyna's excluded egress remain
visible gaps. Store submission, Search Console acceptance and received 30-day
interest evidence remain external gates. See [repair evidence](REPAIR-EVIDENCE-2026-10.md).

**Push verification pending:** [Actions on main](https://github.com/110kc3/przetargimiejskie/actions?query=branch%3Amain).
The first continuation `046f3b07c` was checked once at the start of the next turn:
[refresh 39323322737](https://github.com/110kc3/przetargimiejskie/actions/runs/39323322737)
was queued and [Security 39323322660](https://github.com/110kc3/przetargimiejskie/actions/runs/39323322660)
was running. Both remain unverified here; no CI wait or new dispatch was added.
Check the next continuation commit once next session; never wait after pushing.

### Notification noise reduction — 19 October 2026

Owner request: reduce excessive project emails. Automated city incidents now stay
quiet on repeat failures from either monitor. Exemption/recheck ages and changing
failed-attempt timestamps no longer cause daily title updates. Changed failures
update the issue without an additional comment; new incidents and recoveries
retain their existing lifecycle. Health checks, failure statuses and recovery
guards remain enforced. Targeted issue-sync tests cover both monitor directions,
legacy-title migration, daily changes, changed failures and recovery.

Personal watch/Actions settings could not be inspected or changed with the
current GitHub token (it lacks `notifications` scope). Search Console email
preferences are separate account controls and were not changed. Refresh for
`8401cf62b` passed [run 39218375397](https://github.com/110kc3/przetargimiejskie/actions/runs/39218375397);
Security failed on the decoder findings addressed above. Original verification
was recorded at [Actions on main](https://github.com/110kc3/przetargimiejskie/actions?query=branch%3Amain);
no additional notification change was required by that run.

### Accepted implementation batch — 18 October 2026

The owner selected review recommendations **1, 2, 3 and 4**, with push after the
implementation batch. **Implementation pushed as `6ac3fd36c` on 19 October.**
Evidence: [REPAIR-EVIDENCE-2026-10.md](REPAIR-EVIDENCE-2026-10.md).

1. **Feed repair implemented and source-probed.** Gliwice, Gniezno, Rawa Mazowiecka
   and Golub-Dobrzyń return real rows in isolated live probes. Wałbrzych now bounds
   result work and exposes incomplete results as degraded. Poddębice's expired
   source certificate and Świętochłowice's hosted connection timeouts remain visible
   upstream conditions. Other empty/degraded streams were investigated and are
   not relabelled as valid-empty without source proof. No local crawl was published.
2. **All 21 expired quarantines retired through repairs.** Fifty guarded source
   corrections and 42 ledger/seller migrations retain exact evidence and original
   rows. All 121 enabled feeds enforce integrity checks. National sanity is clean;
   no deadline or threshold was relaxed. Every modified existing data file retains
   its source `generated_at`. Undated/unassigned evidence remains explicitly unknown.
3. **Phase B3 implemented; extension v1.33.0 prepared.** Shared compact catalogue:
   1,026 official cities, 121 enabled feeds, independent SEO/overlay eligibility,
   bounded selected-city loading, cache/failure/watch-key migration. Targeted and
   actual desktop/mobile/unpacked-Chrome checks pass. ZIP and real browser captures
   are prepared; store submission remains an owner-account action.
4. **Self-service measurement implemented.** Cloudflare disclosure now matches the
   configured production provider. `/alerty/` prepares a voluntary e-mail draft;
   it sends nothing and claims no signup. Page views, received confirmations,
   willingness to pay and revenue remain separate. The private evidence reporter
   enforces the 10-interested / 3-willing-to-pay / 30-day gate in
   [ALERT-VALIDATION.md](ALERT-VALIDATION.md). No billing, newsletter send or lead
   resale was implemented.

Operational health against retained timestamps remains **25 findings** (7 failed
attempts, 5 stale datasets, 9 degraded streams, 2 expired egress exceptions and
2 empty-source rechecks). This batch does not claim a green production health run.

**Hosted verification checked once on 19 October:** `6ac3fd36c` passed
[refresh/publication](https://github.com/110kc3/przetargimiejskie/actions/runs/39207555627),
[deployment](https://github.com/110kc3/przetargimiejskie/actions/runs/39207555711) and
[extension CI](https://github.com/110kc3/przetargimiejskie/actions/runs/39207555628).
[Security failed](https://github.com/110kc3/przetargimiejskie/actions/runs/39207555729)
and needs diagnosis in the accepted technical queue; no failure was suppressed.
Per-source recovery and three-day health remain unverified. Do not dispatch new
workflows or add a local production refresh path merely to clear the gate. Branch Actions:
https://github.com/110kc3/przetargimiejskie/actions?query=branch%3Amain.

**External acceptance:** Search Console property ownership/sitemap acceptance;
Chrome Web Store submission; source administrator/network recovery where required;
actual deployment date and 30-day received-message evidence. DNS and page views
alone do not close those gates. No subsequent city expansion or unrelated backlog
item was selected by this batch.

### Repository, health and traffic review — 18 October 2026

Snapshot: `cffa7bcfeaab6a5f2a9b89b7d59b8efb772dc8f3` (today's municipal
publication). Local `main` was fast-forwarded by 173 commits after comparing all
37 dirty/untracked paths with GitHub. Fifteen files already matched GitHub;
the remaining differences were earlier release/proxy/security/inventory work
superseded by the September releases and TLS repair. The four local-only proxy
appliance files belong to the retired design. All previous local content is
preserved in stash `2712e13fde70d8599e641ee8430c7fcd46a3fa29` (message:
`preserved pre-sync September work 2026-10-18; superseded by origin/main`). Do not
apply that stash wholesale: it would restore the removed proxy and disabled TLS
verification. No local-only newer implementation was found.

**Verification:** today's [refresh](https://github.com/110kc3/przetargimiejskie/actions/runs/39111471289)
passed setup (full offline suite on Node 20.20.2), provider refresh and municipal
publication; [deployment](https://github.com/110kc3/przetargimiejskie/actions/runs/39113587845)
succeeded. CodeQL alert #128 is fixed (25 September). The
[health run](https://github.com/110kc3/przetargimiejskie/actions/runs/39125291672)
completed issue reconciliation and failed its health enforcement gate.

Local read-only checks on Node 24.18.0: 47 focused tests across land merging,
TLS security, coverage health, validation policy, shard isolation, artifact
publication and issue sync passed; national integrity, provider health and hosted
runner policy passed. A fresh site build passed the SEO audit for all **2,873
sitemap URLs**, with Cloudflare injected into 2,875 HTML pages. Live landing,
archive, reports, privacy, city directory, robots, sitemap and data index all
returned HTTP 200; the live index matches today's publication timestamp.

| Current measure | Observed state |
|---|---|
| Registered cities / public website cities | 121 / 62 |
| Index coverage state | 83 monitored, 34 degraded, 2 valid-empty, 2 unknown |
| Validation policy | 100 enforced, 21 quarantined; all 21 review deadlines expired on 6 October |
| Latest hosted city outcomes | 112 ready, 7 failed, 2 excluded from hosted automation |
| Operational health (`STALE_DAYS=3`) | 47 findings across 38 cities |
| Finding classes | 21 expired quarantines, 10 degraded streams, 7 failed attempts, 5 stale datasets, 2 expired egress exemptions, 2 empty-source rechecks |
| Published municipal properties / land plots | 2,479 / 1,628; up from 2,353 / 1,606 on 5 September |
| Separate institutional providers | PKP and AMW both pass current health |

The seven failed hosted attempts are Gliwice, Świętochłowice, Wałbrzych,
Gniezno, Poddębice, Rawa Mazowiecka and Golub-Dobrzyń. Gliwice is **44 days
stale** (last-good 4 September; junk-street gate); Gniezno is 20 days stale,
Golub-Dobrzyń 19 days (cellar-area gate), Rawa Mazowiecka 10 days and
Świętochłowice four days. Wałbrzych's latest attempt timed out but its last-good
publication is from yesterday. Racibórz/Pszczyna remain explicit hosted-only
coverage gaps; their exceptions must not be silently extended or bypassed.

**Traffic, 11–18 October, 18:30 UTC:** the existing account's read-only
[aggregate report](https://github.com/110kc3/seo/actions/runs/39154419214)
reports **769 browser page views**, **706 likely-human views**, **371
likely-human visits**, two likely-bot views and 61 unclassified views. These are
Cloudflare estimates, not unique people. Sample intervals reach approximately
1.04; independently grouped dimensions do not reconcile exactly, so do not use
their sums as a conversion denominator. Reported leading page groups include
Łódź (43 views), home (42), city directory (28), reports (27), Wrocław (26) and
Katowice (23); Google referrals are present. One current window establishes use,
not a growth rate. Edge request/bot logs are unavailable through this account
because the domain is hosted outside its Cloudflare zones. No conversion or
revenue evidence was obtained. The workflow artifact expires after 14 days;
these dated figures preserve the relevant baseline here.

Cloudflare is the live analytics provider (repository variable and production
HTML), but `site/privacy/index.html` still names Umami. DNS now contains a
`google-site-verification` TXT record; this supersedes August's missing-record
diagnosis without proving Search Console ownership, sitemap acceptance or exact
index coverage. Those account-owned checks remain unverified.

**Prioritized recommendations — not an accepted implementation batch:**

1. **Recover stale auction data first** (medium, several source-specific fixes).
   Start with Gliwice #426, Golub-Dobrzyń #610, Gniezno #603 and Rawa Mazowiecka
   #744; investigate the other failed/degraded sources by recorded cause.
   Acceptance: source-faithful fixtures and targeted tests, then successful hosted
   publication and three-day health for each selected city. Preserve last-good
   data and strict gates; do not manufacture freshness locally.
2. **Retire the 21 expired validation quarantines in small cohorts** (large).
   Repair the underlying data/parser defects, then remove each quarantine after
   its blocking sanity and hosted health pass. A date extension alone does not
   meet acceptance. This is existing Phase B1 follow-up, before new adapters.
3. **Deliver national product discovery, Phase B3** (large). Website publishing
   currently exposes 62 of 121 feeds and the extension still hardcodes nine.
   Acceptance: all official inventory entries discoverable with accurate state,
   lazy loading for enabled feeds, explicit empty/blocked status, mobile/browser
   verification and extension release checks. Keep SEO eligibility independent
   from discovery; no new adapters are required for this slice.
4. **Make self-service demand measurable** (small discovery slice, no billing or
   service sales). First correct the provider disclosure and verify Search Console
   sitemap/index coverage in the account. Measure one optional interest action
   for saved-search/auction alerts on existing high-traffic city/property pages.
   Suggested gate: in 30 days obtain ten voluntary interested users and three
   explicit willingness-to-pay confirmations; otherwise do not build billing or
   broaden acquisition. Define the event/consent details before implementation;
   page views alone cannot pass this gate. Manual consulting is not proposed.

Next accepted technical sequence remains source/quarantine repairs and the
current-city source/asset audit, then B3, then the existing BUILD/research queue
in [ALL-CITIES-PLAN.md](./ALL-CITIES-PLAN.md). Recommendations above require a
selection before implementation. Documentation push verification is pending at
[Actions on main](https://github.com/110kc3/przetargimiejskie/actions?query=branch%3Amain);
do not wait after pushing.

### CI recovery — 25 September 2026

The 24–25 September audit traced the daily refresh failure since 11 September to
`build-land.test.js`: once an announcement's 10 September auction date passed,
`buildLand` archived it and `mergePartialLand` overwrote an existing sold result.
The setup gate stopped every city/provider crawl, producing 115 stale-data issue
titles and repeated health failures; deployment success did not imply freshness.

The repair preserves resolved results when incoming announcements are active or
archived, with fixed-clock boundary tests. Municipal TLS compatibility now uses
reviewed host-specific intermediate certificates with full chain, hostname and
expiry verification. This removes the cause of CodeQL alert #128 without a
scanner exemption. Issue sync uses one open-issue lookup, suppresses unchanged
owner notifications and removes changing stale ages from titles. Health has a
15-minute job budget and a 10-minute notification limit.

Local verification: 37 targeted Node 20.20.2 tests; workflow lint and hosted-runner
policy; complete verified TLS handshakes to all 13 compatibility hosts on
25 September. No production data was refreshed locally.

- [x] **Verify the CI-recovery push once next session:** checked 18 October.
      The full Node 20 setup gate and publication run; CodeQL alert #128 is
      fixed; today's health run reaches enforcement after issue reconciliation.
      Remaining municipal health failures are quantified in the current review
      above and are not represented as a green health result.
- Residual source incidents (Gliwice, Świętochłowice, Kłodzko, Brzeg and degraded
  source streams), Racibórz/Pszczyna's hosted-egress exclusions and dated validation
  quarantines remain separate from this pipeline repair. Reassess their recorded
  failures after the first successful hosted refresh; do not bypass their gates.

### Deferred execution queue — recorded 31 August 2026

These are the deliberately unstarted steps left after the current failure-repair and
security pass:

- [x] **National extension coverage (previous step 5):** implemented in `6ac3fd36c`;
      all 121 feeds use lazy catalogue discovery, scalable region filters and PL/EN
      labels. Actual browser checks and extension CI passed; v1.33.0 ZIP,
      screenshots and store copy are prepared. Owner store submission remains open.
- **CI sharding shipped in Phase B2 (8 September):** 119 hosted-safe cities now
      run in 52 source-aware shards with one municipal publisher. Remaining
      source/quarantine work and B3 precede the 50-city BUILD-ready queue.

### Current city-issue queue — live-audited 23 August 2026 [RPI5]

This is the authoritative disposition of all 27 open `[city-broken]` issues at
the audit date. Every source was probed live and representative adapters were
run end-to-end in an isolated worktree. The cleanup part is handled in the same
change as this report:

- `LEGIT_EMPTY` was rechecked and reset for Busko-Zdrój; Chrzanów, Strzelce
  Krajeńskie, Zduńska Wola, Gostyń, Lipsko, Poznań and Lubin moved there with
  the normal 45-day human recheck.
- `EXEMPT_NEW` is empty. Olesno, Mrągowo, Pleszew and Węgorzewo have real
  committed property history and no longer need it. Elbląg also stands on its
  committed history; its TLS failure remains visible instead of being obscured
  by an expired new-adapter exemption.
- Gdańsk was removed from `LEGIT_EMPTY`: the live check found two upcoming
  auction articles. Its crawler now excludes index self-links and selects the
  article attachment instead of the earlier page-wide accessibility PDF; the
  parser handles the live wide-table layout, yielding six verified flats for
  the 30 September and 26 October auctions.

The 23-August repair batch is complete:

| Issue | Verified cause and required change | Effort |
|---|---|---:|
| [#259 Wałbrzych](https://github.com/110kc3/przetargimiejskie/issues/259) | Added crawl-wide month/article/PDF dedupe and fixed attachment selection: the page-wide fallback had selected the global city phone-book PDF. Added a 30-second fetch deadline, singular/prose results, and resilient shifted/wrapped table columns. Replaying 119 deduplicated source documents recovered 110 verified result rows (68 properties / 115 concluded auctions) without the earlier 500/600 zł price fragments. | shipped |
| [#81 Nakło nad Notecią](https://github.com/110kc3/przetargimiejskie/issues/81) | Added host-scoped `insecureTLS`; live refresh restored 6 flats/buildings, 8 current land rows and 45 parsed auction rows from 46 result documents. | shipped |
| [#165 Elbląg](https://github.com/110kc3/przetargimiejskie/issues/165) | Threaded host-scoped `insecureTLS` through HTML/PDF/DOC fetches; live crawl restored one listing and seven land rows. | shipped |
| [#139 Sandomierz](https://github.com/110kc3/przetargimiejskie/issues/139) | Migrated to canonical category `/67/`, retained `/132/` compatibility and normalized historical known URLs. | shipped |
| [#232 Sępólno Krajeńskie](https://github.com/110kc3/przetargimiejskie/issues/232) | Migrated to canonical `/657/`, retained `/405/` compatibility, scoped discovery to real cards and made attachment suffix checks query-safe. Live: 17 notices, 6 listings, 3 result records. | shipped |
| [#234 Włocławek](https://github.com/110kc3/przetargimiejskie/issues/234) | Migrated to canonical links, retained `/726/` compatibility, scoped discovery to real cards and made DOCX/PDF selection query-safe. Live: 84 notices, 5 listings, 2 result records. | shipped |
| [#223 Kalisz](https://github.com/110kc3/przetargimiejskie/issues/223) | Added the paired-row current-year archive parser and known-URL dedupe. Live: 86 archived documents found, 9 auction announcements and 6 result records recovered. | shipped |
| [#4 Tczew](https://github.com/110kc3/przetargimiejskie/issues/4) | The authoritative current `Przetargi` board still works; the bug was crawling its empty archive. Repointed to the live board and added verified-empty handling so the removed dateless listing archives safely. `Zarządzenia` are disposal authorizations, not live auction rows, and are deliberately not published as active. | shipped |
| [#278 Łódź](https://github.com/110kc3/przetargimiejskie/issues/278) | Removed the challenged browser UA, corrected the live TYPO3 archive slug and hardened form-feed/footnote/area/three-column-price parsing. The current eight-lot PDF now yields all eight records. | shipped |

The source-reached cleanup is also complete:

- [#82 Oświęcim](https://github.com/110kc3/przetargimiejskie/issues/82) and
  [#150 Piła](https://github.com/110kc3/przetargimiejskie/issues/150) now use an
  explicit, opt-in `valid_empty` signal without weakening preserve-on-empty.
  Piła live-verified a genuine empty residential board. Oświęcim additionally
  exposed a new Budowlanych 35/3 auction; its `przy ul.` address and singular
  `odbędzie się` date forms are now parsed and regression-tested.

Remaining health work:

- Wałbrzych's pre-August-2024 result PDFs use a separate legacy layout with the
  address on the same physical line as the `Lp.` marker. The current parser
  deliberately skips those rows because treating them as the newer
  address-before-row layout cross-associates each flat with the next lot's
  prices. Current/live health and the recovered August-2024→2026 history are
  complete; older history needs its own positionally faithful fixture/parser.
- [#276 Augustów](https://github.com/110kc3/przetargimiejskie/issues/276): the
  former active and inactive listing components are both genuinely empty.
  Historical details remain accessible and official-site search finds source
  material, but a filtered search or replacement-feed discovery path is needed.
- [#173 Racibórz](https://github.com/110kc3/przetargimiejskie/issues/173) and
  [#174 Świętochłowice](https://github.com/110kc3/przetargimiejskie/issues/174):
  both adapters work and the shared FINN host was reachable from a Polish IP on
  23 August. A live refresh republished Racibórz (21 properties / 8 current
  auctions) and Świętochłowice (97 / 8). A new GitHub-hosted probe on 31 August
  then refreshed Świętochłowice directly while Racibórz still connect-dropped.
  Świętochłowice has therefore returned to the normal matrix and strict health;
  Racibórz alone keeps the expiring stale-only exemption and remains the restricted
  egress task. Brzeg and Wałbrzych also passed full direct hosted refreshes in the
  same run and returned to the normal matrix.

The dated July investigation notes below are retained as diagnosis history.
Where they disagree with this section (notably Tczew, Nakło, Oświęcim and
the old stale/egress membership), the 31-August update above supersedes them.

> **Stable-v1 egress decision (2026-09-05) supersedes the July notes:** no
> Tailscale or hosted residential proxy will be activated. Racibórz and
> Pszczyna are excluded from hosted matrices and retain last-good data under the
> expiring 21-day stale-only health policy, with no local production fallback, in
> [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).

> **Historical diagnosis from 2026-07-07 (superseded by the stable-v1 decision
> above):** health.yml runs health-check.js
> with **`STALE_DAYS=3`** (health.yml:60, tighter than the local default 14), so
> the three externally-broken cities below trip **stale-data FAIL** —
> swietochlowice (7d), raciborz (6d), tczew (4d). Per policy *stale-data FAILs
> cannot be allowlisted; only a green crawl clears them* — so **no code change
> can green health** while those sources are unreachable from CI's Azure IPs.
> At the time, restricted non-Azure proxy egress was proposed as the unblock;
> that design was not accepted and its hook has now been removed. The
> ops-hygiene fixes this session removed the *surrounding* noise (auto-close
> flap, title churn, the ~07-23 gdansk/augustow false-cliff) but cannot clear
> the stale trio. **DECISION at that time:** Kamil deferred the egress unblock
> on 2026-07-07. The later stable-v1 policy excludes the remaining affected
> sources with expiring visibility instead. Caveat: chronic red masks new
> breakages — the ops-hygiene fixes reduce, but don't eliminate, that risk.

### The stale set grew from 3 to 5 — and the two newcomers are NOT the FINN incident [RPI5]

**Verified 2026-07-25 by live-probing every stale source from the Pi's Polish
IP.** The chronic-red risk the callout above names ("chronic red masks new
breakages") has now actually happened: health.yml fails on **five** cities, not
the documented trio, and nothing flagged the two additions because the run was
already red.

| city | source resolves to | from a PL IP today | same cause as the trio? |
|---|---|---|---|
| swietochlowice | `194.24.181.47` (`bip2.finn.pl`) | **200** | yes — FINN/Azure egress |
| raciborz | `194.24.181.47` (`bip2.finn.pl`) | **200** | yes — FINN/Azure egress |
| tczew | `51.68.147.58` | **200** | yes — documented trio |
| **oswiecim** | `62.87.236.179` | **302 → 200** | **no — new** |
| **naklo-nad-notecia** | `89.191.148.30` | **TLS failure** | **no — new** |

The trio's diagnosis is unchanged and still needs only non-Azure egress. The two
new ones are ordinary breakages that egress will not fix:

- [x] **oswiecim — superseded diagnosis; hosted recovery verified 19 October.**
      Current committed source checks are healthy with a successful scheduled
      publication. Historical symptom: the BIP moved behind a redirect. `bip.oswiecim.um.gov.pl/`
      now answers `302` to
      `https://bip.oswiecim.um.gov.pl/5677?alias=bip_umoswiecim`, which is
      `200`. Cheap fix: follow the redirect, or point the adapter's entry URL at
      the aliased path. Worth checking whether `getText` follows 302 already —
      if it does, the failure is further in and the alias page's shape changed.
- [x] **naklo-nad-notecia — verified-chain repair and hosted recovery complete.**
      The September host-specific intermediate-chain path retains certificate
      verification; the 19 October scheduled publication has healthy property
      and land streams. Historical symptom: broken TLS chain at the source.
      `curl` gives `SSL certificate problem: unable to get local issuer
      certificate`; the very same request with `-k` returns **200**. The server
      is serving a leaf without its intermediate, so every strict client
      (Node included) refuses it while a browser papers over it. This
      fails from Poland too — CI egress is irrelevant. Decide deliberately:
      supply the missing intermediate to the fetch path for this host only, or
      classify it `source-unreachable` and stop counting it as our bug. Do NOT
      reach for a blanket `rejectUnauthorized: false` — that would silently
      disable certificate checking for all 117 built cities.

**Ops lesson worth keeping:** a permanently-red health check stopped being a
signal, so two regressions sat unnoticed for ~2 weeks. If the egress unblock
stays deferred, the trio needs to be *excluded* from the gate (with the reason
recorded) so that red once again means "something new broke" — otherwise this
recurs every time a source changes.

### Broken cities — FINN/Azure egress block: Racibórz + Świętochłowice (one incident) [RPI5]

Both BIPs resolve to the same shared FINN server — `www.bipraciborz.pl` and
`www.bip.swietochlowice.pl` are CNAMEs to **`bip2.finn.pl` (194.24.181.47)** —
which silently drops TCP from GitHub-Actions/Azure IP ranges:
`UND_ERR_CONNECT_TIMEOUT` on every CI fetch since ~04 July (fresh Azure IPs each
run), while both sources returned HTTP 200 in 0.3–1.7 s from a Polish IP on
2026-07-07. **Sources are up and parseable — no adapter change needed.** Treat
as ONE provider incident (issues #2 + #3). Fix is egress, not parser code. The
former proxy hook has been removed; hosted automation excludes the affected
adapter under
[PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md). Preserve-on-empty
holds 9 (raciborz) + 91 (swietochlowice) properties
meanwhile; the stale-only exemption is time-bounded and expires into a hard gap.
Optionally tag FINN-hosted cities in config so simultaneous
194.24.181.47 failures triage as one incident, not N issues.
**Owner:** agent · **Blockers:** direct hosted source reachability or a validated public replacement feed.

### Broken city — Brzeg anti-DDoS waiting room [RPI5]

`brzeg.pl` serves CI an 11,968-byte **"Proszę czekać…"** spinner page
(`setTimeout(reload, 5000)`) instead of the real ~726 KB listing page — the
parser is fine: run against the live page (same browser UA) it returns exactly
the 3 expected ul. 3 Maja 1 listings. Detection + cookie-retry +
source-unreachable throw **shipped this session** in
`pipeline/src/cities/brzeg/crawl.js` (+ `tests/brzeg-waiting-room.test.js`).
Residual: verify on the next CI refresh whether the cookie-retry passes the gate
from Azure; if not, classify the source as operator-managed before changing its
automation boundary. Confirm issue #11 reclassifies/closes after the next green
run.
**Owner:** agent · **Blockers:** none.

### Broken city — Tczew: Przetargi category emptied server-side [RPI5]

Between 03–06 July `bip.tczew.pl` emptied the whole Przetargi category (board 3)
server-side: list shows "Brak wiadomości", the category XML feed returns "Brak
danych", the stored detail URL soft-404s, site search finds zero przetargi.
Parser verified good — its regex still matches the platform markup on the
sibling board. **Nothing to fix in code today**; reclassify issue #4 from
layout-change to source-content-removed, keep preserve-on-empty, and **watch
`/wiadomosci/1157/sprzedaz`** (Nieruchomości → Sprzedaż, same markup) for
republication — optionally add it as a secondary wykaz board now.
**Owner:** agent · **Blockers:** city republishing content.

### Zero-data cities + the EXEMPT_NEW expiry cliff [RPI5]

`EXEMPT_NEW` (`pipeline/scripts/health-check.js`) escalates to FAIL after 21
days. **Live investigation 2026-07-07 (from the Pi's Polish IP) reframes this
whole bucket:** oswiecim, chrzanow and busko-zdroj are **NOT broken** — every
one of their current boards simply has **no active residential-flat auction**.
The boards carry land (działka/niezabudowana), leases (dzierżawa), non-
residential premises (lokal *nie*mieszkalny), cancellations (odwołania), and
result notices. The infrastructure all works:

- **busko-zdroj — RESOLVED, moved to `LEGIT_EMPTY`:** the one current auction
  (GNWR.6840.1.2026) is land-only (3 działki). Flat-only adapter correctly
  parses 0. Sells ~1 flat/year; its flat parser was groundtruthed at build, so
  it's a proven adapter that's legitimately empty of flats now.
- **oswiecim — result ingestion SHIPPED 2026-07-19 (`da6c07c5`), EXEMPT_NEW
  entry REMOVED:** residual (a) is done — the crawl now routes "Informacja o
  wyniku przetargu" dokuments to a city `parseResultDoc` (OCR'd, known-URL
  skip pre-OCR; template says "Cena uzyskana", OCR renders m² as m”), and the
  first non-empty refresh committed **1 unique property** (Dąbrowskiego 46/14,
  III przetarg, 150 000 → 151 500 zł, sold) — the city stands on its own data,
  a drop to 0 now correctly FAILs. Remaining residuals: (b) VALIDATE the
  active-flat announcement parse when a live flat auction appears (none since
  build); (c) optional: track active LAND auctions (adapter has a `land` path
  but currently extracts 0 even for land).
- **chrzanow — verified working, stays `EXEMPT_NEW` (since reset 07-07):** the
  board→stub→article harvest runs and **CI installs the Chromium renderer**
  (refresh.yml:125). Its 5 current articles are all non-flat (lease, niezabudowana
  land ×2, a whistleblower page, one lokal *nie*mieszkalny). **Real residual:**
  VALIDATE the active-flat parse against the rendered SPA body when a live flat
  appears (none now); (optional) BIP-article-JSON path to drop the Chromium dep.
- **wejherowo + walbrzych + gniezno — FIXED 2026-07-07 (real crawler bugs, NOT
  "no data"):** all three crawled listings fine but built 0 properties. Shared
  root class: their `crawlActive` listings lacked the parsed `.address` object
  `buildCityData` keys on, so every listing was silently dropped.
  - **walbrzych 0→12:** board cards carried only `address_raw` + `detailUrl` —
    now attach `parseAddress()` + `detail_url` (highest-volume Dolnośląskie flat
    city was publishing zero).
  - **gniezno 0→4:** `crawlActive` hardcoded `address: null` — now derives the
    key from the ogłoszenie PDF / BIP title (prefers the candidate that yields an
    apt so two flats in one building don't collide).
  - **wejherowo 0→8 active:** a *different* bug — the BIP grid rows are UNCLOSED
    `<a>` anchors and the list regex's `([\s\S]*?)</a>` spanned an unclosed nav
    anchor across all 54 auction rows to a distant `</a>`, capturing only 1.
    Fixed to require `<a`, bound the title with `[^<]*`, drop the `</a>` need, +
    filter stubs to auction hrefs (was fetching ~150 nav pages).
  - **Guard added:** `buildCityData` now WARNs when active listings are dropped
    for a missing `.address` (the silent drop that hid all three). Regression
    tests added (walbrzych board attaches `.address`; wejherowo unclosed anchor).
  - **Data lands on the next CI refresh** (all three verified live end-to-end);
    EXEMPT_NEW reasons updated + `since` reset until committed data is non-empty,
    then remove the entries.
- **augustow — FIXED 2026-07-09 (0→3 unique properties):** the missing detail-page
  enrichment now exists. `parse.js` gained `parseAnnouncementDetail` (per-lokal
  address/area/price/auction-date from the detail BODY — no PDF needed) + helpers
  `announcementBaseAddress` / `auctionDateFromAnnouncementText`; `crawl.js`'s
  `crawlAll` now runs a detail-fetch enrichment pass that expands each multi-flat
  announcement into N keyed records (handles the "Nr 1 i Nr 3" case, and the
  `o pow.` vs bare `o` area phrasing across 2017/2023/2024 pages, and skips the
  piwnica line). Groundtruthed live on 4 fixtures from the Pi: 4 stubs → 9 flat
  records → **3 unique properties** (Rynek Zygmunta Augusta 16 lok.1/2/3) with
  multi-year price history; all past-dated so they land as `archived` (no live
  auction open now — honest). EXEMPT_NEW entry removed (data non-empty). 4
  regression tests added (multi-flat expansion, base-address genitive→nominative,
  date parse). Verified end-to-end `CITY=augustow node src/refresh.js`.
- **gdansk + augustow — `LEGIT_EMPTY` (2026-07-07):** documented empty-by-design;
  WARN on unique=0 with a **45-day recheck** backstop. **Residual (deferred):** a
  fully-robust guard keys WARN-vs-FAIL on a positive fetch-reachability signal
  from refresh.js (e.g. "index fetched OK, parsed 0") so a broken selector is
  distinguishable from a legitimately-empty round — see health-check.js.

**Bigger question for Kamil (EXPANSION scope):** oswiecim/chrzanow/busko look
like *rare-flat* cities (flats appear ~yearly, boards are mostly land/lease).
Were they worth building as flat-only trackers, or should the flat-only adapters
also ingest land? Deferred — revisit under the EXPANSION "let revenue decide".

**Owner:** agent · **Blockers:** none (validation waits on a live flat auction
appearing on each board).

### Triage-bot gaps: auto-close flap + challenge-page misclassification — SHIPPED 2026-07-07 [RPI5]

All three sub-items landed this session (see git history):
(1) **auto-close flap** — `issue-sync.js` now refuses to close a `health-check`-
owned issue from a green *refresh* while the city still has `unique < MIN_UNIQUE`
tracked properties (only health's own green run closes it). (2) **challenge-page
generalization** — `pipeline/src/core/challenge-page.js` (`isChallengePage`) is
wired into `getText`, which throws a `fetch failed: …` error on any anti-bot /
waiting-room interstitial, so future cities' challenge pages classify
source-unreachable via the existing `NETWORK_RE` path with no per-city code
(brzeg's cookie-forwarding retry loop stays — the passive detector can't
forward a cookie). (3) **title churn** — a source now only re-titles issues it
owns (health owns `health-check`-labelled, refresh owns the rest), so a
dual-failing city stops ping-ponging its title.

## 2 · Data quality [RPI5]

### Kraków — a property record whose `street` is a whole announcement paragraph

**Completed in `6ac3fd36c`; checked against current data 19 October.** The
source-backed correction maps the bled Łagiewnickiej paragraph key to the actual
lot, and the parser separates HTML list items before reading built addresses.
The exact `news_id=257668` fixture covers the regression. No current Kraków
street contains that paragraph, `ogłasza`, `przetarg` or `Prezydent`. The build's
80-character slug cap remains a separate defensive limit.

- **Result (achieved-price) streams:** Chrzanów "Wyniki przetargów" board;
  Oświęcim scanned result notices (OCR). (Kędzierzyn-Koźle/Trzebinia/Kraków
  already parse results.) **Blockers:** chrzanow/oswiecim zero-data fix first
  (announcement crawls must work).
  - **Opole — CLOSED OUT 2026-07-10:** its BIP publishes **no** "informacja o
    wyniku przetargu" with an achieved price (only the monument-discount
    "Cena osiągnięta … może zostać obniżona o 30%" boilerplate, which is NOT a
    result). Opole is announcement-only by design — no result stream to build.
  - **Bełchatów BIP-attachment results — SHIPPED 2026-07-19 (`38ad6096`):**
    `crawlResultDocs` now follows each kept stub's belchatow.bip.gov.pl link,
    prefers the "dostępna cyfrowo" .doc attachment (docText) over the PDF
    (pdfText→ocrPdf), and substitutes the attachment text+URL into the result
    ref (stub-body fallback, 6-follow politeness cap). Extraction leg
    live-verified on the real Jan 2026 BIP article; 3 helper tests on verbatim
    live markup. No flat result is live right now (WP search window rotated) —
    the first one that posts will land with its achieved price.
- **Result-ref field-name mismatch — chodziez + chelmno — FIXED (`6b8ec1be`):**
  both cities' `crawl.js` now push the canonical `pdf_url` / `auction_date`
  field names `refresh.js` reads, with in-file comments documenting the old
  `{date, url}` / `source_url` trap. Was latent (no results live when fixed);
  nothing wrong ever landed in committed data.
- **Kędzierzyn-Koźle refinements:** parse upcoming flat auctions from
  table-announcements as active listings; genitive↔nominative
  announcement↔result join key; confirm `/api/menu/<id>/articles` + board-85
  auto-discovery reaches every year. City has live data — tuning, not repair.
- **Racibórz parser coverage — rokowania price FIXED 2026-07-10 (`eb8287f2`):**
  rokowania (negotiation-sale) flats state the price as "Cena wywoławcza do
  rokowań: nie niższa niż X zł" — a label form no price regex covered, so 3
  genuine flats (Wileńska 15/16, Staszica 23/1, Mickiewicza 13/15) came through
  with `starting_price_pln: null`. `startingPriceFromText` now handles it
  (null→130000/90000/105000); real-PDF fixture added; unique(13)/active(10)
  unchanged. Katowickiej 15/20's earlier null self-resolved (source rotated).
  **Residual (deferred):** the 3 remaining "announcement not parsed" WARNs
  (43526954, 43523904, 43976343) are LAND (niezabudowane działki — no house
  number, so the address gate rejects them) + one whole mixed-use kamienica;
  raciborz has no land.json scope, out of scope.
- **Chełm parser coverage — INVESTIGATED 2026-07-10, DEFER (all land):** all 10
  named "announcement not parsed" docs (2311599, 2311597, 2311594, 2311593,
  2311592, 2292846, 2273991, 2273986, 2273985, 2270819) are **niezabudowane
  nieruchomości / działki (raw land), zero flats** (fetched + hand-classified;
  `classifyKind` returns `grunt` for 9/10). Land is already out of scope —
  `crawl.js` skips `kind==='grunt'` (no land.json support). These trip the
  *address gate* (`ADDR_RE` needs a house number; land parcels carry a
  działka/obręb number instead) *before* reaching the grunt-skip branch, so they
  log as the noisier "announcement not parsed" rather than "land record skipped".
  **Cosmetic mislabel — zero flats lost**; 17 unique / 33 listings unchanged.
  **No code change made.** Residual (cosmetic, optional, if WARN noise ever
  matters): a full-history reprocess emits ≥59 such WARNs — ~38 land-class + ~17
  wykaz-class (genitive "wykazu"/"podaniu … wykazu" that escape `isSkippableTitle`
  whose `\bwykaz\b` matches only nominative). Extending `isSkippableTitle` to
  `wykaz\w*` silences the ~17 wykaz WARNs; moving the grunt check before the
  address gate reclassifies the land WARNs. Both are log-noise only.
  **Owner:** agent (only if noise matters) · **Blockers:** none.
- **Tarnowskie Góry:** ~45 land plots (meta `land_plots: 45`) fall back to
  Google search because TG obręby are name-only — build a **TG obręb
  name→number map** for precise geoportal links (12 addr-only plots can never be
  precise). Also confirm the residual gaps — 5 of 64 listings missing
  `starting_price_pln`, 21 missing `area_m2` (verified in data 07-07) — are
  genuinely absent from the source PDFs.
- **P2-B — area backfill:** ~37 Gliwice + ~40 Katowice concluded listings lack
  `area_m2`. One-off idempotent crawl of archived zgm-gliwice.pl detail slugs +
  Katowice DispForm pages (`pipeline/scripts/backfill-areas-<city>.js` — does
  not exist yet), run once under CI. Completes the zł/m² deal score for history.
- **Bytom `.doc` retention spot-check — VERIFIED 2026-07-10:** retention works.
  Committed `data/bytom/properties.json` at 06-17 (20 unique) vs current (21
  unique) across 6 daily refreshes over 3 weeks → **0 concluded auctions dropped**
  (18/21 listings are archived). Mechanism confirmed: `bytom/crawl.js` imports
  `docText` (core/doc-text.js), fetches `.doc` announcements, and the
  doc-text-cache persists their parsed text so listings survive board rotation
  (.doc provenance is carried in `doc_url`/`detail_url`, not `source_pdf` — why a
  naïve `source_pdf` scan shows 0). No code change needed.
- **P2-D close-out — SHIPPED 2026-07-07:** dropped the
  `katowice|oddzialow mlodziezy i ustny|86|` allowlist line from sanity-check.js.
  Confirmed `applyVerifiedJunk()` (src/core/verified-heals.js) is called on every
  refresh path that writes Katowice data (refresh.js:281/296, before the commit +
  gate) and folds that bled key into `powstanczej|5|8`; the key is absent from
  committed data. The stale "heal runs manually" comment was the reason the
  allowlist lingered — now corrected in-file.
- **P2-E — `schema_version: 2` (city-namespaced keys) — POLICY:** do NOT do
  standalone. Execute only as the first task of a schema bump that is needed
  anyway (EXPANSION §1.5; dual-read rollout in background/content/watchlist —
  [GUI] to verify). schema_version is still 1.
- **Katowice pre-2025 result PDFs — WON'T FIX (keep this closure note):** the
  ~269 individual wykazy 404 **by design** — UM Katowice removes them after the
  publication period, keeping only annual summaries (confirmed by the Referat
  Obrotu Nieruchomościami, 23 June 2026). Pipeline already uses the summaries.

### Institutional-source pilot — graduation and residuals

PKP + AMW now refresh into the separate `data/providers/` contract and appear
seller-labelled only on `/archiwum-all`; city files, city medians and the
extension remain untouched. Source contracts and limitations are recorded in
[`spikes/providers/`](./spikes/providers/README.md). AMW completed its graduation
gate on 31 August 2026: hosted provider attempts 3, 4 and 5 of
[run 33312600323](https://github.com/110kc3/przetargimiejskie/actions/runs/33312600323)
were consecutively green, and five active detail pages plus five explicit result PDFs
were spot-checked HTTP 200 against the published 12-active / 16-concluded ledger. PKP
completed the same gate in
[run 33379464740](https://github.com/110kc3/przetargimiejskie/actions/runs/33379464740):
three sequential hosted refresh jobs were green, and each independently checked five
active detail links plus five result links. The refreshed ledger contains 144 rows
(50 active / 94 historical), so PKP now refreshes directly in the strict provider job.
Remaining work:

- decide whether to graduate the labelled rows to public
  `/archiwum` (still excluded from municipal summary medians);
- add provider-specific issue synchronization if workflow-only failure alerts
  prove too easy to miss;
- Orange stays deferred: its official portal mixes ordinary offers and auctions
  and exposes no dependable result pairing. Revisit only on a new official
  auction/result endpoint, not by relabelling all offers as auctions.

## 3 · Extension

### T1 — surface all 121 built cities (data-driven CITIES) [GUI]

**Implemented in `6ac3fd36c` (v1.33.0), with hosted extension CI passing.**
The shared catalogue contains all 1,026 official cities and links all 121 enabled
feeds. Popup/archive data loading, filters, cache bounds, watch-key migration and
PL/EN labels have targeted tests and actual Chromium checks. SEO eligibility and
in-page overlay support remain independent. The ZIP, real browser captures and
current store/privacy drafts are prepared; owner store submission is pending.

### Remaining release details

The old host-list alignment and attribution-badge suggestions have not been
implemented. They are cosmetic follow-ups, not blockers to national data access;
any selected extension change still requires version, package and browser checks.
The v1.33.0 release does not claim overlays for every monitored city.

### Overlays — deferred/conditional

Zabrze (Vue SPA) + Sosnowiec (React SPA) stay popup/archive-only unless the
sites gain server-rendered surfaces or content.js learns SPA navigation. Broader
call — overlays for any new city (= `sites/<city>.js` DOM adapter + new
`host_permissions` + store re-review each time) — is Kamil's; default posture:
data-only. **Owner:** Kamil (scope) / agent (build).

## 4 · Distribution / copy (decision-gated)

- ~~**DECISION — rebrand "Silesian" → national copy**~~ — **DONE.** The site is
  national: `<title>` reads "przetargimiejskie – Polska", the hero reads
  "Historia miejskich przetargów na mieszkania w Polsce", and README describes
  117 built adapters across 16 voivodeships. This no longer blocks anything; the
  two copy refreshes below are unblocked and are now the only Śląsk-only surfaces
  left.
- ~~**PRIVACY.md refresh**~~ — **DONE 2026-08-02 (`9acc75ef`), awaiting Kamil's
  read before the next store submit.** Rewritten against the code, not the old
  text: 9 cities named, all 12 content-script hosts listed, all 3 permissions
  documented (including `alarms`, previously only mentioned in passing), and the
  storage table corrected from 4 keys to the 8 the code actually writes. It had
  been *under*-declaring the extension's network and host footprint, which is the
  wrong direction to be wrong in for a review. Still a published legal doc — read
  it before relying on it.
- ~~**WEB_STORE_LISTING.md refresh**~~ — **DONE 2026-08-02 (`9acc75ef`).**
  Repositioned per GTM §8.3: both descriptions now open on outcomes (*"zanim
  zalicytujesz, sprawdź, czy ten lokal już się nie sprzedał i o ile spadła
  cena"*) and cite the art. 39 price-cut rule, instead of leading with coverage —
  the axis we lose to ListaPrzetargow on. `manifest.json`'s description was
  repointed to match (it is the string the store renders) and its `..` typo
  fixed; 123 chars against the 132 limit.

  **The "rewrite for current coverage" premise was wrong and is retired.**
  `background.js` → `CITIES` holds exactly the nine Śląskie cities, with content
  scripts on twelve hosts across seven of them. The copy was never stale — the
  **extension** is what trails the website. Claiming national coverage would have
  made a published store listing false. The file now carries a scope note saying
  so, so this doesn't get "fixed" wrongly next time.
- **National extension discovery — implemented 19 October (`6ac3fd36c`).**
  All 121 feeds are available through data views; overlays retain seven adapters.
  Current store/privacy copy and the v1.33.0 package describe that distinction.
- **Chrome Web Store resubmit [ACCOUNT] — NOT the blocker it was recorded as.**
  Corrected 2026-08-02: this entry claimed live was **v1.3.3 (29 May)** with "~5
  weeks of features unpublished". That is wrong. The live listing
  (`jcbkaleamaoknicmilbjibgebmdloken`) is **v1.32.0, updated 27 June 2026** — in
  sync with `extension/manifest.json`. The build shipped over a month ago.

  It carries **zero ratings ("Brak ocen")** and no reviews. So the shipped
  extension produced no measurable adoption, which retires the old "THE
  distribution unlock" framing: publishing was never the bottleneck, and the
  next resubmit should be treated as a *copy* fix (the Śląsk-only description
  above), not a feature catch-up. Install count is visible only in the developer
  dashboard — the public page renders it client-side.
- ~~**Widen `PUBLIC_VOIVODESHIPS` + `CITY_LOC`**~~ — **SHIPPED 2026-07-27.**
  `PUBLIC_VOIVODESHIPS` is now `null` (all of Poland) and a second gate,
  `MIN_PUBLIC_AUCTIONS = 10` (live + archived), keeps thin cities unlisted so
  widening can't resurface empty pages. **12 → 54 published cities across 15
  voivodeships**; live auctions shown 61 → 205; archive rows 1 158 → 2 716;
  sitemap 1 090 → 2 273 URLs. `CITY_LOC` covers all 54 (unmapped cities fall back
  to the safe nominative apposition). Gate is self-healing — a city appears and
  disappears on its own as its board fills and empties.
- **Google Search Console [ACCOUNT] — current account check needed.** On
  18 October DNS contains `google-site-verification`; August's missing-TXT
  diagnosis is historical. Confirm ownership, sitemap acceptance and indexed
  URLs inside Search Console. The live sitemap has 2,873 URLs and current
  Cloudflare analytics records Google referrals. A search-engine `site:` query
  is not an index census. Browser analytics cannot establish crawler coverage;
  use Search Console and OVH access logs for that question.
- ~~**IndexNow**~~ — **SHIPPED 2026-08-02 (`ba318b83`).** Key file at
  `site/d69b65d9b31a3b7c9c794c9f2ffb5d7b.txt` + `scripts/indexnow-submit.mjs`;
  **2 296 URLs submitted and accepted (HTTP 200)**. Needs no account — ownership
  is proved by serving the key. Covers Bing/Yandex/Seznam only; **Google never
  joined IndexNow**, which is why the Search Console item above is still the
  blocker. Re-run after a big city-build wave, not on every data refresh.
- ~~**Canonical host + cacheable HTML**~~ — **SHIPPED 2026-08-02 (`ba318b83`).**
  `www.` used to answer 200 alongside the apex (OVH Multi-site roots both at the
  same folder) — now a one-hop 301 to the final https:// URL. HTML/JSON moved off
  `no-cache, must-revalidate`, which forced a blocking round-trip on every view
  for a freshness guarantee a once-daily pipeline cannot need, to
  `max-age=300, stale-while-revalidate=3600`; icons/og:image get a week.
  Validated against `httpd:2.4-alpine` before deploy, then verified live.
- **Analytics — Cloudflare Web Analytics is live (verified 18 October).**
  `ANALYTICS_PROVIDER=cloudflare` and the public `ANALYTICS_ID` are repository
  Variables; the current production HTML contains `data-cf-beacon`. Configuration
  changed on 3 August, superseding the former Umami setup. The dated seven-day
  traffic baseline and its limitations are in the current review above.
  `site/privacy/index.html` now discloses Cloudflare (`6ac3fd36c`). The optional
  alert-interest draft and received-confirmation validation gate are implemented;
  conversion is not established by the page-view beacon. With no ID the
  builder deliberately omits analytics; supported providers are `umami`,
  `plausible` and `cloudflare`, with `ANALYTICS_HOST` used for Umami.
- **Historical B2G workflow discovery [superseded by October self-service selection]:** the source-linked
  Gliwice report is a free proof of capability, not a paid public-data product.
  Validate whether ZGM has a repeated register/reconciliation/reporting task
  before defining any service or price; do not broaden outreach from data quality
  alone. The withdrawn July assets remain unusable. Kamil's current Gliwice
  letter, official contacts and owner actions live only in the private vault note
  `40-projects/przetargimiejskie/b2g-pilot.md`.

## 5 · Historical consumer monetization proposals — decision-gated

The October self-service alert-interest validation in [ALERT-VALIDATION.md](ALERT-VALIDATION.md)
is the selected commercial slice. Earlier B2G, lead resale, broker-call and
newsletter proposals below do not authorize outreach, billing or sending.

The B2G workflow-service discovery is the only active commercial track. Newsletter, partner lead-gen,
sponsorship and donation tasks below are historical/deferred context; none is a
current owner action or a prerequisite for the municipal pilot.

- **Newsletter go-live [ACCOUNT]:** generator is live — `newsletter.yml` runs
  Mondays 06:00 UTC, baseline seeded 2026-07-06; **first real digest generates
  Mon 2026-07-13** — but nothing sends it and the site has no signup form.
  Kamil: pick ESP (Resend/Buttondown/MailerLite), account + API key as repo
  secret. Agent: send step in newsletter.yml + **double-opt-in signup form** on
  site/index.html. **HARD-BLOCKED by the RODO policy.**
- **RODO/GDPR policy — DRAFT WRITTEN 2026-07-10 (`RODO-DRAFT.md`) [RPI5]:** a full
  Polish site-policy draft covering the newsletter (double-opt-in, consent basis
  art. 6(1)(a) + UŚUDE/PT, ESP as processor), the partner lead form (consent;
  partner = **separate controller** hand-off), server logs, cookieless analytics,
  data-subject rights + UODO complaint. The extension stays zero-data (PRIVACY.md
  unchanged). **Needs Kamil (deferred):** legal review (+ ideally a lawyer) and
  filling the «placeholders» — controller legal identity/JDG, chosen ESP + its
  DPA/EEA location, partner name(s), analytics tool. Publish only the sections
  whose flow is live, then port into `site/privacy/index.html`. Still the hard
  blocker for newsletter send AND any lead capture until published.
- **FUNDING.yml + tip jar [ACCOUNT]:** no `.github/FUNDING.yml` exists. Kamil
  creates GitHub Sponsors + PL tip jar (BuyCoffee/BLIK); agent commits
  FUNDING.yml + a discreet "wesprzyj" footer link. Zero gating.
- **Partner demand test [DEFERRED]:** the former mortgage/renovation CPL call
  script is not a gate for B2G. Revisit only if the municipal pilot is stopped
  and the consumer lead-generation thesis is deliberately resumed.
- **Lead form + labeled partner CTA [RPI5]:** build only after the demand test
  passes — labeled współpraca CTA at high-intent moments, concierge-routed form,
  no trackers. **Blockers:** demand-test pass + RODO policy.
- **FB seeding [ACCOUNT]:** value-first weekly roundups in 3–5 PL real-estate
  groups; agent pre-drafts from `newsletter/latest.md`. **Blockers:** first real
  digest (2026-07-13).
- **Sponsor pitch [ACCOUNT]:** one tasteful labeled sponsor slot, priced against
  reach. **Blockers:** analytics live + traffic/subscriber numbers to quote.
- **JDG [ACCOUNT]:** register before income crosses the działalność
  nierejestrowana quarterly cap (10 813,50 zł as of 2026); confirm ryczałt/VAT
  with an accountant then. **Blockers:** first real revenue — no action until
  money is real.

## 6 · Expansion queues [RPI5]

- **Build the BUILD-ready queue — 50 land-powiat seats remain** (ledger in
  SPIKE-PROGRESS): dispatch per `spikes/README.md` + `pipeline/ADAPTER-GUIDE.md`
  via the `przetargi-city-triage` skill, max 3 concurrent Sonnet build-agents on
  the Pi. **PROGRESS 2026-07-16→19: all remaining big cities + city-counties
  built** (wroclaw, elblag, poznan, grudziadz, wloclawek, kalisz, plock,
  jelenia-gora, sopot, biala-podlaska, siedlce, lubin) — **every Wave-A
  city-county (66) is now resolved built-or-no-build**; the queue is 50
  Medium-effort land-powiat seats only (121 built / 50 build in the ledger).
  Batch lessons now baked into the triage skill dispatch prompts: verify the
  CMS family live before cloning the spike's named analog (wrong in 4 of 6
  recent spikes), foreground-only refresh (background runs die silently),
  registry is append-only chronological. Each 0-data build adds an EXEMPT_NEW
  settling window; update master-cities.json + regenerate the ledger per batch.
- **pszczyna — DONE (recovered + registered, see `57b507c6`):** crawl budgets
  were tightened as planned (pages/query 8, index 3 min, article 8 min, 150
  articles as `crawl.js` defaults), then registered with batch 3; 18 unique
  properties committed, 25 tests green. Closure note kept because the entry
  predicted a CI-timeout risk that the tightened defaults resolved.
- **Spiking DONE — all 380 powiat seats spiked** (`spikes/backlog.json`:
  380 done / 0 pending, representing 335 distinct seat cities). This is preserved
  historic evidence, not the complete national city denominator.
- **Phase A national inventory — COMPLETE 2026-09-06:** the reproducible GUS
  TERYT importer maps exactly 1,026 SIMC city identities, preserves all 336
  historic verdicts, repairs all 45 duplicate-seat evidence paths, reconciles all
  121 pipeline IDs and generates a zero-blocker discrepancy report. The annual
  refresh and PR test run entirely on GitHub-hosted infrastructure.
- **Phase B1/B2 — implemented; hosted municipal publication verified.**
  National strict validation now covers all 121 feeds; the quarantine map is
  empty after `6ac3fd36c`. Hosted shards, isolation and the single publisher run
  successfully. Racibórz/Pszczyna remain excluded. Production source health
  is still red; see the current continuation above.
- **Phase B3 — implemented (`6ac3fd36c`):** national website/extension discovery,
  bounded selected-city loading and release package/browser checks are complete.
  Owner store acceptance and ongoing source recovery remain open.
- **NEXT:** source-specific health repairs and the current 121-city source/asset
  audit. The separate 50-city BUILD queue follows the Phase B acceptance gates.
- **National research:** after Phase B gates and the known 50-city queue, review
  165 historic exclusions against the broader asset scope and survey the 690
  unresearched official cities in measured batches. See [ALL-CITIES-PLAN.md](./ALL-CITIES-PLAN.md).
- **Deferred revisits:** Jaworzno, Żory, Ruda Śląska (deferred on flat-auction
  volume — re-spike if volume appears).
