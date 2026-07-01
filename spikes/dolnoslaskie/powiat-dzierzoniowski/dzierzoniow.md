# Spike — Dzierżoniów (Dolnośląskie · powiat dzierżoniowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Dzierżoniów actively auctions municipal flats at *ustny przetarg nieograniczony na sprzedaż*. Announcements appear on both a Drupal 10 city site (server-rendered HTML, easy to scrape) and a JS-SPA BIP (requires browser rendering). Result articles on the BIP are stubs pointing to small text PDFs (~27 KB) containing achieved prices. Volume is solid: ~5 auction batches/year, 4–8 lokale mieszkalne per batch. Main adapter challenge is the SPA BIP requiring headless rendering for article discovery, plus PDF parsing for the achieved-price stream.

## 1. Sells municipal property at auction?

YES — confirmed. The Burmistrz Dzierżoniowa regularly announces *ustny przetarg nieograniczony* for lokale mieszkalne. Two separate auction campaigns documented in 2025 alone:

- **March 2025 batch**: 4 lokale mieszkalne (Nowowiejska 164, Os. Błękitne 9c, Słowiańska 1, Ząbkowicka 58) — auction dates 30.04.2025 and 14.05.2025.
- **May 2025 batch**: 8 lokale mieszkalne (Pocztowa 11a, Mostowa 8, Kopernika 27, Kilińskiego 8, Nowowiejska 164 again, Os. Błękitne 9c, Słowiańska 1, Ząbkowicka 58) — auction dates 18.06.2025 and 25.06.2025.
- **Result batches confirmed**: Sept 10, Sept 17, Sept 24, Oct 1, Nov 19, Nov 26, Dec 17, 2025; Jan 14, 2026 — each with a published wyniki article + PDF.

Also confirmed: gmina wiejska Dzierżoniów (separate entity, ug.dzierzoniow.pl) runs bezprzetargowy sales too, but that is a different gmina. Spike is for gmina miejska only.

## 2. Where published? (hosts + boards, URLs)

**Announcement board (primary — city site, easy HTML):**
- `https://dzierzoniow.pl/aktualnosci/przetargi-na-lokale-mieszkalne` — Drupal 10 news articles, server-rendered, no JS needed, full flat details inline.
- Individual auction news articles under `/aktualnosci/przetargi-*` — each lists all flats in the batch with area, KW number, auction time, wadium, and BIP deep-link.

**Announcement board (canonical — BIP SPA):**
- `https://bip.um.dzierzoniow.pl/m,48,ogloszenia-o-przetargach.html` — JS-SPA (React or similar), returns empty HTML to web_fetch; needs Chrome/Playwright to load article list.
- Individual BIP articles: `https://bip.um.dzierzoniow.pl/a,{id},{slug}.html` — also SPA-rendered; contain structured property details + optional PDF attachments.

**Results board:**
- `https://bip.um.dzierzoniow.pl/o,63,wyniki-przetargow.html` — SPA list page, confirmed live via Chrome; articles titled "Wyniki przetargów z dnia DD.MM.YYYY".
- Each result article (e.g. `/a,34645,wyniki-przetargow-z-dnia-14-stycznia-2026.html`) is a stub body with **one PDF attachment** (e.g. `rozstrzygnięcie przetargów z 14.01.2026.pdf`, ~27 KB). Achieved prices are inside the PDF.

## 3. Format + rendering

| Source | Format | Rendering | Notes |
|---|---|---|---|
| `dzierzoniow.pl` news articles | Drupal 10 HTML | Server-rendered, no JS | Full flat details inline as structured text; easy requests+BeautifulSoup |
| BIP article list pages (`/m,*` and `/o,*`) | JS SPA | Requires Playwright/Selenium | Empty on `requests`; confirmed via Chrome MCP |
| BIP individual articles (`/a,*`) | JS SPA | Requires Playwright/Selenium | Empty on `requests` |
| Wyniki PDF attachments | Text PDF (~27 KB, small) | Standard PDF text extraction | pdfplumber/pdfminer likely sufficient; not scanned |

**No auth, no bot blocks observed.** BIP is open-access SPA. The PDF size (26–27 KB) suggests machine-generated text PDF, not scanned image — OCR not needed.

## 4. Volume + achieved-price stream

- **Announcement volume**: ~5 batches/year × ~4–8 flats = ~20–40 flat auction events/year.
- **Result cadence**: result articles published roughly every 2–4 weeks through the auction season (confirmed: 8 result articles in Sept 2025 – Jan 2026 window, ~one every 3 weeks).
- **Achieved price**: published in PDF attached to result articles on BIP `/o,63,wyniki-przetargow.html`. PDF text is small and machine-generated (high confidence). The achieved-price stream requires: poll BIP results list (SPA) → detect new result article → download PDF → extract price.
- **Alternate path for announcements**: city Drupal site (`dzierzoniow.pl`) is fully scrape-friendly and may be sufficient for the announcement side without touching the BIP SPA. Deep-links to BIP individual articles are present for detail enrichment.

## 5. Adapter effort + verdict

**Closest analog**: Legnica or Wałbrzych pattern — Drupal city site for announcements, BIP SPA with PDF results.

**Components needed:**
1. **Announcement scraper**: `requests` + BeautifulSoup on `dzierzoniow.pl/aktualnosci/przetargi-*` — LOW effort. Alternatively Playwright on BIP `/m,48`.
2. **BIP SPA result-list poller**: Playwright to load `/o,63,wyniki-przetargow.html`, extract article links — MEDIUM effort (shared Playwright infra amortises this).
3. **PDF parser**: download PDF from result article, extract achieved price with pdfplumber — LOW effort (text PDF, small, consistent format likely).
4. **Property ID matching**: link result PDFs back to announcement entries by address/KW — MEDIUM effort (needs fuzzy matching or rely on consistent address strings).

**Blockers:** None hard. BIP SPA is the only friction — mitigated if Playwright is already in the stack.

**Verdict: BUILD — Medium effort.**
The announcement side is trivially scrape-friendly via the Drupal city site. The achieved-price stream requires Playwright for BIP SPA navigation + PDF text extraction, but both are standard patterns. Volume (~20–40 auctions/year) justifies the build.
