# Spike — Sochaczew (Mazowieckie · powiat sochaczewski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miasto Sochaczew (Urząd Miejski, Burmistrz) **does** sell municipal **lokale mieszkalne** at *I/II ustny przetarg nieograniczony na sprzedaż* — a recurring, confirmed stream in 2025 (al. 600-lecia 23A/11, Grunwaldzka 8/20, Senatorska 16/9, Kościńskiego 13C/1 & 13B/1), alongside land. Announcements are published on the city BIP **`bip.sochaczew.pl`**, which runs the **2ClickPortal** CMS: server-rendered HTML article shells at `/aktualnosci/<slug>.html`, with the actual notice body carried as a **born-digital PDF attachment**. There is **no dedicated "sprzedaż nieruchomości / przetargi" board** — property auctions are mixed into the general `aktualnosci` firehose (env notices, elections, Starosta decisions, etc.), so classification is title-regex over a broad feed. `przetargi.html` points at the `ezamawiajacy.pl` procurement platform (services/goods — out of scope). Volume is modest (a handful of flat auctions/year); expired notices get removed (404), so the live window is a moving target. Housing manager (ZGK / ZISM) handles only *najem lokali użytkowych* (commercial rentals), not flat sales — flat sales are run by the Burmistrz directly. Closest analog: WordPress/custom-HTML article-list + PDF family (nowa-sol / brzeg / bochnia). No JS/auth/CAPTCHA blockers; effort is Medium chiefly because of the firehose feed + PDF-in-article + churn.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats (recurring).** The Wydział Mienia i Nadzoru Właścicielskiego (MNW) of Urząd Miejski w Sochaczewie prepares *wykazy* and runs *ustny przetarg nieograniczony na sprzedaż nieruchomości należących do zasobu Miasta*. Confirmed 2025 open-auction flat sales (Burmistrz Miasta Sochaczew ogłasza I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości lokalowej):
- **al. 600-lecia 23A/11** — lokal mieszkalny nr 11, pow. użytkowa **47,90 m²**, przetarg 14.02.2025 (sala konferencyjna, ul. 1 Maja 16).
- **ul. Grunwaldzka 8/20** — lokal mieszkalny nr 20, pow. użytkowa **32,70 m²** (uchwała XII/95/25 z 27.02.2025).
- **ul. Senatorska 16/9** — prawo własności nieruchomości lokalowej (flat).
- **ul. Kościńskiego 13C/1** — udział ½ w lokalu mieszkalnym nr 1 (parter), pow. **10,75 m²**, cena wywoławcza **27 000,00 zł**, przetarg 08.05.2025.
- **ul. Kościńskiego 13B/1** — udział ½ w lokalu mieszkalnym.
- Land also in the mix (e.g. nr 1386/6 i 1386/7 przy ul. Kątowej; działki al. 600-lecia 3021/3, Batorego 2884/2).

So this is a genuine open **flat-sale** auction stream, not flats-only-*bezprzetargowo-na-rzecz-najemcy*. (The MNW department does also grant *bonifikaty* on tenant sales, but the przetarg-ustny flat sales above are real and recurring.)

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (2ClickPortal CMS):** `https://bip.sochaczew.pl`
- Aktualności feed (the real channel — property auctions land here, paginated): `https://bip.sochaczew.pl/aktualnosci/`
- Article URL pattern: `https://bip.sochaczew.pl/aktualnosci/<slug>.html` (e.g. `.../burmistrz-miasta-sochaczewa-oglasza-i-przetarg-ustny-nieograniczony-na-sprzedaz-prawa-wlasnosci-nieruchomosci-lokalowej-przy-al-600-lecia-23a11.html`).
- Responsible unit: `https://bip.sochaczew.pl/wydzial-mienia-i-nadzoru-wlascicielskiego.html` (MNW; grunty@sochaczew.pl, tel. 46 862-27-30). It describes wykaz + przetarg duties but **links no dedicated board**.
- `https://bip.sochaczew.pl/przetargi.html` → redirects to `https://sochaczew.ezamawiajacy.pl/` (public procurement — **not** property sales; ignore).
- Public mirror (city site, WebFetch-friendly, mirrors the same notices): `https://sochaczew.pl/aktualnosci/<slug>.html` (e.g. `miejskie-nieruchomosci-na-sprzedaz.html`, `do-kupienia-dwa-mieszkania.html`, `przetarg-mieszkanie-przy-ul-koscinskiego.html`).

**No dedicated "sprzedaż nieruchomości" / results board exists** — announcements AND `informacja o wyniku przetargu` results both flow through `aktualnosci`.

**Do NOT confuse** with separate JSTs:
- Rural **Gmina Sochaczew** (Urząd Gminy) — `bip.sochaczew.org.pl` / `sochaczew.bip.org.pl` — out of scope.
- **Starostwo Powiatowe w Sochaczewie** (county) — `bip.powiatsochaczew.pl` / `sochaczew-powiat.bip.org.pl` (board id 15868) — out of scope.
- Housing/utilities: **ZGK Sochaczew** `zgk.sochaczew.pl` and **ZISM** `bip-zism.sochaczew.pl` publish only *najem lokali użytkowych* (commercial rentals), not flat sales.

## 3. Format + rendering
- **Server-rendered HTML** — 2ClickPortal (`2ClickPortal® – Portale nowej generacji`, per footer). No JS-SPA, no auth, no CAPTCHA observed. Aktualności is a dated article list with numbered pagination (`1 [2] [3] [4] …`).
- **Notice body = born-digital PDF attachment.** The HTML article shows title + date + metadata; the substantive announcement text (price, area, wadium, date, terms) is inside an attached PDF (confirmed live: the Starosta compensation article carries `Ogłoszenie ....pdf` and the visible page is metadata only). → extract with `pdfText` (pdftotext); OCR unlikely needed (born-digital).
- **Churn:** expired auction articles are **removed** — several 2025 flat-auction `bip.sochaczew.pl/.../<slug>.html` URLs now 404. Live crawl captures the current window; deeper backfill is limited to what is still posted / search-indexed.

## 4. Volume + achieved-price stream
- **Volume:** Modest — on the order of a handful of municipal flat auctions per year (2025 confirmed ~5 flat notices + several land), interleaved with land in the same feed. Some run as ½-share sales and as II przetarg (repeats when unsold).
- **Achieved-price stream:** YES in principle — the city publishes `informacja o wyniku przetargu` (cena osiągnięta / nabywca, or wynik negatywny) as `aktualnosci` articles too (result publication confirmed on the BIP; a powiat example showed cena wywoławcza 3 302 200 → osiągnięta 8 390 000). Same firehose-filter + PDF approach as announcements; no separate results board.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **WordPress / custom-HTML article-list + PDF** family — `nowa-sol` / `brzeg` / `bochnia` pattern (dated article list → article → born-digital PDF → `pdfText`). 2ClickPortal `/aktualnosci/<slug>.html` behaves like that shape.
- **CMS family:** 2ClickPortal (server-rendered HTML; treat as WordPress/custom-HTML per ADAPTER-GUIDE §3).
- **Effort:** **MEDIUM.** Flow: crawl `aktualnosci` (paginate, bounded page-cap + wall-clock) → **classify by title regex** (`przetarg ustny nieograniczony … na sprzedaż … lokal(u mieszkalnego)?|nieruchomości lokalowej` for announcements; `informacja o wyniku przetargu` for results) to pull flats out of the mixed firehose → fetch article → resolve PDF attachment → `pdfText` → parse `powierzchnia użytkowa`, `cena wywoławcza`, `wadium`, date, round, `parseAddress`. Drop land/dzierżawa/najem/ezamawiajacy/env/election noise. The `sochaczew.pl` public mirror is a WebFetch-friendly fallback for aged notices.
- **Blockers:** None hard. Watch-items: (1) no dedicated board → classification runs over a broad feed (title-regex + drop-list needed); (2) notice bodies are PDF, not inline HTML; (3) expired-article 404 churn caps backfill; (4) modest volume. All standard, none technical.

**VERDICT: BUILD (Medium effort)** — recurring open *ustny przetarg nieograniczony* flat sales by the Burmistrz on a clean 2ClickPortal server-HTML BIP (`bip.sochaczew.pl/aktualnosci/`) with born-digital PDF notices and a same-channel results stream; Medium (not Low) only because there is no dedicated property board (classify a mixed feed) and content sits in PDF attachments with expired-article churn.
