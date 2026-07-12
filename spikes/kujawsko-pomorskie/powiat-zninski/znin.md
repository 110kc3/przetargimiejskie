# Spike — Żnin (Kujawsko-Pomorskie · powiat żniński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort). **Built + registered 2026-07-12** (16/16 parse test; **TERYT 041906_3 confirmed**). Analog nowa-sol. ⚠️ Corrections: notice PDFs are **SCANNED** (OCR, not born-digital as spiked), **browser-UA mandatory** (bot UA → 403 on board/notices/PDFs), and there is **no results board** ("Inne wyniki" holds one unrelated 2011 item) → achieved-price is unsold-only via superseded rounds (wolow model); auction_date is OCR-only/best-effort. Clean inline field block per `/nieruchomosc/<slug>`. Land-dominated (1 flat of 34).

## TL;DR
Gmina Żnin (miejsko-wiejska; Urząd Miejski w Żninie, Burmistrz Żnina) sells municipal property via **przetarg ustny nieograniczony na sprzedaż** and publishes it on a single dedicated board — **"Obrót nieruchomościami"** — on the city BIP `bip.gminaznin.pl`. The CMS is a **bespoke server-rendered HTML BIP** (Bootstrap + DataTables front-end, integrated "System Rada"/eSesja for the council; asset path `/front/assets/`, attachments under `/pliki/umznin/zalaczniki/<id>/<file>.pdf`). Each auction is its own article at `/nieruchomosc/<slug>` with the full notice inline as HTML (cena wywoławcza + wadium + terms) **plus a born-digital PDF** of the ogłoszenie. No SPA gate — `curl` with a browser UA returns the full server HTML (WebFetch 403s the bot UA; use browser-UA/curl). The stream is **land-dominated**: of 34 current property notices, ~27 are land (działki, nieruchomości niezabudowane/zabudowane/rolne), 6 are lokal użytkowy/niemieszkalny (mostly repeat rounds of one Kościuszki unit), and **1 is a lokal mieszkalny** (Jadowniki Rycerskie 27/4). Flats therefore recur but are rare. Closest analog: a custom-HTML gmina BIP (nowa-sol / brzeg / bochnia pattern — HTML article board + PDF attachments). No technical blockers; low effort.

## 1. Sells municipal property at auction?
**YES — open oral auctions, confirmed; flats present but rare.** The Burmistrz Żnina runs `pierwszy/drugi/trzeci/czwarty przetarg ustny nieograniczony na sprzedaż` (open, unlimited oral auction — the in-scope format), with repeat rounds (I→IV) when a lot doesn't sell, plus occasional `przetarg ustny ograniczony do właścicieli nieruchomości sąsiednich` (restricted to neighbours) and one `przetarg pisemny nieograniczony`. Wadium 10%, cena wywoławcza stated. Confirmed lots on the live board:
- **ul. (Jadowniki Rycerskie) budynek 27, lokal mieszkalny nr 4** — *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* (inline notice + PDF `.../zalaczniki/10690/ogloszenie-jadowniki-ryc-4-27-1.pdf`). ← the one true flat.
- **ul. Kościuszki, lokal użytkowy 51,90 m²** — I→IV przetarg ustny nieograniczony (commercial unit, repeat rounds).
- **lokal niemieszkalny nr 13, ~20,5 m²** — I/II przetarg (commercial).
- Numerous land lots: działki nr 295/2, 295/10 w Brzyskorzystwi; nieruchomości niezabudowane/zabudowane w Żninie (ul. Kl. Janickiego 1741/3, ul. 700-lecia), Jaroszewo, rolna zabudowana, etc.

This is the classic **generic city-BIP property section that skews to land** (+ a few commercial units), not a dedicated housing-manager flat pipeline. No evidence of a ZGM/TBS running its own flat-auction stream; tenant flat sales (bezprzetargowo na rzecz najemcy) would flow through wykazy, not these auctions. Flats appear ~occasionally (order of one at a time).

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bespoke server-rendered CMS):**
- Property board "Obrót nieruchomościami": `https://bip.gminaznin.pl/nieruchomosci` (also linked as `/artykul/nieruchomosci`) — DataTables-paginated list; rows are real server-side `<a href="/nieruchomosc/<slug>">` links (34 live).
- Individual auction notice: `https://bip.gminaznin.pl/nieruchomosc/<slug>` — e.g. `.../nieruchomosc/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-4-polozonego-w-jadown-1`.
- PDF attachments: `https://bip.gminaznin.pl/pliki/umznin/zalaczniki/<id>/<file>.pdf`.
- Results: **"Inne wyniki"** board `https://bip.gminaznin.pl/artykul/inne-wyniki` (menu: PRZETARGI → Platforma zakupowa / Nieruchomości / Zamówienia publiczne / Zaproszenie do składania ofert / **Inne wyniki**). `informacja o wyniku przetargu` for property is expected here and/or as follow-up notices on the property board — needs a first-crawl confirmation of exact placement (minor watch-item).
- General przetargi article: `https://bip.gminaznin.pl/artykul/przetargi`.

**Do NOT confuse** with the **county** BIP `https://bip.powiatzninski.pl/` (Powiat Żniński, e.g. `/dokumenty/2875` — a Podobowice lokal auction). That is a separate JST (Starostwo), out of scope for the gmina target.

## 3. Format + rendering
- **Server-rendered HTML** — bespoke Polish BIP CMS (Bootstrap + DataTables + select2; "System Rada"/eSesja council integration; reCAPTCHA only on contact forms). `curl -A <browser UA>` returns full HTML including all notice links; **no JS/SPA gate**, so `getText` with a browser UA is enough — no `core/render.js` needed.
- **WebFetch is blocked (HTTP 403)** on both list and notice pages for the default UA — the adapter must pass a **browser User-Agent** (as with bytom.pl/wejherowo). curl with a Chrome UA → 200.
- Each `/nieruchomosc/<slug>` carries the full ogłoszenie **inline as HTML** (H1 title + body with cena wywoławcza, wadium, powierzchnia, terms, date) **and** a **born-digital PDF** of the same notice (`pdfText` if the HTML body is thin — PDFs are text, no OCR).
- Board is a **DataTable**: client-side pagination/search, but rows live in the server HTML — parse the `<a href="/nieruchomosc/...">` set directly, no pagination crawl.

## 4. Volume + achieved-price stream
- **Volume:** Low. 34 property notices on the current board spanning 2025–2026; dominated by land (działki/nieruchomości), ~6 commercial-unit rounds, and **only 1 lokal mieszkalny** at spike time. Flat auctions are sporadic (roughly a handful per year at most, often as repeat I→IV rounds). If flats are the strict target, yield is thin; if land + commercial are in scope for the wider dataset, the board is a steady low-volume stream.
- **Achieved-price stream:** Announcement notices carry **cena wywoławcza + wadium** (parseable from inline HTML / PDF). Hammer prices via **`informacja o wyniku przetargu`** — expected on the "Inne wyniki" board (`/artykul/inne-wyniki`) and/or as result notices on the property board; presence is highly likely (statutory 7-day posting) but exact location to be pinned on first crawl. No result text was surfaced inline on the property board itself.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** custom-HTML gmina BIP — **nowa-sol / brzeg / bochnia** pattern (§3 "WordPress / custom HTML" family): one HTML article board → per-notice HTML article → born-digital PDF attachment. Structurally a distinct Kujawsko-Pomorskie bespoke "System Rada"/eSesja BIP, so clone the shape, not a byte-identical CMS adapter.
- **CMS family:** Bespoke server-rendered HTML (Bootstrap/DataTables). `source:'html'`, browser-UA required, no `needsRender`.
- **Effort:** **LOW.** `crawlActive`: GET `/nieruchomosci` with browser UA → collect `/nieruchomosc/<slug>` hrefs → fetch each article → parse title (round via pierwszy/drugi/trzeci/czwarty, `parseAddress`, powierzchnia użytkowa, cena wywoławcza, wadium, przetarg date) from inline HTML, fall back to the attached PDF via `pdfText`. `crawlResultDocs`/`parseResultDoc`: pull `informacja o wyniku` from `/artykul/inne-wyniki` (confirm placement on first run). Classify lokal mieszkalny vs lokal użytkowy vs land; drop non-flat if flats are the strict target (land in-scope for the wider dataset).
- **Blockers:** None hard. Watch-items: (1) must send a **browser UA** (bot UA → 403); (2) confirm exact **results board** placement on first crawl; (3) **low flat volume / land-dominated** — value comes mainly from land + occasional flat/commercial, not a rich flat stream.

**VERDICT: BUILD (Low effort)** — open oral municipal auctions on a clean, server-rendered dedicated "Obrót nieruchomościami" board with inline HTML + born-digital PDFs and a results board; standard custom-HTML analog, only a browser-UA header needed. Caveat: flat volume is low (land/commercial-dominated), so weigh against strictly flat-focused targets.
