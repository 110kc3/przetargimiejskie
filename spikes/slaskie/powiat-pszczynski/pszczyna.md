# Spike — Pszczyna (Śląskie · powiat pszczyński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Pszczyna (Burmistrz Pszczyny, Wydział/Referat Gospodarki Nieruchomościami, sprawy `G.6840.*`) sells municipal **lokale mieszkalne** via `przetarg ustny nieograniczony` and publishes both the announcements and the results — with **structured achieved-price tables** — on the city BIP `bip.pszczyna.pl`. The BIP runs the **ESC S.A. / VelaBIP** hosted CMS (`prawomiejscowe.pl` platform; `VelaBIP` cookie): clean server-rendered HTML, slug-based article URLs, notice body inline in `<div id="cnt" class="document">`, with a born-digital PDF mirror attached. Flat auctions recur and persist (one flat, Bednarska 21 / Rynek 3 nr 21/1, reached the **VIII** round; Korfantego 27/1 sold Feb 2024 for **273.000 zł** vs 258.000 zł wywoławcza; Szymanowskiego 22/5, Rynek 22 nr 3 also confirmed). Housing manager **AZK Pszczyna** exists but only handles administration/zamówienia (cleaning, heat-source swaps) — the sale auctions sit on the city BIP, which is the source. Closest analog: WordPress/custom-HTML server-HTML gmina (brzeg / bochnia pattern) with a legacy `bip.info.pl` fallback. One watch-item: the shared multi-tenant list endpoint can return cross-tenant cache. No hard blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats, with a live achieved-price stream.** Burmistrz Pszczyny runs `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`. Confirmed cases (all Pszczyna, from live BIP fetches + search index):
- **ul. Korfantego 19-35, lokal nr 27/1** — `G.6840.26.2023`, przetarg 28.02.2024, **SOLD**: cena wywoławcza **258.000 zł → osiągnięta 273.000 zł**, nabywca *BUDUJE.MY sp. z o.o.* (3 osoby dopuszczone). Result table rendered inline in HTML.
- **ul. Szymanowskiego 20-22-24, lokal nr 22/5** — `G.6840.18.2024`, pow. użytkowa 53,30 m², I przetarg 12.02.2025, wynik negatywny (nikt nie przystąpił). KW KA1P/00036758/6.
- **Bednarska 21 / Rynek 3, lokal nr 21/1** — pow. 27,63 m² (pokój+kuchnia+łazienka); repeatedly re-auctioned — announcements for **III … VIII przetarg ustny nieograniczony** on this single flat (persistent open re-auctioning of unsold stock).
- **Rynek 22, lokal nr 3** — `ogłoszenie o przetargu` (budynek mieszkalny, strefa konserwatorska A, MPZP MW I).

Also published: `wykazy nieruchomości przeznaczonych do sprzedaży, stanowiących samodzielne lokale mieszkalne` and a standing procedure page "Sprzedaż lokali mieszkalnych oraz lokali o przeznaczeniu innym niż mieszkalne na rzecz ich najemców lub w drodze przetargów". Sales are OPEN auctions (natural + legal persons; the actual buyer above was a company), not solely bezprzetargowo-na-rzecz-najemcy.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (ESC S.A. / VelaBIP CMS):** `https://bip.pszczyna.pl`
- Przetargi category board: `https://bip.pszczyna.pl/lista/przetargi`
- Standing sale-procedure page: `https://bip.pszczyna.pl/sprzedaz-lokali-mieszkalnych-oraz-lokali-o-przeznaczeniu-innym-niz-mieszkalne-na-rzecz-ich-najemcow-lub-w-drodze-przetargow-1`
- Wykaz board (flats to sell): `https://bip.pszczyna.pl/ogloszenia-wykazow-nieruchomosci-przeznaczonych-do-sprzedazy-stanowiacych-samodzielne-lokale-mieszkalne-9`
- Announcement (example): `https://bip.pszczyna.pl/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-3-w-budynku-polozonym-w-pszczynie-przy-rynku-22`
- Result / achieved price (example): `https://bip.pszczyna.pl/informacja-o-wyniku-przetargu-na-sprzedaz-lokalu-mieszkalnego-nr-27-1-w-budynku-polozonym-w-pszczynie-przy-ul-wojciecha-korfantego-19-35`
- Article URLs are slugs (`/<slug>` and `/index.php/<slug>`), body in `<div id="cnt" class="document">`, PDF mirror under "Pliki do pobrania", plus `Identyfikator dokumentu: NNNNN` (numeric doc id, e.g. 45808, 48052).

**Legacy host (older docs, still indexed):** `https://pszczyna.bip.info.pl` — classic **bip.info.pl** CMS (`dokument.php?iddok=NNNN&idmp=714&r=r`). Useful as a backfill enumeration fallback (zgorzelec/złotoryja pattern).

**Out of scope:** `azk.pszczyna.pl` / `azk-pszczyna.logintrade.net` (AZK = Administracja Zasobów Komunalnych — housing admin & procurement only, no flat sales); `bip.powiat.pszczyna.pl` / `powiat.pszczyna.pl` (Starosta's county property auctions — different JST). Contact: UM Pszczyna, Wydział Geodezji i Gospodarki Nieruchomościami.

## 3. Format + rendering
- **Server-rendered HTML** — ESC S.A. VelaBIP hosted BIP (platform `prawomiejscowe.pl`; response sets `VelaBIP` cookie, `Server: Apache`, `Content-Type: text/html; charset=UTF-8`). No JS gate, no SPA, no CAPTCHA. The "Zaloguj się" form is an optional editor login, not a wall.
- Notice content is **inline HTML** in `<div id="cnt" class="document">` — directly parseable (confirmed on both an ogłoszenie and a wynik page). Result notices carry a structured table: Liczba osób dopuszczonych/niedopuszczonych · Cena wywoławcza · Cena osiągnięta · Nabywca.
- Each notice also attaches a **born-digital text PDF** mirror (~50-100 kB) under "Pliki do pobrania" — HTML is sufficient; PDF is a fallback (no OCR needed).
- Watch-item: the shared multi-tenant list endpoint returned **cross-tenant cached content** (a Puck BIP page) on one re-fetch — pin scraping to canonical Pszczyna article URLs / doc-ids rather than trusting the aggregate list cache.

## 4. Volume + achieved-price stream
- **Volume:** Modest but steady. Handful of flat auctions cycling per year; heavy re-auctioning (same unit runs I→…→VIII when unsold) inflates announcement count and keeps the flat-auction pipeline continuously active. Mixed with lokale użytkowe, land, and dzierżawa/najem — classify and keep flat sales.
- **Achieved-price stream:** **YES — strong.** `Informacja o wyniku przetargu` notices publish the hammer price inline (Korfantego 27/1: 273.000 zł, nabywca named) or the negative result. Announcement side carries `cena wywoławcza` + `wadium`. Both server-HTML, both parseable — a clean wywoławcza→osiągnięta pairing keyed by sprawa `G.6840.*` / address.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** server-HTML **WordPress/custom-HTML gmina** family (brzeg / bochnia / nowa-sol shape) — slug article URLs + inline content div + separate wynik notices; with a **bip.info.pl legacy fallback** (zgorzelec/złotoryja) for backfill via `dokument.php?iddok=`.
- **CMS family:** ESC S.A. / VelaBIP (`prawomiejscowe.pl`) — new to the roster but plain server-HTML; treat as custom-HTML.
- **Effort: LOW.** Crawl Przetargi + wykaz boards → fetch article → parse `<div id="cnt">` (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round `I..VIII`); second pass over `informacja-o-wyniku-*` for cena osiągnięta + nabywca (structured table). Filter out land / lokal użytkowy / dzierżawa/najem.
- **Blockers:** None hard. Only watch-items: (1) shared-platform list cache can leak another tenant's page — pin to canonical Pszczyna URLs/doc-ids; (2) split announcement vs result boards; (3) mixed sale/lease stream needs classifier.

**VERDICT: BUILD (Low effort)** — recurring OPEN municipal flat auctions on a clean ESC S.A./VelaBIP server-HTML BIP with an inline structured achieved-price results stream; standard custom-HTML analog + bip.info.pl legacy fallback, no hard blockers.
