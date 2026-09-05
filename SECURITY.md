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
reviewed Trivy and Tailscale actions, and require approval before any external
contributor's workflow runs. Refresh and backfill crawlers have read-only tokens
and no persisted checkout credential. They emit bounded SHA-256 manifests; a
separate trusted publisher rejects traversal, symlinks, undeclared or duplicate
paths, unexpected types, malformed JSON, oversized files and hash mismatches,
then reruns data sanity checks before receiving permission to push.

The stable-v1 dependency baseline is `undici >=6.28.0`; this removes
CVE-2026-15157, CVE-2026-16728 and CVE-2026-16729 from the prior 6.27.0 lock.

## Broken certificate chains

Several public municipal servers omit an intermediate CA. The compatibility
path in `pipeline/src/core/fetch.js` deliberately disables chain verification
only after enforcing all of these compensating controls:

- HTTPS on port 443 only;
- no username or password in the target URL;
- an explicit audited hostname allowlist;
- the same validation on every redirect;
- public read-only requests carrying no repository secret.

This remains a data-integrity risk, not a confidentiality claim: a network
attacker could alter that public source response. The parser/sanity gates,
source provenance and last-good preservation limit the impact. Replace this
compatibility path with host-specific intermediate certificates where a source
offers a stable valid chain.

## Restricted Polish egress

Only adapters marked `needsResidentialEgress` may join the private tailnet or
receive `FETCH_PROXY_URL`. The Pi proxy is bound solely to its Tailscale address,
requires the caller identity to carry `tag:przetargi-ci` (checked locally through
`tailscale whois`), denies private and reserved destinations after DNS resolution,
and allows only the audited Racibórz/Pszczyna sources. The appliance itself has
a same-host exception solely for acceptance checks. The tailnet ACL must also
restrict port 3129 to `tag:przetargi-ci`; the OAuth client may mint only that tag.

Repository code never runs on the Pi, and the Pi stores no repository token.
Run `ops/egress/verify.sh` after every proxy or ACL change. It proves approved
sources work and an unrelated domain, loopback and plain HTTP are denied.
