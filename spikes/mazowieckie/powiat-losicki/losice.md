# Spike — Łosice (Mazowieckie · powiat łosicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: **NO-BUILD** (no recurring open flat-auction stream — ONE open flat auction in the entire 2023–2025 board; residential disposal is otherwise 100% bezprzetargowo na rzecz najemcy).

## TL;DR
Miasto i Gmina Łosice (gmina miejsko-wiejska, ~15.6k, ~7k in town) publishes all property notices on the city BIP `bip.gminalosice.pl`, running **SmartSite by BIT Sp. z o.o.** — clean server-rendered HTML with a single combined board "Wykazy i przetargi nieruchomości" (5 pages of history). Technically this is a Low-effort target (same CMS family as Kielce/Augustów, no auth, no SPA, clean pagination). But the **volume of open flat auctions is essentially zero**: across the entire ~2.5-year board there is exactly **one** `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` (ul. Międzyrzecka 5A lok. 2, 39.79 m², cena wywoławcza 112 420 zł, auction 19.09.2023). Every other residential disposal is a **wykaz / zarządzenie for a bezprzetargowa sprzedaż na rzecz dotychczasowego najemcy** (tenant right-to-buy). Open auctions on this BIP are dominated by **land** (Niemojki, Kolejowa 18, Sosnowa, Ekologiczna) and **dzierżawa/najem leases**. No housing manager (no ZGM/ZBM/MZBM). Textbook small-Mazowieckie-seat NO-BUILD.

## 1. Sells municipal property at auction?
**YES for LAND and LEASES; effectively NO for FLATS.** The Burmistrz Miasta i Gminy Łosice does run `przetarg ustny nieograniczony`, but the open-auction stream is land + dzierżawa, not flats:
- **Open LAND-sale auctions** (recurring): nieruchomości gruntowe niezabudowane Niemojki (dz. 591 / 557/3); nieruchomości gruntowe zabudowane Łosice ul. Kolejowa 18 (dz. 176/2, 176/3; later odwołany then re-announced); ul. Sosnowa; ul. Ekologiczna.
- **Open DZIERŻAWA (lease) auctions** (recurring): nieruchomości rolne; 10-lat / 29-lat / 2-lat części nieruchomości (ul. Asza, ul. Narutowicza, dz. 1356/2 Niemojki).
- **Open FLAT auction — exactly ONE in the whole board:** ul. Międzyrzecka 5A **lok. nr 2**, pow. użytkowa 39.79 m² (+ pom. przynależne 7.85 m²), udział 47/445, dz. 1010/3 (0.0192 ha); **cena wywoławcza 112 420,00 zł, wadium 11 300, postąpienie 2 000**; przetarg **19.09.2023, 11:00** (Transkontynentalne Centrum Dialogu Kultur, ul. Berka Joselewicza 13). Preceded by its wykaz (Zarządzenie **RMiG.120.50.2023**, 22.05.2023).
- **All other residential disposal = bezprzetargowo na rzecz najemcy** (wykaz/zarządzenie only, no auction): lok. 21 & lok. 35 ul. 11 Listopada 14; lok. 3 ul. Międzyrzecka 5; lok. 3 Chotycze (Zarz. RMIG.120.25.2023); lok. 6 ul. Czarkowskiego 6; a batch "wykaz lokali mieszkalnych ... dla najemców" (Zarz. RMiG.120.27.2023).

So: ~6 tenant right-to-buy flats vs **1** open flat auction over 2023–2025. No hammer-price flat stream.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SmartSite / BIT):** `https://bip.gminalosice.pl`
- Combined board **"Wykazy i przetargi nieruchomości":** `https://bip.gminalosice.pl/wykazy_i_przetargi_nieruchomosci/`
- Pagination: `.../wykazy_i_przetargi_nieruchomosci/wykazy-i-przetargi-nieruchomosci.html?page=2` … `?page=5` (5 pages ≈ full 2023→mid-2025 history; single mixed board — no separate results board).
- Article URL pattern: human-readable slug, e.g. `.../wykazy_i_przetargi_nieruchomosci/przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-gruntowych-niezabudowanych-polozonych-w-miejscowosci-niemojki-1.html`
- The one flat auction: `.../wykazy_i_przetargi_nieruchomosci/ogloszenie-o-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego.html` (page 3).
- Zarządzenia Burmistrza (where wykazy originate): `https://bip.gminalosice.pl/prawo_lokalne/zarzadzenia_burmistrza/`
- Result notices appear inline in the same board, e.g. `.../informacja-o-wyniku-przetargu-z-26-wrzesnia-2025.html` — but those observed cover **dzierżawa/land**, not flats.

Note: the board also carries **Starosta Powiatu Łosickiego** notices (GKN.6840.* — powiat land, not gmina) and occasional zapytania ofertowe — must be filtered out.

## 3. Format + rendering
- **Server-rendered HTML** — SmartSite by BIT Sp. z o.o. (`<meta generator "SmartSite by BIT Sp. z o.o. [web2]">`). Confirmed live via curl (HTTPS; note the cert chain is incomplete — WebFetch failed "unable to verify the first certificate", curl needs `-k`). No JS gate, no auth, no CAPTCHA.
- Article bodies are inline HTML text (Burmistrz ... ogłasza ...). Bootstrap/PageSpeed front-end. Pagination is plain `?page=N`.
- No born-digital/scanned-PDF dependency observed for the notices themselves; ogłoszenia are full HTML text — trivially parseable if there were volume.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ~0.** Exactly **one** open flat auction (Międzyrzecka 5A/2, 2023) in the entire visible board. No sign of a second before or since. Nowhere near a recurring stream.
- **Residential disposal is dominated by tenant right-to-buy** (bezprzetargowo na rzecz najemcy) via wykaz/zarządzenie — no bidding, no hammer price, out of scope.
- **Achieved-price stream: absent for flats.** "Informacja o wyniku przetargu" notices exist but the ones observed report dzierżawa / land results (e.g. wynik 26.09.2025 relates to leases/land), not flat hammer prices.
- **No housing manager** (no ZGM/ZBM/MZBM/TBS in Łosice) to backstop a flat pipeline; the gmina's stock is being emptied to sitting tenants, not auctioned.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (CMS):** SmartSite by BIT → **Kielce / Augustów** pattern. If ever built, clone that shape: single board → paginate `?page=N` → fetch slug article → regex/DOM parse (address via parseAddress, pow. użytkowa, cena wywoławcza, wadium, postąpienie, date/round), filter out dzierżawa + land + Starosta + najemca notices.
- **Effort (tech only):** Low — clean server HTML, stable slugs, no SPA/auth. The only tech nit is the incomplete TLS chain (curl `-k` / relaxed CA).
- **Blocker = VOLUME, not tech.** With one open flat auction across 2.5 years, an adapter would ingest ~0 flat rows/year. Everything residential runs the bezprzetargowa-najemca track (or lease auctions). Per the spike heuristic this is a NO-BUILD: "residential disposal is ONLY bezprzetargowo na rzecz najemcy, dzierżawa/najem auctions, or wykaz lists — generic city-BIP skewing to land + tenant sales with ~0 open flat auctions."
- Consistent with sibling small Mazowieckie seats (Białobrzegi NO-BUILD; Gostynin NO-BUILD).

**VERDICT: NO-BUILD** — clean SmartSite/BIT server-HTML BIP, but the open-auction stream is land + leases and residential stock is sold bezprzetargowo to sitting tenants; only one open flat auction (Międzyrzecka 5A/2, 2023) in the entire board. No recurring flat-auction volume, no flat hammer-price stream, no housing manager.
