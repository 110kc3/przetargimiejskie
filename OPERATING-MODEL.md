# OPERATING-MODEL.md — how this project runs itself, gets finished, and earns

> **What this is.** The one document above all the others: the *way of working* that
> takes przetargimiejskie to three end-states — **(1) autonomous** (runs with ~1 h/week
> of human attention), **(2) complete in its genre** (the definitive Polish
> municipal-auction record), **(3) making money** (paid around the user, never from
> them). It doesn't replace the detail docs; it tells you which one to open and in
> what order. Written 2026-07-16 from live repo state.
>
> Detail docs: [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md) (architecture) ·
> [ROADMAP.md](./ROADMAP.md) (tiers & gates) · [TODO.md](./TODO.md) (live backlog) ·
> [GTM.md](./GTM.md) + [GTM-SPRINT.md](./GTM-SPRINT.md) (revenue) ·
> [EXPANSION.md](./EXPANSION.md) (multi-city design) · [REMOTE.md](./REMOTE.md)
> (RPi5 runbook) · [spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md) (coverage ledger).

---

## 0. The thesis

The three goals are one system, in dependency order:

```
AUTONOMY  ──feeds──▶  COMPLETENESS  ──feeds──▶  MONEY
(the machine keeps      (complete coverage        (traffic × trust × coverage
 itself green and        is what makes the         is what a sponsor or
 keeps expanding)        product defensible)       lead-gen partner pays for)
```

- **Autonomy first**, because completeness is ~110+ more adapters and nobody should
  hand-crank those, and because a data product that silently rots is worth zero.
- **Completeness second**, because "every municipal auction in Poland, with history"
  is the genre-defining claim no competitor (and no single city BIP) can make.
- **Money last and demand-gated**, because every revenue model here pays in
  proportion to reach, and reach is unproven until distribution is switched on.

Work is split into three layers, and *keeping work in the right layer is the whole
operating model*:

| Layer | Who | What |
|---|---|---|
| **Machine** | GitHub Actions (7 workflows) | Daily refresh, health gate, auto-triage issues, site deploy, newsletter generation |
| **Agent** | Claude Code sessions (RPi5, headless) | Fix broken cities, dispatch spike/build batches, ledger + doc upkeep |
| **Human** | Kamil only (`[ACCOUNT]` items) | Store submit, DNS/ESP/analytics accounts, legal publish, partner calls, pricing, JDG |

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

Kamil-only, roughly **one day of decisions + account clicks total**, then ~1 h/week:
rebrand/positioning decisions · Chrome Web Store submit · `PUBLIC_VOIVODESHIPS`
width · Google Search Console · analytics account (Plausible/Umami) · ESP account ·
publishing the RODO policy ([RODO-DRAFT.md](./RODO-DRAFT.md) is written, awaiting
review) · partner demand calls (§3.2) · signing sponsors/partners · JDG
registration. Everything else must be machine- or agent-shaped; if a task keeps
landing on the human, that's an operating-model bug — automate or delete it.

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

## 3. Pillar 3 — Making money

### 3.1 The settled model — don't relitigate

Everything user-facing is **free forever** (extension, archive, alerts, newsletter,
export): the records are public, gating them is indefensible, and free is the
funnel. Revenue comes from around the user ([GTM.md](./GTM.md)):

1. **Lead-gen partnerships (the engine).** At the moment someone eyes a municipal
   flat they need: a mortgage broker (*ekspert kredytowy* — highest CPL), a
   renovation crew (near-universal need — municipal stock is distressed), a
   surveyor, insurance. Labeled (*współpraca*), contextual, zero trackers, leads
   routed concierge-style first. Never notaries (regulated tariff).
2. **Sponsorship + donations (the supplement).** One tasteful sponsor slot on site +
   weekly newsletter, flat fee priced on reach; GitHub Sponsors + a PL tip jar as
   the floor.

The moat monetization rides on: aggregation + **history** (round tracking, achieved
prices) + freshness + national coverage — none of which a single city BIP offers.

### 3.2 The order — demand test before traffic engine

Per [GTM-SPRINT.md](./GTM-SPRINT.md): the cheapest, highest-kill-power test is not
SEO — it's **~10 phone calls** (5–8 mortgage brokers + 3–4 renovation firms in
covered cities) to get one verbal *"yes, I'd pay ~X per lead"*. `[ACCOUNT]` — this
is Kamil's single highest-leverage hour. It yields the only number that sizes the
business: `monthly revenue ≈ leads/month × CPL`.

- **≥1 real quote** → run the funnel: analytics on → distribution live → free pilot
  leads → convert to paid → JDG before the *działalność nierejestrowana* quarterly
  cap (10 813,50 zł).
- **Zero interest after ~10 honest calls** → the engine has no buyer at current
  scale: park lead-gen, keep donations + one sponsor, keep growing
  completeness/reach, retest at higher coverage.

### 3.3 Metrics and kill gates (evaluate monthly, honestly)

Track: organic sessions/week · ranking city pages · newsletter subscribers · CTA
CTR · leads/week · partner-accepted rate · revenue per partner. Gates: 6 weeks of
flat-zero organic traffic → fix funnel before any monetization work; traffic but
~zero CTA clicks → wrong moment/offer, move the CTA; leads but no payer → flat
placement/sponsorship instead of CPL. Note the honest ceiling: this is
**side-income / micro-business scale**, not a venture — which is fine, because
infra ≈ €0 and the marginal cost of running it (per Pillar 1) is ~1 h/week.

### 3.4 The unlock list — every item currently blocking revenue is human-shaped

In order: **(1)** Chrome Web Store submit (live v1.3.3 vs local v1.32.x — the
distribution unlock; bundle with the all-cities extension rework), **(2)** widen
`PUBLIC_VOIVODESHIPS` + Search Console + sitemap (multiplies the SEO surface the
agents already built), **(3)** analytics account (without it no gate in §3.3 can be
evaluated), **(4)** publish RODO policy + ESP account → newsletter send goes live
(the sponsorship vehicle), **(5)** the §3.2 demand-test calls. Agents pre-draft
everything (store copy, policy, outreach scripts, digests); the human clicks.

---

## 4. The operating rhythm

| Cadence | Machine | Agent | Human (Kamil) |
|---|---|---|---|
| **Daily** | 04:00 refresh → health → triage issues → deploy | Work the `[city-broken]` queue; one expansion batch when queue is empty | — |
| **Weekly** | Digest generation | Ledger rebuild, TODO/README/vault sync, pre-draft outreach/digest | ~1 h: read digest + metrics, decisions, partner touches |
| **Monthly** | — | Coverage + data-quality report | §3.3 gate review; prune non-performing partners; pricing |

## 5. Order of operations from today

1. **Close the autonomy gaps** (§1.3): PL egress into CI + the scheduled daily
   agent session. *Everything downstream compounds on this.*
2. **Kamil's distribution day** (§3.4 items 1–4): store submit, gates wide,
   analytics, RODO + ESP.
3. **Demand-test week** (§3.2): ~10 calls, get a CPL or a documented "no buyer yet".
4. **Finish completeness** (§2.2): ~6–10 weeks of scheduled batches to T2-complete,
   running unattended behind whatever monetization is doing.
5. **Monetize per the gates** (§3.3): sponsor + donations immediately after
   distribution is live; lead-gen when the demand test says yes; long-tail T3
   expansion only when revenue asks for it.

**The end-state, in one sentence:** a self-refreshing, self-healing national record
of every Polish municipal property auction — maintained by scheduled agents at
~1 h/week of human cost, complete across all powiat seats, free for everyone, and
paid for by the businesses that serve its users.
