# Spike — Radziejów (Kujawsko-Pomorskie · powiat radziejowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miasto Radziejów (the town / miasto — powiat seat, ~5,300 residents) is a tiny JST whose city BIP (`bip.umradziejow.pl`, **SISCO** CMS) does **not** run open oral auctions on **lokale mieszkalne** (flats). The przetargi board across 2023→2026 carries only: *najem lokali użytkowych* (commercial-space lease), *dzierżawa gruntu* under garage boxes, geodetic *rozgraniczenie* (boundary-survey) invitations, a one-off *sprzedaż środka trwałego* (fixed-asset sale), and a *sprzedaż kotłowni* (boiler-room, sold via przetarg ograniczony + rokowania). No dedicated municipal housing manager (no ZGM/ZBM/TBS). Open flat-sale auctions per year ≈ **0**. Must be disambiguated from the rural **Gmina Radziejów** (`bip.ugradziejow.pl`) — a separate JST, also out of scope. Verdict: NO-BUILD — nothing recurring to scrape.

## 1. Sells municipal property at auction?
**NO open flat auctions.** The Burmistrz Miasta Radziejów publishes *przetarg ustny nieograniczony*, but only for **najem** (lease) and **dzierżawa** (land lease), not for sale of flats. Evidence from the town przetargi board:
- **2026:** "…drugi przetarg ustny nieograniczony na najem lokalu użytkowego przy ul. Rynek 14" (lease, not sale).
- **2025:** przetarg na najem lokalu użytkowego; przetarg na dzierżawę gruntu pod boks garażowy (Chopina); several geodetic *rozgraniczenie* service invitations.
- **2024:** *sprzedaż środka trwałego* (fixed-asset sale, via zarządzenie); *rozgraniczenie nieruchomości* invitations. No flats.
- **2023:** *przetarg ustny ograniczony* + *rokowania* for a **kotłownia** (boiler room, Polna) — a restricted, non-flat disposal; the rest are *rozgraniczenie* service invitations.

Municipal property *sale lists* do exist — the archiwum "Obwieszczenia i ogłoszenia" carries occasional *wykaz nieruchomości przeznaczonych do sprzedaży* (21-day statutory display) — but these are wykazy, not open flat auctions, and are sparse (a handful across 2016–2019). No sign of *ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego*. No ZGM/ZBM/TBS housing manager exists for the town; flats, if disposed, would go *bezprzetargowo na rzecz najemcy*.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SISCO CMS):** `bip.umradziejow.pl` (Gmina **Miasto** Radziejów, ul. Kościuszki 20/22, 88-200 Radziejów).
- Przetargi (main): `http://www.bip.umradziejow.pl/?k=23` → new URL shape `https://www.bip.umradziejow.pl/przetargi,9`
- Przetargi nieograniczone by year: `https://www.bip.umradziejow.pl/przetargi,9_1-2026`, `…-2025`, `…-2024`, `…-2023` (also `przetargi,9_2` = ograniczony)
- Single item: `?a=NNNN` (e.g. `http://www.bip.umradziejow.pl/?a=5177`)
- Obwieszczenia i ogłoszenia (property-sale wykazy): `https://www.archiwum.bip.umradziejow.pl/?k=56`
- Zarządzenia: `https://bip.umradziejow.pl/zarzadzenia,11_2023-_284`
- Platforma zakupowa (public procurement): `/platformazakupowa,83_106`

**Do NOT confuse** with the rural **Gmina Radziejów** BIP `bip.ugradziejow.pl` (`?k=70`) — a separate JST (also no flat auctions), nor with `Gmina Radziejowice` (`bip.radziejowice.pl`, Mazowieckie), nor the Starostwo Powiatowe `bip.radziejow.pl`.

## 3. Format + rendering
- **Server-rendered HTML**, SISCO BIP platform (footer "© SISCO 2016 - 2026"). Year-filtered list pages (`przetargi,9_1-YYYY`) + article pages (`?a=NNNN`). No SPA, no auth, no CAPTCHA observed — technically scrapeable.
- Notice bodies are inline HTML; some attach born-digital PDFs (would use `pdfText`, OCR unlikely).
- **But there is no flat-sale content stream to render** — the format is a non-issue given the empty scope.

## 4. Volume + achieved-price stream
- **Open flat-sale auctions/year ≈ 0.** Four years of the przetargi board yield zero *sprzedaż lokalu mieszkalnego* auctions; property disposals seen are lease, garage-land dzierżawa, boiler-room, or fixed-asset — plus sporadic sale *wykazy*.
- **Achieved-price stream:** N/A — no *informacja o wyniku przetargu* board for flat sales because there are no such auctions. (Results, when any, would appear as individual `?a=NNNN` articles, but nothing flat-related.)

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (had it been in scope):** a small SISCO BIP town — same `przetargi,9_1-YYYY` list + `?a=NNNN` article shape. Cloneable pattern, but nothing to feed it.
- **CMS family:** SISCO hosted BIP (server-rendered HTML).
- **Effort:** **—** (no build). Even a Low-effort SISCO adapter would return an empty flat-auction set.
- **Blockers:** No usable content, not technical. Radziejów is a ~5.3k-resident town with no municipal housing manager and no recurring open flat-sale auctions; municipal flat disposal is *bezprzetargowo na rzecz najemcy* or absent.

**VERDICT: NO-BUILD** — Gmina Miasto Radziejów publishes only lease/dzierżawa/survey/one-off-asset przetargi on its SISCO BIP; zero open oral flat-sale auctions across 2023–2026 and no ZGM housing manager, so there is no recurring flat-auction stream to scrape.
