# Spike — Staszów (Świętokrzyskie · powiat staszowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Staszów (Urząd Miasta i Gminy w Staszowie, miejsko-wiejska, town seat) sells municipal property — **including lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Announcements AND results are published on the city BIP `www.bip.staszow.pl`, which runs **Joomla** (`index.php?option=com_content&view=category|article`). One property-tenders section ("Przetargi na nieruchomości Gminy Staszów") split into **per-year subcategories** (2012→2026; 2023≈98, 2024≈65 articles). Each notice is an HTML article whose **body is a born-digital LibreOffice PDF** ("Treść ogłoszenia" link) — clean `pdftotext` extraction (cena wywoławcza, wadium, powierzchnia użytkowa, date all present). Flats are low-volume (~2 open flat auctions in 2025: ul. Opatowska 20/3) mixed into a stream of land sales, dzierżawa, wykazy and *informacja o wyniku przetargu* (achieved-price) notices. Closest analog: WordPress/custom-HTML + PDF-attachment family (bochnia / olkusz / nowa-sol) adapted to Joomla category pagination. No hard blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Urząd Miasta i Gminy w Staszowie runs `ustny przetarg nieograniczony` for sale of municipal property. Confirmed **lokal-mieszkalny** open oral auction (verified by fetching the born-digital PDF):
- **ul. Opatowska 20, lokal mieszkalny Nr 3** — *Ogłoszenie o sprzedaży w drodze ustnego przetargu nieograniczonego lokalu mieszkalnego*. PDF fields extracted cleanly: powierzchnia użytkowa **35,24 m.kw.**, **cena wywoławcza 98 757,00 zł**, **wadium 10 000,00 zł**, przetarg at Urząd Miasta i Gminy godz. 11:00; "W przetargu mogą brać udział osoby fizyczne i prawne" (open auction). Preceded in the same stream by a *Wykaz o przeznaczeniu do sprzedaży lokalu mieszkalnego* (26.11.2025) for the same unit.
- Also confirmed prior flat notices: ul. Opatowska (II ustny przetarg, 2024), and historic Rynek 10 / Partyzantów 3.
- The stream also carries land sales (Wiązownica Kolonia, ul. Sandomierska, ul. Długa dz. 1517/xx), dzierżawa/najem/użyczenie wykazy, and results — flats are a recurring but minority category, not bezprzetargowo-only.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Joomla CMS):** `www.bip.staszow.pl`
- Property-tenders hub: `https://www.bip.staszow.pl/index.php?option=com_content&view=categories&id=116&Itemid=511` ("Przetargi na nieruchomości Gminy Staszów", id=116)
- Per-year subcategories (this is where notices live), e.g.:
  - 2025: `https://www.bip.staszow.pl/index.php?option=com_content&view=category&id=1261&Itemid=506`
  - 2024: `…&view=category&id=1212&Itemid=506`
  - 2023: `…&view=category&id=1169&Itemid=506`
  - 2022: `…&view=category&id=1127&Itemid=506`
- Article URL shape: `index.php?option=com_content&view=article&id=<NNNNN>:<slug>&catid=<year-catid>&Itemid=506`
- Attachment PDF shape: `https://www.bip.staszow.pl/pliki/<year>/pozostale/<filename>.pdf`
- Also present: "Ogłoszenia/Obwieszczenia" (id=89), Zamówienia Publiczne (id=124) — out of scope.

**Achieved-price stream:** same per-year category — *Informacja o wyniku przetargu* notices (e.g. "Informacja o wyniku przetargu ograniczonego, Staszów", 19.12.2025). No separate results board; results interleave with announcements.

**Do NOT confuse** with `bip.staszowski.eu` / `starostwo.staszow.eobip.pl` — that is the **Starostwo Powiatowe / Powiat Staszowski** (separate JST, sells e.g. Sichów Duży flats), out of scope. Our target is Gmina Staszów = `bip.staszow.pl`.

Housing manager: no separate ZGM/TBS company publishing auctions found — flat sales are run directly by the UMiG (komunalne stock).

## 3. Format + rendering
- **Server-rendered HTML** (Joomla `com_content`) — per-year category pages list dated article links; no JS gate, no auth, no CAPTCHA. Fetched live via WebFetch (plain HTML).
- **Notice body = born-digital PDF.** Each article page is a short HTML wrapper with a "Treść ogłoszenia" link to a **LibreOffice-generated, selectable-text PDF** under `/pliki/<year>/pozostale/`. Verified: `pdftotext -layout` cleanly returns all fields (address, powierzchnia użytkowa, cena wywoławcza, wadium, godzina) — use `pipeline` `pdfText`. No OCR needed.
- Some short items (wykazy) may carry data inline in the HTML; the sale ogłoszenia consistently push detail into the PDF.

## 4. Volume + achieved-price stream
- **Volume:** Category ~65–98 articles/year but that includes land, dzierżawa/najem/użyczenie wykazy and results. **Open flat auctions are low — ~1–3/year** (2 flat notices in 2025, both Opatowska 20/3; II-round flat in 2024). Expect a handful of gmina flat auctions per year, some as II przetarg.
- **Achieved-price:** YES — `Informacja o wyniku przetargu` notices publish in the same per-year stream (cena osiągnięta / nabywca / wynik negatywny). Announcement PDFs carry `cena wywoławcza`; result notices carry the hammer price. Both parseable.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress/custom-HTML + PDF-attachment family — **bochnia / olkusz / nowa-sol** shape (HTML article list → PDF body → `pdfText` → regex fields), adapted to **Joomla** per-year `com_content` category pagination.
- **CMS family:** Joomla (`com_content`, `view=category`/`view=article`), server-rendered HTML + born-digital PDF attachments (ADAPTER-GUIDE §3 "WordPress / custom HTML" row).
- **Effort:** **MEDIUM.** Crawl each per-year category (id=1261/1212/1169/… — enumerate via the id=116 hub), for each article follow the `/pliki/.../*.pdf` "Treść ogłoszenia" link → `pdfText` → parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date/godzina, round). Classify + drop land/dzierżawa/najem/użyczenie; keep lokal mieszkalny (+ optionally land for the wider dataset). Second pass on the same stream for `informacja o wyniku` → cena osiągnięta. Mildly-above-Low only because body is PDF-only, the stream is mixed (needs solid classification), and category IDs are per-year (need discovery, not a single stable board).
- **Blockers:** None hard. No rate-limit/auth/TLS issues observed on `www.bip.staszow.pl`. Watch-items: per-year category-id discovery, PDF filenames contain spaces/Polish chars (URL-encode), and separating flats from the land-heavy stream.

**VERDICT: BUILD (Medium effort)** — recurring OPEN municipal flat auctions on a clean Joomla server-HTML BIP with born-digital (pdftotext-friendly) notice PDFs and an in-stream achieved-price feed; standard HTML+PDF analog, no blockers.
