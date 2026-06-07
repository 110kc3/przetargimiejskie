#!/usr/bin/env bash
# Assembles the published website (przetargimiejskie.pl) into a single output
# directory for a static host (Cloudflare Pages, GitHub Pages, Netlify, …).
#
# The published site = site/ (landing + /archiwum + /privacy) + the data/ JSON
# the web archive fetches at /data/... + a downloadable copy of the extension at
# /extension.zip. This mirrors the assemble step that used to live inline in
# .github/workflows/pages.yml, so it can be reused by Cloudflare Pages' build
# command, by a GitHub Action, or run locally to preview.
#
# Usage:   bash build-site.sh [OUTPUT_DIR]      (default OUTPUT_DIR = _site)
# Cloudflare Pages → Build command: bash build-site.sh   Output directory: _site
set -euo pipefail

OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"

cp -r site/. "$OUT"/            # landing + /archiwum + /privacy (CNAME copied too; harmless on CF)
cp -r data "$OUT"/data         # JSON the web archive fetches at /data/<city>/...

# Note: we no longer publish /extension.zip — the site links to the Chrome Web
# Store listing instead. (The extension/ source still lives in the repo.)

echo "Assembled '$OUT':"
ls -1 "$OUT"
