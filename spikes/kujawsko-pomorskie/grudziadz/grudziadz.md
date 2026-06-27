# Spike — Grudziądz (Kujawsko-Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Grudziądz (96k residents, city-county) runs a steady open flat-auction stream: the Prezydent publishes *przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych* on the city BIP (`bip.grudziadz.pl`). The board has 614 entries (announcements + notices mixed, dating back to 2008) with several flat lots confirmed in 2024–2026. The BIP is server-rendered HTML (list page), but every individual announcement body is a DOC/PDF attachment — no inline price data. Result notices ("informacja o wyniku przetargu") appear to live in the same section but were not separately indexed in the visible top-25 results; they are presumably deeper in the 614-entry archive. The municipal housing manager MPGN (Miejskie Przedsiębiorstwo Gospodarki Nieruchomościami) has its own BIP at `bip.mpgn.grudziadz.com.pl` covering MPGN-owned stock, but the main flat-auction stream is Prezydent-driven via the city BIP. Volume is low-to-moderate (estimated ~6–12 flat lots/year based on search finds): ul. Libelta 10 appeared at least 5× (1st–5th attempt) across 2024–2025, and ul. Rybackiej 27C appeared at least 5× across 2025–2026, suggesting persistent re-auctioning.

---

## 1. Sells municipal property at auction?

**YES — confirmed.** Grudziądz's President (Prezydent Grudziądza) conducts *przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych* (open oral auctions for residential flat sales). Confirmed examples:

- **ul. Libelta 10, lokal nr 5** — 1st auction 05.07.2024, 2nd–5th repeated through 03.03.2025 (5 rounds, suggesting the flat struggled to sell).
- **ul. Libelta 10A, lokal nr 5** — 1st auction 18.02.2025.
- **ul. Rybackiej 27C, lokale nr 4 i 6** — 1st auction 18.02.2025 → 5th auction 04.09.2025 (2 units, 5 rounds).
- **ul. Żeromskiego 3, lokal nr 5** — 5th auction 02.06.2026.
- **ul. Rybackiej 27C, lokale nr 4 i 6** — restarted as "pierwsze" again 29.06.2026 (new round after failed prior cycle).

The city also sells land and built properties (niezabudowane / zabudowane nieruchomości), but residential flats are clearly part of the auction mix. Some flats also go *bezprzetargowo* (non-competitive, e.g. "w drodze bezprzetargowej") — this is visible in the Gospodarka Nieruchomościami section — but the open-auction stream exists and is ongoing.

**Sources:**
- https://bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci (LIVE-VERIFIED, 614 entries)
- https://bip.grudziadz.pl/strony/36857.dhtml (5th auction, Rybacka, 04.09.2025)
- https://bip.grudziadz.pl/strony/35069.dhtml (5th auction, Libelta 10, 03.03.2025)
- https://bip.grudziadz.pl/strony/32901.dhtml (1st auction, Libelta 10, 05.07.2024)

---

## 2. Where published? (hosts + boards, with URLs)

**Primary — city BIP (Urząd Miejski w Grudziądzu):**

- **Main BIP host:** https://bip.grudziadz.pl (current, canonical)
- **Legacy mirror:** https://grudziadz-bip.alfatv.pl (older BIP system, same data, still resolves, used for older records)
- **Auction board — sprzedaż nieruchomości:** https://bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci
  - Contains both announcements and result notices mixed together (614 total entries as of 2026-06-27)
- **Gospodarka Nieruchomościami (property management notices + wykazów):** https://bip.grudziadz.pl/artykul/gospodarka-nieruchomosciami
  - 1,915 entries; includes sales lists, lease notices, bezprzetargowe sales — broader property activity

**Secondary — MPGN BIP (housing manager):**

- **MPGN BIP:** https://www.bip.mpgn.grudziadz.com.pl
- **MPGN sprzedaż nieruchomości:** https://www.bip.mpgn.grudziadz.com.pl/19,sprzedaz-nieruchomosci
- **MPGN przetargi:** https://www.bip.mpgn.grudziadz.com.pl/redir,przetargi
- MPGN (sp. z o.o., ul. Curie-Skłodowskiej 5-7) manages the city's housing stock and also sells flats — their BIP archives go back to 2013. Role: primarily asset manager/lessor, but some sales of MPGN-owned stock.

**Note:** Result notices ("informacja o wyniku przetargu / informacja z przeprowadzonej kwalifikacji") are published in the same `sprzedaz-nieruchomosci` board, not in a separate section. One such notice was visible at the top of the live list on 2026-06-24 ("Informacja z przeprowadzonej kwalifikacji...").

---

## 3. Format + rendering

**List page (`bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci`):**
- Server-rendered HTML, LIVE-VERIFIED.
- Pagination is JS-controlled (25 items per "page"); `?strona=N` parameter is ignored server-side — the server always returns the same top 25 items. Full archive requires JS pagination click-through or scraping via browser automation.
- Each row: title string + date (ISO-like: `YYYY-MM-DD HH:MM:SS`). No inline price, address structured data, or area figures.

**Individual announcement pages:**
- Server-rendered HTML shell with title, metadata (author, dates), and an attachment block.
- **Body text is NOT inline** — the full announcement (price, area, cadastral data, wadium amount, auction date/time/location) is contained only in a **downloadable DOC or PDF attachment**.
- Example confirmed: `bip.grudziadz.pl/strony/36857.dhtml` → "Załączniki do pobrania: 31_07_2025 … 2. ogloszenie (DOC, 130.50Kb)".
- No JSON API, no structured data endpoint detected.
- TLS: HTTPS active, no authentication required, no bot-block encountered (Chrome MCP loaded pages successfully).

**MPGN BIP:** separate system (`bip.mpgn.grudziadz.com.pl`) — similar HTML structure, not tested in depth.

---

## 4. Volume + achieved-price stream

**Volume (estimated):**
- Total board: 614 entries across all property types since 2008.
- Flat lots visible in recent scrape (2024–2026): ~4–5 distinct units in multiple auction rounds. Likely ~4–10 flat auction events per year.
- Volume is **low-to-moderate** and significantly lower than a city like Kraków or Gliwice. Many flats go through 4–5 rounds before selling (or not selling), which inflates the count of entries per unit.

**Achieved-price stream:**
- Result notices ("informacja o wyniku przetargu") appear to be published in the **same board** as announcements (confirmed: one kwalifikacja notice visible at top of live list).
- However, the achieved price is almost certainly **in the DOC/PDF attachment only**, not inline in the HTML notice title.
- No separate "wyniki" section found. No JSON/API endpoint for prices confirmed.
- **Risk:** achieved prices require downloading and parsing binary DOC/DOCX files per notice — this is the main data-extraction friction point. Word documents in Polish BIP systems typically contain structured tables with cena wywoławcza, cena osiągnięta, nabywca, etc., but OCR/DOCX parsing is required.

---

## 5. Adapter effort + verdict

**Closest analog:** **Bytom** or **Zabrze** — city BIP with HTML list + DOC attachments, moderate volume, no dedicated housing-manager auction stream separate from city BIP, repeated-round auctions on slow-selling units.

**Adapter design:**
1. Scrape `bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci` with JS pagination (Playwright/browser-automation required to click through all 25 pages, or find the underlying API call).
2. Filter entries with "lokal mieszkalny" in title to isolate flat announcements and result notices.
3. Per entry: fetch detail page → extract attachment URL → download DOC/DOCX → parse with python-docx or LibreOffice headless conversion to extract: address, area, cena wywoławcza, wadium, auction date. For result notices: extract cena osiągnięta.
4. Deduplicate by unit (address + lokal nr) across multiple auction rounds.

**Blockers / risks:**
- JS pagination (no server-side page param) → browser automation needed for full archive.
- All price data in DOC binary attachments → DOCX parsing step mandatory; occasional PDF scan possible.
- Low flat volume (~4–10 lots/year) — thin data stream relative to engineering effort.
- Result notices appear mixed with announcements in the same board, with no reliable title prefix pattern yet confirmed for "wynik" (needs deeper archive scan).
- MPGN BIP may add a parallel stream but its volume and format are unconfirmed (only 2013–2014 archival pages found).

**Effort:** Medium (JS pagination + DOCX parsing = 2 non-trivial components; city BIP structure is otherwise straightforward).

**VERDICT: BUILD** — open flat-auction stream confirmed, ongoing as of 2026, city BIP accessible without auth. Low volume reduces data value but doesn't block implementation. Primary risk is DOCX parsing for prices; acceptable given the stream is real and legally mandated to publish results.
