# Spike — Dąbrowa Tarnowska (Małopolskie · powiat dąbrowski)
> **Status:** spike LIVE — re-verified 2026-07-06. VERDICT: **NO-BUILD** (volume + no results stream).

## TL;DR
Gmina Dąbrowa Tarnowska DOES sell municipal flats (lokale mieszkalne) at *ustny przetarg nieograniczony na sprzedaż*. Confirmed by a live III przetarg announcement (November 2025) on both the official portal dabrowatar.pl and BIP at bip.malopolska.pl. Format is rendered HTML on the main portal + BIP HTML pages (BIP direct fetches time out in automation — likely JS-blocked or rate-limited). Volume is very low (~1 flat per cycle, sold across multiple auction rounds). No separate achieved-price board found on BIP; result notices likely published as HTML articles on the same BIP host. **Re-verified live 2026-07-06 (see "Re-verify" section): no wyniki stream exists 7 months post-auction, volume is one flat total across 2024–2026, and the WP REST API is now 401-blocked → NO-BUILD.**

## 1. Sells municipal property at auction?

YES — confirmed. The Burmistrz of Dąbrowa Tarnowska held:
- **I przetarg** (earlier 2025) — lokal mieszkalny nr 10, ul. Lwowska 65, Tarnów (spółdzielcze własnościowe prawo do lokalu), 47.90 m², starting price not found in I/II rounds.
- **II przetarg** — same unit, reduced price.
- **III przetarg ustny nieograniczony** — 4 December 2025, UM Dąbrowa Tarnowska, sala nr 20, price **279 000 zł**. BIP article ID: 2759478. Main portal announcement: https://dabrowatar.pl/ii-przetarg-nowa-nizsza-cena/ (published 2025-11-20).

The property is communal property (mienie komunalne); the unit is a cooperative ownership right held by gmina. This is the standard *ustny przetarg nieograniczony na sprzedaż* pipeline.

Note: the flat being auctioned is located in Tarnów (not within Dąbrowa Tarnowska city limits) but owned and auctioned by Gmina Dąbrowa Tarnowska — still in scope.

## 2. Where published? (hosts + boards, URLs)

**Announcement board:**
- Primary: **dabrowatar.pl** (WordPress/Elementor CMS) — news article with full auction text, human-readable HTML. URL pattern: `https://dabrowatar.pl/<slug>/`
- Secondary / statutory: **bip.malopolska.pl/umdabrowatarnowska** — BIP hosted on the Małopolska regional BIP platform. Article IDs confirmed (e.g., a,1773809 for II przetarg; a,2759478 for III przetarg). URL pattern: `https://bip.malopolska.pl/umdabrowatarnowska,a,{ID},{slug}.html`
- Zamówienia i ogłoszenia index: `https://bip.malopolska.pl/umdabrowatarnowska,m,138772,zamowienia-publiczne-i-ogloszenia.html`

**Result/achieved-price board:**
- Not separately confirmed. Standard practice on bip.malopolska.pl is a follow-up article ("informacja o wynikach przetargu") under the same BIP menu section. No such article was found in search results, suggesting either: (a) the III przetarg (Dec 2025) result has not yet been published at spike time, or (b) results are not routinely digitised. Needs live verification.

## 3. Format + rendering

- **dabrowatar.pl**: WordPress + Elementor, fully server-rendered HTML. Announcement text in `<p>` tags with `<strong>` bolding. No auth, no bot block observed. `web_fetch` succeeded.
- **bip.malopolska.pl**: Regional BIP platform (shared Małopolska infrastructure). Direct `web_fetch` returned empty — likely requires JS rendering or has a bot-detection/rate-limit layer. The BIP pages do render in a normal browser. Fetching via Chrome MCP (headless) should work. Format once loaded: structured HTML article with article body as text paragraphs, no PDF attachment observed for this auction type.
- **PDF risk**: Low — no PDF links were observed for the flat auction notice; text is inline HTML. Scanned-PDF risk: none observed.
- **SPA / auth**: No auth. dabrowatar.pl is a static WordPress site. BIP may need browser rendering.

## 4. Volume + achieved-price stream

- **Gmina auction volume**: Very low — approximately 1 lokal mieszkalny per year, sold across multiple rounds (I→II→III) with price reductions between rounds (typical małopolska small-gmina pattern).
- **Achieved price data**: Not found in public web search or aggregators. The III przetarg (Dec 2025) result has not surfaced. BIP likely publishes a "wyniki" article but none was indexed by search engines for this gmina. This is the key gap.
- **Aggregator coverage**: adradar.pl listed the flat (lokal mieszkalny) municipal auction when it appeared; listaprzetargow.pl has a 2018 entry from a housing cooperative (Spółdzielnia Mieszkaniowa) — different entity, not gmina. Aggregators do pick up gmina auctions but do not carry achieved prices.
- **Signal for adapter**: With ~1 lokal/year and 3 rounds per cycle, expect ~3 BIP articles per year for this city. Thin but non-zero.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Other small Małopolska gminas on bip.malopolska.pl (shared BIP platform) — e.g., Niepołomice, Wieliczka pattern. The BIP structure is identical across all tenants on this host.

**Adapter approach**:
1. Scrape dabrowatar.pl news feed (WordPress REST API `/wp-json/wp/v2/posts` likely available — zero friction) for new auction posts matching `przetarg` + `lokal mieszkalny` keywords.
2. For each hit, follow BIP URL embedded in the post to fetch the canonical BIP article (needs Chrome MCP / Playwright due to JS rendering on bip.malopolska.pl).
3. Parse auction fields (address, area, cena wywoławcza, date, KW number) from HTML article text.
4. For results: poll BIP index page (`m,138772`) for new articles containing "wynik" or "informacja o wynikach" — same HTML parse pattern.

**Blockers**:
- bip.malopolska.pl requires browser rendering (not raw fetch) — confirmed blocker, standard for this platform.
- Achieved-price publication cadence unknown; needs live observation after a completed auction.
- Very low volume means the adapter may fire only ~1–3 times/year.

**Effort**: Low. WordPress feed scrape is trivial; BIP parse reuses the shared bip.malopolska.pl adapter pattern already needed for other Małopolska cities. No PDF OCR, no auth, no SPA complexity.

**Verdict**: ~~NEEDS-LIVE-VERIFY~~ → **NO-BUILD** (re-verified live 2026-07-06, see below). Volume is ~1 flat per multi-round cycle (one flat total across 2024–2026) and no achieved-price/results stream exists — fails the <1–2 flat auctions/yr + no results stream heuristic.

## Re-verify 2026-07-06

Live checks (WebFetch + WebSearch), resolving the two open items from the desk spike:

**(a) bip.malopolska.pl accessibility** — CONFIRMED BLOCKED for plain fetch. Both the index
(`https://bip.malopolska.pl/umdabrowatarnowska,m,138772,zamowienia-publiczne-i-ogloszenia.html`)
and the direct article (`https://bip.malopolska.pl/umdabrowatarnowska,a,2759478,.html`) return only the
page skeleton/nav with an empty content area — JS rendering required (browser/Playwright only).

**(b) Results/achieved-price stream** — NOT FOUND. Seven months after the III przetarg
(4 Dec 2025, Lwowska 65/10, 279 000 zł), no "informacja o wyniku przetargu" for it exists on
dabrowatar.pl (site search `?s=przetarg+lokal` and `?s=lokal+mieszkalny` show zero wyniki posts)
and none is indexed from the gmina's BIP. The only "INFORMACJA o wyniku przetargu pisemnego"
hit (`bip.malopolska.pl/pobierz/1257503.html`) belongs to the powiat starostwo (spdabrowatarnowska),
a przetarg pisemny — different entity, out of scope.

**(c) Volume 2024–2026** — ~1 flat total, not per year:
- dabrowatar.pl full-site search: exactly one flat-sale cycle — I przetarg 2025-07-11
  (`/burmistrz-dabrowy-tarnowskiej-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-mienia-komunalnego/`)
  and III przetarg 2025-11-20 (`/ii-przetarg-nowa-nizsza-cena/`), both the same unit (Lwowska 65/10, 47.90 m²).
  Zero flat auction announcements in 2024 or 2026; the only 2026 property post is a dzierżawa (lease), 2026-03-06.
- Aggregator cross-check (adradar, Dąbrowa Tarnowska archive Jun 2024–Jun 2026): 1 flat auction listed,
  seller = komornik (bailiff), **zero gmina flat auctions**.

**(d) New blocker found** — the WordPress REST API (`dabrowatar.pl/wp-json/wp/v2/posts`) now returns
**HTTP 401** — the desk spike's "zero-friction WP API" adapter path is gone; only HTML search
(`dabrowatar.pl/?s=...`) works, and BIP needs a headless browser.

**Conclusion**: no recurring flat-auction stream (~0.3 flats/yr), no results/achieved-price publication
at all, and both the easy ingestion path (WP API) and the statutory source (BIP) are hardened.
**NO-BUILD on volume.** Revisit only if the gmina starts publishing wyniki articles or auctions >=2 flats/yr.
