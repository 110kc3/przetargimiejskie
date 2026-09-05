#!/usr/bin/env bash
set -euo pipefail

proxy_url="${1:-http://100.114.161.16:3129}"

fetch_tunnel_status() {
  local target="$1"
  local status=''
  for _ in 1 2 3 4 5; do
    if status=$(curl --silent --show-error --location \
        --proxy "$proxy_url" --connect-timeout 10 --max-time 30 \
        --output /dev/null --write-out '%{http_connect}:%{http_code}' "$target" 2>/dev/null); then
      printf '%s' "$status"
      return 0
    fi
    sleep 1
  done
  return 1
}

allowed_status=$(fetch_tunnel_status https://www.bipraciborz.pl/)
if [[ "$allowed_status" != 200:* ]]; then
  echo "egress verification failed: Raciborz CONNECT/HTTP status was $allowed_status" >&2
  exit 1
fi

pszczyna_status=$(fetch_tunnel_status https://bip.pszczyna.pl/)
if [[ "$pszczyna_status" != 200:* ]]; then
  echo "egress verification failed: Pszczyna CONNECT/HTTP status was $pszczyna_status" >&2
  exit 1
fi

must_deny_connect() {
  local target="$1"
  local connect_status
  connect_status=$(curl --silent --proxy "$proxy_url" \
      --connect-timeout 5 --max-time 10 --output /dev/null \
      --write-out '%{http_connect}' "$target" 2>/dev/null || true)
  if [[ "$connect_status" == 200 ]]; then
    echo "egress verification failed: disallowed CONNECT was admitted: $target" >&2
    exit 1
  fi
}

must_deny_connect https://example.com/
must_deny_connect https://bip.warszawa.pl/
must_deny_connect https://127.0.0.1/
must_deny_connect https://192.168.1.1/
must_deny_connect https://169.254.169.254/
must_deny_connect https://www.bipraciborz.pl:22/

http_status=$(curl --silent --proxy "$proxy_url" --connect-timeout 5 --max-time 10 \
  --output /dev/null --write-out '%{http_code}' http://www.bipraciborz.pl/ 2>/dev/null || true)
if [[ "$http_status" != 403 ]]; then
  echo "egress verification failed: plain HTTP denial returned $http_status" >&2
  exit 1
fi

echo "Restricted egress verification passed."
