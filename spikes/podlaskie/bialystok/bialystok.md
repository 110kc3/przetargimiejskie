# Spike — Białystok (Podlaskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: **BUILD** (Low effort).

## TL;DR

Białystok runs a steady stream of *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* published directly on the city BIP at `bip.bialystok.pl`. Each listing is a clean server-rendered HTML page with all key fields in structured `<strong>` label/value pairs — including **Cena nabycia** (achieved price) on resolved auctions and a separate **Informacja o wyniku przetargu** PDF on unsuccessful ones. The BIP holds 2 011 total property proceedings across all time. Flat sales run roughly 1–2 per month. ZMK (Zarząd Mienia Komunalnego) does **not** handle sales — it handles only commercial lease/rental auctions; it is out of scope. The BIP adapter for Białystok is structurally identical to Kraków/Bytom: one CMS (SmartSite by BIT), one section URL, paginated listing + individual detail page, PDF attachments as supplementary.

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** The city (Prezydent Białegostoku, acting through Departament Spraw Komunalnych — DSK) sells municipal residential flats via *ustny przetarg nieograniczony* under the Act on Public Property Management. Examples live on the BIP right now:

- `ul. Juliana Tuwima 1/1 m 41` — status **Otwarty**, auction 2026-08-26
- `ul. Wierzbowa 29A m 55` — status **Otwarty**, auction 2026-08-26
- `ul. Zagórna 4 m 34` — status **Otwarty**, auction 2026-08-13

Resolved historical examples confirm full lifecycle:
- `Al. Józefa Piłsudskiego 38 m 23` — lokal mieszkalny, wywoławcza 269 500 zł, **Cena nabycia 341 600 zł**, auction 2024-01-25, status Rozstrzygnięty
- `ul. Wierzbowa 29A m 28` — lokal mieszkalny, wywoławcza 333 800 zł, auction 2025-02-27, status Nierozstrzygnięty (with "Informacja o wyniku przetargu" PDF attached)

The stream is mixed: flats, plots (działki), commercial units (lokale użytkowe), school buildings, seasonal kiosk stands. Flats appear at roughly 1–2 new listings per month based on recent page content.

**ZMK role:** ZMK (zmk.bialystok.pl) manages only *najem* (rental) of commercial units and *dzierżawa* (land lease) — no residential sales. ZMK is **not a data source** for this adapter.

---

## 2. Where published? (hosts + boards, with URLs)

| Source | Role | URL |
|---|---|---|
| City BIP — listing index | All property auction proceedings | https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci |
| City BIP — individual detail | One page per auction (HTML + PDF attachments) | e.g. `https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/{slug}.html` |
| ZMK | Commercial lease/rental only — **out of scope** | https://www.zmk.bialystok.pl/pl/lokale-uzytkowe-i-tereny/ogloszenia-o-przetargu.html |

No secondary BIP host carries flat sales. The BOSIR BIP (`bosirbip.um.bialystok.pl/przetargi_na_nieruchomosci/`) is scoped to the sports centre estate — ignore.

**Contact / publisher:** Departament Spraw Komunalnych (DSK), contact person listed on each page (e.g. Krzysztof Sadowski, tel. 85 869-60-88).

---

## 3. Format + rendering

- **Listing index:** Server-rendered HTML. CMS: SmartSite by BIT Sp. z o.o. (`cms-sapp2.um.bialystok.pl`). Pagination via JavaScript `javascript: N; return void;` — page offset is a JS call, not a query-string param. This means the paginator cannot be crawled with a simple `?page=N` pattern; requires either headless browser or reverse-engineering the underlying API that the JS calls.
- **Detail page:** Clean server-rendered HTML. Structured fields rendered as `<strong>Label</strong>` followed by value text. All key metadata is in-page (no JS required to see title, address, type, cena wywoławcza, cena nabycia, status, termin przetargu).
- **Attachments:**
  - `Ogłoszenie o przetargu (skan)` — **scanned PDF** (typically 1–2 MB) — OCR required to extract body text if needed.
  - `Ogłoszenie o przetargu (do odczytu)` — **born-digital DOC/DOCX** — machine-readable.
  - `Informacja o wyniku przetargu` — **PDF** (typically 200–400 KB) — published on failed/concluded auctions; likely scanned.
- **TLS:** Standard HTTPS, no bot block observed. No Cloudflare or auth wall encountered during live fetch.
- **Slug pattern:** `/{street-address-slugified}.html`, e.g. `ul-wierzbowa-29a-m-28.html` — predictable but not enumerable without the index.

---

## 4. Volume + achieved-price stream

- **Total index depth:** 2 011 entries across all categories (flats, plots, commercial, other) — all years.
- **Flat-sale volume estimate:** Approximately 10–20 residential flat auctions per year based on search results showing several per quarter in 2024–2025.
- **Achieved-price field:** **LIVE-VERIFIED present** — `Cena nabycia` is a named field on the detail HTML page for resolved auctions (e.g. 341 600 zł for Piłsudskiego 38 m 23). For unsuccessful auctions (Nierozstrzygnięty), a separate `Informacja o wyniku przetargu` PDF is attached — the PDF likely states that no bidder appeared; no final price is available in that case (expected).
- **Status vocabulary observed:** `Otwarty`, `Rozstrzygnięty`, `Nierozstrzygnięty`, `Zamknięty`, `Odwołany`, `Unieważnione` — all filterable via the listing form.

---

## 5. Adapter effort + verdict

**Closest analog:** Kraków (`bip.krakow.pl` przetargi section) — same SmartSite CMS family, same structured-HTML detail page, same scanned-PDF announcement + separate wynik PDF pattern.

**Effort: Low.**

Scraping plan:
1. **Listing crawl:** The JS pagination is the only real friction. Options: (a) use a headless browser (Playwright) to click through pages, or (b) intercept the XHR/fetch call the JS makes — likely a simple query-string offset call to the same base URL with a `pagination[offset]=N` param (visible in the search-filtered URL patterns already indexed by Google). The filtered URL pattern `?pagination[offset]=20&pagination[limit]=10` is already visible in search results — test whether it works without JS rendering.
2. **Detail fetch:** Plain `requests` + BeautifulSoup. Parse `<strong>` label/value pairs. Extract `Cena nabycia` when present.
3. **PDF attachments:** Download scanned announcement PDF only if body text is needed for address details not in the HTML title — likely not required since address is in the page title slug and structured fields. Skip OCR for MVP.
4. **Filter for flats:** `Przeznaczenie == "lokal mieszkalny"` on detail page; or filter listing index by address pattern (residential addresses include `m {number}`).

**Blockers:** None material. The JS pagination needs one-time reverse-engineering (30 min), then it's standard HTML scraping.

**Risks:**
- Pagination offset pattern may require JS execution if the server does not respond to bare query-string requests — mitigated by Playwright fallback.
- Scanned announcement PDFs are not machine-readable without OCR, but all critical structured data (address, price, status, achieved price) is already in the HTML detail page.
- Volume is moderate (~10–20 flats/year) — worthwhile for a city of 300 000+ people but not as dense as Kraków.

**VERDICT: BUILD.** Single clean HTML source, achieved price in-page, no auth/bot wall, low-effort adapter following the Kraków pattern.
