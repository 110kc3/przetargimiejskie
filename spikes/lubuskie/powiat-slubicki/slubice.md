# Spike — Słubice (Lubuskie · powiat słubicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Słubice (miejsko-wiejska; miasto Słubice is the seat) actively sells **lokale mieszkalne** by *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* — and does so in **batches**: on the day of this spike the auction board carried **6 flats** all in a "drugi przetarg" (second-round) cycle (Wojska Polskiego 53/3, Daszyńskiego 20/3, Słowiańska 14/3, Paderewskiego 27/10, Żeromskiego 18/8, Żeromskiego 16/2), all published 2026-06-11, each with an earlier first-round notice. Published on the city BIP `bip.slubice.pl`, a **bespoke Next.js SSR BIP** (backed by `bip-api.slubice.pl` + `bip-docrepo-api.slubice.pl`), on a single board — category **193 "Sprzedaż mienia - przetargi"**. The board list and article stubs are clean **server-rendered HTML** (article titles carry full address + round), but the full auction terms live in an **attached scanned PDF** (Develop ineo copier scans → OCR required; `tesseract -l pol` reads them cleanly: e.g. Żeromskiego 18/8 = 43,68 m², cena wywoławcza 165 000 zł, wadium 15 000 zł). Closest analog: an IDcom scanned-PDF+OCR city (`tczew` / `gniezno` / `gizycko`) — HTML list board → attachment PDF → `ocrPdf`. No auth/CAPTCHA blockers; only OCR + a bespoke CMS to wire.

## 1. Sells municipal property at auction?
**YES — confirmed, high flat volume.** The **Burmistrz Słubic** announces *drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego … stanowiącego własność Gminy Słubice … wraz ze sprzedażą ułamkowej części gruntu* (OCR of the Żeromskiego 18/8 notice, verbatim). Confirmed live flat auctions on the active board (all published 2026-06-11, "drugi przetarg"):
- ul. Wojska Polskiego 53/3 — lokal mieszkalny (art. 1633)
- ul. Daszyńskiego 20/3 — lokal mieszkalny (art. 1632)
- ul. Słowiańska 14/3 — lokal mieszkalny (art. 1631)
- ul. Paderewskiego 27/10 — lokal mieszkalny (art. 1630)
- ul. Żeromskiego 18/8 — lokal mieszkalny; pow. użytkowa 43,68 m², cena wywoławcza 165 000 zł, wadium 15 000 zł, udział 0,07, KW GW1S/00003529/0 (art. 1629, OCR-confirmed)
- ul. Żeromskiego 16/2 — lokal mieszkalny (art. 1628)

Each "drugi przetarg" implies a prior first-round notice (e.g. earlier art. 1421 "Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Żeromskiego 18/8"), so flats recur across rounds. Both natural and legal persons bid; standard 10%-ish wadium. This is a genuine recurring OPEN flat-sale stream, sold in cycles of several flats at once — clearly in scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bespoke Next.js SSR):**
- Auction board (announcements): `https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi`
- Article (detail stub) URL pattern: `https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi/artykuly/<ARTID>-<slug>` (e.g. `.../artykuly/1629-ogloszenie-o-drugim-przetargu-na-sprzedaz-lokalu-mieszkalnego-slubice-ul-zeromskiego-18-8`)
- Attachment (the actual notice PDF): link in the article HTML is `/api/attachments/<ATTID>` → served from `https://bip-api.slubice.pl/api/attachments/<ATTID>` which **302-redirects** to `https://bip-docrepo-api.slubice.pl/api/files/<ATTID>` (the PDF bytes). Confirmed: attachment 2622 = "Żeromskiego 18-8.pdf", 240.96 KB, 4 pages.
- Home/API host: `bip-api.slubice.pl` (referenced in `_next` SSR page source).

**Results / achieved-price:** no separate "wyniki / rozstrzygnięcia" category exists — `informacja o wyniku przetargu` notices, when posted, land in the **same** category 193 as scanned-PDF attachments (not separately confirmed live in this spike — see §4). Category 193 is the single sale-auction board.

**Do NOT confuse** with the two other "Słubice" JSTs: **Gmina Słubice in Mazowieckie** (rural, `ugslubice.bip.org.pl` and `slubicegmina.bip.net.pl`) — different powiat, out of scope. Our target is the Lubuskie town **Gmina Słubice, powiat słubicki** (`bip.slubice.pl`).

Contact: Urząd Miejski w Słubicach, tel. 95 737 20 00.

## 3. Format + rendering
- **Board + article stubs = server-rendered HTML (Next.js SSR).** Verified with a plain no-JS `curl` of the board: raw HTML contains all article titles ("lokalu mieszkalnego" ×24, street names, `artykuly/…` hrefs) — no Playwright/`render.js` needed; `getText` + regex/DOM is enough. Article title carries the **full address** and the **round** ("drugi przetarg") for free.
- **Attachment = scanned PDF → OCR required.** `pdftotext` returns **0 characters**; PDF producer is "Develop ineo+ 451i" (office copier), CCITT-Fax/JPEG image pages. `ocrPdf` (tesseract `-l pol`, 300 dpi) reads it cleanly — verified: extracted the address, `pow. lokalu 43,68 m²`, `cena wywoławcza 165 000 zł`, `wadium 15 000 zł`, `udział 0,07`, KW number, all correctly. 4 pages/notice; the price/area table is the first page.
- **No SPA gate, no auth, no CAPTCHA.** One cross-host 302 on the attachment (`bip-api` → `bip-docrepo-api`) — the crawler must follow the redirect to fetch bytes.

## 4. Volume + achieved-price stream
- **Volume:** Modest-to-good and **batched**. 6 flats live in one second-round cycle on spike day, each with a prior first round → effectively 6+ flat auctions per cycle, plausibly one or two cycles per year (est. ~6–12 open flat auctions/year). Strong per-notice signal (one flat per article; clean address in title).
- **Achieved-price stream:** **Probable but not separately confirmed.** No dedicated results board; `informacja o wyniku przetargu` would appear in category 193 as further scanned-PDF attachments (same OCR path). The announcement PDFs already carry `cena wywoławcza`; hammer price (`cena osiągnięta`/`nabywca`) requires locating + OCR'ing the matching result notice. Treat the results stream as a build-time discovery task (crawl category 193 for `wynik` titles), not a blocker.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** an **IDcom scanned-PDF + OCR** city — `tczew` / `gniezno` / `gizycko` (HTML list board → attachment PDF → `ocrPdf`). The extraction shape is identical even though the CMS chrome differs.
- **CMS family:** bespoke **Next.js SSR BIP** (`bip.slubice.pl` + `bip-api` / `bip-docrepo-api`), not one of the named hosted families — closest to "WordPress / custom HTML" for the list crawl, IDcom-style for the OCR attachment step (ADAPTER-GUIDE §3).
- **Effort:** **MEDIUM.** List crawl of category 193 is trivial (SSR HTML, stable `artykuly/<id>` + `/api/attachments/<id>` pattern; address + round parsed straight from the title). The cost is that **every price/area/date/wadium field sits behind a scanned-PDF OCR** — route each attachment through `ocrPdf` (`-l pol`), then parse the OCR'd table (`pow. lokalu`, `cena wywoławcza`, `wadium`, `udział`, KW). Must follow the `bip-api → bip-docrepo-api` 302 to get bytes. Second pass over category 193 for `informacja o wyniku` result notices (same OCR).
- **Blockers:** None hard. Watch-items: (1) OCR-only source (no born-digital text) — commit the `ocr-cache/` so CI never re-OCRs; (2) cross-host attachment redirect; (3) results stream not on a separate board — discover within category 193 at build time; (4) disambiguate from the Mazowieckie Gmina Słubice.

**VERDICT: BUILD (Medium effort)** — a genuine recurring OPEN municipal flat-auction stream, sold in batches of several flats, on a clean Next.js SSR BIP board (category 193); the only friction is scanned-PDF → `tesseract -l pol` OCR (verified working) for the price/area/date fields. Clone the IDcom scanned-PDF+OCR analog (tczew/gniezno/gizycko).
