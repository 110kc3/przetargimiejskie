# Spike — Kolno (Podlaskie · powiat kolneński)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Miasto Kolno (Burmistrz) sells municipal residential flats at *ustny przetarg nieograniczony na sprzedaż* — confirmed with multiple auctions across 2021–2023. BIP is on the standard wrotapodlasia.pl platform (HTML pages, no auth). Volume is low (small city, ~10k residents) but auctions recur and a "wykaz lokali do sprzedaży" page indicates ongoing stock. Achieved-price board exists on BIP but depth is uncertain. Closest analog: any other small wrotapodlasia.pl Podlaskie city (e.g. Zambrów, Łomża).

## 1. Sells municipal property at auction?
YES — confirmed. The Burmistrz of Miasto Kolno conducts *ustny przetarg nieograniczony na sprzedaż* for residential flats (*lokale mieszkalne*):

- **Lokal nr 11, ul. 11 Listopada 6** — 1st auction July 2023 (cena wywoławcza 150 000 PLN, wadium 15 000 PLN); went unsold → 2nd auction October 2023 (cena wywoławcza 130 000 PLN, wadium 13 000 PLN). Usable area 32,89 m².
- **Lokal nr 41, ul. 11 Listopada 12** — auction in 2021 (37,90 m²; udział 3790/224000 budynku).
- A standing **"Wykaz lokali do sprzedaży"** page on BIP (`/4634573d2ce9367/dc37542055a45e4/wykaz_lokali_do_sprzed.htm`) indicates the city maintains a rolling list of flats earmarked for sale.
- Also conducts *bezprzetargowo* najem/dzierżawa (rental without tender) for existing tenants — both channels coexist, flat sales go via open auction.

Note: Do NOT confuse with **Gmina Kolno** (wiejska, Wójt) — separate entity on `bip.kolno-gmina.pl` / `bip.ug.kolno.wrotapodlasia.pl`; its auctions are land/agricultural, not city flats.

## 2. Where published? (hosts + boards, URLs)

**Announcement board (ogłoszenia przetargów):**
- Primary BIP: `https://bip-umkolno.wrotapodlasia.pl/616c955210c658b/` (newer URL form, year-organised subdirectories, e.g. `/rok-2023/`)
- Legacy BIP alias: `http://bip.um.kolno.wrotapodlasia.pl/616c955210c658b/` (same content, HTTP)
- City portal mirror: `https://www.umkolno.pl/` (news-style announcements at `/index.php?wiad=NNNN`)
- Local news amplifier: `https://kolniak24.eu/` (republishes auction notices)

**Results board (wyniki przetargów / ceny osiągnięte):**
- Results are posted back on the same BIP year-directories. A "Informacja o wyniku przetargu" page/PDF exists for resolved auctions (confirmed by search snippets referencing 2023 results). Achieved prices are present in result notices but not in a structured table — each result is a separate HTML page or inline text block.
- No dedicated "wyniki" index page found; must scrape per-entry result links.

## 3. Format + rendering

- **Platform:** wrotapodlasia.pl BIP (Podlaskie regional e-government hosting) — standard across the voivodeship.
- **Announcement pages:** HTML, static-rendered, no JavaScript SPA, no auth wall. URL pattern: `/{section_hash}/{year_subdir}/{slug}.html`.
- **Index page:** `/616c955210c658b/` lists entries as an HTML table/list with linked titles and dates — scrapable with standard HTML parsing.
- **Attachments:** Some older announcements use `.htm` (not `.html`); some include scan-PDFs for the formal ogłoszenie text. The HTML page body usually contains the key fields (address, area, cena wywoławcza, wadium, auction date) in plain text.
- **No bot blocks / login / CAPTCHA detected.** wrotapodlasia.pl sites return clean HTML.
- **OCR risk:** Low for announcements (HTML body); moderate if the formal PDF attachment is scanned — but price data is typically in the HTML body text.

## 4. Volume + achieved-price stream

- **Volume:** LOW-MEDIUM. Kolno has ~10k residents; stock of municipal flats is finite. Estimated 1–4 flat auctions per year based on observed 2021–2023 frequency. Most auctions appear to run 1–2 rounds before sale.
- **Achieved-price stream:** Present but shallow. Result notices ("Informacja o wyniku przetargu") are published on BIP after each auction and contain the achieved price (cena osiągnięta). No structured JSON feed or bulk export — each result is a separate page. Historical depth on wrotapodlasia.pl BIP typically goes back to ~2015–2020 depending on migration.
- **Price signal quality:** Useful for detecting current city flat pricing, but sample size per year is small. More valuable as completeness signal (every auction tracked) than statistical baseline.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Zambrów (Podlaskie, wrotapodlasia.pl BIP) — identical platform, same HTML structure, same URL scheme.

**Effort breakdown:**
| Component | Notes |
|---|---|
| Index scraper | wrotapodlasia.pl listing page → HTML table, trivial |
| Detail parser | Extract address, area, cena wywoławcza, wadium, date from HTML body text |
| Result linker | Match announcement to result notice (same BIP section, different entry) |
| Achieved-price extraction | HTML text block in result notice; no structured field |
| PDF fallback | If formal ogłoszenie is scan-PDF, need OCR for edge cases |
| Deduplication | Multi-round auctions (I/II przetarg) for same lokal must be deduped |

**Blockers:**
- Multi-round auctions (same flat appears as "I przetarg" then "II przetarg" after no-sale) — need canonical lokal ID by address+unit number.
- Result notices may not always be present if flat sold without result page being published (rare but possible in small offices).
- Legacy HTTP-only BIP alias may redirect or drop; use `bip-umkolno.wrotapodlasia.pl` (HTTPS) as canonical.

**Verdict: BUILD — Medium effort.** Standard wrotapodlasia.pl scrape with multi-round deduplication logic. Low volume limits value but confirms the pipeline pattern for the platform. If Zambrów adapter already exists, reuse with config pointing at Kolno's section hash.
