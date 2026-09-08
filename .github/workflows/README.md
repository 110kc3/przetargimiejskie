# Workflow catalog

Eight workflows, numbered so the Actions sidebar sorts in pipeline order.
The daily chain is **1 → (data commits) → 3**, guarded by **2**; everything
else is periodic or PR-gated.

> **Renaming rule:** `3. Deploy site to OVH` triggers off workflow **1 by its
> display name** (`workflow_run` resolves names, not filenames). If you rename
> `1. Refresh auction data`, update the `workflows: [...]` list in
> `ovh-deploy.yml` in the same commit or the site stops deploying after crawls.

| # | File | Name | Triggers | What it does |
|---|---|---|---|---|
| 1 | `refresh.yml` | Refresh auction data | daily 04:00 UTC · push to `main` touching pipeline code · manual | The main crawl. A bounded matrix runs source-aware shards on read-only hosted jobs; each city still receives an isolated worktree, subprocess, timeout, log and outcome, so one failure cannot stop the shard. Racibórz/Pszczyna require residential egress and remain excluded with last-good status; there is no local production fallback. One write-enabled municipal publisher requires the exact artifact set, applies only hashed/allowlisted validated files, preserves failed cities' last-good files, records every attempt in the index and commits once. Providers use the same trust separation and retain PKP's fresh-runner retries. `triage` files/updates/closes per-city `[city-broken]` issues. |
| 2 | `health.yml` | Data health check | daily 07:00 UTC · PRs touching `data/**` · manual | Silent-breakage guard over the *committed* data (no network): checks national integrity status, capability-aware property/land counts, land schema/identity, valid-empty evidence, failed attempts, per-source degradation and freshness; provider freshness/count/identity/deduplication remains separate. City FAILs feed the `[city-broken]` issue pipeline (label `health-check`); a provider failure currently fails the workflow without masquerading as a city incident. |
| 3 | `ovh-deploy.yml` | Deploy site to OVH | after workflow 1 completes (`workflow_run`) · push to `main` touching `site/`/`data/`/`extension/` · manual | **The only deploy.** Builds `_site/` via `build-site.sh` and SFTP-mirrors it to OVH shared hosting (DNS points there). Secrets: `OVH_FTP_SERVER/USERNAME/PASSWORD`. |
| 4 | `newsletter.yml` | Weekly newsletter digest | Mondays 06:00 UTC · manual (`include_concluded` input) | Renders the "new auctions this week per city" Markdown/HTML digest into `newsletter/` and commits the `seen.json` delta state. Generation only — no ESP/send integration yet (TODO P1-D). |
| 5 | `extension-ci.yml` | Extension CI | PRs touching `extension/**` or its guard files · manual | `web-ext lint` (Firefox-only errors allowlisted in `check-extension-lint.mjs`) + manifest validation + the normalize-parity and version-lockstep tests. PR gate for the user-facing artifact. |
| 6 | `security.yml` | Security | push/PR to `main` · Mondays 07:00 UTC · manual | Enforces GitHub-hosted runners, runs CodeQL, requires zero open CodeQL alerts on `main`, and runs blocking Trivy dependency/secret scanning at medium severity or above. Findings are also uploaded to the Security tab. |
| 7 | `backfill.yml` | Backfill (manual) | manual only | Bounded historical refresh that primes cold OCR/text caches for new cities. It uses smaller source-aware hosted shards, an 80-minute per-city timeout inside a 350-minute shard, city isolation and the same exact-set single-publisher boundary as workflow 1; it shares the refresh concurrency lock. |
| 8 | `inventory.yml` | Refresh official city inventory | annual 10 January · relevant PRs · manual | Downloads official GUS TERYT files on a GitHub-hosted read-only job, verifies the 1,026-city SIMC manifest and targeted importer tests, then passes exactly five allowlisted generated files to a separate publisher. PR runs never publish. No private-network credentials or local runner are used. |

## Failure handling & notifications

- A **broken city** does not stop its shard (per-city errors are caught by
  design). Its failed outcome updates public status without replacing last-good
  files. Detection lives in the `triage` job: each city result classifies its
  own log/meta (`pipeline/scripts/triage-report.js`) and a
  broken city gets exactly one open issue —
  `[city-broken] <id>: <classification>` — whose body is a paste-into-Claude-Code
  fix prompt, with the fetched bytes attached as a `triage-<id>` artifact
  (14-day retention). The issue auto-closes when the city refreshes green.
  GitHub's issue notifications are the alert channel.
- Classifications: `source-unreachable`, `layout-change`, `sanity-failure`,
  `adapter-error`, `timeout` (from workflow 1); `stale-data`, `empty-data`,
  `meta-missing`, `land-data`, `source-degraded`, `refresh-failed`,
  `validation-quarantine-expired`, `exempt-expired` (from workflow 2).
- E2E test of the whole loop without breaking anything real:
  `gh workflow run refresh.yml -f only_city=augustow -f force_fail=augustow`
  (opens a test issue) → re-run without `force_fail` (auto-closes it).

## Concurrency locks

- `refresh` — shared by workflows 1 and 7 (one crawl at a time).
- `ovh-deploy`, `newsletter` — serialize their own runs.
- `official-city-inventory` serializes official inventory publication.
- Health / security / extension-ci cancel superseded runs per ref.

## Removed

- `pages.yml` (manual GitHub Pages fallback deploy) — deleted July 2026; OVH is
  the only host. Recover from git history and repoint DNS if OVH ever dies.
