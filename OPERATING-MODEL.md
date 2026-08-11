# OPERATING-MODEL.md — how the data operation supports the B2G product

> **What this is.** The one document above all the others: the *way of working* that
> takes przetargimiejskie to three end-states — **(1) autonomous** (runs with low
> human attention), **(2) reliable in its stated scope**, and **(3) paid for through
> a fixed-scope municipal reporting product**. The commercial sections were reset
> on 2026-08-11; [GTM.md](./GTM.md) and [GTM-SPRINT.md](./GTM-SPRINT.md) are the
> controlling product documents.
>
> Detail docs: [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md) (architecture) ·
> [ROADMAP.md](./ROADMAP.md) (tiers & gates) · [TODO.md](./TODO.md) (live backlog) ·
> [GTM.md](./GTM.md) + [GTM-SPRINT.md](./GTM-SPRINT.md) (revenue) ·
> [EXPANSION.md](./EXPANSION.md) (multi-city design) · [REMOTE.md](./REMOTE.md)
> (RPi5 runbook) · [spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md) (coverage ledger).

---

## 0. The thesis

The three goals are one system, but national completeness is not a prerequisite
for testing the paid offer:

```
AUTONOMY  ──feeds──▶  SOURCE QUALITY  ──enables──▶  FIXED-SCOPE REPORTS
(refresh and health)     (qualified city/period)    (paid B2G validation)
```

- **Autonomy protects the source record.** A product that silently rots is worth zero.
- **Quality is evaluated per entity, asset class and closed period.** A city either
  passes the report gate or it does not; national city count is not a sales claim.
- **Revenue is demand-gated, not traffic-gated.** The current test is a standardized
  municipal report. Consumer lead generation, sponsorship and newsletter
  monetization are deferred.

Work is split into three layers, and *keeping work in the right layer is the whole
operating model*:

| Layer | Who | What |
|---|---|---|
| **Machine** | GitHub Actions (7 workflows) | Daily refresh, health gate, auto-triage issues, site deploy, newsletter generation |
| **Agent** | Claude Code sessions (RPi5, headless) | Fix broken cities, dispatch spike/build batches, ledger + doc upkeep |
| **Human** | Kamil only | Seller/invoice facts, lawful purchasing route, acceptance of orders and pricing decisions; see the private vault |

---

## 1. Pillar 1 — Autonomous

### 1.1 What already runs unattended (the machine layer)

- **`refresh.yml`** — daily 04:00 UTC; per-city matrix job commits each city's
  `data/<city>/` delta; an `index` job rebuilds `data/index.json`; a `triage` job
  opens/comments/auto-closes one `[city-broken]` issue per failing city. **The
  `[city-broken]` issue list is the agent layer's work queue.**
- **`health.yml`** — daily silent-breakage guard (stale/empty data fails loud).
- **`ovh-deploy.yml`** — site rebuild + SFTP mirror, chained off refresh. The public
  site heals itself as data heals.
- **`newsletter.yml`** — generates the weekly digest (the *send* is blocked on
  ESP + RODO, §3.4). Plus `backfill.yml`, `extension-ci.yml`, `security.yml`.
  Catalog: [`.github/workflows/README.md`](./.github/workflows/README.md).

### 1.2 The agent layer — scheduled, not summoned

Autonomy means agent sessions run on a schedule instead of waiting for a human to
open a terminal. The standing agent jobs, in priority order:

1. **Daily ops triage (~15 min/day).** Read open `[city-broken]` issues; for each,
   diagnose live (the Pi's residential PL IP sees what CI cannot), fix the crawler or
   reclassify (source-emptied / IP-blocked / challenge page), keep `EXEMPT_NEW`
   honest before entries expire. Known non-bugs: a single-city 503/timeout is
   runner-IP flake, not code.
2. **Expansion batches (the completeness engine, §2.3).** Dispatch via the
   `przetargi-city-triage` skill: spike unspiked powiat seats, build from the
   BUILD-ready queue, re-verify the `verify` bucket. **Cap 2–3 concurrent city
   agents on the Pi** (6 OCR-heavy agents stall the box). After every batch:
   update `spikes/master-cities.json` → `node spikes/build-progress.mjs` (the
   ledger is generated, never hand-edited).
3. **Doc/state sync (weekly).** TODO/README/ledger must match reality (the repo is
   md-file-driven); sync the vault project summary. README's city count goes stale
   fast — regenerate it from `data/index.json`, don't hand-count.

Scheduling mechanics: a cron'd headless session on the Pi (`claude -p` /
`claude schedule`), or an interactive `/loop`. The Pi is already provisioned per
[REMOTE.md](./REMOTE.md) §3. Always `git pull --rebase` before pushing — CI commits
to `main` constantly.

### 1.3 The two autonomy gaps to close (do these first)

1. **PL egress wired into CI.** Half of recurring health-red is one root cause: the
   FINN host (`bip2.finn.pl` — Racibórz, Świętochłowice) and Brzeg's anti-DDoS page
   block Azure/GH-runner IPs, and no code fix exists. Options in REMOTE.md §1;
   **preferred: register the Pi as a GitHub self-hosted runner** and point only the
   blocked cities' matrix jobs at it (`runs-on: self-hosted` split in `refresh.yml`).
   Fallback: `FETCH_PROXY_URL` (already shipped in `core/fetch.js`) + a paid PL
   proxy. Until this lands, these cities are permanent agent-layer toil.
2. **The scheduled daily agent session** (§1.2) so triage and expansion happen
   without being asked.

### 1.4 The human layer — what can never be automated

Kamil supplies facts and authority the repository cannot invent: the exact seller
identity and address, VAT/invoice treatment, approval of the fixed offer, the
buyer-approved purchasing route, and acceptance of an order. Those actions live
only in the private vault at `40-projects/przetargimiejskie/b2g-pilot.md`.
Implementation, source checks, report generation and public copy stay in the
machine/agent layers.

**Autonomy exit test:** four consecutive weeks where health stays green, coverage
grows, the digest generates, and total human input is ≤ 1 h/week of decisions.

---

## 2. Pillar 2 — Complete in its genre

### 2.1 What "complete" means (and doesn't)

The genre is **Polish municipal property-auction aggregation with history**.
Complete means:

1. **Every one of the ~380 powiat seats is BUILT or carries a documented NO-BUILD
   verdict.** NO-BUILD verdicts *are* completeness — most cities sell flats
   *bezprzetargowo* to sitting tenants, and the documented verdict is the proof of
   an exhaustive survey. (ROADMAP T2 exit test.)
2. **The distribution surfaces match the data.** The extension serves all built
   cities data-driven from `data/index.json` (today it hardcodes 9 — the one big
   `[GUI]` item), and the Web Store listing is current. SEO pages cover every built
   voivodeship (`PUBLIC_VOIVODESHIPS` widened from Śląskie).
3. **History, not just listings:** achieved-price/result streams wired for every
   city that publishes them; auction-round tracking everywhere (that's the moat).
4. **All asset classes the domain implies:** flats (core) + land + garages +
   commercial.

Explicitly **not** required: the ~700 long-tail small towns. Those are T3 and
**demand-gated** — only traffic/revenue unlocks them. Complete ≠ every village;
complete = every place with real auction volume, plus documented verdicts for the
rest.

### 2.2 Where it stands (2026-07-16, live ledger)

| Status | Count |
|---|---|
| **Built** (live in `data/`) | **105** |
| BUILD-verified, not yet built | 66 |
| NO-BUILD (documented) | 156 |
| Dropped / deferred | 9 |
| **Ledger total** | **336** of ~380 powiat seats |

So the remaining distance: **~44 seats to spike + ~66–85 adapters to build**. At the
demonstrated pace (~7 adapters/day in batched agent sessions, 2–3 concurrent), that
is **~6–10 weeks of scheduled agent work** — no research risk, no unknowns, pure
execution of §1.2 job 2.

### 2.3 The mechanism (already proven, just keep the crank turning)

Spike → verdict → build → first live refresh validates → `health.yml` guards
forever. Protocol: [spikes/README.md](./spikes/README.md); build guide:
[pipeline/ADAPTER-GUIDE.md](./pipeline/ADAPTER-GUIDE.md); one new city = one
`pipeline/src/cities/<city>/` folder + one registry entry + one groundtruthed
parser test. Shard the CI matrix into grouped jobs when wall-clock creeps (~100+
cities — we are there; watch it). **Completeness exit test:** ledger shows 0
unspiked powiat seats, 0 BUILD-ready backlog, extension + SEO surfaces all built
cities, health green at full scale.

---

## 3. Pillar 3 — Paid B2G validation

### 3.1 The offer

The first paid product is the **Karta wyników zbywania mienia**: one entity, one
asset class and one closed period, delivered as HTML/PDF, source/control CSV and a
frozen analysis snapshot. The first-cohort price hypothesis is **2,900 zł + VAT,
if applicable**. It is a standardized data product, not consulting, valuation,
legal audit, forecasting or a SaaS portal.

The report may describe only historical information published by identified
sources. Sold, unsold and unknown outcomes remain separate; inferred results remain
unknown; source coverage, exclusions and denominators are visible. No national
failure-rate claim, causal diagnosis, loss estimate or price recommendation is a
commercial primitive.

### 3.2 Eligibility before outreach

Run `scripts/audit-b2g-readiness.mjs` for the exact entity, residential asset class
and closed period. A target is eligible only when it has at least 20 decided events,
at least three of each decided outcome, 100% outcome-source coverage and at most 25%
unknown outcomes, followed by manual source and rendered-artifact review. The
current four-year outreach cohort is Gliwice, Kamienna Góra, Głogów and
Tarnowskie Góry. Pszczyna passes the automated gate but remains pending manual
review. Do not lower thresholds to enlarge the list.

### 3.3 Demand and productization gates

Within 45 days, require three substantive responses, two buyer conversations, one
written request for a priced pilot and one paid order or signed purchase document.
Five qualified conversations with no paid pilot is a stop/reposition signal.
Within 90 days, require two paid pilots, one documented workflow reuse and one
second-period order, renewal or annual commitment.

One paid buyer earns a carefully documented manual delivery. Recurring automation
follows two paid buyers or one renewal. A portal/API is not considered until three
municipalities pay and two commit to continuation.

### 3.4 Division of work

The repository owns the public example, data gate, generator, source verification
and neutral copy. The only owner actions are private seller/invoice facts, approval
of the fixed price and use of a lawful buyer-approved contact or purchasing route;
they are kept in the vault. Consumer lead generation, broker calls, newsletters,
sponsorship, RCN integration and new city builds solely for prospect volume are
deferred. See [GTM.md](./GTM.md) for the exact boundaries and [GTM-SPRINT.md](./GTM-SPRINT.md)
for the execution gate.

---

## 4. The operating rhythm

| Cadence | Machine | Agent | Human (Kamil) |
|---|---|---|---|
| **Daily** | 04:00 refresh → health → triage issues → deploy | Work the `[city-broken]` queue; one expansion batch when queue is empty | — |
| **Weekly** | Scheduled data checks | Ledger rebuild, TODO/README/vault sync | Review exceptions and any active buyer response |
| **Per pilot** | Deterministic analysis + artifact build | Source check, manual sample, PDF/CSV review | Confirm seller/order facts and buyer route |
| **Day 45/90** | — | Assemble evidence against the written gate | Continue, reposition or stop |

## 5. Order of operations from today

1. Keep refresh and health green; fix source integrity before adding report claims.
2. Use the frozen Gliwice example and the current outreach cohort for the
   fixed-price B2G test.
3. Complete only the owner facts and lawful route listed in the private vault.
4. Evaluate the day-45 gate before adding report automation or prospect-specific
   data work.
5. Continue national completeness work only where it improves the public record;
   do not treat city count as proof of willingness to pay.

**The end-state, in one sentence:** a self-refreshing public source record whose
qualified slices can be delivered as neutral, reproducible municipal reports with
clear limits and demonstrated recurring use.
