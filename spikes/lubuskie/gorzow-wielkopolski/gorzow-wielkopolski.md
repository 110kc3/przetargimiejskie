# Spike — Gorzów Wielkopolski (Lubuskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low-Medium effort).

## TL;DR

Gorzów Wielkopolski runs confirmed *przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych* published by the city BIP at `bip.um.gorzow.pl`. The flat-auction stream is genuine and recurring — Ogłoszenie Nr 61/2025 (live-fetched PDF) lists **12 residential units** in a single round on 2025-10-09, all described as *lokal mieszkalny … wymagający remontu*. Result notices with achieved prices exist on the same BIP (also as PDFs), confirmed by a live-fetched result document from 2024-09-20 that shows `cena netto osiągnięta w przetargu [zł]` inline in the PDF table. The BIP runs a standard Polish municipal CMS (bip.um.gorzow.pl — Platforma BIP) delivering born-digital PDFs as attachments to HTML stub pages. ZGM (Zakład Gospodarki Mieszkaniowej) manages the housing stock but does NOT publish flat-sale auctions separately — all przetargi on sprzedaż go through Wydział Gospodarki Nieruchomościami i Majątku at the city BIP. Closest analogue: Bytom/Zabrze batch pattern (single BIP board, periodic PDF rounds with multiple flats per announcement). BUILD is justified at Low-Medium effort.

---

## 1. Sells municipal property at auction?

**Yes — confirmed, including residential flats (lokale mieszkalne).**

The Prezydent Miasta Gorzowa Wielkopolskiego runs *przetargi ustne nieograniczone* for:

- **Residential flats (lokale mieszkalne):** live-verified. Ogłoszenie Nr 61/2025 (05.09.2025) lists 12 flats in a single batch, all described as *lokal mieszkalny … wymagający przeprowadzenia remontu*, auction date 2025-10-09. Example units:
  - ul. Fabryczna 53/9 — 19.43 m², cena wywoławcza 39 000 zł
  - ul. Grobla 22/12 — 46.96 m², cena wywoławcza 85 000 zł
  - ul. Kobylogórska 105/8 — 29.73 m² (piwnica), cena wywoławcza 54 000 zł
  - ul. Sikorskiego 88/5 — 38.79 m², cena wywoławcza 85 000 zł
  - *(…8 more in same announcement)*
  - Source: [Ogłoszenie Nr 61/2025 PDF](https://bip.um.gorzow.pl/system/obj/59130_Ogloszenie_nr_61-2025.pdf) — LIVE-FETCHED
- **Land (nieruchomości niezabudowane/zabudowane):** also published, e.g. Ogłoszenie Nr 34/2024 covered land plots (ul. Piłsudskiego, ul. Żelazna, ul. Małorolnych) and industrial plots — confirmed in live-fetched result PDF.
- **Negotiations (rokowania):** some stubborn lots (e.g. ul. Małorolnych i Cichej) reached 6+ przetarg rounds then switched to rokowania (Ogłoszenie Nr 41/2025).

**Pattern:** Flat auctions are grouped into batch announcements (typically 8–15 units per round), held approximately every 6–8 weeks at City Hall (ul. Sikorskiego 4). Flats are described as *wymagające remontu* — consistent with the national pattern that tenant-eligible standard flats go *bezprzetargowo*, and only difficult/vacant stock reaches open auction.

**ZGM role:** ZGM (Zakład Gospodarki Mieszkaniowej, zgm.gorzow.pl) manages the city's housing pool (317 free units listed on its site), runs rental auctions for *lokale użytkowe*, and handles Wydział Spraw Lokalowych (ofertywsl.zgm.gorzow.pl). ZGM does **not** publish flat-sale przetargi — those go exclusively through Wydział Gospodarki Nieruchomościami i Majątku at the city BIP.

---

## 2. Where published? (hosts + boards, with URLs)

**Single authoritative host:** `bip.um.gorzow.pl` (also reachable via `bip.wrota.lubuskie.pl/umgorzow/` — appears to be a mirror/proxy).

| Board | URL | Content |
|---|---|---|
| Przetargi aktualne (nieruchomości) | https://bip.um.gorzow.pl/przetargi/320/status/ | Current auction announcements |
| Przetargi rozstrzygnięte | https://bip.um.gorzow.pl/przetargi/320/status/1/ | Completed/resolved auctions |
| Informacje o wynikach przetargów / rokowań | https://bip.um.gorzow.pl/509/ | Dedicated result-notice board — achieved prices here |
| Wykazy nieruchomości do sprzedaży | https://bip.um.gorzow.pl/169/ | Pre-auction property register |
| Department landing | https://bip.um.gorzow.pl/150/Wydzial_Gospodarki_Nieruchomosciami_i_Majatku/ | Wydział Gospodarki Nieruchomościami i Majątku |

**Confirmed result-notice URL example:**
- 2026-05-07 result: `https://www.bip.um.gorzow.pl/509/12484/Informacja_o_wyniku_przetargow_ustnych_nieograniczonych_na_sprzedaz_nieruchomosci_stanowiacych_wlasnosc_Miasta_Gorzowa_Wlkp__2C_przeprowadzonych_w_dniu_07_maja_2026r__o_godz__10_w_siedzibie_Urzedu_Miasta_Gorzowa_Wlkp/`
- 2024-09-12 result PDF (live-fetched): `https://bip.um.gorzow.pl/system/obj/54403_Wyniki_przetargow_z_dnia_12_wrzesnia_2024r..pdf`

**Individual announcement URL pattern:** `https://bip.um.gorzow.pl/przetargi/320/{id}/{slug}/`

**Responsible department:** Wydział Gospodarki Nieruchomościami i Majątku (WGM), reference codes: `WGM-III.6870.{N}.{year}`. Signatory: Zastępca Prezydenta Miasta (z up. Prezydenta).

**Mirror:** `bip.wrota.lubuskie.pl/umgorzow/przetargi/29/status/` — appears to mirror the main BIP. Primary host `bip.um.gorzow.pl` preferred.

---

## 3. Format + rendering

| Attribute | Detail |
|---|---|
| Rendering | Server-rendered HTML (BIP CMS) — HTML stub pages with PDF attachments |
| Index/list pages | HTML list of auction entries; URL pattern uses `/status/` and `/status/1/` for current vs. resolved |
| Individual entry | HTML stub (title, date, short summary) + link to PDF attachment |
| Announcement content | **Born-digital PDF** — structured table with columns: lp., address, działka, opis, KW, cena wywoławcza, wadium. Machine-readable text (not scanned). Confirmed from live fetch of Ogłoszenie 61/2025. |
| Result-notice content | **Born-digital PDF** — structured table with columns: lp., położenie, obręb+nr działki, pow., opis, KW, cena wywoławcza, liczba osób dopuszczonych, **cena netto osiągnięta w przetargu**, osoba ustalona nabywcą. Confirmed from live fetch of 2024-09-12 result. |
| XML feed | Available: `https://bip.um.gorzow.pl/przetargi/xml/29/674/wersja/` (observed in search results) |
| TLS | Standard HTTPS; HTML pages appear to timeout occasionally (403/timeout in live test) but PDFs fetch cleanly via direct URL |
| Auth / bot blocks | No auth required; PDF URLs are publicly accessible. HTML list pages may have rate limits (observed one empty response) — use polite crawl delay |
| Achieved price location | **Inline in result PDF table** (`cena netto osiągnięta w przetargu [zł]`) — does NOT require DOCX parsing. Cleaner than Bydgoszcz. |

**Key finding on format:** The BIP HTML list pages are somewhat fragile (timed out in live test), but the underlying PDFs are directly accessible and fully born-digital. An adapter can poll the HTML index for new entries and then fetch PDFs by direct URL — standard pattern.

---

## 4. Volume + achieved-price stream

**Flat-auction volume:**
- Ogłoszenie Nr 61/2025 (05.09.2025): **12 flats** in one batch round (auction 09.10.2025) — the "Nr 61" designation with a September date suggests this was at least the 61st announcement in 2025, indicating an active programme.
- All 12 listed as *drugi przetarg* (second round, first was 21.08.2025) — this means a preceding batch of the same 12 flats ran in August 2025. Recurring multi-round pattern.
- May 2026 result confirmed as a live event: `07.05.2026` auction run with results published `19.05.2026` (47.6 KiB PDF).
- Estimated annual flat-auction volume: roughly **25–50 flat auction rounds per year** across multiple batches, consistent with a city of ~120 000 population running a regular programme.

**Land/building volume:**
- Ogłoszenie Nr 34/2024 (June 2024): 6 land/industrial plots, 1 sold (ul. Piłsudskiego — cena wywoławcza 3 053 500 zł, achieved 3 153 500 zł), 5 failed (wynik negatywny). Land auctions are less frequent and lower success rate.

**Achieved-price stream:**
- Confirmed published in result PDFs with explicit `cena netto osiągnięta w przetargu [zł]` column.
- Result PDFs published ~7–12 days after auction date (auction 12.09.2024 → result dated 20.09.2024).
- Buyer name also listed in result PDF (`osoba ustalona nabywcą nieruchomości`) — may need redaction in public-facing output.
- Failed auctions noted with dash (―) in achieved-price column and footnote *przetarg zakończył się wynikiem negatywnym*.

---

## 5. Adapter effort + verdict

**Closest analogs:** Bytom / Zabrze — same pattern of batch flat announcements as PDFs on BIP HTML stubs, result PDFs with inline achieved prices. Unlike Bydgoszcz, no DOCX parsing needed — prices are in PDF tables.

**Delta vs. Bytom/Zabrze:**
1. **PDF parsing for both announcements and results** — same as Bytom. Flat-auction data is all in PDFs, not inline HTML. Requires a PDF-to-table extractor (pdfplumber / camelot). The tables are well-structured and born-digital, so extraction should be reliable.
2. **HTML list pages are fragile** — live test showed empty responses and timeouts on the BIP index. Adapter must handle graceful retries, fall back to direct PDF URL patterns if index scrape fails.
3. **Two-section BIP:** announcements at `/przetargi/320/` and results at `/509/` (separate section). Adapter needs to poll both.
4. **No separate housing-manager BIP** — single source (city BIP). Simpler than cities with parallel TBS/ZBM channels.
5. **XML feed available** — `bip.um.gorzow.pl/przetargi/xml/29/674/wersja/` may offer a more stable index than HTML scraping; worth evaluating as primary poll mechanism.

**Blockers:** None hard. PDF table extraction is standard work.

**Risks:**
- BIP HTML index instability (timeouts observed) — mitigate by targeting XML feed and direct PDF URLs.
- Buyer name in result PDFs (`osoba ustalona nabywcą`) — verify whether the adapter should suppress personal data before storage/display.
- Batch pattern means irregular cadence: some months may have 2 rounds of 12 flats, others zero. Polling must cover both `/przetargi/320/status/` (announcements) and `/509/` (results), with full history scrape on first run.
- The BIP URL for result notices is extremely long (as seen in search results) — URL-length handling and slug normalisation needed.

**Effort estimate:** Low-Medium (1.5–2.5 days). PDF table parser (pdfplumber) = 0.5 day. BIP index poller (HTML + XML fallback, two sections) = 0.5–1 day. Data model mapping + tests = 0.5–1 day.

**VERDICT: BUILD — Low-Medium effort.**

Single reliable BIP (`bip.um.gorzow.pl`), confirmed recurring flat-auction stream (12 flats/batch, multi-round), born-digital PDFs with inline achieved prices in a structured table. No DOCX parsing, no auth, no JS rendering. Closest analogy: Bytom/Zabrze adapter (batch PDF pattern). Primary risk is BIP index page instability — mitigated by XML feed fallback.
