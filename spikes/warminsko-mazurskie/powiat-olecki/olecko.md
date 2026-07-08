# Spike — Olecko (Warmińsko-Mazurskie · powiat olecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (land-dominated generic city BIP; ~0 recurring open flat auctions).

## TL;DR
Gmina Olecko (Urząd Miejski, gmina miejsko-wiejska seat) does dispose of municipal property by `przetarg ustny nieograniczony`, and it publishes both announcements **and** results (`Informacja o wyniku przetargu`, with hammer prices) on a clean, self-hosted server-HTML BIP `bip.olecko.pl`. Technically this is an easy target. **But the flat signal is thin.** The consolidated "Sprzedaż nieruchomości" board (184 items over years) is overwhelmingly **land / building plots** (`nieruchomość gruntowa`, `zabudowa mieszkaniowa jednorodzinna`, geodezyjne działki). Genuine **open residential-flat** auctions (`lokal mieszkalny`, nieograniczony) are near-zero recurring: the handful that exist — Kolejowa 11 m 5, Ślepie — are **IV (fourth) re-attempts of the same unsold unit**, and most other `lokal` items are `przetarg ograniczony` (restricted to co-owners of the building) or `lokal użytkowy` (commercial). No housing manager (no ZGM/ZBM/MZBM/TBS) — flats are sold directly by UM room 21. Per the flat-auction mandate this is a NO-BUILD. (If land/building-plot auctions are ever pulled into scope, Olecko becomes a clean Medium BUILD — the results stream is genuinely useful.)

## 1. Sells municipal property at auction?
**YES for property in general; effectively NO for open flats.** The Burmistrz Olecka runs `przetarg ustny nieograniczony` (and, for shared buildings, `ograniczony`) plus `rokowania`. Confirmed **open flat** notices:
- **ul. Kolejowa 11 m 5** — *IV* przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego (pow. użytk. 78,40 m², cena wyw. 30 000 zł, wadium 3 000 zł, przetarg 11.06.2024). Fourth attempt ⇒ chronically unsold, not fresh throughput.
- **Ślepie (gm. Olecko)** — IV przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 (48,40 m²) + budynek gospodarczy. Also a 4th attempt.

Nearly everything else on the sale board is land: `nieruchomość gruntowa pod zabudowę mieszkaniową jednorodzinną`, niezabudowane działki (Kuków, Babki Gąseckie, Olszewo), city plots. The few remaining `lokal` items are **restricted, not open** — e.g. **Młynowa 2, lokale nr 6 i 7** = `przetarg ustny ograniczony` (only co-owners of the building may bid) — or **commercial** `lokal użytkowy` (Grunwaldzka 6 lok. 1-u). This is the classic land-skewed generic city BIP the heuristic flags.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (self-hosted, modern responsive):** `bip.olecko.pl`
- Consolidated sale board (announcements **+** results in one list): `https://bip.olecko.pl/1539/253/sprzedaz-nieruchomosci.html` (184 wyników, pagination `?Page=1..16`)
- Wykazy nieruchomości: `https://bip.olecko.pl/1541/256/wykazy-nieruchomosci.html`
- Dzierżawa: `https://bip.olecko.pl/1540/254/dzierzawa.html` · Najem: `https://bip.olecko.pl/1624/264/najem.html`
- "Przetargi" (procurement/movables board — fire trucks etc., NOT property): `https://bip.olecko.pl/4059/382/przetargi.html`
- Example flat notice: `https://bip.olecko.pl/4341/ogloszenie-o-czwartym-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-kolejowa-11-m-5-w-olecku.html`
- Doc URL shape: `/{iddok}/{idcat}/{slug}.html`; attachments served under `bip.olecko.pl`.

**Legacy archive:** `https://www.umolecko.bip.doc.pl/` (old bip.doc.pl-hosted BIP, linked as "Archiwum BIP" — older notices only).
Contact for property: UM Olecko, Plac Wolności 3, 19-400 Olecko, pokój 21, tel. 87 520 26 33.
(Do NOT confuse with `bip.powiat.olecko.pl` = Starostwo, or `bip.kowaleoleckie.eu` = separate Gmina Kowale Oleckie.)

## 3. Format + rendering
- **Server-rendered HTML** — modern self-hosted Bootstrap/Laravel-style BIP (`nav-link`/`collapse` menus, `bip-footer`, `csrf-token` meta, `?Page=N` pagination). No JS gate, no SPA, no auth, no CAPTCHA. Confirmed live via fetch + curl.
- Full notice text is **inline HTML** on the doc page; each notice also carries a **born-digital DOC/PDF** attachment (e.g. "Kolejowa 11 m 5 - IV przet (DOC | 53,5 KB)"). Editable-office/text formats, not scans — no OCR needed.
- No vendor "wykonanie/realizacja" branding exposed in footer; assets fully self-hosted.

## 4. Volume + achieved-price stream
- **Total sale board:** ~184 items across ~16 pages spanning several years — but a hand-count of the 4 most recent pages (~52 items) shows the split is roughly **land ≈ 40+, restricted/commercial lokale ≈ 4-5, open residential flats ≈ 0** (the open-flat notices sit older and are repeat attempts).
- **Open flat throughput:** effectively nil-recurring. Same 1-2 unsold flats re-auctioned as III/IV przetarg; no steady pipeline; no housing-stock manager feeding inventory.
- **Achieved-price stream:** **YES (bonus, but for land).** The same board interleaves `Informacja o wyniku przetargu` notices carrying cena osiągnięta / nabywca (or wynik negatywny). Cleanly parseable from server HTML — valuable *if* land were in scope, but it does not rescue the flat mandate.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (shape):** a plain paginated single-board server-HTML BIP — handling like the Dolnośląskie bip.info.pl gminas (zgorzelec/złotoryja): list board → `?Page=N` crawl → per-notice HTML/regex parse (address via parseAddress, pow. użytk., cena wyw./osiągnięta, wadium, data, runda), classify OGŁ vs WYNIK from title, and split flat vs land/dzierżawa/commercial. No exact CMS-vendor match in the analog table; treat as generic WordPress/custom-HTML-family server render.
- **Technical effort if built:** **LOW-MEDIUM** — one board, clean HTML, results inline. No blockers (no rate-limit/auth/JS).
- **Why NO-BUILD anyway:** the deliverable target is municipal **open flat** auctions. Olecko yields ~0 recurring open flat auctions — land + building plots dominate, the few flats are restricted (`ograniczony`) or chronically-unsold re-runs, and there is **no housing manager**. That is precisely the "generic city-BIP skewing to land ... ~0 open flat auctions" NO-BUILD profile. Revisit only if land/building-plot disposals are promoted into scope (then Medium BUILD, the wynik stream is worth it).

**VERDICT: NO-BUILD** — clean, easy server-HTML BIP with a real results stream, but land-dominated with essentially zero recurring open municipal-flat auctions and no housing manager; fails the flat-auction mandate.
