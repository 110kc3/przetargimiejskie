# Spike — Otwock (Mazowieckie · powiat otwocki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Miasto Otwock (Gmina Miejska, Prezydent Miasta Otwocka) **regularly sells municipal flats at open oral auction** — `I/II/III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego`. Announcements live on the city BIP `bip.otwock.pl` **menu 1018 ("Przetargi")** — a 44-page board — and results on a dedicated **menu 1039 ("Ogłoszenia o wyniku postępowania")** — 52 pages — carrying `Wynik … przetargu na sprzedaż lokalu mieszkalnego`. CMS is **INTERmedi@ "CMS-BIP"** (i.media.pl), the same vendor as the official portal otwock.pl: clean server-rendered HTML list/article shells with URL pattern `?bip=2&cid=NNNN&id=NNNNN`. The catch: the full ogłoszenie (address, powierzchnia, cena wywoławcza, wadium, date) lives in an **attached SCANNED PDF** — full-page JPEG @200 dpi, no text layer, no fonts — so **OCR is required** for the structured fields. Housing stock is run by **Zarząd Gospodarki Mieszkaniowej w Otwocku (ZGM)** (zgm-otwock.pl), but ZGM only handles administration/lease/repair tenders; the *sales* are run by the city (Wydział Gospodarki Nieruchomościami) and published on menu 1018. No technical blockers beyond OCR.

## 1. Sells municipal property at auction?
**YES — confirmed, recurring flats.** Prezydent Miasta Otwocka runs `ustny przetarg nieograniczony` for sale of municipal lokale mieszkalne, with repeat rounds (I/II/III) when unsold. Confirmed flat-sale auctions (menu 1018):
- **ul. Marii Dąbrowskiej 17, Warszawa** (city-owned flat outside city limits) — I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, cena wywoławcza **540 000 zł**, wadium 100 000 zł, licytacja 2023-12-07 (id 25962).
- **ul. J. I. Kraszewskiego 76 m.17, Otwock** — lokal 15,70 m², I przetarg, licytacja 2025-08-14 (indexed via portal/otoprzetargi).
- Flat (id 30371 / 30373) — **II ustny przetarg nieograniczony** na sprzedaż lokalu mieszkalnego, published 2026-05-22 (attachment `przetarg_-_Sikorskiego22.pdf`).
- Further flat-sale IDs on the board: 21975 ("sprzedaż lokali…" – multiple), 28439, 28883, 29801, 29802, 29803; plus a Dec-2025 flat at cena wyw. 365 000 zł / wadium 70 000 zł.
- Board also carries land (`nieruchomość gruntowa`, dz. ew. …, up to VIII przetarg) and a couple of lease *konkursy* (garaż / parking motocykli) — so classify + filter, but flat auctions clearly recur (several per year).

Bidders: natural + legal persons, 10% wadium; auctions held at UM Otwock, ul. Armii Krajowej 5, budynek "A".

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP `bip.otwock.pl` (INTERmedi@ CMS-BIP):**
- **Przetargi** (announcements, incl. flat + land sales): `https://bip.otwock.pl/?bip=1&cid=1018&bsc=N` — **44 pages**.
- **Ogłoszenia o wyniku postępowania** (results / informacja o wyniku): `https://bip.otwock.pl/?bip=1&cid=1039&bsc=N` — **52 pages** (e.g. "Wynik III ustnego przetargu na sprzedaż lokalu mieszkalnego nr 10", 2026-05-22; land results too).
- Article URL pattern: `?bip=2&cid=1018&id=NNNNN` (e.g. `id=25962`, `id=30371`).
- Attachment path pattern: `fls/bip_pliki/YYYY_MM/BIP{HASH}/{filename}.pdf` (e.g. `.../2023_10/BIPF606CF7AEFE131Z/Przetarg_-_lokal_ul._M._Dabrowskiej.pdf`).

**Housing manager — ZGM:** `https://zgm-otwock.pl/ogloszenia/` and `/zapytania-ofertowe/` — Zarząd Gospodarki Mieszkaniowej w Otwocku. Administers the housing stock; publishes **lease/repair/service tenders**, NOT flat sales. Out of scope for the sale-auction stream (do not scrape for sales).

**Mirror / secondary (indexing only):** official portal `https://www.otwock.pl/przetargi-na-nieruchomosci,m,mg,2,27` (same INTERmedi@ vendor); aggregators otoprzetargi.pl / przetargi.egospodarka.pl echo the notices. Authoritative source = `bip.otwock.pl`.

Contact: Wydział Gospodarki Nieruchomościami, UM Otwock, ul. Armii Krajowej 5, 05-400 Otwock.

## 3. Format + rendering
- **Server-rendered HTML** — INTERmedi@ **"CMS-BIP"** (footer link → i.media.pl / INTERmedi@; also powers otwock.pl). List boards and article pages are plain server HTML (`?bip=2&cid=…&id=…`); **no SPA, no auth, no CAPTCHA, no JS gate**. Confirmed via curl + WebFetch.
- **Structured data is in SCANNED PDFs.** The article HTML body carries the title, date and a PDF link (sometimes a one-line lead) only; the actual ogłoszenie (adres, powierzchnia użytkowa, cena wywoławcza, wadium, termin) is in the attached PDF. Downloaded sample (`Przetarg_-_lokal_ul._M._Dabrowskiej.pdf`, 1.0 MB, 2 pages): `pdffonts` → **no fonts**, `pdftotext` → **empty**, `pdfimages -list` → full-page **JPEG 1654×2338 @200 dpi rgb** per page. i.e. **scanned image → OCR (Tesseract `pol`) required**. Result-board PDFs (menu 1039) are the same shape.
- Titles/dates in HTML are enough to **filter flat-sale vs land vs lease cheaply**, then OCR only the flat PDFs.

## 4. Volume + achieved-price stream
- **Volume:** Moderate and recurring. Menu 1018 spans 44 pages of history; flat-sale ogłoszenia appear several times per year, frequently escalating to II/III przetarg when unsold (confirmed I→II→III rounds). Mixed with land (which itself is in-scope for the wider dataset) and occasional lease konkursy.
- **Achieved-price stream: YES.** Dedicated **menu 1039** publishes `informacja o wyniku / wynik przetargu` including for lokale mieszkalne ("Wynik III ustnego przetargu na sprzedaż lokalu mieszkalnego nr 10"). Announcement board gives `cena wywoławcza`; results board gives the hammer outcome (cena osiągnięta / nabywca, or wynik negatywny) — **but inside scanned PDFs, so OCR is needed to read the achieved price** too.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **INTERmedi@ CMS-BIP** (i.media.pl) — server-HTML boards (`?bip=1&cid=NNNN&bsc=N` lists, `?bip=2&cid=NNNN&id=NNNNN` articles, `fls/bip_pliki/` attachments) + **scanned-PDF ogłoszenia**. Not in the current analog roster; treat as a new INTERmedi@ pattern. Rendering shape = server-HTML crawl (like the bip.info.pl class); document layer = **scanned-PDF→OCR** (like other OCR cities). Reuse: HTML list/pagination crawler from any server-HTML adapter + the scanned-PDF OCR path.
- **CMS family:** INTERmedi@ CMS-BIP (server-rendered HTML; per ADAPTER-GUIDE §3 = plain-HTML boards, but with a scanned-PDF document layer).
- **Effort: MEDIUM.** List crawl over cid=1018 (44 pp) + cid=1039 (52 pp) → filter flat-sale by HTML title/date (trivial) → download attachment → **Tesseract `pol` OCR** → regex-extract adres/powierzchnia/cena wywoławcza/wadium/termin/runda; second pass over cid=1039 for cena osiągnięta / nabywca. The only reason it isn't Low is the mandatory OCR on every in-scope PDF (no born-digital text layer).
- **Blockers:** None hard. No rate-limit/auth/CAPTCHA. Watch-items: (1) OCR accuracy on 200 dpi scans (adequate but validate numeric fields — cena/wadium/powierzchnia); (2) separate announcement (1018) vs result (1039) boards to reconcile; (3) filter out land/lease and dedupe I/II/III rounds of the same lokal; (4) do NOT scrape ZGM (zgm-otwock.pl) for sales — it only runs lease/repair tenders.

**VERDICT: BUILD (Medium effort)** — recurring open municipal flat auctions on a clean INTERmedi@ server-HTML BIP (menu 1018) with a dedicated results board (menu 1039); only friction is scanned-PDF→OCR for the structured fields. Strong signal confirmed.
