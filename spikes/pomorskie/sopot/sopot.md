# Spike — Sopot (Pomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Sopot's Prezydent Miasta publishes *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* directly on the city BIP (`bip.sopot.pl`), managed by **Wydział Gospodarki Nieruchomościami** (not a separate housing manager). Active flat sale confirmed live on 2026-06-24. Volume is low — roughly 1–3 municipal flat auctions per year — but price points are very high (resort city, ~7 000–7 300 zł/m² asking for distressed stock, market avg ~18 000 zł/m²). Achieved-price data is published as attached DOCX/PDF to each BIP article, not inline HTML. No auth/bot block observed. Closest analog: **Krakow** (single BIP, HTML articles with file attachments, low volume flat sales mixed with land).

---

## 1. Sells municipal property at auction?

**YES — confirmed, flat sales via ustny przetarg nieograniczony.**

Live evidence (LIVE-VERIFIED via Chrome MCP, bip.sopot.pl retrieved 2026-06-27):

| Date published | Title (BIP) | Notes |
|---|---|---|
| 2026-06-24 | *I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 przy ul. Armii Krajowej 61* | Active, not yet closed |
| 2023-07-06 | *przetarg ustny nieograniczony na zbycie nieruchomości — 2 lokale mieszkalne, Al. Niepodległości 851* | Cena wywoławcza: 334 000 zł + 373 000 zł; both units described as uninhabitable (structural damage) |
| 2018-08-21 | *I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3A, ul. Gen. Sikorskiego 9* | Cena wywoławcza: 850 000 zł; 116,56 m², 4 rooms |

Also confirmed: the BIP przetargi index has **~110 archived entries** (11 pages × 10 items), going back to at least 2011. Most entries are najem (rental) of lokale użytkowe and garages; flat sales appear at roughly **1–3 per year**.

Flat sales are *not* bezprzetargowe to tenants — they go to open public auction (ustny nieograniczony). Sopot's remaining municipal flat stock is small (high-value resort city); this matches the low annual frequency.

Organiser shown in BIP metryka and adradar: **Urząd Miasta Sopotu / Prezydent Miasta Sopotu**. Department handling details: **Wydział Gospodarki Nieruchomościami**, pok. 113/116, II piętro, tel. (58) 521-38-28/29.

No evidence of a separate housing manager (ZGM, TBS, etc.) running municipal flat auctions.

---

## 2. Where published? (hosts + boards, URLs)

### Primary source — BIP Sopot

- **Przetargi index (live):** https://bip.sopot.pl/m,107,przetargi.html
- **Article example — active flat 2026:** rendered under above index, slug pattern `bip.sopot.pl/a,{id},{slug}.html`
- **Article example — flat 2023 (adradar):** https://przetargi.adradar.pl/przetarg/mieszkania/Sopot/miasto/11681908 (mirrors BIP content)
- **Wykazy nieruchomości** (pre-auction property lists): https://bip.sopot.pl/m,117,wykazy-nieruchomosci.html
- **Wydział Lokalowy BIP page:** https://bip.sopot.pl/m,42,wydzial-lokalowy.html

### Result notices (achieved price)

Wynik przetargu is published as an **attached file** (DOCX or PDF) appended to the same BIP article after the auction concludes. Confirmed on the 2017 land sale article (`bip.sopot.pl/Article/get/id,18273.html`): attachment "Wynik przetargu" (DOCX, 227 KB). The achieved price is therefore inside a downloadable DOCX — **not parseable from HTML alone**.

Direct attachment download URL pattern: `https://bip.sopot.pl/e,pobierz,get.html?id={file_id}`

### Secondary aggregators (read-only monitors, useful for backfill)

- **Adradar monitor:** https://przetargi.adradar.pl/p/a/74437/Sopot/a (9 pages; shows gmina + komornik + spółdzielnia mixed)
- **ListaPrzetargow.pl:** https://listaprzetargow.pl (indexed the 2018 flat and 2022 spółdzielnia auctions)

---

## 3. Format + rendering

| Aspect | Detail |
|---|---|
| BIP engine | Custom NV CMS (`bip.sopot.pl`, React/SPA shell) |
| Article rendering | **JavaScript-rendered SPA** — `web_fetch` returns empty shell; requires browser (Chrome MCP) or JS execution |
| Article content once rendered | Clean structured HTML with labeled table rows (Forma zbycia, Przeznaczenie, Cena wywoławcza, Wadium, Termin, etc.) |
| Attachment format for wynik | **DOCX** primary, PDF secondary — achieved price buried in attachment, not inline |
| Auth / bot block | None observed. BIP loads cleanly in Chrome; no CAPTCHA, no login |
| Pagination | 10/20/30/40/50 per page; page param in URL; 11 pages of archive |
| Archive toggle | "POKAŻ ARCHIWALNE" — click/JS toggle; `?method=getOutdated` param does not work (returns same live list) |

Scraping approach needed: **headless browser** (Playwright/Puppeteer) or Chrome MCP to render the SPA, then parse article HTML. Wynik DOCX must be downloaded and parsed separately (python-docx or similar) to extract achieved price.

---

## 4. Volume + achieved-price stream

- **Flat auction volume (gmina only):** ~1–3 per year. Low but consistent since at least 2018.
- **Price range observed:**
  - 334 000–373 000 zł (2023, two distressed units, Al. Niepodległości 851, ~51–58 m²)
  - 850 000 zł (2018, 116 m² flat, ul. Sikorskiego 9)
  - 2026 current: ul. Armii Krajowej 61, lokal nr 1 (price not yet retrieved)
- **Market context:** Sopot avg market price ~18 000 zł/m² (ListaPrzetargow data 2025–2026); municipal auction starting prices for distressed stock ~6 500–7 300 zł/m² — substantial discount, which drives bidder interest.
- **Achieved-price stream:** Available via DOCX attachments on each closed BIP article. Not available inline in HTML. No dedicated results page on BIP. Adradar and ListaPrzetargow do not publish achieved prices (only asking price).

---

## 5. Adapter effort + verdict

### Closest analog
**Krakow** — single city BIP, SPA-rendered, HTML articles with file attachments for results, mixed flat/land/commercial, low-to-medium flat volume.

### Effort breakdown

| Component | Effort |
|---|---|
| Scraper: BIP index (SPA) | Medium — needs headless browser; pagination straightforward |
| Scraper: article parser | Low — structured HTML table once rendered |
| Wynik (achieved price) | Medium-High — must download DOCX attachment per article, parse with python-docx; format varies (free-text, not tabular) |
| Archive crawl (backfill) | Low — 11 pages, stable URL structure |
| Deduplication | Low — each flat is a distinct article with unique ID |

**Overall: Medium effort.** The SPA requirement rules out plain HTTP scraping. The DOCX-for-results pattern is the main friction point — same as Krakow's PDF-attachment pattern but slightly easier (DOCX is more parseable than scanned PDF).

### Blockers / risks
1. **Wynik in DOCX, not HTML** — achieved price requires download + DOCX parse; format is free-text so regex/heuristic needed, not structured extraction.
2. **SPA rendering** — all BIP pages require JS execution; standard `requests` will get an empty shell.
3. **Low volume** — only 1–3 flat auctions/year makes Sopot a thin signal source; adapter effort is fixed regardless of volume.
4. **No separate results board** — no dedicated "wyniki przetargów nieruchomości" section; results are co-located with the original announcement as file attachment.

### Verdict
**BUILD** — Sopot does run genuine open flat auctions (ustny nieograniczony, not bezprzetargowy), publishes them on a stable BIP URL, and the format is parseable with a headless-browser adapter. The low volume (1–3/year) means Sopot is a tier-2 city for this project (worth including, not a priority). Achieved-price extraction requires DOCX parsing which adds one extra step vs. pure-HTML cities. No auth/bot blocks.

**Confidence: Medium** — flat auction existence confirmed LIVE (2026-06-24 active listing + 2023 archived listing with full details). Volume estimate (1–3/year) is based on BIP archive scan and adradar page count; a full archive crawl would refine this.
