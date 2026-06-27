# Spike — Cieszyn (Śląskie · powiat cieszyński)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Cieszyn (urban gmina, seat of powiat cieszyński) runs a clear stream of *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* published on the city BIP at `bip.um.cieszyn.pl`. The BIP runs Logonet CMS 2.9.0 — the same stack as Bytom, Zabrze, and Jelenia Góra. Flat auctions are NOT bezprzetargowy-dominant: open oral auctions for flats are confirmed across 2024–2026 with I/II/III przetarg re-auction sequences visible. Municipal housing manager **ZBM** (Zakład Budynków Miejskich Sp. z o.o.) manages the communal stock but does not publish auctions — all auction notices and result notices flow exclusively through the city BIP via Wydział Gospodarki Nieruchomościami. Format is server-rendered HTML index with inline structured table data per entry, plus PDF attachments. Result notices (wynik) are linked per record but expire from BIP after ~30 days per Polish statute. No auth, no bot block observed.

---

## 1. Sells municipal property at auction?

**Yes — confirmed flat-auction stream.** The gmina publishes *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* via its BIP. Confirmed examples (LIVE-VERIFIED from BIP listing page):

- **ul. Wyższa Brama 11/6** — I przetarg 26.11.2025 (cena wywoławcza 152 000 zł); II przetarg 04.03.2026 (cena wywoławcza 76 000 zł — price reduced after failed first auction)
- **ul. Górna 14/4** — III przetarg 06.08.2025 (cena wywoławcza 160 000 zł)
- **pl. św. Krzyża 1/13** — II przetarg 21.07.2025 (cena wywoławcza 300 000 zł)
- **ul. Przykopa 13/2** — I przetarg 04.06.2024, II przetarg 25.09.2024, III przetarg 21.01.2025 (three attempts, cena wywoławcza 80 000 zł each)
- **ul. Bielska 3/4** — przetarg 26.09.2024 (cena wywoławcza confirmed, result notice linked)
- **ul. Olszaka 1/11** — przetarg (2024)
- **ul. Limanowskiego 3/8** — przetarg (2024)

I/II/III przetarg re-listing sequences are clearly evidenced (Przykopa 13/2 had three rounds; Wyższa Brama 11/6 had two). This is an active, recurring open-auction product — NOT bezprzetargowy-only.

**BIP also dedicates a named sub-article** to flat auctions specifically: `bip.um.cieszyn.pl/artykuly/1221/przetargi-na-lokale-mieszkalne`.

**Housing manager:** ZBM (Zakład Budynków Miejskich Sp. z o.o., ul. Liburnia 2a, Cieszyn; `zbm.cieszyn.pl`). ZBM manages the communal housing stock and holds a *prawo użytkowania* on each flat until sale. However, ZBM does **not** publish flat-sale auctions — it only lists *najem lokali użytkowych* (commercial lease) tenders on its own site. All flat-sale auctions are published by **Wydział Gospodarki Nieruchomościami UM Cieszyna** directly on the city BIP.

---

## 2. Where published? (hosts + boards, URLs)

### Primary source — city BIP

| Board | URL | Content |
|---|---|---|
| Nieruchomości przetargi index | https://bip.um.cieszyn.pl/przetargi-nieruchomosci/1/15 | All property tenders (flats, land, commercial, lease); paginated 15/page; 21 pages as of 2026-06-27 |
| Lokale mieszkalne dedicated view | https://bip.um.cieszyn.pl/artykuly/1221/przetargi-na-lokale-mieszkalne | Flat-auction-specific sub-page (article list) |
| Przetargi nieruchomości (article hub) | https://bip.um.cieszyn.pl/artykuly/493/przetargi-nieruchomosci | Parent navigation node |
| Aktualne przetargi | https://bip.um.cieszyn.pl/artykuly/494/2/10/aktualne-przetargi | Current/active tenders only |
| Zakończone przetargi | https://bip.um.cieszyn.pl/artykul/495/5848/cieszyn-ul-frysztacka-155 | Closed/resolved tenders board |
| Result notices (wynik) | Linked per record (e.g. `bip.um.cieszyn.pl/artykul/21/{id}/informacja-o-wyniku-…`) | Published per-auction post-result; valid for ~30 days per BIP statute |

BIP root: https://bip.um.cieszyn.pl/  
CMS: Logonet Sp. z o.o. (Bydgoszcz), version 2.9.0. (confirmed from page footer)

### Secondary / ZBM

- https://zbm.cieszyn.pl/ — ZBM manages communal housing stock but does NOT publish flat-sale auctions. Only commercial lease tenders are listed there. Not a data source for this adapter.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| Index page | Server-rendered HTML (Logonet CMS 2.9.0). Structured table per entry: Adres nieruchomości, Przetarg na (title), Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu. Paginated (`/przetargi-nieruchomosci/{page}/15`). Filterable by type, property kind, year, status via form. No JS required to render listing. |
| Detail page | Server-rendered HTML article. Contains: structured metadata table (address, auction type, property type, cena wywoławcza, date), full announcement text (description, wadium, conditions), "Rozstrzygnięcie" section linking to the wynik article, PDF attachments (announcement PDF + property photos + floor plan). |
| Result notice (wynik) | Separate HTML article at `/artykul/21/{id}/…`. Contains text confirming outcome and achieved price. Expires ~30 days post-auction per statute. Not permanently accessible — result data must be scraped within the window. |
| Attachments | Born-digital PDFs (announcement ~100–270 kB) + JPG photos (2–3 MB each). PDF is text-extractable (not scanned). |
| XML export | Each detail record has an XML link (`/przetarg-nieruchomosci/xml/{id}/1`) but testing showed it errors (page unavailable) — not a reliable data channel. |
| TLS | HTTPS, valid cert. |
| Auth | None. |
| Bot blocking | None observed. Logonet BIP serves static-ish HTML. |
| RSS | Available at `bip.um.cieszyn.pl/rss` (untested for nieruchomości category filtering). |

---

## 4. Volume + achieved-price stream

**Volume (2024–2026, sample from index page 1, 15 entries):**
- Flat auctions visible: at least 7 distinct *lokal mieszkalny* entries on page 1 alone across 2024–2026 (out of 15 entries which also include land/commercial/lease).
- Total index depth: 21 pages × ~15 entries = ~315 entries going back to at least 2011 (year selector shows 2011 as earliest).
- Flat-auction cadence: approximately 4–8 flat auctions per year based on visible samples — smaller volume than large cities like Bytom or Jelenia Góra, consistent with Cieszyn's population (~35 000).
- Re-auction sequences (I/II/III przetarg) inflate entry count — Przykopa 13 alone generated 3 entries for one flat.

**Achieved-price stream:** YES — result notices ("Informacja o wyniku przetargu") are published per auction as a separate BIP article linked from the detail record's "Rozstrzygnięcie" section. Standard Polish auction-result format includes cena wywoławcza and cena osiągnięta (achieved price). However, these articles expire from BIP after ~30 days. The achieved price is therefore available only within the post-auction window. The detail record itself does NOT embed the achieved price — it only links to the wynik article. This means the adapter must poll proactively or scrape wynik articles before expiry.

**Confirmed example:** Przykopa 13/2, III przetarg 21.01.2025 — result article URL `bip.um.cieszyn.pl/artykul/21/38587/informacja-o-wyniku-iii-ustnego-przetargu-nieograniczonego-ktory-odbyl-sie-w-dniu-21-stycznia-2025-r-o-godz-11-00-…` (article expired by 2026-06-27, consistent with the ~30-day statutory window).

---

## 5. Adapter effort + verdict

### Closest analog

**Tarnowskie Góry / Bytom** — same Logonet CMS 2.9.0, same HTML index-table structure per entry, same detail-page pattern. Key difference from Jelenia Góra: Cieszyn's structured data is partially inline in the HTML table (address, type, cena wywoławcza, date) without requiring PDF extraction for the announcement itself. The wynik (achieved price) does require fetching a time-limited separate article — same pattern as many Polish BIPs. Volume is lower than Bytom/Gliwice (Cieszyn ~35k pop.), making it a low-maintenance adapter once built.

### Effort breakdown

| Task | Estimate |
|---|---|
| Index scraper (paginated HTML, filter for `lokal mieszkalny`) | 0.5 day — straightforward BeautifulSoup; filtering by Rodzaj nieruchomości dropdown state or in-page data |
| Detail-page parser (extract fields + wynik link) | 0.5 day — structured HTML table, no PDF needed for announcement fields |
| Wynik/result article fetcher + achieved-price extraction | 1 day — must schedule polling within 30-day window; parse HTML text for cena osiągnięta |
| Re-auction dedup (I/II/III przetarg tracking) | 0.5 day |
| Test harness + CI integration | 0.5 day |
| **Total** | **~3 days** |

### Blockers

- **Time-limited wynik articles**: achieved-price data expires ~30 days post-auction. Adapter must poll the result URL within the window or the price is lost. This is a scheduling/operational constraint, not a scraping difficulty.
- **No XML API**: `/przetarg-nieruchomosci/xml/{id}/1` errors out — cannot use as diff-polling channel. Must rely on HTML index.
- **Lower volume**: ~4–8 flat lots/year means sparse data; may need to pull all property types and filter, or use the dedicated `/artykuly/1221/` flat-specific page.

### Risks

- Low: Logonet CMS is consistent across Polish BIPs; stable since at least 2011 in Cieszyn.
- Low: No bot protection, no auth.
- Low: Born-digital PDFs (photos and floor plans) are supplementary — core data is in HTML.
- Low–Medium: Result articles expire; if poller misses a window, achieved price is permanently lost (no archive observed). Mitigated by daily polling schedule.

### Verdict

**BUILD** — confirmed flat-auction stream, Logonet CMS stack (same as built analogs), HTML-structured data inline, no access barriers. Lower volume than Bytom/Gliwice but viable. Medium effort mainly due to time-limited wynik articles requiring proactive polling.

---

## Sources

- BIP Cieszyn (główna): https://bip.um.cieszyn.pl/
- Przetargi nieruchomości index: https://bip.um.cieszyn.pl/przetargi-nieruchomosci/1/15
- Przetargi na lokale mieszkalne (dedicated): https://bip.um.cieszyn.pl/artykuly/1221/przetargi-na-lokale-mieszkalne
- Przetargi nieruchomości (hub): https://bip.um.cieszyn.pl/artykuly/493/przetargi-nieruchomosci
- Aktualne przetargi: https://bip.um.cieszyn.pl/artykuly/494/2/10/aktualne-przetargi
- Example detail — ul. Przykopa 13/2 (III przetarg): https://bip.um.cieszyn.pl/przetarg-nieruchomosci/37994/iii-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-polozonego-w-budynku-przy-ul-przykopa-13
- Example detail — ul. Bielska 3/4: https://bip.um.cieszyn.pl/przetarg-nieruchomosci/37310/ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-4-polozonego-na-i-pietrze-w-budynku-nr-3-przy-ul-bielskiej-w-cieszynie
- Example detail — ul. Wyższa Brama 11/6: https://bip.um.cieszyn.pl/przetarg-nieruchomosci/40241/ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-6-polozonego-w-budynku-nr-11-przy-ul-wyzsza-brama
- Wynik article example (expired): https://bip.um.cieszyn.pl/artykul/21/38587/informacja-o-wyniku-iii-ustnego-przetargu-nieograniczonego-ktory-odbyl-sie-w-dniu-21-stycznia-2025-r-o-godz-11-00-w-siedzibie-urzedu-miejskiego-w-cieszynie
- ZBM Cieszyn (housing manager, not auction source): https://zbm.cieszyn.pl/
