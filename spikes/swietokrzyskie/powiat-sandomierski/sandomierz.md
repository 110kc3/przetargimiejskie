# Spike — Sandomierz (Świętokrzyskie · powiat sandomierski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Miejska Sandomierz (Urząd Miejski, Wydział Gospodarki Nieruchomościami) sells municipal property — **including lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Confirmed open oral flat auctions (Portowa 18/16 — 17,08 m², cena wywoławcza 76 500 zł, I przetarg 24.10.2024; Baczyńskiego 9/14; Por. T. Króla 8; Maciejowskiego 8/11 spółdzielcze). Announcements, wykazy and **wyniki** all publish on the city BIP `bip.um.sandomierz.pl` (mirrored on the public portal `sandomierz.eu` sharing the same article IDs). Server-rendered HTML: numeric-ID article URLs `/NNNN/132/slug.html`, a single "Sprzedaż i dzierżawa mienia komunalnego" board (category **132**) with `?Page=N` pagination (584 results total). Result notices carry **cena osiągnięta + nabywca inline in HTML** (confirmed: 92 000 zł, buyer named). Notices are inline HTML plus born-digital PDF attachments (ogłoszenie / warunki / wyciąg). No SPA, no auth, no CAPTCHA. Closest analog: WordPress/custom-HTML server-rendered gmina (Bochnia / Olkusz pattern). Main watch-item: the flat stream mixes genuine open auctions with **bezprzetargowo na rzecz najemcy** tenant sales — classify and keep only `przetarg`.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats at OPEN oral auction.** The Burmistrz Sandomierza / Wydział Gospodarki Nieruchomościami (tel. 15 8154145 / 15 8154121) runs `ustny przetarg nieograniczony` for sale of municipal property. Confirmed lokal-mieszkalny **open** auctions:
- ul. Portowa 18, lokal nr 16 — I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego; 17,08 m² (+5,30 m² piwnica), cena wywoławcza 76 500,00 zł, wadium 7 650 zł, min. postąpienie 1%, przetarg 24.10.2024 09:00. (`/13385/…`)
- ul. K.K. Baczyńskiego 9/14 — ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego.
- ul. Por. T. Króla 8 — I przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych w budynku wielorodzinnym.
- ul. Maciejowskiego 8 i 11 — przetarg na sprzedaż spółdzielczego prawa do dwóch lokali mieszkalnych. (`/276/…`)

Land (`nieruchomości gruntowe`, ul. Piaski / Błonie / Słowackiego) is also sold at open oral auction and is in-scope for the wider dataset. **Caveat:** many flat entries on the board are `sprzedaż na rzecz najemcy` (tenant, bezprzetargowo) or `lokale przeznaczone do sprzedaży` wykazy — those are pre-auction designations, not scheduled open auctions. Genuine open flat auctions recur but are a minority of the flat rows; classify on `przetarg` + a future date + `cena wywoławcza`.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP:** `bip.um.sandomierz.pl`
- Sales/lease board (category 132): `https://bip.um.sandomierz.pl/67/132/sprzedaz-i-dzierzawa-mienia-komunalnego.html` — 584 results, paginated `?Page=N` (≈65 pages).
- Majątek Gminy (assets index): `https://bip.um.sandomierz.pl/1349/320/majatek-gminy.html`
- Article URL pattern: `/{NNNN}/132/{slug}.html` (category segment) or `/{NNNN}/{slug}.html`.
- Example announcement (flat): `https://bip.um.sandomierz.pl/13385/ogloszenie-o-i-przetargu-ustnym-nieograniczonym.html`
- Example **result** (wynik, achieved price inline): `https://bip.um.sandomierz.pl/13746/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci.html`

**Public-portal mirror:** `sandomierz.eu` — same numeric article IDs and slugs (e.g. `https://sandomierz.eu/13385/…`, `https://sandomierz.eu/16711/…`). Either host is scrapeable; the BIP host is the authoritative source. Contact: Plac Poniatowskiego 3, 27-600 Sandomierz.

## 3. Format + rendering
- **Server-rendered HTML** — confirmed live via fetch of the board and both an announcement and a result page. Plain HTML, no JS gate, no auth, no CAPTCHA.
- Board is a flat article list with `?Page=N` pagination and a "Liczba wyników: 584" counter — bound the crawl (page cap + wall-clock budget).
- Notice bodies are **inline HTML text**; each also attaches **born-digital PDFs** (`Ogłoszenie przetarg …`, `Warunki do przetargu …`, `Wyciąg z ogłoszenia …`). Parse the inline HTML first; use `pdfText` on attachments only if a field is missing (OCR unlikely — these are born-digital).
- **Achieved-price stream:** result notices (`Informacja o wyniku przetargu`) carry `cena osiągnięta`/`cena nabycia` + `nabywca` **inline in HTML** — confirmed "cena nabycia lokalu … wynosi brutto 92.000,00 zł" with named buyer. No PDF needed for the result stream.

## 4. Volume + achieved-price stream
- **Volume:** Modest but real. Single mixed board of 584 lifetime rows (flats + land + dzierżawa + wykazy + wyniki). Open **flat** auctions run at ~a few/year (some as II/III przetarg on repeat); land auctions are more frequent. Sandomierz (~23k, historic town) has enough municipal flat stock to keep flat auctions recurring.
- **Achieved-price stream:** YES — `Informacja o wyniku przetargu` notices publish `cena osiągnięta`/`cena nabycia` + nabywca inline HTML (sold) or `zakończony wynikiem negatywnym` (unsold). Announcement side carries `cena wywoławcza`, `wadium`, round, date. Both parseable from server HTML.
- **Housing manager:** sales run through the **Urząd Miejski / Wydział Gospodarki Nieruchomościami** directly (no separate ZGM/ZBM publishing stream; PGKiM handles utilities, not sales).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress / custom server-rendered HTML gmina — **Bochnia / Olkusz** pattern (numeric-ID article board + `?Page=N` pagination + inline HTML notices with born-digital PDF attachments). Single board, so simpler than dual-board bip.info.pl cities.
- **CMS family:** Bespoke/WordPress-style server-rendered BIP (ADAPTER-GUIDE §3 "WordPress / custom HTML" row). No system name in footer; `/id/cat/slug.html` + `?Page=` shape, dual host (bip + .eu mirror) sharing IDs.
- **Effort:** **LOW–MEDIUM.** One board crawl (`/67/132/…?Page=N`, bounded) → detail fetch → parse inline HTML (address via parseAddress, `powierzchnia użytkowa`, `cena wywoławcza`, `wadium`, date, round). Route on title/body: `przetarg`→listing, `informacja o wyniku`→result (cena osiągnięta inline), `na rzecz najemcy`/`wykaz`→drop or treat as designation. `pdfText` fallback for occasional missing field. Pushed to Medium only by the mixed-stream classification (flat-auction vs tenant-sale vs land vs dzierżawa) on one board.
- **Blockers:** None technical. No rate-limit/auth signals. Only watch-items: bound the 65-page board; classify the mixed flat stream so bezprzetargowo tenant sales don't masquerade as open auctions.

**VERDICT: BUILD (Low–Medium effort)** — recurring OPEN municipal flat auctions on a clean server-rendered HTML city BIP (`bip.um.sandomierz.pl`) with an inline-HTML achieved-price result stream; standard WordPress/custom-HTML analog (Bochnia/Olkusz), single board, no technical blockers — only mixed-stream classification.
