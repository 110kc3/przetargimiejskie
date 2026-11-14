#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"

cp extension/catalog.js extension/catalog.css "$OUT"/
cp -r site/. "$OUT"/
cp -r "$OUT/archiwum" "$OUT/archiwum-all"
cp -r data "$OUT"/data

node scripts/build-seo-pages.mjs "$OUT"

node scripts/audit-seo-build.mjs "$OUT"

echo "Assembled '$OUT':"
ls -1 "$OUT"
