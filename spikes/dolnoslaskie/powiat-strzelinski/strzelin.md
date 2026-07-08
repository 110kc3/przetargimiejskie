# Spike — Strzelin (Dolnośląskie · powiat strzeliński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD.

## TL;DR
Gmina Strzelin (miejsko-wiejska, Urząd Miasta i Gminy) sells municipal property at open oral auction — but the stream is **entirely land** (nieruchomości gruntowe niezabudowane, działki budowlane on Osiedle na Skarpie, and occasional nieruchomości zabudowane). Across three full years checked live (2024: 14 announcements, 2025, 2026) there are **ZERO open flat auctions** (*ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego*). Flats are disposed of **bezprzetargowo na rzecz najemcy** (evidence: a "8 lokale mieszkalne za 119 784,00 zł" ≈ 15k/flat tranche — classic sitting-tenant discount sale, not an open auction). The BIP itself is excellent and scrapeable — **FINN eBIP** (`bip.gmstrzelin.finn.pl`), dedicated per-year "Ogłoszenia o przetargach" boards + a "Informacja o wyniku przetargu" results stream, all **born-digital PDFs** (pdftotext-clean, confirmed) — so if land were the target this would be a Low-effort build. But on the flat-auction criterion it is a **NO-BUILD**: no recurring open flat-sale auctions.

## 1. Sells municipal property at auction?
**YES for land — NO for flats.** Burmistrz Miasta i Gminy Strzelin runs `pierwszy/drugi/... przetarg ustny nieograniczony (i ograniczony)` for sale of municipal real estate, but every notice found is **grunt / działka / nieruchomość zabudowana**, never a `lokal mieszkalny`:
- **2024** (`/bipkod/34046298`) — 14 announcements, all land: ul. Brzegowa, ul. Wichrowa (Osiedle na Skarpie), ul. Gałczyńskiego, ul. Broniewskiego–Weteranów, ul. Dzierżoniowska, Żeleźnik village. Multiple II–VI rounds (repeat unsold land).
- **2025** (`/bipkod/37829912`) — all land: Osiedle na Skarpie działki, ul. Wichrowa (V przetarg), ul. Broniewskiego, Bierzyn village + two *przetargi ograniczone* on Wąwolnica land.
- **2026** (`/bipkod/42329687`) — 4 announcements, all land/built: ul. Targowa (niezabudowana), ul. Kamienna + ul. Brzegowa (zabudowana), Osiedle na Skarpie gruntowe. No flats.

**Flats → bezprzetargowo.** Search surfaced a Strzelin tranche of **8 lokale mieszkalne sold for 119 784,00 zł total** (~15k each) — a preferential sitting-tenant (`na rzecz najemcy`) sale under the ustawa o gospodarce nieruchomościami first-refusal path, not an open oral auction. This is the standard miejsko-wiejska pattern: land at open auction, flats to tenants at a discount.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (FINN eBIP CMS): `bip.gmstrzelin.finn.pl`**
- Przetargi hub: `https://bip.gmstrzelin.finn.pl/bipkod/023`
- **Ogłoszenia o przetargach** (announcements, per-year index): `https://bip.gmstrzelin.finn.pl/bipkod/033`
  - Rok 2026: `https://bip.gmstrzelin.finn.pl/bipkod/42329687`
  - Rok 2025: `https://bip.gmstrzelin.finn.pl/bipkod/37829912`
  - Rok 2024: `https://bip.gmstrzelin.finn.pl/bipkod/34046298`
  - Rok 2023: `https://bip.gmstrzelin.finn.pl/bipkod/31356691`; Rok 2022: `/bipkod/28534297`; Rok 2021: `/bipkod/25936639`; Rok 2020: `/bipkod/22977766` … back to Rok 2011.
- **Informacja o wyniku przetargu** (results stream) — published as PDFs, e.g. `https://bip.gmstrzelin.finn.pl/res/serwisy/pliki/26726421?version=1.0`.
- **Document URL pattern:** attachments served from `https://bip.gmstrzelin.finn.pl/res/serwisy/pliki/NNNNNNNN?version=1.0` (born-digital PDF). Board pages are `/bipkod/NNNN` (numeric node ids).
- Also relevant: "Przetargi na mienie komunalne" menu item (municipal-property sub-section).

Authority: Urząd Miasta i Gminy Strzelin, ul. Ząbkowicka 11, 57-100 Strzelin (Referat Gospodarki Nieruchomościami). Do NOT confuse with **Strzelno** (kujawsko-pomorskie, `bip.strzelno.pl`) or **Strzeleczki** (opolskie) — different JSTs that surfaced in search.

## 3. Format + rendering
- **CMS:** FINN eBIP (finn.pl hosted BIP) — server-rendered HTML navigation, numeric `/bipkod/` node ids, per-year sub-boards.
- **Announcements + results are PDF attachments**, not inline HTML. Each `/bipkod/YEAR` board is an index of dated links to `/res/serwisy/pliki/NNNN` PDFs.
- **Born-digital PDFs — confirmed.** Fetched a results PDF and ran `pdftotext` locally: clean selectable text (INFORMACJA O WYNIKU PRZETARGU, tabular działka/pow./wartość netto rows). No OCR needed. `pdfText` in the pipeline would handle these directly.
- No SPA, no auth, no CAPTCHA. TLS/host reachable via WebFetch (no 403).

## 4. Volume + achieved-price stream
- **Volume (flats):** ~**0 open flat auctions/year** — the disqualifier. Three years live: 0/14 (2024), 0/9 (2025), 0/4 (2026).
- **Volume (land):** Modest-to-healthy — roughly 10–14 land auction notices/year, many as II–VI repeat rounds. Would be a fine LAND source, out of the flat scope.
- **Achieved-price stream:** YES — a dedicated **Informacja o wyniku przetargu** PDF stream carries `cena wywoławcza / wartość netto` and hammer results / nabywca (or wynik negatywny). Parseable from born-digital PDF. But it is a land-results stream.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (were it in scope):** a FINN eBIP gmina with per-year `/bipkod/` boards + `/res/serwisy/pliki/` PDFs (e.g. Bielawa `bielawa.finn.pl` results pattern). Clean Low-effort shape: index each year board → fetch PDF → `pdfText` → regex parse.
- **CMS family:** FINN eBIP (born-digital PDF attachments over server-HTML index boards) — ADAPTER-GUIDE §3 "text-PDF" family.
- **Effort:** **—** (no-build on flats). *For reference, LAND-only would be Low.*
- **Blockers / reason for NO-BUILD:** No `lokal mieszkalny` auctions exist — flats leave the gminna zasób **bezprzetargowo na rzecz najemcy**, not via open oral auction. The auction board is 100% land / built property. Fails the flat-auction BUILD criterion despite an otherwise ideal, easily scrapeable source.

**VERDICT: NO-BUILD** — Strzelin runs a clean, recurring open-auction stream on a scrapeable FINN eBIP BIP (born-digital PDFs, dedicated results stream), but it is **entirely land**; municipal flats are sold bezprzetargowo to sitting tenants, so there are ~0 open flat-sale auctions to scrape. Revisit only if the dataset scope expands to municipal land auctions (then Low effort).
