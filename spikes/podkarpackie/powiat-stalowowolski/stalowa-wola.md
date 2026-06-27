# Spike — Stalowa Wola (Podkarpackie · powiat stalowowolski)

> **Status:** spike DESK — 2026-06-27. VERDICT: NO-BUILD (Medium effort to confirm, Low confidence BUILD signal).

## TL;DR

Gmina Stalowa Wola (Prezydent Miasta) does hold ustny przetarg nieograniczony auctions for municipal property, but the confirmed auction stream is **commercial/land only** — office buildings, undeveloped plots, commercial-zoned parcels. Municipal flat (lokal mieszkalny) disposals are conducted almost exclusively **bezprzetargowo** (without tender) to sitting tenants, with bonifikaty up to 99% of value. NIK audit confirmed this for the 2016–2021 period (149 of 151 communal flats sold bezprzetargowo). No gmina-issued flat-auction notices were found in the current BIP or Monitor Urzędowy stream as of 2026-06-27. The only flat-przetarg identified in Stalowa Wola was by **Spółdzielnia Mieszkaniowa** (housing cooperative, not gmina) in 2019. The housing company MZB Stalowa Wola (Miejski Zakład Budynków Sp. z o.o.) runs procurement for construction contracts (building housing blocks), not sales. SIM Stalowa Wola is a rental-only TBS scheme (Nowa Perspektywa / Osiedle Leśna).

---

## 1. Sells municipal property at auction?

**Yes — but NOT flats.**

The Prezydent Miasta Stalowej Woli (via Wydział Mienia Gminnego i Gospodarki Lokalami, ul. Wolności 9, pok. 37/39, tel. 15 6433455) regularly auctions municipal property under art. 38 u.g.n. (ustawa o gospodarce nieruchomościami):

- **Confirmed 2026 przetargi (ustny nieograniczony):**
  - 2026-04-17: nieruchomość zabudowana przy ul. Energetyków 11A (biurowo-usługowa, 948 m², cena wywoławcza 2 360 000 zł) — ref. MGL.6840.15.2026.EB
  - 2026-04-16: nieruchomość gruntowa przy ul. Energetyków (commercial-zoned plot)
- **Also announced:** bezprzetargowa disposal + przetarg ustny ograniczony within the same Zarządzenie Nr 60/2026.

**Municipal flats:** Sprzedaż bezprzetargowa na rzecz najemców is the dominant channel. NIK (audit covering 2016–2021, Podkarpackie voivodeship was in scope) found Stalowa Wola sold 149/151 communal flats bezprzetargowo with a 99% bonifikata — highest of all audited gminas. This structural policy has continued; wykazy nieruchomości przeznaczonych do sprzedaży (June 2026 Monitor Urzędowy entries) cover individual plots and lease/użyczenie purposes, not batch flat sales at auction. No "ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych" issued by the gmina was found in any source.

---

## 2. Where published? (hosts + boards, URLs)

**Primary: City BIP**
- `https://bip.stalowawola.pl/` — main BIP (SPA, renders server-side; direct URL fragments work)
- Property-auction section: `https://bip.stalowawola.pl//?c=mdTresc-cmPokaz-1202` (nieruchomości)
- Procurement (zamówienia publiczne): `https://bip.stalowawola.pl//?c=mdPrzetargi-cmPokaz-1203`

**Secondary: Monitor Urzędowy**
- Gmina's official profile: `https://monitorurzedowy.pl/office/1491/urzad-miasta-stalowa-wola`
- Used for: OGŁOSZENIE O PRZETARGU, INFORMACJA O WYWIESZENIU WYKAZU NIERUCHOMOŚCI, lease notices
- Also published in local paper **Sztafeta** (weekly) and on physical notice board at ul. Wolności 7

**Housing entities (not gmina flat-sales):**
- MZB BIP (construction procurement only): `http://bip.mzb-stalowawola.pl/index.php?menu=przetargi`
- MZB main site przetargi: `https://www.mzb-stalowa.pl/Przetargi.php`
- SM Stalowa Wola (cooperative, not gmina): `https://sm.stalowawola.pl/przetargi/`
- SIM Stalowa Wola (TBS rental scheme): `https://www.simstalowawola.pl/`

**Result/achieved-price notices:**
- Rozstrzygnięcia published back on same BIP path (`bip.stalowawola.pl`) and Monitor Urzędowy
- No separate dedicated results board found

---

## 3. Format + rendering

**bip.stalowawola.pl:**
- Server-rendered HTML; URL query-string navigation (`?c=mdTresc-cmPokaz-NNNN`)
- Announcements as HTML text on page; attachments as PDF files (linked inline)
- Attachment PDFs appear to be text-PDF (digitally produced), not scanned — confirmed by file sizes (100–600 KB range) on zamówienia pages
- No login/auth wall found; no CAPTCHA observed on BIP pages
- The BIP loaded empty content on bare `/` (JS-heavy index page), but specific `?c=` URLs rendered server-side HTML successfully
- **Rate-limiting / bot-blocks:** web_fetch returned content on specific BIP URLs without issues; Monitor Urzędowy has standard HTML, no bot-block observed

**Monitor Urzędowy:**
- Standard HTML page; announcement bodies are plain text (copy-pasteable)
- Attachments: JPEG image scan attached to the April 2026 przetarg (działka plan map), not the announcement text itself
- Full announcement text embedded in HTML body — no PDF required for the notice itself

**Overall format verdict:** HTML primary, text-PDF attachments, no OCR requirement for announcement text.

---

## 4. Volume + achieved-price stream

**Land/commercial auctions:**
- Low-moderate frequency: ~2–6 property auctions per year based on Monitor Urzędowy profile (only ~6 announcements visible in office listing, spanning multiple years)
- No dedicated "wyniki przetargu" archive page found; results presumably posted as separate BIP entries

**Flat auctions (gmina):** ZERO confirmed in any monitored period. All flat disposals bezprzetargowo.

**Flat auctions (SM cooperative):** 1 found (2019, single unit 21.66 m², ul. Okulickiego 56A). SM is separate legal entity, not gmina.

**Achieved-price data:** No structured results feed. Results mentioned as "rozstrzygnięte" toggle on BIP przetargi page; individual announcement pages may contain outcome text. No API or JSON endpoint found.

**Budget 2024 context:** Stalowa Wola planned total property sale proceeds of ~56 033 000 zł for 2024, of which only ~5 033 000 zł via przetarg/bezprzetargowo combined — suggesting modest volume and mostly commercial/land assets.

---

## 5. Adapter effort + verdict

**Closest analog among known adapters:** None fits well. Gliwice/Zabrze/Bytom/Kraków all have flat-auction streams worth scraping. Stalowa Wola's commercial-property auctions are structurally similar to Bytom land auctions — but the **target product (lokale mieszkalne) is absent from the auction stream entirely**.

**Architecture if forced:**
- Scrape: `bip.stalowawola.pl/?c=mdTresc-cmPokaz-1202` + Monitor Urzędowy office feed
- Parse: HTML extraction (straightforward — no SPA rendering needed on `?c=` URLs)
- Result notices: separate BIP entries, no structured feed
- Effort: Low-Medium (HTML scraper, no OCR, no auth)

**Blockers:**
1. **No flat auctions.** The core use-case (lokal mieszkalny przetarg) does not exist for this gmina. Municipal flats go bezprzetargowo to tenants at 99% discount — there is nothing to surface to end-users looking to bid on apartments.
2. **Commercial-only volume is thin** (~2–6 land/office auctions/year). Not enough to justify a standalone adapter.
3. **BIP is a legacy SPA** (bare `/` loads empty; specific `?c=` fragments work but discovery of new announcement IDs requires crawling the index).

**Risks:**
- BIP may change URL scheme (legacy PHP system, "Wygenerowano: 22 czerwca 2018" footer on przetargi page suggests old infrastructure)
- SM cooperative flat-auctions are irregular one-offs, not a reliable stream

**Verdict:** **NO-BUILD.** The gmina does not auction flats. Commercial/land auctions exist but are low-volume and off-target for the platform's core value proposition (flat-auction aggregation). Revisit only if the gmina's policy shifts to przetarg-based flat privatization, which would require a uchwała change.

---

## Sources

- Monitor Urzędowy — Urząd Miasta Stalowa Wola profile: https://monitorurzedowy.pl/office/1491/urzad-miasta-stalowa-wola
- Przetarg biurowo-usługowy ul. Energetyków 11A (2026-04-17): https://monitorurzedowy.pl/announcement/1700896/ogloszenie-o-przetargu
- City BIP property section: https://bip.stalowawola.pl//?c=mdTresc-cmPokaz-1202
- City BIP procurement section: https://bip.stalowawola.pl//?c=mdPrzetargi-cmPokaz-1203
- MZB BIP (construction procurement): http://bip.mzb-stalowawola.pl/index.php?menu=przetargi
- SM flat przetarg 2019 (cooperative, not gmina): https://listaprzetargow.pl/oferty/30225-przetarg-mieszkanie-stalowa-wola-podkarpackie
- NIK audit — prywatyzacja mieszkań komunalnych (Stalowa Wola: 149/151 bezprzetargowo, 99% bonifikata): https://www.nik.gov.pl/najnowsze-informacje-o-wynikach-kontroli/prywatyzacja-mieszkan-komunalnych.html
- Wydział Mienia Gminnego i Gospodarki Lokalami: https://www.stalowawola.pl/pl/wydzial-mienia-gminnego-i-gospodarki-lokalami.html
- SIM Stalowa Wola (TBS rental, not auctions): https://www.simstalowawola.pl/
