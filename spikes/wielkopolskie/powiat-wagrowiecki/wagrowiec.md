# Spike — Wągrowiec (Wielkopolskie · powiat wągrowiecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land-only municipal auction stream; flats go bezprzetargowo / cooperative).

## TL;DR
Gmina Miejska Wągrowiec (Urząd Miasta Wągrowiec, town gmina — NOT the rural Gmina Wągrowiec) does sell municipal property by *pierwszy ustny przetarg nieograniczony*, but the stream is **land-only**: building plots for single-family housing (ul. Dębińska 4734/1+4737/1 ~4089 m², Kaliska działki, "Miasto sprzedaje działki budowlane"). No municipal **lokal mieszkalny** auctions were found. The town's housing arm is **WTBS** (Wągrowieckie TBS, a Gmina-Miejska-owned spółka at Rynek 12) which handles *najem* (rental) and processes flat wykup **bezprzetargowo na rzecz najemcy** — off-auction, no achieved-price stream. The only flat-at-auction hits in Wągrowiec belong to the **Spółdzielnia Mieszkaniowa w Wągrowcu** (a private housing cooperative — out of scope). BIP is the **WOKISS/Nefeni** Wielkopolska family (`bip.wagrowiec.eu/wagrowiecm/bip/...`, clean server HTML) with a Nieruchomości section (Ogłoszenia o przetargach / Komunikaty / Wykazy) currently "Brak wpisów". Classic generic-city-BIP land skew → NO-BUILD.

## 1. Sells municipal property at auction?
**YES for land, NO for flats.** The Urząd Miasta Wągrowiec (Referat gospodarki nieruchomościami, room 6, tel. 67 286 05 45) runs `pierwszy ustny przetarg nieograniczony na sprzedaż nieruchomości`. Confirmed live auctions are **building plots**:
- ul. Dębińska — działki 4734/1 + 4737/1, ~4089 m², przeznaczone pod zabudowę mieszkaniową jednorodzinną (I ustny przetarg nieograniczony).
- Kaliska — działki, ustny przetarg nieograniczony (announced 2026-04-30, auction 16–18.06.2026).
- City press: "Miasto sprzedaje działki budowlane."

No municipal **lokal mieszkalny** offered at auction was found across searches + BIP. Municipal flats are disposed **bezprzetargowo na rzecz najemcy** (tenant wykup), handled via **WTBS** — off-auction, so no open oral flat auctions and no hammer-price notices. The one Wągrowiec "przetarg ustny nieograniczony na lokal mieszkalny" (ul. Jeżyka 2/6, 65 m², 235 300 zł, 2021) is the **Spółdzielnia Mieszkaniowa w Wągrowcu** — a private cooperative, NOT the gmina → out of scope. This matches the TODO heuristic: generic city-BIP property section = land + tenant sales, no flat-auction volume.

## 2. Where published? (hosts + boards, URLs)
**Target = TOWN Gmina Miejska Wągrowiec** (disambiguated below):
- BIP (primary): `https://bip.wagrowiec.eu/wagrowiecm/bip/przetargi/` — Przetargi board (nav hub; notices sit under Nieruchomości).
- Nieruchomości (official site mirror): `https://www.wagrowiec.eu/pl/dla-mieszkanca/gospodarka/nieruchomosci` → sub-pages **Ogłoszenia o przetargach**, **Komunikaty**, **Wykazy nieruchomości**.
- Ogłoszenia o przetargach: `https://www.wagrowiec.eu/pl/dla-mieszkanca/gospodarka/nieruchomosci/ogloszenia-o-przetargach` (was "Brak wpisów" on spike day).
- Housing manager (rentals + tenant wykup, NOT auctions): **WTBS** `https://wtbs.wagrowiec.eu/`.

**Do NOT confuse** with:
- **Rural Gmina Wągrowiec** (separate JST, out of scope): `bip.gminawagrowiec.pl` + its `Gminny Zakład Gospodarki Komunalnej i Mieszkaniowej` (`gzgkimwagrowiec.pl`).
- **Powiat Wągrowiecki** (county): `bip.wagrowiec.pl`.
- **Spółdzielnia Mieszkaniowa** (private cooperative): `smwagrowiec.pl`.

## 3. Format + rendering
- **Server-rendered HTML**, WOKISS/Nefeni Wielkopolska BIP family (`/wagrowiecm/bip/...` paths, standard nested-menu HTML). No SPA/JS gate, no auth, no CAPTCHA observed on fetched boards.
- Notices are inline HTML articles; longer wykazy/ogłoszenia may attach born-digital PDFs (handle with `pdfText` if built).
- The official `wagrowiec.eu` mirror is the same custom municipal CMS; both fetched as plain server HTML.

## 4. Volume + achieved-price stream
- **Flat volume: effectively zero.** No municipal flat auctions found; tenant wykup runs bezprzetargowo via WTBS (no auction notice, no achieved price published). Land auctions are a handful/year (building plots).
- **Achieved-price stream: NONE usable.** No dedicated wyniki/rozstrzygnięcia board surfaced; announcement pages carry `cena wywoławcza` for land only. For the flat dataset there is nothing to scrape.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a Wielkopolska WOKISS/Nefeni server-HTML gmina — but not warranted here.
- **CMS family:** WOKISS/Nefeni hosted BIP (server-rendered HTML; WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms).
- **Effort:** **—** (not building).
- **Blockers / why NO-BUILD:** No municipal open-oral **flat** auction stream — the load-bearing scope requirement. Municipal disposal here is (a) land at auction and (b) flats to sitting tenants bezprzetargowo via WTBS; the only flat auctions are a private cooperative's. No achieved-price flat stream. Building an adapter would yield land-only records with no flat signal.

**VERDICT: NO-BUILD** — Gmina Miejska Wągrowiec auctions only land (building plots); municipal flats go bezprzetargowo na rzecz najemcy through WTBS, and the sole flat auctions belong to the out-of-scope Spółdzielnia Mieszkaniowa. Clean WOKISS/Nefeni BIP, but no flat-auction volume and no achieved-price stream to justify a build.
