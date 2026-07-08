# Spike — Sejny (Podlaskie · powiat sejneński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miasta Sejny (Urząd Miasta, Burmistrz Miasta Sejny — a ~5k-person town gmina miejska) sells municipal property at *ustny przetarg nieograniczony*, but the stream is **land only**. The single "Przetargi na zbycie nieruchomości" board on the city BIP (`bip-umsejny.podlaskie.eu`, the **Wrota Podlasia / podlaskie.eu** regional CMS) covers 2020→2026 and carries exclusively **nieruchomości gruntowe** (działki 895/896, 965/21, 965/28, 965/29, 415/3, 262, …) — I, II, … up to VI przetarg repeats. The only **lokal mieszkalny** open auction I could find is Parkowa 5/23 from **2019** (studio, 36.18 m², cena wyw. 56 700 zł), which predates the current board window — i.e. flats surface roughly once a half-decade, not recurringly. Tiny town, no dedicated housing manager (ZGM/TBS). Board is scrapeable (server-HTML list; details in born-digital PDFs), but flat volume is ~0. NO-BUILD on the flat criterion.

## 1. Sells municipal property at auction?
**YES for land; effectively NO for flats.** The Burmistrz Miasta Sejny runs `przetarg ustny nieograniczony` (and occasionally `ograniczony`) for sale of city-owned property, plus `sprzedaż bezprzetargowa` and wykazy. But across the entire current board (2020–2026) every announcement is a **nieruchomość gruntowa** (land parcel):
- dz. 965/21, 965/28, 965/29 — I przetarg ustny nieograniczony (2026).
- dz. 895, 896 — I/II przetarg ustny nieograniczony (2025).
- dz. 415/3, 414/1, 414/3, 413/2, 417/2 — I przetarg (2025).
- dz. 262 — I przetarg ustny **ograniczony** (2025); dz. 965/28 repeated up to **VI przetarg** (unsold-land repeats).
- dz. 1616/5 — przetarg ustny ograniczony (lista osób zakwalifikowanych) — land.

The one **flat** open auction found: **Parkowa 5, lokal nr 23** — "przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego", studio 36.18 m², I piętro, cena wyw. 56 700 zł netto, wadium 5 600 zł, postąpienie 570 zł — but dated **2019** (`www.um.sejny.pl/2019/05/29/ogloszenie-o-przetargu-parkowa-5-m-23/`), before the BIP board's coverage. No flat auctions appear in the 2020–2026 window. Consistent with the ADAPTER-GUIDE heuristic: a generic small-town city-BIP property section skewing to land + tenant sales, not a ZGM flat pipeline.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Wrota Podlasia / podlaskie.eu regional CMS):**
- Property auctions board (announcements **and** results inline): `https://bip-umsejny.podlaskie.eu/gospodarka_nieruchomociami/przetargi-na-zbycie-nieruchomosci.html`
- Same board, legacy host alias: `https://bip-umsejny.wrotapodlasia.pl/gospodarka_nieruchomociami/przetargi-na-zbycie-nieruchomosci.html`
- Gospodarka nieruchomościami index (only 2 subsections: the przetargi board + "Ogłoszenie o poszukiwaniu inwestora"; **no** separate lokale-mieszkalne / wyniki section): `https://bip-umsejny.podlaskie.eu/gospodarka_nieruchomociami/`
- Individual notice URL shape: `/gospodarka_nieruchomociami/<slugified-title>.html` (e.g. `…-oglasza-vi-przetarg-ustny-nieograniczony-…-96528.html`).
- "Informacja o wyniku" result notices are linked inline in the same board (no dedicated results host).
- Mirror on the plain city site: `https://www.um.sejny.pl/` (aktualności; carries the 2019 flat notice + land notices).

**Do NOT confuse** with the rural **Gmina Sejny** (separate JST, out of scope): `https://bip-ugsejny.podlaskie.eu/` / `http://bip.ug.sejny.wrotapodlasia.pl/`. Nor with **Powiat sejneński**: `http://bip.st.sejny.wrotapodlasia.pl/`. Our target is the town **Miasto Sejny** (`bip-umsejny.*`, Burmistrz).

Contact: Urząd Miasta Sejny, pok. 6, tel. (87) 5 162 011.

## 3. Format + rendering
- **Server-rendered HTML** board — chronological list of hyperlinked notices grouped by year (2026→2020). No SPA, no auth, no CAPTCHA. Confirmed live via fetch.
- Individual notices are thin HTML wrappers; the substantive terms (cena wywoławcza, wadium, powierzchnia, termin) live in **attached born-digital PDFs** (e.g. `RPG.6840.5.2.2024_965_28.pdf` ~935 KB + Zał. nr 1/2). Would need `pdfText` extraction, not OCR.
- Achieved-price / cena osiągnięta: only via inline "Informacja o wyniku przetargu" notices on the same board (present for some land auctions); no structured results stream.

## 4. Volume + achieved-price stream
- **Flat auctions/year:** ~0. One open flat auction in ~7 years (Parkowa 5/23, 2019). Not recurring.
- **Overall property auctions:** low — a handful of land parcels/year, many as repeat rounds (II…VI przetarg) of the same unsold działki.
- **Achieved-price stream:** partial — "Informacja o wyniku" notices exist for land, inline on the board; nothing flat-specific.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a Wrota Podlasia / podlaskie.eu regional-BIP gmina — server-HTML list board + per-notice HTML wrapper + born-digital PDF terms. But the flat signal is absent.
- **CMS family:** podlaskie.eu / wrotapodlasia.pl regional BIP (server-rendered HTML; ADAPTER-GUIDE §3 HTML-list family, with PDF detail payloads).
- **Effort:** — (not applicable; no flat stream to justify a build).
- **Blockers:** No technical blocker — the board is cleanly scrapeable. The blocker is **content**: essentially zero open flat-sale auctions; the pipeline is dominated by land parcels with repeat rounds. A ~5k town with no dedicated housing manager (no ZGM/ZBM/TBS) — flat disposals are rare and, when they happen, typically bezprzetargowo na rzecz najemcy.

**VERDICT: NO-BUILD** — Miasto Sejny publishes on a clean, scrapeable Wrota Podlasia server-HTML board, but its auction stream is land-only; the sole open flat auction found is from 2019 and flats do not recur. ~0 open flat-sale auctions → below the BUILD threshold. Revisit only if a ZGM-style flat pipeline or a run of lokal-mieszkalny przetargi appears.
