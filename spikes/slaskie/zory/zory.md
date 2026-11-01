# Spike — Żory (Śląskie · Żory (miasto na prawach powiatu))

> **Status:** ⏸️ DEFERRED — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: DEFERRED

Has municipal sale auctions but flat-auction volume was too thin to prioritise; revisit on volume. Tracked as DEFERRED in TODO.md.

- **Type:** miasto na prawach powiatu.
- Re-spike when checking flat-auction volume; promote to BUILD if a live ustny przetarg na sprzedaż lokali mieszkalnych stream is confirmed.

## Partial source/asset audit — 2026-10-31

The official municipal publisher (Burmistrz Miasta Żory) publishes auction announcements on `https://bip.zory.pl/przetargi/361/status/0/` (systemdobip).

Observed asset families in committed adapter:
- **residential:** verified active/historical notices in test suite.
- **land:** verified active/historical notices in test suite.
- **commercial:** verified notices where applicable.

Adapter built using shared systemdobip platform engine and registered as an enabled pipeline feed.
