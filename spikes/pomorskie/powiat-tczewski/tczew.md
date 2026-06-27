# Spike — Tczew (Pomorskie · powiat tczewski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miejska Tczew (pop. ~60 000) runs genuine ustny przetarg nieograniczony on lokale mieszkalne directly through the city BIP (bip.tczew.pl), managed by the Wydział Gospodarki Nieruchomościami. A second publisher, TTBS (Tczewskie Towarzystwo Budownictwa Społecznego Sp. z o.o.), also auctions TBS-owned residential units independently. Volume is low (2–4 flats/year combined), but both announcement and result notices are published on bip.tczew.pl. The blocker is that **result notices are PDF attachments**, not inline HTML — the price-achieved datum requires PDF parsing. Announcement text also appears only in attached PDFs on the result entries; the list-page titles are parseable HTML. Closest analog: **Bytom** (small-volume, city-BIP-only, PDF result notices). No SPA, no auth wall; pages served by IDcom.pl platform, same as many Śląsk cities.

## 1. Sells municipal property at auction?

**YES — confirmed, flat-auction LIVE-VERIFIED.**

Gmina Miejska Tczew (not gmina wiejska Tczew) auctions lokale mieszkalne via first and repeat rounds of ustny przetarg nieograniczony. Confirmed examples (all bip.tczew.pl):

- **ul. Elżbiety 4 / lokal nr 5** — I przetarg announced, result (wynik) published 2026-03-11.
- **ul. Ceglarska 11/1**, **ul. Armii Krajowej 31/1**, **ul. Saperska 11/31** — batch of 3 flats auctioned April 15, 2025 (starting prices 160 000–300 000 PLN).
- **ul. Okrzei 16 / lokal nr 2** — I przetarg ustny nieograniczony (search-confirmed title).
- **ul. Podgórna 3 / lokal nr 3** — further confirmed in search snippets.

Additionally, **TTBS Tczew** (tbs.tczew.pl) auctions its own residential stock:
- **ul. Warsztatowa 4 / lokal nr 2** — II przetarg ustny nieograniczony, January 24, 2025, cena wywoławcza 126 000 PLN (PDF fetched directly: text-PDF, machine-readable).

Also confirmed separate bezprzetargowy track (wykup przez najemcę): these are published in the Sprzedaż section under `/wiadomosci/1157/` — distinguishable from przetarg entries by the "bezprzetargowej" keyword in the title.

**Flat-auction volume estimate:** ~2–5 flats/year across both publishers. Low but real.

## 2. Where published? (hosts + boards, URLs)

### Publisher A — Gmina Miejska Tczew / Wydział Gospodarki Nieruchomościami

| Board | URL |
|---|---|
| Przetargi (current) | https://bip.tczew.pl/wiadomosci/3/lista/przetargi |
| Przetargi archiwum (all years) | https://bip.tczew.pl/wiadomosci/archiwum/3/lista/1/przetargi |
| Przetargi archiwum 2026 | https://bip.tczew.pl/wiadomosci/archiwum/3/lista/1/2026 |
| Nieruchomości – Sprzedaż (current) | https://bip.tczew.pl/wiadomosci/1157/sprzedaz |
| Nieruchomości – Sprzedaż archiwum | https://bip.tczew.pl/wiadomosci/archiwum/1157/lista/1/sprzedaz |

- Platform: **IDcom.pl** (bip-v1 instance, host `bip.tczew.pl`; static files on `bip-v1-files.idcom-jst.pl`)
- Individual announcement entries: `https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/{ID}/{slug}`
- Result notice entries: same pattern, titled "Ogłoszenie o wyniku…" — contain a PDF attachment

### Publisher B — TTBS (Tczewskie Towarzystwo Budownictwa Społecznego Sp. z o.o.)

- Website: https://tbs.tczew.pl
- Auction PDFs: `https://tbs.tczew.pl/wp-content/uploads/{year}/{month}/ogloszenie-*.pdf`
- No dedicated BIP list page found; PDFs are surfaced via website news/aktualności section
- Contact: ul. Kołłątaja 9, Tczew; tel. (58) 530-11-00

### Publisher C — ZUK Tczew (Zakład Usług Komunalnych)

- BIP przetargi board: https://zuktczew.bipstrona.pl/wiadomosci/3/lista/przetargi
- Appears to publish service/works tenders; no evidence of flat-sale przetargi (different function from housing manager)

### Publisher D — ZGM / ZGKZM Tczew

- ZGM (Zakład Gospodarki Mieszkaniowej) and ZGKZM (Zakład Gospodarki Komunalnym Zasobem Mieszkaniowym) manage communal housing stock operationally
- **No separate BIP** for ZGM/ZGKZM found for sale auctions — flat przetargi published centrally via UM Tczew BIP (Publisher A)
- Plans to merge ZGM + TTBS confirmed in local press (status unclear)

## 3. Format + rendering

| Element | Format | Notes |
|---|---|---|
| Announcement list pages | **HTML** — plain, no JS required | IDcom.pl platform; `web_fetch` renders fully; title linkable |
| Announcement detail page | **HTML** — may contain inline text OR PDF attachment only | Varies by entry; some entries have announcement text inline, others redirect to attached PDF |
| Result notice (wynik) | **PDF attachment** — text-PDF | Entry page has title in HTML but the price-achieved text is inside the PDF (e.g. `ogloszenie_o_wyniku_przetargu.pdf`, 472 KB) |
| TTBS announcements | **Text-PDF** on WordPress site | Machine-readable, not scanned; structured form with table-like layout |
| No auth/bot blocks | Confirmed — `web_fetch` fetched all pages without challenge | IDcom.pl serves without CAPTCHA or login |
| No SPA | Confirmed — standard server-rendered HTML | Year filter via URL query param |

**Critical parse challenge:** The `wyniku` (result) detail page links to a PDF. The achieved price is only in that PDF, not inline in the HTML. PDF is text-based (not scanned), so pdfminer/pypdf works — but adds a PDF-fetch + parse step per result.

## 4. Volume + achieved-price stream

**Announcement volume (przetargi lokale mieszkalne):**
- 2025: at least 4–5 flats auctioned (batch of 3 on April 15 + Elżbiety 4 + Okrzei 16 + Podgórna 3 identified in search snippets)
- 2026 (to June): 1 flat confirmed (Elżbiety 4 wynik March 2026)
- TTBS 2024/2025: at least 1 flat (Warsztatowa 4, II przetarg Jan 2025)
- **Combined estimate: 3–6 auctions/year**; moderate repeat-round rate

**Achieved-price stream:**
- Published as "Ogłoszenie o wyniku" entries on bip.tczew.pl — confirmed for Elżbiety 4 (March 2026)
- Price datum is inside the PDF attachment, NOT in the HTML list title
- TTBS result notices: not yet found on tbs.tczew.pl (may be published separately or only on UM BIP)

**Year filter URL pattern** (for incremental polling):
- `https://bip.tczew.pl/wiadomosci/archiwum/3/lista/1/{YYYY}` — one page per year, no pagination observed

## 5. Adapter effort + verdict

**Closest analog:** **Bytom** — small city, city-BIP-only publisher (IDcom.pl platform), low flat-auction volume, PDF result notices, no dedicated housing-manager BIP.

**Architecture:**
1. Poll `bip.tczew.pl/wiadomosci/archiwum/3/lista/1/{YYYY}` — parse HTML list for entries titled "przetarg ustny nieograniczony … lokal mieszkalny"
2. For each announcement entry: fetch detail page HTML → check for inline text vs. PDF link → if PDF, fetch and parse with pdfminer
3. For result notices (same list, titles starting "Ogłoszenie o wyniku"): fetch detail page → download PDF attachment → extract achieved price
4. Optional: poll `tbs.tczew.pl/aktualnosci/` for TTBS PDFs → fetch and parse

**Effort rating: Medium**
- IDcom.pl HTML parsing: low complexity (same platform pattern as other cities)
- PDF result-notice parsing: adds ~1 day of work (text-PDF, not scanned — straightforward)
- TTBS secondary publisher: optional; adds scraping of a WordPress blog for PDFs
- No scanned PDFs, no SPA, no auth

**Blockers / risks:**
- Result prices in PDFs only — no inline HTML price field (medium risk; text-PDFs are reliable)
- TTBS publishes independently on WordPress — no BIP discipline, file naming may vary
- Low volume (~3–6/year) means ROI is low per-city but the pattern is clean

**VERDICT: BUILD** — Tczew auctions genuine lokale mieszkalne via ustny przetarg nieograniczony on bip.tczew.pl. Result notices with achieved price exist and are parseable (text-PDF). TTBS is a bonus second publisher. Medium effort primarily because of the PDF-result-notice step.

---

**Sources:**
- BIP Urząd Miejski w Tczewie — przetargi: https://bip.tczew.pl/wiadomosci/archiwum/3/lista/1/przetargi
- BIP przetargi 2026: https://bip.tczew.pl/wiadomosci/archiwum/3/lista/1/2026
- Wynik I przetargu — Elżbiety 4 lokal nr 5 (2026-03-11): https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/871415/ogloszenie_o_wyniku_i_przetargu_ustnego_nieograniczonego_na_sprz
- BIP Nieruchomości–Sprzedaż: https://bip.tczew.pl/wiadomosci/1157/sprzedaz
- TTBS Tczew — II przetarg Warsztatowa 4 PDF (2024-12): https://tbs.tczew.pl/wp-content/uploads/2024/12/ogloszenie-o-II-przetargu-ul.-Warsztatowa-4.pdf
- tczew.pl mieszkania komunalne na sprzedaż: https://tczew.pl/mieszkania-komunalne-na-sprzedaz-2/
- ZUK Tczew BIP: https://zuktczew.bipstrona.pl/wiadomosci/3/lista/przetargi
