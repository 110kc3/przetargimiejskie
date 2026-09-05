#!/usr/bin/env bash
set -u

# Squid external-ACL helper. One client IP arrives per line; only ephemeral
# GitHub nodes carrying the workload tag are admitted. The decision comes from
# the local tailscaled identity database, not from caller-controlled headers.
while IFS= read -r client_ip; do
  client_ip="${client_ip%% *}"
  if [ -n "$client_ip" ] && timeout 3 /usr/bin/tailscale whois --json "$client_ip" 2>/dev/null \
      | /usr/bin/jq -e '(.Node.Tags // []) | index("tag:przetargi-ci") != null' >/dev/null 2>&1; then
    echo OK
  else
    echo ERR
  fi
done
