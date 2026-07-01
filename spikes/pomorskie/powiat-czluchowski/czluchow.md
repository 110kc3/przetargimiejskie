# Spike — Człuchów (Pomorskie · powiat człuchowski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miejska Człuchów sells municipal flats (lokale mieszkalne) at *I przetarg ustny nieograniczony* — confirmed across 2024, 2025, and 2026. Results ("Informacja o wynikach przetargu") are published as separate PDFs on the same BIP article — but all PDFs are scanned images requiring OCR. Volume is low (1–2 flat auctions/year). The main blocker is scanned-PDF parsing; no SPA, no auth, no bot blocks.

## 1. Sells municipal property at auction?

Yes — both streams confirmed:
- **Ustny przetarg nieograniczony (flat sales):** confirmed in 2024 (ul. Dąbrowskiego 3/6), 2025 (ul. Zamkowej 15/8), 2026 (ul. Zamkowej 15/8 again — results already posted 2026-06-26). Each announcement names the flat explicitly as "lokal mieszkalny" in the auction title.
- **Bezprzetargowo na rzecz najemców:** parallel stream — regular "Wykaz lokali mieszkalnych, przeznaczonych do zbycia w drodze bezprzetargowej" lists are also published, but these are tenant pre-emption sales, not open auctions.

Both streams coexist; the auction stream is the target.

## 2. Where published? (hosts + boards, URLs)

| Role | URL |
|---|---|
| Announcement + results board | `https://bip.czluchow.pl/artykul/przetargi-nieruchomosci` |
| 2026 annual folder | `https://bip.czluchow.pl/artykul/2026-2029` |
| 2025 annual folder | `https://bip.czluchow.pl/artykul/2025-2027` |
| 2024 annual folder | `https://bip.czluchow.pl/artykul/2024-2` |
| Example flat auction article (2026) | `https://bip.czluchow.pl/artykul/i-przetarg-ustny-nieograniczony-na-sprzedaz-dzialki-nr-136-38-w-czluchowie-przy-ul-bratkowej-ob` |
| City news mirror | `https://czluchow.eu/aktualnosc/przetargi-na-sprzedaz-lokali-i-nieruchomosci` |

BIP platform: custom CMS at `bip.czluchow.pl` (not eSesja, not BIP-USOS). Yearly sub-folders, paginated list of 25 articles per page. Each auction = one article with one or two PDF attachments.

- **Announcement PDF:** `/pliki/czluchow/pliki/ogloszenie_przetarg-YYYYMMDD.pdf`
- **Results PDF:** `/pliki/czluchow/pliki/informacja_o_wynikach_przetargu-YYYYMMDD.pdf`

No separate "wyniki" index page — results PDF is attached to the same announcement article (article gets updated after the auction date).

## 3. Format + rendering

- **Article page:** server-rendered HTML — accessible to plain HTTP GET, no JS required to read the article list or article body.
- **PDFs:** all are **scanned image PDFs** (version 1.4; `pdftotext` extracts only 1–4 bytes of whitespace — zero machine-readable text). Both the announcement (4 pages, ~488 KB) and the results (1 page, ~69 KB) are scanned.
- **OCR required** for both announcement details (address, surface area, starting price, date) and achieved price.
- No SPA, no authentication, no bot-protection observed. BIP pages render cleanly via HTTP.

## 4. Volume + achieved-price stream

- **Volume:** approximately 1–2 flat auctions per year (2024: 1 flat; 2025: 1 flat; 2026: 1 flat so far). Low volume.
- **Achieved-price stream:** published on BIP as "Informacja o wynikach przetargu" PDF attached to the same article, typically within days of the auction. Example: auction published 2026-05-15, results PDF posted 2026-06-26. One page, scanned.
- The results PDF for the June 2026 flat auction (Zamkowej 15/8) is already available — confirms the city publishes results promptly.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** any other small Pomorskie city with scanned-PDF BIP (e.g. Miastko pattern — if spiked).

**Effort breakdown:**
- BIP index scraper: trivial — paginated HTML list, stable URL pattern `/artykul/20XX-YYYY`
- Article parser: moderate — detect flat auction articles by title keyword ("lokal mieszkalny"), extract PDF attachment URLs
- **OCR pipeline: main blocker** — both announcement and results PDFs are scanned; need Tesseract/Google Vision pass to extract address, floor area, price wywoławcza, cena osiągnięta
- Results linkage: easy — results PDF is attached to the same article (article updated post-auction); no separate results board to scrape

**Blockers:**
1. Scanned PDFs — OCR mandatory, adds latency and error rate
2. Low volume (1–2/year) — marginal signal for monitoring; worth including if OCR pipeline already exists from other cities

**Verdict: BUILD (Medium effort)** — flat auctions at ustny przetarg nieograniczony are confirmed live. The only non-trivial work is the OCR layer. If the project already has a scanned-PDF OCR adapter, this is Low effort.
