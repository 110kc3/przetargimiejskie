# Workflow catalog

Seven workflows, numbered so the Actions sidebar sorts in pipeline order.
The daily chain is **1 → (data commits) → 3**, guarded by **2**; everything
else is periodic or PR-gated.

> **Renaming rule:** `3. Deploy site to OVH` triggers off workflow **1 by its
> display name** (`workflow_run` resolves names, not filenames). If you rename
> `1. Refresh auction data`, update the `workflows: [...]` list in
> `ovh-deploy.yml` in the same commit or the site stops deploying after crawls.

| # | File | Name | Triggers | What it does |
|---|---|---|---|---|
| 1 | `refresh.yml` | Refresh auction data | daily 04:00 UTC · push to `main` touching pipeline code · manual | The main crawl. Matrix = one job per city from the registry (`pipeline/src/cities/index.js`), `fail-fast: false`, so one broken city never blocks the rest. Each job: crawl → `sanity-check.js` gate → geoportal enrich → commit only `data/<city>/` (rebase-retry push). Then: `index` job rebuilds `data/index.json`; `triage` job files/updates/closes per-city `[city-broken]` issues from the classify artifacts. |
| 2 | `health.yml` | Data health check | daily 07:00 UTC · PRs touching `data/**` · manual | Silent-breakage guard over the *committed* data (no network): fails on missing/unparseable `meta.json`, `unique_properties=0` for an established city, data staler than `STALE_DAYS=3`, or an `EXEMPT_NEW` entry older than 21 days. FAILs feed the same `[city-broken]` issue pipeline as workflow 1 (label `health-check`). |
| 3 | `ovh-deploy.yml` | Deploy site to OVH | after workflow 1 completes (`workflow_run`) · push to `main` touching `site/`/`data/`/`extension/` · manual | **The only deploy.** Builds `_site/` via `build-site.sh` and SFTP-mirrors it to OVH shared hosting (DNS points there). Secrets: `OVH_FTP_SERVER/USERNAME/PASSWORD`. |
| 4 | `newsletter.yml` | Weekly newsletter digest | Mondays 06:00 UTC · manual (`include_concluded` input) | Renders the "new auctions this week per city" Markdown/HTML digest into `newsletter/` and commits the `seen.json` delta state. Generation only — no ESP/send integration yet (TODO P1-D). |
| 5 | `extension-ci.yml` | Extension CI | PRs touching `extension/**` or its guard files · manual | `web-ext lint` (Firefox-only errors allowlisted in `check-extension-lint.mjs`) + manifest validation + the normalize-parity and version-lockstep tests. PR gate for the user-facing artifact. |
| 6 | `security.yml` | Security | push/PR to `main` · Mondays 07:00 UTC · manual | CodeQL (JS — injection risk from crawled municipal content) + Trivy (dependency CVEs + secret scan). Reports to the Security tab via SARIF; never blocks. |
| 7 | `backfill.yml` | Backfill (manual) | manual only | Full parallel refresh with a 350-min per-city timeout and unbounded crawlers — primes cold OCR/text caches for new cities. Shares workflow 1's `refresh` concurrency lock so runs never interleave commits. |

## Failure handling & notifications

- A **broken city** does not redden workflow 1 (per-city errors are caught by
  design — commit isolation). Detection lives in the `triage` job: each matrix
  job classifies its own log/meta (`pipeline/scripts/triage-report.js`) and a
  broken city gets exactly one open issue —
  `[city-broken] <id>: <classification>` — whose body is a paste-into-Claude-Code
  fix prompt, with the fetched bytes attached as a `triage-<id>` artifact
  (14-day retention). The issue auto-closes when the city refreshes green.
  GitHub's issue notifications are the alert channel.
- Classifications: `source-unreachable`, `layout-change`, `sanity-failure`,
  `adapter-error`, `timeout` (from workflow 1); `stale-data`, `empty-data`,
  `meta-missing`, `exempt-expired` (from workflow 2).
- E2E test of the whole loop without breaking anything real:
  `gh workflow run refresh.yml -f only_city=augustow -f force_fail=augustow`
  (opens a test issue) → re-run without `force_fail` (auto-closes it).

## Concurrency locks

- `refresh` — shared by workflows 1 and 7 (one crawl at a time).
- `ovh-deploy`, `newsletter` — serialize their own runs.
- Health / security / extension-ci cancel superseded runs per ref.

## Removed

- `pages.yml` (manual GitHub Pages fallback deploy) — deleted July 2026; OVH is
  the only host. Recover from git history and repoint DNS if OVH ever dies.
