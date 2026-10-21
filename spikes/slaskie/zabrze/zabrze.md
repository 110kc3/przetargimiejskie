# Spike — Zabrze (Śląskie · Zabrze (miasto na prawach powiatu))

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/zabrze/` → data in `data/zabrze/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** miasto na prawach powiatu (city = its own powiat)
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*

## Partial source/asset audit — 2026-10-21

The official municipal publisher (Urząd Miejski w Zabrzu) publishes real-estate auction notices at `https://bip.miastozabrze.pl` (Municipal BIP portal (bip.miastozabrze.pl)).

Observed asset families in committed data:
- **Residential (lokale mieszkalne):** communal apartment sales and multi-round oral auctions.
- **Commercial (lokale użytkowe):** utility and commercial spaces.
- **Land (działki):** municipal undeveloped and developed plots (28 monitored plots).

Announcements and documentation include Word attachments (.doc/.docx) ingested via `docText`. Separate achieved-price result notices are either not published on this board or expire quickly; pipeline focuses on announcement lifecycle.

Committed dataset maintains **322 unique properties** and **28 land plots** with 472 active listings. Both property and land streams are verified in production (property: healthy, land: healthy).
