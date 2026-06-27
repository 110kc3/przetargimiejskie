# Spike — Suwałki (Podlaskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm, but volume too thin for a dedicated adapter).

## TL;DR

Suwałki does sell municipal flats at open oral auction (*przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*), but this is a rare/exceptional stream. The dominant disposal route for residential units is *bezprzetargowy* sale to existing tenants, published as periodic *wykaz lokali*. The flat auction count visible across ~12 months of live BIP history is just **one unit** (Sejneńska 77 lok. 2, on its second round as of April 2026 after failing the first). All auction volume — both announcements and result notices — lands on a single server-rendered BIP board at `bip.um.suwalki.pl/ogloszenie_s/`. ZBM w Suwałkach TBS manages municipal housing stock but does not run its own flat auctions; it posts rental/TBS offers on `zbm.suwalki.pl`. Closest structural analog to existing adapters is **Bytom** (low volume, single BIP board, SmartSite/BIT platform), but Bytom has higher flat-auction frequency.

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** The city Prezydent Miasta Suwałk runs *przetarg ustny nieograniczony* for municipal property including:
- **Land parcels** (działki niezabudowane): the dominant type — multiple rounds per batch, e.g. działki nr 31946/xx series (7 plots), ul. Zachodniej, ul. Studzieniczne, ul. Edwarda Lecha Wojczyńskiego — active in 2025–2026.
- **Built-up properties / commercial** (nieruchomości zabudowane): e.g. ul. Tadeusza Kościuszki 120, ul. Dubowo I 18, ul. Popiełuszki — with result notices published.
- **Residential flats** (lokale mieszkalne): **CONFIRMED but rare**. One flat auction observed on the live BIP board:
  - First auction 2026-01-22: *lokal mieszkalny nr 2 przy ul. Sejneńskiej 77* — result unknown (no "informacja o wyniku" for this unit found in the visible list).
  - Second auction 2026-04-20: same flat, same address — indicating the first round failed (negative result → second attempt).
  - No further flat auction announcements visible in the scrollable board (Jan 2025 – Jun 2026 range).

**Critical caveat — bezprzetargowy dominates flats:**
The BIP board contains repeated entries of:
- *Wykaz lokali stanowiących własność Miasta Suwałk przeznaczonych do sprzedaży w drodze bezprzetargowej na rzecz najemców* — e.g. 2025-12-22, 2026-06-10. These are batches of sitting-tenant buyouts, NOT open auctions.
- A February 2025 presidential decree (Zarządzenie Nr 66/2025, 2025-02-19) explicitly grants a *bonifikata* (discount) for *sprzedaży bezprzetargowej lokali mieszkalnych na rzecz najemców*.

This confirms the standard PL pattern: Suwałki preferentially sells flats to tenants at a discount, bypassing public auction. Open flat auctions arise only for units that have no eligible tenant (vacant or tenant-declined).

**Volume estimate:** ~1 flat per year at auction; ~5–15+ land/commercial auctions per year. The flat auction stream is **very thin**.

## 2. Where published? (hosts + boards, with URLs)

### Primary board — City BIP (all property auctions + results)
- **Host:** `bip.um.suwalki.pl` (Urząd Miejski w Suwałkach, Biuletyn Informacji Publicznej)
- **Board URL:** <https://bip.um.suwalki.pl/ogloszenie_s/>
  - Path label: *Sprzedaż, dzierżawa i najem nieruchomości*
  - Contains: auction announcements, result notices (*Informacja o wyniku przetargu*), *wykaz* listings (bezprzetargowy), lease/rental notices — all in one flat list ordered by date descending.
  - Result notices confirmed: e.g. *Informacja o wyniku przetargu ustnego ograniczonego dz. 33914/40* (2026-06-26), *Informacja o wyniku drugiego przetargu ustnego nieograniczonego dz. 32662/27* (2026-06-26), *Informacja o wyniku czwartego przetargu* ul. Zachodniej (2026-06-26), *Informacja o wyniku przetargu, działka nr 11433/5* (2026-03-06).
  - **No dedicated flat-auction result notice found** in the visible board history — the Sejneńska 77 flat is still in-progress (on 2nd round). Cannot confirm achieved-price field format for flats without fetching a historical flat result notice.
- **Secondary/mirror:** `um.suwalki.pl/ogloszenia,4163` — the city main website duplicates some auction announcements (found przetarg notices for Kościuszki 120, działki budowlane dla młodych program). Less structured than BIP, but same content.

### ZBM w Suwałkach TBS (housing manager — NOT a flat-auction publisher)
- **Website:** <https://zbm.suwalki.pl/>
- **BIP:** <https://bip.zbm.suwalki.eu/>
- Scope: manages ~4000 municipal + TBS units; publishes rental vacancies, "Mieszkanie za remont" program, public procurement (construction contracts). Does **not** publish property-sale auctions.
- Public procurement section (construction, services): <https://bip.um.suwalki.pl/Przetargi_sekcja/zamwienia_publiczne_zbm_w_suwakach_tbs_sp_z_oo/> — irrelevant to flat-sale scraping.

### Monitor Urzędowy (secondary aggregator)
- <https://monitorurzedowy.pl/office/1596/urzad-miasta-suwalki> — republishes some city notices; not a canonical source.

## 3. Format + rendering

- **Platform:** SmartSite by BIT Sp. z o.o. (`meta-generator: SmartSite by BIT Sp. z o.o. - https://www.bit-sa.pl [web1.localdomain]`) — same vendor used in other PL city BIPs (e.g. pattern matches Łomża/Białystok in the same voivodeship).
- **Rendering:** Server-rendered HTML. The board at `/ogloszenie_s/` returns a full paginated list as HTML with no JavaScript gating. Items are `<li>` links with slug-based URLs.
- **Item page format:** Each announcement is a separate HTML page (slug: `ogloszenie-z-dnia-YYYY-MM-DD-...`). Content is rendered HTML text (born-digital, not scanned). Page body includes full auction text — address, lot number, area, starting price (*cena wywoławcza*), deposit (*wadium*), auction date.
- **TLS:** HTTPS, standard cert, no bot blocks observed. Pages fetched without auth or cookie consent barriers (cookie banner present but non-blocking for content access).
- **PDF:** Not the primary format. Auction texts appear inline in HTML. Some older or supplementary docs may be attached as PDF — not confirmed from the live fetch.
- **Pagination:** Board uses standard numeric pagination (page=1, page=2…). No JS infinite scroll.
- **No API / no JSON feed** observed.

## 4. Volume + achieved-price stream

| Category | Approximate annual volume (2025–2026) | Result notice published? |
|---|---|---|
| Land parcels (działki) | 15–25 auctions/year (multiple rounds per lot) | Yes — inline HTML on same board |
| Built / commercial | 3–6 auctions/year | Yes — inline HTML on same board |
| Residential flats (lokale mieszkalne) | **~1/year** (only Sejneńska 77 observed) | Not yet confirmed (flat still in-progress) |
| Bezprzetargowy flat sales to tenants | 2–4 batch *wykaz* per year | n/a (no price; not an auction) |

**Achieved-price data for flats:** The result notice format for land auctions is confirmed (e.g. "Informacja o wyniku przetargu…" pages exist and are published on the board). By analogy, a flat result notice would follow the same pattern and include the achieved price. However, **no completed flat auction result notice was found in the live board** — the only flat on record is still running its second round. This means the achieved-price schema for flats cannot be live-verified; it is inferred from land/commercial result notices (DESK assumption).

**Volume conclusion:** One flat auction per year is below the threshold for a useful data stream. Even if a result notice with price is published, a scraper would yield ~1 record/year of flat sale data — insufficient for any price-signal use case.

## 5. Adapter effort + verdict

**Closest analog:** Bytom (Śląskie) — single BIP board, SmartSite/BIT platform, HTML server-rendered, result notices in-band. Bytom has higher flat-auction frequency (~5–10/year). Suwałki is structurally identical but with far lower volume.

**Build effort if pursued:** Low-to-Medium.
- The board is a clean paginated HTML list with consistent slug format — straightforward to scrape.
- Item pages are born-digital HTML — no OCR needed.
- No auth, no bot blocks, no JS SPA.
- Result notice and announcement are on the same board — no second URL needed.
- Blocker: filtering flat auctions from land/commercial auctions requires keyword matching on title text (e.g. "lokal mieszkalny" in slug/title).

**Risks / blockers:**
1. **Volume is the hard blocker.** ~1 flat auction per year makes Suwałki a near-zero-signal source. All investment in an adapter yields negligible data.
2. **Bezprzetargowy dominance.** The city's stated policy (Zarządzenie Nr 66/2025) is to sell flats to tenants at a discount, not at open auction. Open auctions are the residual case (vacant units). This structural bias is unlikely to change.
3. **Result notice for flats unverified.** Cannot confirm price field format without a completed flat auction to inspect. (DESK inference only.)
4. **Mixed board.** The board mixes flat auctions, land auctions, bezprzetargowy notices, lease notices, and errata — any scraper must filter carefully to avoid false positives.

**VERDICT: NO-BUILD.** Volume (≈1 flat/year) is too low to justify a dedicated adapter. If Suwałki flat auction frequency increases or if land+commercial data is also in scope for the project, revisit — the technical lift is low. For now, skip.

---

*Sources (LIVE-VERIFIED unless noted):*
- BIP board (live fetch 2026-06-27): <https://bip.um.suwalki.pl/ogloszenie_s/>
- Flat auction announcement (1st round): <https://bip.um.suwalki.pl/ogloszenie_s/ogloszenie-z-dnia-2026-01-22-ogloszenie-o-przetargu-ustnym-nieograniczonym-lokal-mieszkalny-nr-2-przy-ul-sejnenskiej-77-w-suwalkach.html>
- Flat auction announcement (2nd round): <https://bip.um.suwalki.pl/ogloszenie_s/ogloszenie-z-dnia-2026-04-20-ogloszenie-o-drugim-przetargu-ustnym-nieograniczonym-lokal-mieszkalny-nr-2-na-dzialce-nr-249272-przy-ulicy-sejnenskiej-77-w-suwalkach.html>
- Bezprzetargowy flat wykaz (2026-06-10): <https://bip.um.suwalki.pl/ogloszenie_s/ogloszenie-z-dnia-2026-06-10-wykaz-lokali-stanowiacych-wlasnosc-miasta-suwalk-przeznaczonych-do-sprzedazy-w-drodze-bezprzetargowej-na-rzecz-najemcow.html>
- Zarządzenie Nr 66/2025 (bonifikata bezprzetargowej): <https://bip.um.suwalki.pl/zarzadzenie_s/zarzadzenie-nr-66-2025-w-sprawie-udzielenia-bonifikaty-od-ceny-sprzedazy-lokali-mieszkalnych-stanowiacych-mienie-gminne-miasta-suwalki-przeznaczonych-do-sprzedazy-bezprzetargowej-na-rzecz-najemcow.html>
- Result notice example (land, live): <https://bip.um.suwalki.pl/ogloszenie_s/ogloszenie-z-dnia-2026-06-26-informacja-o-wyniku-przetargu-ustnego-ograniczonego-dz-3391440-polozonej-przy-ul-czeslawa-milosza-w-suwalkach.html>
- ZBM w Suwałkach TBS: <https://zbm.suwalki.pl/>
- ZBM BIP: <https://bip.zbm.suwalki.eu/>
