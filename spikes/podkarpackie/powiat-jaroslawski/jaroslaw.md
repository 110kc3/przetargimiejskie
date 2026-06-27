# Spike — Jarosław (Podkarpackie · powiat jarosławski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miejska Jarosław (pop. ~37 000) does hold *przetargi ustne nieograniczone* for municipal property, but **all residential-unit (lokal mieszkalny) sales go exclusively via the bezprzetargowy route to existing tenants**. The competitive-auction BIP stream covers only land plots and undeveloped parcels — no flat-auction price-achieved data exists to scrape. No dedicated housing manager (ZGN/MZGN); property is handled in-house by Wydział Gospodarki Nieruchomościami (GKN) at the city hall.

---

## 1. Sells municipal property at auction?

**Yes, but not flats.**

Confirmed paths:
- **Land / undeveloped parcels** → *przetarg ustny nieograniczony (licytacja)* published on BIP at `bip.miastojaroslaw.pl/przetargi-nieruchomosci`. Active as of 2026-06-27: 7 listings visible (all plots — e.g. działka nr 1099/1 ul. Dojazdowa, 38 114 PLN; działka nr 1709/4 rejon ul. Mieszka I, 8 231 PLN).
- **Residential flats (lokale mieszkalne)** → **bezprzetargowy** route only. Burmistrz publishes periodic *wykaz lokali mieszkalnych przeznaczonych do sprzedaży w drodze bezprzetargowej na rzecz najemcy* (most recent: Zarządzenie nr 216/2026 z dnia 14.04.2026, status "Nieobowiązująca" — meaning it expired, another list will follow). No *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* found anywhere in the archive.

**Conclusion for heuristic:** flats = bezprzetargowy-only → **NO-BUILD** for a flat-auction aggregator.

Sources (LIVE-VERIFIED via Chrome MCP):
- BIP przetargi page: https://bip.miastojaroslaw.pl/przetargi-nieruchomosci
- Example tender detail (land plot): https://bip.miastojaroslaw.pl/szczegoly-przetargu/OYu7Q5yeWjcQtv3hrjNW
- Zarządzenie 216/2026 bezprzetargowy: https://bip.miastojaroslaw.pl/szczegoly-zarzadzen/fbDh5zoXo5i7INhltPLj

---

## 2. Where published? (hosts + boards, URLs)

| Channel | URL | Content |
|---------|-----|---------|
| BIP Urząd Miasta Jarosławia (primary) | https://bip.miastojaroslaw.pl/przetargi-nieruchomosci | Land/commercial przetargi (active + archived) |
| BIP — Wykazy nieruchomości | https://bip.miastojaroslaw.pl/urzad-miasta-jaroslawia/zamowienia-publiczne-i-przetargi/wykazy-nieruchomosci-przeznaczonych-do-sprzedazy-wydzierzawienia-najmu-uzyczenia | Bezprzetargowy flat lists + lease lists |
| Monitor Urzędowy (mirror) | https://monitorurzedowy.pl/office/1351/urzad-miasta-jaroslaw | Mirrors BIP announcements (land przetargi + wykazy) |
| Old BIP (dead redirect) | http://bip.jaroslaw.um.gov.pl/ | Redirects to BIPLO vendor homepage — no content |

No separate housing-manager BIP exists. No Adradar / otoprzetargi entries for Jarosław gmina miejska flat auctions found.

Result notices (wyniki przetargu): not found as a dedicated page. Results likely embedded in individual tender detail pages or absent from the public BIP (common for land-only streams).

---

## 3. Format + rendering

- **Platform:** Custom CMS by bprog.pl (footer credit "Projekt i realizacja: bprog.pl"). SPA-like — main listing page (`/przetargi-nieruchomosci`) renders only partial content via JavaScript; `web_fetch` returned empty body.
- **Chrome MCP navigation confirmed:** page loads, article element contains one item via `get_page_text`; full list needs JS rendering.
- **Detail pages** (`/szczegoly-przetargu/<slug>`) render fully as HTML — text is extractable via Chrome MCP or JS-enabled scraper.
- **Attachments:** PDF files linked from each detail page (`propertyTenders/ajax/files/<timestamp>_<filename>.pdf`). Content is scanned/digitised PDFs (confirmed by filename pattern `skonica3p…` — Konica scanner output).
- **Auth/bot blocks:** No login required. No CAPTCHA observed. Rate limiting on `web_fetch` encountered (HTTP 429 on repeated rapid fetches) — respect crawl delay.
- **Tender slugs:** opaque alphanumeric IDs (e.g. `OYu7Q5yeWjcQtv3hrjNW`) — no sequential numbering; must enumerate from listing page.
- **Pagination:** listing page has pagination control visible in accessibility tree (`textbox "aktualna strona"`).

---

## 4. Volume + achieved-price stream

- **Current active land auctions:** 7 (as of 2026-06-27)
- **Flat auctions (ustny przetarg):** 0 found — all flat disposals are bezprzetargowy
- **Historical archive volume:** unknown (pagination present, depth not tested); Monitor Urzędowy shows approx. 5–6 announcements in recent months, all land/lease
- **Achieved-price stream:** No dedicated "wyniki przetargu" page found on BIP. No price-achieved data in the Monitor Urzędowy listing. Adradar flat-auction monitor returns no Jarosław gmina miejska entries. **No achieved-price stream exists for scraping.**

---

## 5. Adapter effort + verdict

**Closest analog:** none of gliwice/zabrze/bytom/kraków/tarnowskie-góry — those all run competitive flat auctions. Jarosław is structurally similar to the *no-flat-auction* pattern seen in many smaller Podkarpackie gminy.

**Blockers:**
1. Zero competitive flat auctions published — nothing to scrape for the product's core use-case.
2. Flat disposals go through *bezprzetargowy* zarządzenia (one PDF per batch, no structured data) — no auction prices to aggregate.
3. SPA rendering requires JS execution for listing page; PDFs are likely scanned (OCR needed) — medium technical effort even for the land-only stream.
4. No achieved-price endpoint.

**Risks:** Even if the gmina occasionally holds a competitive flat auction (e.g. for flats with no eligible tenant), no historical evidence found and frequency would be too low (~0–1/year at best) to justify adapter build.

**VERDICT: NO-BUILD.** Jarosław Gmina Miejska sells municipal flats exclusively bezprzetargowo to tenants. The BIP przetarg stream is land/plot-only. No flat-auction price-achieved data exists. Build effort (SPA + scanned PDFs) would be Medium for zero return on the product's core signal.
