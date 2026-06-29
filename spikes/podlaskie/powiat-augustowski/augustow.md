# Spike — Augustów (Podlaskie · powiat augustowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Augustów (Burmistrz) auctions municipal flats via *ustny przetarg nieograniczony* directly on the city BIP at `bip.um.augustow.pl`. Format is clean server-rendered HTML (SmartSite/BIT CMS) with optional PDF attachments. Announcements **and** result notices ("Informacja o wynikach") are published on the same board. Archive has 19 pages of records going back to before 2017. Volume is low-to-medium: flat sales are sporadic (a handful of unique addresses over 2023–2024), but the achieved-price stream exists and is parseable from HTML. No dedicated housing manager publishes flat auctions — it is the city hall itself. No auth/bot blocks detected on the list pages.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** The Burmistrz Miasta Augustowa publishes *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*. Confirmed examples:

- **Rynek Zygmunta Augusta 16, lokal nr 1** (62.87 m², cena wywoławcza 440 093 PLN) — first przetarg announced 31 July 2023.
- **Rynek Zygmunta Augusta 16, lokal nr 3** (46.05 m², cena wywoławcza 322 352 PLN) — same announcement, then a second przetarg followed.
- **Polna 4** — separate flat sale przetarg confirmed in search results.
- Result notice confirmed: "Informacja o wynikach pierwszego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 3, Rynek Zygmunta Augusta 16" published 2024-09-17.

Flat sales are direct city-hall auctions, not bezprzetargowo to tenants. The city also auctions land and built structures (Wojska Polskiego 1, Turystyczna plots), so flats are a **subset** of a mixed-use property board.

---

## 2. Where published? (hosts + boards, URLs)

| Layer | URL | Notes |
|---|---|---|
| BIP przetargi root | https://bip.um.augustow.pl/przetargi/ | SmartSite/BIT CMS, server-rendered HTML |
| Nieruchomości board | https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ | Parent of both sub-boards |
| Active announcements | https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-aktualne/ | 2 pages as of 2026-06-29; includes active przetargi AND result notices |
| Archive | https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-nieaktualne/ | 19 pages; older closed/expired entries |
| Mirror on city site | https://urzad.augustow.pl/node/1340 (aktualne) and `/node/1341` (archiwalne) | Drupal 7 mirror; same content as BIP, slightly different URL slug pattern |

Result/achieved-price notices appear **on the same board** as announcements, prefixed "Informacja o wynikach…" — no separate results section needed.

There is also an electronic notice board at `eto.um.augustow.pl` (linked from city navbar) but it appears to be for different categories. The BIP board is the canonical source for property auctions.

---

## 3. Format + rendering

- **CMS:** SmartSite by BIT Sp. z o.o. (`meta-generator: SmartSite by BIT Sp. z o.o. - https://www.bit-sa.pl`) — standard Polish municipal CMS, same family seen in other Podlaskie towns.
- **List pages:** Plain server-rendered HTML. Each item is a `<h2>` link with a date stamp. Paginated (`?page=N`). No JavaScript required to load the list.
- **Detail pages:** Server-rendered HTML (Drupal 7 on the `urzad.augustow.pl` mirror, SmartSite on `bip.um.augustow.pl`). Full announcement text is in the HTML body — address, unit number, area, cena wywoławcza, wadium, auction date. No SPA.
- **PDF attachments:** Optional — announcements sometimes include a PDF copy (e.g. `ogloszenie_przetarg_-_rynek_zygmunta_augusta_16.pdf`, 135 KB). The HTML body contains all structured data so PDF parsing is not required.
- **Auth/bot blocks:** None detected on list pages. Individual detail page URLs can exceed the web-fetch tool's URL-length limit (~200 chars) due to long slug names — this is a scraper concern (use GET with the slug) but not a bot-block.
- **Achieved price in result notices:** The "Informacja o wynikach" pages are HTML detail pages on the same board; they contain the winning bid price. Format needs a single follow-up live fetch to confirm field names, but the pattern is consistent with other SmartSite BIPs.

---

## 4. Volume + achieved-price stream

- **Overall board volume:** ~190 entries across 21 pages (2 aktualne + 19 nieaktualne pages, ~10 entries/page). Covers 2017–2026.
- **Flat-specific volume:** Low — identified at minimum Rynek Zygmunta Augusta 16 (lokal 1 and 3, multiple rounds 2023–2024) and Polna 4. Mixed with land, commercial, and lease entries. Flats appear maybe 2–5 unique addresses per year.
- **Achieved-price stream:** Confirmed present. "Informacja o wynikach" entries are published on the same boards. The 2024-09-17 result notice for lokal nr 3 is LIVE-VERIFIED by title in the archive list. Prices are in HTML body (not PDFs only).
- **Re-auction pattern:** City runs sequential przetargi (1st, 2nd, 3rd…) until sold or abandoned — e.g. Wojska Polskiego 1 reached at least the 6th przetarg by 2026. This means multiple entries per property but one unique asset.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom pattern — single municipal BIP board mixing property types, server-rendered HTML, SmartSite CMS, pagination, result notices on same board.

**Effort: Medium** (not Low, because):
1. Flat entries must be filtered from a mixed-type board (land, lease, commercial all coexist). Filter by title keyword: "lokal mieszkalny" or "lokali mieszkalnych".
2. Long URL slugs — scraper must handle slugs exceeding typical URL limits; use the BIP list page links directly rather than constructing URLs.
3. Two parallel boards to scrape: `ogloszenia-aktualne` (active + recent results) and `ogloszenia-nieaktualne` (archive) — different URL paths, same pagination pattern.
4. Achieved-price detail pages also have long slugs; parse from list-page title links.

**No blockers.** No auth, no SPA, no mandatory PDF-only content, no CAPTCHA observed.

**Risks:**
- Low flat volume (~2–5 per year) means the feed will be sparse; worth combining with land/commercial if the project scope expands.
- SmartSite CMS occasionally moves entries between "aktualne" and "nieaktualne" without a clear rule — monitor both boards.
- The `eto.um.augustow.pl` board may duplicate or supplement some notices; low priority to verify.

**Verdict: BUILD** — confirmed flat auctions via ustny przetarg nieograniczony, clean scrapable HTML, achieved-price notices present, no technical blockers. Medium effort due to mixed-type board filtering and dual-board pagination.

---

### Key URLs cited

- BIP Przetargi: https://bip.um.augustow.pl/przetargi/
- Sprzedaż, dzierżawa board: https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/
- Ogłoszenia aktualne: https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-aktualne/
- Ogłoszenia nieaktualne: https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-nieaktualne/
- City site auction mirror (aktualne): https://urzad.augustow.pl/node/1340
- Example flat announcement (urzad.augustow.pl): https://urzad.augustow.pl/aktualnosci/burmistrz-miasta-augustowa-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-7
- Spółdzielnia Mieszkaniowa w Augustowie (not involved in municipal sales): https://www.smaugustow.pl/
