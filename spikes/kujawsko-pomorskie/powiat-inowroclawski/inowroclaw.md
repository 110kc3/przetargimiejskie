# Spike — Inowrocław (Kujawsko-Pomorskie · powiat inowrocławski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium effort if revisited).

## TL;DR

Gmina Miasto Inowrocław does sell municipal flats at *ustny przetarg nieograniczony*, but volume is extremely low (NIK audit: ~9 flats in all of 2017) and the BIP przetargi board was live-verified **empty** ("Brak artykułów") as of 2026-06-27. The dominant privatisation route is **bezprzetargowy** tenant buy-out (wykup). No dedicated housing manager (ZBK/ZGM-type entity) runs a separate flat-auction stream — PGKiM manages buildings but is not the auction publisher. The city BIP przetargi section is the single publication point and fires only sporadically. Not worth building an adapter at current volume; re-check if volume rises.

---

## 1. Sells municipal property at auction?

**YES — but only flats, rarely, and mostly via bezprzetargowy wykup.**

Confirmed auction evidence:
- A "ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych w Inowrocławiu" was published by neighbouring UG Złotniki Kujawskie (re-posting city notice), dated 2021-03-31. Source: https://zlotnikikujawskie.pl/aktualnosci/ustny-przetarg-nieograniczony-na-sprzedaz-lokali-mieszkalnych-w-inowroclawiu.html (page returned empty body on fetch — confirmed by search snippet).
- BIP article 27681 at `bip.inowroclaw.pl/artykul/143/27681` is titled "Przetarg ustny nieograniczony na sprzedaż nieruchomości położonych w Inowrocławiu przy ul. Macieja Wierzbińskiego 48, ul. Macieja Wierzbińskiego i ul. Rąbińskiej" — currently status "not yet published" (scheduled future auction). The street addresses suggest a building/plot sale, not an individual flat, though the category (artykuły/143) is the nieruchomości board.
- NIK 2018 audit (LBY.410.014.03.2018 P/18/005) documented 248 flat sales 2012–2016 (target was 350) and only **9 flats sold in 2017** (target 50, value 285.7k PLN of planned 2,058k PLN). Sales were predominantly **bezprzetargowe** (without competitive tender) to existing tenants.
- Procedure "Wykup lokalu mieszkalnego i użytkowego" is published on the city BIP at `bip.inowroclaw.pl/artykul/345/13522/wykup-lokalu-mieszkalnego-i-uzytkowego` — confirms bezprzetargowy route is the main channel.

**Conclusion on Q1:** The city does conduct *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* occasionally, but volume is very low and the primary privatisation mechanism is non-competitive tenant buy-out. The przetarg board was empty on the day of this spike.

---

## 2. Where published? (hosts + boards, URLs)

### Primary publication point — Urząd Miasta Inowrocławia BIP

| Item | Value |
|---|---|
| BIP host | `https://bip.inowroclaw.pl` (CMS: Logonet Sp. z o.o., Bydgoszcz) |
| Przetargi/Nieruchomości board | https://bip.inowroclaw.pl/artykuly/143/przetargi-i-rokowania-na-sprzedaz-i-wydzierzawienie-nieruchomosci |
| Wykazy nieruchomości do zbycia | https://bip.inowroclaw.pl/artykuly/145/wykazy-nieruchomosci-przeznaczonych-do-zbycia-oddania-w-uzytkowanie-najem-dzierzawe-lub-uzyczenie |
| Buyout procedure page | https://bip.inowroclaw.pl/artykul/345/13522/wykup-lokalu-mieszkalnego-i-uzytkowego |
| RSS feed | https://bip.inowroclaw.pl/rss |
| Last BIP update | 2026-06-26 14:54 (live-verified) |

**Result notices (achieved price):** No dedicated "wyniki przetargu / informacja o wyniku" sub-board was found. Under Logonet CMS, result notices typically appear as separate artykuł entries in the same artykuły/143 category. The board was empty at spike time, so no result notices were present.

### Secondary — PGKiM BIP (housing manager)

| Item | Value |
|---|---|
| PGKiM BIP | `http://pgkim-inowroclaw.samorzady.pl/` |
| PGKiM przetarg na nieruchomości | `http://pgkim-inowroclaw.samorzady.pl/?k=89` (timed out on fetch) |
| PGKiM przetargi ofertowe pisemne | `http://pgkim-inowroclaw.samorzady.pl/?k=54` |
| PGKiM website | `https://pgkimino.pl/` |

PGKiM (Przedsiębiorstwo Gospodarki Komunalnej i Mieszkaniowej Sp. z o.o.) is a majority-city-owned company managing 142 residential buildings in Inowrocław and Złotniki Kujawskie. It has a BIP section "Przetarg na nieruchomości" but it is unclear whether PGKiM independently sells flats (city-owned flats are typically sold by the Urząd Miasta, not the manager). The PGKiM BIP uses the older `samorzady.pl` platform. Fetch timed out — not live-verified.

---

## 3. Format + rendering

| Aspect | Detail |
|---|---|
| Platform | Logonet CMS (same vendor as many Kujawsko-Pomorskie BIPs) |
| Live-verified | YES — page content fetched successfully (HTML, UTF-8) |
| Format | Server-rendered HTML — no JavaScript SPA, no auth wall |
| Auction notices | Appear as individual artykuł pages under category 143; linked from the listing page |
| Attachments | Likely PDF attachments for auction ogłoszenia (not confirmed — board was empty) |
| Bot/auth blocks | None detected — standard robots: index,follow,all |
| PGKiM secondary BIP | `samorzady.pl` platform (older PHP system); different scraping approach needed |

---

## 4. Volume + achieved-price stream

| Metric | Value / Source |
|---|---|
| Flats sold 2012–2016 | 248 (planned 350) — NIK 2018 audit |
| Value 2012–2016 | 9,797.8k PLN (planned 13,804k PLN) |
| Flats sold 2017 | ~9 (planned 50) — NIK 2018 audit |
| Implied annual run rate (przetarg) | Unknown; NIK noted predominantly bezprzetargowy sales |
| Active przetargi on spike date | **0** ("Brak artykułów") |
| Achieved-price notices found | None (board empty; no archived result pages indexed) |

**Achieved-price stream:** Not available as a structured feed. If/when auctions fire, result notices would appear as new artykuł entries in category 143. No JSON or API endpoint. Scraping would need to detect new articles via the listing page diff.

---

## 5. Adapter effort + verdict

### Closest analog

**Bytom** — city BIP (Logonet or similar Polish CMS) publishing sporadic flat przetargi with low volume, no dedicated housing manager auction stream. Unlike Gliwice/Zabrze/ZGM-Bytom where a housing manager (ZBM) publishes regularly, Inowrocław's Urząd Miasta is the sole publisher and fires rarely.

### Blockers

1. **Near-zero active volume** — board was empty on spike date; sporadic fire rate (9 flats/year in 2017, declining since NIK noted underperformance).
2. **Bezprzetargowy dominance** — most flat sales bypass competitive auction entirely; scraping the przetargi board misses the bulk of privatisation activity.
3. **PGKiM secondary BIP** — if PGKiM independently sells any flats, it's on the `samorzady.pl` platform (fetch timed out); needs separate adapter logic.
4. **No result/achieved-price structured feed** — won't know if auctions happened unless we poll the listing page and diff for new articles.
5. **Wierzbińskiego/Rąbińska przetarg** — the one upcoming przetarg (article 27681) appears to be a building/plot sale at a street address, not individual flat units — needs live verification once published.

### Risks

- BIP przetargi section may remain empty for months; monitoring cost > return.
- Logonet CMS article IDs are sequential integers — could enumerate, but noisy.
- NIK data is from 2018; city policy may have changed but public evidence does not suggest a ramp-up.

### Verdict

**NO-BUILD** at current volume. Revisit if: (a) the przetargi board consistently shows 3+ flat auctions per quarter, or (b) PGKiM BIP confirms independent flat-sale auction activity.

**Effort if built:** Medium — Logonet CMS is familiar (same as other cities), HTML scraping is straightforward, but the detection problem (polling empty board, low SNR) makes operational maintenance costly relative to yield.

---

## Sources

- City BIP main: https://bip.inowroclaw.pl/
- Przetargi board (live-verified empty): https://bip.inowroclaw.pl/artykuly/143/przetargi-i-rokowania-na-sprzedaz-i-wydzierzawienie-nieruchomosci
- Wykazy nieruchomości: https://bip.inowroclaw.pl/artykuly/145/wykazy-nieruchomosci-przeznaczonych-do-zbycia-oddania-w-uzytkowanie-najem-dzierzawe-lub-uzyczenie
- Wykup lokalu procedure: https://bip.inowroclaw.pl/artykul/345/13522/wykup-lokalu-mieszkalnego-i-uzytkowego
- Upcoming przetarg (not yet published): https://bip.inowroclaw.pl/artykul/143/27681
- PGKiM BIP: http://pgkim-inowroclaw.samorzady.pl/?k=89
- PGKiM website: https://pgkimino.pl/
- Złotniki Kujawskie 2021 re-post (confirms flat auction format): https://zlotnikikujawskie.pl/aktualnosci/ustny-przetarg-nieograniczony-na-sprzedaz-lokali-mieszkalnych-w-inowroclawiu.html
- NIK 2018 audit UM Inowrocław (P/18/005): https://www.nik.gov.pl/kontrole/wyniki-kontroli-nik/pobierz,lby~p_18_005_201807261233111532608391~id2~01,typ,k.pdf
- NIK systemowe błędy prywatyzacji: https://www.nik.gov.pl/najnowsze-informacje-o-wynikach-kontroli/prywatyzacja-mieszkan-komunalnych.html
