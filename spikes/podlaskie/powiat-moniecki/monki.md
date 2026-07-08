# Spike — Mońki (Podlaskie · powiat moniecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Mońki (Urząd Miejski, gmina miejsko-wiejska, seat of powiat moniecki) does run **open oral auctions** (`przetarg ustny nieograniczony`) — but only for **land and whole buildings**: developed plots, a former village school, farm parcels (some `ograniczony`), plus firewood and BPN lease auctions. **Municipal FLATS are NOT sold at open auction** — every `lokal mieszkalny` disposal found is a `wykaz` **w trybie bezprzetargowym** (to the sitting tenant). Open flat-auction volume is effectively **zero**. There is a housing manager (**ZGKiM Mońki**), but it administers rental stock — it does not run sale auctions. On top of the zero flat volume, the authoritative gmina BIP `bip-ummonki.wrotapodlasia.pl` is currently **NXDOMAIN** (the whole `wrotapodlasia.pl` regional BIP platform fails to resolve from Cloudflare + Google DoH as of 2026-07-08); the only reachable board is the city **WordPress** site `um-monki.pl`, whose notices attach **scanned PDFs** (`SKM_…` scanner output → OCR). Classic small-Podlaskie-seat NO-BUILD: land + tenant sales, ~0 open flat auctions.

## 1. Sells municipal property at auction?
**Partly YES (land/buildings) — but NO for flats.** Confirmed open oral auctions run by Burmistrz Moniek:
- **ul. Marii Konopnickiej 2** — `przetarg ustny nieograniczony` on a **developed property** (murowany, dwukondygnacyjny budynek mieszkalny + dwa budynki gospodarcze on a fenced plot — a whole house, **not** a lokal in a multi-flat block), cena wywoławcza **303 000 zł netto**; 1st auction 24.09.2025, 2nd announced.
- **Boguszewo** — auction of the **former school** building ("Przetarg na byłą szkołę", 17.11.2025).
- **Dudki** — **III przetarg ograniczony** (restricted, agricultural land, dz. 189, 0.44 ha) + separate działka auctions.
- **Sobieskie / Rybaki** — działki (undeveloped land).
- **Drewno opałowe** — I pisemny nieograniczony przetarg (firewood); **dzierżawa** auctions for Biebrzański PN land.

**Flats — no auction, ever (as found):**
- **ul. Tysiąclecia 14, lokal nr 6** (35.12 m², parter, 159 585 zł) — published as a **WYKAZ**, sale **"w trybie bezprzetargowym"** (statutory pre-emption / sitting tenant), 6-week claim window.
- "Wykaz nieruchomości przeznaczonej do sprzedaży **w drodze bezprzetargowej**" (recurring).
- Historic (2012): Al. Niepodległości lokal nr 15 — disposed the same way.

Net: open auctions exist but skew to **land + whole buildings**; residential flats leave the stock **only bezprzetargowo na rzecz najemcy**. This is the exact NO-BUILD profile.

## 2. Where published? (hosts + boards, URLs)
**Authoritative gmina BIP (currently DEAD):** `bip-ummonki.wrotapodlasia.pl` — the Wrota Podlasia regional BIP platform. **Every `*.wrotapodlasia.pl` BIP subdomain returns NXDOMAIN** (Status 3) from both `1.1.1.1` and `8.8.8.8` DoH on 2026-07-08 (SOA `dns1.wrotapodlasia.pl` serial 2026070601); apex `wrotapodlasia.pl` resolves but every BIP host (`bip-ummonki`, `bip.st.monki`, `przetargi.wrotapodlasia.pl`) does not. So the primary board is unreachable — historic URLs (e.g. `…/przetargi-i-plan-postepowan/zamowienia-publiczne.html`, `…/_przetargi/`, `/resource/NNNNNN/…pdf`) survive only in search index.
**Reachable board — city WordPress:** `https://um-monki.pl` (86.111.240.134)
- Ogłoszenia: `https://um-monki.pl/category/ogloszenia/`
- Full-text search: `https://um-monki.pl/?s=<term>`
- Per-notice posts, e.g. `…/gmina-monki-oglasza-sprzedaz-nieruchomosci-przy-ul-marii-konopnickiej-2/`, `…/wykaz-nieruchomosci-przeznaczonej-do-sprzedazy-lokal-mieszkalny-w-monkach/`
**Housing manager:** ZGKiM Mońki — `https://www.zgkimmonki.pl` (86.111.240.161); administers rental stock, no sale-auction board.
**Out of scope:** powiat BIP `bip.st.monki.wrotapodlasia.pl` (also NXDOMAIN); `monki.pl` (92.43.119.79, returns 403).

## 3. Format + rendering
- **um-monki.pl = WordPress**, server-rendered HTML (no SPA, no auth, no CAPTCHA). Each notice is an HTML post carrying a short summary; the **binding notice is an attached PDF**.
- **PDFs are scanner output** — e.g. Marii Konopnickiej 2 links `…/wp-content/uploads/2026/04/SKM_224e26042407010.pdf` (`SKM_` = Kyocera/Samsung scan) → **scanned-PDF → OCR** required, not born-digital text.
- The dead wrotapodlasia BIP was server-HTML + `/resource/NNNNNN/…pdf` documents (mix of text and scanned PDFs) — moot while NXDOMAIN.

## 4. Volume + achieved-price stream
- **Open FLAT-auction volume: 0.** No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` found anywhere (live or indexed). Flats = wykaz/bezprzetargowo only.
- **Non-flat auction volume: low** — a handful/year (land parcels, the odd building, firewood, BPN leases). Not the target asset class.
- **Achieved-price stream:** none on WordPress. The BIP historically posted `informacja z przetargu` (e.g. 2014: dz. 1130/11 Tysiąclecia sold 172 000 zł netto), but that board is unreachable now — no usable hammer-price feed for flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** a small **Podlaskie wrotapodlasia gmina** with land-only auctions and tenant flat sales — the generic NO-BUILD shape (unlike SmartSite **augustów**, which was BUILD). No flat pipeline to model.
- **Effort:** **—** (not worth building).
- **Blockers (decisive):** (1) **zero open flat auctions** — residential disposal is exclusively bezprzetargowo na rzecz najemcy; (2) authoritative BIP `wrotapodlasia.pl` platform is **NXDOMAIN** — no stable primary source; (3) reachable WordPress notices attach **scanned PDFs → OCR**; (4) no flat achieved-price board. Any one of (1) is disqualifying on the heuristic; the rest compound it.

**VERDICT: NO-BUILD (effort —)** — Mońki runs land/building auctions but sells municipal flats only bezprzetargowo na rzecz najemcy (~0 open flat auctions); the primary BIP is DNS-dead and the fallback WordPress notices are scanned PDFs. Textbook small-Podlaskie-seat NO-BUILD.
