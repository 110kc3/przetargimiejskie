# Spike — Ostróda (Warmińsko-Mazurskie · powiat ostródzki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (Low effort to confirm; no flat-auction volume).

## TL;DR

Gmina Miejska Ostróda (city, ~33 k residents) does hold occasional *ustny przetarg nieograniczony* for municipal flats, but volume is negligible: the dedicated BIP category "Przetargi - sprzedaż lokali" currently shows **"Brak wyników"** (zero entries, both active and archived). The one live-verified result found — Plac Tysiąclecia PP 4/17, August 2022 — ended **negatywnie** (two bidders showed up, neither raised the opening price of 70 000 PLN). The dominant disposal route for municipal flats is *bezprzetargowa* sale to sitting tenants. No dedicated housing manager publishes flat-auction przetargi separately. Verdict: NO-BUILD.

---

## 1. Sells municipal property at auction?

**Land / commercial — yes, regularly.** Wydział Geodezji i Gospodarki Przestrzennej (Burmistrz Ostróda) runs *ustny przetarg nieograniczony* for undeveloped plots and built-up land plots continuously; multiple listings visible on bipostroda.warmia.mazury.pl in 2024–2026.

**Flats (lokale mieszkalne) — nominally yes, practically near-zero:**

- A dedicated BIP sub-category "Przetargi - sprzedaż lokali" exists at `/kategoria/955/przetargi-sprzedaz-lokali.html` but returns **zero entries** (live-verified 2026-06-29). LIVE-VERIFIED.
- The dominant channel for flat disposal is confirmed **bezprzetargowa** (non-auction sale to tenants): e.g. "Wykaz lokali mieszkalnych przeznaczonych do sprzedaży w drodze bezprzetargowej, na rzecz najemców — lokal nr 8, ul. Pieniężnego 12" (Dec 2022).
- One auction flat result found on ostroda.pl (25 Aug 2022, lokal nr 17, Plac Tysiąclecia PP 4, 16.85 m², opening price 70 000 PLN): przetarg **zakończył się wynikiem negatywnym** — 2 participants, no bid above reserve. LIVE-VERIFIED.
- Announcements and result notices for flats appear on the main city site (ostroda.pl/ogloszenia/) rather than the dedicated przetargi-sprzedaz-lokali BIP board, suggesting ad-hoc posting rather than structured pipeline.

**Conclusion on Q1:** Ostróda does NOT maintain a live auction pipeline for residential flats. Flats go bezprzetargowo to tenants; the rare auction attempt (volume ≈ 1/year at most, often negative result) does not constitute a scrapable stream.

---

## 2. Where published? (hosts + boards, URLs)

| Board | URL | Content |
|---|---|---|
| BIP Gmina Miejska Ostróda — main property przetargi | https://bipostroda.warmia.mazury.pl/kategoria/770/przetargi-sprzedaz-najem-nieruchomosci.html | Land + commercial; active |
| BIP — Przetargi sprzedaż lokali (dedicated flat-auction board) | https://bipostroda.warmia.mazury.pl/kategoria/955/przetargi-sprzedaz-lokali.html | **Currently empty — 0 entries** |
| BIP — Wykaz lokali przeznaczonych do sprzedaży | https://bipostroda.warmia.mazury.pl/kategoria/743/wykaz-lokali-przeznaczonych-do-sprzedazy.html | Pre-auction notice lists |
| ostroda.pl Ogłoszenia (WordPress) | https://www.ostroda.pl/ogloszenia/ | Ad-hoc flat auction announcements + result notices |
| ostroda.pl — wykaz nieruchomości | https://www.ostroda.pl/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy-w-drodze-przetargu/ | Pre-auction registry |

Result notices ("Informacja o wyniku przetargu") for the rare flat auction are published on **ostroda.pl** (WordPress), not on the BIP przetargi board. Example: https://www.ostroda.pl/ogloszenia/informacja-o-wyniku-i-przetargu-lokal-mieszkalny-plac-tysiaclecia-pp-4-17/

No separate housing manager (TBS, ZBM, ZGK) publishes flat-auction przetargi for Ostróda; everything flows through Urząd Miejski / Wydział Geodezji.

---

## 3. Format + rendering

- **BIP** (bipostroda.warmia.mazury.pl): server-side rendered HTML, Warmińsko-Mazurskie Centrum Nowych Technologii CMS. Category listing is a simple HTML table with pagination. Individual announcement pages are plain HTML text. No auth, no bot block observed. No PDFs for property announcements (text inline). LIVE-VERIFIED.
- **ostroda.pl**: WordPress 6.9.4. Announcements are standard WP posts under `/ogloszenia/` category. Plain HTML body text with structured data (price, date, KW number inline). No auth. No bot block observed. LIVE-VERIFIED.
- No SPA, no JSON API, no scanned PDFs in announcements fetched.

---

## 4. Volume + achieved-price stream

| Metric | Assessment |
|---|---|
| Active flat-auction listings (BIP board) | **0** (live-verified) |
| Flat auctions per year (estimated from search) | ≤ 1, possibly 0 in most years |
| Land/commercial auctions | Active, several/year (not target) |
| Achieved-price notices for flats | Rare; last found: Aug 2022 (negative result, 70 000 PLN reserve unmet) |
| Bezprzetargowa flat listings | Ongoing (tenant purchase channel) — not scrapable as auction results |

The achieved-price stream is effectively empty. Even the one documented flat auction ended without a sale.

---

## 5. Adapter effort + verdict

**Closest analog among known adapters:** None — volume is too low to justify an adapter. Superficially similar to a minimal city BIP like Tarnowskie Góry in structure (WordPress city site + regional BIP CMS), but Tarnowskie Góry has actual auction volume; Ostróda does not.

**Blockers:**
1. Zero active entries in the dedicated flat-auction BIP category (live-verified).
2. The primary disposal route for flats is bezprzetargowa — structurally excluded from scope.
3. When flat auctions do occur (very rarely), they are posted ad-hoc on a WordPress blog (`ostroda.pl/ogloszenia/`) without consistent URL structure or machine-readable fields; and typically end negative (no sale).

**Risks if reconsidered later:**
- Result notices and auction announcements are split across two separate domains (ostroda.pl + bipostroda.warmia.mazury.pl), requiring dual scraping.
- The BIP CMS category for lokale (`/kategoria/955/`) exists but is currently empty; it could theoretically fill in future, though the bezprzetargowa preference suggests it will remain low.

**VERDICT: NO-BUILD** — no scrapable flat-auction stream exists. If the city eventually activates the `/kategoria/955/` board with real listings, the BIP CMS is straightforward HTML (Low technical effort), but the prerequisite (volume > 0) is not met today. Revisit if ≥ 3 listings appear in that board.

---

## Sources

- BIP Gmina Miejska Ostróda — przetargi sprzedaż lokali (LIVE-VERIFIED empty): https://bipostroda.warmia.mazury.pl/kategoria/955/przetargi-sprzedaz-lokali.html
- BIP — zbywanie nieruchomości w drodze przetargu (procedure page, LIVE-VERIFIED): https://bipostroda.warmia.mazury.pl/3550/zbywanie-nieruchomosci-zabudowanych-i-niezabudowanych-w-drodze-przetargu.html
- BIP — przetargi sprzedaż najem nieruchomości (land/commercial board): https://bipostroda.warmia.mazury.pl/kategoria/770/przetargi-sprzedaz-najem-nieruchomosci.html
- ostroda.pl — wynik I przetargu lokal mieszkalny Plac Tysiąclecia PP 4-17 (LIVE-VERIFIED): https://www.ostroda.pl/ogloszenia/informacja-o-wyniku-i-przetargu-lokal-mieszkalny-plac-tysiaclecia-pp-4-17/
- BIP — wykaz lokali bezprzetargowych ul. Pieniężnego 12: https://bipostroda.warmia.mazury.pl/6839/wykaz-lokali-mieszkalnych-przeznaczonych-do-sprzedazy-w-drodze-bezprzetargowej-na-rzecz-najemcow-lokal-mieszkalny-nr-8-polozony-w-budynku-przy-ul.-pienieznego-12-w-ostrodzie.html
- ostroda.pl — wykaz nieruchomości przeznaczonych do sprzedaży w drodze przetargu: https://www.ostroda.pl/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy-w-drodze-przetargu/
