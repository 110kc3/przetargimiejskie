# Spike — Starachowice (Świętokrzyskie · powiat starachowicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Starachowice (city = powiat-seat, ~50k residents) conducts regular *ustny przetarg nieograniczony* auctions for both **lokale mieszkalne** and land/commercial property, published directly by the Urząd Miejski (Referat Geodezji i Zarządzania Nieruchomościami). No separate housing manager (ZGM/MZGM/TBS) — the city hall runs sales itself. The authoritative public-facing board is **starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi** with 21 paginated listing pages (8 articles/page ≈ 160+ entries going back several years). Announcement texts are clean HTML articles; result notices link out to PDF documents hosted on bip.um.starachowice.pl. The BIP (bip.um.starachowice.pl) hosts the underlying zarządzenia and PDFs but its CMS returns empty HTML to non-browser fetchers — the city portal mirror is the scraping target.

---

## 1. Sells municipal property at auction?

**YES — confirmed for lokale mieszkalne.**

Multiple live examples found:

- *Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24* — 46,00 m², cena wywoławcza 260 000 PLN, przetarg 10.02.2026 r. [LIVE-VERIFIED — article fetched directly]
- *Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 przy ul. Majówka 8* — starting price 140 000 PLN, przetarg 28.05.2025 r.
- *Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24*
- *Trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Majówka 26A/14*
- *Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej przy ul. Piotra Wysockiego* (BIP ref mnu6=2881)

Flat sales are full open-market *ustny przetarg nieograniczony*, not bezprzetargowy to tenants. City also sells land plots (ul. Smugowa, Leśna, Wiśniowa, Szkolna, Kościuszki) and occasionally leases.

The authorising legal form is a *Zarządzenie Prezydenta Miasta* (e.g. Zarządzenie nr 644/2025 z 17.12.2025 for Majówka 24/17), published as PDF on BIP.

---

## 2. Where published? (hosts + boards, URLs)

Two publication channels, same content mirrored:

### Primary scraping target — city portal
- **Listings (announcements + result notices):** https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi
  - Paginated: `?page=N` from 1 to 21 (as of 2026-06-27), 8 articles per page
  - Article URLs: `https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/{slug}.html`
  - Example flat announcement: https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-17-polozonego-w-starachowicach-przy-ul-majowka-24.html

### Secondary — BIP (bip.um.starachowice.pl)
- **Przetargi section (tablica ogłoszeń):** https://bip.um.starachowice.pl/index.php?type=4&name=vb&func=selectsite&value%5B0%5D=mnu6&value%5B1%5D=1060&value%5B2%5D=selectsite&value%5B3%5D=0&value%5B4%5D=0
- BIP hosts PDFs: zarządzenia (full legal text) + "informacja o wyniku" PDFs with achieved price
  - PDF URL pattern: `https://bip.um.starachowice.pl/bip/54_umstarachowice/fckeditor/file/Tablica%20ogloszen/NAP/GN/2023/[...]/{filename}.pdf`
- **BIP CMS returns empty HTML to non-browser fetchers** — requires JS/cookie rendering. PDFs also return empty via web_fetch.

### Result notices
- Published as articles on the city portal (same board, tagged "Informacja o wyniku ...") with a link to the PDF on BIP for the full achieved-price record.
- Example: https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci.html (Dec 2024, land at Piłsudskiego — result "pozytywny", full info via PDF link)

---

## 3. Format + rendering

| Layer | Format | Notes |
|-------|--------|-------|
| City portal listings page | **HTML** (server-rendered, SmartSite by BIT Sp. z o.o.) | Clean, no JS required, web_fetch returns full content LIVE-VERIFIED |
| Individual announcement articles | **HTML** | Full auction text inline — address, area, cena wywoławcza, date, wadium, contact. Structured text, no tables. |
| Zarządzenia (full legal text) | **PDF** on BIP | web_fetch returns empty — needs Chrome/Playwright |
| "Informacja o wyniku" (result notice) | Short HTML article (portal) + **PDF** on BIP | HTML article confirms positive/negative result; PDF has achieved price detail |
| BIP CMS pages | **Blocked** to non-browser fetchers | Empty response confirmed on two different BIP page URLs |

No auth, no bot-blocks on the city portal. BIP CMS pages are cookie/JS-dependent. Achieved price is in the BIP-hosted PDFs — those are blocked to simple web_fetch; would need Playwright or Chrome MCP to retrieve.

---

## 4. Volume + achieved-price stream

**Volume (estimated):**
- 21 pages × 8 articles/page = ~168 entries total on the przetargi board (announcements + results, going back several years)
- Flat auctions observed: at minimum Majówka 8/5, Majówka 24/17, Majówka 26A/14, Piotra Wysockiego (lokal), suggesting a cluster of units at ul. Majówka in particular — a municipal housing block being systematically sold off
- Multiple rounds per unit (I, II, III przetarg) are common — indicates some units require multiple attempts
- Mix with land/plot auctions (Leśna, Smugowa, Szkolna, Wiśniowa, Kościuszki, Lachy, Podgórze) — rough estimate: flats are ~20-30% of total volume, i.e. ~5–10 flat auctions/year

**Achieved-price stream:**
- Result articles posted on same board with "PRZETARG POZYTYWNY" or "PRZETARG NEGATYWNIE" thumbnails — positive/negative outcome visible from listing page itself
- Full achieved price in linked BIP PDF (e.g. `Informacja o wyniku I przetargu Piłsudskiego.pdf`)
- **Risk:** PDFs on BIP are not accessible via simple HTTP fetch — scraper would need Playwright to extract achieved price from PDFs, OR scrape just the HTML article (positive/negative outcome only, no price figure)

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry or Bytom pattern — city-hall-direct publication, SmartSite/BIT CMS, paginated HTML listing with article slugs, result PDFs on BIP.

**Adapter design:**
1. Crawl paginated listing: `GET starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/przetargi.html?page={n}` — parse 8 article cards per page, detect flat auctions by title keyword (`lokal mieszkalny`)
2. Fetch individual article HTML — extract: address, lokal nr, area (m²), cena wywoławcza, przetarg date, wadium, round number
3. For result notices: parse HTML article for positive/negative outcome; follow BIP PDF link for achieved price (Playwright required for price extraction)
4. Pagination: stop when page returns no new articles or hits a known-processed date cutoff

**Blockers / risks:**
- BIP CMS blocks non-browser fetchers — zarządzenia PDFs and result-notice PDFs are inaccessible via web_fetch. Workaround: city portal HTML article is sufficient for announcement data; achieved price requires Playwright against BIP PDF URLs.
- URL slugs are human-readable but long and inconsistent — no numeric ID in the city portal URL, requires title parsing to identify flat vs. land auctions
- SmartSite CMS is standard across many Polish city portals (BIT Sp. z o.o.) — pattern is reusable across other cities using the same platform

**Effort:** Medium — city portal scrape is straightforward HTML; the complication is extracting achieved price from BIP PDFs (Playwright + PDF text extraction layer needed). If achieved price is out of scope for v1, effort drops to Low.

**VERDICT: BUILD** — Gmina Starachowice clearly sells lokale mieszkalne via open ustny przetarg nieograniczony, publishes on a clean HTML board, and has active volume (multiple flat auctions observed in 2024–2026). Achieved-price stream exists but requires PDF handling. Confidence: High.

---

### Sources
- City portal przetargi board (LIVE-VERIFIED): https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi
- Flat auction article — Majówka 24/17 (LIVE-VERIFIED): https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-17-polozonego-w-starachowicach-przy-ul-majowka-24.html
- BIP przetargi section: https://bip.um.starachowice.pl/index.php?type=4&name=vb&func=selectsite&value%5B0%5D=mnu6&value%5B1%5D=1060
- BIP flat auction (lokal Piotra Wysockiego): https://bip.um.starachowice.pl/index.php?type=4&name=vb&func=selectsite&value%5B0%5D=mnu6&value%5B1%5D=2881
- BIP flat auction (lokal Majówka 8/5): https://bip.um.starachowice.pl/index.php?func=selectsite&name=vb&type=4&value%5B0%5D=mnu6&value%5B1%5D=4542
- Result notice article example (Dec 2024): https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci.html
- City portal przetargi page 5 (Dec 2025 listings, LIVE-VERIFIED): https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/przetargi.html?page=5
