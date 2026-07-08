# Spike — Sokółka (Podlaskie · powiat sokólski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (near-zero open flat auctions; land/commercial-dominated board).

## TL;DR
Gmina Sokółka (miejsko-wiejska, town is the seat, ~18k) runs a **real, recurring** property-sale board via *przetarg ustny nieograniczony/ograniczony na sprzedaż nieruchomości* on the city BIP. The stream is clean, scrapeable **server-rendered HTML** on the **Wrota Podlasia / podlaskie.eu** BIP family (`bip-umsokolka.podlaskie.eu`, legacy mirror `bip.um.sokolka.wrotapodlasia.pl`), with each notice as an `.html` page plus born-digital PDF attachments — and a colocated `…-wynik.pdf` giving the achieved price. **BUT the board is dominated by land** (nieruchomości gruntowe zabudowane/niezabudowane), with occasional **lokale użytkowe** (commercial) and **udziały w budynku mieszkalnym** (residential co-ownership shares). Across 2024–2025 **zero standalone lokale mieszkalne (flat) auctions** appeared. The housing manager **ZGKiM** (Zakład Gospodarki Komunalnej i Mieszkaniowej) handles *najem* (rental), not flat sales at auction — municipal flats here go *bezprzetargowo na rzecz najemcy*. Per the project's flat-focused criterion this is **NO-BUILD**; the source is technically trivial (Low) if scope ever broadens to land/commercial.

## 1. Sells municipal property at auction?
**YES for land/commercial — NO for flats.** Burmistrz Sokółki runs `przetarg ustny nieograniczony` and `ustny ograniczony` (to adjacent owners) for sale of Gmina property. Confirmed notice mix on the live board:
- **2025:** GR.K.6840.15/22/24.2025 — nieruchomości gruntowe (undeveloped + developed land); GR.K.6840.19/20.2025 — **lokale użytkowe** (commercial premises); GR.K.6840.18.2025 — **udział 17565/31539 w prawie własności nieruchomości zabudowanej budynkiem mieszkalnym**, Osiedle Buchwałowo 15 (a residential CO-OWNERSHIP SHARE, `przetarg ustny nieograniczony`) — not a standalone flat; GR.K.6845.* — dzierżawa (lease).
- **2024:** GR.K.6840.3/12/14/21/32/33.2024 — all land (gruntowa zabudowana/niezabudowana) across obręby Sokółka/Nomiki/Orłowicze/Kurowszczyzna; GR.K.6845.15.2024 — lease. **No lokal mieszkalny.**

No `sprzedaż lokalu mieszkalnego` (standalone flat) auction found in 2024, 2025, or via targeted archive search. Small-gmina pattern: flats sold *bezprzetargowo na rzecz najemcy*; open auctions are for land + commercial + occasional building shares.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Wrota Podlasia / podlaskie.eu CMS):**
- Przetargi/zamówienia root: `https://bip-umsokolka.podlaskie.eu/przet_zam/`
- **Property-sale board** ("Przetargi", `47cac52c6f2e811`): `https://bip-umsokolka.podlaskie.eu/przet_zam/47cac52c6f2e811/`
- Year subfolders: `…/47cac52c6f2e811/2025/`, `…/2024/`, `…/2023_1/`, back to 2008. Full list of years exposed on the board index.
- Notice URL shape: `…/47cac52c6f2e811/<year>/grk6840NN20YYjs.html` (one `.html` per notice), e.g. `…/2025/grk6840182025js.html`.
- Attachments: born-digital PDFs named after the sygnatura, e.g. `GR-K-6840-18-2025-JS.pdf` (notice) and **`GR-K-6840-18-2025-JS-wynik.pdf`** (result / achieved price) — colocated on the notice page.
- **Legacy mirror** (older notices, still indexed): `http://bip.um.sokolka.wrotapodlasia.pl/przet_zam/47cac52c6f2e811/<year>/…html` and `https://bip-umsokolka.wrotapodlasia.pl/…` — identical path structure; `podlaskie.eu` is the current authoritative host.

**Secondary (human portal, not the source of truth):** `https://sokolka.pl/info/przetargi-i-zamowienia/` — WordPress news feed ("Informacja o przetargach na sprzedaż nieruchomości…", e.g. `sokolka.pl/2023/12/19/…`) pointing back to the BIP. Regional aggregator `isokolka.eu/komunikaty-przetargi/` mirrors some notices.

Contact: Urząd Miejski, Plac Kościuszki 1, Sokółka; tel. 85 711 09 03.

## 3. Format + rendering
- **Server-rendered HTML** — Wrota Podlasia / podlaskie.eu hosted BIP. Board index and each notice are plain server HTML (no JS gate, no SPA, no CAPTCHA, no auth). Confirmed live via fetch of `/przet_zam/`, the board, and the 2024/2025 year folders and an individual notice.
- Notice body: short inline HTML summary + **born-digital PDF attachments** (the full ogłoszenie and the `…-wynik.pdf` result) — handle with `pdfText` (pdftotext); OCR unlikely (born-digital).
- Legacy `wrotapodlasia.pl` mirror shares the exact URL structure; watch for HTTP-vs-HTTPS / cert quirks on the old host (use browser UA if the bot UA is gated).

## 4. Volume + achieved-price stream
- **Volume:** Modest overall (~6–10 sale notices/year on the board), but **flats = ~0/year**. Composition is land-heavy, with a couple of lokale użytkowe and the occasional residential-building co-ownership share. There is no dedicated flat-sale stream to scrape.
- **Achieved-price stream:** **YES** — colocated `…-wynik.pdf` (`informacja o wyniku przetargu`) on each notice carries cena osiągnięta / nabywca (or wynik negatywny). Cleanly parseable if the board is ever built. (Relevant only for land/commercial here.)

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land/commercial):** a Wrota Podlasia / podlaskie.eu `.html`-per-notice board with year subfolders + born-digital PDF attachments — WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms (list board → `.html` notice → `pdfText` on the notice + `-wynik.pdf`). Technically **Low** effort; no auth/rate-limit/SPA blockers.
- **Scope blocker (decisive):** the project targets **open flat-sale auctions**. Sokółka publishes **near-zero** lokale-mieszkalne auctions; flats go *bezprzetargowo na rzecz najemcy*, and ZGKiM only runs *najem* (rentals). The recurring open-auction stream is land + commercial + building shares, not flats.

**VERDICT: NO-BUILD** — clean, scrapeable Wrota Podlasia/podlaskie.eu server-HTML board with colocated achieved-price PDFs, but **no recurring open flat-sale auctions** (2024–2025 = 0 lokale mieszkalne; flats sold bezprzetargowo to tenants). Revisit only if scope broadens to land/commercial, where it becomes a Low-effort build.
