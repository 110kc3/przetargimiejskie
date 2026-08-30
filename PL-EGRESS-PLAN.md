# Polish egress security plan

**Status: planned, not deployed.** As of 25 August 2026, GitHub reports no
repository-connected machine and the former Pi job service, credentials and work
directory have been removed. All workflow jobs are routed to GitHub-hosted machines.
The four city adapters marked `needsResidentialEgress` are omitted from the hosted
matrix, and PKP is omitted from the hosted provider refresh; AMW continues to refresh
normally. The deferred sources preserve their last-good data until the proxy described
here is available. The city and provider health checks keep them visible as warnings
under stale-only exemptions that expire 21 days after 25 August; missing, empty or
malformed data still fails immediately, and stale data becomes a failure again when
that deadline expires.

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
`pipeline/src/core/fetch.js`: Raciborz, Swietochlowice, Walbrzych, PKP and AMW use
`getText`/`getBytes`; Brzeg also uses the exported `proxyFetch` for its cookie retry.
`FETCH_PROXY_URL` is therefore sufficient for these paths.

## Phase 0 — containment and credential hygiene

- [x] Remove the machine in GitHub's repository settings.
- [x] Uninstall its boot-enabled job service.
- [x] Delete its local registration material and work directory.
- [x] Route the refresh matrix and provider job back to `ubuntu-latest`.
- [ ] Review the 24–25 August workflow history and retained system logs.
- [ ] Rotate credentials that workflow code could have read from the `borg` account,
      especially GitHub CLI/PAT credentials and reusable SSH keys.
- [ ] Review the Pi for unexpected persistence. If there is any evidence of compromise,
      rebuild the operating system rather than trusting an in-place cleanup.

## Phase 1 — private transport

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
- Deny every destination by default, then allow only the audited hostnames needed by
  Raciborz, Swietochlowice, Brzeg, Walbrzych and PKP, including verified redirect
  targets.
- Protect against DNS rebinding by checking resolved destinations as well as requested
  hostnames.
- Disable caching; cap request size, bandwidth, concurrent connections and idle time.
- Run with a read-only system area, private temporary directory, no Linux capabilities
  and a writeable directory limited to proxy state/logs.
- Keep logs free of credentials and fetched response bodies.

## Phase 3 — workflow integration

- Keep `runs-on: ubuntu-latest` for every job.
- Join the private network only for a city whose config has
  `needsResidentialEgress: true` and for the PKP provider refresh.
- Set `FETCH_PROXY_URL` only for those steps.
- Never enable the private-network step for `pull_request`, `pull_request_target`,
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
