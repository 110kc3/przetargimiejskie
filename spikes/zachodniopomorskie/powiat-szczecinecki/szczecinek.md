# Spike — Szczecinek (Zachodniopomorskie · powiat szczecinecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miasto Szczecinek (Urząd Miasta, Burmistrz Miasta Szczecinek) sells municipal property — including **wolne lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Everything is published on the city BIP `bip.szczecinek.pl`, which runs the **Logonet Sp. z o.o. (Bydgoszcz)** hosted BIP CMS (v2.9.0) — the same CMS family as the built analogs **tarnowskie-gory / kedzierzyn-kozle / skarzysko-kamienna**: clean server-rendered HTML, `/artykuly/<catID>/<slug>` list pages and `/artykul/<catID>/<docID>/<slug>` article pages. Announcements live under **Nieruchomości → Nieruchomości przeznaczone do zbycia** (per-year sub-lists 2024/2025/2026), and there is a dedicated **"Informacja o wynikach przetargów na sprzedaż nieruchomości"** results board carrying achieved prices. Board is land-dominated but flat auctions genuinely recur (Narutowicza 3E/9, Koszalińska 58/2, plus IV/II-round repeat flat auctions and a spółdzielcze własnościowe prawo). Notices are inline HTML + an attached born-digital PDF. No technical blockers. Closest analog: tarnowskie-gory (Logonet).

## 1. Sells municipal property at auction?
**YES — confirmed, incl. OPEN oral flat auctions.** Burmistrz Miasta Szczecinek runs `przetarg ustny nieograniczony` on the sale of municipal property, handled by the Wydział Gospodarki Nieruchomościami (Urząd Miasta, Plac Wolności 13; property info room 201, tel. 94 371-41-42/40). Confirmed **lokal-mieszkalny** open-auction notices (not bezprzetargowo-na-rzecz-najemcy, not land-only):
- **ul. Narutowicza 3E/9** — przetarg ustny nieograniczony na zbycie lokalu mieszkalnego; pow. 29,49 m² (+ piwnica 5,08 m²), cena wywoławcza 160 000 zł, wadium 16 000 zł, przetarg 20.11.2025 (inline HTML + PDF "Ogłoszenie o przetargu").
- **ul. Koszalińska 58/2** — ogłoszenie o przetargu na zbycie lokalu mieszkalnego na I piętrze, udział 490/1000 w działce 168/2.
- **IV przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego** and **II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego** (repeat rounds → recurring, not one-off) — indexed via press aggregator temat.net from the BIP.
- **Przetarg ustny nieograniczony na sprzedaż spółdzielczego własnościowego prawa do wolnego lokalu mieszkalnego** (cooperative-ownership flat).

The per-year board is **land-dominated** — a 2025 sample of ~10 items was mostly "przetargi na sprzedaż nieruchomości" (niezabudowane działki: Gałczyńskiego/Marcelin, Słowiańska, Kaszubska, Bukowa, Modrzewiowa, Fabryczna, Lipowa, Winnicza, Pilska, Kołobrzeska) plus wykazy — but ≥2–3 distinct flat auctions per year are present alongside land + a Bartoszewskiego 12 building. So genuine open flat volume exists; it is just a minority of a mixed stream. Both natural and legal persons may bid; 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet CMS):** `bip.szczecinek.pl`
- Nieruchomości (root): `https://bip.szczecinek.pl/artykuly/335/nieruchomosci`
- **Nieruchomości przeznaczone do zbycia** (announcements + wykazy, przetargi): `https://bip.szczecinek.pl/artykuly/336/nieruchomosci-przeznaczone-do-zbycia`
  - 2026: `https://bip.szczecinek.pl/artykuly/645/2026`
  - 2025: `https://bip.szczecinek.pl/artykuly/595/2025`
  - 2024: `https://bip.szczecinek.pl/artykuly/547/2024`
- **Informacja o wynikach przetargów na sprzedaż nieruchomości** (results / achieved prices): `https://bip.szczecinek.pl/artykuly/338/informacja-o-wynikach-przetargow-na-sprzedaz-nieruchomosci`
- Archiwum: `https://bip.szczecinek.pl/artykuly/340/archiwum`
- Also: Nieruchomości przeznaczone do wydzierżawienia (`.../348/...`), Mienie komunalne – Ogłoszenia (`.../352/...`).
- Article URL pattern: `/artykul/<catID>/<docID>/<slug>` — e.g. flat: `https://bip.szczecinek.pl/artykul/595/6904/ogloszenie-o-przetargu-na-zbycie-lokalu-przy-ulicy-narutowicza-3e-9`; `https://bip.szczecinek.pl/artykul/595/6819/ogloszenie-o-przetargu-na-zbycie-nieruchomosci-przy-ul-koszalinskiej-58-2`.
- Section homepage: `https://bip.szczecinek.pl/?c=207`.

**Disambiguation (critical):** TARGET is the **TOWN** Gmina Miasto Szczecinek → `bip.szczecinek.pl` (Urząd Miasta, Burmistrz Miasta Szczecinek). Do NOT confuse with the **rural Gmina Szczecinek** → `bip.gminaszczecinek.pl` (Urząd Gminy, separate JST, own przetargi-na-zbycie-nieruchomosci board), nor with the powiat `powiatszczecinecki.bip.net.pl`. Both out of scope.

**Housing manager:** ZGM (municipal housing) exists but **sales of municipal flats are run directly by the Urząd Miasta / Wydział Gospodarki Nieruchomościami**, published on `bip.szczecinek.pl` — no separate ZGM/TBS auction stream to crawl. Single source.

## 3. Format + rendering
- **Server-rendered HTML** — Logonet hosted BIP CMS (footer: "CMS i hosting: Logonet Sp. z o.o. w Bydgoszczy", System 2.9.0). List pages and article pages are plain server HTML; no SPA, no auth, no CAPTCHA observed (fetched cleanly).
- Notices are **inline HTML text** with an **attached born-digital PDF** ("Ogłoszenie o przetargu", ~1.37 MB) carrying the full terms. The inline HTML typically already contains address / pow. / cena wywoławcza / wadium / date; PDF is a text-layer fallback (use `pdfText`, OCR unlikely).
- Identical structural family to tarnowskie-gory / kedzierzyn-kozle / skarzysko-kamienna adapters.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest, mixed. ~10+ property notices/year on the zbycie board, majority land (działki niezabudowane) + wykazy; **~2–3 open flat auctions/year**, some running as II/III/IV rounds (repeats when unsold). Meaningful but not high-frequency flat volume.
- **Achieved-price stream:** YES — dedicated **"Informacja o wynikach przetargów na sprzedaż nieruchomości"** board (`/artykuly/338/...`) publishes wynik notices (cena osiągnięta / nabywca, or wynik negatywny). Announcement pages carry `cena wywoławcza` + `wadium`; results board carries the hammer price. Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **tarnowskie-gory** (also **kedzierzyn-kozle / skarzysko-kamienna**) — same **Logonet** hosted BIP CMS with `/artykuly/<catID>/<slug>` lists + `/artykul/<catID>/<docID>/<slug>` articles + per-year sub-categories + a separate results board. Clone that adapter shape and re-point category IDs (zbycie 336 / years 645,595,547 / results 338).
- **CMS family:** Logonet BIP (server-rendered HTML; ADAPTER-GUIDE §3 "hosted-BIP HTML" family).
- **Effort:** **LOW.** Crawl per-year zbycie lists → fetch each `ogłoszenie o przetargu` article → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round I/II/III/IV, "ustny przetarg nieograniczony"); classify + drop land/dzierżawa/wykaz where flats are the target (land also in-scope for the wider dataset); second pass over results board (338) for cena osiągnięta. PDF attachment as `pdfText` fallback.
- **Blockers:** None. No rate-limit/auth/CAPTCHA signals. Watch-items: (a) land-dominated mixed stream — classify carefully; (b) separate announcement vs results boards; (c) strict host disambiguation town vs rural gmina.

**VERDICT: BUILD (Low effort)** — recurring open oral municipal flat auctions on a clean Logonet server-HTML BIP with a dedicated achieved-price results board; direct tarnowskie-gory analog, no technical blockers.
