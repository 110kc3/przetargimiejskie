#!/usr/bin/env bash
# Assembles the published website (przetargimiejskie.pl) into a single output
# directory for a static host. The LIVE host is OVH — .github/workflows/ovh-deploy.yml
# runs this (`bash build-site.sh _site`) then mirrors _site/ to OVH over SFTP. The
# output is host-agnostic, so the GitHub Pages fallback (pages.yml) or a local
# preview can consume the same _site/ too.
#
# The published site = site/ (landing + /archiwum + /raporty + /privacy) + the
# data/ JSON the web pages fetch at /data/... . (The extension is NOT bundled here
# — the site links to the Chrome Web Store listing instead.)
#
# Usage:   bash build-site.sh [OUTPUT_DIR]      (default OUTPUT_DIR = _site)
set -euo pipefail

OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"

cp -r site/. "$OUT"/            # landing + /archiwum + /raporty + /privacy (CNAME copied too; harmless on CF)
# /archiwum-all = a build-time copy of /archiwum. The archive JS detects the
# "archiwum-all" path and shows EVERY voivodeship there (private test view),
# while the public /archiwum stays Śląskie-only. One codebase, two endpoints.
cp -r "$OUT/archiwum" "$OUT/archiwum-all"
cp -r data "$OUT"/data         # JSON the web pages fetch at /data/<city>/...

# SEO pages (P0-C): /<miasto>/ + per-property + monthly recaps + /miasta/ +
# sitemap.xml, generated statically from data/*.json (Śląskie cities only —
# mirrors the landing's public gate; scope lives in the script). Plain Node,
# no deps — the ubuntu-latest runner ships Node, no setup-node needed.
node scripts/build-seo-pages.mjs "$OUT"

# Note: we no longer publish /extension.zip — the site links to the Chrome Web
# Store listing instead. (The extension/ source still lives in the repo.)

echo "Assembled '$OUT':"
ls -1 "$OUT"
