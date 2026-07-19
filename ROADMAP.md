# ROADMAP — path to "finished"

> Written 7 July 2026 from a full-repo audit (5-agent research pass: docs-drift,
> CI/health, broken-city diagnosis, backlog inventory, RPi5 feasibility).
> **Backlog detail lives in [TODO.md](./TODO.md); remote/headless execution is
> specified in [REMOTE.md](./REMOTE.md).** This file is the structure: tiers,
> gates, owners, environments.
>
> **Verdict: the project is finishable.** All infrastructure exists (55 adapters,
> daily matrix CI, health gate, failure triage with auto-close, newsletter
> generator, SEO pages, site deploy). Nothing remaining is technically blocked —
> the remaining work splits cleanly into agent-executable batches and a short
> list of Kamil-only account/business actions.

## Environment legend

Every item is tagged with where it can run:

- **[RPI5]** — headless-ok: runs in a terminal-only agent session (the Linux
  RPi5 box, per [REMOTE.md](./REMOTE.md)). This is most of the work.
- **[GUI]** — needs desktop Chrome (extension load-unpacked verification,
  visual site QA). Windows/desktop session only.
- **[ACCOUNT]** — Kamil-only: account access or a business decision. Cannot be
  automated from any session.

## T1 — Ops-stable + distribution-live (weeks, not months)

**Exit test:** a stranger finds a city page on Google, installs the current
extension, and receives Monday's digest. Health green daily.

### T1.a Ops (agent work)

| Item | Env | Effort | Status |
|---|---|---|---|
| Fix health red: EXEMPT_NEW cleanup (remove 5 stale entries, add busko-zdrój) | [RPI5] | XS | **shipped this session** |
| Brzeg: detect the anti-DDoS waiting-room page, classify as source-unreachable, cookie-retry | [RPI5] | S | **shipped this session** |
| Racibórz + Świętochłowice: **not code** — FINN host (bip2.finn.pl, 194.24.181.47) blocks Azure/GH-runner IPs. Durable fix = non-Azure egress: `FETCH_PROXY_URL` support (shipped this session) + a Polish exit (RPi5 or proxy). Sources verified live + parseable from PL IP | [RPI5] | S | egress hook shipped; needs a PL exit wired into CI |
| Tczew: source emptied server-side (whole Przetargi category) — nothing to crawl. Watch sibling board `/wiadomosci/1157/sprzedaz`; update LIST_URL when the city republishes | [RPI5] | XS watch | reclassified |
| Clear the 7 remaining zero-data cities (oświęcim, chrzanów, wejherowo, wałbrzych, gdańsk, gniezno, augustów) before their EXEMPT_NEW entries expire (06-27 cohort — oświęcim + chrzanów — expires 18 July) — fix crawlers or add a non-expiring legitimately-empty mechanism | [RPI5] | M | open |
| Triage-bot gap: refresh auto-closes health-owned issues for 0-record cities (0→0 counts as healthy) → daily issue flap; also challenge pages misclassified as layout-change | [RPI5] | S | open (flap paused by busko-zdrój exemption) |

### T1.b Distribution (mixed)

| Item | Env | Effort | Status |
|---|---|---|---|
| Extension: surface all 55 cities — `background.js` hardcodes 9; make CITIES data-driven off `data/index.json` (EXPANSION §1.6), version bump | [GUI] | M-L | **the main technical T1 item** |
| DECISION: "Silesian" → national positioning (unblocks the 3 copy items below) | [ACCOUNT] | XS | Kamil |
| PRIVACY.md refresh (still Gliwice-only) — required for store resubmit | [RPI5] draft + Kamil approve | S | blocked on rebrand decision |
| WEB_STORE_LISTING.md refresh (says 9 cities; reality 55, v1.32.0 features) | [RPI5] | S | blocked on rebrand decision |
| Chrome Web Store submit (live v1.3.3 vs local v1.32.0 — ~5 weeks unpublished). Recommended: bundle with the 55-city rework, one review cycle | [ACCOUNT] | S + review wait | Kamil — **the distribution unlock** |
| Widen `PUBLIC_VOIVODESHIPS` beyond Śląskie (+ `CITY_LOC` locatives) — multiplies the SEO surface | [ACCOUNT] decision, [RPI5] execution | S | Kamil decides width |
| Google Search Console: verify domain, submit sitemap (after gate widening) | [ACCOUNT] | XS | Kamil |
| Analytics (Plausible/Umami — privacy-friendly, no cookies): without it the GTM §6 kill gates can't be evaluated | [ACCOUNT] pick+pay, [RPI5] wire in | XS-S | Kamil |
| RODO/GDPR policy for newsletter + leads (draft agent-side, publish is Kamil's call) — **hard blocker for any ESP send** | [RPI5] draft | S-M | open |
| Newsletter go-live: ESP account + API secret (Kamil), send step + double-opt-in signup form (agent). First real digest generates Mon 2026-07-13 | [ACCOUNT] + [RPI5] | M | blocked on RODO |

## T2 — Powiat-seat coverage (the credible national claim; ~1.5–2.5 months of batched agent work)

**Exit test:** every one of the 380 powiat seats is BUILT or has a documented
NO-BUILD verdict; refresh + health green at that scale.

All [RPI5] — dispatch via the `przetargi-city-triage` skill
(committed at `.claude/skills/przetargi-city-triage/SKILL.md`), protocol in
[spikes/README.md](./spikes/README.md), build guide in
[pipeline/ADAPTER-GUIDE.md](./pipeline/ADAPTER-GUIDE.md):

1. **Build the BUILD-ready queue — 54 land-powiat seats remain** (all Medium
   effort; demonstrated pace ~7 adapters/day incl. fix cycles). All big cities
   and every Wave-A city-county are built as of 2026-07-19 (117 built).
2. **Spiking is DONE** — all 380 powiat seats spiked (backlog 380/0); the
   BUILD verdicts feed queue 1 above.
3. **Shard CI matrix** into grouped jobs (~4–5 small cities/job) when the city
   count makes wall time creep (~100+). refresh.yml + backfill.yml.
4. Keep the ledger disciplined: `master-cities.json` → `node
   spikes/build-progress.mjs` after every batch (SPIKE-PROGRESS is generated).

## T3 — All-Poland + monetization (explicitly demand-gated)

**Gate: let revenue, not the city list, decide** (EXPANSION.md). Kill gates per
GTM-SPRINT: no partner interest after ~10 calls → park monetization; 6 weeks
flat traffic → fix funnel first.

- ~700 long-tail town spikes **only** with traffic/revenue behind it [RPI5]
- Partner demand test: ~10 calls to brokers/renovation firms [ACCOUNT] — decides
  whether the lead-gen engine gets built at all
- Lead form + labeled CTA (concierge routing) [RPI5], after demand test + RODO
- One contextual sponsor; GitHub Sponsors + PL tip jar (FUNDING.yml) [ACCOUNT]
- FB-group seeding with weekly digests [ACCOUNT, agent pre-drafts]
- JDG registration before the działalność-nierejestrowana cap [ACCOUNT]

## Parallel data-quality track (non-blocking, all [RPI5])

Result streams for Chrzanów/Oświęcim (Opole confirmed to post none, closed
2026-07-10; Bełchatów achieved prices need a BIP-attachment fetch — TODO §2) ·
Kędzierzyn-Koźle table-announcement parsing + Logonet discovery depth · TG obręb
name→number map for geoportal links · P2-B Gliwice/Katowice area backfill ·
Bytom `.doc` retention verified 2026-07-10 (0 dropped/6 refreshes) · P2-D live
self-heal verify on Katowice → drop sanity allowlist · P2-E schema v2 only
bundled with a needed bump.

## Critical path, plainly

1. **Kamil's short list** (everything else flows around it): rebrand decision →
   store copy + PRIVACY; Web Store submit; PUBLIC_VOIVODESHIPS width; analytics
   pick; ESP + RODO publish; Search Console. Roughly a day of decisions +
   account clicks, spread over T1.
2. **One GUI session** for the extension 55-city rework + browser verification.
3. **Everything else is [RPI5]-shaped** — and the RPi5 is *strategically
   necessary*, not just convenient: its residential Polish IP bypasses the
   FINN/Azure block that is the root cause of half the current health red.
   See [REMOTE.md](./REMOTE.md).
