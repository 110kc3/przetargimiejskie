# Spike — Ełk (Warmińsko-Mazurskie · powiat ełcki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Ełk (Prezydent Miasta Ełku, ~62 000 mieszkańców) actively auctions municipal flats via *ustny przetarg nieograniczony* through the Wydział Mienia Komunalnego. All announcements and result notices with achieved prices are published in a single, well-structured category on the city portal `www.elk.pl`. The content is plain HTML, no auth, no bot blocks, no OCR required. The category has 43 pages of historical entries. Volume is modest (~5–10 flat auctions per year) but the achieved-price stream is fully public and machine-readable. No dedicated housing manager (TBS/ZGM) — the city hall runs everything directly.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The Prezydent Miasta Ełku conducts *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* against a rolling stock of unsold flats. Evidence:

- August 2024: First przetarg, 3 Maja 9 — lokale nr 11A (33.24 m², 125 200 zł) through nr 4A (84.04 m², 272 200 zł).
- October 2024: First przetarg, ul. 3 Maja 9 — lokale nr 3 (121 200 zł), nr 5 (279 200 zł), nr 13 (265 000 zł); auction date 2024-12-02.
- October 2025: Result notice for lokal nr 7, ul. 3 Maja 9, 50.66 m² — cena wywoławcza 169 290 zł, **cena osiągnięta 170 990 zł** (nabywcy: Ewa i Błażej Bielscy). LIVE-VERIFIED via full page fetch.
- April 2026: First przetarg, ul. Gizewiusza 10A, lokal nr 15, IV piętro — 302 665 zł.
- May 2026: Kolejny przetarg, ul. Armii Krajowej 18, lokal nr 2, I piętro — 419 723 zł.
- June 2026: Wynik przetargu (11-06-2026) on Armii Krajowej 18/2 — result notice published.
- June 2026 (today): Second przetarg ogłoszony for Gizewiusza 10A/15 — newest entry on the category page.

Legal basis is a Zarządzenie Prezydenta (e.g., Nr 1501.2024 z dnia 16 kwietnia 2024 r.) designating flats for sale by auction. Both *tryb przetargowy* (open auction) and *tryb bezprzetargowy* (bezprzetargowo to sitting tenants) are used — the bezprzetargowy path is a separate category and does not produce public auction results.

---

## 2. Where published? (hosts + boards, URLs)

**Primary publication — two mirrored portals (same content, same category ID 139):**

| Role | URL |
|---|---|
| City portal (main) | `https://www.elk.pl/aktualnosci-kategorie/139/invest-sprzedaz-nieruchomosci-tryb-przetargowy` |
| Invest-in-Ełk mirror | `https://investin.elk.pl/aktualnosci-kategorie/139/invest-sprzedaz-nieruchomosci-tryb-przetargowy` |
| BIP board (nieruchomości) | `https://bip.elk.warmia.mazury.pl/177/Nieruchomosci_przeznaczone_do_sprzedazy/` |
| BIP subsection (lokale mieszkalne i użytkowe) | `https://bip.elk.warmia.mazury.pl/10136/Sprzedaz_lokali_mieszkalnych_i_uzytkowych/` |

**Both announcement notices and result notices (with achieved price) are published in the same category 139.** A single scrape target captures the full pipeline.

The BIP at `bip.elk.warmia.mazury.pl` carries the same announcements in a parallel tree but category 139 on `elk.pl` is the canonical, consistently updated board and includes result notices.

Individual entry URLs follow the pattern:
`https://www.elk.pl/aktualnosci-wpis/{ID}/{slug}`

Result notices are titled *"INFORMACJA O WYNIKU ... PRZETARGU USTNEGO NIEOGRANICZONEGO"* and contain both cena wywoławcza and cena osiągnięta in plain text.

---

## 3. Format + rendering

- **HTML** — server-rendered, static page listing. Each category page shows ~10 entries as title + date + first ~3 lines of body text + "Więcej" link.
- Full entry page is plain HTML prose — no JavaScript required to read the body. The achieved price and buyer identity appear in free text (e.g., *"W przetargu osiągnięto najwyższą cenę ww. nieruchomości w kwocie 170.990,00 zł"*). LIVE-VERIFIED via direct fetch of entry #9220.
- Some announcements also attach a `.pdf` download (e.g., *"Informacja - ul. 3 Maja 9 m. 7.pdf"*) but the body text duplicates the content completely — no OCR needed.
- No authentication, no bot-detection observed (CloudFlare not present), no SPA.
- Pagination on the category index: `?/2`, `?/3` … up to page 43 (confirmed on category page fetch).

---

## 4. Volume + achieved-price stream

**Volume:** Category 139 has 43 pages × ~10 entries = ~430 total items spanning roughly 2009–2026. This category mixes flat sales, land sales, and lease auctions. Flat auctions (lokal mieszkalny) appear to represent ~30–40% of entries — estimated **~5–10 flat auctions (announcements) per year**, often with repeat rounds (I/II/III/kolejny przetarg) on unsold units.

**Achieved-price stream:** Explicitly present. Each completed auction generates an *"INFORMACJA O WYNIKU"* post in the same category 139 containing:
- cena wywoławcza (reserve price)
- cena osiągnięta (hammer price)
- buyer name (natural persons named explicitly; commercial buyers may be anonymised)
- date of auction
- lokal description (address, floor, m², piwnica)

Recent confirmed result entries: Oct 2025 (#9220), Jun 2026 (#9791), May 2026 (#9758), Mar 2026 (#9602).

**Also separately listed (bezprzetargowy stream):** Category 140 (`invest-sprzedaz-nieruchomosci-tryb-bezprzetargowy`) lists tenant-preference sales — these do not have open auction prices and are out of scope.

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom or Tarnowskie Góry — city-BIP-hosted HTML category listing, plain prose result notices, no dedicated housing manager, moderate flat-auction volume. Not as high-volume as Gliwice or Kraków.

**Adapter design:**

1. **Spider:** GET paginated category 139 (`elk.pl`), pages 1–N, collect entry IDs and slugs for new items since last run.
2. **Parser A (announcement):** Match title pattern `(I|II|III|kolejny|pierwszy|drugi|trzeci)\s+przetarg.*lokal.*mieszkaln`. Extract: lokal nr, address, floor, area, cena wywoławcza, wadium, date of auction. Fields are in structured prose (consistent Polish boilerplate).
3. **Parser B (result):** Match title `INFORMACJA O WYNIKU`. Extract cena osiągnięta via regex `osiągnięto najwyższą cenę.*?(\d[\d\s,.]+zł)`. Link back to announcement by lokal identifier.
4. **Dedup:** Entry ID is numeric and monotonically increasing — straightforward delta detection.

**Blockers / risks:**
- Low volume (~5–10 flat announcements/year) — marginal return unless combined with other Warmińsko-Mazurskie cities.
- Flats from rewitalizacja zones (conservation areas) appear frequently — adds context interest but no parsing complexity.
- Category 139 also contains land and lease auctions — requires title-based filtering to isolate lokale mieszkalne; Polish-language regex is sufficient.
- BIP at `bip.elk.warmia.mazury.pl` appears to time out (two attempts failed) — rely on `elk.pl` primary.
- No API or RSS feed detected; polling required (~weekly cadence adequate).

**Effort rating: Medium** — two parsers (announcement + result), straightforward HTML, no auth, no OCR. The title-filtering step adds modest complexity vs. a single-type board.

**VERDICT: BUILD** — flat auctions with public achieved prices confirmed live; result notices are complete and parseable; no significant technical blockers.

---

## Sources

- Category 139 listing (LIVE): https://www.elk.pl/aktualnosci-kategorie/139/invest-sprzedaz-nieruchomosci-tryb-przetargowy
- Result notice Oct 2025 (LIVE-fetched): https://www.elk.pl/aktualnosci-wpis/9220/informacja-o-wyniku-kolejnego-przetargu-ustnego-nieograniczonego
- NaszElk auction notice Dec 2024: https://naszelk.pl/wiadomosci/przetarg-na-sprzedaz-lokali-mieszkalnych-przy-ul-3-maja-9-w-elku
- BIP nieruchomości board: https://bip.elk.warmia.mazury.pl/177/Nieruchomosci_przeznaczone_do_sprzedazy/
- BIP lokal mieszkalny (Gdańska): https://bip.elk.warmia.mazury.pl/10136/8265/Ogloszenie_pierwszego_przetargu_ustnego_nieograniczonego_na_sprzedaz_lokalu_mieszkalnego_nr_4_2C_o_pow__uzytkowej_103_2C59_m2_2C_polozonego_na_I_pietrze_w_budynku_nr_5_przy_ul__Gdanskiej_w_Elku/
- Invest-in-Ełk mirror: https://investin.elk.pl/aktualnosci-kategorie/139/invest-sprzedaz-nieruchomosci-tryb-przetargowy
- Wydział Mienia Komunalnego: https://bip.elk.warmia.mazury.pl/204/Wydzial_Mienia_Komunalnego/
