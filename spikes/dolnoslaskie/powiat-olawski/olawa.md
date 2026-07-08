# Spike — Oława (Dolnośląskie · powiat oławski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Miasto Oława (gmina miejska — **Burmistrz Miasta Oława**, Urząd Miejski, Pl. Zamkowy 15) sells municipal **lokale mieszkalne** via *trzeci/drugi/pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej* — confirmed live. Published on the town BIP `bip.um.olawa.pl`, which runs **MADKOM eBIP** (React SPA + JSON API `/api/menu/{id}/articles` + `/api/articles/{id}`) — the **Milicz** analog. Auction announcements and results are posted as **Burmistrz zarządzenia** under *Gospodarka nieruchomościami → Zbywanie nieruchomości* (menu 258), with the actual data in **born-digital text PDF** attachments (`e,pobierz,get.html?id=…`; clean `pdftotext`, no OCR). On spike day the current board carried **3 concurrent open flat auctions** (Rybacka 36/1 among them) plus 2 result-protocol zarządzenia; the archive holds **570** disposal items. Achieved (hammer) prices published as `informacja o wyniku przetargu` PDFs (cena wywoławcza / najwyższa cena osiągnięta / nabywca). No technical blockers; only real work is PDF-table parsing.

## 1. Sells municipal property at auction?
**YES — confirmed, flats specifically.** The Burmistrz Miasta Oława runs recurring `przetarg ustny nieograniczony` on `sprzedaż nieruchomości lokalowej (lokalu mieszkalnego)`, with the I → II → III repeat cadence for unsold flats. Live evidence (all TOWN, all on `bip.um.olawa.pl`, board *Zbywanie nieruchomości*, article ids under `a,NNNNN`):
- **Zarz. 65/0050/2026** (11.05.2026, `a,31923`) — trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej, **ul. Rybacka 36/1**, lokal mieszkalny **65,34 m²** (3 pokoje + kuchnia), działka 2/9 ark. 45; I przetarg 19.11.2025, II 11.03.2026, III bieżący. Powiat oławski, j. ewid. 021501_1 Oława.
- **Zarz. 64/0050/2026** (`a,31922`) i **Zarz. 66/0050/2026** (`a,31924`) — dwa kolejne, równoległe *trzecie* przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych (11.05.2026).
- **Zarz. 45/0050/2026** (19.03.2026, `a,31797`) — zatwierdzenie protokołu z **drugiego** przetargu ustnego (rozstrzygnięcie).
- **Zarz. 44/0050/2026** (19.03.2026, `a,31795`) — zatwierdzenie protokołu z przetargu ustnego na sprzedaż spółdzielczego prawa.
- Historyczne: ul. **Lipowa 49/2**, lokal mieszkalny 108,64 m², cena wywoławcza **472 000 zł**, przetarg 15.05.2024 (Urząd Miejski, Pl. Zamkowy 15).

Open auction, natural + legal persons, wadium (10%). Distinct from the rural **Gmina Oława** (`bip.gminaolawa.pl`) and the **Starostwo Powiatowe** (`bip.starostwo.olawa.pl`) — both out of scope; our target is the town.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP `bip.um.olawa.pl` (MADKOM eBIP React SPA):**
- Gospodarka nieruchomościami (parent): `https://bip.um.olawa.pl/m,204,gospodarka-nieruchomosciami.html`
  - **Zbywanie nieruchomości** (THE board — ogłoszenia + wyniki): `https://bip.um.olawa.pl/m,258,zbywanie-nieruchomosci.html`
  - Najem, dzierżawa, użyczenie (leases — skip): `m,259,najem-dzierzawa-uzyczenie.html`
- Archiwum (outdated list): `https://bip.um.olawa.pl/o,258,zbywanie-nieruchomosci.html` — **570** artykułów.
- Article page: `a,NNNNN,slug.html`; attachment download: `e,pobierz,get.html?id={fileId}` (PDF).
- **JSON API** (the real integration surface):
  - Nav/menu tree: `GET /api/menu/{id}` and `GET /api/menu/{id}/submenu`
  - Article list: `GET /api/menu/258/articles?limit=&offset=&archived=0|1&sort=&sort_dir=&tab=` (`total` + paged `articles[]`; list view returns ids/links but **not** titles)
  - Article detail: `GET /api/articles/{id}` → `title`, `content` (HTML, thin), `attachments[]` (`name`, `link=e,pobierz,get.html?id=…`, `size`)
- **NOTE / trap:** `m,203,przetargi-i-konkursy.html` (menu 203) is **procurement only** — children are 200 *Zamówienia publiczne* + 199 *Konkursy*, **not** property. Do not point the adapter there.

Contact: Urząd Miejski w Oławie, **Pl. Zamkowy 15, 55-200 Oława**; housing/property via *Wydział Gospodarki Komunalnej, Mieszkaniowej i Ochrony Środowiska* (no separate ZGM/TBS spółka — town manages directly).

## 3. Format + rendering
- **JS-SPA (React) fronting a clean JSON API** — MADKOM eBIP. The `m,…/a,…/o,…` HTML URLs are client-routed; the raw HTML is a 4 KB webpack shell (`<div id="root">`), so scrape the **API**, not the HTML.
- **Auction data lives in born-digital text PDFs**, not the article body (`content` is just the title). `zał. nr 1` = OGŁOSZENIE (3 pp.), `zał. nr 2` = Regulamin, plus the Zarządzenie and (post-auction) `informacja o wyniku przetargu` (1 p.). `pdftotext` extracts cleanly — **no OCR**. PDF v1.7.
- No auth / no CAPTCHA / no rate-limit signals observed from the Polish IP. `/api/menu/get-all` rejects (id-only routes), but per-menu endpoints are open.

## 4. Volume + achieved-price stream
- **Volume:** Good. Current *Zbywanie nieruchomości* live list = 5 (3 open flat auctions + 2 result protocols); the board archive = **570** disposal artykułów across years (flats + land + wykazy + wyniki). Flats recur in multi-lot cycles with I/II/III przetarg progression — steady inventory, not a one-off.
- **Achieved-price stream:** **YES.** `Informacja o wyniku przetargu` PDF (§12 Rozp. RM 14.09.2004) tabulates **cena wywoławcza / najwyższa cena osiągnięta / imię i nazwisko nabywcy** per lokal (e.g. wynik of the trzecie przetargi settled 24.06.2026). Redundantly, each result is also a `zatwierdzenie protokołu` zarządzenie. Both born-digital, parseable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Milicz** (MADKOM eBIP, React SPA + `/api/menu/{id}/articles` + `/api/articles/{id}` JSON). Clone that fetch layer.
- **CMS family:** MADKOM eBIP (JSON-API-backed SPA) — ADAPTER-GUIDE JSON-API path, plus born-digital PDF (`pdfText`) extraction.
- **Effort: MEDIUM.** Pipeline: `GET /api/menu/258/articles` (current + `archived=1` for backfill, bounded — 570) → per-id `GET /api/articles/{id}` → filter titles for `lokal(u) mieszkaln`/`nieruchomości lokalowej` and `przetarg ustny nieograniczony` (drop land, najem/dzierżawa, spółdzielcze-prawo edge cases) → download `zał. nr 1`/`informacja o wyniku` PDFs → `pdfText` → regex/table parse (address, powierzchnia użytkowa, cena wywoławcza, round I/II/III, date; results → cena osiągnięta + nabywca). Not pure HTML, hence Medium not Low.
- **Blockers:** None hard. Watch-items: (1) data is in PDF attachments, not JSON body — must pull attachments; (2) announcement + result live in the **same** board (and same article, as a later attachment) — de-dupe by lokal; (3) avoid the `m,203` procurement trap and the two neighbouring JSTs sharing the "Oława" name.

**VERDICT: BUILD (Medium effort)** — recurring open flat auctions by Burmistrz Miasta Oława on a clean MADKOM JSON-API BIP with born-digital ogłoszenie + informacja-o-wyniku PDFs (achieved prices); Milicz analog, no blockers.
