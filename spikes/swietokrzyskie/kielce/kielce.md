# Spike — Kielce (Świętokrzyskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: **BUILD** (Medium effort).

## TL;DR

Kielce runs genuine *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* — individual city-owned flats auctioned publicly, with repeat rounds (I/II/III przetarg), all announced on a single BIP board. The board is server-rendered HTML (SmartSite CMS, no JS wall), paginated, 8 pages deep as of June 2026 (~80 entries spanning auctions + leases + land). Flat auctions appear ~4–6 times per year per the visible listing cadence. Auction-result notices ("informacja o wyniku przetargu") are published on the same board as DOCX attachments. The Wydział Gospodarki Nieruchomościami (not MZB) is the publishing authority; MZB handles rental-mode auctions only. No separate housing-manager subdomain — everything lives at bipum.kielce.eu.

---

## 1. Sells municipal property at auction?

**Yes, confirmed — including residential flats (lokale mieszkalne).**

The BIP board lists *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* entries for individual units at specific addresses with unit numbers, surface areas, and share in common parts:

- ul. Dąbrowska 5, lokal nr 11, 18.21 m² — appeared as I przetarg (2025-08), II przetarg (2025-10), III przetarg (2026-02): three auction rounds for the same unit, confirming real auction workflow.
- ul. Dąbrowska 5, lokal nr 20, 21.19 m² — I przetarg (2025-08), II przetarg (2026-02).
- ul. Warszawska 3, lokal nr 15, 22.54 m² — I przetarg (2026-02).
- ul. Żeromskiego 20/24B, lokal nr 40, 15.61 m² — confirmed via search snippet.

These are small social-housing units sold to the open market when no sitting tenant buys. The city also runs *bezprzetargowy* sales to sitting tenants (separate BIP section at `/sprzedaz-lokali-mieszkalnych-w-trybie-bezprzetargowym`), but the auction stream is distinct and live.

Non-flat content on the same board: niezabudowane plots, zabudowane plots, leases (dzierżawa). Rough ratio on the first three pages (30 entries): ~5 flat auctions, ~15 land/plot auctions, ~5 leases, ~5 misc. Flat auction volume is modest but consistent (approximately one new flat per quarter, often re-auctioned 2–3×).

Also noted: a separate auction for a whole multi-family building at ul. Niecała 1 (2022, budynek mieszkalny wielorodzinny) — bulk-building sales occur occasionally.

---

## 2. Where published? (hosts + boards, with URLs)

**Primary BIP host (post-2022):** `https://bipum.kielce.eu`

| Content type | URL |
|---|---|
| Auction board (sales + leases) | https://bipum.kielce.eu/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/ |
| Page 2 (paginated) | …/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci-1.html?page=2 |
| Bezprzetargowy flat sales (separate section) | https://bipum.kielce.eu/urzad-miasta-kielce/sposoby-przyjmowania-i-zalatwiania-spraw/nieruchomosci/sprzedaz-i-nabycie-nieruchomosci/sprzedaz-lokali-mieszkalnych-w-trybie-bezprzetargowym.html |
| Auction result example | https://bipum.kielce.eu/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/informacja-o-wyniku-przetargu-ustnego-nieograniczonego-ul-orlat-lwowskich.html |
| Mirror / przetargi shortcut | https://bipum.kielce.eu/wazne-informacje/przetargi-i-oferty-miasta |
| Pre-2022 archive | http://www.bip.kielce.eu/ (old Liferay instance, data before 2022-01-01) |

**Publishing authority:** Wydział Gospodarki Nieruchomościami, Dyrektor Barbara Zawadzka (confirmed from result notice).

**MZB (Miejski Zarząd Budynków)** at `mzb.kielce.pl` — manages *rental* auctions only, not sales; their `/do_wynajecia/wykaz-lokali-przetarg/` listed no current sale lots. Do not scrape MZB for sale data.

**kielce.eu** (official city portal) mirrors auction links at `/pl/dla-mieszkanca/zalatw-sprawe/nieruchomosci/ogloszenia-o-przetargach.html` but is not the canonical source.

---

## 3. Format + rendering

- **CMS:** SmartSite by BIT Sp. z o.o. (`meta-generator` confirmed), server-rendered HTML — identical to the Kraków / Bytom pattern. No JS hydration wall, no SPA.
- **Listing page:** standard HTML `<ul>` of article titles with publication/update dates. Clean for scraping.
- **Pagination:** query-string `?page=N`, 8 pages, 10 items per page. Deterministic, no JS.
- **Detail page:** HTML body contains auction text (address, unit number, area, cena wywoławcza, wadium, date/place of auction). Fully born-digital text — no scanned PDF for the announcement itself.
- **Result notice:** the HTML detail page exists but the auction outcome data (achieved price, winner) is attached as a **.docx file** (confirmed: "Informacja o wyniku przetargu ul. Orląt Lwowskich", 15.27 KB .docx). A print-to-PDF link also exists but the .docx is the primary result carrier.
- **TLS:** HTTPS, valid cert, no CAPTCHA, no bot-block observed during live fetches.
- **Auth:** none required.
- **Risk:** result prices live in DOCX attachments, not inline HTML — requires python-docx parsing to extract achieved price. The announcement HTML is clean.

---

## 4. Volume + achieved-price stream

- **Active listings (June 2026):** ~3–4 flat auctions on the current board (pages 1–2, post-2025-08). Many are repeat rounds (II/III przetarg) for the same unit.
- **Annual cadence:** approximately 4–8 unique flat units offered per year, some re-auctioned 2–3 times = ~8–15 listing entries per year for flats.
- **Result notices:** present on the same board (confirmed example for ul. Orląt Lwowskich). Achieved price is in the .docx body, not in the HTML title or page text — requires downloading and parsing the attachment.
- **Archive depth:** 8 pages × 10 items = ~80 entries from 2022-01-01 to present on bipum.kielce.eu; deeper history on old bip.kielce.eu (Liferay, different scraping path).
- **Assessment:** modest but real auction volume; the repeat-round pattern means more scrape events per physical unit. Achieved prices are retrievable but require docx parsing.

---

## 5. Adapter effort + verdict

**Closest analog:** **Bytom** — same SmartSite CMS, same Wydział Gospodarki Nieruchomościami pattern, same HTML listing + DOCX result attachment workflow. Gliwice/Zabrze are also comparable (SmartSite CMS), but Bytom matches most closely on the result-as-DOCX pattern.

**Adapter tasks:**

| Task | Effort |
|---|---|
| List-page scraper (paginated HTML, `?page=N`) | Low — identical to existing SmartSite adapters |
| Detail-page parser (born-digital HTML, extract: address, unit no., area, cena wywoławcza, wadium, date) | Low |
| Result-notice detector (title contains "wynik przetargu") | Low |
| DOCX download + parse for achieved price | **Medium** — requires python-docx; field position may vary across documents |
| Filter: lokal mieszkalny vs. grunt/dzierżawa by title keyword | Low |
| Pre-2022 archive (old bip.kielce.eu Liferay) | Optional / out of scope for v1 |

**Blockers:** None hard. The DOCX result parsing is the only non-trivial step, but the same problem exists in Bytom and is already solved (or can reuse that solution).

**Risks:**
- DOCX structure is not standardised — if the city reformats its result template, the price extractor may break silently.
- Flat volume is low (~5–8 units/year unique). If the goal is data richness, this city contributes less than Kraków/Gliwice; worthwhile as a Świętokrzyskie anchor city.
- The mixed board (land + flats + leases) requires title-keyword filtering; "lokal mieszkalny" in the title is a reliable discriminator.

**VERDICT: BUILD — Medium effort.** Single clean BIP board, born-digital HTML announcements, flat auctions confirmed live and recurring, achieved-price DOCX parseable with existing tooling. Closest pattern: Bytom adapter.
