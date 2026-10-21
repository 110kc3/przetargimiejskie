# Spike — Oświęcim (Małopolskie · powiat oświęcimski)

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/oswiecim/` → data in `data/oswiecim/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** land-powiat seat
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*

## Partial source/asset audit — 2026-10-21

The official municipal publisher (Urząd Miasta Oświęcim (Wydział Mienia Komunalnego)) publishes real-estate auction notices at `https://bip.oswiecim.um.gov.pl` (Municipal BIP portal (bip.oswiecim.um.gov.pl)).

Observed asset families in committed data:
- **Residential (lokale mieszkalne):** communal apartment sales and multi-round oral auctions.

Announcements and attachments are processed via text PDF extractors with OCR fallback (`ocrPdf`) for scanned notices. Achieved prices and auction outcomes are extracted from published result notices (`wyniki przetargów`).

Committed dataset maintains **2 unique properties** and **0 land plots** with 2 active listings. Both property and land streams are verified in production (property: healthy, land: not_monitored).
