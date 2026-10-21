# Spike — Olkusz (Małopolskie · powiat olkuski)

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/olkusz/` → data in `data/olkusz/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** land-powiat seat
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*

## Partial source/asset audit — 2026-10-21

The official municipal publisher (Urząd Miasta i Gminy w Olkuszu) publishes real-estate auction notices at `https://umig.olkusz.pl` (Municipal BIP portal (umig.olkusz.pl)).

Observed asset families in committed data:
- **Residential (lokale mieszkalne):** communal apartment sales and multi-round oral auctions.
- **Land (działki):** municipal undeveloped and developed plots (6 monitored plots).
- **Buildings (budynki / kamienice):** residential and mixed-use whole properties.

Announcements are extracted from server-rendered HTML notices and born-digital text PDF attachments. Separate achieved-price result notices are either not published on this board or expire quickly; pipeline focuses on announcement lifecycle.

Committed dataset maintains **2 unique properties** and **6 land plots** with 3 active listings. Both property and land streams are verified in production (property: healthy, land: healthy).
