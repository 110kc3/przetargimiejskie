#!/usr/bin/env bash
# One-off cleanup — run on your machine (the dev sandbox cannot git mv/rm).
# Review with `git status` / `git diff` before committing; everything is reversible.
set -e
cd "$(dirname "$0")"

# 1) Remove individual NO-BUILD spike docs (now consolidated in spikes/NO-BUILD.md)
git rm -q "spikes/dolnoslaskie/powiat-olesnicki/olesnica.md" 2>/dev/null || true
git rm -q "spikes/kujawsko-pomorskie/powiat-brodnicki/brodnica.md" 2>/dev/null || true
git rm -q "spikes/kujawsko-pomorskie/powiat-inowroclawski/inowroclaw.md" 2>/dev/null || true
git rm -q "spikes/kujawsko-pomorskie/powiat-swiecki/swiecie.md" 2>/dev/null || true
git rm -q "spikes/lodzkie/powiat-kutnowski/kutno.md" 2>/dev/null || true
git rm -q "spikes/lodzkie/piotrkow-trybunalski/piotrkow-trybunalski.md" 2>/dev/null || true
git rm -q "spikes/lodzkie/powiat-radomszczanski/radomsko.md" 2>/dev/null || true
git rm -q "spikes/lodzkie/powiat-sieradzki/sieradz.md" 2>/dev/null || true
git rm -q "spikes/lodzkie/skierniewice/skierniewice.md" 2>/dev/null || true
git rm -q "spikes/lubelskie/powiat-bilgorajski/bilgoraj.md" 2>/dev/null || true
git rm -q "spikes/lubelskie/powiat-krasnicki/krasnik.md" 2>/dev/null || true
git rm -q "spikes/lubelskie/lublin/lublin.md" 2>/dev/null || true
git rm -q "spikes/lubelskie/powiat-pulawski/pulawy.md" 2>/dev/null || true
git rm -q "spikes/lubelskie/powiat-swidnicki/swidnik.md" 2>/dev/null || true
git rm -q "spikes/lubelskie/zamosc/zamosc.md" 2>/dev/null || true
git rm -q "spikes/lubuskie/zielona-gora/zielona-gora.md" 2>/dev/null || true
git rm -q "spikes/malopolskie/powiat-nowotarski/nowy-targ.md" 2>/dev/null || true
git rm -q "spikes/malopolskie/tarnow/tarnow.md" 2>/dev/null || true
git rm -q "spikes/malopolskie/powiat-wadowicki/wadowice.md" 2>/dev/null || true
git rm -q "spikes/mazowieckie/powiat-ciechanowski/ciechanow.md" 2>/dev/null || true
git rm -q "spikes/mazowieckie/powiat-minski/minsk-mazowiecki.md" 2>/dev/null || true
git rm -q "spikes/mazowieckie/powiat-piaseczynski/piaseczno.md" 2>/dev/null || true
git rm -q "spikes/mazowieckie/powiat-pruszkowski/pruszkow.md" 2>/dev/null || true
git rm -q "spikes/mazowieckie/radom/radom.md" 2>/dev/null || true
git rm -q "spikes/mazowieckie/powiat-wolominski/wolomin.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/powiat-debicki/debica.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/powiat-jaroslawski/jaroslaw.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/krosno/krosno.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/powiat-mielecki/mielec.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/powiat-sanocki/sanok.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/powiat-stalowowolski/stalowa-wola.md" 2>/dev/null || true
git rm -q "spikes/podkarpackie/tarnobrzeg/tarnobrzeg.md" 2>/dev/null || true
git rm -q "spikes/podlaskie/lomza/lomza.md" 2>/dev/null || true
git rm -q "spikes/podlaskie/suwalki/suwalki.md" 2>/dev/null || true
git rm -q "spikes/pomorskie/gdynia/gdynia.md" 2>/dev/null || true
git rm -q "spikes/slaskie/jastrzebie-zdroj/jastrzebie-zdroj.md" 2>/dev/null || true
git rm -q "spikes/slaskie/powiat-zawiercianski/zawiercie.md" 2>/dev/null || true
git rm -q "spikes/swietokrzyskie/powiat-ostrowiecki/ostrowiec-swietokrzyski.md" 2>/dev/null || true
git rm -q "spikes/warminsko-mazurskie/powiat-ostrodzki/ostroda.md" 2>/dev/null || true
git rm -q "spikes/wielkopolskie/konin/konin.md" 2>/dev/null || true
git rm -q "spikes/wielkopolskie/powiat-krotoszynski/krotoszyn.md" 2>/dev/null || true
git rm -q "spikes/wielkopolskie/leszno/leszno.md" 2>/dev/null || true
git rm -q "spikes/wielkopolskie/powiat-ostrowski/ostrow-wielkopolski.md" 2>/dev/null || true
git rm -q "spikes/zachodniopomorskie/koszalin/koszalin.md" 2>/dev/null || true

# 2) Move standalone legacy/marketing docs out of the repo root
mkdir -p docs
for f in GTM.md GTM-SPRINT.md REPORTS.md BUGCHECK-2026-06-25.md WEB_STORE_LISTING.md; do
  [ -f "$f" ] && git mv "$f" docs/ || true
done

# NOTE: the legacy SPIKE-WAVE1/2 / SPIKE-NEIGHBORS / SPIKE-COVERAGE / SPIKE-HOUSES-LAND /
# SPIKE-TARNOWSKIE-GORY / SPIKE.md and EXPANSION.md / PLAN.md are cross-linked from the
# per-city spike stubs + PROJECT-OVERVIEW; move them only with a link-fix pass (ask Claude).

echo "Cleanup staged. Review: git status; git diff --staged. Then: git commit -m \"chore: consolidate NO-BUILD docs + tidy root\""
