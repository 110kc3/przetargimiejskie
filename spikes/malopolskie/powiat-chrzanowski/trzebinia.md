# Spike — Trzebinia (Małopolskie · powiat chrzanowski)

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/trzebinia/` → data in `data/trzebinia/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** land-powiat seat
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*

## Partial source/asset audit — 2026-10-21

The official municipal publisher (Urząd Miasta w Trzebini) publishes real-estate auction notices at `https://trzebinia.pl` (Municipal BIP portal (trzebinia.pl)).

Observed asset families in committed data:
- **Residential (lokale mieszkalne):** communal apartment sales and multi-round oral auctions.
- **Buildings (budynki / kamienice):** residential and mixed-use whole properties.

Announcements are extracted from server-rendered HTML notices and born-digital text PDF attachments. Achieved prices and auction outcomes are extracted from published result notices (`wyniki przetargów`).

Committed dataset maintains **6 unique properties** and **0 land plots** with 7 active listings. Both property and land streams are verified in production (property: healthy, land: not_monitored).
