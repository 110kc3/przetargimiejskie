# Stable v1 release record

**Status: release candidate — stable declaration pending the account-owned
Tailscale activation and hosted acceptance run below.**

This record defines project stability independently of the Chrome extension's
store version. Stable v1 covers the current static site, the 121 registered city
feeds, the separate PKP/AMW pilot feeds, their scheduled refresh/health/triage
automation, and the documented last-good-data behavior. It does not promise that
every roadmap idea, BUILD-ready adapter or extension overlay is complete.

## Release gates

- The complete offline pipeline suite passes on Node 20.
- The production site builds and every sitemap URL passes the SEO audit.
- `npm audit` and blocking Trivy report no medium-or-higher dependency or
  committed-secret finding.
- CodeQL reports zero open `main` alerts; real fixes close by analysis and only
  reviewed extraction/test findings carry documented dismissals.
- Daily refresh and manual backfill crawlers have read-only repository access,
  no persisted checkout credentials, and publish only through bounded,
  allowlisted SHA-256 artifacts revalidated by a separate writer.
- Insecure TLS compatibility is limited to credential-free HTTPS/443 requests
  for exact audited public hosts, including redirects.
- The Polish egress appliance is Tailscale-only, caller-tag-gated,
  CONNECT/443-only, destination-allowlisted and deny-by-default; negative policy
  tests and real city refreshes pass.
- GitHub enforces action SHA pins, permits only GitHub-owned actions plus the
  reviewed Tailscale/Trivy actions, requires approval for every external
  contributor workflow, and protects `main` from force-push/deletion.

## Final activation

1. In the Tailscale admin console, authorize an OAuth client to mint only
   `tag:przetargi-ci`, tag the Pi as `tag:przetargi-egress`, and merge a
   least-privilege grant from the CI tag to only TCP 3129 on that appliance.
2. Add the client values directly as GitHub repository secrets
   `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`; do not paste the secret into an
   issue, commit or chat. `FETCH_PROXY_URL` is already configured.
3. Dispatch `refresh.yml` once for `raciborz` and once for `pszczyna`. Both must
   join with a short-lived identity, pass `ops/egress/verify.sh`, refresh and
   pass sanity; the identity must disappear when each job ends.
4. Merge the release candidate, require the main-branch Security workflow to
   close the remaining fixed alerts and pass, then change this status to
   **stable** and create the annotated `stable-v1` tag.

The durable security contract is in [SECURITY.md](./SECURITY.md); appliance and
kill-switch detail is in [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).
