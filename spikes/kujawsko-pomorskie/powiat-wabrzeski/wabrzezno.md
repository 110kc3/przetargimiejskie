# Spike — Wąbrzeźno (Kujawsko-Pomorskie · powiat wąbrzeski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort). **Built + registered 2026-07-12** (13/13 parse test; **TERYT 041701_1 confirmed**). Analog zgorzelec (parse) + bespoke XML-feed crawl: rbip.mojregion.info serves `/xml/330/przetargi.html` (all ~38 notices, no pagination) + per-notice `/xml/<id>` inline `<tresc>` OR PDF/DOCX attachment (pdfText/docText). Multi-lokal notices split (wolow-style). Land-dominated; every live result is negative-land, so the sold/flat result path is implemented but untested live.

## TL;DR
Gmina Miasto Wąbrzeźno (Urząd Miasta Wąbrzeźno) sells municipal **lokale mieszkalne** via **nieograniczony przetarg ustny na sprzedaż prawa własności do lokali mieszkalnych** — open oral public auction, explicitly not tenant-only. Notices are published on the city BIP `mst-wabrzezno.rbip.mojregion.info`, the **rbip.mojregion.info** regional BIP CMS (Kujawsko-Pomorskie): clean server-rendered HTML, dated article board at `/330/przetargi.html`, individual notices at `/<id>/<slug>.html` with the **full ogłoszenie text inline in the page body** (cena wywoławcza, wadium, powierzchnia, date — no PDF/DOC gate). Results ("Informacja o wynikach przetargów") are posted as inline articles on the same board. No dedicated ZGM/TBS — the UM sells directly. Volume is low-modest and mixed with land + dzierżawa, but flat auctions recur (Mickiewicza 19, Niedziałkowskiego 1, Matejki 20A, Legionistów all confirmed). Closest analog: server-HTML board BIP (Zgorzelec bip.info.pl shape) — list board → article `.html` → regex the inline text. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats via OPEN oral auction.** The Urząd Miasta Wąbrzeźno runs **"Pierwszy/Drugi nieograniczony przetarg ustny na sprzedaż prawa własności do lokali mieszkalnych"** — open to the general public (przetarg nieograniczony), not bezprzetargowo na rzecz najemcy. Confirmed live flat-sale auction (fetched 2026-07-09, notice id 1866):
- ul. Mickiewicza 19 — lokal 33,25 m², cena wywoławcza 115 670,00 zł, wadium 11 567,00 zł, przetarg 29.07.2026 10:00.
- ul. Niedziałkowskiego 1 — lokal 24,38 m², cena wywoławcza 89 241,00 zł, wadium 8 924,00 zł, przetarg 29.07.2026 11:00.
- (earlier round, notice 2024–2025) Mickiewicza 19 33,25 m², Niedziałkowskiego 1 37,89 m², Matejki 20A 50,70 m² — same open-auction mode.

The active przetargi board on the day of this spike carried a mix: flat-sale auctions + land sales (ul. Gruszkowa/Truskawkowa/Okrężna, działki gruntowe) + dzierżawa (drobne uprawy, kawiarenka) + rokowania (Chełmińska) + wyniki. Flats cycle in/out (I/II przetarg on repeat when unsold); both natural and legal persons may bid, 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (rbip.mojregion.info CMS):**
- Przetargi board (announcements + results, paginated ~34 items / 4 pages): `https://mst-wabrzezno.rbip.mojregion.info/330/przetargi.html`
- Individual notice pattern: `https://mst-wabrzezno.rbip.mojregion.info/<id>/<slug>.html` — e.g. flat auction `.../1866/pierwszy-nieograniczony-przetarg-ustny-na-sprzedaz-prawa-wlasnosci-do-lokali-mieszkalnych.html`
- Results (inline articles on same board): `.../1602/informacja-o-wynikach-przetargow-nieograniczonych-na-sprzedaz-niezabudowanych-nieruchomosci-komunalnych.html`
- **Archive host (older notices):** `https://mst-wabrzezno.arch.rbip.mojregion.info/typy-tresci/przetargi/` (e.g. `.../page/2/`) — legacy backfill.

**Secondary mirror (WordPress, not authoritative):** the official city portal `https://wabrzezno.com/` reposts each przetarg as a blog article (e.g. `/2025/04/przetarg-na-sprzedaz-prawa-wlasnosci-do-trzech-lokali-2/`). Useful cross-check only; BIP is the source of record.

**Do NOT confuse** with the rural **Gmina Wąbrzeźno** (separate JST, own BIP) or the **Starostwo Powiatowe w Wąbrzeźnie** (`wabrzezno.pl/6203,przetargi`, county-level). Our target is the town **Gmina Miasto Wąbrzeźno** — host prefix `mst-wabrzezno` (mst = miasto).

## 3. Format + rendering
- **Server-rendered HTML** — rbip.mojregion.info regional BIP CMS. Article board is a dated `.html` list with pagination; individual notices are `.html` pages with the **full ogłoszenie text inline in the body** (confirmed via fetch: address, powierzchnia użytkowa, cena wywoławcza, wadium, date/time all present without any attachment download).
- **No SPA, no auth, no CAPTCHA** observed. Reachable over HTTPS with default fetch.
- PDF/DOC attachments not required for core fields; if a longer notice attaches a born-digital PDF, handle with `pdfText` (OCR unlikely on this CMS).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. ~34 przetargi items across 4 board pages spanning recent years; a few flat-sale auctions per year (often multi-lokal in one notice), interleaved with land sales and dzierżawa. Repeat I/II/III rounds when a lokal goes unsold.
- **Achieved-price stream:** YES — **"Informacja o wynikach przetargów"** notices are posted as inline HTML articles on the same `/330/przetargi.html` board (cena osiągnięta / nabywca, or wynik negatywny). Announcement carries `cena wywoławcza`; result article carries the hammer price. Both parseable from server HTML — no separate results host, so classify by title (`Informacja o wynikach…` / `wynik`).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** Server-HTML board BIP — **Zgorzelec** (`bip.info.pl`) shape: single dated list board → fetch article `.html` → regex/DOM the inline ogłoszenie text; second pass over the same board for `Informacja o wynikach` result articles. WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms.
- **CMS family:** rbip.mojregion.info (regional Kujawsko-Pomorskie BIP) — plain server-rendered HTML articles, `/<id>/<slug>.html`. New host family for this repo (no mojregion adapter yet; Włocławek is the only other K-P spike and is not built), but structurally trivial — no bespoke API needed, board pagination is simple `.../page/N/` on the archive host.
- **Effort:** **LOW.** Crawl `/330/przetargi.html` (+ archive `arch.` host for backfill) → follow `.html` article links → parse inline text (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round). Filter title to keep `sprzedaż … lokal(i) mieszkalnych` / `sprzedaż prawa własności do lokali`, drop `dzierżawa` / `zbycie nieruchomości gruntowych` / land (or keep land for the wider dataset). Second pass classifies `Informacja o wynikach` for cena osiągnięta.
- **Blockers:** None. No rate-limit/auth/JS gate. Only watch-items: announcement and result articles share one board (classify by title), a mixed flat/land/dzierżawa stream, and multi-lokal notices (split one notice into N property records).

**VERDICT: BUILD (Low effort)** — recurring open oral municipal flat auctions on a clean rbip.mojregion.info server-HTML BIP with inline text and an inline results stream; standard server-HTML-board analog (Zgorzelec shape), no blockers.
