# Spike — Myszków (Śląskie · powiat myszkowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Myszków publishes on its city BIP `bip.miastomyszkow.pl`, a freshly-migrated **bip.net.pl v2 (BIPv2)** portal (server-HTML + born-digital PDF attachments served over a REST/JSON API `bip-api.miastomyszkow.pl`). There **is** a municipal housing manager — **Komunalny Zakład Gospodarki Mieszkaniowej (KZGM)** — the śląskie BUILD signal to check. But KZGM on the BIP is a one-article contact stub; the municipal flat stock is managed for **rental (najem)**, not sold at auction (there is even a standing *"Raport o najem lokali mieszkalnych z mieszkaniowego zasobu gminy"*). The only live auction board, **"Przetargi poza ustawą Pzp"** (cat 450), currently carries 4 car sales (Skoda Octavia) + 2 **garage-box LEASE** auctions (przetarg pisemny ograniczony na dzierżawę, ul. Słowiańska). The property-sale pipeline runs through **wykaz** lists (cat 260), and the current *"wykaz do sprzedaży"* disposes of **undeveloped land** (ul. Piękna, 130 000 / 135 000 zł). **Zero open flat-sale auctions** ("przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego"). Textbook NO-BUILD: land + lease + tenant/wykaz disposal with ~0 flat auctions.

## 1. Sells municipal property at auction?
**Not flats at open auction — NO.** Live evidence from the only asset-auction board, **"Przetargi poza ustawą Pzp"** (`/kategorie/450-...`), May–Jul 2026:
- 4× *"…w sprawie sprzedaży… składnika majątku mienia w postaci pojazdu samochodowego Skoda Octavia"* — **car** sales.
- 2× *"…przetargu pisemnego ograniczonego na oddanie w **dzierżawę** nieruchomości zabudowanych boksami garażowymi… przy ul. Słowiańskiej (dz. 6048/54, 6044)"* — garage-box **LEASE** auctions (written, restricted).
- **No flat sale auction. No `przetarg ustny nieograniczony na sprzedaż lokalu`.**

The property **sale** pipeline is via **wykaz** lists on "Ogłoszenia i informacje" (cat 260): *wykaz do sprzedaży*, *do wydzierżawienia*, *do użyczenia*, *do zbycia w formie aportu*. The current **wykaz nieruchomości przeznaczonych do sprzedaży** (Ogłoszenie Burmistrza z 02.06.2026, art 279) — PDF read live — lists two **nieruchomości niezabudowane** at **ul. Piękna** (130 000 zł and 135 000 zł): **land, not flats.**

Municipal flats: managed by **KZGM (Komunalny Zakład Gospodarki Mieszkaniowej)** for **rental** — the BIP hosts a *"Raport o najem lokali mieszkalnych z mieszkaniowego zasobu gminy"* (cat 440) and the KZGM category (cat 40) is a single info article (art 132), not an auction board. No lokal-mieszkalny sale-by-auction stream exists here. (The "Myszkowska Spółdzielnia Mieszkaniowa" flat auction seen in search is a private housing cooperative — out of scope.)

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.net.pl v2 / BIPv2):** `https://bip.miastomyszkow.pl` (alias `myszkow.bip.net.pl`).
- Asset/property auctions — "Przetargi poza ustawą Pzp": `https://bip.miastomyszkow.pl/kategorie/450-przetargi-poza-ustawa-pzp`
- Wykazy / notices — "Ogłoszenia i informacje 2026 r.": `https://bip.miastomyszkow.pl/kategorie/260-ogloszenia-i-informacje-2026-r` (parent `227-ogloszenia-i-informacje`)
- Procurement (zamówienia, not property): `https://bip.miastomyszkow.pl/kategorie/259-przetargi-i-zapytania-ofertowe`
- Housing manager KZGM (stub): `https://bip.miastomyszkow.pl/kategorie/40-komunalny-zaklad-gospodarki-mieszkaniowej` (art 132)
- Rental report: `.../kategorie/440-raport-o-najem-lokali-mieszkalnych-z-mieszkaniowego-zasobu-gminy`
- URL shape: `/kategorie/{catId}-{slug}/artykuly/{artId}-{slug}?lang=PL`. **Legacy `?c=NNN` links (indexed as "Przetargi 2024/2025", `?c=857/939`) now 200-redirect to the homepage** — not usable.

**Powiat (separate JST, out of scope):** `https://powiatmyszkowski.bip.net.pl` (also bip.net.pl) runs its own land sale auctions.

Contact: Urząd Miasta Myszkowa, ul. Kościuszki 26; wydział gospodarki nieruchomościami. KZGM Myszków (municipal housing).

## 3. Format + rendering
- **Server-rendered HTML** — bip.net.pl v2 (BIPv2). Category and article pages are plain server HTML (confirmed via curl, 150–210 KB, HTTP 200, no JS gate on content). Footer tagged `bip.net`.
- **Attachments = born-digital PDFs over a REST/JSON API.** Links point to `https://bip-api.miastomyszkow.pl/api/attachments/{id}` → **302** → `https://bip-docrepo-api.miastomyszkow.pl/api/files/{id}` (e.g. `.../files/339` = "Wykaz nieruchomości do sprzedaży.pdf", 120 KB; `/340` = "ogłoszenie wykazu.pdf"). Born-digital text PDFs → `pdfText`, no OCR needed.
- **JSON API present** (`bip-api.miastomyszkow.pl`) — BIPv2 exposes category/article data as JSON, so an adapter could pull structured lists rather than scrape HTML. No auth/CAPTCHA seen.
- On-page site search (`/wyszukiwanie`) is JS-rendered (empty shell to curl) — not needed if using the category/JSON endpoints.

## 4. Volume + achieved-price stream
- **Open flat-sale auction volume: ZERO.** No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` on the live board or in the wykaz pipeline. Any open (ustny nieograniczony) auctions that occur are **land** parcels; flats leave the stock via **rental** (KZGM) not auction.
- **Total auction cadence** on cat 450 is a trickle and off-target: car sales + garage-box **lease** auctions only.
- **Achieved-price / results stream: none for flats.** No dedicated "informacja o wyniku przetargu / rozstrzygnięcia" flat board. bip.net.pl typically posts wyniki, but there is no flat-sale flow to feed one here. Wykaz lists carry `cena` (asking) for land, not hammer prices.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** bip.net.pl(extranet.pl) server-HTML + text-PDF family (as tczew / powiat bip.net boards) — here the newer **BIPv2** variant with a `bip-api` JSON/REST attachment layer. Technically very buildable (clean HTML + JSON + born-digital PDFs, no blockers).
- **But there is no target signal to build against.** The BUILD heuristic requires recurring OPEN flat-sale auctions and/or a housing manager selling flats with a hammer-price results board. Myszków fails both: KZGM manages **rental** stock (stub on BIP), sales are **land via wykaz**, and the only przetargi are garage **leases** + car disposals. This is exactly the NO-BUILD profile: generic city-BIP skewing to land + lease/tenant disposal with ~0 open flat auctions.
- **Effort:** — (not applicable; no flat-auction stream to adapt). Re-check trigger: if a future *"I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego"* appears on cat 450, revisit — the CMS is easy.
- **Blockers:** N/A for the crawl; the blocker is content (no flat auctions), not technology.

**VERDICT: NO-BUILD** — bip.net.pl v2 city BIP; a KZGM housing manager exists but manages rental stock (no BIP sale board); live auction board = car sales + garage-box lease auctions; property sales are undeveloped land via wykaz lists; zero open municipal flat-sale auctions.
