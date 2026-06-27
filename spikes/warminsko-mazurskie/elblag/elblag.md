# Spike — Elbląg (Warmińsko-Mazurskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Elbląg runs a clear dual-stream flat-auction model. The Prezydent Miasta runs standalone _ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych_ (open-bid flat auctions, vacant units) published as born-digital PDFs on a well-structured BIP at **bip.elblag.eu**. In parallel, ZBK (Zarząd Budynków Komunalnych) administers the _bezprzetargowy_ pipeline — sitting tenants can buy their flats directly, with a separate wykaz published on the same BIP. These two streams are clearly separated by listing type in the BIP search facets ("lokal mieszkalny" as Rodzaj nieruchomości + "Rozstrzygnięte" status). Volume appears light (3–5 flat auctions per year); the main flow is land and commercial. Result notices with achieved price appear to be published within the BIP per-item record (status "Rozstrzygnięte") but could not be confirmed to carry the achieved price field in HTML — that is a minor open risk. Overall a straightforward, clean target.

---

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** The Prezydent Miasta Elbląg publishes _pierwsze/drugie/trzecie ustne przetargi nieograniczone na sprzedaż nieruchomości lokalowej_ (open-bid, public auctions, conducted in the Urząd Miejski meeting room) for municipally owned flats. A confirmed example from October 2025:

- **ul. Adama Mickiewicza 29/2** — lokal mieszkalny, 31.60 m², 2 pokoje, parter bloku z 1965 r., cena wywoławcza **160 000 zł** (w tym lokal 142 752 zł + udział w gruncie 17 248 zł). Wadium 25 000 zł, przetarg 27.10.2025 r., sala 300, Urząd Miejski. Source: [bip.elblag.eu/attachments/download/14800](https://bip.elblag.eu/attachments/download/14800).

The BIP filter UI explicitly lists `lokal mieszkalny` as a _Rodzaj nieruchomości_ category (live-verified on the search form), confirming this is a recognised stream — not a one-off.

**Important nuance:** A parallel _bezprzetargowy_ (non-auction) stream also exists for sitting tenants, administered by ZBK:
- ZBK's "Sprzedaż nieruchomości" page carries PDF forms for _Sprzedaż lokalu mieszkalnego na rzecz najemcy_: [zbk.elblag.pl/pages/136/sprzedaz_nieruchomosci](http://www.zbk.elblag.pl/pages/136/sprzedaz_nieruchomosci).
- BIP publishes regular _Wykaz lokali mieszkalnych przeznaczonych do sprzedaży na rzecz najemców oraz udzielenia bonifikat od ceny sprzedaży lokali_ — e.g. four separate wykazy in May 2026 alone: [bip.elblag.eu/artykuly/191/wykaz-nieruchomosci-zbycie](https://bip.elblag.eu/artykuly/191/wykaz-nieruchomosci-zbycie).

These tenant-sale wykazes are _not_ auctions and carry no competitive price — they should be filtered out or stored separately as a different data type.

The auction stream (vacant flats, open bidding) is the relevant signal for przetargimiejskie. Auction volume is **low** (estimated 3–5 flat auctions/year, with some going to 2nd or 3rd round before finding a buyer).

---

## 2. Where published? (hosts + boards, with URLs)

### Primary host — bip.elblag.eu (Urząd Miejski w Elblągu)

| Board | URL | Content |
|---|---|---|
| Przetargi – zbycie (current sale auctions) | https://bip.elblag.eu/przetargi-nieruchomosci/190 | Active auction listings for all property types incl. flats |
| Przetargi nieruchomości (all, paginated) | https://bip.elblag.eu/przetargi-nieruchomosci/1/10 | Filterable by type, status, year |
| Wykaz nieruchomości – zbycie | https://bip.elblag.eu/artykuly/191/wykaz-nieruchomosci-zbycie | Pre-auction wykazes + tenant-sale notices |
| Gospodarka nieruchomościami | https://bip.elblag.eu/artykuly/97/gospodarka-nieruchomosciami | Landing hub for all property streams |
| Archiwum BIP (older records) | http://um-elblag.samorzady.pl/ | Pre-migration records |

Auction announcement PDFs are served from: `https://bip.elblag.eu/attachments/download/{ID}`.

Per-auction HTML detail pages follow the pattern: `https://bip.elblag.eu/przetarg-nieruchomosci/{ID}/{slug}`.

**Result notices** ("informacja o wyniku") are expected on the same per-item BIP record, with status changing to "Rozstrzygnięte". The BIP status filter offers: Aktualne / W trakcie rozstrzygania / Rozstrzygnięte / Unieważnione — live-verified in the search form. Whether the achieved price is embedded in the HTML record or only in a linked PDF was **not confirmed** in this spike (risk: low, standard practice is to attach a result PDF or embed in the record).

### Secondary host — zbk.elblag.pl (Zarząd Budynków Komunalnych)

ZBK manages rental stock and processes tenant-purchase applications; its auction page covers only **lease tenders** (lokale użytkowe, garaże) — not flat sales. Not relevant for the auction stream but relevant for understanding the split:
- ZBK przetargi: [zbk.elblag.pl/przetargi/przetargi-na-lokale-uzytkowe](http://www.zbk.elblag.pl/przetargi/przetargi-na-lokale-uzytkowe)

### EPGK (Elbląskie Przedsiębiorstwo Gospodarki Komunalnej)

EPGK is a waste/communal utility company, not a housing manager. Its occasional przetargi are for commercial spaces it owns. Not a relevant source for flat auctions. [epgk.pl](https://www.epgk.pl/).

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| BIP CMS | Logonet Sp. z o.o. (Bydgoszcz), version 2.9.0 — same vendor seen in other Polish cities |
| Listing page | Server-rendered HTML, no JS SPA. Tables rendered directly in page HTML. Live-fetched successfully (200 OK, `text/html; charset=UTF-8`). |
| Auction announcements | **Born-digital PDFs** served from `/attachments/download/{ID}`. Two confirmed flat-auction PDFs fetched and parsed successfully — clean digital text, no OCR needed. Standard 2–3 page structured format: address → description → cena wywoławcza → wadium → terms. |
| Result notices | Expected as BIP per-item record update (status "Rozstrzygnięte") ± attached PDF. **Not live-confirmed** in this spike — minor open risk. |
| TLS | HTTPS everywhere on bip.elblag.eu. No auth, no bot-block observed. |
| XML export | The BIP listing page exposes an XML feed at `https://bip.elblag.eu/przetargi-nieruchomosci/xml/1/1` — potentially useful as a structured scrape entry point (not tested in depth). |
| robots.txt / crawl | `meta-robots: index,follow,all` — no crawl restrictions. `meta-googlebot: archive` permits caching. |

---

## 4. Volume + achieved-price stream

- **Active auctions (live, 2026-06-27):** 10 listings visible on the first page of bip.elblag.eu/przetargi-nieruchomosci/1/10 — all land or buildings, no flats currently active.
- **Flat auction volume:** Low. Confirmed flat auction from Oct 2025 (I przetarg); a second example from 2024 (III przetarg for commercial ul. Browarna 14/1U — first two rounds in Oct 2023 and Feb 2024 resulted in no sale, indicating repeated rounds are common). Estimate: 3–8 residential flat auctions per year total across all rounds.
- **Achieved price:** BIP filter includes "Rozstrzygnięte" status, implying results are recorded. Search snippets mention wadium of 70 000 zł for an unidentified flat (Mar 2024) suggesting higher-value units also appear. Achieved price in individual results **not confirmed** to be machine-readable in HTML — likely in linked PDF.
- **Tenant-sale stream:** Significantly higher volume (multiple wykazes per month, May 2026 alone had 4 batches). These carry discounted sale prices (bonifikaty) but are not open-bid auctions.

---

## 5. Adapter effort + verdict

### Closest analog

**Bytom / Zabrze** — similar Logonet BIP CMS, PDF-based auction notices, dual bezprzetargowy/auction split, low flat volume. The BIP structure and PDF format are near-identical. If a Logonet adapter already exists in the project (e.g. from Gliwice or Bytom), reuse is high.

### Build plan (Medium effort)

1. **Scrape listing index** — GET `https://bip.elblag.eu/przetargi-nieruchomosci/190` (or XML feed at `/xml/1/1`), parse HTML table, filter `Rodzaj nieruchomości = lokal mieszkalny`.
2. **Fetch per-auction PDF** — resolve attachment URL from `bip.elblag.eu/attachments/download/{ID}`, extract: address, area (m²), cena wywoławcza, data przetargu.
3. **Poll for results** — re-visit per-item pages (status "Rozstrzygnięte") for achieved price; fall back to downloading result PDF if price not in HTML.
4. **Filter out bezprzetargowy** — exclude all items from `bip.elblag.eu/artykuly/191/wykaz-nieruchomosci-zbycie` that are "sprzedaż na rzecz najemców" (different URL pattern, different article type).

### Blockers

None critical. The only open question is whether the achieved price is in the HTML result record or requires a PDF parse — verify with one "Rozstrzygnięte" item before shipping.

### Risks

- **Low volume:** ~5 flat auctions/year means the feed will be sparse. Arguably still worth building for completeness of the national index.
- **Repeated rounds:** Properties going to III or IV przetarg are common — deduplication on property identity (address/KW number) needed.
- **Tenant-sale noise:** High volume of non-auction wykaz items on same section — must filter cleanly.
- **PDF-only result price:** If achieved price is PDF-only, adds a pdfminer/pdfplumber parse step (low risk — PDF is born-digital).

### Verdict

**BUILD — Medium effort.** Single BIP host, server-rendered HTML, born-digital PDFs, no auth, Logonet CMS (likely reusable from other adapters). Flat auction volume is low but the stream is real, clearly labelled, and well-structured. Tenant-sale notices must be excluded. Confirm achieved-price field format before shipping.
