# Spike — Międzyrzecz (Lubuskie · powiat międzyrzecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Międzyrzecz (Urząd Miejski, Wydział Gospodarki Mieniem) sells municipal **lokale mieszkalne** at **przetarg ustny nieograniczony** and publishes them through a dedicated, structured `/przetargi/` engine on `bip.miedzyrzecz.pl` — the **Wrota Lubuskie eBIP** platform (mirror of `bip.wrota.lubuskie.pl/um_miedzyrzecz`), the **same CMS + same engine already used by our working gorzow-wielkopolski adapter**. The engine has explicit status filters (0 = ogłoszone, 1 = rozstrzygnięte, 2 = unieważnione), typed list fields (data ogłoszenia, data przetargu, dotyczy, cena wywoławcza, wynik Pozytywny/Negatywny, załączniki) and born-digital PDF/DOCX attachments. The resolved board carries a real achieved-price stream: ~16 of the last 30 resolved auctions are flats (e.g. ul. Mieszka I 88/5 → **115 000 zł** positive; Marcinkowskiego 28/7 → negatywny; Kursko 28a/1 cena wyw. 76 000 zł). Housing angle is present too: **MTBS** (Międzyrzeckie TBS) sells flats from its own stock at open auction on the same engine. Closest analog: **gorzow-wielkopolski** (identical engine — clone, swap ORIGIN + announcer id). No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats at OPEN auction.** The Burmistrz / Urząd Miejski runs `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` recurrently. Live evidence from the resolved-auctions board (`/przetargi/0/status/1/`):
- **Przetarg #262** — lokal mieszkalny nr 1, Kursko 28a (gmina Międzyrzecz), przetarg ustny nieograniczony, **cena wywoławcza 76 000 zł**, rozstrzygnięty; notice = inline HTML + born-digital **DOCX + PDF** ogłoszenie and separate wynik documents.
- **ul. Mieszka I 88/5** (klatka B) — flat, wynik **Pozytywny 115 000 zł**.
- **ul. Marcinkowskiego 28/7** — flat, wynik **Negatywny** (unsold → recycles as II/III przetarg).
- Resolved board page 1: **~16 flats : ~12 land : 1 dzierżawa** out of 30 shown; page 2 is all land — so flats and land interleave across pages.

Flat-sale supply is fed by standing wykazy: **Zarządzenie Nr 78/2026** and **Z-83/2025** "wykaz lokali mieszkalnych położonych na terenie m. Międzyrzecz przeznaczonych do sprzedaży" (posted on the Rynek 1 tablica + BIP). Current active board (`status/0/`) on spike day held land only (dz. 675/115 + 675/125, cena wyw. **877 230 zł**, przetarg 15.09.2026, #361) — flats cycle in and out, exactly the Zgorzelec/Gorzów pattern.

**Housing manager angle:** **MTBS** (Międzyrzeckie Towarzystwo Budownictwa Społecznego, ul. Krótka 2) sells flats from its stock at **I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego** — e.g. lokal nr 1, ul. Kazimierza Wielkiego 41, 38,68 m² (Przetarg nr 1/2023, rozstrzygnięty). Secondary, low-volume, same engine.

**Out of scope:** **ZGL** (Zakład Gospodarki Lokalowej, `bip.zgl.miedzyrzecz.pl`) publishes only **dzierżawa/wynajem** przetargi (garaże, lokale użytkowe, grunt) — no flat sales; do not build against ZGL.

## 2. Where published? (hosts + boards, URLs)
**Primary — City BIP (`bip.miedzyrzecz.pl`, Wrota Lubuskie eBIP; mirror `bip.wrota.lubuskie.pl/um_miedzyrzecz`):**
- Przetargi section landing: `https://bip.miedzyrzecz.pl/88/Przetargi_dot__nieruchomosci_i_ruchomosci/`
- Active (ogłoszone): `https://bip.miedzyrzecz.pl/przetargi/0/status/0/`
- Resolved (rozstrzygnięte): `https://bip.miedzyrzecz.pl/przetargi/0/status/1/` — paginated `…/przetargi/0/{page}/status/1/`
- Invalidated: `https://bip.miedzyrzecz.pl/przetargi/0/status/2/`
- Detail page pattern: `https://bip.miedzyrzecz.pl/przetargi/0/{seq}/{id}_/` (e.g. `…/0/267/262_/`)
- Wykazy / informacje (source of flat supply): `https://bip.miedzyrzecz.pl/89/Informacje_2C_ogloszenia/`
- (`0` = announcer/podmiot segment for Urząd Miejski; Gorzów uses `320` on the same engine.)

**Secondary — MTBS BIP (`bip.mtbs.miedzyrzecz.pl`, same engine):**
- Board: `https://bip.mtbs.miedzyrzecz.pl/przetargi/29/status/1/` (rozstrzygnięte) / `…/status/0/` (active). Also public copy at `mtbs.com.pl`.

Contact: Wydział Gospodarki Mieniem, UM Międzyrzecz, ul. Rynek 1, 66-300 Międzyrzecz, tel. **95 742 6947**.

## 3. Format + rendering
- **Server-rendered HTML**, no JS-SPA, no auth, no CAPTCHA. Confirmed live by fetching active board, resolved board (2 pages), and detail #262.
- **Structured `/przetargi/` engine**: list view is an HTML table with typed columns — *data ogłoszenia*, *data i godzina przetargu*, *dotyczy*, *cena wywoławcza*, *wynik* (Pozytywny/Negatywny), *załączniki*. Machine-friendly.
- **Ogłoszenie body**: inline HTML on the detail page + **born-digital PDF and/or DOCX** attachments (handle with `pdfText`/docx extract; OCR not needed).
- **Achieved price**: `cena osiągnięta` surfaces on the resolved detail page / wynik attachment (flat rows show it, e.g. 115 000 zł); the list view carries cena wywoławcza + Pozytywny/Negatywny flag.

## 4. Volume + achieved-price stream
- **Volume:** Modest-but-steady. Auction sequence numbering is in the **260–360+** range over ~2021→2026, i.e. roughly **20–25 property auctions/year** across flats + land, of which flats are a recurring, substantial share (~half of the recent resolved page). Enough to justify an adapter.
- **Achieved-price stream: YES.** Dedicated `status/1/` resolved board with Pozytywny/Negatywny outcome + achieved price on detail (Mieszka I 88/5 → 115 000 zł). `status/2/` captures unieważnione. Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog: `gorzow-wielkopolski`** (`pipeline/src/cities/gorzow-wielkopolski/`) — **identical engine**. Its `crawl.js` already hits `/przetargi/320/status/0|1/` with pagination `/przetargi/320/{page}/status/1/`. Building Międzyrzecz ≈ clone that adapter, change `ORIGIN` → `https://bip.miedzyrzecz.pl` and the announcer segment `320` → `0`; reuse the existing `parse.js` (same table schema + attachment handling).
- **CMS family:** Wrota Lubuskie eBIP (server-HTML, typed przetargi engine, born-digital PDF/DOCX). Same family as Gorzów.
- **Effort: LOW.** Crawl active+resolved boards, walk pagination, fetch detail, regex/DOM-parse typed fields (parseAddress + powierzchnia + cena wywoławcza + wynik/cena osiągnięta + round from "I/II/III przetarg"), classify flat vs land vs (drop) dzierżawa. Optionally add MTBS (`/przetargi/29/`) as a second announcer for extra flats.
- **Blockers:** None. No rate-limit/auth/JS signals. Only care-items: filter out ZGL-style dzierżawa/najem noise (city board is clean of it; ZGL is a separate host we skip) and interleaved land across pages.

**VERDICT: BUILD (Low effort)** — recurring open flat auctions (`przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`) with achieved prices on the exact eBIP engine our gorzow-wielkopolski adapter already parses; near-clone build, plus MTBS as a bonus flat source.
