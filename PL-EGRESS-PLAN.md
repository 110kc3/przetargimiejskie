# Polish egress security plan

**Status: containment verified; restricted proxy and private transport not deployed.**
Re-audited on 31 August 2026: GitHub reports no repository-connected machine and the
former Pi job service, credentials and work directory remain removed. All workflow
jobs are routed to GitHub-hosted machines. A secret-free hosted probe in
[run 33379464740](https://github.com/110kc3/przetargimiejskie/actions/runs/33379464740)
completed full direct refreshes for Brzeg, Świętochłowice and Wałbrzych; PKP completed
three sequential direct refreshes and each run passed five-active/five-result link
checks. Those sources and AMW now run under strict hosted refresh/health gates.

Racibórz alone still connect-dropped and remains marked `needsResidentialEgress`,
omitted from the matrix, and published from last-good data under the stale-only
exemption that expires 21 days after 25 August (15 September). The production workflow
now has dormant `FETCH_PROXY_URL` integration: the flagged adapter is included only
when the secret exists, and the raw credential is scoped only to its refresh step. No
repository secret is configured. Tailscale/private transport is deliberately deferred.
Missing, empty or malformed Racibórz data still fails immediately.

## Decision

The Raspberry Pi is a network appliance only. It must not execute repository
workflows, store a repository token, expose a public proxy port, or make the operator's
home directory available to automation.

```text
GitHub-hosted job
       |
       | short-lived private-network identity
       v
Pi: restricted HTTPS CONNECT proxy
       |
       v
explicitly approved Polish source domains
```

The affected adapters already make their requests through the proxy-aware helpers in
`pipeline/src/core/fetch.js`. Racibórz uses `getText`, so `FETCH_PROXY_URL` is sufficient
for its current path. Brzeg, Świętochłowice, Wałbrzych, PKP and AMW remain proxy-aware
but do not currently require or receive special egress.

## Phase 0 — containment and credential hygiene

- [x] Remove the machine in GitHub's repository settings.
- [x] Uninstall its boot-enabled job service.
- [x] Delete its local registration material and work directory.
- [x] Route the refresh matrix and provider job back to `ubuntu-latest`.
- [x] Review the 24–25 August workflow history and retained system logs.
- [x] Rotate the GitHub SSH identity and remove the former reused key from GitHub and
      this host's inbound `authorized_keys`.
- [x] Revoke the existing GitHub CLI OAuth credential after the final repository and
      issue operations in this remediation are complete; remove its local CLI entry and
      verify that authentication is rejected.
- [ ] When the two currently offline private hosts are reachable, install the prepared
      host-specific replacement keys, remove the former reused key there, verify both
      new logins, then securely delete the old private key from this host.
- [x] Review the Pi for unexpected persistence. If there is any evidence of compromise,
      rebuild the operating system rather than trusting an in-place cleanup.

### Phase 0 audit record — 31 August 2026

- GitHub and local inspection both show zero registered repository runners, listener or
  worker processes, runner services, registration artifacts, work directories or cron
  persistence.
- Actions runs `32725189329`, `32728761745` and `32809274141` account for the entire
  former self-hosted period: ten executed self-hosted jobs, all from trusted `main`
  push/schedule workflow code. No pull-request or contributor-controlled ref ran there.
- Retained service logs match the server-side history: registration and service start on
  24 August, server-side runner deletion on 25 August, followed by local stop/uninstall
  and credential/work-directory removal. No unexplained execution window was found.
- The host has no unexpected login account, boot/user service, cron entry, recent failed
  SSH-authentication pattern or new home-directory SUID artifact. Reviewed workflow code
  did not reference the other credential locations inventoried under the login account.
- A dedicated GitHub SSH key is active and tested; the former reused key is deleted from
  GitHub and local inbound authorization. Separate replacement keys are prepared for the
  two offline private hosts, but their remote revocation is deliberately deferred to
  avoid lockout.
- The exact GitHub CLI OAuth credential was revoked through GitHub's credential-revocation
  endpoint after the final issue operations, removed locally, and verified unusable.

The audit found no evidence of unexpected code execution, persistence or credential
access. That is a bounded evidence statement, not proof that exposure was impossible;
the remaining key retirement above stays mandatory.

## Phase 1 — private transport (deferred)

Use a private overlay network; Tailscale workload identity federation is the preferred
implementation because each GitHub-hosted job receives a short-lived identity without a
reusable authentication secret.

- Tag CI nodes `tag:przetargi-ci` and the Pi proxy `tag:przetargi-egress`.
- Permit the CI tag to reach only the proxy's TCP port.
- Do not advertise subnet routes, an exit node or SSH access from the Pi.
- Bind the proxy only to its private overlay address, never `0.0.0.0` or the LAN.
- Pin the connectivity action to a reviewed full commit SHA and pin the downloaded
  client version and checksum.

## Phase 2 — restricted proxy

Run Squid or an equivalent CONNECT proxy under a dedicated system account with no
interactive shell, sudo, Docker membership, source checkout or user credentials.

- Allow `CONNECT` to TCP 443 only.
- Deny loopback, link-local, multicast and private-address destinations.
- Deny every destination by default, then initially allow only Racibórz's audited
  hostname and verified redirect targets. Expand the allowlist only if a new hosted
  gate demonstrates that another source again requires restricted egress.
- Protect against DNS rebinding by checking resolved destinations as well as requested
  hostnames.
- Disable caching; cap request size, bandwidth, concurrent connections and idle time.
- Run with a read-only system area, private temporary directory, no Linux capabilities
  and a writeable directory limited to proxy state/logs.
- Keep logs free of credentials and fetched response bodies.

## Phase 3 — workflow integration

- [x] Keep `runs-on: ubuntu-latest` for every job.
- [ ] Join the private network only for a city whose config has
  `needsResidentialEgress: true` (transport is deferred).
- [x] Include a flagged city only when `FETCH_PROXY_URL` is configured, and set the
  raw credential only for that city's refresh step.
- [x] Never enable the private-network path for `pull_request`, `pull_request_target`,
  issue-comment or other contributor-controlled events.
- Keep the default `GITHUB_TOKEN` read-only and set explicit job permissions.
- Use `actions/checkout` with `persist-credentials: false` in crawl jobs.
- Replace `npm ci || npm install` with strict, lockfile-enforcing `npm ci`.
- Require all external actions to use full commit SHAs and restrict the repository's
  Actions allowlist to explicitly reviewed publishers.

## Phase 4 — separate crawling from publishing

Crawl jobs should have `contents: read` only and upload a data artifact. A separate
GitHub-hosted publisher receives `contents: write` and must treat that artifact as
untrusted input.

Before committing, the publisher must:

- allow only the expected `data/<city>/`, `data/providers/` and content-addressed cache
  paths;
- reject absolute paths, `..`, symlinks, unexpected extensions, duplicate paths and
  excessive file counts or sizes;
- verify a manifest of SHA-256 hashes;
- parse JSON and run the existing city/provider sanity checks;
- stage explicit allowlisted paths rather than `git add -A`.

After this split, crawler code, downloaded dependencies, source HTML and network access
never coexist with a repository-write token.

## Phase 5 — repository policy

- Enable the repository setting that requires actions to be pinned to full commit SHAs.
- Allow GitHub-owned actions plus an explicit list of reviewed third-party actions only.
- Require approval before workflows from any external contributor run.
- Protect `main` and require the existing checks for source/workflow changes.
- Restrict any publishing bypass identity to generated-data updates; it must not be able
  to alter workflows or executable source.

## Acceptance gates

Production egress stays disabled until all of these are demonstrated:

1. GitHub's repository settings show no connected machine.
2. The Pi contains no workflow listener process, service, registration material or
   automation checkout.
3. An approved source succeeds through the proxy and observes the intended Polish IP.
4. `example.com`, localhost, the Pi's LAN, SSH, link-local addresses and an unapproved
   Polish domain all fail through the proxy.
5. An unaffected city never connects to the private network.
6. A crawl job cannot push, modify issues, read repository secrets or leave checkout
   credentials behind.
7. The publisher rejects path traversal, a symlink, an oversized artifact, malformed
   JSON and a failed sanity check.
8. The short-lived CI network identity disappears after the job.
9. With the Pi offline, only egress-dependent fetches fail quickly; the rest of the
   matrix completes normally.

## Recovery and kill switch

The kill switch is to revoke the CI network identity/grant and stop the proxy service.
That immediately removes all CI-to-Pi reachability without changing crawler code. The
pipeline then preserves last-good records for blocked sources until service is restored.

If a proxy cannot cover a future adapter (for example, a browser-rendered or special TLS
path), do not broaden the Pi's permissions silently. Design and review a separate
single-purpose isolation boundary before enabling that source.

## Reference guidance

- [GitHub Actions secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub repository Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [Tailscale's GitHub Actions workload-identity integration](https://tailscale.com/docs/integrations/github/github-action)
