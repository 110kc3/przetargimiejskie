# Spike — Łowicz (Łódzkie · powiat łowicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (bespoke fast4net city-BIP; residential disposal is dominated by tenant buyout + land; open flat auctions ~0/yr recurring).

## TL;DR
Gmina Miejska Łowicz (Urząd Miasta, Burmistrz) sells municipal property via `przetarg ustny nieograniczony`, but the stream is **land-dominated**. Residential (`lokale mieszkalne`) is disposed of almost entirely **bezprzetargowo na rzecz najemcy** (I–IV partia wykazy) and by `wykup lokali komunalnych` — i.e. no auction. **Open flat auctions do exist but are rare**: a search of the city BIP surfaced only a sparse handful over 2010→2026 (os. Dąbrowskiego 14/37 in 2010–11, spółdzielcze prawo Szklanych Domów 9A/Warszawa in 2021, ul. Aptekarska 4/1 in 2024–25). Everything lives on the bespoke **fast4net** city portal `lowicz.eu/bip` (server-HTML) as **born-digital text-PDF** attachments in `/files/docs/`; a single aggregated "Sprzedaż nieruchomości miejskich" section, no per-article pages, no dedicated flat results board. The separate `zgm.bip.lowicz.eu` (Zakład Gospodarki Mieszkaniowej) runs only procurement + lease of lokale użytkowe/garaże + tenant buyout — **not** open flat sales. Given ~0 recurring open flat auctions and no achieved-flat-price stream, this is a **NO-BUILD**.

## 1. Sells municipal property at auction?
**YES for land; effectively NO for flats.** The Burmistrz Miasta Łowicza runs `przetarg ustny nieograniczony (licytacja)` under the ustawa o gospodarce nieruchomościami. The active "Sprzedaż nieruchomości miejskich" board on the spike day carried **land** auctions/wykazy only (Poznańska, Tkaczew/Strzelecka IV–VIII przetarg, 10 Pułku Piechoty, Makowiska, Ekonomiczna, Batalionów Chłopskich, Katarzynów) plus tenant-buyout wykazy.
- Confirmed **open flat auctions** (rare, via BIP full-text search on "lokalu mieszkalnego", 22 hits):
  - ul. **Aptekarska 4 m.1** — *I przetarg ustny nieograniczony (licytacja) na sprzedaż wolnego lokalu mieszkalnego* + udział 32/100 (2024–25). PDF `oglosz...aptekar`.
  - os. **Dąbrowskiego 14 m.37** — I + II przetarg ustny nieograniczony na sprzedaż wolnego lokalu (2010–11).
  - ul. **Szklanych Domów 9A / Warszawa** — I + II publiczny przetarg ustny na sprzedaż spółdzielczego własnościowego prawa do lokalu (2021).
  - I publiczny przetarg ustny nieograniczony on a 1/8 udział spółdzielczego prawa.
- **Dominant residential mode = no auction:** `wykaz do sprzedaży w drodze bezprzetargowej lokali mieszkalnych ich najemcom` (I, II, III, IV partia) and `Wykup lokali komunalnych` (ZGM). This is the NO-BUILD signature: tenant sales + wykaz lists, land-skewed auction board.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bespoke fast4net portal):**
- Sale board: `https://www.lowicz.eu/bip/Sprzedaz_nieruchomosci_miejskich,2296`
- Section-URL pattern: `.../bip/<Slug_Name>,<ID>` (single aggregated page, no per-article URLs).
- Announcement/wykaz/result docs = PDFs at `https://www.lowicz.eu/files/docs/<name>.pdf` (linked relatively as `../files/docs/...`). Examples: `wykaz_do_sprzedazy_10_pul.pdf`, `oglosz_i_przet_katarzynow.pdf`, `wykaz_sprzedazy_lokale_ko.pdf`, `wynik_i_przetargu_3_maja_.pdf`.
- BIP full-text search: `https://www.lowicz.eu/bip/index.php?search=<q>&lim=NN`.
- News-portal archive (mirrors some notices): `https://www.lowicz.eu/Archiwum,2848`.

**Housing manager — ZGM (separate BIP, out of scope for flat auctions):** `http://www.zgm.bip.lowicz.eu/bip/` (Zakład Gospodarki Mieszkaniowej, ul. Kaliska 6). Menu = Przetargi (roboty/usługi procurement), **Przetargi – lokali użytkowych/garaże** (najem/lease, not sale), **Wykup lokali komunalnych** (tenant buyout), Ogłoszenia. No open flat-sale auction board. TLS cert covers only `*.lowicz.eu` (sub-subdomain `zgm.bip` mismatches → fetch over http).

**Do NOT confuse** with rural **Gmina Łowicz** (`gminalowicz.pl` / `bip.uglowicz.nv.pl`) or **Starostwo Powiatowe** (`bip.powiat.lowicz.pl`) — separate JSTs. Target here is the town **Gmina Miejska Łowicz**.

## 3. Format + rendering
- **Server-rendered HTML** — bespoke municipal CMS, footer "design by **fast4net**". No JS-SPA, no auth, no CAPTCHA. Section pages are plain HTML lists of PDF links.
- **Born-digital text-PDF** attachments — confirmed by `pdftotext` on `wynik_i_przetargu_3_maja_.pdf`: clean extractable text (address, KW nr, cena wywoławcza, hammer price). No OCR needed. Small file sizes (50–210 kB) consistent with Word-exported PDFs.
- Parsing model would be: one section page → enumerate `/files/docs/*.pdf` → `pdfText` each → regex on Polish fields.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: very low.** Across the 22-hit "lokalu mieszkalnego" index spanning 2010→2026, only ~4 distinct open flat auctions (several re-runs of the same unit). Effectively **~0 recurring per year**; flats mostly leave the stock via tenant buyout / wykaz. Land auctions are the recurring volume.
- **Achieved-price stream: present for land, absent for flats.** Results are published as `Wynik przetargu` PDFs (born-digital, with hammer price — e.g. 3 Maja 11: cena wywoławcza 2.300.000 zł → 2.323.000 zł, Bank Spółdzielczy Ziemi Łowickiej, 06.02.2026). But on the current board only **one** wynik PDF, and it is land. No steady flat-hammer-price series to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** none clean — bespoke **fast4net** portal is not in the CMS→analog table. Rendering-wise it resembles the **WordPress/custom-HTML** family (server-HTML index + born-digital text-PDF, cf. brzeg/nowa-sol), but the code would be **one-off** (unique section-URL scheme, single aggregated page, no per-article pagination/dates → weak change-detection).
- **Effort if forced:** Medium (bespoke selectors + PDF field regex + de-dup of re-run auctions), for near-zero flat yield.
- **Blockers / why NO-BUILD:** (1) open flat-auction volume ~0/yr — the disposal channel for flats is bezprzetargowo na rzecz najemcy + wykup komunalny, out of the auction thesis; (2) auction board is land-skewed; (3) no dedicated flat results board / no achieved-flat-price stream; (4) bespoke CMS with no reusable analog. Classic generic city-BIP NO-BUILD.

**VERDICT: NO-BUILD** — Gmina Miejska Łowicz auctions land, not flats; residential stock is disposed of to tenants (bezprzetargowo) and via wykaz, with only a rare handful of open flat auctions over 15 years and no flat achieved-price stream. Bespoke fast4net BIP, not worth an adapter.
