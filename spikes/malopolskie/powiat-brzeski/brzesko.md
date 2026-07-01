# Spike — Brzesko (Małopolskie · powiat brzeski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Brzesko (Urząd Miejski) directly publishes flat-sale auctions as *publiczny nieograniczony przetarg ustny na zbycie lokalu mieszkalnego* on its own portal `brzesko.pl`. Confirmed: 3 rounds of ustny przetarg nieograniczony for 3 residential units (ul. Mickiewicza 68a) between 2020–2021. Announcements are clean server-rendered HTML with full structured text (prices, dates, wadium amounts) and a PDF download link per notice. No dedicated housing manager — the Wydział Geodezji i Zarządzania Mieniem at the Urząd Miejski runs all property transactions. The "Ogłoszenia Nieruchomości" blog (42 pages) mixes flats, land, lease, and use-permits, so signal-to-noise requires keyword filtering but there is no scraping barrier. Achieved-price data is not posted as a separate result notice on the portal — the notices only state the outcome (positive/negative) in the body of the *next* round announcement. Low-to-medium volume (estimated 1–4 flat lots per campaign, campaigns appear ad hoc).

## 1. Sells municipal property at auction?
YES — confirmed ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych. Explicitly documented:
- 1st round: 30.10.2020 — 3 lokale mieszkalne at ul. Mickiewicza 68a, ceny wywoławcze 160 300 / 215 000 / 212 500 PLN.
- 2nd round: 17.03.2021 — same 3 units (1st ended negatywnie).
- 3rd round: 20.08.2021 — same 3 units (2nd ended negatywnie).
Also active: ustny przetarg nieograniczony for land (nieruchomość gruntowa in Mokrzyska, 2026-06-03 – 2026-08-28). The flat series appears to be opportunistic (clearing specific buildings), not a continuous rolling programme. Recent 2026 "Ogłoszenia Nieruchomości" page (fetched 2026-06-30) shows land sales and leases but no flat auction currently active — consistent with a batch/campaign pattern.

## 2. Where published? (hosts + boards, URLs)
- **Primary portal:** `https://www.brzesko.pl/blog/5,ogloszenia-nieruchomosci` — "Ogłoszenia Nieruchomości" blog section; 42 pages of paginated entries.
- **Secondary board:** `https://bip.malopolska.pl/umbrzeska` — regional BIP host for Urząd Miejski Brzesko. The portal itself links BIP for some content but property notices appear natively on brzesko.pl.
- **Contact / responsible unit:** Wydział Geodezji i Zarządzania Mieniem, Urząd Miejski w Brzesku, ul. Bartosza Głowackiego 51, tel. (14) 68-65-170.
- No dedicated housing manager (ZGM/TBS) publishing property sales separately.
- Result notices (wynik przetargu / info o osiągniętej cenie): NOT posted as standalone items. Outcome embedded in subsequent-round announcement text ("Pierwszy przetarg odbył się … i zakończył się wynikiem negatywnym."). No structured achieved-price feed found.

## 3. Format + rendering
- **HTML** — standard server-rendered pages (WebImpuls CMS). Full text of each announcement is inline HTML, no JavaScript required, no auth wall.
- **PDF download** available per notice (`/aktualnosc/pdf/<id>`) but redundant given HTML is fully parseable.
- **Pagination:** `brzesko.pl/blog/5,ogloszenia-nieruchomosci/strona/N` — up to page 42. Standard incrementing pattern.
- No scanned PDFs, no SPA, no bot protection observed.
- Entry list page shows title + 2-line excerpt; detail page has full structured text including: lokal number, surface area (m²), KW number, cena wywoławcza, wadium, auction date/time/place, bank account for wadium.

## 4. Volume + achieved-price stream
- **Flat auction volume:** Low-to-medium. Only one building (Mickiewicza 68a, 3 units) confirmed over 2020–2021. No flat auction observed in 2022–2026 range reviewed. Campaign-style, not monthly.
- **Achieved price:** NOT published as a structured data point. The portal only states positive/negative outcome in the next-round notice. To capture achieved price would require either: (a) monitoring for Zarządzenie notes / notarial records, or (b) leaving achieved price as NULL and accepting incomplete data.
- **Land/commercial volume:** Higher — several land przetargi per year visible on the same feed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** Any small Małopolska city using a simple CMS blog for nieruchomości notices (similar to e.g. Wieliczka or Myślenice pattern — paginated HTML blog, no auth).
- **Adapter tasks:**
  1. Paginate `brzesko.pl/blog/5,ogloszenia-nieruchomosci/strona/N` until no new entries.
  2. Filter entries by keyword: "lokal mieszkalny" + "przetarg ustny" in title/excerpt.
  3. Fetch detail page, parse: lokal nr, pow. m², KW, cena wywoławcza, wadium, data przetargu.
  4. No achieved-price stream available — store NULL or scrape later if BIP zarządzenia are added.
- **Blockers:** None for scraping. Achieved-price gap is a data quality issue, not a technical blocker. Volume is low so value-per-adapter is limited.
- **Effort:** Medium (pagination + keyword filter + HTML parser; no OCR, no auth). Low if achieved-price is accepted as NULL.
- **Verdict:** BUILD — confirmed flat auction type, clean HTML, no blocks. Low cadence reduces priority but the pipeline pattern is straightforward.
