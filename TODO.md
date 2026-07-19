# TODO

> **Open backlog only** — shipped work lives in [CHANGELOG.md](./CHANGELOG.md)
> (extension) and git history (pipeline/site/data). **Last refreshed: 19 July
> 2026 — extension v1.32.0.** Structure/tiers/gates live in
> [ROADMAP.md](./ROADMAP.md); headless RPi5 execution is specified in
> [REMOTE.md](./REMOTE.md); city coverage is the generated ledger
> [spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md) (BUILT 117 ·
> BUILD-ready 54 · all 380 powiat seats spiked).
>
> Recently shipped (see git log, not re-listed here): the entire 3-July handover
> landed in `45dcb09` (extension CI, P2-D verified-heals in refresh, TG PDF
> price/area fix, newsletter generator + first seeded run 2026-07-06); daily
> refresh + failure-triage issues live; Bydgoszcz/Gorzów rebuilt 2026-07-06;
> 2026-07-07 session — brzeg waiting-room handling, FETCH_PROXY_URL egress
> hook, EXEMPT_NEW cleanup + busko-zdrój entry, docs truth pass
> (ROADMAP/REMOTE/TODO/README); 2026-07-07 ops-hygiene pass — issue-sync
> anti-flap close guard + title-ownership guard (kills the busko-zdrój
> open/close flap and dual-failing title churn), generalized challenge-page
> detector (`pipeline/src/core/challenge-page.js` wired into `getText` so any
> future anti-bot/waiting-room page auto-classifies source-unreachable),
> `LEGIT_EMPTY` slow-recheck allowlist for gdansk/augustow, P2-D Katowice junk
> allowlist dropped (fold now runs inside refresh), and a `todayWarsaw`
> small-ICU fix (was returning `MM/DD/YYYY` on the RPi5's small-ICU Node —
> matters for the self-hosted-runner path); 2026-07-07 zero-data investigation
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

## 1 · Ops / health (health.yml red since 4 July)

> **Why health is red (confirmed 2026-07-07):** health.yml runs health-check.js
> with **`STALE_DAYS=3`** (health.yml:60, tighter than the local default 14), so
> the three externally-broken cities below trip **stale-data FAIL** —
> swietochlowice (7d), raciborz (6d), tczew (4d). Per policy *stale-data FAILs
> cannot be allowlisted; only a green crawl clears them* — so **no code change
> can green health** while those sources are unreachable from CI's Azure IPs.
> **The single unblock is non-Azure egress** (RPi5 self-hosted runner per
> REMOTE.md, or a PL proxy as `FETCH_PROXY_URL`) — a Kamil/infra action. The
> ops-hygiene fixes this session removed the *surrounding* noise (auto-close
> flap, title churn, the ~07-23 gdansk/augustow false-cliff) but cannot clear
> the stale trio. **DECISION:** Kamil deferred the egress unblock on 2026-07-07
> ("leave red for now") — health stays chronically red on the stale trio until
> an RPi5 self-hosted runner or a PL `FETCH_PROXY_URL` proxy is stood up. Don't
> re-ask; revisit when Kamil raises it. Caveat: chronic red masks new
> breakages — the ops-hygiene fixes reduce, but don't eliminate, that risk.

### Broken cities — FINN/Azure egress block: Racibórz + Świętochłowice (one incident) [RPI5]

Both BIPs resolve to the same shared FINN server — `www.bipraciborz.pl` and
`www.bip.swietochlowice.pl` are CNAMEs to **`bip2.finn.pl` (194.24.181.47)** —
which silently drops TCP from GitHub-Actions/Azure IP ranges:
`UND_ERR_CONNECT_TIMEOUT` on every CI fetch since ~04 July (fresh Azure IPs each
run), while both sources returned HTTP 200 in 0.3–1.7 s from a Polish IP on
2026-07-07. **Sources are up and parseable — no adapter change needed.** Treat
as ONE provider incident (issues #2 + #3). Fix is egress, not code: the
`FETCH_PROXY_URL` hook in `pipeline/src/core/fetch.js` (undici ProxyAgent) is
**shipped** — residual work is provisioning actual non-Azure egress (the RPi5
self-hosted runner per REMOTE.md, or a PL proxy endpoint as a repo secret) and
wiring it into refresh.yml for FINN-hosted cities; note the insecureTLS path is
not proxied. Preserve-on-empty holds 9 (raciborz) + 91 (swietochlowice) properties
meanwhile; but stale-data FAILs cannot be allowlisted — only a green crawl
clears them. Optionally tag FINN-hosted cities in config so simultaneous
194.24.181.47 failures triage as one incident, not N issues.
**Owner:** agent · **Blockers:** non-Azure egress (RPi5/proxy).

### Broken city — Brzeg anti-DDoS waiting room [RPI5]

`brzeg.pl` serves CI an 11,968-byte **"Proszę czekać…"** spinner page
(`setTimeout(reload, 5000)`) instead of the real ~726 KB listing page — the
parser is fine: run against the live page (same browser UA) it returns exactly
the 3 expected ul. 3 Maja 1 listings. Detection + cookie-retry +
source-unreachable throw **shipped this session** in
`pipeline/src/cities/brzeg/crawl.js` (+ `tests/brzeg-waiting-room.test.js`).
Residual: verify on the next CI refresh whether the cookie-retry passes the gate
from Azure; if not, fall back to the same non-Azure egress as the FINN pair
(`FETCH_PROXY_URL`/RPi5); confirm issue #11 reclassifies/closes after the next
green run.
**Owner:** agent · **Blockers:** none (egress fallback shared with FINN item).

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

## 3 · Extension

### T1 — surface all built cities (117 and counting; data-driven CITIES) [GUI]

`extension/background.js:22` still hardcodes `CITIES` = 9 Śląskie cities — the
other 46 built cities are invisible to popup/watchlist/notifications (the site
archive already reads `data/index.json` dynamically). Implement EXPANSION §1.6:
lazy per-city fetch keyed off `data/index.json`, extend `i18n.js` labels +
voivodeship map, keep popup filters scalable. Minor version bump; verify in a
real browser. **This is the main technical blocker to an honest store
resubmit.** **Owner:** agent · **Blockers:** none.

### Riding the same version bump [GUI]

- **Manifest host-list alignment (cosmetic):** `content_scripts.matches`
  includes several hosts absent from `host_permissions` (8 patterns:
  `katowice.eu` and `bytom.pl` variants, plus rybnik / myslowice /
  swietochlowice / bielsko hosts; no functional impact) — align or add a
  consistency test.
- **"powered by przetargimiejskie.pl" badge link** in content.js overlays (GTM
  week-3 item, verified missing).

**Owner:** agent · **Blockers:** bundled with the CITIES rework (one store
review).

### Overlays — deferred/conditional

Zabrze (Vue SPA) + Sosnowiec (React SPA) stay popup/archive-only unless the
sites gain server-rendered surfaces or content.js learns SPA navigation. Broader
call — overlays for any new city (= `sites/<city>.js` DOM adapter + new
`host_permissions` + store re-review each time) — is Kamil's; default posture:
data-only. **Owner:** Kamil (scope) / agent (build).

## 4 · Distribution / copy (decision-gated)

- **DECISION — rebrand "Silesian" → national copy.** Kamil decides positioning
  (55 cities across 16 voivodeships are live); agent then rewrites README,
  PRIVACY, WEB_STORE_LISTING, site hero. Blocks the two refreshes below.
  **[ACCOUNT]**
- **PRIVACY.md refresh [RPI5]:** still titled "ZGM Gliwice — auction history",
  network section lists only `data/gliwice/*.json` + zgm-gliwice.pl. Must
  enumerate current hosts/paths/cities before a store resubmit. Agent drafts,
  Kamil approves (published legal doc). **Blockers:** rebrand decision.
- **WEB_STORE_LISTING.md refresh [RPI5]:** copy still claims 9 Śląskie cities.
  Rewrite PL+EN for current coverage + v1.32.0 features. **Blockers:** rebrand
  decision.
- **Chrome Web Store submit [ACCOUNT]:** live is **v1.3.3** (29 May) vs local
  **v1.32.0** — ~5 weeks of features unpublished. Rebuild zip from `extension/`
  (manifest.json at zip root, gitignored), upload, paste refreshed listing +
  privacy link; expect new-host-permissions review. **Recommended: bundle with
  the 55-city CITIES rework — one review cycle.** THE distribution unlock.
- **Widen `PUBLIC_VOIVODESHIPS` + `CITY_LOC` [RPI5]:**
  `scripts/build-seo-pages.mjs:31` is still `new Set(['slaskie'])`; `CITY_LOC`
  has 12 entries. Kamil decides how wide the public SEO gate opens; agent adds
  voivodeships + locative entries for the remaining cities, rebuilds (sitemap
  grows well past 1,026 URLs). Cheap, high-leverage. **Owner:** Kamil
  (decision) / agent (execution).
- **Google Search Console [ACCOUNT]:** verify przetargimiejskie.pl (DNS TXT via
  OVH), submit sitemap.xml — best after the gate widening so the full sitemap
  indexes once. Also feeds the GTM §6 kill criteria.
- **Analytics [ACCOUNT]:** site has none (verified). Kamil picks a
  privacy-friendly, cookie-free tool (Plausible/Umami/self-host) + account;
  agent wires the snippet into build-site templates. Without it the 6-week GTM
  kill gate can't be evaluated.
- **B2G outreach [RPI5]:** clone the `outreach/gliwice/` pitch for 2–3 more
  cities with each city's own unsold stats from `data/`; Kamil sends.

## 5 · Newsletter / monetization

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
- **Partner demand test [ACCOUNT] — the decisive gate:** ~10 honest calls (5–8
  mortgage brokers + 3–4 renovation firms in covered cities) for one verbal
  CPL/flat-fee quote + soft pilot yes. **Zero interest after ~10 calls = park
  monetization** (donations + sponsor only) and the lead form never gets built.
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

- **Build the BUILD-ready queue — 54 land-powiat seats remain** (ledger in
  SPIKE-PROGRESS): dispatch per `spikes/README.md` + `pipeline/ADAPTER-GUIDE.md`
  via the `przetargi-city-triage` skill, max 3 concurrent Sonnet build-agents on
  the Pi. **PROGRESS 2026-07-16→19: all remaining big cities + city-counties
  built** (wroclaw, elblag, poznan, grudziadz, wloclawek, kalisz, plock,
  jelenia-gora, sopot, biala-podlaska, siedlce, lubin) — **every Wave-A
  city-county (66) is now resolved built-or-no-build**; the queue is 54
  Medium-effort land-powiat seats only (117 built / 54 build in the ledger).
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
  380 done / 0 pending). The "every powiat seat" claim now rests on building
  out the 54-seat BUILD queue above; everything else is ledgered
  no-build/dropped/deferred.
- **CI matrix sharding at ~100+ cities:** group small cities ~4–5/job in
  refresh.yml + backfill.yml — most city jobs finish <2 min of mostly setup
  overhead; grouping roughly halves runner minutes. **Blockers:** built-city
  count reaching ~100.
- **DEMAND-GATED long tail (~700 towns in land powiats):** low BUILD hit-rate,
  permanent maintenance liability — only worth it as a "complete Poland" moat
  with revenue behind it. Kamil makes the go/no-go per EXPANSION ("let revenue
  decide"). **Blockers:** powiat seats complete + traffic/revenue signal.
- **Deferred revisits:** Jaworzno, Żory, Ruda Śląska (deferred on flat-auction
  volume — re-spike if volume appears).
