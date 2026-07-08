# Spike — Pruszcz Gdański (Pomorskie · powiat gdański)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Pruszcz Gdański (Urząd Miasta, Burmistrz, ul. Grunwaldzka 20 — the TOWN, powiat seat) runs municipal-property auctions on a clean **Logonet eUrząd** BIP (`bip.pruszcz-gdanski.pl`, "Wersja systemu: 2.9.0"), with a dedicated structured board `/przetargi-nieruchomosci/510` and even a per-auction XML export. Technically this is one of the nicest CMS shapes we've seen (server-HTML + born-digital XML with a `<rozstrzygniecie>` result field). **But the disposal model is wrong for us:** every OPEN auction (`przetarg ustny nieograniczony`) is **land** (nieruchomość niezabudowana / zabudowana). The town's **lokale mieszkalne are sold bezprzetargowo na rzecz najemcy** (sitting tenants) — not at auction. Open flat-auction volume ≈ **0**. No ZGM/ZBM housing manager. The "flat" auctions that surface in aggregators (Rusocin, Tralewo) belong to the **rural Gmina Pruszcz Gdański** (Wójt, siedziba Juszkowo) — a different JST, out of scope. NO-BUILD.

## 1. Sells municipal property at auction?
**YES for LAND, NO for flats.** The Burmistrz runs `ustny przetarg nieograniczony na sprzedaż nieruchomości` — but the entire live board is undeveloped/developed **land**:
- `II ustny przetarg nieograniczony na sprzedaż nieruchomości niezabudowanych` — ul. Zastawna / NSZZ Solidarność (28.04.2026, cena wyw. 2 132 300 zł netto).
- `II ustny przetarg... nieruchomości niezabudowanej` (id 14166); `ustny przetarg... niezabudowanej i zabudowanej` (id 14167); `III ustny przetarg... niezabudowanej` (id 14224).
- Board categories exist for `lokal mieszkalny` / `lokal użytkowy` (filter `kind_id=3/4`) but are **unused** — no flat auction found on the board, in the site search, or in a site-scoped web search.

**Flats go to sitting tenants, no auction.** The residential disposal channel is the *wykaz na rzecz najemcy*: "Sprzedaż komunalnych lokali mieszkalnych i budynków jednorodzinnych na rzecz ich najemców" (sprawa 10642), "Wykaz budynków mieszkalnych przeznaczonych do sprzedaży na rzecz najemców lokali mieszkalnych" (art 509/11857), "Wykaz nieruchomości wytypowanej do sprzedaży na rzecz najemcy" (art 509/13433, e.g. ul. Grunwaldzka 46, 60,21 m²). This is the classic **bezprzetargowo na rzecz najemcy** NO-BUILD signal.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (Logonet eUrząd):**
- Auctions board: `https://bip.pruszcz-gdanski.pl/przetargi-nieruchomosci/510` (pagination `/510/<n>`)
- Auction detail: `https://bip.pruszcz-gdanski.pl/przetarg-nieruchomosci/<id>/<slug>` (e.g. `/14224/iii-ustny-przetarg...`)
- Per-auction XML export: `https://bip.pruszcz-gdanski.pl/przetarg-nieruchomosci/xml/<id>/<page>`
- Sale-designation wykazy: `https://bip.pruszcz-gdanski.pl/artykuly/509/wykazy-nieruchomosci-do-sprzedazy` (docs `/artykul/509/<id>/<slug>`)
- General articles: `/artykuly/<board>/<slug>`, `/artykul/<board>/<id>/<slug>`
- Contact: Urząd Miasta Pruszcza Gdańskiego, ul. Grunwaldzka 20, tel. 58 775 99 55.

**Do NOT confuse** with `bip.pruszcz.pl/wiadomosci/...` (IDcom) — that is the **rural Gmina Pruszcz Gdański** (Wójt, Juszkowo, ul. Zakątek 1), a separate JST that DOES auction flats (Rusocin ul. Gdańska 11/4, etc.). Our target is the TOWN (Gmina Miejska).

## 3. Format + rendering
- **Server-rendered HTML** — Logonet eUrząd v2.9.0. No JS gate, no auth, no CAPTCHA (confirmed via `curl` — full content in raw HTML). SSL chain is incomplete (needs `curl -k` / relaxed verification; WebFetch fails cert check).
- **Structured listing rows:** each auction renders labelled fields — *Adres nieruchomości, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu* — trivial to parse.
- **Born-digital XML export** per auction: tags `<adres-nieruchomosci>`, `<przetarg-na>`, `<typ-przetargu>`, `<rodzaj-nieruchomosci>`, `<cena-wywolawcza>`, `<data-przetargu>`, `<rozstrzygniecie>`, `<tresc>` (full HTML body), `<zalaczniki>` (PDF attachments), `<metryczka>`. Cleanest possible surface.
- **No OCR needed.** Attachments are born-digital PDFs; core data is in HTML/XML.

## 4. Volume + achieved-price stream
- **Open FLAT-auction volume: ~0.** Live board = 4 auctions, 100% land. Historical site + web search surfaces zero town flat auctions; flats exit via tenant wykazy only.
- **Land-auction volume:** low-modest — a handful/year (niezabudowana/zabudowana, some as II/III przetarg when unsold).
- **Achieved-price stream EXISTS but covers land, not flats:** board status filter has `Rozstrzygnięte`, and the XML `<rozstrzygniecie>` field carries the result. So the infrastructure for hammer prices is there — just not for flats, which never go to auction here.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (were it BUILD):** **Logonet eUrząd** family — chełmno / golub-dobrzyń / tarnowskie-góry / kędzierzyn-koźle / skarżysko-kamienna. Same `/przetarg-nieruchomosci/<id>` + `/api`/XML shape; a flat-selling Logonet town would be **LOW** effort here.
- **Why NO-BUILD:** the flat thesis fails on data, not tech. The town auctions land only; its lokale mieszkalne are disposed **bezprzetargowo na rzecz najemcy** (no open auction, no hammer price). No municipal housing manager (ZGM/ZBM/TBS) driving a recurring flat-auction stream. Per the heuristic ("only residential disposal is sitting-tenant / land-only auctions = NO-BUILD"), this is a clear NO-BUILD.
- **Blockers:** none technical (incomplete SSL chain is the only quirk). The blocker is the absence of the target signal — open flat auctions.
- **Note:** if the wider dataset ever ingests **land** auctions, this BIP is an excellent, low-cost Logonet source with XML + a results field. For the flat/lokal-mieszkalny mandate, skip.

**VERDICT: NO-BUILD** — Gmina Miejska Pruszcz Gdański auctions only land on a clean Logonet eUrząd BIP; lokale mieszkalne are sold bezprzetargowo na rzecz najemcy (sitting tenants), so open flat-auction volume is ~0 and there is no flat hammer-price stream. (Flat auctions in aggregators belong to the separate rural Gmina Pruszcz Gdański, out of scope.)
