# Spike — Kraśnik (Lubelskie · powiat kraśnicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Kraśnik auctions only land/plots (działki) at ustny przetarg nieograniczony. Municipal flats are sold exclusively bezprzetargowo (preferential sales to sitting tenants on application). No achieved-price stream exists for flat auctions because flat auctions do not happen. The BIP is a standard e-biuletyn CMS: HTML listings with attachments as PDF. Volume: ~2–4 land auctions/year from Urząd Miasta; zero residential flat auctions found across full adradar history (2024–2026). NO-BUILD.

---

## 1. Sells municipal property at auction?

**Yes, but land only.** Confirmed at adradar and BIP e-biuletyn:

- **May 2026**: Urząd Miasta Kraśnik ran two ustny przetarg nieograniczony for undeveloped land (działki niezabudowane) in the Stacja Kolejowa area — call prices 922,500 zł (10,000 m²) and 1,150,050 zł (12,466 m²). [Source: adradar, organizer = Urząd Miasta Kraśnik]
- **March 2026**: fourth open-bid auction for undeveloped land (confirmed via search snippet from BIP history popup).
- **June 2026 wykaz** (Zarządzenie Nr 275/2026): a single 73 m² urban plot (działka Bp niezabudowana) put to *przetarg ustny nieograniczony* — not a flat.

**No ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych found.** All flat-related BIP/adradar/Monitor Urzędowy activity for Urząd Miasta Kraśnik is:
- *wykazy* for plots and occasional commercial properties
- The "Raport o stanie miasta 2023" snippet confirmed that city started selling municipal residential units to tenants (bezprzetargowo) since 2016 — the bezprzetargowy/tenant-buyout route.

**TBS in Kraśnik**: Kraśnik has a TBS housing estate (osiedle Piaski, two blocks). TBS law prohibits outright purchase by tenants; residents were fighting their manager in 2023 over blocked buyout. TBS flats never go to open public auction. No city-owned housing manager (Zakład Gospodarki Mieszkaniowej/TBS miejski) was identified that separately runs flat auctions.

---

## 2. Where published? (hosts + boards, URLs)

| Publisher | Role | URL |
|---|---|---|
| Urząd Miasta Kraśnik — BIP e-biuletyn | Primary board: przetargi nieruchomości + wyniki | https://umkrasnik.e-biuletyn.pl/index.php?id=187 |
| Urząd Miasta Kraśnik — Monitor Urzędowy | Supplementary wykazy nieruchomości do sprzedaży | https://monitorurzedowy.pl/office/2309/urzad-miasta-krasnik |
| Adradar Monitor Przetargów | Third-party aggregator (confirms all UM auctions are grunty/działki) | https://przetargi.adradar.pl/p/a/12351/Kra%C5%9Bnik/a |
| Gmina Kraśnik (wiejska) BIP — separate entity | Rural gmina surrounding the city; separate auction stream (also land) | https://krasnik.e-bip.eu/index.php?id=78 |

**Old/inactive BIP**: https://umkrasnik.bip.lubelskie.pl — marked NIEAKTUALNY, redirects to e-biuletyn.

**Result notices (wyniki)**: Published as popup/history entries on the same BIP board (e.g. `index.php?id=187&p1=historia&p2=10661&show=popup`). The popup URL returned empty on direct fetch — likely JavaScript-gated. Achieved prices for land are in these history records but are not structurally accessible without JS rendering.

---

## 3. Format + rendering

- **BIP engine**: e-biuletyn.pl (SaaS CMS, not gov.pl standard). Listings page (`id=187`) is server-rendered HTML with a table/list of items. Each item links to a detail page.
- **Announcement body**: HTML in-page (table with property description, price, dates) — like the June 2026 wykaz fetched from monitorurzedowy.pl (which mirrors BIP content). Parseable without OCR.
- **Attachments**: PDF, signed by Burmistrz. E.g. `Wykaz Ośrodek z podpisem.pdf` at `https://monitorurzedowy.pl/announcement/attachment/15759`. Likely text-PDF (not scanned) for recent announcements.
- **Result/wyniki notices**: Accessible via BIP history popup (`p1=historia`); these pages returned empty on direct fetch — possible JavaScript or session requirement. Adradar successfully aggregates them, suggesting they are crawlable.
- **Auth/bot blocks**: No login required for public BIP pages. The `e-biuletyn.pl` platform is standard and crawler-friendly for static listings. The popup history endpoint may require JS rendering (returned blank on `web_fetch`).
- **Monitor Urzędowy**: Fully fetchable HTML, mirrors BIP wykazы.

---

## 4. Volume + achieved-price stream

**Land auctions (Urząd Miasta Kraśnik, organizer = Miasto)**:
- 2026: at least 3–4 land auctions confirmed (March 4th auction, May two auctions at 922k + 1.15M, June wykaz for 11,800 plot)
- 2025–2024: adradar showed 13 pages of results for "Kraśnik" total (all organizers: komornik, syndyk, miasto) — UM Kraśnik land auctions appear to run ~2–4/year

**Residential flat auctions from Urząd Miasta Kraśnik**: ZERO found across all sources. All flat/mieszkanie listings on adradar for Kraśnik are from KOMORNIK (bailiff, private debt enforcement) — not municipal.

**Achieved-price stream for land**: Exists in BIP history popup entries but is JavaScript-gated; not directly scrapable. Monitor Urzędowy does not publish achieved prices.

---

## 5. Adapter effort + verdict

**Closest analog**: None of the existing BUILD adapters (Gliwice/Zabrze/Bytom/Kraków/Tarnowskie Góry) — all those cities have dedicated housing managers (ZBM, ZGM, TBS miejski) running flat-sale przetargi. Kraśnik matches the **generic-city-BIP-property = land/tenant** heuristic exactly.

**Blockers**:
1. No flat auctions exist — the primary data stream this project tracks is absent.
2. Municipal flat sales in Kraśnik are bezprzetargowy (tenant-application, no open auction, no public achieved-price).
3. The TBS in Kraśnik (private/non-municipal) legally cannot sell to tenants at auction; it is not a city housing arm.
4. BIP przetargi history popup is JS-gated; achieved prices for land (the only auction type present) are not structurally accessible.

**Risks if reconsidered later**:
- Volume of land auctions (~2–4/year) is very low even if pivoting to grunty tracking.
- e-biuletyn.pl popup JS-gate would require headless browser or adradar as proxy source.

**Verdict**: NO-BUILD. Kraśnik Miasto conducts no public flat auctions. Municipal flats go to sitting tenants bezprzetargowo via application to Urząd Miasta (ul. Lubelska 84). Low city population (~34,000), no dedicated housing manager entity, and a land-only auction pattern confirm this as outside scope.

---

## Sources

- BIP Urząd Miasta Kraśnik — Przetargi: https://umkrasnik.e-biuletyn.pl/index.php?id=187
- Monitor Urzędowy — Urząd Miasta Kraśnik: https://monitorurzedowy.pl/office/2309/urzad-miasta-krasnik
- Live wykaz (June 2026, działka niezabudowana): https://monitorurzedowy.pl/announcement/1709010/wykaz
- Adradar — Kraśnik all auctions: https://przetargi.adradar.pl/p/a/12351/Kra%C5%9Bnik/a
- jakiwniosek.pl — bezprzetargowy tenant buyout confirmed: https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/krasnik
- InfoKraśnik — TBS dispute (TBS ≠ city-owned): https://infokrasnik.pl/2023/05/spor-mieszkancow-tbs-z-zarzadca/
- BIP Gmina Kraśnik (wiejska, separate entity): https://krasnik.e-bip.eu/index.php?id=78
