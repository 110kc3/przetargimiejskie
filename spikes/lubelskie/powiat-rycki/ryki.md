# Spike — Ryki (Lubelskie · powiat rycki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Ryki (gmina miejsko-wiejska, town = seat, ~9.5k) publishes on the **Wrota Lubelszczyzny** regional BIP `umryki.bip.lubelskie.pl` (`bip.lubelskie.pl` CMS — a JS/AJAX-driven document registry where every menu page loads its table via search filters, not static HTML). The load-bearing finding kills the build: the gmina's own **2024 Raport o stanie gminy** states plainly that in 2024 it sold **działki (land plots) at public tender** (0.7546 ha) while **lokale mieszkalne (flats) were sold bezprzetargowo — na rzecz najemców** (to sitting tenants, bundled with fractional land shares, 0.0805 ha). So the OPEN oral-auction stream is **land-only**; there is **no recurring *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego***. This is the textbook Lubelskie-seat NO-BUILD profile: Wrota Lubelszczyzny CMS + flats-to-tenants-only.

## 1. Sells municipal property at auction?
**Land — YES (open tender). Flats — NO (bezprzetargowo, na rzecz najemców).**
Confirmed from the gmina's official **Raport o stanie Gminy Ryki 2024** (`upload/pliki/raport20241maj.pdf`, real-estate/mienie section, extracted via pdftotext):
- *"W 2024 roku Gmina Ryki sprzedała **w przetargach publicznych działki** o łącznej pow. 0,7546ha położone na terenie miasta i gminy oraz **w drodze bezprzetargowej udziały w działkach** … o łącznej pow. 0,0805ha **zbywane łącznie ze sprzedażą lokali mieszkalnych na rzecz najemców**."*
- The only flat *acquisition* noted is the gmina **buying** 1 lokal at ul. Żytnia 18 — not selling at auction.
So open oral auctions cover **land plots** only; flat disposals are tenant purchases without tender (bezprzetargowo). No open-auction flat-sale stream to scrape. Housing stock is managed by the municipal company **ZGMiA / ZTiO (Zakład Gospodarki Mieszkaniowej / Zakład Techniczno-Oczyszczania)**, but it manages/leases stock and produces heat — it does not run open flat-sale auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP on Wrota Lubelszczyzny (`bip.lubelskie.pl` CMS):** `https://umryki.bip.lubelskie.pl`
- Gospodarka nieruchomościami (real-estate root / registry): `https://umryki.bip.lubelskie.pl/index.php?id=343`
- Sprzedaż (sales): `https://umryki.bip.lubelskie.pl/index.php?id=230`
- Sub-folders e.g. "Sprzedaż nieruchomości lokalowych w Moszczance": `.../index.php?id=239` (mostly land + tenant-flat wykazy)
- Archiwum przetargów: `https://umryki.bip.lubelskie.pl/index.php?id=322`
- Document uploads: `https://umryki.bip.lubelskie.pl/upload/pliki/<name>.pdf` (e.g. `raport20241maj.pdf`)
- Contact: Wydział Gospodarki Komunalnej, Nieruchomości i Zagospodarowania Przestrzennego; ul. Karola Wojtyły 29, 08-500 Ryki; tel. 81 865 71 10; bip@ryki.pl
- **Sibling (out of scope):** `spryki.bip.lubelskie.pl` (Starostwo Powiatowe — powiat, not gmina).

There is no dedicated, static "ogłoszenia o przetargu (lokale)" board; property notices sit inside the gospodarka-nieruchomościami registry tables. A separate wyniki/rozstrzygnięcia board for achieved flat prices was not found (moot — no open flat auctions).

## 3. Format + rendering
- **CMS family:** **Wrota Lubelszczyzny / `bip.lubelskie.pl`** shared regional BIP — a **JS/AJAX document registry**. Menu pages (`index.php?id=NN`) render a filter form; the actual document rows are populated dynamically, so plain WebFetch of a board returns an **empty table** (confirmed repeatedly on id=230/239/322/343). Scraping would need a headless renderer (`core/render.js`) or reverse-engineering the registry query endpoint.
- **Attachments:** born-digital + **scanned PDFs** in `upload/pliki/` (the 5.8 MB raport is image-heavy — OCR-grade). Notices/wykazy are PDF or inline.
- No JSON API surfaced for notices; no clean cena-osiągnięta stream.

## 4. Volume + achieved-price stream
- **Open flat auctions/year: ~0.** Per the 2024 raport, flats leave the stock only **bezprzetargowo na rzecz najemców**. Open tenders in 2024 were land only (0.7546 ha). No repeating *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego* found in searches or on-BIP.
- **Achieved-price stream:** none for flats (no open flat auctions to resolve). Any wyniki relate to land plots.
- Small gmina miejsko-wiejska (~9.5k town); low disposal cadence, dominated by land + tenant sales.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** other Lubelskie seats on Wrota Lubelszczyzny that came back NO-BUILD (same `bip.lubelskie.pl` registry + flats-to-tenants pattern).
- **Blockers (compounding):**
  1. **No in-scope stream** — flats sold bezprzetargowo na rzecz najemców; open oral auctions are land-only. This alone is decisive.
  2. **Hostile CMS** — Wrota Lubelszczyzny AJAX registry: boards don't render document rows without JS, so even a land-only scraper would need Playwright/render.js + endpoint spelunking for near-zero flat yield.
  3. Scanned PDFs (OCR) for the few property docs.
- **Effort if ever forced:** High for ~0 flat signal — not worth it.

**VERDICT: NO-BUILD** — Gmina Ryki sells lokale mieszkalne only *bezprzetargowo na rzecz najemców* (confirmed in its 2024 Raport o stanie gminy); open oral auctions cover land plots only. Combined with the JS-driven Wrota Lubelszczyzny (`bip.lubelskie.pl`) registry CMS, there is no scrapeable open flat-auction stream to justify an adapter.
