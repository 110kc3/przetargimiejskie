# Spike — Strzelce Opolskie (Opolskie · powiat strzelecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort). **Built + registered 2026-07-12** (16/16 parse test). Analog brzeg/nowa-sol (inline-HTML + born-digital PDF), structurally wolow (single MIXED flats+land board, body-driven classifyKind). GZMK/fast4net gzmk.pl server-HTML board 'Przetargi na sprzedaż nieruchomości,14' — inline HTML announcements + PDF + inline ZAWIADOMIENIE results; source:'html', plain getText (no render).

## TL;DR
Gmina Strzelce Opolskie (miejsko-wiejska, town = seat) runs a **dedicated municipal property manager — GZMK (Gminny Zarząd Mienia Komunalnego)** — which sells municipal property, **including lokale mieszkalne**, via *ustny przetarg nieograniczony na sprzedaż*. GZMK has its own BIP at **`gzmk.pl`** (bespoke server-rendered HTML CMS, "design by fast4net", parameter-path URLs `<slug>,14,<id>`). A single board **"Przetargi na sprzedaż nieruchomości"** (board id `14`) carries flats + land + buildings, born-digital HTML in the page body plus a PDF attachment per notice. **Results are inline**: resolved notices carry the outcome (`zakończył się wynikiem negatywnym` / cena osiągnięta) in the same body — no separate results board to crawl. Flat volume is **LOW** (confirmed lokal-mieszkalny: Krakowska 13/6, I + II ustny 2023, both negative; the live 2026 board is all land/buildings), but flat auctions recur on the same board and land is also in-scope for the wider dataset. Closest analog: WordPress/custom-HTML family (brzeg / nowa-sól) — inline HTML + PDF, single mixed board with inline results. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Sales of gmina property run as `ustny przetarg nieograniczony na sprzedaż`. The seller of record on flat notices is the **Burmistrz Strzelec Opolskich**, administered by **GZMK (Gminny Zarząd Mienia Komunalnego, ul. Zamkowa 2, 47-100 Strzelce Opolskie; info@gzmk.eu)** — a dedicated municipal property/housing manager (the ZGM-equivalent). This satisfies the BUILD heuristic (dedicated housing manager publishing open oral flat-sale auctions).

Confirmed **lokal mieszkalny** auction (open oral, unrestricted):
- **ul. Krakowska 13/6** — *I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego* (lokal nr 6, pow. użytkowa 46,42 m² + piwnica 5,10 m², cena wywoławcza 180 000,00 zł, wadium 18 000,00 zł, auction 12.07.2023). Went to **II ustny przetarg** (18.09.2023) — both rounds `zakończyły się wynikiem negatywnym` (no wadium paid).

Live 2026 board (`board 14`) at spike time carried **9 notices, all land/buildings/qualification lists** — e.g. *I ustny przetarg … na sprzedaż działki budowlanej* (12.08.2026), *… nieruchomości zabudowanej* (former przedszkole, 29.07.2026), several działki (rozstrzygnięte). So flat auctions cycle in and out rather than being permanently open; the board mix is flats + land + zabudowane. Both natural and legal persons may bid; 10% wadium.

Out of scope (not municipal): **Spółdzielnia Mieszkaniowa w Strzelcach Opolskich** (`smstrzelce.pl`) also auctions flats — cooperative, not gmina property.

## 2. Where published? (hosts + boards, URLs)
**Primary — GZMK BIP (`gzmk.pl`, bespoke fast4net CMS):**
- Sale board (flats + land + buildings): `https://gzmk.pl/bw/Przetargi_na_sprzedaz_nieruchomosci,14`
- Category index (all tender/konkurs boards): `https://gzmk.pl/bw/Ogloszenia_o_przetargach_i_konkursach,30`
- Individual notice pattern: `https://gzmk.pl/pl/<Slug_With_Underscores>,14,<id>` — e.g. `.../I_ustny_przetarg_nieograniczony_na_sprzedaz_lokalu_mieszkalnego_nr_6_polozonego_w_budynku_przy_ul_Krakowskiej_13_w_Strzelcach_Opolskich_,14,900` (I ustny) and `...,14,911` (II ustny).
- Each notice attaches a **born-digital PDF** (~110–115 KB) mirroring the HTML body.
- Home redirects `https://gzmk.pl` → `http://gzmk.pl/pl/index.php` (mixed http/https — fetch over the form that answers; retry http if https stalls).

**Secondary — city BIP (Urząd Miejski):** `https://bip.strzelceopolskie.pl/przetargi/index.html`, incl. `.../przetargi/Przetargi_na_sprzedaz_nieruchomosci.html` and `.../Dotyczace_sprzedazy_nieruchomosci.html`. This is the Urząd Miejski board; the operative flat-sale auctions are administered and published by **GZMK** — build against `gzmk.pl`, not the city BIP.

## 3. Format + rendering
- **Server-rendered HTML** (bespoke CMS, "design by fast4net"; parameter-path URLs, breadcrumb nav, high-contrast variant). **No SPA, no auth, no CAPTCHA** — confirmed by live fetch of board + notice pages returning full body text.
- Full ogłoszenie text is **inline HTML in the page body** (address, powierzchnia użytkowa, cena wywoławcza, wadium, date, round all present). Each notice also carries **one born-digital PDF** attachment — parse HTML body first; use `pdfText` on the PDF only as fallback (OCR unlikely).
- No JS gate observed. Board list pages are plain dated HTML link lists.

## 4. Volume + achieved-price stream
- **Volume: LOW.** A handful of property auctions per year across the single mixed board; **flats are a minority** (confirmed: Krakowska 13/6 in 2023; no flat on the live 2026 board). Expect ~0–2 open flat auctions/year, some recurring as II/III przetarg when unsold. Land + zabudowane make up the bulk (in-scope for the wider dataset).
- **Achieved-price stream: YES, INLINE.** No separate rozstrzygnięcia board — resolved notices are flagged `(rozstrzygnięty)` on the board and the outcome (`cena osiągnięta` / `zakończył się wynikiem negatywnym` / `nie wpłacono wadium`) is written into the **same notice body**. Announcement carries `cena wywoławcza`; the concluded version of the same page carries the result. Both parseable from server HTML. (Re-crawl the notice to pick up the appended result.)

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress/custom-HTML family — **brzeg** / **nowa-sól** pattern (inline HTML article + PDF attachment, single mixed sale board). Not a known BIP platform (bespoke fast4net), so no drop-in clone; write a thin fresh crawl/parse against the one board.
- **CMS family:** Bespoke server-rendered HTML (ADAPTER-GUIDE §3 "WordPress / custom HTML" bucket — plain HTML articles + PDF).
- **Effort: LOW–MEDIUM.** Single board (`,14`) → article fetch → parse inline HTML (address via `parseAddress`, `powierzchnia użytkowa`, `cena wywoławcza`, `wadium`, date, round I/II/III), `classifyKind` to split lokal mieszkalny vs działka/zabudowana. Result is on the same page (no second board) — detect `wynikiem negatywnym` / `cena osiągnięta` and route to results. Low list volume → no heavy pagination/backfill budget needed.
- **Blockers:** None. No rate-limit/auth/CAPTCHA. Watch-items: (a) mixed http/https home redirect — target the `,14` board URL directly; (b) low flat frequency — the value is mostly land/zabudowane plus occasional flats; (c) results are appended inline, so incremental re-crawl of unresolved notices is needed to capture achieved price.

**VERDICT: BUILD (Low–Medium effort)** — dedicated municipal manager (GZMK) publishing open oral flat-sale auctions on a clean bespoke server-HTML board with inline results and per-notice born-digital PDFs; single-board custom-HTML analog (brzeg/nowa-sól), no technical blockers. Flat volume is low but recurring and the mixed board's land/buildings are in-scope for the wider dataset.
