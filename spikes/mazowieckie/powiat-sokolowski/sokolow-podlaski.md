# Spike — Sokołów Podlaski (Mazowieckie · powiat sokołowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD — town sells flats only via wykaz→bezprzetargowo na rzecz najemcy (art. 34 pierwszeństwo); every open oral auction is LAND or commercial lease. ~0 open flat-sale auctions.

## TL;DR
Gmina Miasto Sokołów Podlaski (Urząd Miasta, Burmistrz — Insp. d/s Mienia Komunalnego) publishes all property notices on the city BIP `bip.sokolowpodl.pl`, a **React JS-SPA on the nv.pl CMS** backed by a clean **JSON API** (`/api/menu/{id}/articles`, `/api/articles/{id}`) with **born-digital PDF** attachments. The single "Nieruchomości" board (menu id 739) carries the full 2023–2026 stream (51 articles): *wykazy*, *ogłoszenia o przetargu*, and *informacje o wyniku przetargu*. The decisive finding: **flats (lokale mieszkalne) never appear in an open oral auction.** Flats surface only in *wykazy nieruchomości przeznaczonych do sprzedaży*, and those wykazy invoke **art. 34 ust.1 pkt 1 i 2 ustawy o gospodarce nieruchomościami** (tenant pre-emption) — i.e. sold **bezprzetargowo na rzecz najemcy**, not by przetarg. Every actual *przetarg ustny nieograniczony* on the board is for **land (działki: Budowlana, Al. 550-lecia, Pogodna, Dołowa, Cmentarna)** or **najem lokalu użytkowego/handlowego** (commercial lease). Zero open flat-sale auctions/year. Technically scrapeable (nice JSON API), but the in-scope stream (open flat auctions) is absent → NO-BUILD.

## 1. Sells municipal property at auction?
**Partly — but NOT flats at open auction.**
- **Open oral auctions (przetarg ustny nieograniczony) DO run — for LAND and LEASE only.** Confirmed auction announcements ("Ogłoszenie o przetargu"), all non-flat:
  - działka ul. Budowlana (dz. 1872/17, 1472/17) — sprzedaż nieruchomości niezabudowanej.
  - działka ul. Aleja 550-lecia (dz. 3480/3) — II przetarg sprzedaż.
  - działki ul. Pogodna 3085 i 3086 — III przetarg (repeat, unsold land).
  - działka ul. Dołowa (nr 127/2), działki ul. Cmentarna.
  - **najem lokalu usługowego** pow. 103 m² / **najem pawilonu handlowego w parku** — commercial LEASE auctions, not sale.
- **Flats (lokale mieszkalne) are sold, but bezprzetargowo.** They appear only in *wykazy nieruchomości przeznaczonych do sprzedaży* (designation lists), e.g. Zarządzenie Burmistrza 187/2025: Lokal ul. Wyspiańskiego 4/24 (36,72 m², 228 000 zł) and ul. Wolności 10/9 (48,10 m², 293 000 zł). Each wykaz states the 6-week window for **osoby którym przysługuje pierwszeństwo w nabyciu na podstawie art. 34 ust.1 pkt 1 i 2** — the classic **sale to the sitting tenant (bezprzetargowo)**, no oral auction. Additional flat wykazy: "wykaz lokal mieszkalny", "zarz wykaz lokale mieszkalne", "zarz wykaz mieszkania", ul. Piękna 4 m 1 — all the same wykaz→pre-emption pattern.
- No dedicated municipal housing manager (ZGM/ZBM/TBS) publishes flat auctions; the Urząd Miasta (Wydział/Insp. Mienia Komunalnego) handles everything directly.

**Disambiguation:** target is the TOWN **Miasto Sokołów Podlaski** (gmina miejska, Burmistrz, BIP `bip.sokolowpodl.pl`). Do NOT confuse with the rural **Gmina Sokołów Podlaski** (Wójt), whose separate BIP is `sokolowpodlaski.biuletyn.net` (biuletyn.net CMS) — out of scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (nv.pl React SPA + JSON API):** `http://bip.sokolowpodl.pl`
- Nieruchomości board (all property notices — wykazy, przetargi, wyniki): `http://bip.sokolowpodl.pl/m,739,nieruchomosci.html`
  - JSON list API: `http://bip.sokolowpodl.pl/api/menu/739/articles?limit=60&offset=0` (paginated; `total`, `articles[]`; each item has `id`, `link` slug, `columnFields` incl. title fieldId 37 + publish date fieldId 41).
  - Article detail API: `http://bip.sokolowpodl.pl/api/articles/{id}` (JSON; menu path + content + attachment refs).
  - Parent boards: Tablica ogłoszeń `m,737,tablica-ogloszen.html`; Menu podmiotowe `m,616,...`.
- Attachment (PDF) download: `http://bip.sokolowpodl.pl/e,pobierz,get.html?id={fileId}`.
- Zamówienia publiczne (procurement, separate): `http://bip.sokolowpodl.pl/m,619,zamowienia-publiczne.html`.
- Note: HTTPS on this host serves a mismatched `*.nv.pl` certificate — **fetch over HTTP** (or the API; TLS SNI fails).

**Achieved-price stream:** "Informacja o wyniku przetargu" articles live on the same board (e.g. ids 23824, 23448, 23345/23344, 23082/23081, 22952/22948, 22731, 22634) — but they report LAND / commercial-lease results (e.g. "wynik przetargu dz 126/2", "wynik przetargu — lokal w parku"), not flats.

## 3. Format + rendering
- **JS-SPA (React) on the nv.pl CMS** — raw HTML is an empty `<div id="root">` + webpack chunks (no server-rendered content). **However, a clean public JSON API backs it** (`/api/menu/{id}/articles`, `/api/articles/{id}`), so **no Playwright is needed** — fetch JSON directly.
- **Attachments are born-digital PDFs** — `pdftotext` extracts clean text (verified on the flat wykaz PDFs; table columns come out order-scrambled but readable). No OCR needed.
- No auth, no CAPTCHA. Only quirk: HTTP-only (HTTPS cert mismatch).

## 4. Volume + achieved-price stream
- **Open flat-sale auctions: ~0/year** (none in the entire 2023–2026 board of 51 articles). This is the disqualifier.
- **Open auctions overall:** low — a handful/year, exclusively LAND (działki, often II/III przetarg when unsold) plus occasional commercial-lease (najem) auctions.
- **Flat sales:** occur via wykaz→bezprzetargowo na rzecz najemcy (art. 34), a few flats/year — no bid/hammer-price event, only an appraised "wartość lokalu" in the wykaz.
- **Achieved-price stream exists** (Informacja o wyniku przetargu, born-digital PDF/HTML) but covers land + commercial lease, never flats.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Technical closest analog:** Logonet-style JSON-API BIP (`/api/menu/<board>/articles` → `/api/articles/<id>` → born-digital PDF), similar in shape to `tarnowskie-gory`/`kedzierzyn-kozle`; effort would be **Low** if the in-scope stream existed — the API is clean and there is exactly one board to crawl.
- **Blocker (decisive):** **no open flat-sale auction stream.** Flats leave municipal hands only bezprzetargowo to tenants (art. 34 pierwszeństwo); the przetarg stream is land + commercial lease. Building this adapter would capture zero in-scope flat auctions.
- **Effort:** — (N/A).

**VERDICT: NO-BUILD** — Miasto Sokołów Podlaski runs open oral auctions only for land (działki) and commercial lease; municipal flats are disposed of via wykaz→bezprzetargowo na rzecz najemcy (art. 34), with ~0 open flat-sale auctions across 2023–2026. Source is technically clean (nv.pl React SPA with a public JSON API + born-digital PDFs), but there is no in-scope flat-auction stream to extract.
