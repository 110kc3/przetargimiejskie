# Spike — Police (Zachodniopomorskie · powiat policki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (open flat-auction volume ≈ 0).

## TL;DR
Gmina Police (Urząd Miejski) does sell municipal property by `przetarg ustny nieograniczony`, published on its own BIP `bip.police.pl` — a **Logonet eUrząd** hosted CMS (v2.9.0, Bydgoszcz; same family as chełmno / golub-dobrzyń / tarnowskie-góry / skarżysko-kamienna). Clean server-rendered HTML, notice URLs `/przetarg-nieruchomosci/{id}/{slug}`, occasional born-digital PDF map attachments. BUT the property-sale stream is dominated by **land** (działki w Trzebieży / Policach) and the "Przetargi na lokale" board is **dzierżawa** of market pavilions / lokale użytkowe. Residential flat disposal runs almost entirely **bezprzetargowo na rzecz najemcy** — there is a standing "Wniosek o sprzedaż lokalu mieszkalnego na rzecz najemcy" page, and flats reach an OPEN auction only as rare leftovers (one candidate found, Nowopol 38/6, already 404-archived). The housing manager **ZGKiM Police** exists but runs **lease/rent only** (lokale użytkowe, garaże, cmentarz), with a najem-results board — no flat SALE auctions and no flat hammer prices. Open flat-auction volume is effectively nil → below the BUILD bar.

## 1. Sells municipal property at auction?
**YES for property in general; effectively NO for open flat auctions.** The Burmistrz Polic runs `pierwszy/kolejny przetarg ustny nieograniczony na sprzedaż` under the 14.09.2004 Rady Ministrów regulation, wadium + Gazeta Wyborcza publication, standard open procedure. What actually cycles on the sale board:
- **Land, dominant:** działki nr 314/105 obręb 5-Police (rejon ul. Licealnej, I przetarg 18.06.2026, id 20997); działka nr 1104/27 Trzebież (20.05.2026, id 20999); działki 1104/37 + 1104/38 rejon ul. Polnej, Trzebież — zabudowa jednorodzinna (id 20506).
- **Lease, separate board:** przetargi ustne na **dzierżawę** działek/pawilonów na targowisku gminnym ul. PCK 7; najem lokali użytkowych.
- **Flats — bezprzetargowo:** standing page "Wniosek o sprzedaż lokalu mieszkalnego na rzecz najemcy" (Wydział Gospodarki Gruntami) — the primary residential-disposal channel is tenant-preferential, not auction.
- **Open flat auction — one transient candidate:** `Nowopol 38/6` (lokal mieszkalny nr 6, udział 83/1000 w częściach wspólnych, id 21048) appeared on the sale board but now returns HTTP 404 (auction concluded/archived). No other distinct open flat-sale address surfaced across 2015–2026 archive probing.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet eUrząd):**
- Property SALE auctions: `https://bip.police.pl/przetargi-nieruchomosci/376` (individual notices `https://bip.police.pl/przetarg-nieruchomosci/{id}/{slug}`; year filter dropdown 2015–2026).
- "Przetargi na lokale" (mostly **dzierżawa/najem**): `https://bip.police.pl/artykuly/391/przetargi-na-lokale`
- "Przetargi inne" / Tablica ogłoszeń (rozstrzygnięcia najmu): `https://bip.police.pl/artykuly/300/2/25/przetargi-inne`, `https://bip.police.pl/artykul/301/...`
- Tenant-sale application (bezprzetargowo): `http://bip.police.pl/artykul/289/3822/wniosek-o-sprzedaz-lokalu-mieszkalnego-na-rzecz-najemcy`

**Public mirror (Joomla, non-BIP):** `https://www.police.pl/dla-mieszkanca/przetargi-nieruchomosci.html` and `.../wykazy-nieruchomosci.html` (wykazy art. 35 UGN).

**Housing manager — ZGKiM Police (`zgkim.police.pl`, lease-only):**
- Ogłoszenia/przetargi: `https://zgkim.police.pl/ogloszenia-i-przetargi-inne` — dzierżawa stanowisk handlowych, najem lokali użytkowych/garaży.
- Wyniki przetargów (najem only): `https://zgkim.police.pl/bip/przetargi-na-najem-lokali-uzytkowych-i-garazy/wyniki-przetargow`
- Wykazy: `https://zgkim.police.pl/bip/przetargi-na-najem-lokali-uzytkowych-i-garazy/wykazy-nieruchomosci`

Contact: Wydział Gospodarki Gruntami, ul. Bankowa 18, Police. ZGKiM: ul. Bankowa 18, pok. 301 (III p.).

## 3. Format + rendering
- **Server-rendered HTML** — Logonet eUrząd 2.9.0. Notices are inline HTML text (address, cena wywoławcza, wadium, powierzchnia, data, runda). Confirmed live via fetch of the sale board + a land notice.
- **Attachments:** occasional **born-digital PDF** map (`/dokumenty/YYYYMM/mapaXXX.pdf`) — handle with `pdfText` if needed; **no OCR** required. Core notice never hidden in a scan.
- **No SPA, no auth, no CAPTCHA.** ZGKiM portal is a separate Drupal-based site (server HTML).

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ≈ 0 / negligible.** Sale board skews to land + market-pavilion dzierżawa; flats disposed bezprzetargowo na rzecz najemcy. Only one open flat-sale notice (Nowopol 38/6) was ever surfaced, now archived to 404. Not a recurring stream — well below the BUILD threshold.
- **Achieved-price stream: absent for flats.** ZGKiM's "Wyniki przetargów" board covers **najem/dzierżawa** results only (no sale hammer prices). The city BIP publishes `informacja o wyniku przetargu` for land/lease, not a flat-sale price feed. No usable municipal flat hammer-price stream exists.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** Logonet eUrząd family — **chełmno / golub-dobrzyń / tarnowskie-góry / skarżysko-kamienna** (same `/przetarg-nieruchomosci/{id}/{slug}` article shape). Adapter mechanics would be **LOW** effort.
- **Why NO-BUILD:** the blocker is content, not tech. Police is a generic city-BIP whose residential disposal is overwhelmingly **tenant-preferential (bezprzetargowo)** plus **land + lease** auctions; genuine OPEN flat-sale auctions are essentially non-existent, and there is no flat hammer-price board. That is exactly the NO-BUILD profile. The housing manager (ZGKiM) reinforces this — it manages rent/lease, not flat sales.
- **Blockers:** no recurring open flat-auction inventory to harvest; no achieved-price stream for flats. Re-verify only if the sale board later shows a sustained run of `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` (would flip effort to Low on the Logonet analog).

**VERDICT: NO-BUILD** — clean Logonet server-HTML BIP with a real housing manager, but residential disposal is bezprzetargowo-na-najemcy + land/lease; open municipal flat auctions ≈ 0 and no flat hammer-price stream.

```json
{"city_slug":"police","voivodeship":"zachodniopomorskie","powiat_slug":"powiat-policki","status":"no-build","effort":"—","confidence":"LIVE","note":"ZGKiM housing mgr but lease-only; Logonet eUrzad BIP bip.police.pl sale board skews land+dzierzawa; flats disposed bezprzetargowo na rzecz najemcy; open flat auctions ~0 (Nowopol 38/6 sole candidate, now 404); no flat hammer-price board; analog chelmno","host":"bip.police.pl","cms":"Logonet eUrzad"}
```
