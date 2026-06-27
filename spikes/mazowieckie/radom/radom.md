# Spike — Radom (Mazowieckie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm, but volume too thin).

## TL;DR

Radom does run *przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej* (residential unit oral auction), but this is a sporadic, low-volume stream — only one flat-auction example found in the 2023–2026 archive (Piłsudskiego 8, June 2024). The dominant flow on bip.radom.pl is land and built/non-residential parcels. The housing manager MZL (Miejski Zarząd Lokalami) handles all municipal flat stock and the "Wnioski o sprzedaż" (flat-purchase applications) route, which is a bezprzetargowy tenant-buyout channel, not an open competitive auction. Result notices ("Informacja o wyniku") are published on bip.radom.pl as PDF attachments — but the sample PDF retrieved was non-machine-readable (scanned). Adapter effort is low-Medium IF volume were sufficient, but the thin flat-auction stream makes it a NO-BUILD until volume is verified as recurring.

---

## 1. Sells municipal property at auction?

**Yes — but predominantly land and built parcels; flat auctions are rare.**

- The city's primary auction board is at bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi (Wydział Obsługi Nieruchomości Publicznych, a department within Urząd Miejski w Radomiu).
- From the live board and archive (2010–2026), listings are heavily skewed to *nieruchomości gruntowe* (land plots) and *nieruchomości gruntowe zabudowane* (built land). Commercial/industrial land dominates the recent active listings (Toruńska dz.277/4, Kościuszki dz.27/5–27/6, Wielogórska dz.2/160, Warzywna dz.71/2–73/4, Opoczyńska dz.608/39, Wapienna dz.5/21, Wrocławska etc.).
- **One confirmed flat auction found:** "Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej nr 14 stanowiącej własność Gminy Miasta Radomia przy ul. Piłsudskiego 8" — published 20.06.2024, registration deadline 17.07.2024, completed. URL: https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi/67731,...
- An even older limited written auction for lokal mieszkalny at Kilińskiego 13 was found in 2014 (URL: https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi/27700,...).
- The MZL's "Wnioski o sprzedaż" page (https://bip.mzlradom.pl/zalatw-sprawe/wnioski-o-sprzedaz/) confirms that most flat sales go through a tenant-request route (*bezprzetargowo*), not open auction. The MZL's "WYKAZ LOKALI MIESZKALNYCH" section returned "No subpages found" — no public list of flats queued for open auction.
- Radom does NOT run a dedicated periodic flat-auction cycle comparable to Gliwice/ZGM or Bytom/ZGM patterns.

**Conclusion:** Radom sells residential units at open auction only occasionally (roughly 1 per year or less). The primary residential disposal route is bezprzetargowy.

---

## 2. Where published? (hosts + boards, with URLs)

Two systems are in play — only one is relevant for open auctions:

### Primary: Urząd Miejski w Radomiu — BIP
- **Auction board (active):** https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi
- **Auction board (page 2):** https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi?page=1
- **Archive (date-indexed by month):** https://bip.radom.pl/ra/archiwum/54,Archiwum.html
  - Archive URL pattern: `https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi?y=YYYY&m=M&archiwum=1`
  - Archive spans 2008–2026; months with activity vary.
- Result notices are published as PDF attachments on individual listing pages (e.g., "Informacja o wyniku - Piłsudskiego 8" linked from the listing page).
- Publisher: Maciej Kozik, Wydział Obsługi Nieruchomości Publicznych.

### Secondary: Miejski Zarząd Lokalami (MZL)
- **BIP:** https://bip.mzlradom.pl/
- **Physical address:** ul. Garbarska 55/57, 26-600 Radom
- **Relevant sections:** "Wnioski o sprzedaż" (tenant purchase applications), "WYKAZ LOKALI MIESZKALNYCH" (empty), "PRZETARGI NA LOKALE UŻYTKOWE" (commercial tendering for rent, not sale).
- MZL does NOT publish open residential flat auction notices on its BIP — it handles bezprzetargowy sales on request.

No third-party or regional portal (e.g., e-przetargi) appears to carry Radom flat auctions independently.

---

## 3. Format + rendering

### bip.radom.pl
- **Technology:** Server-rendered HTML (custom CMS, not WordPress). TLS: HTTPS active, cert valid. No bot blocks encountered; web_fetch succeeded immediately.
- **Listing pages:** Born-digital HTML. Each listing has a short title, date, and deadline summary in the listing index. Individual pages contain filing dates, attached PDF documents.
- **Attachments:** PDFs for announcement text + regulations + result notice. The result PDF retrieved ("Informacjaowyniku-Pilsudskiego8.pdf", 234 KB) returned no machine-readable text — likely a scanned image PDF. Announcement PDFs (ogłoszenie, regulamin) were larger (837 KB, 1.29 MB) and may also be scanned. **OCR would be required to extract achieved prices from result PDFs.**
- **Pagination:** 2 pages on active board; archive is month-by-month.
- **No JSON API, no SPA.** Static HTML pagination.

### bip.mzlradom.pl
- **Technology:** WordPress 4.9.8. Server-rendered HTML. TLS/HTTPS. No bot blocks.
- Content pages are plain WordPress pages with file attachment tables (.docx forms).

---

## 4. Volume + achieved-price stream

- **Open flat-auction volume: extremely low.** Only 1 confirmed instance in 2023–2026 (Piłsudskiego 8, 2024). A few older instances in 2013–2014.
- **Land/commercial auctions:** More regular — roughly 3–8 postings per active month across 2024–2026.
- **Achieved-price stream:** Published via "Informacja o wyniku" PDF attached to the individual listing page on bip.radom.pl. The sample PDF is a scanned document (non-machine-readable), so prices are not in born-digital text. Scraping achieved prices would require OCR.
- **No separate "wyniki" feed or table** — each result is embedded per-listing as a PDF.

---

## 5. Adapter effort + verdict

### Closest analogs
- Not analogous to Gliwice (ZGM publishes periodic flat batches with structured HTML) or Bytom (dedicated housing manager with recurring auction cycles).
- Closer to Krakow (city BIP board, land-heavy, rare flats) but even lower volume.
- Most similar to a city where the BIP is technically accessible but the flat-auction cadence is too low to sustain a feed.

### Adapter components if built
1. Crawler: simple paginated HTML scraper against bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi (2 active pages + monthly archive). Low complexity.
2. Listing parser: HTML → title/date/deadline extraction. Low complexity.
3. Attachment fetcher: download PDFs per listing. Medium complexity.
4. OCR layer: required for result PDFs (scanned). Medium–High complexity.
5. Flat filter: title-based filter for "nieruchomość lokalowa" or "lokal mieszkalny". Low complexity.

### Blockers / risks
- **Volume risk (critical):** Only ~1 flat per year at open auction. Too thin for a useful data product. The pipeline would spend most of its time returning empty.
- **PDF format risk:** Result PDFs are scanned — no born-digital price text without OCR.
- **No MZL auction feed:** MZL does not publish open flat auctions, only najem/rental and bezprzetargowy sales. No second source to supplement volume.
- **No structured result table:** Achieved prices must be parsed from individual OCR'd PDFs.

### Verdict
**NO-BUILD.** Radom's city BIP is technically accessible (server-rendered HTML, no auth, no bot-wall, HTTPS), and the format is tractable — but the open flat-auction volume is insufficient (≈1/year confirmed). The dominant residential disposal route is bezprzetargowy through MZL. Unless internal data or city contacts confirm a higher unpublished cadence, building a Radom adapter delivers near-zero flat listings for disproportionate engineering cost. Revisit if volume evidence changes.

**Effort if built anyway:** Low-Medium (HTML scraper + PDF downloader + OCR layer). No structural blockers beyond low volume and scanned PDFs.

---

## Sources
- bip.radom.pl auction board (LIVE-VERIFIED): https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi
- Archive index (LIVE-VERIFIED): https://bip.radom.pl/ra/archiwum/54,Archiwum.html
- Piłsudskiego 8 lokal nr 14 auction (LIVE-VERIFIED): https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi/67731,Pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-lokalowej-nr-14.html
- MZL BIP home (LIVE-VERIFIED): https://bip.mzlradom.pl/
- MZL "Wnioski o sprzedaż" (LIVE-VERIFIED): https://bip.mzlradom.pl/zalatw-sprawe/wnioski-o-sprzedaz/
- MZL "Wykaz lokali mieszkalnych" (LIVE-VERIFIED — empty): https://bip.mzlradom.pl/wykaz-lokali-uzytkowych/
- Kilińskiego 13 lokal nr 26 (historical, DESK): https://bip.radom.pl/ra/gospodarka-nieruchomosc/przetargi/27700,...
