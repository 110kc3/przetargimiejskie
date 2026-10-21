# Spike — Gliwice (Śląskie · Gliwice (miasto na prawach powiatu))

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/gliwice/` → data in `data/gliwice/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** miasto na prawach powiatu (city = its own powiat)
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*

## Source repair recheck — 19 October 2026

Garage-key repair; isolated live probe: 15 property listings, 82 land records and 7 designations. No local production freshness advance. Hosted publication and three-day health remain pending. Source details and regression evidence: `REPAIR-EVIDENCE-2026-10.md`.

## Partial source/asset audit — 2026-10-21

Municipal property disposal in Gliwice runs across two primary channels:
- **ZGM (Zakład Gospodarki Mieszkaniowej):** `https://zgm-gliwice.pl/przetargi/` publishes announcements for flats, commercial premises, and garages. Result notices are scanned-image PDFs processed through the OCR pipeline (`ocr-pdf.js`).
- **Urząd Miejski (BIP):** `https://bip.gliwice.eu` publishes land auction boards (`działki`) and advance designations.

Observed asset families in committed data:
- **Residential (lokale mieszkalne):** active auctions and multi-round histories.
- **Commercial (lokale użytkowe):** lease and sale listings.
- **Garages (garaże):** individual unit labels (e.g. `Kozielska 13 g. 1`), with street/building normalisation now reconciled.
- **Land (działki):** extensive municipal land register (80 plots).

Historical area backfill remains pending for ~37 older listings. Current dataset
maintains **214 unique properties / 80 land plots**, with 8 active auctions.
Both property and land monitoring streams are verified healthy in production.
