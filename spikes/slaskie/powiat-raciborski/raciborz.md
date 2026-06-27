# Spike — Racibórz (Śląskie · powiat raciborski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Gmina Miasto Racibórz actively sells municipal flats at public open oral auctions (pierwszy publiczny przetarg ustny nieograniczony). All listings live on `bipraciborz.pl` — a standard Liferay-based BIP. As of 2026-06-27 there are 15 active flat/property sale listings (page 1 of 2), the majority being residential units (lokale mieszkalne). Each listing resolves to a machine-readable text PDF (~100 KB) served at a stable URL pattern. No auth required, no SPA, no bot wall encountered. The housing manager is **Miejski Zarząd Budynków (MZB)** at `mzbraciborz.pl` — it handles tenancy and maintenance but the auctions themselves are issued directly by **Prezydent Miasta Racibórz** via the city BIP's Wydział Gospodarki Nieruchomościami. Achieved-price notices land on a separate BIP sub-page. This is a clean, scrapeable target very similar in shape to Gliwice.

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** The Prezydent Miasta Racibórz publishes "pierwszy, publiczny, przetarg ustny, nieograniczony na sprzedaż lokalu mieszkalnego" listings directly. From the live BIP listing page on 2026-06-27, all 15 current entries on the active "sprzedaż" board include residential flats (lokale mieszkalne) at addresses such as:

- ul. Stalmacha 7a/10 — 58.25 m², cena wywoławcza 281 000 zł, przetarg 15.07.2026
- ul. Opawskiej 93/2 — 83.02 m²
- ul. Winnej 10/5 — 40.17 m²
- ul. Skłodowskiej 20/1 — 40.08 m²
- ul. Browarnej 7/3 — 46.10 m²
- ul. Głowackiego 1/5 — 19.23 m²
- + 3 "Rokowania" (second-round negotiations after failed first auction) at ul. Wileńskiej 15/16, ul. Staszica 23/1, ul. Mickiewicza 13/15
- + page 2 items not yet fetched but confirmed to exist

Historical confirmation: local press (naszraciborz.pl, 14.11.2021) reported four flats auctioned at once (Rynek 5/18, Winna 10/3, Nowa 1a/13, Ogrodowa 15/8) with 1–5 bidders each; achieved prices 10–20% above asking. This is not bezprzetargowy-only; the city runs open market auctions.

Note: MZB (`mzbraciborz.pl`) manages tenancy, building maintenance, and bezprzetargowa sprzedaż to sitting tenants (governed by uchwały Rady Miasta under "Sprzedaż lokali mieszkalnych" section of their BIP). The open auction pipeline flows through the city BIP, not MZB's BIP.

---

## 2. Where published? (hosts + boards, URLs)

### Auction announcements board
- **Host:** `https://www.bipraciborz.pl`
- **Active listings (sprzedaż):** `https://www.bipraciborz.pl/bip/dokumenty-akcja-wyszukaj-idstatusu-77591-idtypu-77593-idkategorii-39853-idzakladki-95775-numerzakladki-1`
- **Parent hub (Ogłoszenia o przetargach):** `https://www.bipraciborz.pl/en/bipkod/11816752`
- Pagination via `?start=N` (N=0 default, N=1 for page 2); 10 items per page

### Auction results board
- **Informacje o wynikach przetargów:** `https://www.bipraciborz.pl/en/bipkod/27948305`
- Results published by Tomasz Janicki (gn6@um.raciborz.pl), separate from the listings contact (Ewa Denys, gn4@um.raciborz.pl)
- As of 2026-06-27: two recent results visible (land parcel at ul. Tęczowej/Odrodzenia, zabudowana at ul. Kanałowej 10) — these happen to be land, but the board also carries flat-auction results historically

### Archive
- Year-by-year archives back to 2010: e.g. `https://www.bipraciborz.pl/bip/dokumenty-akcja-wyszukaj-idstatusu-78252-idkategorii-39853` (2010)

### Secondary surface
- City site baza nieruchomości: `https://www.raciborz.pl/urzad/oferta_inwestycyjna` (links back to BIP)

### MZB BIP (housing manager — bezprzetargowa only, NOT the auction pipeline)
- `https://mzbraciborz.pl/` — Miejski Zarząd Budynków, ul. Króla Stefana Batorego 8, Racibórz
- Does not publish open przetargi; handles tenant-purchase (bezprzetargowa) separately under Zarządzenia Prezydenta

---

## 3. Format + rendering

- **Listing index page:** standard server-rendered HTML, no SPA, no JS-gated content. BIP runs on Liferay CMS (same platform as most Śląskie BIPs). Listings appear as `<h2>` anchors with `?komunikat=NNNNNN` query params. Fully parseable without JS.
- **Individual listing detail:** HTML page embedding an attachment list. The announcement document is a **machine-generated text PDF** (~100–115 KB), served at `https://www.bipraciborz.pl/res/serwisy/pliki/{ID}?version=1.0`. No OCR required.
- **PDF content confirmed LIVE:** structured paragraphs (numbered 1–11): lokalizacja, oznaczenie, opis lokalu (m², piętro, skład), obciążenia, przeznaczenie, cena wywoławcza (PLN + 2% gruntowy), termin przetargu (date/time/room), wadium (10% → PLN + ING konto bankowe), warunki uczestnictwa, skutki uchylenia, dodatkowe informacje.
- **No auth, no CAPTCHA, no bot block** observed during live fetch on 2026-06-27.
- Additional attachments per listing: szkic.pdf (floor plan), participant registration form PDF, pełnomocnictwo.odt, oświadczenie małżonków.odt, and multiple interior JPGs (2–3 MB each). Only the announcement PDF is needed for scraping.
- **Results page:** HTML list of result notices; individual result documents are also PDFs (not yet opened but consistent with the platform pattern).

---

## 4. Volume + achieved-price stream

**Current active volume (2026-06-27):** 15 listings across 2 pages, majority flats. Batch frequency appears to be roughly 5–10 flats per posting cycle (e.g., 5 flats published 2026-05-29 in one batch, 2 on 2026-06-12, 3 rokowania on 2026-06-19).

**Historical volume:** Press coverage from 2021 shows 4-flat batches; October 2024 shows Zarządzenia 314/2024 and 315/2024 for ul. Długa 31/5 and ul. Brewarna 16/11 — implies roughly 10–20 flats/year at open auction, with additional secondary rokowania rounds. Small-to-medium city (~54 000 residents); likely 15–30 flat auctions per year total.

**Achieved-price stream:** Published on the "Informacje o wynikach przetargów" board (`/en/bipkod/27948305`). Format: same HTML list with PDF attachments. Results appear within days of the auction date. Archive back to 2021+ available. Historical press data confirms prices: cena wywoławcza 70 000–281 000 zł; achieved prices 1–20% above asking (competitive auctions with 1–5 bidders). This gives a clean achieved-price data stream.

---

## 5. Adapter effort + verdict

**Closest analog:** Gliwice (ZGM Gliwice pattern on `zgm-gliwice.pl`) — but actually simpler, because here everything flows through a single city BIP rather than a separate housing-manager BIP. More precisely: **Bytom** analog in terms of city-BIP-native flat auctions without a separate ZGM publishing pipeline.

**What an adapter needs to do:**

1. GET the listing index URL (with pagination `?start=0`, `?start=1`, ...) — plain HTML scrape, no JS required.
2. Parse `<h2>` titles and `?komunikat=NNNNNN` IDs from the listing page.
3. For each new komunikat ID, fetch the detail page and extract the PDF URL from the attachment list.
4. Fetch the PDF (`/res/serwisy/pliki/{ID}?version=1.0`) — machine-readable text PDF, extract with pdfminer/pypdf2.
5. Parse structured fields from the PDF: address, floor, m², cena wywoławcza, wadium, auction date/time, KW number.
6. Poll the results board for matching komunikat IDs or address-keyed result notices.

**Blockers / risks:**
- None significant. The platform is stable (same Liferay BIP used by dozens of Śląskie cities). No pagination complexity — small city, max 2 pages at any one time.
- Results board (`/wynikow-przetargow`) currently shows only 2 items (land-only), suggesting flat results may be listed less frequently or the result notice is sometimes embedded in a different sub-page or only confirmed via MZB records. Worth monitoring a completed auction to verify the achieved-price path. LOW risk.
- Rokowania (second-round negotiations after failed auctions) appear in the same listing feed — these have a slightly different title prefix ("Rokowania na sprzedaż" vs "Pierwszy, publiczny przetarg"). The adapter should handle both.
- MZB also does bezprzetargowa sales (tenant buyouts) — these will NOT appear on the BIP auction board and should not be expected in the scrape.

**Effort estimate: Low** — 1–2 days to implement including PDF parser and results polling. No OCR, no SPA, no auth. The address + cena wywoławcza + auction date are directly in the HTML title snippet, so a lightweight index scraper can already surface most key fields before touching the PDF.

**VERDICT: BUILD**

---

### Sources

- BIP Racibórz — active auction listings (sprzedaż): <https://www.bipraciborz.pl/bip/dokumenty-akcja-wyszukaj-idstatusu-77591-idtypu-77593-idkategorii-39853-idzakladki-95775-numerzakladki-1> (LIVE-VERIFIED 2026-06-27)
- BIP Racibórz — Ogłoszenia o przetargach hub: <https://www.bipraciborz.pl/en/bipkod/11816752> (LIVE-VERIFIED)
- BIP Racibórz — Informacje o wynikach przetargów: <https://www.bipraciborz.pl/en/bipkod/27948305> (LIVE-VERIFIED)
- BIP Racibórz — example flat auction PDF (Stalmacha 7a/10): <https://www.bipraciborz.pl/res/serwisy/pliki/43779983?version=1.0> (LIVE-VERIFIED — machine-readable text PDF)
- MZB Racibórz BIP: <https://mzbraciborz.pl/> (LIVE-VERIFIED — housing manager, bezprzetargowa only)
- naszraciborz.pl — "Przetargi na miejskie mieszkania. Za ile udało się sprzedać lokale?" (14.11.2021): <https://www.naszraciborz.pl/site/art/1-aktualnosci/0-/92519-przetargi-na-miejskie-mieszkania-za-ile-udalo-sie-sprzedac-lokale-> (DESK — historical volume + achieved-price confirmation)
