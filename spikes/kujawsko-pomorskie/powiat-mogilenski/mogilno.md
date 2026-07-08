# Spike — Mogilno (Kujawsko-pomorskie · powiat mogileński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort; low volume).

## TL;DR
Gmina Mogilno (miejsko-wiejska; Burmistrz Mogilna) does run open **"przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego"** — confirmed (I and II przetarg on a vacant flat, Wasielewko 18/3). Published on the city BIP `bip.mogilno.pl`, a **Nefeni** server-rendered-HTML CMS with cleanly separated boards: **Zbycie nieruchomości** (`/kategorie/98-...`), **Dzierżawa** (`/kategorie/99-...`), **Przetargi** (`/kategorie/94-...`, year-partitioned) and **Rozstrzygnięte / results** (`/kategorie/265-...`). Article URLs `/kategorie/N/artykuly/NNNN-slug`. Open flat-auction volume is **thin** — the sale board skews to land parcels, "młyn/Przemysłowa" (buildings/industrial) and bezprzetargowo tenant sales, with occasional open flat auctions. A dedicated results board gives the achieved-price stream. BUILD, but low ROI; effort Medium (classify a mixed board, possible PDF attachments).

## 1. Sells municipal property at auction?
**YES — open flat auctions confirmed (low frequency).**
- **Wasielewko nr 18 lok. 3** (wolny lokal mieszkalny nr 3 w budynku dwulokalowym) — **II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego** (following an unsold I przetarg). (bip.mogilno.pl `?a=8588` / Zbycie board)
- "Burmistrz Mogilna ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego" is a recurring announcement category.

The **Zbycie nieruchomości** board (10 items/page, paginated) otherwise carries: land przetargi (ul. Przemysłowa 2026), a "młyn" (mill/building), wykaz "nieruchomość przeznaczona do sprzedaży", and 2023-24 **bezprzetargowo na rzecz najemców** (tenant) flat sales. So open flat auctions are a minority of residential disposal — the heuristic's "land + tenant sales skew" partly applies, but a genuine open flat-auction sub-stream + results board exist.

Also present but **out of scope**: `/kategorie/99-dzierzawa-nieruchomosci` (lease auctions), and the separate **Powiat Mogileński** (`powiat.mogilno.pl`) which runs its own land przetargi — not the gmina.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP `bip.mogilno.pl` (Nefeni CMS):**
- Zbycie nieruchomości (sales): `https://bip.mogilno.pl/kategorie/98-zbycie-nieruchomosci` (legacy `?c=294`)
- Przetargi (year-partitioned hub 2023-2026): `https://bip.mogilno.pl/kategorie/94-przetargi`
- Dzierżawa (leases, out of scope): `https://bip.mogilno.pl/kategorie/99-dzierzawa-nieruchomosci`
- **Rozstrzygnięte (results / achieved price):** `https://bip.mogilno.pl/kategorie/265-rozstrzygniete`
- Article URL pattern: `/kategorie/<N>-<slug>/artykuly/<NNNN>-<slug>?lang=PL`. Legacy short forms `?c=<section>` and `?a=<article>` still resolve/redirect.

## 3. Format + rendering
- **Server-rendered HTML** — Nefeni Sp. z o.o. municipal BIP CMS (confirmed footer). Dated article lists; boards are plain HTML with pagination. No SPA, no auth, no CAPTCHA observed.
- Full ogłoszenia: article body inline HTML, often with a **PDF attachment** for the formal notice → use `pdfText` (born-digital likely; `ocrPdf` fallback if a scan). `?lang=PL` param on links.
- Not in the ADAPTER-GUIDE §3 table by name; closest URL shape is an IDcom-style `/wiadomosci/<cat>/<id>` article board — treat as **server-HTML article board** family.

## 4. Volume + achieved-price stream
- **Volume:** **Low.** Open flat auctions are occasional (village + town flats); most residential disposal is bezprzetargowo to tenants. Expect a small handful of open flat auctions per year at most, some at II/III round.
- **Achieved-price stream:** YES — dedicated **Rozstrzygnięte** board (`/kategorie/265`) publishes outcome notices; announcement carries `cena wywoławcza`, result carries the hammer price / wynik. Parseable from HTML (+ PDF where attached).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** server-HTML article-board BIP with separate announce/result categories — clone the **tczew/gniezno** (IDcom, HTML + text/scanned PDF) crawl shape by URL pattern, or a WordPress/custom-HTML board (**brzeg/nowa-sol**) for the parse. Board-per-category (Zbycie 98 / Rozstrzygnięte 265) maps cleanly to `crawlActive` / `crawlResultDocs`.
- **CMS family:** Nefeni (bespoke server-rendered HTML; `/kategorie/N/artykuly/N`).
- **Effort:** **MEDIUM.** Tech is easy (server HTML + pdfText), but the sale board is **mixed** (land + tenant sales + wykaz + occasional flat auction) so the parser must classify (`classifyKind`) and keep only open `przetarg ustny … sprzedaż lokalu mieszkalnego`; plus PDF-attachment extraction and paginating year categories (bound it).
- **Blockers:** None technical. Main caveat is **low flat-auction volume** → modest ROI; the value is the clean results board.

**VERDICT: BUILD (Medium effort, low volume)** — a real (if thin) open municipal flat-auction stream on a clean Nefeni server-HTML BIP with a dedicated Rozstrzygnięte achieved-price board; build alongside other low-volume kuj-pom seats.
