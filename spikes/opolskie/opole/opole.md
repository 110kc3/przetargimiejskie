# Spike — Opole (Opolskie · Opole (miasto na prawach powiatu))

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/opole/` → data in `data/opole/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** miasto na prawach powiatu (city = its own powiat)
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*

## Partial source/asset audit — 2026-10-21

The official municipal publisher (Urząd Miasta Opola (Wydział Gospodarki Nieruchomościami)) publishes real-estate auction notices at `https://bip.um.opole.pl` (SISCO BIP platform).

Observed asset families in committed data:
- **Residential (lokale mieszkalne):** communal apartment sales and multi-round oral auctions.
- **Land (działki):** municipal undeveloped and developed plots (25 monitored plots).
- **Buildings (budynki / kamienice):** residential and mixed-use whole properties.

Announcements are extracted from server-rendered HTML notices and born-digital text PDF attachments. Separate achieved-price result notices are either not published on this board or expire quickly; pipeline focuses on announcement lifecycle.

Committed dataset maintains **46 unique properties** and **25 land plots** with 101 active listings. Both property and land streams are verified in production (property: healthy, land: healthy).
