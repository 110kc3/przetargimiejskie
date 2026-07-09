# Spike — Zambrów (Podlaskie · powiat zambrowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land-only skew; negligible municipal flat-auction volume).

## TL;DR
Gmina Miasto Zambrów (town gmina miejska; Burmistrz Miasta Zambrów, ul. Fabryczna 3, 18-300 Zambrów) does sell municipal property via **open oral auction** (`przetarg ustny nieograniczony` / `ograniczony`), published on the city BIP `bip.zambrow.pl` (server-rendered HTML `/artykul/<slug>` articles, born-digital PDF attachments under `/pliki/zambrow/zalaczniki/<id>/…`). But the sale stream is overwhelmingly **land** (niezabudowane działki, incl. MŚP-limited auctions), plus one-off `przetarg pisemny ofertowy` for a used car and coal (`węgiel`) notices. Municipal **lokal mieszkalny** auctions are effectively absent: the only flat found in ~2 years was a single **spółdzielcze własnościowe prawo do lokalu** (a cooperative-ownership right the city held), Białostocka 31/113, 41,11 m², cena wywoławcza 198 073 zł, przetarg 19.02.2025. No dedicated municipal housing manager (ZGM/ZBM/TBS) publishing flat auctions. This is the classic podlaskie town profile the heuristic flags NO-BUILD. Technically buildable (HTML + PDF), but there is no flat-auction stream to justify an adapter.

## 1. Sells municipal property at auction?
**YES for property in general — but essentially NO flats.** The Burmistrz Miasta Zambrów runs `przetarg ustny nieograniczony` and `przetarg ustny ograniczony` (do sektora mikro/małych/średnich przedsiębiorstw) for sale of city-owned property. Both natural and legal persons may bid; auctions held in room 214, UM Zambrów, ul. Fabryczna 3.
- Confirmed **flat (one-off, cooperative right):** `Ogłoszenie … o przetargu ustnym nieograniczonym` — sprzedaż **spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 113**, ul. Białostocka 31, pow. użytkowa 41,11 m² (I piętro, 2 pokoje + piwnica 2,57 m²), KW LM1Z/00036724/3, cena wywoławcza 198 073 zł, przetarg 19.02.2025 (znak GP.6840.6.2023). Followed by a result notice (`Informacja o wyniku przetargu … na sprzedaż spółdzielczego własnościowego prawa do lokalu`).
- The remainder of the board is **land** (`przetarg ustny nieograniczony/ograniczony na sprzedaż nieruchomości niezabudowanej`, e.g. ul. Przemysłowa dz. 1086/4, 1086/5, 1,0739 ha; multiple MŚP-limited land auctions + drugi/trzeci przetarg repeats), plus `najem` (rental), `przetarg pisemny ofertowy na sprzedaż samochodu osobowego` (car), and `sprzedaż końcowa węgla` (coal). No `lokal mieszkalny` full-ownership municipal flat auctions observed.
- No dedicated Zambrów housing manager (ZGM/ZBM/TBS) auctioning flats — flats (when any) are sold directly by the Burmistrz via the city BIP. Search for a Zambrów ZGM/TBS flat-sale board returned nothing city-specific.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.zambrow.pl`):**
- Combined announcements + results board (Obwieszczenia i ogłoszenia → Ogłoszenia): `https://bip.zambrow.pl/artykul/ogloszenia` — carries both `Ogłoszenie … o przetargu` (announcements, `cena wywoławcza`) and `Informacja o wyniku przetargu` (results, `cena osiągnięta`) interleaved.
- Property section: `https://bip.zambrow.pl/artykul/nieruchomosci-i-grunty` (menu/landing).
- Article URL pattern: `/artykul/<long-slug>` (slug-based, server-rendered HTML).
- Attachment (PDF) pattern: `/pliki/zambrow/zalaczniki/<id>/<name>.pdf` — e.g. flat announcement `…/4924/przetarg-spoldzielcze-wlasnosciowe-prawo-do-lokalu-mieszkalnego-01-2025.pdf`; flat result `…/5039/informacja-o-wyniku-przetargu-na-spoldzielcze-wlasnosciowe-prawo-do-lokalu.pdf`.
- Mirror on the promo site `https://zambrow.pl/przetargi/…` (WordPress; duplicates some notices) — not authoritative, ignore.

**Do NOT confuse** with rural **Gmina Zambrów** (Wójt Gminy Zambrów, `ugzambrow.pl` / `bip.gov.pl` subject 4762) — separate JST, out of scope. Target is TOWN **Miasto Zambrów** (BIP subject 5058).

**Access note:** WebFetch 403/404s on this host; fetch succeeds with a browser User-Agent (Pi Polish IP). No auth/CAPTCHA once UA is set.

## 3. Format + rendering
- **Server-rendered HTML** — Bootstrap + Nunito Sans + DataTables theme; breadcrumb `Strona główna › Obwieszczenia i ogłoszenia › Ogłoszenia`. No SPA/JS gate. Page carries a "Wrota Podlasia" footprint (regional podlaskie BIP family), own domain `bip.zambrow.pl`, `/artykul/<slug>` + `/pliki/zambrow/zalaczniki/` — CMS family = HTML article board with born-digital PDF attachments (Logonet/IDcom-class, not bip.info.pl).
- **Announcements:** full ogłoszenie text is **inline HTML** (address, powierzchnia użytkowa, KW, cena wywoławcza all present in-band) AND a duplicate **born-digital PDF** attachment.
- **Results:** short HTML stub (title only) + the substance (`cena osiągnięta` / `nabywca` / negatywny) in a **born-digital PDF** attachment → needs `pdfText`.
- UA gating is the only access wrinkle; pass a browser UA via `getText(url,{userAgent})`.

## 4. Volume + achieved-price stream
- **Flat volume: ~0/yr.** Across the visible ~2-year board (2023–2025) exactly **one** residential unit (a cooperative-ownership right, not even a standard municipal lokal mieszkalny + grunt). No recurring municipal flat auctions. Overall property-sale board is low volume and land-dominated (a handful of land auctions/yr, many as II/III przetarg repeats).
- **Achieved-price stream: YES (for the whole stream).** `Informacja o wyniku przetargu` notices publish outcome; `cena osiągnięta` lives in the attached born-digital PDF. Announcement `cena wywoławcza` is inline HTML. Parseable — but the parsed rows would be almost entirely land, not flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** an HTML-article BIP with born-digital PDF attachments — Logonet/IDcom family (`tarnowskie-gory` / `tczew`), UA-gated fetch like `bytom`/`wejherowo`. Slug-based `/artykul/<slug>` list crawl + `/pliki/zambrow/zalaczniki/` PDF fetch → `pdfText`.
- **Effort (hypothetical):** **Medium** — inline-HTML announcements are easy, but achieved prices need PDF extraction, the board is a mixed sale/rental/car/coal/MŚP stream requiring classification, and it's UA-gated.
- **Blockers to value, not tech:** the only real blocker is **no flat-auction stream**. Zambrów sells land, not municipal flats; the single "flat" was a one-off cooperative right. Building an adapter yields a land-only feed — outside the flat-auction target. Matches the podlaskie land-only NO-BUILD pattern.

**VERDICT: NO-BUILD** — Miasto Zambrów auctions municipal property on a clean, buildable HTML+PDF BIP (`bip.zambrow.pl`, `/artykul/<slug>`), but the stream is land-only; municipal flat-auction volume is effectively nil (one cooperative-ownership right in ~2 years, no ZGM/TBS flat board). Revisit only if a recurring lokal-mieszkalny stream appears.
