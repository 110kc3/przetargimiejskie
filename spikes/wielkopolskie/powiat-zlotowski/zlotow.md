# Spike — Złotów (Wielkopolskie · powiat złotowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort — Nefeni BIPv2 Next.js SPA + PDF notices).

## TL;DR
Target is the **town Gmina Miasto Złotów** (gmina miejska, ~18k) — NOT the rural **Gmina Złotów** (`gminazlotow.pl` / `bip.gminazlotow.pl`, WordPress). The town runs genuine **open oral flat auctions** — `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` — confirmed live (Aleja Piasta 3/2, Domańskiego 16/3). Seller/publisher is the Urząd Miejski w Złotowie (Burmistrz; Referat Gospodarki Nieruchomościami, Elżbieta Michałek, pok. 12). The town BIP `bip.zlotow.pl` is a **Nefeni BIPv2** platform — a **Next.js App Router SPA** (footer "Nefeni Sp. z o.o.", `/_next/…`, category boards render "Wczytywanie…") with a **REST backend at `bip-api.zlotow.pl`** and attachment downloads at `bip-api.zlotow.pl/api/attachments/<id>`. Article routes are server-HTML that **embed the article + attachment JSON in the RSC flight payload** (`__next_f`), so article metadata is curl-able without Playwright; the substantive auction details, however, live in **born-digital PDF attachments** → need `pdfText`. There is a housing manager (**MZGL** — Miejski Zakład Gospodarki Lokalami) but it is rental/administration, not the auction publisher. Achieved-price stream exists (`Informacja o wyniku przetargu` articles). Recurring flat auctions on a modern-but-JS-gated CMS ⇒ BUILD, Medium effort.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Gminy Miasto Złotów runs `przetarg ustny nieograniczony na sprzedaż` for municipal property, and flats are an explicit, recurring category. A standing procedural page (`bip.zlotow.pl/?c=879`, "Sprzedaż lokalu mieszkalnego") describes the flow: property list on `bip.zlotow.pl` + notice board by pok. 12, appraisal, then auction with wadium; open to natural + legal persons. Confirmed `lokal mieszkalny` auctions:
- **Aleja Piasta 3/2** — sprzedaż w przetargu nieograniczonym lokalu mieszkalnego wraz z pomieszczeniami przynależnymi i prawem użytkowania wieczystego gruntu.
- **ul. Domańskiego 16/3** — Burmistrz ogłasza ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego do kapitalnego remontu (also surfaced via MZGL).
- Land also auctioned (e.g. ogłoszenie o przetargu na sprzedaż nieruchomości pod zabudowę mieszkaniową jednorodzinną, art. 2708, 2026 — Kresowiaków / Chojnicka). So the board mixes flats + building plots, as usual.

Contrast: rural **Gmina Złotów** (separate JST, out of scope) publishes on `gminazlotow.pl` / `bip.gminazlotow.pl` and is land/dzierżawa-skewed — do not conflate.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (Nefeni BIPv2, `bip.zlotow.pl`):**
- Property-sales board: `https://bip.zlotow.pl/kategorie/181-sprzedaz-nieruchomosci` (subcategorised by year: 2023 / 2024 / 2025 / **267-2026**).
- Article route pattern: `https://bip.zlotow.pl/kategorie/<catId>-<slug>/artykuly/<artId>-<slug>` (e.g. `.../267-2026/artykuly/2708-ogloszenie-o-przetargu-na-sprzedaz-nieruchomosci-...`).
- Standing "Sprzedaż lokalu mieszkalnego" procedure: `https://bip.zlotow.pl/?c=879` (legacy id route; the app also honours `?id=<n>` forms, e.g. `?id=446`).
- **REST backend (real data host):** `https://bip-api.zlotow.pl` — attachment downloads at `https://bip-api.zlotow.pl/api/attachments/<documentRepositoryId>` (born-digital PDFs; confirmed live in the RSC payload, e.g. attachment id 7527 = "Ogł.o przetargu z 28.04.26.pdf", 586 KB).
- SPA data endpoint referenced from the frontend: `https://bip.zlotow.pl/api/page-content` (Next.js RSC route; GET without the app's params returns the shell — listing is client-fetched).
- Results / achieved price: `Informacja o wyniku przetargu …` articles on the same boards (e.g. "Info o wyniku przetargu ustnego nieograniczonego z dnia 2.07.2026 r. dot. sprzedaży nieruchomości gruntowej").

**Housing manager:** MZGL (Miejski Zakład Gospodarki Lokalami w Złotowie, `mzgl.com.pl`) — administers municipal rental stock and utilities; only occasional flat sales (e.g. the Domańskiego 16/3 remont flat). It is NOT a separate flat-auction publisher; auctions come from the UM Złotów BIP.

## 3. Format + rendering
- **Nefeni BIPv2 — Next.js App Router SPA.** Raw HTML is a Next shell (`/_next/static/…`, `webpackJsonp`/`__next_f`); category list boards show **"Wczytywanie…"** and are client-fetched (no plain server list). No usable server-rendered `?p=print` view (print route also returns "Wczytywanie…").
- **BUT article routes embed structured data in the RSC flight payload** (`__next_f` script). Curling the article URL (~213 KB) yields JSON with `articleTranslationId`, per-attachment objects `{id, filename, contentType:"application/pdf", size, url:"https://bip-api.zlotow.pl/api/attachments/<id>", crc32File, createdDate, createdBy}`. So **article + attachment metadata is fetchable without Playwright** by parsing the flight payload; the category enumeration is the JS-gated part (reverse-engineer `/api/page-content` params, hit `bip-api.zlotow.pl`, or fall back to `core/render.js`).
- **Substantive auction details are in born-digital PDFs** (cena wywoławcza, powierzchnia, wadium, termin, adres inside "Ogł.o przetargu …pdf") → `pdfText` (OCR unlikely; these are digital). No auth/CAPTCHA on the attachment host.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. A handful of property auctions/year across the mixed board (flats + building plots + occasional lokal użytkowy); flat auctions recur but are not high-frequency (expect ~a few flats/year, some as II/III przetarg when unsold). Enough recurring flat volume to justify a build, unlike the land-only NO-BUILD Wielkopolska neighbours (Wolsztyn, Wągrowiec).
- **Achieved-price stream: YES.** `Informacja o wyniku przetargu` articles publish cena osiągnięta / nabywca (or wynik negatywny) — live example from 2.07.2026 (land). Both cena wywoławcza (notice) and hammer price (result) are recoverable; result bodies may also be PDF → `pdfText`.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Wolsztyn** (`spikes/wielkopolskie/powiat-wolsztynski/wolsztyn.md`) — same Nefeni vendor with a JSON-backed BIP; adapt its "fetch JSON, don't Playwright the HTML" approach to this **newer Nefeni BIPv2 / Next.js RSC** shape (`bip-api.zlotow.pl` + RSC flight parse). For the JS-gated listing, `chrzanow` (`core/render.js`, Playwright) is the SPA fallback per ADAPTER-GUIDE §3. For the PDF notice bodies, clone the born-digital-PDF-attachment path used by **puck / tczew** (`pdfText`).
- **CMS family:** Nefeni BIPv2 — **JS SPA (no server HTML for lists)** in ADAPTER-GUIDE §3 terms, but with a curl-able REST backend + RSC-embedded article/attachment JSON.
- **Effort:** **MEDIUM.** Two moving parts vs a plain HTML BIP: (1) enumerate the property board without a plain server list — either reverse-engineer `/api/page-content` / `bip-api.zlotow.pl` article-list params (fast if it yields clean JSON, as Wolsztyn's did) or drop to render.js; (2) pull cena/powierzchnia/wadium/termin out of born-digital PDF attachments via `pdfText`. Then classify flat vs land vs lease from the title, and second-pass the `Informacja o wyniku` articles for achieved price.
- **Blockers:** No auth/CAPTCHA/rate-limit signals. Main watch-items: the client-fetched listing (SPA), PDF-only notice bodies, and the mixed flat/land/lease stream (title-regex classification). All standard, none fatal.

**VERDICT: BUILD (Medium effort)** — Gmina Miasto Złotów runs recurring open oral flat auctions (Aleja Piasta 3/2, Domańskiego 16/3) with a published results stream, on a modern Nefeni BIPv2 (Next.js SPA + `bip-api.zlotow.pl` REST + born-digital PDFs). Medium (not Low) only because the listing is JS-gated and notice details are PDF-bound; clone Wolsztyn's Nefeni-JSON approach + puck/tczew PDF path.
