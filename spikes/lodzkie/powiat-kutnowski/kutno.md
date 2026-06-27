# Spike — Kutno (Łódzkie · powiat kutnowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium confidence).

## TL;DR

Gmina Miasto Kutno sells municipal flats **bezprzetargowo** (directly to existing tenants, art. 34 uogn priority), not via open *ustny przetarg nieograniczony*. The dedicated housing manager ZNM Kutno runs rental auctions only. The city BIP publishes przetargi exclusively for land parcels. No stream of open flat-sale auction announcements + achieved-price results exists to aggregate.

---

## 1. Sells municipal property at auction?

**Yes — land only. Flats: bezprzetargowo.**

- The Prezydent Miasta Kutno holds *przetargi ustne nieograniczone* for **land parcels** (e.g. ul. Lotnicza, ul. Wschodnia, ul. Sklęczkowska). These are published on um.kutno.pl and mirrored on umkutno.bip.e-zeto.eu.
- **Residential flats** are sold **bezprzetargowo** to sitting tenants under art. 34 ust. 1 ustawy o gospodarce nieruchomościami. Each sale requires a separate City Council resolution (uchwała). Evidence: Uchwała Nr XXVIII/183/2025 Rady Miasta Kutno (sale of lokal mieszkalny nr 1 at ul. Krośniewicka 14); amended by Uchwała Nr XXXII/189/2025. Both visible in the eSesja resolution register.
- ZNM Kutno publishes a downloadable *wniosek o sprzedaż lokalu mieszkalnego* (application for flat purchase) — confirming tenant buy-out exists, but as a direct/negotiated procedure, not a public auction.
- No *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* found in any active or archived city/ZNM publication.

**Heuristic verdict: tenant-buyout-only city → NO-BUILD.**

---

## 2. Where published? (hosts + boards, URLs)

| Publisher | What | URL |
|-----------|------|-----|
| Urząd Miasta Kutno (city portal) | Property announcements (land auctions, wykazy zbycia) | https://um.kutno.pl/ogloszenia-dotyczace-nieruchomosci-miejskich |
| BIP Urząd Miasta Kutno (e-zeto) | Przetargi mirror + zamówienia | https://umkutno.bip.e-zeto.eu/index.php?type=4&name=bt98&func=selectsite&value%5B0%5D=mnu11&value%5B1%5D=1 |
| ZNM Kutno — Zarząd Nieruchomości Miejskich | Rental przetargi (lokale użytkowe, garaże); flat-sale application form | https://znm.kutno.pl/?pg=przetargi |
| ZNM Kutno — flat sale application PDF | Wniosek o sprzedaż lokalu mieszkalnego (bezprzetargowy) | http://znm.kutno.pl/resources/files/wniosek_sprzedaz.pdf |
| Rada Miasta Kutno — eSesja register | Council resolutions per flat (XXVIII/183/2025, XXXII/189/2025) | https://kutno.esesja.pl/rejestr_uchwal |
| BIP Gmina Kutno (wiejska, separate entity) | Rural municipality land auctions — not city flats | https://bip.gminakutno.pl |

**No dedicated achieved-price / wyniki przetargu board for flat sales exists** (because there are no flat auction results to publish).

---

## 3. Format + rendering

- **um.kutno.pl**: Standard Drupal CMS. Each announcement is a separate HTML page (article element). Clean, machine-readable text. No auth, no bot block observed during live fetch. URL pattern: `/ogloszenie/<slug>`.
- **umkutno.bip.e-zeto.eu**: Classic e-zeto BIP platform (query-string navigation). Server-rendered HTML. Identical content to city portal but older URL scheme.
- **znm.kutno.pl**: Custom PHP CMS. Przetargi listed as HTML cards with start/close dates; individual entries reachable via `?pg=przetargi&id=N`. Closed/archived przetargi tab renders empty (no historical data exposed).
- **eSesja (kutno.esesja.pl)**: JavaScript SPA — resolution register requires JS to render; content not directly fetch-able without a browser or API call.
- PDF documents (wykaz, ogłoszenie) are linked inline and appear to be text-PDF (Drupal-generated), not scanned.
- **No auth/CAPTCHA blocks observed.**

---

## 4. Volume + achieved-price stream

- **Land auctions**: sparse — roughly 1–3 per year visible from city portal history (ul. Lotnicza Sept 2024; ul. Zamkowa bezprzetargowy Jan 2025). No dedicated wyniki/results board; result notices not found in open web.
- **Flat sales**: zero open-auction volume. Each is a one-off council resolution + bezprzetargowy procedure. No achieved-price announcement is required or published under this route.
- ZNM rental przetargi: active (garages, utility space), but these are rentals not sales — irrelevant to przetargimiejskie scope.
- **Achieved-price stream: does not exist for flats.**

---

## 5. Adapter effort + verdict

**Closest analog among known cities:** None of gliwice/zabrze/bytom/krakow/tarnowskie-gory match well — all of those publish open flat auctions. Kutno's pattern is closest to a pure land-only city.

**Blockers:**
1. No *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* exists — the fundamental BUILD criterion is not met.
2. Flat sales are bezprzetargowy, one-off, Council-resolution-driven; no structured feed to scrape.
3. Achieved price is never publicly announced (no legal requirement for bezprzetargowy).
4. ZNM closed-auctions archive is empty (no historical flat-sale przetargi discoverable).

**Risks if revisited later:**
- Policy could change — a new City Council term could vote to open flat sales to auctions. Monitor eSesja register for new uchwały on "sprzedaż lokali mieszkalnych".
- ZNM may publish a flat przetarg ad hoc (e.g. for a flat that cannot be sold bezprzetargowo because sitting tenant declined). Worth a periodic re-check.

**Verdict: NO-BUILD.** Kutno sells municipal flats exclusively bezprzetargowo to tenants. There is no open-auction flat-sale stream to aggregate or display. Effort to build an adapter would be High (scraping eSesja SPA for individual council resolutions) for zero user-facing value (no competitive auction price to show).

---

## Sources (live-verified 2026-06-27)

- https://um.kutno.pl/ogloszenia-dotyczace-nieruchomosci-miejskich — city property announcements (LIVE-VERIFIED: land only)
- https://um.kutno.pl/ogloszenie/i-przetarg-ustny-nieograniczony-0 — I przetarg ustny, Sept 2024: land at ul. Lotnicza (LIVE-VERIFIED)
- https://um.kutno.pl/en/node/4370 — Wykaz zbycia ul. Zamkowa, Jan 2025: land swap bezprzetargowy (LIVE-VERIFIED)
- https://znm.kutno.pl/?pg=przetargi — ZNM rental przetargi list (LIVE-VERIFIED: no flat sales)
- http://znm.kutno.pl/resources/files/wniosek_sprzedaz.pdf — ZNM flat-purchase application form (DESK: found via search)
- https://kutno.esesja.pl/rejestr_uchwal — Council resolution register (DESK: JS SPA, resolutions XXVIII/183/2025 + XXXII/189/2025 confirmed via search snippet)
- https://umkutno.bip.e-zeto.eu/index.php?type=4&name=bt98&func=selectsite&value%5B0%5D=mnu11&value%5B1%5D=1 — BIP przetargi (DESK: misdirected during live fetch)
