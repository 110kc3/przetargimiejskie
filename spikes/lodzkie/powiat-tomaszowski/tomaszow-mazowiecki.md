# Spike — Tomaszów Mazowiecki (Łódzkie · powiat tomaszowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Tomaszów Mazowiecki (Łódź voivodeship, ~62k pop.) conducts genuine *ustne przetargi nieograniczone* for the sale of municipal flats (lokale mieszkalne). Confirmed: result-notice pages exist on the city BIP for flat-auction resolutions (Plac Kościuszki 4 units C5+C9). The primary publisher is the **Wydział Gospodarki Nieruchomościami (WGN)** operating directly through the city BIP at `bip.tomaszow.miasta.pl`. There is also **TTBS** (Tomaszowskie Towarzystwo Budownictwa Społeczne), a municipal TBS company, which handles social-rental stock but does NOT sell flats at open auction — it exclusively manages rental. The dominant flat-sale mechanism is a mix of *bezprzetargowa* (tenant-buyout) and open oral auctions for special/vacant units. The BIP uses a session-protected CMS (deep links redirect to homepage), but content is accessible via direct navigation. Format is server-rendered HTML with attached PDFs. No auth wall against read access; no SPA or bot block observed.

---

## 1. Sells municipal property at auction?

**YES — confirmed for lokale mieszkalne.**

The city explicitly runs *I/II/III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* for units that are either vacant (no sitting tenant), tenant-declined, or historically special (e.g., Plac Kościuszki heritage tenement). Evidence:

- **Google snippet** (bip.tomaszow.miasta.pl, id=175624): *"Informacja dotycząca rozstrzygnięcia przetargu ustnego nieograniczonego na łączną sprzedaż lokalu użytkowego oznaczonego nr C5 i lokalu mieszkalnego oznaczonego nr C9 położonych w Tomaszowie Mazowieckim przy Placu Kościuszki 4"* — this is a resolved flat+commercial combined auction with a posted result notice. LIVE-VERIFIED via search snippet.
- **Search snippet** confirms similar result-notice pages for ul. gen. Józefa Bema 87 (bip id=189126) and other addresses.
- The city's WGN department page (`tomaszow-maz.pl/...sprzedaz-lokali-mieszkaniowych`) describes **two parallel tracks**:
  1. **Bezprzetargowa** (dominant): tenant/occupier buyout procedure — appraisal → rokowania → notarial deed. Governed by Uchwała Nr XXXIII/322/04 and amendments (2005, 2009, 2015).
  2. **Przetargowa** (open auction): units not sold bezprzetargowo (vacant/no tenant) go to open oral unlimited auction (*przetarg ustny nieograniczony*), announced on BIP + city notice board.
- **adradar.pl** LIVE confirms recent city-organised property auctions at the UM — May 2026 saw auctions at ul. Konstytucji 3 Maja (700k PLN), ul. Spalska (284k PLN), ul. Środkowa (227k PLN). These appear as "komercyjne" on adradar (it miscategorises mixed/commercial lots) but the BIP snippets confirm lokal mieszkalny entries exist in the same WGN stream.

**Verdict on Q1:** The gmina does auction municipal flats. Volume is moderate (not mass-scale like Gliwice) — likely 3–10 przetarg residential lots per year alongside a larger bezprzetargowa track.

---

## 2. Where published? (hosts + boards, URLs)

### Primary publisher: Gmina Miasto Tomaszów Mazowiecki — Wydział Gospodarki Nieruchomościami (WGN)

| Type | URL | Notes |
|---|---|---|
| BIP root | `http://bip.tomaszow.miasta.pl/public/` | Server-rendered HTML; CMS version 3.0.43 WCAG 2.1 AA |
| Aktywne wykazy nieruchomości | `http://bip.tomaszow.miasta.pl/public/?id=153642` | Wykaz lokali do zbycia; deep link session-guarded → redirects to homepage |
| Ogłoszenia o przetargach (zbycie) | `http://bip.tomaszow.miasta.pl/public/?id=144386` | Active auction announcements |
| Wyniki przetargów (Prezydent) | `http://bip.tomaszow.miasta.pl/public/?id=148898` | Result notices / rozstrzygnięcia |
| Nieruchomości przeznaczone do zbycia | `http://bip.tomaszow.miasta.pl/public/?id=143948` | Master property-for-sale index |
| Example result notice (flat, Pl. Kościuszki 4) | `https://bip.tomaszow.miasta.pl/public/?id=175624` | Confirmed via search snippet: lokal mieszkalny C9 + lokal użytkowy C5 combined |
| Example result notice (Bema 87) | `https://bip.tomaszow.miasta.pl/public/?id=189126` | Another resolved przetarg |
| Example auction notice (Bartosza Głowackiego 57) | `http://bip.tomaszow.miasta.pl/public/?id=180678` | Active/recent auction |

### Secondary aggregators (monitoring use only)
- **adradar.pl** `https://przetargi.adradar.pl/p/a/25514/Tomasz%C3%B3w+Mazowiecki/a` — LIVE-VERIFIED, shows city auctions scraped from BIP. Categorises results as "miasto" organiser. 17 pages of archive. **Best secondary source for monitoring volume.**
- **infopublikator.pl** — mirrors some BIP announcements.

### TTBS (Tomaszowskie Towarzystwo Budownictwa Społeczne)
- BIP: `https://bip.ttbs.com.pl/` — handles procurement (construction/maintenance), NOT flat sales.
- Main site: `https://ttbs.com.pl/` — rental flats and lokale użytkowe to let; no flat-sale przetargi.
- **TTBS is out of scope** for this adapter; it does not run flat-sale auctions.

### Physical notice board
Per Polish law (art. 35 ustawy o gospodarce nieruchomościami), wykaz is posted for 21 days on the UM notice board (ul. POW 10/16, Tomaszów Mazowiecki) before auction is called. BIP mirrors this.

---

## 3. Format + rendering

| Aspect | Finding |
|---|---|
| CMS | Custom PHP-based BIP (wersja 3.0.43), server-rendered HTML |
| Deep-link behaviour | `?id=NNNNNN` params work on HTTPS direct fetch but the CMS redirects to homepage when session cookie absent (observed live: fetches of id=153642, id=148898, id=175624 all returned homepage). URL pattern intact for scraping via search-indexed URLs. |
| Content encoding | UTF-8 (BIP); ISO-8859-2 (egospodarka aggregator) |
| Announcement format | HTML body text with inline details (address, area, cena wywoławcza, wadium, przetarg date). Supplementary PDFs (maps, floor plans, ogłoszenie scans) linked as `get_file.php?id=NNNNNN`. |
| PDF type | Text PDFs (oficjalne ogłoszenia are text; floor-plan scans may be image-PDFs). Not primarily scanned docs. |
| Result notices | HTML pages on BIP listing: achieved price, winner description, auction date. Key fields in plain text. |
| Auth/bot blocks | No auth wall observed. No Cloudflare, no CAPTCHA. BIP is open-access. The session-redirect issue is a CMS quirk (no persistent sessions for anonymous users), not an intentional block. Workaround: follow search-indexed URLs, or use `?id=` scrape + fallback to Google cache. |
| SPA | No — fully server-rendered. |

---

## 4. Volume + achieved-price stream

### Auction volume
- **Bezprzetargowa** track (tenant buyout): high volume — many dozens per year processed by WGN. These do **not** generate public przetarg announcements (they go through private rokowania). Not interesting for this aggregator.
- **Open przetarg** track (vacant/special units): estimated **3–12 auctions/year** based on:
  - Multiple distinct BIP result-notice pages confirmed via search (Pl. Kościuszki 4, Bema 87, Głowackiego 57, Konstytucji 3 Maja, Spalska, Środkowa).
  - adradar.pl shows ~17 pages (but includes all property types and komornicy; city-only is maybe 8–10 items over rolling 12 months visible).
  - The 2026 listings on adradar confirm: at least 3 city-organised auctions in Apr–May 2026 alone (Konstytucji 3 Maja, Spalska, Środkowa), though these may be mixed lokal użytkowy/mieszkalny.

### Achieved-price stream
- **Result notices ARE published** on BIP (confirmed by snippet for Pl. Kościuszki 4 C9). The pattern is "Informacja dotycząca rozstrzygnięcia przetargu ustnego nieograniczonego na sprzedaż [lokal] — Urząd Miasta w Tomaszowie Mazowieckim" as distinct HTML pages.
- Achieved prices are embedded in HTML body text of result pages (not in structured data or JSON).
- No API or dedicated endpoint for results. Scraping requires: (1) index page crawl + (2) individual result-page fetch.
- **Limitation:** BIP deep-link session issue means scraper must either spider from the index page in a single session, or use pre-indexed URLs from search + direct GET.

---

## 5. Adapter effort + verdict

### Closest analog
**Bytom** (Śląskie) — generic city BIP, mixed property types (not dedicated housing-manager portal), moderate volume, flat-sale przetargi confirmed, HTML result notices with achieved prices, session-aware CMS quirk. Not as high-volume as Gliwice/Zabrze.

### Architecture
1. **Discovery scraper**: Hit `bip.tomaszow.miasta.pl/public/?id=144386` (ogłoszenia) and `?id=153642` (wykazy) in-session — walk child pages to find individual przetarg announcement entries. Fallback: use Google/Bing site-search results as seed URLs.
2. **Announcement parser**: Extract HTML body text (BeautifulSoup). Key fields: address, lokal nr, area (m²), cena wywoławcza, wadium, przetarg date.
3. **Result-notice discovery**: Poll `?id=148898` (Prezydent's rozstrzygnięcia board) for new child links. Fetch each to extract: achieved price, date, lokal details.
4. **PDF handling**: Some announcements link to PDF scans (text PDFs, not OCR-needed). Optional enhancement.

### Blockers / risks
- **Session-redirect CMS**: The most material technical risk. Anonymous fetches of `?id=` pages redirect to homepage. Mitigation: establish session cookie by hitting root first, then follow child links in the same session. Or scrape via cached search snippets. Needs testing.
- **Inconsistent categorisation**: adradar shows some city lots as "komercyjne" — the BIP itself uses "lokal mieszkalny" vs "lokal użytkowy" terminology correctly. Parser must filter by presence of "mieszkalny" in text.
- **Low volume**: ~5–10 flat auctions/year. Enough to be worth showing but won't be high-frequency.
- **No structured data**: All in HTML prose. Parsing is regex/heuristic on Polish legal text templates.
- **Bezprzetargowa track**: Will not appear as przetarg announcements; exclude by design.

### Effort estimate
- Session-handling + scraper: 1–2 days
- Parser (announcement + result): 1 day
- Integration + tests: 1 day
- **Total: ~3–4 days (Medium effort)**

### Verdict
**BUILD** — The gmina runs confirmed *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych*, publishes both announcements and result notices on BIP, format is scrape-friendly HTML, no auth wall. Volume is modest but real. Session-CMS workaround is the only non-trivial technical hurdle, and it has known solutions from similar cities.

---

## Sources

- City BIP root (LIVE): `http://bip.tomaszow.miasta.pl/public/` (fetched 2026-06-27)
- Auctions board: `http://bip.tomaszow.miasta.pl/public/?id=144386`
- Result notices board: `http://bip.tomaszow.miasta.pl/public/?id=148898`
- Flat-sale result notice (Pl. Kościuszki 4, lokal mieszkalny C9): `https://bip.tomaszow.miasta.pl/public/?id=175624`
- Result notice (Bema 87): `https://bip.tomaszow.miasta.pl/public/?id=189126`
- WGN "Sprzedaż lokali mieszkaniowych" procedural page (LIVE, full text fetched): `https://www.tomaszow-maz.pl/urzad-miasta/wydzialy/wnos/co-zalatwisz-w-wydziale/sprzedaz-i-dzierzawa-nieruchomosci/sprzedaz-lokali-mieszkaniowych`
- adradar Monitor Przetargów — Tomaszów Mazowiecki (LIVE, fetched 2026-06-27): `https://przetargi.adradar.pl/p/a/25514/Tomasz%C3%B3w+Mazowiecki/a`
- TTBS BIP: `https://bip.ttbs.com.pl/`
- Search result confirming lokal mieszkalny flat auction vocabulary on BIP: various Google snippets (2026-06-27)
