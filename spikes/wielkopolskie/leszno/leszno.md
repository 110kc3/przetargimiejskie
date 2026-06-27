# Spike — Leszno (Wielkopolskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low volume, Low effort if built).

## TL;DR

Leszno does auction municipal flats (*lokal mieszkalny*) via *przetarg ustny nieograniczony* — confirmed 2 flat auctions in October 2024. However, volume is very low (only 2 flats found across the entire searchable BIP history; ~270 total auction records across all categories). The dominant category is unbuilt land (nieruchomości niezabudowane). The housing manager MZBK Leszno exists but publishes only rental-of-commercial-units tenders, not flat sales. Flat sales are published exclusively on the city BIP. The BIP is clean HTML with no auth or bot blocks — scraping is straightforward — but the flat signal is too thin to justify a dedicated adapter at this time.

---

## 1. Sells municipal property at auction?

**YES — including flats, but at very low volume.**

Two confirmed *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* entries found, both published 31 October 2024 and auctioned 3 December 2024:

- **ul. por. Leona Włodarczaka 35/7** — 52.15 m², 3 rooms, cena wywoławcza 226 000 zł (4 333.65 zł/m²). Result notice published 12.12.2024.  
  URL: <https://bip.leszno.pl/przetarg-nieruchomosci/12465/leszno-ul-por-leona-wlodarczaka-nr-35-lokal-mieszkalny-nr-7>
- **ul. 17 Stycznia 22/7** — 63.70 m², 4 rooms, cena wywoławcza 266 000 zł (4 175.82 zł/m²). Result notice published 12.12.2024.  
  URL: <https://bip.leszno.pl/przetarg-nieruchomosci/12464/leszno-ul-17-stycznia-nr-22-lokal-mieszkalny-nr-7>

Both are genuine *ustny przetarg nieograniczony*, not bezprzetargowe. Both were resolved (Rozstrzygnięte) with result notices.

The BIP search filter explicitly offers "lokal mieszkalny" as a *Rodzaj nieruchomości* category, confirming the system tracks this type. The archive covers from 2017 onwards (27 pages × 10 = ~270 records, with pre-2016 entries in a separate archive at archiwum.bip.leszno.pl). Flat auctions appear roughly 1–2 per year based on visible search results; 2025 and 2026 show zero flat auctions so far (all current listings are land or commercial).

**Housing manager (MZBK):** Miejski Zakład Budynków Komunalnych w Lesznie, ul. Jana Dekana 10, 64-100 Leszno. BIP: <https://bip.mzbk-leszno.pl/>. MZBK manages rental of commercial lokale użytkowe only — it does NOT publish flat-sale przetargi. Flat sales go through Wydział Gospodarki Nieruchomościami at the city UM.

---

## 2. Where published? (hosts + boards, URLs)

**Single source: city BIP only.**

| Board | URL | Content |
|---|---|---|
| Przetargi na nieruchomości (main list) | <https://bip.leszno.pl/przetargi-nieruchomosci/43> | Active + resolved auctions, all property types |
| Individual auction record | `https://bip.leszno.pl/przetarg-nieruchomosci/{ID}/{slug}` | Full details incl. result attachment |
| XML feed for list | `https://bip.leszno.pl/przetargi-nieruchomosci/xml/1/1` | Machine-readable index |
| Individual record XML | `https://bip.leszno.pl/przetarg-nieruchomosci/xml/{ID}/1` | Per-record XML |
| Pre-2016 archive | <http://archiwum.bip.leszno.pl/dokumenty> | Older records |
| MZBK BIP (commercial rentals only) | <https://bip.mzbk-leszno.pl/artykuly/80/przetargi> | Rental tenders for lokale użytkowe, NOT flat sales |

**Result notices** are attached directly to the auction record page (as `.doc` files linked under "Rozstrzygnięcie" heading). They are NOT on a separate board. The link text and URL confirm the achieved-price outcome is published post-auction.

No secondary aggregators observed. MZBK also has a second BIP mirror at `mzbk-leszno.bip.gov.pl` (government BIP portal) which redirects to `bip.mzbk-leszno.pl`.

---

## 3. Format + rendering

- **Listing page:** Clean server-rendered HTML table. Each record is one `<table>` block with labelled rows (Adres, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu). No JavaScript required to render content.
- **Individual record page:** Same HTML stack (Logonet BIP CMS v2.9.0). Structured table + attachments section.
- **XML feed:** Available at `…/xml/…` endpoints — machine-readable alternative to scraping HTML.
- **Result notice:** Attached as `.doc` (Word document). Not embedded in HTML. Achieved price is in the `.doc` attachment, not directly in the HTML page body.
- **Announcement attachment:** `.doc` file (1.1–1.3 MB), downloadable. Full auction text is in the Word doc; the HTML page shows only summary fields.
- **Pagination:** 10/15/20/25 per page; 27 pages total as of 2026-06-27. Page URL pattern: `https://bip.leszno.pl/przetargi-nieruchomosci/{PAGE}/{PER_PAGE}`.
- **Auth/bot blocks:** None observed. No CAPTCHA, no login wall. Cookie consent banner only (cosmetic). `meta-robots: index,follow,all` confirms open crawling intended.
- **CMS:** Logonet Sp. z o.o. (Bydgoszcz), same vendor as several other Polish BIPs.

**Key scraping risk:** Achieved prices are in `.doc` attachments, not in HTML. To extract the final sale price, the adapter would need to download and parse Word documents, adding complexity.

---

## 4. Volume + achieved-price stream

| Metric | Value |
|---|---|
| Total auction records (all types, 2017–2026) | ~270 (27 pages × 10) |
| Flat auctions confirmed in visible results | 2 (both Oct 2024, same batch) |
| Flat auctions in 2025 | 0 (none found in search) |
| Flat auctions in 2026 YTD | 0 |
| Estimated annual flat auction rate | ~1–3/year (very low) |
| Dominant category | Nieruchomości niezabudowane (unbuilt land), commercial |
| Achieved-price location | `.doc` attachment on each record page ("Rozstrzygnięcie" section) |
| Price in HTML | NO — cena wywoławcza (reserve price) only |

The achieved price stream is available but locked inside Word documents. The HTML gives the reserve price; the final bid price requires `.doc` parsing.

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom or Tarnowskie Góry — standard Logonet BIP, HTML list + individual record pages, structured tables, same CMS.

**Effort breakdown:**

| Component | Assessment |
|---|---|
| List scraper | Low — clean HTML tables, pagination URL pattern, XML feed available as alternative |
| Record parser | Low — structured HTML table fields |
| Achieved price | Medium — requires `.doc` download + text extraction (python-docx or similar) |
| Filtering for lokale mieszkalne | Low — BIP search accepts `Rodzaj nieruchomości=lokal mieszkalny` filter; also filterable in URL params |
| Auth/anti-bot | None |
| Volume justification | Weak — ~2 flat auctions/year; total dataset thin |

**Blockers:**
1. Achieved price not in HTML — requires Word document parsing.
2. Volume is very low; flat auctions are occasional outliers in a land-auction-dominated BIP. Full years (2025, 2026 so far) show zero flat entries.

**Risks:**
- The 2 found flat auctions may represent an exceptional batch; historical volumes in the pre-2016 archive are unknown.
- MZBK does not publish flat sales, so there is no secondary stream to capture.
- Logonet BIP CMS is stable and well-structured (low technical risk), but the Word-doc result-notice extraction adds a dependency.

**Verdict: NO-BUILD.** Volume is too low (~2 flat auctions/year at best) to justify the adapter build cost, especially given the `.doc` result-notice extraction requirement. If flat auction volume increases or a full historical audit shows more entries in the pre-2016 archive, revisit. The technical adapter itself would be Low effort (Logonet BIP is well-understood), but the signal/noise ratio does not warrant it today.

**Confidence: Medium** — confirmed flat auctions exist and BIP format is live-verified, but 2025 shows zero, making annual volume estimate uncertain. A full crawl of all 27 pages filtered by `lokal mieszkalny` would give a definitive count; this was not done (would require JS-driven form submit or XML-endpoint parameter testing).
