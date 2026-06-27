# Spike — Rzeszów (Podkarpackie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NEEDS-LIVE-VERIFY (Medium effort).

## TL;DR

Rzeszów BGM (Biuro Gospodarki Mieniem Miasta Rzeszowa) runs active *przetarg ustny nieograniczony na sprzedaż nieruchomości* published on bip.erzeszow.pl, with 28 pages of archive and result notices present. The **critical gap**: the observable 2024–2026 auction stream is almost entirely land parcels (nieruchomości gruntowe), with flat auctions (nieruchomości lokalowe / lokale mieszkalne) appearing historically (confirmed 2017) but absent from at least the top ~20 visible recent entries. The city also handles flat disposals *bezprzetargowo* to sitting tenants, which does not produce an auction stream. Volume and recency of flat auctions must be confirmed by scanning deeper archive pages before committing to BUILD.

---

## 1. Sells municipal property at auction?

**Yes — land/buildings confirmed active; flat auctions historically confirmed, recency unclear.**

- The BGM runs *przetargi ustne nieograniczone na sprzedaż nieruchomości* at a cadence of roughly 4–6 per year (5 observed in the 2026 YTD, Jan–Sep). These are conducted in-person at Plac Ofiar Getta 3, Rzeszów.
- 2026 auctions seen: ul. Lenartowicza 1 (02.09.2026), ul. Mikołajczyka (24.06.2026), ul. Spółdzielcza (23.06.2026), ul. Obrońców Poczty Gdańskiej (27.05.2026), ul. Żołnierzy 9 Dywizji Piechoty (26.05.2026), ul. Wąwozowej (01.04.2026). All appear to be ground parcels based on naming — titles say "nieruchomości" not "lokalu mieszkalnego."
- **Flat auction confirmed (archive):** BIP archive URL slug `przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-lokalowej-przy-ul-w-pola-12-w-rzeszowie-7-wrzesnia-2017-r` confirms a flat (*nieruchomość lokalowa*) was auctioned in September 2017.
- **Bezprzetargowe flat sales:** The BGM Zbycie section (36 pages) publishes *wykazy nieruchomości przeznaczonych do sprzedaży w trybie bezprzetargowym* for tenants exercising pre-emption — these do NOT generate an auction stream.
- MZBM (Miejski Zarząd Budynków Mieszkalnych Sp. z o.o.) manages city-owned housing stock but their own "Przetargi" section covers building/renovation contracts and third-party *Wspólnota Mieszkaniowa* attic-space sales — not municipal flat auctions.
- **Risk flag:** Rzeszów may have mostly exhausted its disposable flat stock for open auction, with remaining flats going bezprzetargowo. This cannot be ruled out from desk research alone.

---

## 2. Where published? (hosts + boards, with URLs)

**Single canonical source: city BIP — bip.erzeszow.pl**

| Board | URL | Content |
|---|---|---|
| BGM Sprzedaż Nieruchomości (auction list) | https://bip.erzeszow.pl/115-biuro-gospodarki-mieniem-miasta-rzeszowa/6701-sprzedaz-nieruchomosci.html | Auction announcements + result notices, 28 pages |
| Public Ogłoszenia — Sprzedaż nieruchomości (mirror list) | https://bip.erzeszow.pl/360-ogloszenia-o-przetargach-dotyczacych-nieruchomosci/4663-sprzedaz-nieruchomosci.html | Same listings, also 28 pages |
| BGM Zbycie (bezprzetargowe wykazay) | https://bip.erzeszow.pl/115-biuro-gospodarki-mieniem-miasta-rzeszowa/5096-zbycie.html | Tenant-buyout + bezprzetargowe disposals, 36 pages |
| BGM Przetargi hub | https://bip.erzeszow.pl/115-biuro-gospodarki-mieniem-miasta-rzeszowa/5053-przetargi.html | Index |
| MZBM Przetargi | https://mzbm.rzeszow.pl/przetargi/ | Building/maintenance tenders only — NOT municipal flat auctions |

**Result notices ("Informacja o wyniku przetargu")** appear inline on the same BIP entry as the auction announcement — confirmed live for auctions of 27.05.2026 and 26.05.2026. There is no separate results register.

---

## 3. Format + rendering

- **Server-rendered HTML** — bip.erzeszow.pl runs Pro3W CMS v2019 (Bootstrap 4 / FA 5). Pages are fully server-rendered; no JS SPA, no lazy-loading of auction content. The listing and detail pages are directly fetchable.
- **PDF attachments** — each auction entry links to one or more PDFs stored under `bip.erzeszow.pl/static/img/k02/BGM/PRZETARGI/SPRZEDAŻ-ZBYCIE/`. Two variants confirmed:
  - Born-digital PDF (e.g., `Ogloszenie-o-przetargu-Obroncow-Poczty-Gdanskiej-27-05-2026.pdf`, 114 kB) — parseable.
  - Scanned PDF (e.g., `skan-przetarg-sprzedaz-21.01.2021.pdf`, 245 kB) — requires OCR; also a `.doc` source sometimes available.
  - Result notice PDFs: `informacja-wynik-przetarg-21.01.2021.pdf` (born-digital) + `skan-INFORMACJA-WYNIK-PRZETARG-21.01.2021.pdf`.
- **TLS:** HTTPS standard, no auth, no bot-blocking observed. `robots: index, follow, noarchive` — crawling allowed.
- **Pagination:** Listing pages paginate via `?strona=N&hash=...` (hash rotates each page load — may need session-based crawling if hash is enforced). Detail URLs are stable by numeric ID.

---

## 4. Volume + achieved-price stream

- **Overall auction cadence:** ~4–8 auctions/year across all property types (28 pages × ~5 entries per page = ~140 entries total, spanning several years back to at least 2017).
- **Flat (lokal mieszkalny) auction volume:** Unknown for 2020–2026. Only one confirmed flat auction found (2017). The 2024–2026 visible entries are all land parcels. This is the critical unknown.
- **Achieved-price stream:** Result notices ("Informacja o wyniku przetargu") are posted inline on the BIP entry after auction completion. They include achieved price and buyer details. Confirmed present for 2021 and 2026 entries.
- **Bezprzetargowe flat wykazay:** Published in the Zbycie section; these show asking price but not a competitive-auction achieved price — lower value for a market-price aggregator.

---

## 5. Adapter effort + verdict

**Closest analog:** Krakow-style BGM architecture (single BIP, HTML listing + PDF attachments, result notices inline). Simpler than Krakow because there is no secondary MZBM auction stream to reconcile.

**Blockers / risks:**

1. **Flat volume is the gate:** If Rzeszów's flat-auction stream dried up after ~2019 (plausible — city may have sold off its leasable stock or switched to bezprzetargowe), the adapter produces land-only data — weak product-fit for the tool's core use case. Must scan BGM archive pages 2–28 to count flat entries before committing.
2. **Scanned PDFs in older entries:** OCR layer needed for a subset of result documents. Born-digital PDFs present in parallel (`.doc` source also sometimes attached) — manageable.
3. **Hash in pagination URL:** The `?strona=N&hash=...` pattern needs investigation. If the hash is session-bound (rotates per-request), a naive paginator will fail silently. Test with a static archived URL first.
4. **No structured data / JSON API:** Full HTML scrape + PDF parse required. Medium effort.
5. **MZBM is not a flat-auction source** for this tool — ignore for adapter purposes.

**Adapter effort:** Medium (HTML paginator + PDF parser + OCR fallback). Similar to Bytom or Tarnowskie Góry in complexity.

**VERDICT: NEEDS-LIVE-VERIFY**

Do not proceed to BUILD until pages 2–28 of the BGM Sprzedaż Nieruchomości archive are scanned to count "lokal mieszkalny" / "nieruchomość lokalowa" entries from 2020 onward. If ≥ 5 flat auctions are found in the last 3 years → BUILD (Medium effort). If 0–2 → NO-BUILD (land-only stream, poor fit).

**Confidence: LIVE-VERIFIED** for format, URL structure, and auction cadence. **DESK** for flat-auction volume in 2020–2026 (PDF content not opened, archive pages 2–28 not paged through).
