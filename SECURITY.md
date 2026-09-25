# Security policy and stable-v1 baseline

## Supported code

Security fixes are applied to `main`. Report a vulnerability privately through
GitHub's security-advisory interface; do not put credentials, exploit payloads,
or private infrastructure details in a public issue.

## Trust boundaries

Municipal HTML, PDFs, office documents and provider feeds are untrusted input.
Crawler parsers turn that material into plain data; their tag removal and entity
decoding are extraction logic, not an HTML sanitizer. Every browser or generated
HTML sink must independently:

- escape dynamic text for its output context;
- accept only `http:` and `https:` link targets;
- serialize embedded JSON without a literal `<`, `>` or `&`;
- preserve source links so a user can verify derived data.

`pipeline/tests/safe-json.test.js`, the extension escaping helpers and the SEO
build audit protect these boundaries. Code-scanning reports about parser-only
tag removal, entity decoding, fixtures or deliberate character ranges are
dismissed only after verifying that the value reaches no unescaped HTML sink.
The dismissal comment records that decision. Actual findings remain open until
a subsequent scan observes the fix.

## Dependency and scanner gate

The weekly/on-push security workflow runs CodeQL and Trivy. Stable-v1 requires:

- zero open CodeQL alerts on `main` (the workflow checks this after analysis);
- Trivy to fail on medium, high or critical dependency/secret findings;
- every dependency install in refresh/backfill workflows to use the committed
  lockfile through `npm ci`;
- third-party workflow actions pinned to reviewed full commit SHAs.

Repository settings enforce SHA pins, allow GitHub-owned actions plus only the
reviewed Trivy and Trivy-setup actions, and require approval before any external
contributor's workflow runs. Refresh and backfill crawlers have read-only tokens
and no persisted checkout credential. A bounded hosted shard gives every city a
separate detached worktree, subprocess, timeout and log. Workers emit bounded
SHA-256 manifests; a
separate trusted publisher rejects traversal, symlinks, undeclared or duplicate
paths, unexpected types, malformed JSON, oversized files and hash mismatches,
requires exactly one outcome per expected city, then reruns data sanity checks
before receiving permission to push. Only validated deltas can replace city data;
a failed outcome updates index health/attempt metrics while retaining last-good
files. The publisher rebuilds the municipal index and commits once.

The official TERYT inventory uses the same separation. Its network-facing job has
read-only repository permission and no persisted checkout credential. The publisher
accepts exactly five named generated files, rejects symlinks and unexpected paths,
and reruns the inventory verifier before receiving `contents: write`. Pull-request
runs never publish. The workflow carries no private-network or proxy credential.

The earlier optional Undici proxy dependency has been removed. Production has no
proxy/private-network configuration path; Node's built-in fetch handles direct
hosted requests and Playwright remains the only direct pipeline dependency.

## Broken certificate chains

Several public municipal servers omit intermediate CAs. The legacy adapter
option `insecureTLS` now selects the host-specific chain in
`pipeline/src/core/source-tls.js`; it **does not disable certificate validation**.
Reviewed intermediates supplement Node's built-in public roots. Certificate
expiry, hostname checks and a complete chain to a public root remain required;
partial-chain trust is disabled. No new self-signed root or leaf is trusted.

The compatibility path still requires HTTPS on port 443, credential-free URLs,
an audited hostname and the same allowlist checks on every redirect. Chain
provenance and the replacement procedure are recorded in
[pipeline/src/core/certificates/README.md](./pipeline/src/core/certificates/README.md).
If a source changes issuer or serves an invalid certificate, the request fails
and the normal refresh policy retains last-good data. Never silence CodeQL or
restore a certificate-validation bypass to make a source green.

## Residential-egress sources

Adapters marked `needsResidentialEgress` are unconditionally excluded from
GitHub-hosted refresh and backfill matrices. GitHub stores no residential-proxy
or private-network credential, and repository automation never executes on the
Pi. Racibórz and Pszczyna remain on their last-good data until direct hosted
access works; there is no local production refresh path. An expiring 21-day
stale-only health rule turns that limitation into a hard visible failure rather
than silently renewing it. See [PL-EGRESS-PLAN.md](./PL-EGRESS-PLAN.md).
