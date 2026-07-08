# Spike — Myślenice (Małopolskie · powiat myślenicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (residential disposal ≈ 0 open flat auctions; land + lease + tenant-sale stream).

## TL;DR
Gmina Miejsko-Wiejska Myślenice (Urząd Miasta i Gminy, Rynek 8/9, Wydział Mienia) **does** sell municipal property at `przetarg ustny nieograniczony` — but the disposal stream is **land**: building plots, an ex-przedszkole building, industrial-zone parcels, plus `przetarg ustny ograniczony` (restricted, neighbour-only) infill strips. Residential disposal is essentially absent: **zero gmina-run open flat (lokal mieszkalny) auctions** were found on the live board or in search. The only "mieszkanie" hits in Myślenice are a housing cooperative (SM „ZORZA") and a Tax Office enforcement `licytacja` — both out of scope. No communal housing manager exists (only RPGK, a general utilities/waste spółka). The BIP is a `bip.malopolska.pl` JS-SPA (empty without JS — chrzanów/render.js analog); a fully server-rendered WordPress mirror at `myslenice.pl/samorzad/urzad/nieruchomosci` carries the same notices. Technically buildable, but **no flat-auction volume and no achieved-price flat stream** → NO-BUILD per the residential heuristic.

## 1. Sells municipal property at auction?
**YES for land — NO meaningful flat auctions.** The Burmistrz runs open and restricted auctions for municipal property. Confirmed live (as of this spike):
- **I przetarg ustny nieograniczony** na sprzedaż nieruchomości — dz. **602/1 + 603/1** (dzielnica Zarabie; zabudowana budynkiem b. przedszkola, pow. użytkowa 227,15 m²), **cena wywoławcza 1 999 990,20 zł brutto**, przetarg **15.09.2026**, sala 13. → LAND + building, not a flat.
- **I przetarg ustny ograniczony** na sprzedaż niezabudowanej nieruchomości — dz. **910/15** (obręb 1, strefa przemysłowa, 0,0397 ha), cena **72 570,00 zł**, przetarg **07.08.2026**. → LAND, restricted to adjacent owners.
- Multiple **wykaz nieruchomości do wydzierżawienia** (dzierżawa/lease — dz. 80/2, 1954) and **wykaz do sprzedaży w trybie bezprzetargowym** (dz. 709/12). → lease + off-auction, out of scope.

No `sprzedaż lokalu mieszkalnego` auction appears on the current board or in indexed history for the Gmina. The residential category the town uses is tenant-facing (bezprzetargowo) / lease wykazy, not open flat auctions.

**Out-of-scope "flat" hits (not the gmina):**
- SM Lokatorsko-Własnościowa **„ZORZA"** — przetarg ustny nieograniczony, os. 1000-lecia 10/17 (34,00 m²). → housing cooperative, separate JST-external entity.
- **Urząd Skarbowy w Myślenicach** — pierwsza licytacja, ul. Średniawskiego (2024). → tax-enforcement sale, not municipal disposal.

## 2. Where published? (hosts + boards, URLs)
**Primary BIP — `bip.malopolska.pl/umigmyslenice` (Małopolska hosted BIP, JS-SPA):**
- Nieruchomości board: `https://bip.malopolska.pl/umigmyslenice,m,380123,nieruchomosci.html`
- Wyniki przetargów (results board): `https://bip.malopolska.pl/umigmyslenice,m,80937,wyniki-przetargow.html`
- Zamówienia publiczne (procurement, not property): `https://bip.malopolska.pl/umigmyslenice,m,80862,zamowienia-publiczne.html`
- Article pattern: `bip.malopolska.pl/umigmyslenice,a,NNNNNNN,slug.html` (e.g. `,a,1923746,` = the 602/1+603/1 land auction).

**Server-rendered mirror — city WordPress site (`myslenice.pl`):**
- `https://myslenice.pl/samorzad/urzad/nieruchomosci` — carries the same przetarg/wykaz notices as inline HTML (CMS: "Dark Red CMS v.15.0818"). This is the usable source if built (BIP itself needs JS).

Contact: Wydział Mienia UMiG Myślenice, Rynek 8/9, pok. 24/26, tel. 12-639-23-33.

## 3. Format + rendering
- **BIP `bip.malopolska.pl/umigmyslenice`: JS-SPA.** Raw curl returns a ~3.2 KB shell with **0 article links and no notice text** — content injected client-side. Same family as chrzanów (needs headless render / render.js). `?drukuj=1` and `/api/...` probes returned the empty shell / 404 — no easy server-rendered print endpoint.
- **`myslenice.pl` mirror: server-rendered HTML** (Dark Red CMS). Full notice bodies (cena wywoławcza, działka, KW, dates, wadium) present in raw HTML — parseable without JS.
- Notice bodies are **inline HTML text** (no PDF gate observed on the sampled notices); długie ogłoszenia occasionally link a born-digital PDF of `warunki przetargu`.
- No auth / CAPTCHA. TLS: `myslenice.pl` presented an incomplete cert chain (WebFetch failed to verify first cert; `curl -k` fine) — minor adapter note.

## 4. Volume + achieved-price stream
- **Open flat auctions: ~0.** No gmina `lokal mieszkalny` open auction found live or historically. Disposal volume is a handful of **land** auctions/year plus lease and bezprzetargowo wykazy.
- **Achieved-price stream:** A dedicated **Wyniki przetargów** board exists (`m,80937`) and would carry `informacja o wyniku przetargu` (cena osiągnięta) — **but for land, not flats**, and it sits behind the same SPA. No flat hammer-price stream to harvest.
- Net: the residential signal this project targets (recurring open flat auctions + flat results) is **absent**.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** chrzanów — `bip.malopolska.pl` JS-SPA requiring render.js; OR scrape the server-rendered `myslenice.pl` WordPress mirror (bochnia/olkusz-style custom-HTML) to skip the SPA. Wyniki board = results pass.
- **CMS family:** bip.malopolska.pl hosted BIP (JS-SPA) + Dark Red CMS WordPress mirror.
- **Effort:** **—** (not applicable — no flat pipeline to build). A land-only adapter would be Low–Medium via the WordPress mirror, but that is off the residential mandate.
- **Blockers for the intended use:** No open flat auctions, no housing manager (ZGM/MZBM absent; only RPGK utilities spółka), residential handled tenant-side/off-auction. SPA-gated BIP is a secondary friction but not the deciding factor.

**VERDICT: NO-BUILD** — Myślenice is a generic city-BIP disposal stream skewing to land + lease wykazy + bezprzetargowo tenant sales, with ≈0 gmina open flat auctions and no communal housing manager. Fails the residential BUILD heuristic.

```json
{"city_slug":"myslenice","voivodeship":"malopolskie","powiat_slug":"powiat-myslenicki","status":"no-build","effort":"—","confidence":"LIVE","note":"no housing manager (only RPGK utilities); BIP bip.malopolska.pl JS-SPA (chrzanow render.js analog) + server-HTML myslenice.pl WP mirror (Dark Red CMS); Nieruchomosci m,380123 + Wyniki m,80937 boards; volume=land only (dz.602/1+603/1 1.99M zl, dz.910/15 ograniczony) + dzierzawa/bezprzetargowo wykazy, ~0 open flat auctions; only flats = SM ZORZA coop + Urzad Skarbowy licytacja (out of scope)","host":"bip.malopolska.pl/umigmyslenice","cms":"bip.malopolska.pl JS-SPA (+ Dark Red CMS WordPress mirror myslenice.pl)"}
```
