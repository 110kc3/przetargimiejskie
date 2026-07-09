# Spike — Ożarów Mazowiecki (Mazowieckie · powiat warszawski zachodni)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Ożarów Mazowiecki (Urząd Miasta i Gminy, miejsko-wiejska) actively sells municipal **lokale mieszkalne** via **przetarg ustny nieograniczony na sprzedaż** — confirmed several times in 2025 (Floriana 3/34 · 50,90 m²; Umiastowska 68A/2 · 26,17 m²; Kasztanowa 14/11 · 31,99 m²; Poznańska 202; Fabryczna 5), several as II/III round. This is real flat stock — the gmina is divesting former **SHR Płochocin** (post-PGR state-farm) worker flats, so despite being an affluent Warsaw-fringe gmina it has recurring municipal flat volume, not just land. Two sources: (a) the **Serwis Gminy WordPress** `ozarow-mazowiecki.pl`, category `/nieruchomosci-przeznaczone-do-zbycia/` with dated permalink notices `/YYYY/MM/DD/slug/` — clean server-rendered HTML giving address/area/round/type, with the numeric fields (cena wywoławcza, wadium, date) in **born-digital PDF** attachments (`Załącznik nr 1 – Ogłoszenie o przetargu`, `Zarządzenie …`); (b) the formal **BIP** `bip.ozarow-mazowiecki.pl` (`m,NNNNN,slug.html` + legacy `?c=NNN`). Closest analog: WordPress + PDF-attachment gmina (**olkusz / bochnia / nowa-sol** pattern) with `pdfText` for the numbers. No auth/CAPTCHA blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats (open oral auctions).** The Burmistrz runs `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`. Confirmed 2025 flat auctions:
- **ul. Floriana 3, lok. 34** — 50,90 m² — *drugi* (II) przetarg ustny nieograniczony (2025-08-22 notice).
- **ul. Umiastowska 68A, lok. 2** — 26,17 m² — I przetarg ustny nieograniczony, obręb Umiastów, dz. 65/5 + udział w nieruchomości wspólnej (2025-08-14).
- **ul. Kasztanowej 14, lok. 11** — 31,99 m² + pomieszczenie przynależne 4,67 m² + udział 3666/291947 — I przetarg, obręb SHR Płochocin, dz. 17/9 (2025-12-01).
- **ul. Fabrycznej 5** — lokale mieszkalne — III przetarg, obręb SHR Płochocin, dz. 3/15.
- **ul. Poznańskiej 202, lok. 3 i 4** — lokale mieszkalne, dz. 121/9.

Also land/działki auctions (e.g. Duchnice dz. 25/40, 25/40) and dzierżawa on separate boards. Flats are open oral auctions (natural + legal persons, 10% wadium) — **not** bezprzetargowo-na-rzecz-najemcy; the recurring II/III rounds show repeat listings of unsold post-SHR flats. This is genuine flat volume, distinguishing it from land-only Warsaw-fringe gminy.

## 2. Where published? (hosts + boards, URLs)
**Primary — Serwis Gminy (WordPress), best scraper target:**
- Category board: `https://ozarow-mazowiecki.pl/nieruchomosci-przeznaczone-do-zbycia/`
- Notice permalinks (dated): `https://ozarow-mazowiecki.pl/YYYY/MM/DD/<slug>/`, e.g.
  - `https://ozarow-mazowiecki.pl/2025/08/22/drugi-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-34-w-budynku-przy-ul-floriana-3-...`
  - `https://ozarow-mazowiecki.pl/2025/08/14/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-o-pow-2617-m²-...-umiastowskiej-68a-...`
  - `https://ozarow-mazowiecki.pl/2025/12/01/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-11-o-powierzchni-3199-m²-...-kasztanowej-14-...`
- Each notice attaches born-digital PDFs: `Zarządzenie_Nr_B.0050.NNN.YYYY.pdf`, `Załącznik_nr_1_-Ogloszenie_o_przetargu.pdf`, `Załącznik_nr_2_-Regulamin_przetargu.pdf`.

**Secondary — formal BIP:**
- Host: `https://bip.ozarow-mazowiecki.pl`
- New CMS boards: `m,NNNNN,<slug>.html` — e.g. `m,20208,przetargi-nieograniczone.html` (largely zamówienia publiczne), `m,23139,przetarg-nieograniczony.html`, `m,23406,przetargi-na-dzierzawe-nieruchomosci.html`.
- Legacy article scheme still live: `bip.ozarow-mazowiecki.pl/?c=NNN` (e.g. `?c=184`, yearly archives `?c=2984` = 2020).

**Do NOT confuse** with `bip.ozarow.pl` / `ozarow.bip.gov.pl` — that is **Ożarów in świętokrzyskie** (out of scope), nor `bip.pwz.pl` (Starostwo Powiatowe pow. warszawski zachodni — county, not gmina).

## 3. Format + rendering
- **Serwis WordPress (`ozarow-mazowiecki.pl`)** — server-rendered HTML: title + summary body present without JS; carries type/address/area/round in-band. **Core numeric fields (cena wywoławcza, wadium, auction date/time) live in the attached born-digital `Ogłoszenie o przetargu` / `Zarządzenie` PDFs** → route through `pdfText` (pdftotext; OCR not expected on these born-digital docs).
- **BIP (`bip.ozarow-mazowiecki.pl`)** — WebFetch of `m,NNNNN` / `?c=` pages returned only a header stub (Home / Kalkulator nav), i.e. body likely JS-injected or extraction-hostile; the WordPress serwis is the cleaner source and mirrors the same notices. Use BIP only as a backfill/cross-check.
- No auth, no CAPTCHA, no rate-limit signals observed.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest but real — on the order of a handful of flat auctions/year plus land, driven by the multi-year divestment of former **SHR Płochocin** (post-PGR) flats (Kasztanowa, Fabryczna, Poznańska, Floriana, Umiastowska all appear). II/III rounds recur as unsold flats re-list. No dedicated housing manager (ZGM/TBS) publishing a high-frequency stream — the gmina Wydział Gospodarki Nieruchomościami handles it directly.
- **Achieved-price stream:** NOT independently confirmed live this spike. Notices carry `cena wywoławcza` (in the PDF); the statutory `informacja o wyniku przetargu` (cena osiągnięta / nabywca) is legally required and normally posted to the same serwis category / BIP, but was not surfaced in sampling. **Treat the result board as a confirm-on-build item** — likely present in the `nieruchomosci-przeznaczone-do-zbycia` category or a BIP `wyniki` page.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **WordPress + PDF-attachment gmina** — `olkusz` / `bochnia` / `nowa-sol` pattern (ADAPTER-GUIDE §3 "WordPress / custom HTML" family): crawl a dated WP category, fetch each permalink, pull the `Ogłoszenie o przetargu` PDF, `pdfText` → regex the fields.
- **CMS family:** WordPress serwis (server HTML) + born-digital PDF; secondary bespoke/JS BIP.
- **Effort:** **MEDIUM.** Crawl `/nieruchomosci-przeznaczone-do-zbycia/` (bounded pagination) → detail permalinks → in-band HTML gives address/area/round/type + PDF link; `pdfText` on `Ogłoszenie o przetargu` for `cena wywoławcza`, `wadium`, `auction_date`. `classifyKind` to drop land/dzierżawa; `parseAddress` on the street. Slightly above Low because the load-bearing numbers are PDF-only and the achieved-price stream needs a build-time confirm.
- **Blockers:** None hard. Watch-items: (1) core fields in PDF, not HTML → `pdfText` mandatory; (2) results/wynik board unconfirmed; (3) don't crawl the BIP `m,`/`?c=` shell (JS/stub) — use the WordPress serwis; (4) disambiguate from świętokrzyskie Ożarów.

**VERDICT: BUILD (Medium effort)** — recurring open oral flat auctions (post-SHR Płochocin municipal stock) on a clean WordPress serwis with born-digital `Ogłoszenie o przetargu` PDFs; clone the olkusz/bochnia WordPress+PDF analog, `pdfText` for the numbers, confirm the wynik stream at build time.
