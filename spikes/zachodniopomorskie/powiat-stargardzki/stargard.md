# Spike — Stargard (Zachodniopomorskie · powiat stargardzki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina-Miasto Stargard actively sells municipal flats at *przetarg ustny nieograniczony* via its housing manager **Stargardzkie TBS Sp. z o.o.** (ul. Andrzeja Struga 29). Auctions run continuously — ~6–10+ flat auctions per year — with both announcements and result notices (achieved prices) published in machine-readable HTML. Two complementary scrape targets: `tbs.stargard.pl` (announcements + full flat details) and `bip.stargard.eu` (official result notices with achieved prices). No auth, no bot blocks observed. Closest analog: **Bytom** (TBS-delegated, dual-URL scrape pattern).

---

## 1. Sells municipal property at auction?

**YES — confirmed flat auctions, ustny nieograniczony.**

Gmina-Miasto Stargard (TERYT: 3212011) auctions communal flats via open unlimited oral auction. Confirmed examples (LIVE-VERIFIED):

- **Aleja Gryfa 15/1** — III przetarg ustny nieograniczony, 52.83 m², cena wywoławcza 221 000 zł, data: 13 sierpnia 2026 r. (I przetarg 14.04.2026, II 08.06.2026)
- **ul. Lechicka 1/4** — III przetarg ustny nieograniczony (active 2026)
- **ul. Bydgoska 22/5** — III przetarg ustny nieograniczony (active 2026)
- **ul. Jugosłowiańska 29/4** — III przetarg ustny nieograniczony (active 2026)
- **ul. Hugona Kołłątaja 7/2** — I przetarg na sprzedaż (active 2026)
- **ul. Szczecińska 28B/11** — I przetarg na sprzedaż (active 2026)
- **ul. Czarnieckiego 11/8** — I przetarg na sprzedaż (active 2026)
- **ul. Jana Kochanowskiego 6/3** — I przetarg 27.05.2025, 41.60 m², confirmed sold
- **ul. Zwycięzców 5/7** — II przetarg, 14.80 m², October 2025
- **ul. Mickiewicza 27/7** — I rokowania na sprzedaż (post-failed-auction negotiations, 2026)
- **ul. Kościuszki 35/5** — II rokowania, 14.38 m², 24.04.2026 (result notice Wynik095/2026)

Result notice counter reached **Wynik102/2026** by 15 June 2026, indicating ~100+ auction results across all property types in 2026 alone. Flat-specific auctions represent a meaningful sub-stream.

The gmina does NOT rely purely on *bezprzetargowe* tenant sales — open public auctions are the standard mechanism. Flats that fail I and II przetarg proceed to *rokowania* (negotiations) but still published openly.

---

## 2. Where published? (hosts + boards, URLs)

**Two complementary publication venues:**

### Announcements (ogłoszenia)
- **Primary:** `https://tbs.stargard.pl/rodzaj-nieruchomosci/przetargi/` — dedicated "Przetargi" category on Stargardzkie TBS website; sub-filtered by `Lokale mieszkalne` + `GMINA` + `Na sprzedaż`
- **Flat-specific feed:** `https://tbs.stargard.pl/rodzaj-nieruchomosci/lokale-mieszkalne/` and `https://tbs.stargard.pl/wlasciciel-nieruchomosci/gmina-miasto-stargard/`
- **Press notice:** also published in *Głos Szczeciński* (print, not scrapeable)

### Result notices (wyniki — achieved prices)
- **Primary:** `https://bip.stargard.eu/22358` — "Wyniki przetargów" board on city BIP (`bip.stargard.eu`)
- **BIP nieruchomości hub:** `https://bip.stargard.eu/22229` — top-level with sub-tabs: Wykazy / Ogłoszenia / Wyniki przetargów
- **BIP ogłoszenia:** `https://bip.stargard.eu/22232` — announcement mirrors (secondary)

### Operator / organizer
- Stargardzkie Towarzystwo Budownictwa Społecznego Sp. z o.o. (STBS) acts as the auction-conducting agent on behalf of Prezydent Miasta Stargard. All physical auctions take place at ul. Andrzeja Struga 29, Stargard. Contact: 91 819-24-45.

---

## 3. Format + rendering

### tbs.stargard.pl (announcements)
- **WordPress 7.0** CMS — standard server-rendered HTML, no SPA
- Listing page: paginated card grid, each card = `<article>` with title, category tags (Lokale mieszkalne / GMINA / Na sprzedaż / Przetargi), image/placeholder
- Individual announcement page: structured HTML with key fields rendered as labeled blocks:
  - POWIERZCHNIA (m²), WARTOŚĆ NIERUCHOMOŚCI (zł), DATA PRZETARGU (date + time)
  - Full legal text inline (ustawa references, parcel numbers, księga wieczysta data)
  - PDF attachment link (full official announcement PDF)
  - Photo gallery (JPEG images)
  - Additional info contact block
- **No auth, no bot block observed.** No JavaScript rendering required — all content in static HTML response.
- Pagination: standard WordPress pagination (`/page/2/`, `/page/3/` etc.)

### bip.stargard.eu (result notices)
- Custom BIP CMS — server-rendered HTML
- Listing page: flat list of links with Symbol (Wynik0XX/YYYY) + date + summary text
- Pagination: 7 pages visible (100+ results total for 2026)
- Individual result notice: linked document with achieved price text (e.g. "odbyły się II rokowania na sprzedaż lokalu mieszkalnego nr 5 … pow. użytkowej 14,38 m2")
- **No auth required.** Accessible without cookies beyond standard cookie consent.

### PDF attachments (on tbs.stargard.pl)
- Official announcement PDFs linked per listing (e.g. `aleja-Gryfa-15-1-Ogloszenie-lokal-mieszkalny-III-P-2026.pdf`)
- These appear to be text PDFs (machine-generated, not scanned) — OCR not required
- HTML page contains all essential structured data; PDF is supplementary

---

## 4. Volume + achieved-price stream

- **BIP result counter:** Wynik102/2026 by 15 June 2026 (~102 results across all types in ~5.5 months = ~18/month overall)
- **Flat-specific volume:** From visible TBS listing: 7+ active flat auction announcements on first page alone (June 2026); repeat przetargi (I→II→III→rokowania) indicate ongoing churn
- **Achieved price location:** Result notices on `bip.stargard.eu/22358` contain free-text descriptions; the achieved price is embedded in the document body (not a structured field), requiring text extraction. Example: Wynik095/2026 describes the rokowania result for flat at Kościuszki 35/5 with full legal description but price typically stated as "cena osiągnięta" in the linked document.
- **No separate "achieved price" structured field** — price must be parsed from result notice document text. This is the same pattern as most Polish BIP implementations.
- Estimated flat auction volume: **~15–25 flat auctions per year** (based on visible active listings + historical cadence)

---

## 5. Adapter effort + verdict

### Closest analog
**Bytom** — dedicated housing manager (TBS-model) publishing via its own website + city BIP for results. Dual-source scrape required: TBS site for announcements, BIP for result notices.

### Architecture
Two scrapers needed:
1. **tbs.stargard.pl scraper** — WordPress REST-friendly, paginate `/rodzaj-nieruchomosci/przetargi/page/N/`, filter by `GMINA MIASTO STARGARD` + `Lokale mieszkalne` + `Przetargi` taxonomy tags, extract structured fields from detail pages
2. **bip.stargard.eu scraper** — paginate `/22358/strona/N/` (7 pages), parse result notice list, follow document links to extract achieved price text

### Blockers / risks
- **No single structured source** — announcements and results live on different domains requiring join by property description (address + parcel number), not a unique ID
- **Result price in free text** — regex/NLP extraction needed from result notice body; not a clean structured field
- **Repeat przetargi** — same flat appears as I, II, III przetarg + rokowania entries; deduplication logic required (keyed on parcel number / KW number)
- **PDF as official record** — the HTML page is machine-readable but the legally authoritative text is in the PDF attachment; for compliance use the PDF
- **No API / RSS** — pure HTML scraping; change in WordPress theme or BIP template would break selectors

### Positives
- No auth, no bot protection, no SPA rendering
- WordPress pagination is predictable
- BIP result numbering (Wynik0XX/YYYY) enables incremental scraping
- TBS WordPress site has clean category taxonomy enabling reliable filtering
- High and consistent volume — city is actively selling communal flats

### Effort estimate
**Medium** — 2 scrapers with different HTML structures, result-to-announcement join logic, free-text price extraction, deduplication for repeat auctions. ~3–5 days implementation.

### Verdict
**BUILD** — Stargard has confirmed, active, high-volume flat auction stream via *przetarg ustny nieograniczony*, published in accessible HTML on two complementary sources (TBS site + city BIP), with no technical blockers. The dual-source join and dedup logic adds complexity but is tractable.

---

### Sources
- Stargardzkie TBS — Przetargi: https://tbs.stargard.pl/rodzaj-nieruchomosci/przetargi/
- Stargardzkie TBS — Lokale mieszkalne: https://tbs.stargard.pl/rodzaj-nieruchomosci/lokale-mieszkalne/
- Stargardzkie TBS — Gmina Miasto Stargard: https://tbs.stargard.pl/wlasciciel-nieruchomosci/gmina-miasto-stargard/
- Stargardzkie TBS — example flat listing (Aleja Gryfa 15/1, III przetarg, 13.08.2026): https://tbs.stargard.pl/ogloszenia/lokal-mieszkalny-aleja-gryfa-15-1-iii-przetarg-na-sprzedaz/
- BIP Urząd Miejski Stargard — Wyniki przetargów: https://bip.stargard.eu/22358
- BIP Urząd Miejski Stargard — Nieruchomości hub: https://bip.stargard.eu/22229
- BIP Urząd Miejski Stargard — Przetargi (main): https://bip.stargard.eu/5853
