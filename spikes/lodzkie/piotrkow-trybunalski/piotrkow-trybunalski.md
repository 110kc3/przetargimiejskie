# Spike — Piotrków Trybunalski (Łódzkie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm, but weak signal).

## TL;DR

Piotrków Trybunalski runs *ustne przetargi nieograniczone* on municipal land and built-property shares through the City Office BIP — confirmed active in 2026. However, **residential flats (lokale mieszkalne) are sold exclusively bezprzetargowo** (non-auction, direct to tenants). The auction stream covers only undeveloped plots and occasional built-property co-ownership shares. No ZGM/PGM equivalent exists; the TBS manages rentals only. Flat-auction volume = zero. The city is a **NO-BUILD** for the project's flat-auction scraper use-case.

## 1. Sells municipal property at auction?

**Yes — but not residential flats.**

The city does conduct *ustne przetargi nieograniczone* (open oral auctions) and *przetargi ograniczone* (restricted oral auctions) for municipal nieruchomości. The BIP "Informacja o wynikach przetargów → Rok 2026" page (id=2465) lists five auction-result notices published between April and June 2026, referencing auctions held on 27 March 2026 and 24 April 2026.

However, all auctioned properties are:
- Undeveloped land parcels (*nieruchomości niezabudowane*), e.g. ul. Poleśna (działki 501/504/507/508/509), ul. Karolinowska 57/59, ul. Zimna, ul. Rolnicza–Hortensji, ul. Sezamkowa, ul. Wierzejska 47–49
- Co-ownership shares in built properties (*udział we współwłasności nieruchomości zabudowanej*), e.g. 1/4 udziału at ul. Wojska Polskiego 218A

**Residential flats go bezprzetargowo.** A direct `site:bip.piotrkow.pl "lokal mieszkalny"` search returns dozens of *Wykaz lokalu mieszkalnego … przeznaczonego do sprzedaży w trybie bezprzetargowym* notices (confirmed entries from 2021–2023), with no flat auction notices. This is the standard Polish municipal tenant-right-of-first-refusal model: the city lists the flat, the sitting tenant has 21 days to buy at appraised price, no auction is conducted. The *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* pattern **does not exist here**.

No dedicated housing manager (ZGM/PGM/MZGM) publishes separate flat-auction lists. The relevant bodies are:
- **TBS Piotrków Trybunalski Sp. z o.o.** — social housing provider; runs only rental auctions (*przetargi na najem lokali*), no sales.
- **Piotrkowska Spółdzielnia Mieszkaniowa** — cooperative, not municipal.
- **Referat Gospodarki Nieruchomościami UM** (ul. Szkolna 28, pok. 305) — handles all municipal property disposals, publishes to BIP.

## 2. Where published? (hosts + boards, with URLs)

Two official publication channels, both operated by Urząd Miasta:

**Primary BIP** — `bip.piotrkow.pl` (AkcessNet.eu CMS; server-rendered HTML; HTTPS; no auth):
- Ogłoszenia – sprzedaż i dzierżawa: <https://www.bip.piotrkow.pl/index.php?idg=8&id=1024&x=111>
- Wykazy nieruchomości – sprzedaż i dzierżawa (index): <https://www.bip.piotrkow.pl/index.php?idg=8&id=1519&x=110>
  - Rok 2026 sub-page: <https://www.bip.piotrkow.pl/index.php?idg=8&id=2461&x=110&y=82>
  - Rok 2025 sub-page: <https://www.bip.piotrkow.pl/index.php?idg=8&id=2368&x=110&y=83>
- Informacja o wynikach przetargów (index): <https://www.bip.piotrkow.pl/index.php?idg=8&id=1520&x=113>
  - Rok 2026 results: <https://www.bip.piotrkow.pl/index.php?idg=8&id=2465&x=113&y=45>
- Komunikaty, ogłoszenia: <https://www.bip.piotrkow.pl/index.php?idg=8&id=1629&x=108>

**City portal mirror** — `piotrkow.pl`:
- Ogłoszenia o przetargach: <https://www.piotrkow.pl/gospodarka-t71/gospodarka-nieruchomosciami-t183/ogloszenia-o-przetargach-a185>

Both publish the same content. Individual auction announcements also appear as PDFs linked from the city portal (e.g. `/pdf` suffix on announcement URLs).

**BIP last-modified timestamp:** 2026-06-26 12:14 — confirmed live.

## 3. Format + rendering

- **Server-rendered HTML** throughout. No JS SPA. The CMS issues a JavaScript-disabled warning, but full content loads without JS (confirmed: web_fetch returns complete page text).
- **HTTPS, no auth, no bot-block** encountered. Standard AkcessNet.eu BIP CMS used by many Polish municipalities.
- Individual auction notices are HTML pages (article view via `?job=wiad&…&n_id=XXXXX`). Some announcements also carry a `/pdf` link (born-digital PDF, not scanned) for the formal notice text.
- Auction result pages (Rok 2026) contain metadata tables (author, dates, doc-id) and links to individual result articles — content did not fully load via web_fetch (stub page structure), suggesting results text may be embedded inside the article `n_id` pages or attached as PDF.
- No JSON API. No dynamic loading detected.

## 4. Volume + achieved-price stream

**Land auction volume (2026 YTD):** At least 5 auction-result notices published Jan–Jun 2026, covering sessions on 27 March and 24 April 2026. Each session covers 3–8 land parcels/shares. Estimated ~10–15 land lots auctioned per half-year. Many go to 2nd or 3rd round before selling or lapsing (e.g. ul. Poleśna plots failed at least 2 rounds).

**Flat auction volume:** Zero. All residential flat disposals are bezprzetargowe — no achieved-price stream available from auctions.

**Achieved-price stream:** The "Informacja o wynikach przetargów" section exists and is actively populated for land auctions (doc-ids 30217/30218/30255/30359/30360 confirmed in 2026). Achieved prices for land auctions would be in the individual article pages, but are of limited project relevance since flats are excluded.

**Bezprzetargowe flat listings** (wykazy) exist in large numbers (dozens of notices 2021–2023+) but carry appraised price only, no auction result or achieved-price premium.

## 5. Adapter effort + verdict

**Closest analog:** None among gliwice/zabrze/bytom/krakow/tarnowskie-gory — all those cities run residential flat auctions. Piotrków Trybunalski's property stream most resembles a land-only scraper target.

**Blockers:**
1. No residential flat auctions exist — the core project use-case (flat auction aggregation) does not apply.
2. The TBS/housing manager publishes only rental listings, not sales.
3. The "Wykazy" (bezprzetargowe) notices don't include achieved prices or bidding outcomes.

**Risks:** None relevant — the NO-BUILD decision is structural, not technical.

**Adapter effort if scope were widened to land:** Low-Medium. AkcessNet.eu BIP CMS is well-understood; server-rendered HTML; year-indexed sub-pages for results (id=2465 for 2026); individual articles accessible via `n_id` param. PDF attachments would need fetching for full notice text. Structurally similar to other BIP-based adapters in the project.

**Verdict: NO-BUILD.** The city sells residential flats *only* bezprzetargowo. There is no *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* stream. The land-auction stream exists and is technically accessible but falls outside the project's residential-flat-auction scope.
