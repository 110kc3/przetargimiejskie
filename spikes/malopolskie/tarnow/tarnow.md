# Spike — Tarnów (Małopolskie · miasto na prawach powiatu)

> **Status:** spike DESK — 2026-06-27. VERDICT: NO-BUILD (Medium effort, low-signal stream).

## TL;DR

Tarnów city (Gmina Miasta Tarnowa) actively sells municipal land and commercial plots via ustny przetarg nieograniczony on the BIP (bip.malopolska.pl/umtarnow). However the 2026 harmonogram sprzedaży contains **zero residential flats (lokale mieszkalne)** — only land parcels and commercial sites. MZB Tarnów (the dedicated housing manager) runs flat auctions exclusively as **rental** contests (wynajem ofertowy), not sales. There is no evidence of a recurring ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych from either the city or MZB. Flat disposals appear to go bezprzetargowo to sitting tenants. The auction stream is land/commercial-only — a weak signal for this tool's residential focus.

## 1. Sells municipal property at auction?

**Yes — but not residential flats.**

- The Gmina Miasta Tarnowa runs *ustny przetarg nieograniczony* for land parcels and commercial/service plots via Wydział Geodezji i Nieruchomości (WGN), announced on BIP (bip.malopolska.pl/umtarnow) and mirrored at tarnow.pl.
- The 2026 "Aktualny harmonogram sprzedaży nieruchomości" (live-fetched from tarnow.pl) lists **10 properties scheduled for sale** — all are działki (land parcels) or commercial zones (MN, MN2, IS, U, P/U). No lokale mieszkalne appear.
- MZB Sp. z o.o. (Miejski Zarząd Budynków), the city's housing manager since 1951, manages the communal residential stock. Its "Przetargi — lokale mieszkalne" section (mzb.tarnow.pl/przetargi/kategoria/29) lists auctions back to 2023 — **all are "przetarg ofertowy na wynajem lokalu mieszkalnego"** (competitive rental tenders), not sales.
- No search evidence of any ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego published by the city or MZB in 2022–2026. The Spółdzielnia Mieszkaniowa "Mościce" (private co-op, not municipal) has sold one flat by tender in the past, but that is not a municipal stream.
- Pattern is consistent with the dominant Polish model: municipal flats go bezprzetargowo to sitting tenants under Art. 34 ugn (right of first purchase); open auctions are reserved for surplus land and commercial real estate.

**Confidence: DESK** — BIP page (bip.malopolska.pl/umtarnow,m,261314) returned empty body on two fetch attempts; city harmonogram fetched successfully (LIVE-VERIFIED for land/commercial; absence of flats on the 2026 schedule is LIVE-VERIFIED).

## 2. Where published? (hosts + boards, with URLs)

### Primary — land/commercial auctions

| Layer | URL | Notes |
|---|---|---|
| BIP auction section | https://bip.malopolska.pl/umtarnow,m,261314,przetargi-i-rokowania-na-zbycie-nieruchomosci-gminy-miasta-tarnowa-i-skarbu-panstwa-polozonych-na-te.html | Main listing of all przetargi + rokowania; server returns empty body on direct fetch (possible bot block or JS rendering) |
| City investor portal (harmonogram) | https://www.tarnow.pl/Dla-firm-i-inwestorow/Wsparcie-dla-inwestora/Aktualny-harmonogram-sprzedazy-nieruchomosci-nalezacych-do-Gminy-Miasta-Tarnowa | Server-rendered HTML, LIVE-VERIFIED 2026-06-27; shows 10 land/commercial entries |
| City active auctions | https://tarnow.pl/Dla-firm-i-inwestorow/Wsparcie-dla-inwestora/Oferty-lokalizacyjne/ | Links to active auctions |
| BIP Tablica ogłoszeń | https://bip.malopolska.pl/umtarnow,m,261088,tablica-ogloszen.html | General notice board |
| Contact (WGN) | ul. Nowa 3, pok. 204, tel. 14 68 82 754 | Wydział Geodezji i Nieruchomości |

### Secondary — housing manager (rental-only flat auctions)

| Layer | URL | Notes |
|---|---|---|
| MZB — lokale mieszkalne | https://mzb.tarnow.pl/przetargi/kategoria/29-przetargi-lokale-mieszkalne | LIVE-VERIFIED: rental competitions only (wynajem ofertowy) — no sales |
| MZB — wyniki przetargów | https://mzb.tarnow.pl/przetargi/kategoria/30-wyniki-przetargow | LIVE-VERIFIED: contains construction/maintenance contract results, not flat-sale results |
| MZB BIP | https://e-bip.org.pl/mzb/ | Linked from mzb.tarnow.pl header |

### Achieved-price notices

Not found for flat sales (because flat sales via open auction appear not to occur). Land/commercial auction result notices would be on the BIP tablica/auction section above — the BIP page itself timed out on fetch; actual format unverified.

## 3. Format + rendering

### tarnow.pl (city investor portal / harmonogram)
- **Server-rendered HTML** — `text/html; charset=UTF-8`, no JS required for content.
- The harmonogram is a static HTML table embedded in the page body; scraped cleanly in one fetch.
- TLS: standard HTTPS, no auth, no bot block observed on tarnow.pl.
- Cookie/GDPR banner present but does not gate content.

### bip.malopolska.pl (city BIP)
- Hosted on the regional Małopolska BIP platform (same platform as Kraków, Chrzanów, Olkusz, Oświęcim).
- Two fetch attempts returned **empty body** — likely JS-rendered SPA or aggressive bot filtering; the regional BIP platform is known to be awkward (consistent with Kraków adapter experience).
- Individual article pages (e.g. /umtarnow,a,2348985,...) also timed out.
- **Risk: same bip.malopolska.pl rendering issue as Kraków.** Kraków adapter likely solved this already — reuse that approach.

### mzb.tarnow.pl
- Server-rendered HTML, `text/html; charset=UTF-8`; content fetched cleanly.
- CMS: custom PHP ("Damian Szymański Dev."), simple article list with dates and links.
- No auth, no bot block.

## 4. Volume + achieved-price stream

### Volume (land/commercial)
- 2026 harmonogram: 10 properties planned for sale; active auctions have overlapping December 2024 dates mentioned in search snippets (Azotowa, Franciszka Kruszyny, Wolańska, Urszulańska, Kościuszki, Sosnowa = ~6 lots in one December round).
- Cadence appears to be ~1–2 auction rounds per year, each with multiple land/commercial lots.

### Volume (residential flats)
- **Effectively zero open-auction sales.** MZB's 2023–2026 flat listings are all rental competitions (6–8 per year). Sales appear to go directly to tenants under Art. 34 ugn (bezprzetargowo), off-platform.

### Achieved-price stream
- For land/commercial: result notices (informacja o wyniku przetargu) would be on BIP — unverified due to fetch failures.
- For residential flats: no open-auction stream = no achieved-price data to scrape.

## 5. Adapter effort + verdict

### Closest analog
- **bip.malopolska.pl platform**: same as Kraków. If the Kraków adapter already handles this regional BIP's quirks (JS rendering / empty-body issue), the platform layer is solved.
- **mzb.tarnow.pl**: simple server-rendered PHP CMS, easy to scrape — but irrelevant since it only publishes rental auctions.
- **tarnow.pl harmonogram**: trivially scrapable HTML table, but only publishes land/commercial — not the residential auction stream this tool targets.

### Blockers
1. **No residential flat sale stream.** The core value proposition of przetargimiejskie is aggregating *flat* auction listings (ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych). Tarnów does not run these.
2. **bip.malopolska.pl fetch issue**: the BIP auction section (where land/commercial auction notices live) returned empty on two attempts — would need Playwright/headless rendering or Chrome MCP to confirm what is actually there.
3. **Low annual volume even for land**: ~10 properties/year across all types.

### Risks
- If MZB occasionally sells (rather than only rents) flats, those notices are not visible in the public category listing — possible rare bezprzetargowy sales published only on BIP with no dedicated section; would require monitoring BIP tablica continuously.
- Regional BIP platform reliability (already a known risk from Kraków experience).

### Verdict: NO-BUILD

Tarnów's municipal land/commercial auction stream is active but **residential flat auction volume is effectively zero** — the city transfers flats bezprzetargowo to sitting tenants. Building an adapter would yield a land-only feed (low differentiation, low user value) from a BIP platform that already needs headless rendering. Not worth the effort at this stage.

If the project scope later expands to include land/commercial parcels, Tarnów can be revisited as a **Medium-effort** addition (bip.malopolska.pl platform already known from Kraków; harmonogram on tarnow.pl is trivially scrapable).
