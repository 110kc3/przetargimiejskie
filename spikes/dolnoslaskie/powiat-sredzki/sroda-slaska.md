# Spike — Środa Śląska (Dolnośląskie · powiat średzki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Środa Śląska (miejsko-wiejska, seat of powiat średzki — the **Dolnośląskie** one, not the Wielkopolska Środa Wlkp.) sells municipal property — including **lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Confirmed OPEN oral flat auction: **pl. Wolności 10, lokal mieszkalny nr 4, pow. 86,31 m²** in a heritage-register building, run as *drugi ustny przetarg nieograniczony* (i.e. flats recur and repeat as II/III rounds). Announcements live on the city BIP `bip.srodaslaska.pl` (mirror: `umsrodaslaska.e-bip.eu`), an **e-bip.eu hosted PHP CMS**: a dedicated "Ogłoszenia o nieruchomościach" board (`id=173`) where each notice is an HTML metadata page + a **born-digital PDF** attachment. Volume is low-to-modest and mixed with land (Juszczyn 51/5, Brodno działki). No dedicated ZGM/TBS housing-manager stream — flats are sold directly by the Urząd Miejski (Wydział Gospodarki Nieruchomościami). The wrinkle vs a clean bip.info.pl analog: the `id=173` board renders as a **search form** (no static list); enumeration goes via the static "ostatnio dodane" feed and direct `p2` notice IDs, and auction details live inside PDFs. Closest analog: IDcom-style HTML+text-PDF (`tczew`/`gniezno`). No hard blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Środy Śląskiej runs `ustny przetarg nieograniczony` for sale of gmina property. Confirmed sale auctions on the BIP / press mirrors:
- **pl. Wolności 10 — lokal mieszkalny nr 4, pow. 86,31 m²**, budynek wpisany do rejestru zabytków — *drugi ustny przetarg nieograniczony na sprzedaż* (a flat, OPEN oral, II round). ← in-scope flat.
- działka niezabudowana **nr 51/5 obręb Juszczyn** — *drugi ustny przetarg nieograniczony* (land; e-bip p2=10006807).
- **działki obręb Brodno** — ustny przetarg nieograniczony na sprzedaż (land; bip.srodaslaska.pl p2=10050153, created 2025-04-11).

Sales are **open oral auctions** (natural + legal persons, wadium), NOT purely *bezprzetargowo na rzecz najemcy* and not land-only — flats appear as an explicit recurring category. Notices carried by press aggregators (express-miejski.pl, roland-gazeta.pl) confirm the recurring cadence.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (e-bip.eu hosted CMS):**
- Ogłoszenia o nieruchomościach (property board): `https://bip.srodaslaska.pl/index.php?id=173`
- Individual notice pattern: `https://bip.srodaslaska.pl/index.php?id=173&p1=szczegoly&p2=NNNNNNNN` (e.g. `p2=10050153` Brodno land) — HTML metadata page + attached PDF.
- Recently-added static feed (usable for enumeration): `https://bip.srodaslaska.pl/index.php?id=ostatnio_dodane`
- Zamówienia publiczne (procurement, separate): `id=136` (>130k), `id=137` (<130k) — not our scope.
- **Mirror host (same CMS/content):** `https://umsrodaslaska.e-bip.eu/index.php?id=173&p1=szczegoly&p2=10006807`
- City portal: `www.srodaslaska.pl`. Office: Urząd Miejski, pl. Wolności 5, 55-300 Środa Śląska; tel. 71 39 60 715; Wydział Gospodarki Nieruchomościami.

**Results/achieved price:** `informacja o wyniku przetargu` notices are published as documents on the same `id=173` board (standard obligation; the board's search filter exposes a status/current-vs-archive toggle). Cena wywoławcza + hammer price parseable from the notice/wynik PDFs.

**Do NOT confuse** with **Środa Wielkopolska** (Wielkopolskie, `bip.sroda.wlkp.pl`) — different JST, out of scope here. Also distinct from the powiat body `bip.powiat-sredzki.pl` (starostwo).

## 3. Format + rendering
- **e-bip.eu hosted PHP CMS.** Notice pages (`p1=szczegoly&p2=NNN`) are server-rendered HTML carrying doc metadata (created date, validity window, department) + a **born-digital PDF** attachment (~250–270 KB observed) that holds the actual auction terms (area, cena wywoławcza, wadium, date). Handle attachment with `pdfText` (pdftotext) — OCR unlikely.
- **List wrinkle:** the `id=173` board itself renders as a **search form**, not a static `<ul>` of notices, when fetched without a query — so plain list-scrape fails. Enumerate via the static **"ostatnio dodane"** feed (dated HTML) and/or the board's GET query params, then follow `p2` IDs. No auth / CAPTCHA / rate-limit observed.
- No SPA app shell; individual notice HTML is fully server-rendered and directly addressable.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. A handful of property auctions/year across a **mixed** board (flats + land + occasional lokal użytkowy). Flats recur but are not high-frequency; expect ~a few flats/year, some as II/III przetarg when unsold (pl. Wolności 10 already a "drugi przetarg").
- **No dedicated housing manager** (no ZGM/TBS auction stream found) — the Urząd Miejski WGN sells flats directly, so all volume sits on the one `id=173` board.
- **Achieved-price stream:** YES (standard) — `informacja o wyniku przetargu` published on the same board; announcement carries `cena wywoławcza`, wynik carries the achieved price. Both inside born-digital PDFs, parseable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **CMS family:** e-bip.eu hosted BIP — server-rendered HTML metadata pages + born-digital text PDFs. In ADAPTER-GUIDE §3 terms this is closest to the **IDcom** row (HTML + text/scanned-PDF attachments) rather than the clean bip.info.pl list-board.
- **Closest analog:** clone the **`tczew` / `gniezno`** shape (HTML notice → `pdfText` attachment → parse fields), adapting the crawl entry to the e-bip list surface (ostatnio-dodane feed + `id=173` query + direct `p2` IDs).
- **Effort:** **MEDIUM.** Not Low because: (1) the property board is a search form, so listing needs the recent-feed / query approach rather than a static board scrape; (2) all auction detail is in PDF attachments (need pdfText + field regex: address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round); (3) mixed land/flat/lokal-użytkowy stream to classify. Second pass over `wynik` notices for cena osiągnięta.
- **Blockers:** None hard. Watch-items: reliable enumeration of the search-form board, and distinguishing announcement vs wynik PDFs. Confirm the results-notice URL shape on first build run.

**VERDICT: BUILD (Medium effort)** — recurring municipal flat auctions (open oral, incl. II rounds) on a clean e-bip.eu server-HTML BIP with born-digital PDF terms and a results stream; IDcom-style analog, no hard blockers, but the search-form list surface + PDF parsing lift it above the Low-effort bip.info.pl cases.
