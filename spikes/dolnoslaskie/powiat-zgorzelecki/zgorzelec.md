# Spike — Zgorzelec (Dolnośląskie · powiat zgorzelecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miejska Zgorzelec (Urząd Miasta) sells municipal property — including **lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Announcements and results are published on the city BIP `zgorzelec.bip.info.pl`, which runs the **bip.info.pl** hosted CMS: clean server-rendered HTML, dated article lists, comma-path document URLs (`dokument,iddok,NNNN,idmp,MM,r,r`). Dedicated "Ogłoszenia o przetargu" board plus a separate "Rozstrzygnięcia" (results) board. Volume is low-to-modest and mixed with land; current active board skews to land, but flat sales recur (Kościuszki 2/3, Staszica 5/4, Domańskiego 2/1 confirmed). Closest analog: any small Dolnośląskie bip.info.pl gmina (Złotoryja / Lwówek Śląski pattern). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Urząd Miasta Zgorzelec (Wydział Gospodarki Nieruchomościami, symbol WGN) runs `ustny przetarg nieograniczony` for sale of municipal property. A standing procedural page is titled **"Sprzedaż lokali mieszkalnych i niemieszkalnych oraz nieruchomości zabudowanych i niezabudowanych w drodze przetargu"** — flats are an explicit, recurring category. Confirmed lokal-mieszkalny sale auctions (via search index + BIP):
- ul. Kościuszki 2/3 — I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego (BIP dokument iddok 5842, legacy host).
- ul. Staszica 5/4 — ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego + oddanie w użytkowanie wieczyste udziału w gruncie.
- ul. Domańskiego 2/1 — ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego (grunt UM Zgorzelec).

The active "Ogłoszenia o przetargu" board on the day of this spike carried 1 land auction (ul. Francuska, III ustny przetarg na sprzedaż nieruchomości niezabudowanej, ważne do 04.08.2026) + 1 conservation-works contract — i.e. flat auctions cycle in and out rather than being permanently open, and the mix includes land. Both natural and legal persons may bid; 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.info.pl CMS):**
- Ogłoszenia o przetargu (announcements): `https://zgorzelec.bip.info.pl/index,idmp,32,r,r`
- Rozstrzygnięcia (results / informacja o wyniku): `https://zgorzelec.bip.info.pl/index,idmp,34,r,r`
- Standing sale-procedure page: `https://zgorzelec.bip.info.pl/dokument,iddok,51,idmp,589,r,r`
- Tablica ogłoszeń: `https://zgorzelec.bip.info.pl/index.php?idmp=50&r=r`
- Yearly archives: `https://zgorzelec.bip.info.pl/index.php?r=r&idmp=714` (2023), `idmp,394` (archive)
- Document URL pattern: `dokument,iddok,NNNN,idmp,MM,r,r` (also `dokument.php?iddok=NNNN&idmp=32&r=r`, printable `dokument_druk.php?iddok=NNNN`).

**Legacy host (older notices, still indexed):** `bip.um-zgorzelec.dolnyslask.pl` (dolnyslask.pl regional BIP) — e.g. `dokument_druk.php?iddok=5842` (Kościuszki 2/3 flat). New authoritative source is `zgorzelec.bip.info.pl`.

**Do NOT confuse** with `bip.gmina.zgorzelec.pl` — that is the rural **Gmina Zgorzelec** (separate JST), out of scope; our target is the town Gmina Miejska Zgorzelec.

Contact: Wydział Gospodarki Nieruchomościami, tel. 75 77 59 900 w. 0174/0175/0170; ul. Domańskiego 6.

## 3. Format + rendering
- **Server-rendered HTML** — bip.info.pl hosted CMS. Article lists are dated HTML; individual notices are HTML documents at `dokument,iddok,...`. Confirmed live via fetch of the announcements board and the sale-procedure page (both plain server HTML, no JS gate).
- **No SPA, no auth, no CAPTCHA** observed.
- Full ogłoszenia are typically inline HTML text; some longer notices may attach a **born-digital PDF** — handle with `pdfText` if encountered (OCR unlikely on this CMS).
- Printable variant (`dokument_druk.php`) offers a clean text version if the styled page is noisy.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. A handful of property auctions run per year across the mixed board (flats + land + occasional lokal użytkowy). Flat auctions recur but are not high-frequency; expect ~a few flats/year, some as II/III przetarg (repeat when unsold).
- **Achieved-price stream:** YES — a dedicated **Rozstrzygnięcia** board (`idmp,34`) publishes `informacja o wyniku przetargu` notices (cena osiągnięta / nabywca, or wynik negatywny). Announcement board carries `cena wywoławcza`; result board carries the hammer price. Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** Small Dolnośląskie **bip.info.pl** gmina — **Złotoryja** / **Lwówek Śląski** pattern (identical CMS: `index,idmp,NN,r,r` boards + `dokument,iddok,...` docs + separate results board). Clone that shape.
- **CMS family:** bip.info.pl hosted BIP (server-rendered HTML; WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms — plain HTML tables/articles).
- **Effort:** **LOW.** List board (idmp,32) → article fetch → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round); second pass over results board (idmp,34) for cena osiągnięta. Filter out land/dzierżawa/contracts. Optionally crawl yearly archives for backfill (bounded).
- **Blockers:** None. No rate-limit/auth signals. Only watch-item: separate announcement vs result boards, and a mixed property/land/procurement stream (classify + drop non-flat where flats are the target — though land is also in-scope for the wider dataset).

**VERDICT: BUILD (Low effort)** — recurring municipal flat auctions on a clean bip.info.pl server-HTML BIP with a dedicated results board; standard Dolnośląskie analog, no blockers.
