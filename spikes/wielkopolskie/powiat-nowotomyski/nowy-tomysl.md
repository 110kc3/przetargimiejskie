# Spike — Nowy Tomyśl (Wielkopolskie · powiat nowotomyski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Nowy Tomyśl (gmina miejsko-wiejska, Urząd Miejski, Wydział Gospodarki Nieruchomościami) DOES sell municipal property at *przetarg ustny nieograniczony/ograniczony* — but the stock is **land** (nieruchomości gruntowe, działki budowlane), not flats. The property-sale board `bip.nowytomysl.pl` (menu id 1103) carries **27 active + 51 archived** notices spanning **2008–2026**, and across that entire ~18-year history there are only **~2 genuine "sprzedaż lokalu mieszkalnego" open auctions (both 2009–2010)** plus one rural residential *building* (Sątopy, Kościelna 2) re-listed in unsold repeat rounds 2010–2013. The **current 2021–2026 board is 100% land** — zero flats. A housing manager exists (**PU ZGM Nowy Tomyśl**, puzgm.pl / ul. Komunalna 2) but it only runs **lease of lokale użytkowe (najem)** and building-renovation contracts — no flat sales. Platform is **MADKOM eBIP** (React SPA + clean `/api/` JSON; announcement bodies live in born-digital PDF attachments). Closest analog: **milicz** (same MADKOM React+JSON stack). Open-flat-auction volume ≈ 0 → **NO-BUILD**.

## 1. Sells municipal property at auction?
**YES for land, effectively NO for flats.** The Burmistrz runs `przetarg ustny nieograniczony` and `ograniczony` for disposal of Gmina Nowy Tomyśl property, but the classification is overwhelmingly **nieruchomość gruntowa** (land) and **działki budowlane** (building plots), plus occasional dzierżawa (lease) and lokal użytkowy (commercial).
- **Active sale board (2021–2026), 27 items:** every one is "sprzedaż nieruchomości" that resolves to **land** — e.g. "przetarg ustny **ograniczony** na sprzedaż nieruchomości … z dnia 02.06.2026" (id 38017), "…nieograniczony…z dnia 15.01.2026" (id 37469/37470), "zbycie nieruchomości nr ewid. 530/56 w Glinnie", Zarząd Województwa land at ul. Zachodnia. **No lokal mieszkalny anywhere.** 16 of 27 titles contain "ograniczon" (restricted-to-neighbours land strips).
- **Archive (51 items, 2008–2025):** the ONLY residential entries are — flat: *"Sprzedaż lokalu mieszkalnego w budynku wielomieszkaniowym przy ul. Nowej"* (2010, id 18133) and *"Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w budynku wielomieszkaniowym"* (2009, id 17458); building: *"…sprzedaż budynku mieszkalnego w Sątopach, ul. Kościelna 2"* re-listed 2010/2011/2012/2013 (one dilapidated village house, repeat unsold rounds). Everything else = land / działki / dzierżawa / lokal użytkowy.
- **Housing manager:** PU ZGM Nowy Tomyśl (puzgm.pl, ul. Komunalna 2) runs **przetarg ustny nieograniczony na NAJEM lokalu użytkowego** (3-yr lease) on behalf of the Burmistrz, plus building-renovation procurement — **not flat sales**. Residential disposal to sitting tenants is the bezprzetargowo-na-rzecz-najemcy path (wykaz only), not open auction.
- The Wiatrakowa 32 flat "przetarg" that surfaces in search is a **private developer** sale by *Jantar Deweloper / zarządca masy sanacyjnej* (jantar-deweloper.pl) — **not municipal**, out of scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (MADKOM eBIP):** `https://bip.nowytomysl.pl`
- Section **Gospodarka Nieruchomościami**: `https://bip.nowytomysl.pl/m,684,gospodarka-nieruchomosciami.html`
  - **Przetargi na sprzedaż nieruchomości** (the sale board): `https://bip.nowytomysl.pl/m,1103,przetargi-na-sprzedaz-nieruchomosci.html`
  - Przetargi na lokale użytkowe (lease/commercial): `.../m,1102,...`
  - Przetargi aktualne: `.../m,1049,...` (currently empty, total=0)
  - Przetargi zakończone: `.../m,1025,...` (stale — 46 items are 2009–2014 PWiK water-company procurement, NOT property results)
- **JSON API (undocumented, open):** base `https://bip.nowytomysl.pl/api/`
  - List: `GET /api/menu/{menuId}/articles?limit=&offset=` (add `?archived=true` for the archive tab) → `{total, articles[]}`, title in `aliasFields[alias=="title"]`, date in `columnFields[fieldId==26]`, link `a,{id},slug.html`.
  - Article: `GET /api/articles/{id}` → `{title, content(HTML), attachments[]}`.
  - Attachment (born-digital PDF): `e,pobierz,get.html?id={fileId}`.
- **Housing manager:** `https://www.puzgm.pl/przetargi/` (renovation contracts) and `.../oferta-pu-zgm/lokale-uzytkowe/przetargi-lokale-uzytkowe/` (lokal-użytkowy lease auctions, ZGM HQ ul. Komunalna 2, pok. 11).

Contact (WGN): Agnieszka Słowińska-Kuchta, tel. **61 44 26 647**, Urząd Miejski w Nowym Tomyślu.

## 3. Format + rendering
- **MADKOM eBIP** — React SPA (create-react-app; bundle string `madkom`, `webpackJsonplayout-default`). Raw HTML is a **4 KB JS shell**; boards render client-side. curl/WebFetch of the `m,NNNN,*.html` URLs returns an empty shell → **must hit the JSON API**, not scrape HTML.
- **Clean JSON API** (`/api/menu/{id}/articles`, `/api/articles/{id}`) — no auth, no CAPTCHA, no rate-limit observed. Easy to consume.
- **Announcement content is in born-digital PDF attachments** (e.g. "Ogłoszenie o przetargu.pdf" 211 KB, "SPROSTOWANIE.pdf"); the article `content` HTML is usually just the title. So field extraction = **`pdfText` on born-digital PDFs** (OCR not needed).
- Rendering summary: **JS-SPA shell → JSON-API list/detail → born-digital text-PDF** for the actual notice body.

## 4. Volume + achieved-price stream
- **Open FLAT-auction volume: ≈ 0.** Last genuine *lokal mieszkalny* open auction ~2010; none in ~15 years; none on the 2021–2026 board. Land auctions run a few/year but are out of the flat target (and heavily "ograniczony" neighbour strips).
- **Achieved-price stream:** the board does carry "Informacja o wyniku przetargu na sprzedaż nieruchomości" notices (e.g. 2025, 2023, 2022) — but for **land/lease**, not flats. No flat hammer-price stream exists.
- The "Przetargi zakończone" board (1025) is a dead PWiK procurement archive, not a property-results feed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **milicz** (MADKOM eBIP React SPA + JSON API) — identical stack; the `/api/menu/{id}/articles` + `/api/articles/{id}` shape clones directly. Also compare any MADKOM eBIP gmina.
- **CMS family:** MADKOM eBIP (React SPA + JSON API; ADAPTER-GUIDE JS-SPA/JSON-API class). Technically the *cleanest* possible target — but there is nothing worth harvesting.
- **Effort:** **— (N/A).** Not the technical difficulty that kills it; it's **zero flat-auction supply**. Building this yields a land/lease/procurement feed with ~0 flats and no flat achieved-price stream — off-target for the dataset.
- **Blockers / why NO-BUILD:** generic city-BIP skewing to **land + neighbour-restricted strips**; residential disposal is bezprzetargowo-na-rzecz-najemcy (wykaz) or private-developer, not open flat auction; housing manager (ZGM) only leases lokale użytkowe. Matches the Wielkopolskie-seat NO-BUILD pattern — the "housing-manager-exists" exception does **not** apply because this ZGM sells no flats.

**VERDICT: NO-BUILD (effort —)** — clean MADKOM eBIP JSON API, but open municipal FLAT-auction volume is ≈ 0 (last ~2010); the gmina auctions land and the ZGM only leases commercial premises. No flat stream, no flat results board → nothing to harvest.
