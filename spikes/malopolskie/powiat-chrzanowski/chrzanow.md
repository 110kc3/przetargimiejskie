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


## API follow-up — 2026-10-20 (Codex)

Hosted `f4a80d80c` returned zero raw land rows after a nominally successful
Chromium render, retaining four plots. The official SPA's network traffic
identifies the anonymous [article API](https://bip.malopolska.pl/api/articles/2950984),
which also returns the complete sale table via a plain HTTPS request. The exact
response is retained in `pipeline/tests/fixtures/remediation/chrzanow-2950984.json`.

The crawler now fetches article JSON, validates both article IDs and the
`umchrzanow` context link, and keeps the public article URL as provenance.
Missing/malformed bodies, wrong municipality/ID, fetch failures and a board with
no discovered articles cannot masquerade as a successful empty crawl. Chromium
is no longer needed for this adapter. Full isolated refresh recovers the same
December lot and retains all four plot keys and dates; strict integrity and
coverage health pass. Official TERC identity from the canonical ledger is
`120303_4` (city area), correcting the old adapter's `120301_4`.

This only repairs the observed land-body path. Building/flat parsing, results,
older boards and full source/asset completeness remain unverified. Hosted
publication of this follow-up is pending; no local refresh output is published.
