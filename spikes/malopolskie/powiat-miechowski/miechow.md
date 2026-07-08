# Spike — Miechów (Małopolskie · powiat miechowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina i Miasto Miechów (gmina miejsko-wiejska, seat of powiat miechowski) does dispose of municipal property by `ustny przetarg nieograniczony`, but the stream is overwhelmingly **land parcels + lease (dzierżawa/najem/wynajem) + wykaz lists**, with **open flat-sale auctions essentially absent** from the live boards. There is **no dedicated municipal housing manager** (no ZGM/ZBM/MZBM/ZGL/TBS) — only a member-owned housing cooperative, *Spółdzielnia Mieszkaniowa "Przyszłość" / SM Miechów*, whose flat sales are NOT gmina stock and out of scope. The primary BIP is a **JS-SPA at `bip.malopolska.pl`** (empty without JS, chrzanow/render.js pattern); a clean server-HTML WordPress mirror exists at `www.miechow.eu`, but its property stream is land-dominated and its results board discloses **no hammer prices**. Fails the flat-auction-volume test — NO-BUILD.

## 1. Sells municipal property at auction?
**YES for property in general; NO for recurring open flat auctions.** The Burmistrz / Wydział Geodezji i Gospodarki Mieniem (Urząd Gminy i Miasta, pok. 113, tel. 41 388 25 90 w. 2597) runs `pierwszy/drugi ustny przetarg nieograniczony` for disposal. What the live boards actually carry (nieruchomości-gminne + wyniki, sampled 2026):
- **Land sales:** Widnica, Komorów, Jaksice, os. Sikorskiego (działki niezabudowane) — the dominant category.
- **Lease/rent auctions:** wynajem lokalu w budynku dworca autobusowego; multiple *wykaz nieruchomości do dzierżawy* in Miechowie.
- **Wykaz lists:** *wykaz nieruchomości przeznaczonych do zbycia oraz użyczenia*; *…do dzierżawy* (recurring).
- **Garages:** *drugi ustny przetarg nieograniczony na sprzedaż samodzielnych lokali garażowych nr 20 i 31, os. Sikorskiego* (cena wywoławcza ~19 000 zł each) — lokale garażowe, not mieszkalne.

Flat (`lokal mieszkalny`) sales by the gmina are **rare one-offs**, not a recurring auction line: historical traces only — e.g. os. Parkowy 5 lok. 58 (44,13 m², cena wywoławcza 116 000 zł) and an os. Parkowe flat ~37,81 m² (cena wywołania 68 093,25 zł). The current sale pipeline page ("Nieruchomości gminne przeznaczone do sprzedaży") lists **only undeveloped land** — zero flats. The flat hits that surface in search are third-party: **SM "Przyszłość"** (Kościuszki 1b, 56,11 m², coop flat) and **Nadleśnictwo Miechów / Lasy Państwowe** (os. Kolejowe 54B/3 pustostan) — neither is gmina disposal.

## 2. Where published? (hosts + boards, URLs)
**Primary — official BIP (JS-SPA, bip.malopolska.pl / Liferay):**
- BIP root: `https://bip.malopolska.pl/ugimmiechow`
- Wyniki przetargów: `https://bip.malopolska.pl/ugimmiechow,m,74508,wyniki-przetargow.html`
- Zamówienia publiczne – ogłoszenia: `https://bip.malopolska.pl/ugimmiechow,o,74461,zamowienia-publiczne-ogloszenia.html`
- Fetched live: body empty (only skip-nav `#main`/`#content`/`#searchFormMain` anchors) — content injected by JS. Classic bip.malopolska.pl SPA.

**Secondary — city WordPress site (server-HTML, best scrape surface):** `https://www.miechow.eu`
- Nieruchomości/ogłoszenia/przetargi hub: `https://www.miechow.eu/miasto-i-gmina/nieruchomosci-ogloszenia-przetargi`
- Nieruchomości gminne (announcements): `https://www.miechow.eu/miasto-i-gmina/nieruchomosci-gminne/`
- Przetargi hub → Aktualne przetargi `/miasto-i-gmina/przetargi/aktualne-przetargi/`, Wyniki przetargów `/miasto-i-gmina/przetargi/wyniki-przetargow/`
- Procurement also via `https://platformazakupowa.pl/miechow/aukcje`
- Post URL pattern: slugged WordPress paths, some with numeric suffix (`…_11139/`).
- Contact: Urząd Gminy i Miasta, ul. H. Sienkiewicza 25, 32-200 Miechów; property dept pok. 113.

**Do NOT confuse:** `sm.miechow.pl` (Spółdzielnia Mieszkaniowa — coop, out of scope), `miechow.krakow.lasy.gov.pl` (Nadleśnictwo), `www.miechow.pl` / `zdpmiechow.pl` (Starostwo Powiatowe / ZDP — county, not gmina).

## 3. Format + rendering
- **Official BIP:** **JS-SPA** (`bip.malopolska.pl`, Liferay). Empty DOM without JS → needs a headless render (render.js), same as the **chrzanow** analog. High-friction.
- **WordPress mirror (`miechow.eu`):** **server-rendered HTML**, clean dated post lists, no JS gate, no auth/CAPTCHA observed. Notices are inline HTML; attachments (wykazy, ogłoszenia) are typically **born-digital PDFs** (handle with `pdfText`).
- No JSON API exposed.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ~zero.** Across the sampled 2026 nieruchomości-gminne and wyniki boards, **not a single `sprzedaż lokalu mieszkalnego` auction** appears — the mix is land + lease + wykaz + procurement + garages. Historical flat sales are isolated one-offs (os. Parkowy), not a recurring pipeline.
- **Achieved-price stream: NO.** The `wyniki-przetargów` board publishes result notices (Jaksice, Komorów, Sikorskiego działki; plus ZP.271 construction), but the sampled entries **disclose no hammer/winning prices** (no cena osiągnięta / nabywca on the WP result pages), and none concern flats.
- **No housing manager** feeding a steady lokal-mieszkalny disposal cadence. Confirms the "generic city-BIP skewing to land + tenant sales, ~0 open flat auctions" NO-BUILD profile.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever revisited):** the scrapeable surface is the **WordPress/custom-HTML** family (brzeg / nowa-sol / bochnia / olkusz pattern) via `miechow.eu`; the official BIP is the **chrzanow** `bip.malopolska.pl` SPA (render.js). Neither is worth wiring for this city.
- **Effort:** **— (n/a).** Not the effort that sinks it — the **data does**. Even a low-effort WP scraper would yield land/lease/wykaz noise and near-zero municipal flat auctions, with no achieved-price stream to harvest.
- **Blockers / NO-BUILD reasons:**
  1. **~0 recurring open flat auctions** — municipal residential disposal is a rare one-off, not a line item.
  2. **No housing manager** (ZGM/ZBM/MZBM/ZGL/TBS absent); only a coop (SM "Przyszłość") whose flats are out of scope.
  3. **No achieved-price (hammer) results** disclosed on the results board.
  4. Primary authoritative BIP is a **JS-SPA** (render cost) while the easy WP mirror carries land/lease.
- Revisit trigger: only if Miechów stands up a dedicated municipal housing manager and starts a recurring `ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych` line with published wyniki.

**VERDICT: NO-BUILD** — generic gmina property board dominated by land, lease and wykaz lists; no municipal housing manager, no recurring open flat auctions, and no achieved-price stream. Primary BIP is a `bip.malopolska.pl` SPA; the clean WordPress mirror doesn't carry the flat-auction volume that would justify an adapter.
