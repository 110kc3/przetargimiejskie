# Spike — coverage audit: are we missing listings the sources publish?

> **Question:** for every city, does the adapter capture *everything* the source
> publishes, or are sale auctions hiding on other pages / sibling boards / behind
> a filter? **Method:** one investigation agent per city (9 total), each read its
> adapter, fetched the **live source** (16 June 2026), enumerated what's actually
> published, and compared to the committed `data/<city>/*.json` (read via
> `git show HEAD:` for reliability).
>
> **Status:** spike complete — **knowledge, not code.** No adapter changed. (The
> separate parser/area/Bytom-land fixes already shipped; those are unrelated to
> the coverage gaps below.)

---

## TL;DR

**Coverage is NOT complete in 7 of 9 cities, and ~200+ municipal sale auctions are
currently being dropped.** The losses are almost never pagination — they're a
single recurring classification bug plus a few structural issues.

**The one bug behind most of it — "`unknown` kind → silently dropped."** Several
adapters classify a listing's kind from its **title only**. The cities routinely
title a sale "*Ogłoszenie … na sprzedaż nieruchomości – ul. X*" with the
disambiguating word (`niezabudowanej` / `zabudowanej` / `lokalu użytkowego`) only
in the **body**. Title-only classification returns `unknown`, and the crawl loops
have no branch for `unknown`, so the whole announcement is discarded with no
warning. The same shape also drops **houses** (`zabudowana`) and **commercial**
(`lokal użytkowy`) everywhere they share a board with flats. Fixing this one
pattern (classify on title **+ body**, and route any unclassified *sale*
announcement to the right parser) recovers inventory in **5 cities at once**.

---

## Per-city verdict

| City | Coverage | What's missed (live-confirmed) | Root cause (file:line) |
|---|---|---|---|
| **Gliwice** | ✅ near-complete | 1 BIP-only land plot (dz. 72/2, Pszczyńska 204, 601 000 zł, auction 14.07.2026) absent from the MSIP land export | BIP crawler is lokale-only — `crawl-bip.js:138-194` returns `[]` for a działka page; land comes only from MSIP |
| **Katowice** | ⚠️ partial | **multi-unit announcements collapse to 1 record** (~13–15 current flats/commercial under-captured, e.g. idr=152360 lists 4 flats → 0); historical result PDFs now **404** (link-rot, source-side); negative-result PDFs 404 → unsold under-counted (only 3 ever) | `parse.js:63-71` `addressFromTitle` single-match; `parse.js:73-152` emits ≤1 listing/doc |
| **Bytom** | ⚠️ mostly | 2 garage-plot **sales** (Reja, Witczaka) never captured; 1 out-of-gmina house (Parzymiechy, likely intentional). *(Land empty-persistence already fixed/restored.)* | `crawl.js:78-83` `kindFromText`→null + address guard `crawl.js:219` |
| **Zabrze** | ❌ board missed | **entire commercial board (552) never fetched → ~39 `lokal użytkowy` sale auctions** (newest 2026-05-28); houses board 558 stale | `crawl.js:39` hardcodes `LIST_CATEGORY_ID=549` (flats); `index.js:9-18` only flats+land |
| **Sosnowiec** | ❌ classes missed | **60 `zabudowana` houses (2 live) + 5 commercial + 3 co-op flats** dropped | title-only filters: `parse.js:236-244` (land needs title keyword), `parse.js:44-49` (flats), no commercial route at `crawl.js:70-71` |
| **Rybnik** | ❌ structural | flat crawler points at a **dead page** (`Page=214` = ZGM home, 0 listings) → the 6 committed flats are **stale seed data**; flats actually live on city BIP `Page=339` but the only crawler that reaches them keeps `grunt` only → ~13 historical flats + result notices dropped; **Rajska land mis-stamped `archived`** despite a 2026-09-17 auction | `crawl.js:22` dead `LIST_URL`; `crawl-land.js:215` `grunt`-only filter |
| **Bielsko** | ❌ partial | 4 live sale offers missing (~1.27 M zł): 1 house, 1 commercial, 2 flats | 1 classify gap (missing `Rodzaj` field → `unknown` dropped, `crawl.js:98-140`); 3 likely CI node-fetch failures swallowed at `crawl.js:88-95` |
| **Mysłowice** | ❌ classes missed | **20 houses + 8 commercial** sale auctions dropped (2 of each currently active) | `core/finn-bip.js:579` `if (!isFlat(title)) continue;` discards every non-flat, non-grunt title although `classifyKind` already labels them correctly |
| **Świętochłowice** | ❌ class missed | **all land auctions** dropped → `land.json` = 0 despite live land (Lotnicza 11.98 ha; Krokusów/Chrobrego) | `crawl.js:185` classifies on title only; `crawl.js:186-236` has no `unknown` branch → dropped |

**Verified-complete (no gap):** pagination is correct everywhere it was checked
(Gliwice results stop at the first empty page; Bytom 4 pages < cap; Sosnowiec
pages all 528 archived; Mysłowice/Świętochłowice indexes are single-page). The
misses are classification/routing, not discovery breadth.

---

## The cross-cutting fix (highest leverage)

A shared change to the kind-classification + routing fixes Sosnowiec,
Świętochłowice, Mysłowice, Bielsko and Rybnik together:

1. **Classify on title + body, not title alone.** The body always carries
   `niezabudowanej` / `zabudowanej` / `lokalu użytkowego` / `działka nr`.
2. **Never silently drop an `unknown` sale announcement** — if a doc passes the
   "is this an auction announcement" gate, route it to the parser its body
   implies (land → `parseLandAnnouncement`; building/commercial → the announcement
   parser with the right `kind`) instead of `continue`.
3. Per-city structural items on top of that: **Zabrze** add board 552 (commercial);
   **Rybnik** repoint flats to city-BIP `Page=339` (the ZGM page is dead) and fix
   the Rajska active/archived stamp; **Katowice** parse multi-unit announcements
   (one record per unit); **Gliwice** emit land from BIP działka pages; **Bielsko**
   add a chip/body fallback for missing `Rodzaj` + retry node fetches; **Bytom**
   add a garage-plot branch.

## Recommended order

1. **Shared classify-on-body + `unknown`-routing fix** (5 cities, biggest win).
2. **Zabrze board 552** and **Rybnik `Page=339` repoint** (whole streams missing).
3. **Katowice multi-unit parsing** (current-opportunity accuracy).
4. Gliwice / Bytom / Bielsko edge cases.

Each is parser/crawler work that repopulates on the next refresh, and each should
land with a test fixture (the live examples above make good fixtures). As with
SPIKE-HOUSES-LAND.md, every wave is spike-gated: confirm the live board before
writing the adapter branch.

## Caveats

- Counts are point-in-time (16 June 2026 live boards) and some archives were only
  sampled (Świętochłowice 1 545-item sibling archive, Katowice 295-item results
  list) — treat class-level numbers as lower bounds.
- A few gaps are genuinely source-side, not fixable in-adapter: Katowice's
  historical result PDFs now 404 (the committed `pdf-text-cache/` is the only
  surviving copy — worth snapshotting), and Bielsko's live site intermittently
  refuses the CI fetcher.

---

*Generated 16 June 2026 from a 9-agent per-city coverage spike. Doc-only — no
`extension/` or adapter change, so no version bump (per CLAUDE.md).*
