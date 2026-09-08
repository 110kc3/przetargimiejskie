# ROADMAP — path to "finished"

> Written 7 July 2026 from a full-repo audit (5-agent research pass: docs-drift,
> CI/health, broken-city diagnosis, backlog inventory, RPi5 feasibility).
> **Backlog detail lives in [TODO.md](./TODO.md); manual headless work is specified
> in [REMOTE.md](./REMOTE.md), and automated Polish egress in
> [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).** This file is the structure: tiers,
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
| 23-Aug health-policy cleanup: empty `EXEMPT_NEW`, live-recheck 8 quiet sources in expiring `LEGIT_EMPTY`, restore Gdańsk discovery + wide-table parsing (6 live flats) | [RPI5] | XS | **shipped 2026-08-23** |
| Repair 9 verified city crawlers: Wałbrzych, Nakło, Elbląg, Sandomierz, Sępólno, Włocławek, Kalisz, Tczew, Łódź (root causes and live results in TODO §1) | [RPI5] | M | **shipped 2026-08-23** |
| Add explicit source-reached/valid-empty refresh-triage signal for Oświęcim and Piła; keep preserve-on-empty strict | [RPI5] | S-M | **shipped 2026-08-23** |
| Wałbrzych pre-Aug-2024 same-line legacy result-table history (current source and Aug-2024→2026 archive are repaired) | [RPI5] | S-M | optional historical backfill; documented in TODO §1 |
| Augustów: replace the now-empty listing indexes with filtered official search or another durable discovery feed | [RPI5] | M | open |
| Brzeg: detect the anti-DDoS waiting-room page, classify as source-unreachable, cookie-retry | [RPI5] | S | **shipped this session** |
| Racibórz + Pszczyna residential-egress policy | [RPI5] | S recurring | **stable-v1 decision 2026-09-05:** hosted automation excluded; operator refresh/re-audit required within each 21-day window |
| Institutional-source pilot: separate PKP + AMW pipeline/data/health, seller-labelled `/archiwum-all`; Orange evaluated and deferred | [RPI5] | M | **pilot shipped 2026-08-23**; public `/archiwum` after 3 green refreshes + spot-check |

### T1.b Distribution (mixed)

| Item | Env | Effort | Status |
|---|---|---|---|
| Extension: surface all 55 cities — `background.js` hardcodes 9; make CITIES data-driven off `data/index.json` (EXPANSION §1.6), version bump | [GUI] | M-L | **the main technical T1 item** |
| DECISION: "Silesian" → national positioning (unblocks the 3 copy items below) | [ACCOUNT] | XS | Kamil |
| PRIVACY.md refresh (still Gliwice-only) — required for store resubmit | [RPI5] draft + Kamil approve | S | blocked on rebrand decision |
| WEB_STORE_LISTING.md refresh (says 9 cities; reality 55, v1.32.0 features) | [RPI5] | S | blocked on rebrand decision |
| Chrome Web Store submit (live v1.3.3 vs local v1.32.0 — ~5 weeks unpublished). Recommended: bundle with the 55-city rework, one review cycle | [ACCOUNT] | S + review wait | Kamil — **the distribution unlock** |
| ~~Widen `PUBLIC_VOIVODESHIPS` beyond Śląskie~~ — **DONE 2026-07-27.** Gate is national (`null`); `MIN_PUBLIC_AUCTIONS`=10 unlists thin cities automatically. 54 cities / 15 voivodeships / 2 273 sitemap URLs | — | — | shipped |
| Google Search Console: verify domain, submit sitemap (after gate widening) | [ACCOUNT] | XS | Kamil |
| Analytics — code is wired (2026-07-27); needs a **free Umami Cloud** account + the `ANALYTICS_ID` repo variable. Plausible dropped: paid. Without this the GTM §6 kill gates can't be evaluated | [ACCOUNT] sign-up (free) | XS | Kamil — ~5 min |
| RODO/GDPR policy for newsletter + leads (draft agent-side, publish is Kamil's call) — **hard blocker for any ESP send** | [RPI5] draft | S-M | open |
| Newsletter go-live: ESP account + API secret (Kamil), send step + double-opt-in signup form (agent). First real digest generates Mon 2026-07-13 | [ACCOUNT] + [RPI5] | M | blocked on RODO |

## T2 — National city coverage

**Exit test:** every one of the 1,026 official GUS cities has current evidence;
every accessible in-scope municipal sale stream is monitored; refresh + health are
green at full scale.

All [RPI5] — dispatch via the `przetargi-city-triage` skill
(committed at `.claude/skills/przetargi-city-triage/SKILL.md`), protocol in
[spikes/README.md](./spikes/README.md), build guide in
[pipeline/ADAPTER-GUIDE.md](./pipeline/ADAPTER-GUIDE.md):

1. **Phase A complete:** reproducible TERYT import, 1,026 SIMC identities,
   preserved historic evidence, repaired powiat mappings and discrepancy report.
2. **Phase B1/B2 in review:** national data gates and hosted shards with a single
   validated publisher are implemented. Adapters requiring residential egress
   remain excluded; no local runner, Tailscale or private proxy is introduced.
3. **Next:** repair the 21 dated validation-quarantine datasets, audit source and
   asset coverage for the current 121 cities, then deliver Phase B3 discovery.
4. **Build the known queue:** 50 BUILD-ready cities after the Phase B gates.
5. **Review and research:** reassess 165 historic exclusions for the broader asset
   scope, then survey the 690 unresearched official cities in measured batches.
6. Keep the ledger disciplined: `master-cities.json` → `node
   spikes/build-progress.mjs` after every batch (SPIKE-PROGRESS is generated).

## T3 — Distribution + monetization

**Gate: let revenue, not the city list, decide** (EXPANSION.md). Kill gates per
GTM-SPRINT: no partner interest after ~10 calls → park monetization; 6 weeks
flat traffic → fix funnel first.

- National research follows the accepted [all-cities plan](./ALL-CITIES-PLAN.md);
  revenue validates the commercial offer, not whether official cities exist.
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
3. **Everything else is [RPI5]-shaped.** The two residential-egress adapters are
   excluded from hosted automation and retain last-good data until direct hosted
   access works; the Pi is not a production refresh path, CI proxy or workflow
   runner. See [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).
