# Polish egress operating policy

**Status: hosted residential egress deliberately disabled; operator-only
refresh policy active from 5 September 2026.**

Racibórz and Pszczyna are registered and published, but their sources do not
refresh reliably from GitHub-hosted Azure egress. The repository does not join a
private network, expose a residential proxy, or store a proxy credential. Both
adapters carry `needsResidentialEgress: true`, and `refresh-matrix.js` excludes
them from daily and backfill workflows unconditionally.

This is an explicit scope decision for stable v1. It trades automatic freshness
for a smaller security boundary. All other cities and both institutional feeds
continue on disposable GitHub-hosted runners.

## Trust boundary

- No repository workflow or remotely dispatched job executes on the Raspberry
  Pi.
- The Pi stores no repository token and exposes no proxy service to CI.
- Crawler jobs retain read-only repository access and no persisted checkout
  credential. A separate writer validates bounded SHA-256 artifacts before it
  can publish.
- `FETCH_PROXY_URL` remains an optional local development hook in
  `pipeline/src/core/fetch.js`; GitHub Actions does not set it and the repository
  has no such secret.
- Adding automated residential egress is a new security-sensitive project, not
  a configuration toggle. It requires a fresh design review and explicit owner
  approval.

## Operator refresh procedure

From a trusted machine with suitable Polish egress, use a clean branch and run:

```bash
cd pipeline
npm ci
CITY=raciborz npm run refresh
node scripts/sanity-check.js raciborz
CITY=pszczyna npm run refresh
node scripts/sanity-check.js pszczyna
npm run build-index
npm run health
```

Review all generated data and cache changes, then publish them through the normal
reviewed Git workflow. An empty or unreachable crawl preserves last-good data and
must not be presented as a successful refresh.

## Time-bounded health policy

`pipeline/scripts/health-check.js` grants these two sources a stale-data-only
window of 21 days. Missing, malformed, empty, or sanity-invalid data still fails.
Before the window expires, an operator must refresh or re-audit each source and
renew the dated reason. Expiry becomes a hard `exempt-expired` failure, preventing
operator-only status from turning into a permanent blind spot.

## Retirement record

A deny-by-default Squid/Tailscale prototype was built and locally verified on
4–5 September 2026. On 5 September the owner chose to proceed without Tailscale.
The service was stopped and disabled, the GitHub proxy secret was deleted, all
Tailscale workflow steps and repository templates were removed, and the Actions
allowlist was reduced to the two Aquasecurity actions required by Trivy. The
earlier self-hosted runner remains removed; no repository-connected machine is
registered.

The optional proxy client code remains because it is useful for deliberate local
operator runs and is independently covered by dependency and fetch-boundary tests.
