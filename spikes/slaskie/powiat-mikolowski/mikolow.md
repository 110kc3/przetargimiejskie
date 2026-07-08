# Spike — Mikołów (Śląskie · powiat mikołowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Mikołów (Burmistrz) does run `przetarg ustny nieograniczony` for municipal real estate on a clean **Nefeni** server-HTML BIP (`bip.mikolow.eu`), but the sale board is **overwhelmingly land + garages**. Open **flat** auctions are incidental — only the odd gmina-held flat / spółdzielcze własnościowe prawo comes up (~0–2/yr). Both the 2024 and 2025 year boards showed **0 lokale mieszkalne** out of ~20 sale notices (all grunt niezabudowany/zabudowany + one garaż). The town's housing manager **ZGL Mikołów** (`zglmikolow.bip.net.pl`, also Nefeni) does **not** auction flats — it leases lokale użytkowe and runs **wykup lokalu komunalnego** (tenant purchase, bezprzetargowo). No dedicated results/rozstrzygnięcia board with achieved prices exists — only announcement boards + wykaz lists. This is the textbook NO-BUILD shape: generic city-BIP skewing to land + tenant sales with ~0 recurring open flat auctions. Closest CMS analog if ever built: **mogilno** (Nefeni).

## 1. Sells municipal property at auction?
**YES for property in general; NO for flats at recurring volume.** The Burmistrz Mikołowa runs `przetarg ustny nieograniczony/ograniczony na sprzedaż nieruchomości` regularly — but the stream is land and garages:
- **2025 board (rok 2025):** 10 notices — ul. Gliwicka 373A, ul. Miętowa (I & II), ul. Lawendowa, ul. Modrzewiowa, ul. Gliwicka 367, Jeleśń, ul. Górnośląska, ul. Piaskowa (garaż). **0 flats.**
- **2024 board (rok 2024):** ~10+ notices — Filaretów, Górnośląska, Jana Pawła II 16 (zabudowana), Lawendowa, Gliwicka. **0 flats.**
- **Current "Ogłoszenie o przetargach" landing:** two **dzierżawa** (lease) auctions — ogród przydomowy + grunt rolny. Lease, not sale.

Occasional gmina **flat** auctions do occur but are rare and buried:
- **Osiedle Przy Plantach 6/5** — I przetarg ustny nieograniczony na sprzedaż **spółdzielczego własnościowego prawa do lokalu mieszkalnego** (29,34 m², 1 pokój+kuchnia+łazienka), cena wywoławcza **140 000 zł**, wadium 14 000 zł, przetarg **22.01.2025**, KW KA1M/00062345/6. Seller = **Gmina Mikołów** (prawo wpisane na gminę), Burmistrz — a genuine municipal flat open-auction. Confirmed via infopublikator + BIP.
- **ul. Młyńska 4a/39** — lokal mieszkalny 24,67 m², cena wywoławcza 117 000 zł, wadium 2 340 zł (surfaced via search; attribution ambiguous — may be Mikołowska Spółdzielnia Mieszkaniowa, a private cooperative, not the gmina).

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.mikolow.eu`, Nefeni CMS):**
- Nieruchomości gminne (root): `https://bip.mikolow.eu/kategorie/47-nieruchomosci-gminne`
- Sprzedaż nieruchomości: `https://bip.mikolow.eu/kategorie/49-sprzedaz-nieruchomosci`
  - Ogłoszenia o przetargach: `https://bip.mikolow.eu/kategorie/52-ogloszenia-o-przetargach`
  - Rok 2024: `https://bip.mikolow.eu/kategorie/352-rok-2024`
  - Rok 2025: `https://bip.mikolow.eu/kategorie/513-rok-2025`
  - Wykaz nieruchomości do sprzedaży: `https://bip.mikolow.eu/kategorie/54-wykaz-nieruchomosci-przeznaczonych-do-sprzedazy`
  - Wykaz w użytkowaniu wieczystym: `https://bip.mikolow.eu/kategorie/441-...`
- "Ogłoszenie o przetargach" (mixed sale+lease landing): `https://bip.mikolow.eu/kategorie/291-ogloszenie-o-przetargach`
- Dzierżawa nieruchomości: `https://bip.mikolow.eu/kategorie/50-dzierzawa-nieruchomosci`
- Article URL pattern: `/kategorie/{NNN}-{slug}/artykuly/{NNNN}-{slug}` (e.g. `.../513-rok-2025/artykuly/3638-...konstytucji-3-maja-59`).

**Housing manager — ZGL Mikołów** (Zakład Gospodarki Lokalowej, ul. Kolejowa 2, 43-190 Mikołów, tel. 32 324 26 00):
- BIP: `https://zglmikolow.bip.net.pl/` · site: `https://zgl.mikolow.eu/`
- Sections: **Ogłoszenia lokale użytkowe** (lease), **Wykup lokalu komunalnego** (tenant purchase, bezprzetargowo), Wynajem sołtysówek. **No flat-sale auction board, no results board.**

**Out of scope:** Mikołowska Spółdzielnia Mieszkaniowa (`msmmikolow.eu`) — private housing cooperative, sells its own flats at auction; not a municipal source.

Address for przetargi: Urząd Miasta Mikołów, Rynek 16.

## 3. Format + rendering
- **Server-rendered HTML** — **Nefeni Sp. z o.o.** hosted BIP (footer "CMS & Hosting: Nefeni Sp. z o.o."). Dated article lists; individual notices are HTML at `/kategorie/.../artykuly/NNNN-...`. No SPA, no auth, no CAPTCHA — fetched cleanly.
- Notices are inline HTML text; longer ogłoszenia may attach a **born-digital PDF** (handle with `pdfText`; OCR unlikely).
- ZGL BIP is the same Nefeni/bip.net.pl family — identical rendering.

## 4. Volume + achieved-price stream
- **Flat volume: ~0–2/yr, incidental.** Two full year boards (2024, 2025) = **0 lokale mieszkalne**; the only confirmed gmina flat auction is Osiedle Przy Plantach 6/5 (2025). The recurring residential disposal channel is **wykup lokalu komunalnego** via ZGL — bezprzetargowo na rzecz najemcy.
- **Land/garage volume:** healthy (~15–20 sale notices/yr) — but out of the flat-focused scope.
- **Achieved-price stream: NONE.** No `informacja o wyniku przetargu` / rozstrzygnięcia board found under Sprzedaż nieruchomości — only announcement boards (cena wywoławcza) + wykaz lists. No hammer-price feed to parse.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest CMS analog:** **mogilno** (Nefeni family). If a flat adapter were ever justified, clone the Nefeni `/kategorie/.../artykuly/NNNN` list→article shape. Effort would be **Low** technically — but there is nothing worth harvesting.
- **Why NO-BUILD:** (1) essentially **0 recurring open flat auctions** — sale board skews to land + garages; (2) recurring residential disposal is **tenant purchase (bezprzetargowo)** via ZGL, not open auction; (3) **no results/achieved-price board**. This is exactly the heuristic's NO-BUILD profile.
- **Blockers:** none technical (clean server HTML). The blocker is data supply, not access.
- **Note for reviewer:** the gmina *does* run a clean, recurring **land/garage** open-auction program on this same Nefeni BIP — if project scope later prioritizes land disposals, Mikołów flips to a Low-effort BUILD for land; for flats it stays NO-BUILD.

**VERDICT: NO-BUILD (effort —)** — clean Nefeni city BIP, but ~0 recurring open flat auctions (land/garage-dominated), residential disposal is tenant wykup via ZGL, and no achieved-price board. Confirming near-zero flat volume early is the valuable answer here.
