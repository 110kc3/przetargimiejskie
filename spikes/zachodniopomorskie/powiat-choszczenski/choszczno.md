# Spike — Choszczno (Zachodniopomorskie · powiat choszczeński)
> **Status:** spike DESK — 2026-06-30. VERDICT: NEEDS-LIVE-VERIFY (Medium effort).

## TL;DR
Gmina Choszczno does sell **lokale mieszkalne** via *ustny przetarg nieograniczony* — confirmed from BIP search snippets (ul. Wolności 58 lokal nr 2, Piasecznik lokal nr 3, ul. Rycerska 2/4 rounds I–III). Volume is LOW (small gmina, ~15 000 residents; 1–3 flat auctions/year, often recycled through multiple rounds). The BIP at `bip.choszczno.pl` times out on direct HTTP fetch — live verification of page structure and any results/achieved-price board is still needed before committing to an adapter.

## 1. Sells municipal property at auction?

YES — confirmed. Evidence from BIP search snippets:

- **ul. Wolności 58, lokal nr 2** (38.12 m²): II przetarg ustny nieograniczony (2018-05-11); cena wywoławcza reduced from 57 000 zł → 30 000 zł for round II after round I on 2018-03-29 found no buyer.
- **Piasecznik, bud. nr 83, lokal nr 3** (99.60 m²): przetarg ustny nieograniczony; udział 39/100 części w częściach wspólnych.
- **ul. Rycerska 2/4, Choszczno**: rounds I, II, III ustny nieograniczony visible in BIP index (2024-11 through 2025-03) — most recent activity, suggesting still-active flat sales programme.
- Also appears on listaprzetargow.pl aggregator under "Mieszkania, Choszczno, zachodniopomorskie".

Flat auctions are run by the Burmistrz Choszczna per art. 37 ugn. Sales also occur bezprzetargowo (tenant buy-out path), but the open-auction channel is confirmed active.

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Notes |
|---|---|---|
| BIP announcement index | `https://bip.choszczno.pl/dokumenty/8021` | Returns empty on direct fetch (timeout/block) |
| BIP przetargi section | `https://bip.choszczno.pl/artykul/przetargi-14` | Also times out |
| BIP przetargi (alt slug) | `https://bip.choszczno.pl/dokumenty/10427` | Times out |
| Individual announcements | `https://bip.choszczno.pl/artykul/burmistrz-choszczna-oglasza-*` | Confirmed by Google snippets; content loads in browser |
| Wykaz nieruchomości | `https://bip.choszczno.pl/dokumenty/2782` | Times out |
| Official city site | `https://choszczno.pl/` | Cross-posts some announcements |

**Results/achieved-price board**: NOT found as a dedicated section. No `informacja o wyniku przetargu` page indexed on bip.choszczno.pl. Results may be embedded in individual auction articles (post-auction update) or posted as separate articles without a structured listing — requires live inspection.

## 3. Format + rendering

- **Platform**: Custom BIP CMS at `bip.choszczno.pl` (not eSotysWeb, not Sputnik — appears to be a custom or less-common system based on URL slug style `/artykul/` and `/dokumenty/`).
- **Content format**: HTML articles — auction text is inline HTML paragraphs (confirmed from listaprzetargow.pl which scraped and displayed full text).
- **Direct fetch**: FAILS — all `bip.choszczno.pl` URLs return empty body on `web_fetch`. This is the primary blocker; either rate-limiting, bot detection, or slow server.
- **Chrome MCP**: Will likely work (pages render fine in browser per listaprzetargow.pl having scraped them). No SPA, no login wall observed.
- **PDF**: No evidence of PDF announcements; text appears inline in HTML.
- **OCR**: Not required.

## 4. Volume + achieved-price stream

- **Flat auction volume**: LOW — estimated 1–3 per year based on visible rounds. The Rycerska 2/4 property went through at least 3 auction rounds (I → Nov 2024, II → Jan 2025, III → Mar 2025) without selling, suggesting thin demand and small pipeline.
- **Achieved prices**: No dedicated results board found. Prices will need to be scraped from per-auction articles if the gmina posts post-auction updates in the same article or as a follow-up article. This is unconfirmed — NEEDS-LIVE-VERIFY.
- **Aggregator signal**: listaprzetargow.pl indexes Choszczno flats; adradar.pl lists the gmina with 34 pages of historical entries (mixed types), confirming the BIP is crawlable in principle.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Similar to other small Zachodniopomorskie gminy (e.g., Drawsko Pomorskie pattern) — BIP HTML scrape, low volume, no structured results feed.

**Blockers**:
1. `bip.choszczno.pl` times out on direct HTTP fetch — need to confirm Chrome MCP can reach it and identify the correct article list URL for przetargi nieruchomości.
2. Results/achieved-price board: no confirmed URL. Must find where post-auction notices are published (same article? separate article series? nowhere?).
3. Low volume (1–3 flats/year) means ROI is low — worth combining with other powiat-choszczeński gminy if building a regional adapter.

**Effort**: Medium — HTML scraping is straightforward once fetch blocker is resolved, but the results stream is unconfirmed and volume is low.

**Verdict**: NEEDS-LIVE-VERIFY — open Chrome MCP session against `bip.choszczno.pl/dokumenty/8021` (or `/artykul/przetargi-14`) to (a) confirm page renders and identify article list structure, (b) check whether post-auction "informacja o wyniku" notices exist on the BIP.
