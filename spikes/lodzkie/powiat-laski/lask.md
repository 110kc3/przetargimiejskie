# Spike — Łask (Łódzkie · powiat łaski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (open flat-auction volume = 0).

## TL;DR
Gmina Łask (miejsko-wiejska, town seat Łask) sells municipal property at `przetarg ustny nieograniczony`, but the entire stream is **land** — undeveloped and built plots in Łask town obręby (5, 13, 14, 15) and outlying villages (Ostrów, Anielin, Wrzeszczewice Skrejnia, Orchów, Bałucz/Młynisko). Across **three full years (2023, 2024, 2025)** the dedicated per-year auction boards on the city BIP `bip.lask.pl` carry **ZERO `lokal mieszkalny` open sale auctions**. Residential flats leave the municipal stock **bezprzetargowo na rzecz najemcy** (to sitting tenants, via `wykaz` zarządzenia), not at open auction. The only `lokal`-type auctions are `lokal użytkowy` **najem** (commercial-space lease), not flat sales. No housing manager (ZGM/ZBM/TBS) drives a flat-auction pipeline here, and there is **no results/`wyniki`/`rozstrzygnięcia`** board with hammer prices. CMS is a modern, plugin-rich server-HTML BIP (theme `bip_v4`), clean to scrape — but there is nothing in-scope to scrape. Classic generic city-BIP skewing to land + tenant sales.

## 1. Sells municipal property at auction?
**YES for land — NO for flats.** Burmistrz Łasku runs regular `I/II/III/IV/V przetarg ustny nieograniczony na sprzedaż nieruchomości` — but the object is consistently `nieruchomość gruntowa niezabudowana` / `gruntowa zabudowana` (land, sometimes with a building), never a `lokal mieszkalny`. Evidence from the three live yearly boards:
- **2025** (`/5479/…`): 6 auctions — all land (ul. Swojska, Ostrów/Truskawkowa, Anielin dz. 196/4, Wrzeszczewice Skrejnia, Wojska Polskiego zabudowana). Flats: 0.
- **2024** (`/3985/…`): land only (Anielin dz. 176, Wrzeszczewice Skrejnia, Swojska IV/V przetarg, obręb 15 dz. 447/1). Flats: 0.
- **2023** (`/2525/…`): ~20 items — land plots + **2× `lokal użytkowy` najem** (Plac 11 Listopada 1, commercial lease, not a flat sale). Flats: 0.

Residential disposal path is explicitly **outside auction**: zarządzenia Burmistrza publish `wykaz nieruchomości przeznaczonych do sprzedaży poza przetargiem na rzecz najemcy` (e.g. Zarz. 231/2024, 287/2021) — flats sold to sitting tenants bezprzetargowo. A rare 2019 archive item auctioned only a municipal **share in a spółdzielcze własnościowe prawo do lokalu** (cooperative right), a one-off, not a recurring open flat-sale line.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Urząd Miejski w Łasku):** `bip.lask.pl`
- Auction hub: `https://bip.lask.pl/611/ogloszenia-o-przetargach.html` (branches to yearly sub-pages 2021→2026)
- 2025 board: `https://bip.lask.pl/5479/ogloszenia-o-przetargach-2025r.html`
- 2024 board: `https://bip.lask.pl/3985/ogloszenia-o-przetargach-2024r.html`
- 2023 board: `https://bip.lask.pl/2525/ogloszenia-o-przetargach-2023r.html`
- 2022 board: `https://bip.lask.pl/1591/ogloszenia-o-przetargach-2022-rok.html`
- Wykaz (tenant/bezprzetargowo sales) live in zarządzenia, e.g. `https://bip.lask.pl/4705/…-wykazu-nieruchomosci-przeznaczonych-do-sprzedazy-poza-przetargiem.html`
- Article URL pattern: `bip.lask.pl/<ID>/<slug>.html` (sequential numeric ID + descriptive slug).

**Do NOT confuse** with `lask.bip.net.pl` (extranet.pl `?c=NNN` CMS) — that is the **Starostwo Powiatowe w Łasku** (county / Skarb Państwa properties, mostly `sprzedaż na rzecz najemcy`), a separate JST out of scope. The `lask.com.pl` / `powiat` and `lsmlask.pl` (Łaska Spółdzielnia Mieszkaniowa — a cooperative, private) hits are also out of scope.

## 3. Format + rendering
- **Server-rendered HTML** — modern plugin-rich BIP CMS (theme `bip_v4`; assets under `/cms/plugin/…`, `clients/cms_lask`; plugins resident_card/needs_map/garbage_collection/normative_acts). No JS-SPA gate on the article body; announcement text is **inline HTML** (confirmed live — cena wywoławcza per plot rendered in-page).
- **Attachments** (`Załączniki`) load via AJAX (`Trwa ładowanie, proszę czekać`) — born-digital PDFs/DOCs of the full ogłoszenie may hang off each article; body text is usually self-sufficient. Vendor is uncredited (no exact named analog; not Logonet/IDcom/bip.info.pl/extranet — a bespoke wizja.net-class HTML BIP).
- No auth, no CAPTCHA observed. Would be **Low** scrape difficulty *if there were in-scope content*.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: 0** over 2023–2025 (three full years). Property auctions are ~5–20/yr but **land-only**; flats never appear.
- **Achieved-price stream: NONE.** There is **no `wyniki`/`rozstrzygnięcia`/`informacja o wyniku przetargu` board** — only announcement boards by year (cena wywoławcza only). No hammer-price feed to harvest.
- **No housing manager** (ZGM/ZBM/MZBM/TBS) publishes a competing flat-auction pipeline for the gmina; LSM is a private cooperative (separate legal entity, its own `przetarg pisemny` on cooperative rights — not municipal stock).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** technically a modern server-HTML BIP (WordPress/custom-HTML family, brzeg/nowa-sol-class in ADAPTER-GUIDE terms) — clean to parse. But **substantively there is no analog to reuse because there is no in-scope dataset.**
- **Effort:** **— (N/A).** Building an adapter would yield a land-only feed with zero flats and no achieved prices.
- **Blockers / kill reasons:** (1) 0 open flat auctions across 3 yrs; (2) residential disposal is bezprzetargowo na rzecz najemcy (wykaz), never open auction; (3) only `lokal` auctions are `lokal użytkowy` **najem** (lease); (4) no results board / no hammer prices; (5) no ZGM/ZBM/TBS flat-auction manager. This is exactly the NO-BUILD profile: generic city-BIP skewing to land + tenant sales with ~0 open flat auctions.

**VERDICT: NO-BUILD** — Gmina Łask runs open auctions for **land only**; municipal flats leave stock bezprzetargowo na rzecz najemcy, there are zero open `lokal mieszkalny` sale auctions (2023–2025) and no achieved-price board. Nothing in-scope to build against.
