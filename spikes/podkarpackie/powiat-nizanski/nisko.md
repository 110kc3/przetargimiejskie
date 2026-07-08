# Spike — Nisko (Podkarpackie · powiat niżański)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina i Miasto Nisko (miejsko-wiejska, seat of powiat niżański) sells municipal property at *publiczny przetarg ustny nieograniczony*, published on the city BIP `bip.nisko.pl` (IDcom CMS — clean server-HTML lists + born-digital text-PDF ogłoszenia). BUT the entire disposal stream is **buildable land (działki gruntowe niezabudowane pod budownictwo jednorodzinne)** plus the odd limited (ograniczony) land auction to adjoining owners. Across every board and result notice checked (Sep 2023, Dec 2023, Mar 2024 results, Apr 2025, Mar 2026) there are **zero open flat auctions** — no `sprzedaż lokalu mieszkalnego`. The housing manager **ZBKiZM Nisko** (zbkizm-nisko.pl) exists but runs only *najem/dzierżawa* (lease) auctions, not flat sales. A results board with achieved (hammer) prices exists, but it prices land. Classic Podkarpackie-seat NO-BUILD: generic city-BIP skewing to land + lease. No flat-auction volume to justify an adapter.

## 1. Sells municipal property at auction?
**YES — but land only, not flats.** The Burmistrz Gminy i Miasta Nisko (Referat Gospodarki Nieruchomościami) runs `publiczny przetarg ustny nieograniczony` (and occasionally `ograniczony`) for sale of municipal real estate. Every announcement inspected is **działki gruntowe niezabudowane** (undeveloped/buildable plots), e.g.:
- **Apr 2025 batch** (PDF `gn_przetarg_2025-04-04.pdf`): 6+ plots — dz. 4687/7 (0,1038 ha, cena wyw. 100 000 zł), 4687/8, 4687/14, 5161 (ul. Kochanowskiego), 5140/310 (ul. Słoneczna), 5140/311 — all "nieruchomość gruntowa niezabudowana", each with a *decyzja o warunkach zabudowy dla budynku mieszkalnego jednorodzinnego* (i.e. building plots, NOT flats).
- **Ogłoszenie #245409**: dz. ul. Sandomierska (II ustny **ograniczony**, restricted to neighbours), dz. ul. Dworska ×2 (II ustny nieograniczony) — all land.
- **Results 14.03.2024** (#743209): 5 działki (ul. Sandomierska 1465/1 sold 235 330 zł; Nowa Boczna 4687/5 → 205 000 zł; 4687/12 → 190 000 zł; two unsold) — **land, no flats**.

Searches for `sprzedaż lokalu mieszkalnego` on `bip.nisko.pl` return nothing from Nisko (the only lokal-mieszkalny hit was Krosno, a different city). Residential-flat disposal in Nisko is not done via open auction here.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (IDcom CMS), `bip.nisko.pl`:**
- Property-sale board (Referat GN): `https://bip.nisko.pl/struktura/2/1064/dokumenty/3/lista/1`
- Yearly archive: `https://bip.nisko.pl/struktura/2/1064/dokumenty/archiwum/3/lista/1/2024`
- Przetargi (top-level, currently public-procurement / zamówienia): `https://bip.nisko.pl/wiadomosci/3/lista/przetargi`
- Article URL pattern: `wiadomosci/3/wiadomosc/NNNNNN/slug` and `struktura/2/1064/dokumenty/3/wiadomosc/NNNNNN/slug`
- Sample sale ogłoszenie: `.../wiadomosc/245409/...`, `.../wiadomosc/805138/...`; sample results: `.../wiadomosc/743209/...`
- Full ogłoszenia frequently link a PDF hosted on the promo site, e.g. `https://nisko.pl/images/stories/2025/aktualnosci/gn_przetarg_2025-04-04.pdf`

**Housing manager (lease only):** `Zarząd Budynków Komunalnych i Zieleni Miejskiej` — `https://www.zbkizm-nisko.pl/` and its BIP `https://jo.nisko.bip.gmina.pl/` — publishes `przetarg ustny nieograniczony na najem/dzierżawę` (Dąbrowskiego 12 lokale użytkowe, park linowy, Zalew Podwolina), housing-assistance notices — **no flat SALES**.

Contact: Urząd Gminy i Miasta Nisko, Plac Wolności 14; auctions held in the sala narad. Not to be confused with Starostwo Powiatowe w Nisku (`bip.powiatnizanski.pl`, out of scope).

## 3. Format + rendering
- **Server-rendered HTML** — IDcom hosted BIP (analog: tczew / gniezno / giżycko). Dated article lists, no JS gate, no auth/CAPTCHA. Confirmed live via fetch + `curl` (footer signature: **IDcom**).
- **Born-digital text-PDF** for the full ogłoszenie body — `pdftotext -layout` extracted clean, structured text (plot no., pow., KW, cena wywoławcza, wadium). No OCR needed.
- Results notices (`informacja o wynikach przetargów`) are inline HTML tables with `Najwyższa cena netto osiągnięta w przetargu`.

## 4. Volume + achieved-price stream
- **Open FLAT-auction volume: ZERO.** Every sale board item is a building plot (działka). No `lokal mieszkalny` at open auction across 2023–2026.
- **Land auction volume:** modest — a few batched działki per campaign, 2–4 campaigns/year (Sep 2023, Dec 2023, Mar 2024, Apr 2025, Mar 2026).
- **Achieved-price stream:** YES — a real results board publishes hammer prices per plot (cena osiągnięta / nabywca, or wynik negatywny). Well-formed, parseable. But it prices **land**, which is off-thesis for a flat-auction adapter.
- **Housing (ZBKiZM):** lease/dzierżawa auctions only — again not flat sales.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest CMS analog:** IDcom family — **Tczew / Gniezno / Giżycko** shape (`wiadomosci/N/wiadomosc/NNNNNN` + `struktura/.../dokumenty` boards, born-digital PDF bodies). Technically an easy scrape.
- **But the disposal mix is wrong.** This is the standard Podkarpackie-seat NO-BUILD profile: generic city-BIP whose real-estate stream is **buildable land + tenant leases**, with essentially **no open municipal flat auctions**. The housing manager exists (ZBKiZM) but only leases. Building a flat-auction adapter here yields ~0 flat rows.
- **Effort:** — (n/a; not building). A land-auction adapter would be Low-effort, but flats are the target and there are none.
- **Blockers:** none technical — the blocker is content: no OPEN FLAT-AUCTION VOLUME.

**VERDICT: NO-BUILD** — Nisko's open auctions are buildable land (działki) + ZBKiZM leases; zero `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`. Clean IDcom server-HTML BIP with a real land results board, but off-thesis. Consistent with other Podkarpackie seats.
