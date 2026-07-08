# Spike — Lubartów (Lubelskie · powiat lubartowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miasto Lubartów (Urząd Miasta, ul. Jana Pawła II 12) publishes property notices on the city BIP `umlubartow.bip.lubelskie.pl` — a **bip.lubelskie.pl / Wrota Lubelszczyzny** multi-tenant regional BIP. Technically this is the *best-rendered* source I've seen (a clean DataTables server-side JSON endpoint, `?id=NN&action=list-ajax`, returning `aaData[].tresc`). But the substance is a hard NO-BUILD: across **169 przetarg records spanning 2012→2025** on the auctions board (id=96), there are **ZERO open auctions for a lokal mieszkalny**. Open auctions are land only (117 działka/grunt/niezabudowana) plus garage/commercial **najem** (lease). Every flat disposal — 89 records on the sale board (id=99) — is a *wykaz* for **sprzedaż w drodze bezprzetargowej na rzecz najemcy** (sale to the sitting tenant, no auction). That is exactly the NO-BUILD residential profile. The only open flat auctions in town come from the **Spółdzielnia Mieszkaniowa** (`smlubartow.pl`), a housing co-op — not the gmina, out of scope.

## 1. Sells municipal property at auction?
**Land: YES. Flats at open auction: NO.** The Burmistrz Miasta Lubartów runs `przetarg ustny nieograniczony` (and occasionally `ustny ograniczony`) — but exclusively for **nieruchomości gruntowe niezabudowane** (undeveloped land plots) and for **najem** of garages/commercial boxes. Counting the auctions board (id=96, 169 items, 2012-04→2025-11):
- **lokal mieszkalny at auction: 0**
- działka / grunt / niezabudowana: 117
- dzierżawa / najem (incl. all 8 "lokal użytkowy" items, which are garage/hall **lease** auctions e.g. ul. Wieniawskiego 22 garaż): 30
- informacja o wyniku przetargu (results, all land): 26

The flat stream is entirely **bezprzetargowe** and lives on the sale board (id=99): of 198 records, 89 name a lokal mieszkalny and **every one** is "przeznaczonej do sprzedaży w drodze bezprzetargowej **na rzecz najemcy** / głównego najemcy" (127 of 198 are bezprzetargowo overall). Recent examples: lokal nr 5 ul. Słowackiego 16 (2025-12-05), lokal nr 8 ul. Kościuszki 28C (2025-07-15) — both tenant sales, no bidding, no hammer price. There is no open flat-auction stream to scrape.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.lubelskie.pl platform):**
- Parent section "Nieruchomości - Ogłoszenia i Przetargi": `https://umlubartow.bip.lubelskie.pl/index.php?id=54`
- **Przetargi** (auctions board — land + lease only): `https://umlubartow.bip.lubelskie.pl/index.php?id=96`
- **Sprzedaż - zawiadomienia, wykazy** (flats live here, all tenant sales): `https://umlubartow.bip.lubelskie.pl/index.php?id=99`
- Najem `?id=97` · Dzierżawa `?id=98` · Zakup `?id=100` · Scalenia/podziały `?id=273`
- JSON list endpoint (per board): `https://umlubartow.bip.lubelskie.pl/index.php?id=96&action=list-ajax` → `{aaData:[{id_dokumentu, data_utworzenia, tresc, ...}]}`
- Detail page: `https://umlubartow.bip.lubelskie.pl/index.php?action=details&document_id=NNNNNNN&id=96` (e.g. document_id 2231105 = land-auction result, 2025-11-07).

**Do NOT confuse** with `uglubartow.bip.lubelskie.pl` — that is the rural **Gmina Lubartów** (gmina wiejska, separate JST). Our target is the town Gmina Miasto Lubartów at `umlubartow…`.

**Out of scope but noted:** `smlubartow.pl/przetargi/mieszkania/` — Spółdzielnia Mieszkaniowa (housing cooperative) runs genuine `przetarg ustny nieograniczony` for co-op flats (e.g. lok. 16, ul. 3-go Maja 24, 48.98 m²). Not municipal property; not the gmina.

## 3. Format + rendering
- **Server-rendered HTML shell + DataTables server-side JSON-API.** The board pages render an empty table; rows are fetched from `?id=NN&action=list-ajax` returning clean UTF-8 JSON (`iTotalRecords`, `aaData[].tresc` = full title, `.data_utworzenia` = date, `.id_dokumentu`). Excellent machine-readability — no OCR, no JS SPA gate, no auth, no CAPTCHA.
- Full notice bodies at `?action=details&document_id=…`; longer ogłoszenia may attach a born-digital PDF (pdfText, OCR unlikely).
- Technically this would be a *Low*-effort adapter — the blocker is purely that there is nothing worth extracting.

## 4. Volume + achieved-price stream
- **Open flat auctions: 0 in 14 years of records.** Open-auction volume is ~a handful of **land** plots/year (~11 przetarg items dated 2024-2026) plus rare garage lease auctions.
- **Achieved-price stream:** a results feed exists (26 "informacja o wyniku przetargu" on id=96) BUT it reports **land** hammer prices only — no flat results, because no flats are auctioned.
- Flat prices are set administratively (rzeczoznawca operat) in tenant wykaz notices, never bid up — no market/hammer signal.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (CMS):** bip.lubelskie.pl / Wrota Lubelszczyzny multi-tenant regional BIP — same family as other Lubelskie powiat seats already spiked NO-BUILD (generic voivodeship BIP, tenant-sale + land-skewed). The clean `action=list-ajax` JSON is a plus but not in the standard analog roster.
- **Effort if built:** technically Low (JSON list + detail fetch, regex on `tresc`), but N/A — **content blocker**, not a technical one.
- **Blocker:** zero open flat-sale auctions. Residential disposal is 100% *bezprzetargowo na rzecz najemcy*; the only open auctions are land and garage lease. This is precisely the NO-BUILD pattern in the heuristic ("the ONLY residential disposal is bezprzetargowo na rzecz najemcy … or a wykaz list with no real auctions"). The genuine flat auctions belong to the Spółdzielnia Mieszkaniowa, which is out of scope.

**VERDICT: NO-BUILD** — Gmina Miasto Lubartów auctions only land (+garage lease) on a clean bip.lubelskie.pl JSON board; all 89 municipal flat disposals are tenant bezprzetargowo wykaz notices with no bidding and no hammer price. No open flat-auction stream = nothing to build.
