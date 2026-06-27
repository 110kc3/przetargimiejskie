# Spike — Ostrów Wielkopolski (Wielkopolskie · powiat ostrowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Ostrów Wielkopolski (pop. ~70 k) has a dedicated housing manager — MZGM
(Miejski Zakład Gospodarki Mieszkaniowej Sp. z o.o.) — but it does **not** run ustny przetarg
nieograniczony on lokale mieszkalne for sale. Municipal flats are sold **bezprzetargowo** to sitting
tenants (standard Polish wykup procedure). The city BIP publishes property announcements but only
for commercial units (lokale użytkowe) and land (działki gruntowe). The sole confirmed municipal
flat-sale przetarg found (2021, ul. Królowej Jadwigi 46) was a one-off cooperative-share
(spółdzielcze własnościowe prawo) disposal, not a repeating programme. MZGM's own published
przetargi concern: (a) rental of large flats >80 m² via pisemny przetarg nieograniczony, and
(b) rental of commercial units. No achieved-price stream for flat sales exists. Volume: ~0
gmina-run flat-sale auctions per year 2022–2026.

---

## 1. Sells municipal property at auction?

**Commercial units / land — YES. Municipal flats — NO (bezprzetargowo only).**

- The city BIP ("Tablica ogłoszeń" + "Gospodarka Nieruchomościami") publishes przetargi for:
  - lokale użytkowe (commercial), e.g. Al. Powstańców Wielkopolskich 22 (2023, 2024, 2026).
  - działki gruntowe (land plots, rare).
- Municipal flats (lokale mieszkalne, zasób komunalny) are sold under art. 34 ust. 1 pkt 1
  ustawy o gospodarce nieruchomościami — firstly offered to the sitting tenant bezprzetargowo.
  The jakiwniosek.pl entry for wykup mieszkania komunalnego Ostrów Wielkopolski confirms the
  standard tenant-buyout procedure is active.
- One confirmed exception: Nov 2021 przetarg ustny nieograniczony on spółdzielcze własnościowe
  prawo do lokalu mieszkalnego nr 13, ul. Królowej Jadwigi 46, cena wywoławcza 97 220 zł
  (organiser: Urząd Miejski). This was a cooperative-membership share the city happened to hold,
  not a normal communal-flat auction. No recurrence found 2022–2026.
- MZGM "przetarg": published Sept 2025 (monitorurzedowy.pl) was **pisemny przetarg
  nieograniczony na NAJEM** (rental), not sprzedaż. Starting rent 11 PLN/m²/month.
  Only persons without other Ostrów housing eligible — classic social-rental tender.
- MZGM also commissions operaty szacunkowe for lokale mieszkalne (bip.mzgm.pl procurement),
  consistent with bezprzetargowy tenant sales pipeline, not open auction sales.

**Conclusion:** ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych = NOT occurring
on a regular/repeating basis. NO-BUILD trigger (lokale mieszkalne to tenants → bezprzetargowo).

---

## 2. Where published? (hosts + boards, URLs)

| Entity | Role | Primary URL |
|---|---|---|
| Urząd Miejski Ostrów Wielkopolski (BIP) | City BIP — property announcements, tablica ogłoszeń | https://bip.umostrow.pl/artykuly/21/tablica-ogloszen |
| Urząd Miejski (Gospodarka Nieruchomościami) | Property management listings | https://bip.umostrow.pl/artykuly/187/gospodarka-nieruchomosciami |
| Urząd Miejski (przetargi page) | General city tenders | https://umostrow.pl/przetargi.html |
| MZGM Sp. z o.o. | Housing manager — rental tenders, commercial tenders | http://www.mzgm.pl (redirects; active PDF announcements at http://www.mzgm.pl/wp-content/uploads/...) |
| MZGM BIP | Procurement only (operaty szacunkowe, maintenance) | https://bip.mzgm.pl/index.php?id=51,0,0,0,3 |
| Monitor Urzędowy | Third-party republisher of official notices | https://monitorurzedowy.pl (MZGM rental przetarg published here Sept 2025) |

**Result notices (wyniki przetargów):** published on bip.umostrow.pl/artykuly/21/tablica-ogloszen
as individual artykuł entries. Confirmed URL pattern:
`https://bip.umostrow.pl/artykul/21/{ID}/ogloszenie-...`. Note: at least one result page
(ID 3532, lokal użytkowy) was inaccessible (404/unpublished) during this spike — suggests
entries are sometimes removed after a period.

**No dedicated przetargi-nieruchomości sub-page** (unlike e.g. Kraków or Gliwice). Announcements
are mixed into the general tablica ogłoszeń category.

---

## 3. Format + rendering

- **bip.umostrow.pl**: standard Polish BIP CMS (likely e-BIP / similar). Pages load as
  server-rendered HTML. Individual artykuł pages contain full announcement text inline (plain HTML,
  no PDF required). Pagination on tablica ogłoszeń listing.
- **MZGM rental/commercial przetargi**: published as PDF files hosted on mzgm.pl
  (e.g. `.../Lokale-użytkowe-do-wynajęcia-ogłoszenie-o-przetargu-na-30.01.2025-r.pdf`).
  These are **text PDFs** (not scanned), machine-readable.
- **No SPA / JS rendering** observed on bip.umostrow.pl. Structured HTML, no auth required.
- **No bot block** detected during live navigation (pages loaded cleanly in Chrome).
- **Tablica ogłoszeń listing**: appears to be a flat chronological list of all notices (not
  filtered by category). Scraping requires keyword filtering to isolate property items from
  environmental/planning notices.
- **Result notices**: appear as separate artykuł entries (not appended to the original
  announcement). Achieved price appears in the body text, not structured data.

---

## 4. Volume + achieved-price stream

- **Flat-sale auctions (gmina):** ~0/year (2022–2026). One isolated 2021 co-op share disposal.
- **Commercial-unit auctions (gmina):** ~1–3/year (Al. Powstańców Wielkopolskich confirmed 2023,
  2024, 2026). Wynik notices present on BIP but some pages go offline.
- **MZGM rental tenders:** ~1–2/year (large flats >80 m²). No achieved-price publication
  confirmed — rental tenders announce a starting rate but result (winner's rate) not found
  on public BIP.
- **Achieved price stream for flats: NONE.** No structured price data available.
- Third-party aggregator adradar.pl shows zero "Miasto" entries for flat auctions
  2022–2026 in Ostrów Wielkopolski (all entries = Komornik, PKP, or Syndyk).

---

## 5. Adapter effort + verdict

**Closest analog:** None of the current adapters (Gliwice, Zabrze, Bytom, Kraków,
Tarnowskie Góry) — because those all have repeating flat-sale przetarg programmes.
Ostrów Wielkopolski is structurally closer to a **land/commercial-only** city (no flat auctions).
If scoped to commercial units only, it would be a simpler version of the Tarnowskie Góry
adapter (HTML BIP, low volume, no pagination complexity) — but the project focus is
lokale mieszkalne, so this is out of scope.

**Blockers:**
1. No repeating ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych.
2. No achieved-price publication for the one category (rental) where MZGM does run przetargi.
3. Tablica ogłoszeń pages are mixed (no property-only filter), some result pages go offline.

**Risks if scoped to commercial only:**
- Very low volume (~2/year for lokale użytkowe).
- Result pages may be ephemeral (already saw one 404).
- MZGM PDF announcements for commercial rentals are separate from BIP, requiring
  two-source scraping.

**VERDICT: NO-BUILD**
The gmina does not run flat-sale przetargi. MZGM manages the housing stock but sells to tenants
bezprzetargowo and only runs rental (najem) tenders. No ustny przetarg nieograniczony na sprzedaż
lokali mieszkalnych exists as a repeating programme. Pivoting to commercial units or land would
yield ~2 items/year — too low to justify adapter effort.

**Confidence: High** (confirmed via live BIP navigation, adradar archive cross-check,
monitorurzedowy.pl content review, and absence of any "Miasto"-organised flat-sale entry
in adradar's 2022–2026 Ostrów Wielkopolski archive).

---

### Sources

- https://bip.umostrow.pl/artykuly/21/tablica-ogloszen — city BIP notice board (LIVE-VERIFIED)
- https://bip.umostrow.pl/artykuly/187/gospodarka-nieruchomosciami — property management (LIVE-VERIFIED)
- https://bip.umostrow.pl/artykul/21/3784/ogloszenie-prezydenta-miasta-ostrowa-wielkopolskiego-o-przetargu-na-sprzedaz-lokalu-uzytkowego-zlokalizowanego-w-budynku-przy-al-powstancow-wielkopolskich-22 — lokal użytkowy auction announcement
- https://przetargi.adradar.pl/p/mieszkania/95750/Ostr%C3%B3w+Wielkopolski/a — flat auction archive 2021–2026 (LIVE-VERIFIED, no Miasto entries post-2021)
- https://przetargi.adradar.pl/przetarg/mieszkania/Ostr%C3%B3w+Wielkopolski/miasto/8917331 — sole confirmed gmina flat auction (2021, co-op share, LIVE-VERIFIED)
- https://monitorurzedowy.pl/announcement/1675171/ogloszenie-o-przetargu — MZGM rental przetarg Sept 2025 (najem, not sprzedaż; URL now 404)
- http://www.mzgm.pl/wp-content/uploads/2025/01/Lokale-użytkowe-do-wynajęcia-ogłoszenie-o-przetargu-na-30.01.2025-r.pdf — MZGM commercial rental PDF Jan 2025
- https://bip.mzgm.pl/index.php?id=51,0,0,0,0,99 — MZGM BIP procurement (operaty szacunkowe)
- https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/ostrow-wielkopolski — bezprzetargowy tenant buyout procedure confirmed
- https://platformazakupowa.pl/pn/mzgm_ostrow/proceedings — MZGM procurement platform profile
