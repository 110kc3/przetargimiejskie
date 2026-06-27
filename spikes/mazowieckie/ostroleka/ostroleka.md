# Spike — Ostrołęka (Mazowieckie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Ostrołęka's city BIP publishes flat auctions (lokal mieszkalny, przetarg ustny nieograniczony) directly — confirmed with live page fetches. Volume is low (~1–3 unique flats per year, often the same address across multiple rounds). Result notices (wyniki przetargu) are PDF attachments on the same listing page, providing the achieved-price stream. The BIP is server-rendered HTML on Logonet CMS v2.10.0 — no SPA, no auth, no bot blocks. Housing manager OTBS is a TBS (social rental), not a flat-sale vehicle; all municipal flat sales go through the city BIP. Closest analog: Tarnowskie Góry (single BIP host, HTML listing, low-volume flat auctions, PDF result attachments).

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The city auctions municipal flats via *przetarg ustny nieograniczony* (unlimited oral auction) directly through the Urząd Miasta BIP. Examples fetched live:

- **ul. Żeromskiego 29/4** — lokal mieszkalny, przetarg ustny nieograniczony, cena wywoławcza 69 300 zł, przetarg 28.07.2016.  
  URL: https://bip.um.ostroleka.pl/przetarg-nieruchomosci/2200/ostroleka-ul-zeromskiego-29-4

- **ul. Stefana Żeromskiego 29** — lokal mieszkalny, przetarg ustny nieograniczony, cena wywoławcza 125 400 zł, przetarg 15.10.2025. Wynik przetargu (PDF) attached.  
  URL: https://bip.um.ostroleka.pl/przetarg-nieruchomosci/17685/ostroleka-ul-stefana-zeromskiego-29

- **ul. Stefana Żeromskiego 29** (trzeci przetarg) — lokal mieszkalny, przetarg ustny nieograniczony, cena wywoławcza 102 600 zł, przetarg 11.02.2026. Wyniki przetargu (PDF) attached.  
  URL: https://bip.um.ostroleka.pl/przetarg-nieruchomosci/18205/ostroleka-ulica-stefana-zeromskiego-29

**Note on OTBS:** Ostrołęckie Towarzystwo Budownictwa Społecznego Sp. z o.o. (ul. Berka Joselewicza 1, 07-410 Ostrołęka) is a city-owned TBS that builds and manages **rental** housing — it does not conduct flat-sale przetargi. All flat disposals at auction run through the city BIP. OTBS is not a scraping target.

---

## 2. Where published? (hosts + boards, URLs)

**Single host — city BIP only.**

| Board | URL |
|---|---|
| Listing index (przetargi nieruchomości) | https://bip.um.ostroleka.pl/przetargi-nieruchomosci/1/10 |
| Per-auction detail page | https://bip.um.ostroleka.pl/przetarg-nieruchomosci/{ID}/{slug} |
| Nieruchomości do sprzedaży / dzierżawy section | https://bip.um.ostroleka.pl/przetargi-nieruchomosci/70 |
| XML feed per listing | https://bip.um.ostroleka.pl/przetarg-nieruchomosci/xml/{ID}/1 |
| XML feed for list | https://bip.um.ostroleka.pl/przetargi-nieruchomosci/xml/1/1 |

Result notices (achieved price) are PDF attachments uploaded to the same detail page after the auction date, titled "Informacja o wyniku przetargu" or "Wyniki przetargu". They appear as named links in the Załączniki section.

No second board (platformazakupowa.pl is used for procurement contracts ≥ 130 000 zł, not property disposals).

---

## 3. Format + rendering

- **Server-rendered HTML** — Logonet CMS v2.10.0, static pages with no JavaScript requirement for content.
- Listing page: HTML table, one row per auction, columns: Adres nieruchomości, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu.
- Pagination: `/przetargi-nieruchomosci/{page}/{per_page}` — 12 pages at 10/page as of 2026-06-27 (~119 total records going back to 2015).
- Filter parameters in query form: typ przetargu, rodzaj nieruchomości, rok publikacji, status — these are GET-form filters; filterable by `lokal mieszkalny` to isolate flats.
- XML per-listing at `/przetarg-nieruchomosci/xml/{ID}/1` — machine-readable alternative, not tested for completeness.
- Announcement PDFs and result PDFs are at `/attachments/download/{ID}` — named PDF, text-based (not scanned), ~32–366 kB; no OCR needed.
- **No auth, no login wall, no Cloudflare, no bot block observed** across three live fetches. Cookies banner only (cosmetic).
- RSS available at https://bip.um.ostroleka.pl/rss (scope unknown — may cover all BIP content).

---

## 4. Volume + achieved-price stream

- **Total records:** ~119 auctions spanning 2015–2026 (12 pages × 10/page, last page has 1 record from Oct 2015).
- **Flat auctions (lokal mieszkalny):** Low volume — confirmed at least 3 listings for a single address (Żeromskiego 29), across multiple rounds (first, second, third przetarg). Rough estimate: 2–4 flat auctions per year, occasionally the same flat repeated when prior rounds fail.
- **Mix:** Predominantly nieruchomość niezabudowana (undeveloped plots) and nieruchomość zabudowana (built properties). Flat auctions are a minority but definitively present.
- **Achieved-price stream:** CONFIRMED. Each flat listing includes a "Wyniki przetargu" or "Informacja o wyniku przetargu" PDF attachment posted ~1–2 weeks after auction date. These PDFs are text-based and parseable. Example: Żeromskiego 29 (2025) — result PDF at https://bip.um.ostroleka.pl/attachments/download/28040 (127 kB, published 23.10.2025). Example: Żeromskiego 29 (2026) — result PDF at https://bip.um.ostroleka.pl/attachments/download/28668 (109 kB, published 20.02.2026).

---

## 5. Adapter effort + verdict

**Closest analog: Tarnowskie Góry** — single BIP host, Logonet CMS HTML listings, low-volume flat auctions (~2–4/year), PDF result attachments on the detail page.

**Effort: Low.** The BIP is clean server-rendered HTML, pagination is predictable, filter by `rodzaj nieruchomości=lokal mieszkalny` isolates flats, and result PDFs are text-based. The only non-trivial step is parsing the result PDF to extract achieved price (pdftotext should suffice — files are 100–400 kB text PDFs, not scans).

**Blockers:** None identified. No SPA rendering, no auth, no CAPTCHA.

**Risks:**
- Very low flat volume (~2–4 listings/year) — worth scraping but expect sparse data.
- Same flat address may appear across multiple rounds under slightly different title slugs; dedup logic needed on address + przetarg round.
- Result PDFs are uploaded post-hoc (days to weeks after auction date); polling cadence must account for delayed result publication.
- XML feed at `/xml/` endpoints is unverified for completeness — HTML scraping is the safe fallback.

**VERDICT: BUILD** — clean HTML BIP, flat auctions confirmed live, achieved-price PDFs present on each listing, low scraping complexity. Low effort relative to other cities.
