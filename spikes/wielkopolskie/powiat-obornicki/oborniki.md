# Spike — Oborniki (Wielkopolskie · powiat obornicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (effort —).

## TL;DR
Gmina Oborniki (miejsko-wiejska, seat of powiat obornicki) **does sell municipal property at open oral auction** (`przetarg ustny nieograniczony`), but the disposal stream is **land + commercial units + lease**, not flats. Across the live property board (`www.oborniki.pl/nieruchomosci/`, 18 paginated pages) and every general auction announcement checked (ogłoszenie-o-przetargu 36/41/42), **not a single open auction sold a lokal mieszkalny (residential flat)** — the auctions are building plots (`działki` on Gołaszyńska, Waryńskiego, Harcerska, Uścikówiec, Rożnowo…) and the occasional `lokal użytkowy` (Rynek 21, Piłsudskiego 24/38). Residential disposal, where it happens, is `bezprzetargowo` (to usufructuary/tenant) or lease/`najem`. The housing stock is managed by **PGKiM Sp. z o.o.** (a housing manager — the one BUILD-flavored signal), but PGKiM only administers; it does not publish flat-sale auctions. **~0 open flat auctions ⇒ NO-BUILD** per the flat-auction heuristic. No results board with hammer prices for flats.

## 1. Sells municipal property at auction?
**YES for land/commercial — NO for flats.** The Burmistrz Obornik runs `przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Gminy Oborniki` (wadium 20% ceny wywoławczej to Urząd Miejski PKO BP; postąpienie ≥1%). But every open auction inspected is land or a commercial unit:
- **ogłoszenie-o-przetargu-41** (auction 10.09.2025): 7 items, all **land** — Bąblin dz.162 (byłej hydroforni), Rożnowo 517/5-6, Uścikówiec 119/120/123/124. Cena wyw. 60k–140k.
- **ogłoszenie-o-przetargu-42** (04.03.2026): general property auction — **land**.
- **ogłoszenie-o-przetargu-36**: **undeveloped land** — Gołaszyńska (dz.2599, 2595/1, 2595/2), Waryńskiego 3517, Kowanówko Harcerska 51/10-11, Nowołoskoniec 143/2-3. All single-family building plots.
- **lokale użytkowe** (commercial, not flats): Rynek 21, Piłsudskiego 24 & 38 (04.03.2026); Rynek 19 leased at auction (wykaz 12/2022).
- **bezprzetargowa** sales: Kowanowska 48 (2.15 ha to użytkownik wieczysty), Uścikowo, Gołaszyn — sold **without auction**.
- **najem/dzierżawa**: Popówko 5 medical unit, commercial units for lease.

Page-3 board tally (10 items, Jan–Mar 2025): 0 residential-flat auctions — 3 wykazy, 3 bezprzetargowa, 2 land auctions, 1 commercial-unit auction, 1 restricted (ograniczony) land auction. Consistent with page 1. **Open flat-auction volume = 0.**

## 2. Where published? (hosts + boards, URLs)
Two sources; the property announcements live on the **WordPress city site**, mirrored/pointed-to from the BIP:
- **Primary board (WordPress):** `https://www.oborniki.pl/nieruchomosci/` — dated article list, 18 pages of pagination. Individual notices at `www.oborniki.pl/nieruchomosci/ogloszenie-o-przetargu-NN/`, `.../wyciag-z-ogloszenia-o-przetargu-N/`, `.../wykaz-nr-NN-YYYY-.../`, `.../ogloszenie-burmistrza-obornik-NN/`.
- **BIP:** `https://bip.umoborniki.nv.pl` (aka `www.bip.oborniki.pl`) — `netVida/nv.pl`-hosted BIP, server-HTML. URL scheme `m,ID,slug.html` (menu), `Article/id,ID.html`, `v,ID,slug.html`, `e,kalkulator.html`. Nieruchomości node: `bip.umoborniki.nv.pl/Article/id,130.html`; zamówienia publiczne `m,64,...`.
- Contact / office: **Wydział Gospodarki Nieruchomości i Mienia Komunalnego**, UM Oborniki pok. 226, tel. **61 65 59 158**.
- **Housing manager:** **PGKiM Sp. z o.o.** (Przedsiębiorstwo Gospodarki Komunalnej i Mieszkaniowej, KRS 0000072433) manages/administers the gmina housing stock and wspólnoty — but is not a sale/auction publisher.
- **Do NOT confuse** with **Oborniki Śląskie** (Dolnośląskie, `oborniki-slaskie.pl` / `bip.oborniki-slaskie.pl`) — a different JST; search noise heavily overlaps.

## 3. Format + rendering
- **Server-rendered HTML** on both hosts — no SPA/JS gate, no auth, no CAPTCHA. WebFetch extracted full auction tables (addresses, area, cena wywoławcza) as plain text.
- WordPress notices are inline HTML; some longer `ogłoszenie o przetargu` items attach a **born-digital text PDF** ("Ogłoszenie przetarg") — handle with `pdfText`, OCR unlikely.
- BIP is `nv.pl` server-HTML with legible `.html` URLs.
- Technically trivial to scrape — but the content is land/commercial, not flats.

## 4. Volume + achieved-price stream
- **Open flat auctions: ~0.** Zero found across sampled pages 1 & 3 and all general auction notices. Residential units are disposed `bezprzetargowo` (najemca / użytkownik wieczysty) when at all.
- **Land/commercial auction volume:** modest-steady (a handful of działki + occasional lokal użytkowy per quarter) — out of the flat target.
- **Achieved-price stream:** no dedicated flat `informacja o wyniku przetargu` results board found; land results not systematically boarded. No hammer-price stream for flats.
- Only third-party flat auctions in Oborniki are **komornicze** (bailiff) and **spółdzielnia** (Obornicka SM) — both out of scope, not municipal.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** WordPress server-HTML gmina board — brzeg / nowa-sol / bochnia / olkusz / trzebinia pattern (article list + born-digital PDFs); BIP side is a `nv.pl`/netVida server-HTML mirror.
- **Effort:** **— (N/A).** The scrape would be Low-effort technically, but there is **no flat-auction product** to extract.
- **Blocker (decisive):** **~0 open flat-sale auctions.** Gmina Oborniki auctions land + commercial units; flats leave the municipal stock via tenant/usufruct `bezprzetargowa` sale, not open auction. Matches the NO-BUILD profile: generic city board skewing to land + tenant sales.

**VERDICT: NO-BUILD** — Gmina Oborniki runs open auctions only for building plots and commercial units; residential flats are not sold at open auction (tenant/usufruct bezprzetargowo only), so there is no recurring open flat-auction stream or hammer-price board to adapt, despite a clean server-HTML source and a PGKiM housing manager.
