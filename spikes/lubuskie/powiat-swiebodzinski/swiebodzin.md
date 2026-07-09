# Spike — Świebodzin (Lubuskie · powiat świebodziński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (no recurring flat-auction stream; no achieved-price publication).

## TL;DR
Gmina Świebodzin (Urząd Miejski, Burmistrz Świebodzina) sells municipal property at auction and publishes it on the city BIP `bip.swiebodzin.eu`, which runs the **SystemDoBIP.pl** CMS (E-LINE Systemy Internetowe Tadeusz Kozłowski) — clean server-rendered HTML with a numbered przetargi board (`/przetargi/361/<pk>/<no>_/`) and status filters (ogłoszone / rozstrzygnięte / unieważnione). The CMS itself is trivial to parse. **But the stream is the wrong shape:** the 2022–2026 przetargi are essentially all **land** (nieruchomość gruntowa, mostly *pisemny* written tenders); **lokal mieszkalny** auctions are rare and historical — the confirmed flat sales (Łużycka 46B/16, Krótka 5/4, Głogowska 6/3) date to ~2017–2018. Municipal flats here overwhelmingly go *bezprzetargowo na rzecz najemcy*. There is also **no achieved-price stream**: the "rozstrzygnięte" status is only a lifecycle flag — the notice pages still show just the announcement (cena wywoławcza), never cena osiągnięta / nabywca (verified on przetarg 192 and 318). Low CMS effort, but there is no usable flat-auction + price dataset to extract. NO-BUILD.

## 1. Sells municipal property at auction?
**YES — but almost entirely land, flats only historically.** Burmistrz Świebodzina runs `przetarg nieograniczony` for sale of gmina property. Two formats appear: `pisemny przetarg nieograniczony` (written) for land, and `ustny przetarg nieograniczony` (oral) used for the occasional flat.
- **Flats confirmed (open oral auction):** ul. Łużycka 46B, lokal 16 (43.35 m², 2 rooms; cena wyw. 65 000 zł, wadium 6 500 zł — I ustny przetarg, auction 2018-02-23; przetarg 192); ul. Krótka 5/4 (21.70 m², poddasze); ul. Głogowska 6/3. All ~2017–2018.
- **Recent stream (2022–2026):** the ogłoszone + rozstrzygnięte boards are dominated by **nieruchomość gruntowa** (land parcels, obręb/district 1 & 3), typically *pisemny* przetarg. On the spike day the single active notice was "IV pisemne przetargi nieograniczone na sprzedaż gminnej nieruchomości gruntowej" (przetarg 478, ogł. 2026-06-17, auction 2026-07-21). Scanning the ~10 most recent resolved notices: **zero** lokale mieszkalne — all land.
- Municipal residential units are sold predominantly *bezprzetargowo na rzecz najemcy* (tenant preference), which never reaches the open-auction board. A separate **Świebodzińskie TBS (STBS)** exists (menu node `/319/STBS/`) as the social-housing vehicle, but it is not a ZGM-style manager publishing recurring open flat auctions.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SystemDoBIP.pl CMS):**
- Przetargi board (all): `https://bip.swiebodzin.eu/przetargi/361/status/`
- Ogłoszone: `https://bip.swiebodzin.eu/przetargi/361/status/0/`
- Rozstrzygnięte: `https://bip.swiebodzin.eu/przetargi/361/status/1/`
- Unieważnione: `https://bip.swiebodzin.eu/przetargi/361/status/2/`
- Individual notice URL pattern: `https://bip.swiebodzin.eu/przetargi/361/<pk>/<numer>_/` (e.g. `/361/206/192_/` = flat Łużycka 46B; `/361/346/318_/` = land Chociule; `/361/478/478_/` = current land tender).
- Zamówienia publiczne (procurement, separate, out of scope): `https://bip.swiebodzin.eu/zamowienia_publiczne/207/status/...`
- STBS node: `https://bip.swiebodzin.eu/319/STBS/`

**CMS footer:** "SYSTEMDOBIP.PL", copyright E-LINE SYSTEMY INTERNETOWE Tadeusz Kozłowski. Contact: Urząd Miejski w Świebodzinie, tel. 68 475 09 14. (Do NOT confuse with `bip.swiebodzice.pl` — that is Świebodzice, dolnośląskie — a different town.)

## 3. Format + rendering
- **Server-rendered HTML** — SystemDoBIP.pl. Board lists are dated HTML tables; each przetarg is an HTML document at `/przetargi/361/<pk>/<no>_/`. Confirmed live via fetch (plain server HTML, no JS gate, no auth/CAPTCHA). CMS-wise this is easy to parse (comparable to the bip.info.pl / SystemDoBIP server-HTML family).
- Notices are inline HTML text (address, powierzchnia, cena wywoławcza, wadium, termin, runda). Some may attach a born-digital PDF (handle with `pdfText` if seen).

## 4. Volume + achieved-price stream
- **Flat volume:** effectively **~0/yr in recent years**. Open oral flat auctions are historical (a handful ~2017–2018); 2022–2026 is all land + written tenders. Total resolved archive is large (~450 notices over many years) but that volume is land-dominated.
- **Achieved-price stream: NO.** The "rozstrzygnięte" status is a lifecycle flag only — the notice pages continue to show just the announcement (cena wywoławcza) with no cena osiągnięta / cena sprzedaży / nabywca / liczba uczestników. Verified on przetarg 192 (flat, "rozstrzygnięte" but no result shown) and przetarg 318 (land, no result shown). There is no separate "informacja o wyniku przetargu" board with hammer prices. This kills the achieved-price value proposition.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (CMS only):** SystemDoBIP.pl / small server-HTML gmina BIP (bip.info.pl-style board + numbered document pages) — cf. the Dolnośląskie bip.info.pl pattern (Zgorzelec/Złotoryja). Cloning the shape would be **Low** effort technically.
- **CMS family:** SystemDoBIP.pl (WordPress/custom server-rendered HTML in ADAPTER-GUIDE §3 terms — plain HTML tables/articles).
- **Blockers (why NO-BUILD despite easy CMS):**
  1. **No recurring flat-auction volume** — recent stream is land + written tenders; municipal flats go bezprzetargowo na rzecz najemcy. Matches the "generic city-BIP property section skews to land + tenant sales" NO-BUILD heuristic.
  2. **No achieved-price stream** — resolved board republishes only the announcement; no cena osiągnięta / nabywca ever published. The core dataset (auction → hammer price) cannot be built from this source.
- **Effort field:** — (not worth building).

**VERDICT: NO-BUILD** — SystemDoBIP.pl BIP is technically easy, but there is no recurring municipal flat-auction volume (land-dominated; flats sold bezprzetargowo to tenants) and no achieved-price publication. Nothing usable to extract. Revisit only if a dedicated ZGM/STBS open-flat-auction stream with results appears.
