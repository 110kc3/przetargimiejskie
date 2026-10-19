# Spike — Chrzanów (Małopolskie · powiat chrzanowski)

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/chrzanow/` → data in `data/chrzanow/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** land-powiat seat
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*


## Partial source/asset audit — 2026-10-19 (Codex)

The city land board currently links one stub, which points to
[official article 2950984](https://bip.malopolska.pl/umchrzanow,a,2950984,przetarg-na-sprzedaz-nieruchomosci-polozoenj-przy-ul-dzialkowej-w-chrzanowie.html).
The article is a real SPA: its static shell has no notice body; headless Chromium
renders the signed sale announcement. The retained source body is
`pipeline/tests/fixtures/remediation/chrzanow-2950984.html`.

The notice sells **one jointly priced lot** containing parcels **6297, 1535,
1559/1**, district Chrzanów, near ul. Działkowa. Individual areas are 4.0914,
0.0897 and 0.1628 ha; the displayed total is **4.3439 ha / 43,439 m²**. The single
starting price is **8,005,000 zł**; auction **17 December 2026, 11:00**. A prior
unsuccessful auction date in the prose does not establish a stated round for
this new event.

The older flattened-row parser missed the current five-column table. The new
reader validates the combined area, price and date and emits one parcel-group
record. It does not repeat the price across three independent lots. Rolling
land output merges with retained history. Stub discovery now ignores an unrelated
`m,441366` menu link that previously caused an unnecessary render. Land and oral
sale procedures are observed; full source/asset and result completeness remain
unverified, and the full-review deadline is not renewed.
