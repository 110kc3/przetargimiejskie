# Spike — Gniezno (Wielkopolskie · powiat gnieźnieński)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Gniezno (≠ Gmina Gniezno — the rural ring) sells municipal flats via *przetarg ustny nieograniczony* published on **bip.gniezno.eu**. The housing manager is **URBIS Sp. z o.o.** but URBIS only handles *najem* (rental) auctions — the flat *sales* are run directly by the Urząd Miejski (Wydział Majątkowy). Announcement PDFs + result PDFs are attached to each BIP entry; result notices are also published as short HTML news items on **gniezno.eu**. Volume is moderate: ~4–8 flat-sale entries per year. Achieved-price data is machine-parseable from HTML result notices on gniezno.eu. No auth/bot block encountered on BIP; PDF reading needed for announcements.

---

## 1. Sells municipal property at auction?

**YES — confirmed *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*.**

The city routinely auctions municipal flats (niewyodrębnione lokale mieszkalne) via open oral auctions. Multiple confirmed examples:

- **ul. Sienkiewicza 19/8** — IV przetarg, wynik pozytywny, cena osiągnięta 106 885 zł (published 24 June 2025 on gniezno.eu)
- **ul. Wyszyńskiego 18/14** (WM.6840.21.2024) — ran through I, II, III, IV przetarg; IV ended in unieważnienie (Feb 2026)
- **ul. Chrobrego 11/5A** (WM.6840.22.2024) — III przetarg wynik negatywny (April 2025, no bidders)
- **ul. Staszica 11A/8** (WM.6840.17.2022) — I przetarg + wynik PDF confirmed
- **ul. Dąbrówki 17/9** (WM.6840.14.2025) — listed 2025
- **ul. Budowlanych 30/11** (WM.6840.6.2025) — listed 2025
- **ul. Armii Krajowej 4/14A** (WM.6840.42.2024) — listed 2025
- **ul. Mieszka I 54/12** (WM.6840.12.2023) — listed on 2025 pages
- **ul. Żeromskiego 15** (WM.6840.44.2022) — listed on 2025 pages
- **ul. Różana 9** (WM.6840.32.2024) — listed 2025

Also confirmed: bezprzetargowa sprzedaż (direct sale to tenant) exists in parallel (wykazy published on gniezno.eu), but the auction track is active and separate.

**URBIS Sp. z o.o.** (ul. Chrobrego 24/25, 62-200 Gniezno; urbis@urbis.gniezno.pl; tel. 61 424 58 00) — manages *najem* przetargi (rental auctions for renovation flats) only. Not the source for *sprzedaż*.

---

## 2. Where published? (hosts + boards, URLs)

### Announcements (ogłoszenia przetargów)

- **BIP — primary board:**
  `https://bip.gniezno.eu/wiadomosci/11287/lista/przetargi_na_sprzedaz_i_dzierzawe_nieruchomosci`
  Year-filtered: `https://bip.gniezno.eu/wiadomosci/11287/lista/1/2025` (page 1), `/lista/2/2025`, etc.
  Each entry is a BIP sub-page containing PDF attachments (ogłoszenie + wynik per round).

### Result notices (wyniki przetargów — achieved price)

Two parallel channels:
1. **BIP entry — PDF attachment** — each BIP property record accumulates "Wynik I przetargu", "Wynik II przetargu" etc. as separate PDF files (typically ~58–73 KB).
2. **gniezno.eu news item — inline HTML** — shorter HTML result notice published in the Aktualności category, contains structured plain-text with cena wywoławcza, cena osiągnięta, nabywca. Example:
   `https://www.gniezno.eu/wiadomosci/1/wiadomosc/237765/przetarg_na_sprzedaz_lokalu_mieszkalnego_przy_ulicy_sienkiewicza`
   `https://www.gniezno.eu/wiadomosci/1/wiadomosc/235852/przetarg_na_sprzedaz_lokalu_mieszkalnego_przy_ulicy_chrobrego__w`

---

## 3. Format + rendering

| Layer | Format | Notes |
|---|---|---|
| BIP listing page | **HTML** (IDcom.pl CMS) | Plain text list of entry titles with links, paginated (10/page), year filter via URL segment |
| BIP per-entry page | **HTML wrapper + PDF attachments** | Entry body is minimal; content is in attached PDFs named ogłoszenie/wynik |
| Announcement document | **text-PDF** (~400–430 KB) | Machine-readable (not scanned); contains address, area, KW number, cena wywoławcza, wadium, date/place |
| Result document (BIP) | **text-PDF** (~58–73 KB) | Contains cena wywoławcza, cena osiągnięta, nabywca |
| Result notice (gniezno.eu) | **inline HTML** | Short article; structured fields parseable with regex (cena wywoławcza / najwyższa cena / nabywca) |

No authentication required. No JS SPA (standard server-rendered HTML). The BIP uses IDcom.pl CMS — the same platform as some other Wielkopolska BIPs. No CAPTCHA or bot block observed during live browsing session.

**Risk:** older/archived BIP entries return "Brak wiadomości" (entry moved to archive, broken URL). Active entries are reachable. The gniezno.eu result notices are the most reliable HTML stream for achieved prices.

---

## 4. Volume + achieved-price stream

**Estimated volume:** ~6–10 flat-sale BIP entries per year (across all rounds). Since each flat may go through I–IV przetarg rounds, unique flats going to auction per year is approximately **3–6**. Some resolve negatively (brak uczestnika / unieważnienie).

**Achieved-price availability:**
- **YES** — confirmed on gniezno.eu as inline HTML for positive results (Sienkiewicza: 106 885 zł; Wyszyńskiego land parcel: 1 497 189 zł; Stachowiak named as nabywca).
- Negative results also published ("wynik negatywny", "brak postąpienia").
- BIP PDF result files also contain this data.

**Mix of types:** The main BIP board mixes flat sales with land (działki), commercial (lokale użytkowe), and lease (dzierżawa). Filter criterion: entry title contains "lokal mieszkalny" or "Sprzedaż - ul. X/Y" with apartment number pattern.

---

## 5. Adapter effort + verdict

**Closest analog:** **Bytom** or **Tarnowskie Góry** pattern — city BIP on IDcom.pl CMS, flat sales published as PDF attachments on BIP entries, result notices separately on city main site as HTML. Moderate volume, no bot block.

**Adapter design:**

1. **Scrape BIP listing** — paginated HTML list at `bip.gniezno.eu/wiadomosci/11287/lista/{page}/{year}`. Detect flat-sale entries by title pattern (lokal mieszkalny / ul. X/N).
2. **Parse BIP entry page** — extract PDF attachment links for ogłoszenie + wynik files.
3. **Parse ogłoszenie PDF** — extract: address, area (m²), KW number, cena wywoławcza, wadium, date, round number. Text-PDF so pdfplumber / pymupdf works cleanly.
4. **Parse wynik PDF** — extract: cena osiągnięta, nabywca, przetarg round, positive/negative flag.
5. **Optionally scrape gniezno.eu Aktualności** for the HTML result notices (easier regex extraction of achieved price as cross-check).

**Blockers / risks:**
- Multiple przetarg rounds per flat require deduplication by (address, WM reference number).
- Some archive entries return 404/"Brak wiadomości" — need graceful handling.
- Volume is lower than Kraków/Gliwice (~3–6 unique flats/year vs 20–50); still worth building if the region is being covered systematically.
- bezprzetargowa track exists in parallel — must not confuse wykazy (no-auction sales) with auction entries.

**Effort estimate:** Medium — 2–3 days. BIP HTML scraping is straightforward; PDF parsing adds 1 day. No auth, no SPA, no OCR needed. Reusable IDcom.pl patterns if already built for other cities.

**VERDICT: BUILD** — confirmed flat auctions with achieved-price data, accessible HTML+text-PDF, no bot block. Low-to-medium data density but clean format. (High confidence — LIVE-VERIFIED in Chrome session.)

---

## Sources

- BIP listing (przetargi na sprzedaż i dzierżawę): https://bip.gniezno.eu/wiadomosci/11287/lista/przetargi_na_sprzedaz_i_dzierzawe_nieruchomosci
- BIP 2025 page 1: https://bip.gniezno.eu/wiadomosci/11287/lista/1/2025
- BIP 2025 page 2: https://bip.gniezno.eu/wiadomosci/11287/lista/2/2025
- BIP 2025 page 3: https://bip.gniezno.eu/wiadomosci/11287/lista/3/2025
- BIP 2024 listings: https://bip.gniezno.eu/wiadomosci/11287/lista/1/2024
- Live BIP entry (Wyszyńskiego 18/14, flat): https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/805965/przetarg_ustny_nieograniczony_na_sprzedaz_lokalu_stanowiacego_wl
- Live BIP entry (Staszica 11A/8, flat): https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/635492/sprzedaz__ul_staszica_11a8_wm6840172022
- Result notice Sienkiewicza (HTML, gniezno.eu): https://www.gniezno.eu/wiadomosci/1/wiadomosc/237765/przetarg_na_sprzedaz_lokalu_mieszkalnego_przy_ulicy_sienkiewicza
- Result notice Chrobrego (HTML, gniezno.eu): https://www.gniezno.eu/wiadomosci/1/wiadomosc/235852/przetarg_na_sprzedaz_lokalu_mieszkalnego_przy_ulicy_chrobrego__w
- Result notice Wyszyńskiego land (HTML, gniezno.eu): https://www.gniezno.eu/wiadomosci/1/wiadomosc/235510/wyniki_przetargow_przy_ulicy_ks_prymasa_stefana_wyszynskiego
- URBIS (rental manager, not sales): https://urbis.gniezno.pl/category/przetargi/lokale-mieszkalne/
- gniezno.eu nieruchomości hub: https://www.gniezno.eu/cms/22885/nieruchomosci
