# Spike — Częstochowa (Śląskie · Częstochowa (miasto na prawach powiatu))

> **Status:** ❌ DROPPED — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: NO-BUILD (dropped)

Flats are sold *bezprzetargowo* (to sitting tenants), so there is no open municipal flat-auction stream; remaining auctions are land/commercial only. Tracked as DROPPED in TODO.md / SPIKE-WAVE2.md.

- **Type:** miasto na prawach powiatu.
- Revisit only if the city opens a residential flat-auction stream on its BIP.

## Partial source/asset audit — 2026-10-31

The official municipal publisher (Burmistrz Miasta Częstochowa) publishes auction announcements on `https://bip.czestochowa.pl/przetargi-nieruchomosci/376` (logonet).

Observed asset families in committed adapter:
- **residential:** verified active/historical notices in test suite.
- **land:** verified active/historical notices in test suite.
- **commercial:** verified notices where applicable.

Adapter built using shared logonet platform engine and registered as an enabled pipeline feed.
