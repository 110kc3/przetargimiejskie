# Spike — Ząbkowice Śląskie (Dolnośląskie · powiat ząbkowicki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Ząbkowice Śląskie (miejsko-wiejska, Urząd Miejski, Wydział Geodezji i Gospodarki Nieruchomościami, symbol GN) sells municipal property — **including lokale mieszkalne** — via *przetarg ustny nieograniczony*. Everything is published on the city BIP `bip.zabkowiceslaskie.pl`, which runs the **Logonet eUrząd** CMS (footer "Logonet Sp. z o.o. w Bydgoszczy", "Wersja systemu 2.9.0" — the guide's Logonet signature). Unusually, Ząbkowice uses Logonet's **dedicated real-estate module**, not generic articles: a structured, filterable "Przetargi nieruchomości / Grunty i nieruchomości" board with per-notice server-HTML pages at `/przetarg-nieruchomosci/<id>/<slug>` (internal `/estates/content/<id>`), filterable by year (2015–2026), type (ustny/pisemny, nieograniczony/ograniczony), category, and **status (Aktualny / W toku / Rozstrzygnięty / Unieważniony)**. 154 pages of notices. Achieved prices come as per-notice "Informacja o wyniku przetargu" **born-digital PDF**. Closest analog: **tarnowskie-gory** (same Logonet family). No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Urząd Miejski w Ząbkowicach Śląskich (GN) runs `przetarg ustny nieograniczony` for sale of municipal property. Confirmed **lokal mieszkalny** open-oral sales on the board:
- **Sulisławice 52B, lokal mieszkalny nr 2 AM-2** — przetarg ustny nieograniczony, cena wywoławcza 50 000 zł, 12.08.2026 09:00 (`/przetarg-nieruchomosci/10794/...`).
- **Ząbkowice Śląskie, ul. Kłodzka 6, lokal mieszkalny nr 5, pow. 76,85 m²** — flat auction (`/przetarg-nieruchomosci/1185/...`); further Kłodzka 6 lokal-mieszkalny notice at id 1913.
- **Rynek 1,3** — lokal notice (`/przetarg-nieruchomosci/10396/...`).
- **ul. Ziębicka 21, pow. 29,56 m²** — lokal *użytkowy*, przetarg ustny **ograniczony**, 85 000 zł, 12.08.2026 09:30 (example of a restricted/non-residential entry to classify out).

Board is a **mixed stream**: flats + garages + developed buildings + a heavy tail of undeveloped land/działki (Osiedle Wschód, Centrum, Sieroszów, Strąkowa). Flats recur but are a minority of volume; land dominates. All confirmed entries are `przetarg ustny` (open oral), natural + legal persons may bid — i.e. genuine open auctions, not `bezprzetargowo na rzecz najemcy`.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet eUrząd):**
- Property board (paginated): `https://bip.zabkowiceslaskie.pl/przetargi-nieruchomosci/1/10` (page/per-page; 154 pages total; `/<page>/<pageSize>` where pageSize ∈ 5/10/15/20/25).
- Structured "Grunty i nieruchomości" search + filters: `https://bip.zabkowiceslaskie.pl/przetargi-nieruchomosci/29` (filter by address, tryb, kategoria, rok 2015–2026, status Aktualny/W toku/Rozstrzygnięty/Unieważniony).
- Individual notice: `https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/<id>/<slug>` (e.g. `.../10794/sulislawice-52b-lokal-mieszkalny-nr-2-am-2-obreb-sulislawice`); internal alias `https://bip.zabkowiceslaskie.pl/estates/content/<id>`.
- General public-procurement przetargi (separate, out of scope for flats): `https://bip.zabkowiceslaskie.pl/przetargi/0/3/5`, notice `/przetarg/<id>/<sign>`.
- Legacy pre-2015 notices archived at `archiwum.zabkowiceslaskie.pl` (linked from the estate board; bounded backfill if needed).

Contact: Wydział Geodezji i Gospodarki Nieruchomościami (GN), Urząd Miejski, ul. 1 Maja 15, 57-200 Ząbkowice Śląskie, tel. 74 816 53 00, urzad@zabkowiceslaskie.pl.

**Do NOT confuse** with `bip.powiat-zabkowicki.pl` (Starostwo Powiatowe — county property, separate JST) or `kamienieczabkowicki.eu` (Gmina Kamieniec Ząbkowicki — separate JST). Target is Gmina Ząbkowice Śląskie only. No separate ZGM/TBS BIP found — the Urząd itself publishes the flat auctions (in-house housing sales), so a single host covers the stream.

## 3. Format + rendering
- **Server-rendered HTML** — Logonet eUrząd real-estate module. Notice pages carry structured fields inline (adres, powierzchnia użytkowa, cena wywoławcza, tryb, termin przetargu, godzina). Confirmed live via fetch of board + notice pages; no JS gate, no auth, no CAPTCHA.
- **Attached born-digital PDFs** — each notice links a full ogłoszenie PDF (~800 kB), and results arrive as an **"Informacja o wyniku przetargu"** PDF per notice. Handle with `pdfText` (born-digital; OCR unlikely needed on this CMS).
- Filter/query params on the estate board make status- and year-scoped crawling cheap (e.g. `status=Rozstrzygnięty` to harvest completed auctions with result PDFs).

## 4. Volume + achieved-price stream
- **Volume:** Modest-to-good. 154 board pages (×10) span 2015→2026 across the whole gmina; the majority is land/działki with a **steady minority of lokale mieszkalne + lokale użytkowe + garages** each year — expect a handful of flats/yr, some as II/III przetarg. Filterable by year confirms a continuous multi-year backlog for backfill.
- **Achieved-price stream:** YES. Notices carry `cena wywoławcza` inline; completed auctions expose an **"Informacja o wyniku przetargu" PDF** (cena osiągnięta / nabywca or wynik negatywny), and the board's **status filter (Rozstrzygnięty / Unieważniony)** lets the adapter target resolved auctions directly. Achieved price is in the result PDF → `pdfText` extract.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **tarnowskie-gory** (also `kedzierzyn-kozle`, `skarzysko-kamienna`) — same **Logonet eUrząd** family per ADAPTER-GUIDE §3. Ząbkowice uses Logonet's structured estate module rather than `/artykul/<board>/<id>`, so the list/detail URL shape differs slightly (`/przetarg-nieruchomosci/<page>/<size>` → `/przetarg-nieruchomosci/<id>/<slug>`), but the CMS core, PDF handling, and result-notice pattern are the tarnowskie-gory playbook.
- **CMS family:** Logonet eUrząd (server-rendered HTML; born-digital text PDFs; results inline/PDF).
- **Effort:** **LOW.** Paginate estate board (or query `?status=` / year) → fetch each `/przetarg-nieruchomosci/<id>/<slug>` → parse inline structured fields (parseAddress, powierzchnia, cena wywoławcza, tryb, termin, runda) → `pdfText` the ogłoszenie/wynik PDFs for cena osiągnięta. Classify + keep flats (lokal mieszkalny) vs land/lokal użytkowy/garaż (land also in-scope for the wider dataset).
- **Blockers:** None. No rate-limit/auth/CAPTCHA. Only watch-items: mixed land-heavy stream (classify by kategoria/tytuł) and achieved prices living in result PDFs (bounded pdfText). Structured status/year filters make crawling efficient.

**VERDICT: BUILD (Low effort)** — recurring municipal flat auctions (przetarg ustny nieograniczony) on a clean Logonet eUrząd BIP with a structured, filterable real-estate board and per-notice result PDFs; direct tarnowskie-gory analog, no blockers.
