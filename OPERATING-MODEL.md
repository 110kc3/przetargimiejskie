# OPERATING-MODEL.md — how the data operation supports the B2G product

> **What this is.** The one document above all the others: the *way of working* that
> takes przetargimiejskie to three end-states — **(1) autonomous** (runs with low
> human attention), **(2) reliable in its stated scope**, and **(3) able to support
> a paid municipal data-workflow service once a buyer confirms the work**. The commercial sections were reset
> on 2026-08-11; [GTM.md](./GTM.md) and [GTM-SPRINT.md](./GTM-SPRINT.md) are the
> controlling product documents.
>
> Detail docs: [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md) (architecture) ·
> [ROADMAP.md](./ROADMAP.md) (tiers & gates) · [TODO.md](./TODO.md) (live backlog) ·
> [GTM.md](./GTM.md) + [GTM-SPRINT.md](./GTM-SPRINT.md) (revenue) ·
> [EXPANSION.md](./EXPANSION.md) (multi-city design) · [REMOTE.md](./REMOTE.md)
> (manual RPi5 work) · [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md) (secure CI egress) ·
> [spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md) (coverage ledger).

---

## 0. The thesis

The three goals are one system, but national completeness is not a prerequisite
for testing the paid offer:

```
AUTONOMY  ──feeds──▶  SOURCE QUALITY  ──demonstrates──▶  WORKFLOW SERVICE
(refresh and health)     (free evidence)              (paid only after discovery)
```

- **Autonomy protects the source record.** A product that silently rots is worth zero.
- **Quality is evaluated per entity, asset class and closed period.** A city either
  passes the report gate or it does not; national city count is not a sales claim.
- **Revenue is problem-gated, not data-gated.** The free report demonstrates the
  method. The current test is whether a municipality has recurring reconciliation,
  automation or reporting work worth buying. Consumer lead generation,
  sponsorship and newsletter monetization are deferred.

Work is split into three layers, and *keeping work in the right layer is the whole
operating model*:

| Layer | Who | What |
|---|---|---|
| **Machine** | GitHub Actions (7 workflows) | Daily refresh, health gate, auto-triage issues, site deploy, newsletter generation |
| **Agent** | Claude Code sessions (RPi5, headless) | Fix broken cities, dispatch spike/build batches, ledger + doc upkeep |
| **Human** | Kamil only | Discovery outreach, seller/invoice facts, lawful purchasing route and acceptance of an order; see the private vault |

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
   honest before entries expire. Known non-bugs: a single-city 503/timeout can be
   hosted-CI egress flake, not code.
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
to `main` constantly. These are operator-controlled development sessions, not
remotely dispatched workflow jobs.

### 1.3 The two autonomy gaps to close (do these first)

1. **Restricted PL egress — open.** All repository code stays on GitHub-hosted
   machines. Provision the deny-by-default proxy in
   [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md), then route only the FINN pair
   (Racibórz, Świętochłowice), Brzeg, Wałbrzych and the provider job through
   `FETCH_PROXY_URL`. Until then those sources may preserve last-good data.
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

## 3. Pillar 3 — Paid B2G workflow validation

### 3.1 Free evidence and the paid hypothesis

The **Karta wyników zbywania mienia** for Gliwice is a free public example. Its
sources are public and the report itself is not offered as paid access to them.
It proves that the repository can connect notices and outcomes conservatively,
retain provenance and reproduce a fixed analysis.

The paid hypothesis is implementation or maintenance work around a confirmed
municipal process: cleaning and migrating a register, automating joins and
exception checks, producing an existing recurring export, or maintaining the
agreed workflow. No public price exists; scope and price follow discovery of the
actual work and its acceptance criteria.

### 3.2 Discovery before an offer

Start with ZGM Gliwice's Dział Sprzedaży because the official remit assigns it the
relevant auction-sale workflow. Ask how notices, results and repeat dates are
registered today, which steps are manual, and which recurring output has a named
owner and deadline. Do not assume that a public-data report replaces internal
work. Do not broaden outreach to other data-qualified cities until the Gliwice
conversation establishes whether this workflow problem exists at all.

The data-readiness audit still protects any example or buyer-scoped analysis, but
passing it is evidence quality—not a reason to contact or charge a city.

### 3.3 Demand and productization gates

Within 30 days, require one workflow-owner conversation, one confirmed repeated
task and explicit permission to return with a scope. Within 60 days, require a
written request for scope/quotation through a permitted route and a paid order,
signed purchase document or procurement invitation. Recurring automation follows
only when the first delivery is reused and a second buyer or renewal demonstrates
repeatability.

Five qualified workflow-owner conversations with no repeated problem worth
funding is a stop/reposition signal. Praise for the free example does not pass.

### 3.4 Division of work

The repository owns the free example, data gate, generator, source verification
and neutral copy. The owner handles the physical discovery letter, any invited
conversation, seller/invoice facts and the buyer-approved purchasing route; these
actions are kept in the vault. No unsolicited pitch goes to a public operational
email. Consumer lead generation, broker calls, newsletters, sponsorship, RCN
integration and new city builds solely for prospect volume are deferred. See
[GTM.md](./GTM.md) for the exact boundaries and [GTM-SPRINT.md](./GTM-SPRINT.md)
for the execution gate.

---

## 4. The operating rhythm

| Cadence | Machine | Agent | Human (Kamil) |
|---|---|---|---|
| **Daily** | 04:00 refresh → health → triage issues → deploy | Work the `[city-broken]` queue; one expansion batch when queue is empty | — |
| **Weekly** | Scheduled data checks | Ledger rebuild, TODO/README/vault sync | Review exceptions and any active buyer response |
| **Per discovery** | Keep free example available | Prepare process questions and evidence | Use permitted route; record the workflow, owner and requested result |
| **Per engagement** | Run agreed automation only after scope | Build/test against acceptance criteria | Confirm seller/order facts and buyer route |
| **Day 30/60/90** | — | Assemble evidence against the written gate | Continue, reposition or stop |

## 5. Order of operations from today

1. Keep refresh and health green; fix source integrity before adding report claims.
2. Keep the Gliwice example free and use it only to request a process-discovery
   conversation with ZGM's Dział Sprzedaży.
3. Use the lawful route and letter listed in the private vault; do not send an
   unsolicited electronic sales pitch.
4. Define or price nothing until a workflow owner confirms a repeated task,
   measurable output and permitted purchasing route.
5. Continue national completeness work only where it improves the public record;
   do not treat city count as proof of willingness to pay.

**The end-state, in one sentence:** a self-refreshing public source record that
demonstrates the capability to remove verified, recurring municipal data work
through a separately scoped and paid service.
