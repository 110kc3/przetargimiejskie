# Spike — Gryfino (Zachodniopomorskie · powiat gryfiński)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Gryfino does sell municipal flats at *ustny przetarg nieograniczony na sprzedaż*. A flat auction for Parsówek (3rd round) was published 2026-02-03, confirming active flat-auction activity on the live BIP. Volume is low (small gmina, ~16k population) — expect 1–4 flat auctions per year with repeated rounds on the same unit. BIP uses an ICOR-CMS with a JavaScript-rendered index listing; individual announcement pages are plain HTML tables — standard scrape pattern used in other Zachodniopomorskie cities.

## 1. Sells municipal property at auction?

**YES — flat auctions confirmed LIVE.**

Live render of `bip.gryfino.pl/chapter_56933.asp` (2026-06-30) showed:

- **2026-02-03** — "Burmistrz Miasta i Gminy Gryfino ogłasza **trzeci** przetarg ustny nieograniczony na sprzedaż **nieruchomości lokalowej mieszkalnej** w miejscowości Parsówek" — *lokal mieszkalny*, ustny nieograniczony, 3rd round (rounds 1 & 2 preceded it, confirming an ongoing flat-disposal programme).
- Multiple ground-plot auctions also listed (2026-04, under zabudowę mieszkaniową jednorodzinną) — separate from flats.
- Bezprzetargowe sales to tenants also appear (wykazy najmu), but flat auctions exist in parallel.

Historical web-indexed records also confirm flat auctions: 2004 — "Sprzedaż nieruchomości lokalowej … przeznaczonej na cele mieszkaniowe" (Drzenin, ul. 1 Maja 3b) and "nieruchomości lokalowej przy ul. 1 Maja 20a" — practice long-established.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| Announcement index (live) | `https://bip.gryfino.pl/chapter_56933.asp` | Nieruchomości section; JS-rendered listing |
| Individual announcement pages | `https://bip.gryfino.pl/chapter_NNNNN.asp` | Plain HTML table; each auction is a separate chapter |
| Results / wyniki | Same section (chapter_56933) | "Przetarg rozstrzygnięty" entries appear inline in the same feed |
| BIP root | `https://bip.gryfino.pl/` | ICOR Application Server CMS |
| Mirror | `https://gryfino.pl/UMGryfino/chapter_56933.asp` | Same content via main city site |

No separate dedicated wyniki/achieved-price sub-board confirmed; results appear as separate chapter entries in the main Nieruchomości feed, titled e.g. "Przetarg rozstrzygnięty".

## 3. Format + rendering

- **Index page** (`chapter_56933.asp`): HTML with JS-rendered listing (Angular/Vue-style `{{item.date}}` / `{{result.pagefrom}}` template placeholders). Raw HTTP fetch returns placeholder text; requires headless browser or JS execution to get the entry list. Date + title pairs returned as rendered DOM text.
- **Individual announcement pages** (`chapter_NNNNN.asp`): Plain static HTML tables — no JS required. Content is a single HTML table with auction details (description, cena wywoławcza, wadium, date/time, conditions). Fetchable with plain HTTP GET.
- **No auth / no CAPTCHA** observed.
- **No PDFs** on announcement pages — all inline HTML. (Scanned PDFs not seen for this BIP.)
- **CMS**: ICOR Application Server (same family as several Zachodniopomorskie BIPs).

## 4. Volume + achieved-price stream

- **Announcement volume**: Low — estimated 1–4 flat auctions/year based on observed entries. Population ~16k (gmina miejsko-wiejska). Flat inventory small.
- **Repeated rounds common**: The 2026-02-03 entry is explicitly "trzeci przetarg" (3rd round) on same flat — typical for smaller/rural units with weak demand.
- **Achieved-price (wyniki)**: Published inline in the same `chapter_56933.asp` feed as "Przetarg rozstrzygnięty" chapter entries. Individual result pages follow same plain-HTML-table format. Price recovery confirmed in older indexed entries (e.g. chapter_57460 "Przetarg rozstrzygnięty"). No dedicated price-result API.
- **Verdict**: Thin but genuine flat-auction stream. Worth scraping; price data present when auction resolves.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Other ICOR-CMS BIPs in Zachodniopomorskie (e.g. Stargard, Goleniów pattern if spiked). Two-layer scrape: (1) headless fetch of index to enumerate new `chapter_NNNNN` links, (2) plain HTML GET + table parse for each announcement page.

**Blockers / effort items**:
1. **JS-rendered index** — need Playwright/headless step for the listing page (or poll via the ICOR internal JSON endpoint if one exists). Medium effort.
2. **Chapter ID discovery** — no sequential guarantee; must diff the rendered list each run.
3. **Low volume** — scheduler cadence weekly is sufficient; no need for daily polling.
4. **Results linkage** — "Przetarg rozstrzygnięty" entries must be matched back to their announcement by address/description string, not by a structured ID.

**Effort rating**: Medium (headless index step adds complexity vs. pure-HTML BIPs, but individual pages are trivial).

**VERDICT: BUILD** — flat auctions confirmed active 2026, BIP publicly accessible, HTML format, no bot blocks observed.
