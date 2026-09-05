# Stable v1 release record

**Status: stable v1 declared 5 September 2026.**

Stable v1 covers the static site, 121 registered municipal feeds, the separate
PKP/AMW pilot feeds, scheduled refresh/health/triage automation, and documented
last-good-data behavior. It does not promise completion of every roadmap idea,
BUILD-ready adapter, newsletter integration, or extension expansion.

## Release baseline

- The complete offline pipeline suite passes on Node 20.
- The production site builds and every sitemap URL passes the SEO audit.
- `npm audit` and blocking Trivy report no medium-or-higher dependency or
  committed-secret finding.
- CodeQL passes for the release candidate; real findings are fixed and parser or
  fixture-only extraction findings are dismissed only with reviewed rationale.
- Daily refresh and manual backfill crawlers have read-only repository access,
  no persisted checkout credentials, and publish only through bounded,
  allowlisted SHA-256 artifacts revalidated by a separate writer.
- Insecure TLS compatibility is limited to credential-free HTTPS/443 requests
  for exact audited public hosts, including redirects.
- Racibórz and Pszczyna are excluded from hosted automation unconditionally.
  They use reviewed operator refreshes, last-good preservation, and an expiring
  21-day stale-only health policy; GitHub has no residential-proxy secret.
- GitHub enforces action SHA pins, permits only GitHub-owned actions plus the two
  Aquasecurity actions needed by Trivy, requires approval for every external
  contributor workflow, and protects `main` from force-push and deletion.

## Evidence

The release was checked with the full Node 20 test suite, city and provider
health gates, site build and SEO audit, actionlint, the hosted-runner policy
test, `npm audit`, Trivy, and PR CodeQL. Kalisz was refreshed successfully;
Pszczyna's live 503 was handled by preserving last-good data and remains visible
under the bounded operator-only policy.

The durable security contract is in [SECURITY.md](./SECURITY.md), and the
no-Tailscale operating decision is in [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).
