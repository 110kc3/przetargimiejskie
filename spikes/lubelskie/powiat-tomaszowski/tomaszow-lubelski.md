# Spike — Tomaszów Lubelski (Lubelskie · powiat tomaszowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (Medium effort if forced).

## TL;DR
Gmina Miasto Tomaszów Lubelski (town / gmina miejska, ~19k) **does** run *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* — confirmed by a real, recurring case (ul. Rejtana 3, lok. 5, 32.35 m², cycling I→II→III przetarg from Jan 2025 through Jan 2026). So flats are NOT purely bezprzetargowo na rzecz najemcy here. BUT the flat-auction stream is essentially **one flat cycling repeatedly** over 1.5 years, with the rest of the board being **land/działki** (e.g. a 16-plot property at IV przetarg, June 2026) and grunt exchanges. The BIP is on the **Wrota Lubelszczyzny** shared platform (`umtomaszowlubelski.bip.lubelskie.pl`, `bip.lubelskie.pl` CMS): individual notices render as server HTML article pages (`index.php?id=NNN`), but the przetargi/wyniki **registry list tables are AJAX/DB-populated — empty on static fetch**, so a list crawler must hit the search/AJAX endpoint or scrape the `ostatnio_zaktualizowane` feed. Results board (`id=90`) exists but is inactive/empty → weak achieved-price stream. No dedicated housing manager (ZGM/TBS); the Wydział Gospodarki Komunalnej inside the UM handles sales. Low volume + AJAX registry + dead results board → NO-BUILD, matching the lubelskie NO-BUILD skew.

## 1. Sells municipal property at auction?
**YES for flats, but thin.** The Burmistrz Miasta Tomaszów Lubelski runs `przetarg ustny nieograniczony` for sale of municipal property, and this **does include lokale mieszkalne** (open auction, not just tenant bezprzetargowo). Confirmed recurring flat case:
- **ul. Rejtana 3, lokal mieszkalny nr 5**, pow. 32.35 m² (1 izba + kuchnia, łazienka, piwnica 14.30 m²) — **I przetarg ustny nieograniczony** ~23.01.2025 → **II przetarg** 11.04.2025 → **III przetarg** 15.01.2026 (repeat rounds when unsold, standard 10% wadium pattern).

The rest of the "zbycie nieruchomości" board is **land**: e.g. Burmistrz's **IV przetarg ustny** (announced 30.03.2026, auction 22.06.2026) for a property of sixteen adjoining działki; plus grunt-exchange (zamiana) wykazy (22.06.2026). Legacy `tomaszow-lubelski.pl/infpub/przetargi.htm` shows the historical mix (land plots, lokale użytkowe leases, Hotel Laureat) but is a dead 2011–2012 archive. Net: flats reach open auction, but the live flat pipeline is ~1 unit at a time.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP on Wrota Lubelszczyzny (`bip.lubelskie.pl` CMS):**
- BIP root: `https://umtomaszowlubelski.bip.lubelskie.pl/`
- Przetargi hub: `https://umtomaszowlubelski.bip.lubelskie.pl/index.php?id=89`
- **Przetargi na zbycie nieruchomości** (property-sale auctions board): `https://umtomaszowlubelski.bip.lubelskie.pl/index.php?id=472`
- **Wyniki przetargów** (results): `https://umtomaszowlubelski.bip.lubelskie.pl/index.php?id=90`
- **Wykazy nieruchomości** (Komunikaty; pre-auction lists incl. bezprzetargowo na rzecz najemcy + grunt): `https://umtomaszowlubelski.bip.lubelskie.pl/index.php?id=473`
- Recent-updates feeds (server-HTML, dated): `.../index.php?id=ostatnio_zaktualizowane`, `.../index.php?id=ostatnio_dodane`
- Article/notice URL pattern: `index.php?id=NNN` (numeric ids).

**Do NOT confuse:**
- Rural **Gmina Tomaszów Lubelski** (separate JST) — `ugtomaszowlubelski.bip.lubelskie.pl` — out of scope.
- **Starostwo Powiatowe** — `sptomaszowlubelski.bip.lubelskie.pl` — county, out of scope.
- **Tomaszów Mazowiecki** (łódzkie), BIP `bip.tomaszow.miasta.pl` — different city entirely.

Contact: Urząd Miasta Tomaszów Lubelski, **Wydział Gospodarki Komunalnej** (handles municipal property/housing sales — no separate ZGM/TBS/ZGKiM registry).

## 3. Format + rendering
- **Individual notices:** server-rendered HTML article pages (`index.php?id=NNN`) on the Wrota Lubelszczyzny platform — fetchable, no JS gate on the article body.
- **Registry LIST tables** (`id=472` przetargi, `id=90` wyniki): **AJAX / database-populated** — the static HTML is only the search-filter shell + empty `<table>` (0 rows on plain fetch). A list crawler must call the platform's search/AJAX endpoint (title / znak / date-range filter) OR scrape the `ostatnio_zaktualizowane` / `ostatnio_dodane` feeds, which DO render dated entries in server HTML. This is the standard Wrota Lubelszczyzny friction.
- No auth / CAPTCHA observed. Longer notices may attach born-digital PDF (handle with `pdfText`).

## 4. Volume + achieved-price stream
- **Flat volume:** **Very low.** Live evidence is effectively a single flat (Rejtana 3/5) cycling through I/II/III przetarg across 15+ months. Expect on the order of ~1 flat/yr reaching open auction; the board is dominated by land/działki and grunt exchanges. Small town (~19k), no housing-company sell-down engine.
- **Achieved-price stream:** **Weak.** A "Wyniki przetargów" board exists (`id=90`) but rendered empty/inactive at spike time (AJAX table, no populated rows). No reliable `cena osiągnięta / nabywca` stream surfaced. Announcements carry `cena wywoławcza`; hammer prices are not dependably published.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** any **Wrota Lubelszczyzny** (`bip.lubelskie.pl`) seat — same CMS shell, same `index.php?id=NNN` articles, same AJAX registry tables. A shared lubelskie adapter would amortize across many seats, but none is a clean built model to clone yet (this family skews NO-BUILD).
- **CMS family:** Wrota Lubelszczyzny hosted BIP — server-HTML articles + **AJAX/DB-populated list registry** (ADAPTER-GUIDE §3: HTML-article family with a dynamic listing layer requiring endpoint discovery).
- **Effort:** **Medium** *if forced* — not the code (article parse is easy) but the **list-discovery layer**: reverse the search/AJAX endpoint or crawl the recent-updates feed, then classify flat vs land, all for ~1 flat/yr. Poor payoff-to-effort.
- **Blockers:** (1) tiny flat volume (≈1 unit cycling); (2) AJAX-populated registry (no static list); (3) inactive/empty results board → no achieved-price stream.

**VERDICT: NO-BUILD** — flats do reach open oral auction here (better than pure bezprzetargowo), but the live flat pipeline is a single recurring unit, the Wrota Lubelszczyzny registry is AJAX-gated, and the results board yields no achieved-price stream. Skip unless a shared `bip.lubelskie.pl` adapter is built and this seat rides along for free.
