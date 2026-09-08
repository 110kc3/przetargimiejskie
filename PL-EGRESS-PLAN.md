# Polish egress operating policy

**Status: hosted-only policy active from 8 September 2026; residential egress
and local production refresh are deliberately disabled.**

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
- `pipeline/src/core/fetch.js` has no proxy/private-network configuration hook;
  all production requests are direct from hosted runners.
- Adding automated residential egress is a new security-sensitive project, not
  a configuration toggle. It requires a fresh design review and explicit owner
  approval.

## No local production fallback

Racibórz and Pszczyna retain their last-good published data and an explicit
degraded/blocked state until their official sources become reachable from the
hosted pipeline or a public replacement source is validated. Local or operator
crawls may be used for diagnosis, but they are not a production refresh route and
must not advance public freshness. An empty or unreachable crawl never proves an
empty source.

## Time-bounded health policy

`pipeline/scripts/health-check.js` grants these two sources a stale-data-only
window of 21 days. Missing, malformed, empty, or sanity-invalid data still fails.
Expiry becomes a hard `exempt-expired` failure until direct hosted reachability or
a public replacement feed is established. The date is not renewed from a local
crawl, preventing an excluded source from turning into a permanent blind spot.

## Retirement record

A deny-by-default Squid/Tailscale prototype was built and locally verified on
4–5 September 2026. On 5 September the owner chose to proceed without Tailscale.
The service was stopped and disabled, the GitHub proxy secret was deleted, all
Tailscale workflow steps and repository templates were removed, and the Actions
allowlist was reduced to the two Aquasecurity actions required by Trivy. The
earlier self-hosted runner remains removed; no repository-connected machine is
registered.

The former optional proxy client and its direct dependency were removed on
8 September 2026. No production or local publication path replaces them.
