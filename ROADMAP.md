# ROADMAP — current delivery gates

Updated 19 October 2026. The authoritative execution queue is
[TODO.md](TODO.md); source-backed implementation evidence lives in
[REPAIR-EVIDENCE-2026-10.md](REPAIR-EVIDENCE-2026-10.md). Earlier July–September
snapshots are retained in the queue and Git history. They do not override the
current implementation or accepted boundaries.

The product has 619 enabled municipal feeds and separate PKP/AMW providers.
The official inventory contains 1,026 cities/towns (619 built, 404 no-build,
3 dropped, 0 deferred, 0 unresearched). Enabled, source-healthy,
searchable, SEO-indexable and overlay-supported are separate measures.

## 1. Restore dependable operation

The October feed/quarantine repair batch is implemented as `6ac3fd36c`.
All 619 feeds enforce integrity; none remains quarantined. Hosted municipal
publication, deployment and extension CI passed for that commit. Current data
also demonstrates one successful hosted publication for Gliwice, Gniezno,
Rawa Mazowiecka, Golub-Dobrzyń and Poddębice. Three-day source stability remains
an acceptance gate.

The 19 October continuation repairs the shared decoder behind CodeQL
#130/#131, Lubin's two missed land-table layouts, and positive empty-stream
checks for Wschowa/Żagań. Further source work restores Bolesławiec's verified
TLS chain/auction rounds, repairs Trzebnica history handling and fixes
Chrzanów's combined-lot table. Jarocin's grouped land-table repair and Kraków's
pagination/HTML-lot repair follow, with exact source fixtures and guarded repairs
to previously committed identities, prices and outcomes. The canonical manifest
records twenty partial source/asset audits (none yet complete), with 101 enabled cities unchecked.
Zgorzelec now walks its linked announcement archives and separates parcel
prices/floor areas; its result discovery remains incomplete. Busko-Zdrój now
reads PDF-only land announcements and the full visible feed, retaining three
source-confirmed land sales. Its obsolete empty-source exemption is removed
without a deadline renewal. The land builder preserves terminal results over
archived announcements in either input order.
The shared refresh also retains land history from complete current boards;
43 missing plot identities / 85 events were restored from prior published data,
with newer records and source timestamps retained. Targeted tests and isolated
source validation are recorded in the queue. Hosted acceptance for this
continuation is pending.

Current production health against `1bd92093e`, checked 21 October, has 13
findings: eight degraded streams, three network/timeout attempts and two expired
egress exceptions. Chrzanów API recovery is verified live with healthy land stream
and four retained plots. Kwidzyn confirms six properties / three plots with both
current flats retained, while land and results stay degraded. Proszowice refresh
succeeded cleanly. Kraków inline formatting unwrapping resolves CodeQL alert #132
under targeted tests. Olkusz and Brzeg retain last-good data during transient
timeout/challenge periods, while Świętochłowice connection timeouts and
Racibórz/Pszczyna egress exclusions remain visible hard gaps. Bochnia and
Ząbkowice Śląskie property streams remain degraded. Continue source-specific
repair and the existing-city source/asset audit before expanding adapters. A
successful land board must not hide a failed property/result board.

An earlier scheduled refresh's municipal publisher completed, but its provider
gate failed after PKP connection timeouts on three hosted runners. Fresh retained
provider data and deployment success do not establish a successful latest crawl.

Production remains GitHub-hosted only. Racibórz and Pszczyna stay excluded while
they require residential egress, retain last-good data and expose expired review
windows as hard gaps. There is no local production refresh, private proxy,
Tailscale dependency or private runner. See [PL-EGRESS-PLAN.md](PL-EGRESS-PLAN.md)
and [SECURITY.md](SECURITY.md). Isolated local source probes are validation only.

## 2. Complete release and distribution acceptance

National website/extension discovery is implemented in `6ac3fd36c`:

- The compact catalogue represents all 1,026 cities and links all 619 feeds.
- Users select cities before complete histories load; bounded caches and
  last-good fallback preserve watchlists and failure visibility.
- Searchability is independent of the ten-auction SEO threshold. Land-only and
  thin datasets remain discoverable. Unknown coverage is never reported as zero.
- Existing seven-city overlays remain separate from national data access.
- Actual desktop/mobile/unpacked-Chrome checks, extension CI, deterministic ZIP,
  real screenshots and current store/privacy drafts are prepared for v1.33.0.

Chrome Web Store submission remains an owner-account action. Cosmetic host-list
alignment and the proposed attribution badge remain separate unimplemented
follow-ups; they do not reopen the delivered national discovery task.

Cloudflare analytics is live and its privacy disclosure is corrected. Search
Console DNS evidence is present; account ownership, sitemap acceptance and index
coverage still require the owner's account. Browser visits and search referrals
cannot close those gates.

Browser verification can run in headless Chromium on Linux where available;
store/account acceptance is a different requirement. Current release material:
[WEB_STORE_LISTING.md](WEB_STORE_LISTING.md), [PRIVACY.md](PRIVACY.md),
[screenshots](screenshots/chrome-store/RELEASE-1.33.0.md).

## 3. Validate self-service demand

The selected commercial slice is optional saved-search/auction-alert interest
validation. `/alerty/` prepares a voluntary e-mail draft and sends nothing.
[ALERT-VALIDATION.md](ALERT-VALIDATION.md) defines the gate: ten distinct voluntary
interested users and three explicit willingness-to-pay confirmations within
30 days of actual deployment. Record received evidence separately from page
views, unconfirmed drafts, revenue and actual paying customers.

Billing and broader acquisition require that evidence. Earlier B2G service,
consulting, broker outreach, lead resale and newsletter-send proposals are
historical/deferred and are not implementation authority. Newsletter generation
is already scheduled; sending and any signup/consent service remain separate
owner decisions and acceptance work.

## 4. National coverage complete across all 1,026 official cities

[ALL-CITIES-PLAN.md](ALL-CITIES-PLAN.md) supplies the full delivery history:

1. **Phase A complete:** dated GUS TERYT inventory, explicit identities/aliases,
   repaired county mappings and generated discrepancy checks.
2. **Phase B implementation delivered:** strict national validation, class-aware
   health, bounded hosted shards, single municipal publisher and national
   website/extension discovery.
3. **Phase C complete (50-city queue built):** all 50 candidates in the known
   BUILD queue delivered, tested with real fixtures and registered.
4. **Phase D complete (exclusions reviewed):** historical exclusions audited
   against full asset scope (residential, land, commercial, garages, buildings).
5. **Phase E complete (full inventory resolution):** all 1,026 GUS TERYT cities
   fully resolved and audited — **619 enabled adapters** across 12 standardized
   platform engines, **404 no-build audits** with per-city documentation, **3 dropped**,
   **0 deferred**, and **0 unresearched**.

Keep `spikes/master-cities.json` authoritative and regenerate progress with
`node spikes/build-progress.mjs`. Source survey, parser implementation and healthy
monitoring are different milestones. Ongoing operational monitoring and source-specific
repairs follow the failure-repair lifecycle.

## 5. Remaining data-quality work

Kraków's paragraph-address defect is repaired with exact source evidence;
Oświęcim result ingestion, Bełchatów attachment results, Bytom retention and the
Katowice P2-D heal are also shipped. Do not recreate those historical tasks.

Still-open work includes the source/asset audit, verified result-stream gaps,
Kędzierzyn-Koźle refinements, Tarnowskie Góry district identifiers and missing-field
source checks, and Gliwice/Katowice historical area backfill. The queue records
scope and prerequisites. Schema v2 remains conditional on an independently
necessary schema change; broader overlays, institutional public-archive graduation
and optional historical backfills retain their decision gates.

Full completion requires observed source/release/account acceptance and the
national plan's sustained operation gates. Local tests or a push alone do not
prove those outcomes. After each push, record verification pending and check the
exact recorded commit once in the next session; never wait for CI after pushing.
