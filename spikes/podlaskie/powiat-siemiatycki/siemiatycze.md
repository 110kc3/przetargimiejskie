# Spike — Siemiatycze (Podlaskie · powiat siemiatycki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miasto Siemiatycze (town gmina miejska, ~14.5k pop.; **not** the surrounding rural Gmina Siemiatycze) sells municipal property at *przetarg ustny nieograniczony* — but the stream is **land only** (nieruchomości gruntowe / niezabudowane), at very low volume. Municipal **flats (lokale mieszkalne)** are disposed of **bezprzetargowo na rzecz najemcy** (tenant right of first refusal), not at open auction. The only *open flat auctions* in the Siemiatycze area belong to the **Powiat Siemiatycki / Starostwo** (a separate JST, `bip-stsiemiatycze.podlaskie.eu` / `siemiatycze.pl`) — out of scope for a miasto adapter. City BIP is the Podlaskie regional platform (`bip-umsiemiatycze.podlaskie.eu`, migrated from `bip.um.siemiatycze.wrotapodlasia.pl`): server-HTML boards with born-digital **PDF attachments** for the actual notices. No recurring open flat-sale stream → NO-BUILD.

## 1. Sells municipal property at auction?
**Partially — LAND only at open auction; flats bezprzetargowo.**
- The Burmistrz Miasta Siemiatycze runs `przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Miasta Siemiatycze`, but the confirmed subjects are **land plots** (e.g. "nieruchomości niezabudowane, obręb 2"; a `przetarg ustny ograniczony` on a niezabudowana nieruchomość przy ul. Ciechanowieckiej). Current property-management section (2026) held exactly two items: **Zarządzenie 244/26** — designation of land for sale *w drodze przetargu ustnego nieograniczonego*; **Zarządzenie 251/26** — land sold *w trybie bezprzetargowym* to a użytkownik wieczysty (Topaz sp. z o.o.). Both land, no flats.
- **Flats:** disposed of **bezprzetargowo na rzecz najemcy** (right of first refusal under ustawa o gospodarce nieruchomościami); the city publishes a *wykaz nieruchomości przeznaczonych do sprzedaży* and a tenant-purchase procedure. No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` by the miasto was found in 2025–2026 or the historical index.
- **The flat auctions that DO exist here are the POWIAT's**, not the town's: e.g. "IV przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowych stanowiących lokal mieszkalny" published by **Powiat Siemiatycki** (`siemiatycze.pl/2023/09/...`, `bip-stsiemiatycze.podlaskie.eu`). Different legal entity → excluded.
- Housing manager: **Zarząd Mienia Komunalnego w Siemiatyczach Sp. z o.o.** (`zmk.siemiatycze.eu`), the ex-*Zakład Gospodarki Mieszkaniowej* (transformed 2005/2006, 100% city-owned). It **manages/rents** the municipal stock; it is not a flat-auction publisher.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Podlaskie regional platform, wrotapodlasia.pl → podlaskie.eu):**
- Current host: `https://bip-umsiemiatycze.podlaskie.eu/`
- **Gospodarowanie Mieniem** (property disposals — zarządzenia designating sale/bezprzetargowe): `https://bip-umsiemiatycze.podlaskie.eu/gospodarowanie-mieniem/`
  - e.g. `.../gospodarowanie-mieniem/zarzadzenie-nr-24426-...-przetargu-ustnego-nieograniczonego-nieruchomosci-...html` (land, przetarg)
  - e.g. `.../gospodarowanie-mieniem/zarzadzenie-nr-25126-...-w-trybie-bezprzetargowym-...-gruntowej-...html` (land, bezprzetargowo)
- **Ogłoszenia** (general notices board, year-filtered `?p=YYYY`): `https://bip-umsiemiatycze.podlaskie.eu/Urzad/Ogloszenia/` — in 2025/2026 carried **no** property-sale przetargi (obwieszczenia, dotacje, rekrutacja, etc.).
- **Zamówienia publiczne** (public procurement, not property): `https://bip-umsiemiatycze.podlaskie.eu/zamowienia_publiczne/`
- **Finanse i majątek:** `https://bip-umsiemiatycze.podlaskie.eu/Finanse/`
- Legacy host (DNS now dead, still search-indexed): `bip.um.siemiatycze.wrotapodlasia.pl` — historical flat/land notices under `/Urzad/Ogloszenia/...` and `/Urzad/Ogloszenia/ogloszenie2.htm` (wykaz). Old slugs 404 on the new host.

**Do NOT confuse** with: the rural **Gmina Siemiatycze** (`bip-ugsiemiatycze.podlaskie.eu`, `gminasiemiatycze.pl` — village land sales, separate JST) and the **Powiat Siemiatycki / Starostwo** (`bip-stsiemiatycze.podlaskie.eu`, `siemiatycze.pl` — the one that auctions lokale mieszkalne). Our target is the town **Gmina Miasto Siemiatycze**.

## 3. Format + rendering
- **Server-rendered HTML** listing pages (Podlaskie wrotapodlasia.pl/podlaskie.eu regional BIP CMS) — descriptive `.html` article slugs with trailing date, `?p=YYYY` year filter on the Ogłoszenia board. No SPA / JS gate; no auth/CAPTCHA observed.
- **Notice bodies are born-digital PDF attachments**, not inline HTML — the przetarg/zarządzenie article pages carry only title + metadata + a PDF link (e.g. `Zarządzenie.przyjęte.pdf`, ~1.1 MB). Extraction would require `pdfText` per notice.
- No JSON/API surface. Result/achieved-price notices for the miasto were not found as a dedicated board.

## 4. Volume + achieved-price stream
- **Open flat auctions/year (miasto): ~0.** No `przetarg ustny na sprzedaż lokalu mieszkalnego` by Miasto Siemiatycze found. Flats go bezprzetargowo to tenants.
- **Open land auctions/year: very low** — a handful at most; the live property-management board showed only 2 disposal items (1 przetarg land, 1 bezprzetargowe land) for 2026.
- **Achieved-price (cena osiągnięta) stream:** none identified for the miasto — no dedicated *informacja o wyniku przetargu* board surfaced; announcements would carry `cena wywoławcza` only, and only inside PDFs.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (had it been in scope):** a Podlaskie regional-BIP gmina on `*.podlaskie.eu` with PDF-attachment notices — pattern resembles the IDcom/HTML-list + text-PDF families (§3), i.e. an `oswiecim`/`tczew`-style list→PDF crawl. But there is nothing worth cloning it for here.
- **CMS family:** Podlaskie wrotapodlasia.pl → podlaskie.eu shared regional BIP (server-HTML boards; born-digital PDF bodies).
- **Effort:** — (no-build).
- **Blockers / why NO-BUILD:**
  1. **No open flat-auction stream.** Miasto flats are sold *bezprzetargowo na rzecz najemcy*; open auctions are land-only.
  2. **Wrong entity for flats.** The recurring *lokal mieszkalny* open auctions in the area are the **Powiat Siemiatycki / Starostwo**, a separate JST — not this adapter's subject.
  3. **Very low volume** even on land, and notice content locked in per-item PDFs with no achieved-price board — poor yield for the build cost.

**VERDICT: NO-BUILD** — Gmina Miasto Siemiatycze sells flats only bezprzetargowo na rzecz najemcy and runs only sporadic land auctions; open municipal flat-auction volume ≈ 0 and no achieved-price stream. The area's flat auctions belong to the powiat/starostwo (out of scope).
