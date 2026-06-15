# Spike — do the existing sources also carry HOUSES & LAND (and commercial)?

> **Question (from the expansion brief):** the pipeline today scrapes only **flat**
> (lokal mieszkalny) sale auctions. Do the *same* municipal sources each city
> already uses also publish **house** (nieruchomość zabudowana / dom), **land**
> (działka / grunt / nieruchomość niezabudowana) and **commercial**
> (lokal użytkowy / garaż) sale auctions — so coverage can be expanded without
> finding new sources?
>
> **Method:** one investigation agent per city (9 total). Each read its adapter
> (`pipeline/src/cities/<id>/`), checked the committed data, and **live-fetched
> the real source** (June 15 2026) to confirm which non-flat categories exist
> today and how the flat pipeline currently excludes them. Findings then
> cross-checked against the repo (exact filter lines + committed `kind` counts).
>
> **Status:** spike complete — knowledge, not code. No adapter changed.

---

## TL;DR

**Yes — in 7 of 9 cities the houses + land + commercial auctions are on the
*same* source the adapter already fetches, and are being thrown away by a single
flat-only filter.** In the other 2 (Gliwice, Rybnik) the housing authority sells
only flats and the land/house auctions live on a *different* host (the City
Hall's own BIP), so those need a new source, not just a filter change.

Three things to get straight before reading the table:

1. **Land is the real prize, and it is 100% uncovered everywhere.** No city has a
   single land record in `data/` today. It is also the highest-volume class by
   far — e.g. Mysłowice alone is dropping **95 land auctions**, Gliwice's city
   portal lists **76 live land plots**, Sosnowiec's results board is "mostly
   land", Rybnik's city BIP had 15+ land auctions in 7 months.
2. **Commercial (lokal użytkowy) + garages are already half-done.** The OCR/HTML
   cities that share one "lokale" board already ingest them: Gliwice has **115
   `uzytkowy` + 26 `garaz`** committed, Katowice **30 `uzytkowy`**, Bytom **14**.
   So "commercial" is mostly an *existing* capability to formalise, not new work.
3. **"Houses" = `nieruchomość zabudowana`, and some already leak in mislabelled.**
   Katowice and Sosnowiec classify a plot-with-residential-building as
   `kind:"mieszkalny"` today (e.g. Katowice's Kosmiczna 10 & Działkowa 17 are
   live `zabudowana` auctions already in `active.json`). True standalone houses
   (`Domy`) are a smaller, distinct class — only Bielsko exposes them as their
   own category.

**The one cross-cutting blocker:** the property join key is `street|building|apt`.
Land parcels have no building/apt — they key on a parcel number (`dz. nr 233/1`).
Surfacing land needs a schema decision (a `kind:"grunt"` type + a `dzialka_nr`
key), which TODO.md already flags as the open Katowice land question. Solve it
once and it unlocks land for all nine cities.

---

## Coverage matrix (live-confirmed, 15 June 2026)

Legend — **✅ same source** = already fetched, filtered out; **✅ already in data**
= currently ingested; **➕ sibling** = different board/category on the *same host*;
**🏛️ other host** = needs a new city-BIP adapter; **❓** = not confirmed.

| City | Flats (today) | Houses `zabudowana` | Land `działka/grunt` | Commercial `użytkowy`/garaż | Where houses+land live | Effort |
|---|---|---|---|---|---|---|
| **Mysłowice** | ✅ FINN BIP | ✅ 23 dropped | ✅ **95 dropped** | ✅ 7 dropped | **same 2 index pages** | **Low** |
| **Sosnowiec** | ✅ JSON API 6339 | ✅ same API | ✅ same API ("mostly land") | ✅ same API | **same JSON API** | **Low** |
| **Bielsko-Biała** | ✅ giełda | ✅ term/9 (4 live) | ✅ term/10 (7 live) | ✅ term/14 (2 live) | **same giełda (taxonomy)** | **Low** |
| **Bytom** | ✅ BIP + i-BIIP | ✅ 5 live | ✅ 8 live | ✅ already in data (14) | **same BIP list + catalog** | **Low** |
| **Katowice** | ✅ city BIP | ✅ already as `mieszkalny` | ✅ ~29/60 skipped | ✅ already in data (30) | **same BIP board** | **Low** |
| **Świętochłowice** | ✅ `/bipkod/29287911` | ➕ `/bipkod/003/010/003` | ➕ same sibling (mixed) | ➕ `/bipkod/42668516` | **sibling categories, same host** | **Low** |
| **Zabrze** | ✅ JSON board 549 | ➕ "Inne" board | ➕ "Grunty" board | ➕ "Lokale użytkowe" board | **sibling JSON boards (IDs TBD)** | **Low–Med** |
| **Gliwice** | ✅ ZGM | 🏛️ msip/bip.gliwice.eu (4) | 🏛️ msip.gliwice.eu (**76**) | ✅ already in data (115+26) | **other host (City Hall)** | **Med** |
| **Rybnik** | ✅ ZGM | ❓ likely absent | 🏛️ bip.um.rybnik.eu (15+) | ❓ ZGM = rental only | **other host (City Hall)** | **High** |

---

## Two architectures, two kinds of work

### A. Filter-relax cities (7) — the data is already in the crawl

For these, the adapter already fetches a list/board/API that **mixes all property
types**, then narrows to flats with one test. Expansion = relax that test + add a
`kind` classifier + handle the land key. No new source, no new auth, no OCR.

The exact flat-gate in each (verified against the tree):

- **Mysłowice** — `linkFilter: /lokal/i` (`config.js:38`, applied in
  `core/finn-bip.js:424`). The two index pages (`/artykul/aktualne-przetargi`,
  `/artykul/archiwum-przetargow`) carry **154 announcements; 124 are non-flat**
  (95 land, 23 houses/zabudowane, 7 commercial) and are dropped purely because
  their slug lacks "lokal". Relax the regex → instant houses+land+commercial.
- **Sosnowiec** — `isFlatAuction()` (`parse.js:52`, regex line 56:
  `/lokal\w*\s+mieszkaln.../`), mirrored by `isFlatResult()` (`parse.js:195`).
  The same JSON API (`/api/menu/6339/articles` + results board `7043`) returns
  land, `zabudowana` and `lokal użytkowy` titles that the regex discards. Today
  2 of 4 *current* przetargi are land, 2 are built-property; the 182-notice
  results board is "mostly land".
- **Bielsko-Biała** — `isFlat(rodzaj)` (`crawl.js:95`, on the node's own
  `Rodzaj nieruchomości` field). Every giełda node is fetched, then non-flats are
  `continue`d. Full type taxonomy is live: `term/9 Domy`, `term/10 Działki`,
  `term/14 Lokale użytkowe`, `term/15 Mieszkania`, `term/13 Inne` — each with an
  RSS feed at `/taxonomy/term/<id>/feed`.
- **Bytom** — `kindFromText()` returns `null` for
  "nieruchomości gruntowej / zabudowanej / działkę / garaże" (`crawl.js:101–105`)
  **plus** an address guard `if (/\bdz\.?\s*\d|działk/.test(addrRaw)) continue`
  (`crawl.js:180`). The i-BIIP catalog exposes an explicit machine-readable `TYP`
  field — live today: 8 *grunty niezabudowane*, 5 *grunty zabudowane*, 6
  *lokal użytkowy*, 5 *lokal mieszkalny*. Commercial already flows.
- **Katowice** — no single gate; land rows are dropped at parse
  (`parse.js:204–206`, `nieruchomość gruntowa|grunt|dz. nr`) and parcel-only
  announcements fall out of `addressFromTitle`. Houses (`budynek mieszkalny`) are
  *already* captured as `mieszkalny`; commercial (`uzytkowy`) too. TODO.md's
  "~29 of 60 announcements are land, skipped by design" is this exact case.
- **Świętochłowice** — the adapter is pinned to one Liferay category
  (`/bipkod/29287911`, flats only). Houses + land share a sibling mixed category
  `/bipkod/003/010/003` (16 live items: e.g. Ceramiczna 2.72 ha, Lotnicza
  11.98 ha land; Katowicka 35, Kaliny 38+40 buildings); commercial+garaże have
  their own `/bipkod/42668516`. Same host, same `.doc`/PDF extraction.
- **Zabrze** — `crawl.js:39` hard-codes `LIST_CATEGORY_ID = 549` (Lokale
  mieszkalne). The same BIP/API has sibling sale boards — paths confirmed via
  search: `…/zabrze_pn_grunty` (land), `…/zabrze_pn_uzytkowe` (commercial),
  `…/zabrze_pn_inne` (built/"houses"). The same
  `/api/v1/document-list/<ID>` + `/doc/<id>` + `/attachment/<id>` machinery
  applies; the only gap is the three numeric category IDs (host blocks the
  sandbox via an incomplete TLS chain — one browser visit per board resolves
  them).

### B. New-host cities (2) — the authority sells only flats

- **Gliwice** — ZGM (the housing authority) is the atypical one that runs *flat*
  sales itself; it has **no** house/land board (its lokale boards already feed
  commercial + garages into the data). House and land sales are run by the City
  Hall and published on **`msip.gliwice.eu`** (oferta-nieruchomości:
  *nieruchomości niezabudowane* = **76 live land plots**; *zabudowane* = **4**)
  with detail pages on `bip.gliwice.eu/sprzedaz-dzialka-*`. The MSIP index even
  offers a JSON/CSV export. The existing `crawl-bip.js` already reaches
  `bip.gliwice.eu`, so the pattern is proven — but it's a new index + parser.
- **Rybnik** — ZGM BIP is flats-only (its "Lokale użytkowe" entry is a *rental*
  tender, not a sale). Land lives on the **city** BIP `bip.um.rybnik.eu`
  (`Page=339`): 15+ land auctions in the last 7 months (Gotartowicka rounds I–V,
  Rajska, etc.), RTF attachments (already supported by `core/rtf-text.js`). It's
  a different institution/host with an untyped mixed list, so it's a fresh
  adapter — highest effort. Houses and commercial on the city BIP were not
  confirmed (the live view truncates at 8 current items); detached-house sales
  are rare and likely minimal.

---

## What the committed data already proves

`kind` counts in `data/<city>/{active,properties}.json` today:

| City | `mieszkalny` | `uzytkowy` | `garaz` | `unknown` | land/house |
|---|---|---|---|---|---|
| Gliwice | 274 | **115** | **26** | 24 | 0 |
| Katowice | 204 | **30** | 0 | 34 | 0 |
| Bytom | 24 | **14** | 0 | 0 | 0 |
| Zabrze | 682 | 0 | 0 | 0 | 0 |
| Sosnowiec | 68 | 0 | 0 | 0 | 0 |
| Rybnik | 12 | 0 | 0 | 0 | 0 |
| Bielsko | 4 | 0 | 0 | 0 | 0 |
| Mysłowice | 52 | 0 | 0 | 0 | 0 |
| Świętochłowice | 245 | 0 | 0 | 0 | 0 |

Reading: commercial/garage capture already exists where the lokale board is
shared (Gliwice, Katowice, Bytom). **Land is zero across the board** — confirming
it is the single biggest untapped class and the one that needs the schema work.

---

## Recommended build order

A land schema decision gates everything, so do it first, then ride the
filter-relax cities cheaply, then the sibling boards, then the new hosts.

1. **Cross-cutting prerequisite — land schema.** Add `kind: "grunt"` (and keep
   `zabudowana`/houses distinct from `mieszkalny`) plus a parcel key
   (`dzialka_nr`, fall back key `<city>|dz|<parcel>`). This is the TODO.md
   "synthetic `dz. nr` key vs `kind:"grunt"` type" decision — make it once.
2. **Wave H1 — filter-relax, same source (Low):** Mysłowice, Sosnowiec, Bielsko.
   These are the cleanest (server-rendered or JSON, explicit type field/slug, big
   volume). Relax one filter, add the classifier, reuse the existing parser.
3. **Wave H2 — same source, more parsing (Low):** Bytom (i-BIIP `TYP` field),
   Katowice (drop the land guard, add parcel key — commercial/houses already
   work), Świętochłowice (add the two sibling `bipkod` categories).
4. **Wave H3 — sibling boards, tiny spike (Low–Med):** Zabrze — capture the three
   board IDs from the live SPA, then clone the existing crawl loop per board;
   note each non-flat announcement is one property (not a multi-flat table), so
   add a single-property parse variant.
5. **Wave H4 — new host adapters (Med/High):** Gliwice (`msip.gliwice.eu` land +
   `bip.gliwice.eu` detail), then Rybnik (`bip.um.rybnik.eu` mixed list). Last,
   because they're genuinely new sources.

The extension side rides along: this is mostly new `kind` values + the
deal-score/median logic excluding land from zł/m² (land is zł/m² of plot, not
usable area), and a `kind` filter in the archive/popup — no new host permissions
for the filter-relax cities.

---

## Caveats & confidence

- **High confidence (live-fetched, types confirmed, counts read):** Mysłowice,
  Sosnowiec, Bielsko, Bytom, Katowice, Świętochłowice, Gliwice.
- **Medium — Zabrze:** sibling boards confirmed to *exist* (paths + sample doc
  IDs via search), but the numeric `document-list` IDs are unconfirmed because
  the BIP host rejects the sandbox's TLS. One browser visit per board page
  resolves them and drops effort to Low.
- **Mixed — Rybnik:** land on `bip.um.rybnik.eu` confirmed live with named
  auctions; **houses and commercial there are unconfirmed** (current view
  truncates; deeper archive not walked). ZGM being flats-only *is* confirmed.
- **Terminology:** "houses" here means `nieruchomość zabudowana` (plot + building
  — can be a house, tenement or mixed-use). Standalone single-family `Domy` as a
  named class only appear in Bielsko (term/9). Katowice/Sosnowiec already fold
  residential `zabudowana` into `mieszkalny`, so a cleanup pass should reclassify
  those if houses become a first-class kind.
- **Volume numbers are point-in-time snapshots** (15 June 2026 live boards) and
  partly truncated by fetch limits (e.g. Sosnowiec archive 500+); treat them as
  lower bounds, not exact totals.

## Verification performed

- Every cited flat-filter line was grepped and confirmed in the tree (Sosnowiec
  `parse.js:52/56/195`, Mysłowice `config.js:38` + `finn-bip.js:424`, Bielsko
  `crawl.js:95`, Bytom `crawl.js:101–105/180`, Katowice `parse.js:43–48/204–206`,
  Gliwice `parse-result.js:50–56` + `crawl-bip.js:10–11`, Rybnik
  `crawl.js:22` Page=214).
- Committed `kind` counts pulled from all nine `data/*/{active,properties}.json`
  to confirm commercial/garage are already ingested and land is absent.
- Cross-checked against the repo's own notes (TODO.md "~29/60 Katowice land
  skipped", "Sosnowiec 182 notices mostly land"; EXPANSION.md §2; per-city
  `config.js` headers).

---

*Generated 15 June 2026 from a 9-agent per-city source spike. Doc-only — no
`extension/` change, so no version bump (per CLAUDE.md).*
