# Spike — Kraków (Małopolskie · Kraków (miasto na prawach powiatu))

> **Status:** ✅ BUILT — auto-generated from project state 2026-06-27.
> Methodology: [EXPANSION.md](../../../EXPANSION.md) · template [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md).

## Verdict: BUILD — shipped

Adapter is live: `pipeline/src/cities/krakow/` → data in `data/krakow/` (registered in `pipeline/src/cities/index.js`, listed in `data/index.json`).

- **Type:** miasto na prawach powiatu (city = its own powiat)
- **Source profile / verdict:** see the originating spike — Gliwice in [SPIKE.md](../../../SPIKE.md)/[PLAN.md](../../../PLAN.md); the Silesian cohort in [SPIKE-WAVE1.md](../../../SPIKE-WAVE1.md)/[SPIKE-WAVE2.md](../../../SPIKE-WAVE2.md); Tarnowskie Góry in [SPIKE-TARNOWSKIE-GORY.md](../../../SPIKE-TARNOWSKIE-GORY.md); the Małopolskie/Opolskie cohort in [SPIKE-NEIGHBORS.md](../../../SPIKE-NEIGHBORS.md).
- **Coverage audit:** [SPIKE-COVERAGE.md](../../../SPIKE-COVERAGE.md).

*No re-spike needed; this file exists so every covered city has a node in the spikes/ tree.*


## Partial source/asset audit — 2026-10-20 (Codex)

The official [sale board](https://www.bip.krakow.pl/?dok_id=30626) and
[archive](https://www.bip.krakow.pl/?dok_id=102895) use one-based `strona`
pagination. Direct verified reads return HTTP 200 for page 1 and HTTP 400 for
page 0, matching the failed hosted worker logs. The crawler now starts at 1,
checks the board's own form action and follows its actual pager within the
existing six-page limit. A failed, repeated, unrecognised or capped page stays
incomplete; full archive coverage is not claimed.

The [current notice 263185](https://www.bip.krakow.pl/?news_id=263185) offers two
land shares on **5 November 2026**: **1/2 of parcels 17/1 + 17/2, K-44,
546 m² / 436,000 zł**, and **2/6 of parcel 169/16, P-30,
216 m² / 42,400 zł** (rounds 1 and 4). The parser now accepts the full
“cena wywoławcza udziału w nieruchomości” label, retains both grouped parcels
and validates their published total area. Notes explicitly preserve the fact
that each price buys a share. Missing achieved prices alone cannot establish
negative outcomes; unsupported result items remain unparsed for later review.
Exact current-board/archive and notice-body fixtures cover the repaired paths.

Other asset classes and exhaustive results remain outside this partial audit.
The current result board also contains a lease notice, 264214; that is not an
empty-sale proof. Runtime/review deadlines remain unchanged; hosted recovery
of this change is pending.


Expanded exact-source checks also verify flat/commercial/garage/building examples:
[236926](https://www.bip.krakow.pl/?news_id=236926) has four separate lots:
Morawiańskiego **25** (house, 145,000→221,850 zł), parcel 215
(120,000→385,000 zł), Królewska **69/G12** (114,000 zł, unsold), and the
Łagiewnicka share (53,000 zł, unsold), all 4 November 2025. The previous
unsplit HTML assigned the house's price to the garage. Source replay through
building/history merging now corrects that event while retaining the actual
April 2026 garage sale.

[261755](https://www.bip.krakow.pl/?news_id=261755) separately sells commercial
Grottgera **24/6** (120,000→190,000 zł) and residential Sportowe **1/7**
(132,000→174,000 zł), with a negative land-share result. Formatting-split words
in [165659](https://www.bip.krakow.pl/?news_id=165659) no longer hide Miodowa
**22/12**; its Sołtyka house is building **9**, not area 139 interpreted as an
address. [221941](https://www.bip.krakow.pl/?news_id=221941) explicitly identifies
Felicjanek **15/5** despite also naming the building's other street address.
[172574](https://www.bip.krakow.pl/?news_id=172574) mixes HTML lists and numbered
paragraphs; the parser retains five separate lots, including the joint Zarosie
parcels **494/6 + 498/4, 591 m²**. These are observed asset examples, not complete
coverage of any asset class.

[227539](https://www.bip.krakow.pl/?news_id=227539) has seven separately priced
parcel groups in prose, covering eleven parcels. The new grouped reader validates
all parcel/price membership and derives each group's total area from its own
parcels. The former dateless "garage" row is preserved in the reviewed migration
ledger and replaced by seven source-dated land lots (9 September 2025).
Guarded date/source corrections also migrate the malformed Morawiańskiego house
and erroneous Grottgera 24/7 key, preserving watch aliases. They correct the
retained garage's November result while leaving its April sale intact.
Committed-history repair: **13→11 properties / 6→13 plots**, with source clocks
unchanged. Full locally crawled data is not published by this correction.


Final isolated source output plus durable reconciliation: **80 properties /
36 plots**, strict sanity clean. Property/land streams are healthy; result
coverage stays degraded because archive bounds and unsupported items remain.
The frozen production-land fixture additionally verifies migration of the old
17/1-only current lot to 17/1 + 17/2, both share prices, and parcel 215's explicit
385,000 zł sale. Source timestamps and runtime/review declarations are untouched.
