# Spike — Wieluń (Łódzkie · powiat wieluński)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (no open flat-auction stream).

## TL;DR
Gmina Wieluń (miejsko-wiejska, town seat; Urząd Miejski, Plac Kazimierza Wielkiego 1) sells municipal property, but the stream that reaches the BIP is **land only** — `przetarg ustny nieograniczony` on `działki` (e.g. dz. nr 174 obręb 6; a 1.27 ha parcel in Jodłowiec at 900 000 zł) plus `wykaz nieruchomości do dzierżawy` and occasional movable-asset sales (lodowisko elements). **Municipal flats (lokale mieszkalne) are sold bezprzetargowo na rzecz najemcy** — the BIP carries only a standing tenant-application form ("Wniosek o sprzedaż lokalu mieszkalnego", DOC, 2018) and the wykup/bonifikata route, not open oral flat auctions. **No dedicated municipal housing manager (no ZGM/ZBM/TBS)** surfaces a flat-auction feed. The "Przetargi" board is public procurement (redirects to ezamowienia.gov.pl), not property. Net: no recurring open flat-auction volume to extract → NO-BUILD.

## 1. Sells municipal property at auction?
**Land — YES; flats — NO (tenant sales only).**
- **Land auctions (in the wrong category for us):** `Ogłoszenie o I przetargu ustnym nieograniczonym — dz. nr 174 obręb 6 m. Wielunia` (30-06-2026); a 1.2736 ha parcel in Jodłowiec, cena wywoławcza 900 000 zł, wadium 150 000 zł, auction 15-10-2025. These are undeveloped `działki`, sygn. `NPP.6845...`.
- **Leasing wykazy:** `wykaz nieruchomości przeznaczonych do oddania w dzierżawę` (dzierżawa, out of scope).
- **Movable assets:** `przetarg na sprzedaż elementów majątku trwałego — elementów lodowiska` (not real estate).
- **Flats — bezprzetargowo:** the only flat artefact on the BIP is a standing **"Wniosek o sprzedaż lokalu mieszkalnego"** (DOC, 44 KB, posted 2018) under *Nieruchomości i planowanie przestrzenne*. This is the tenant right-to-buy (`wykup na rzecz dotychczasowego najemcy`, bonifikata) route — the Rada Gminy sets bonifikata terms; sales are to sitting tenants, **not** open `przetarg ustny na sprzedaż lokalu mieszkalnego`. No open flat auctions found in the Komunikaty board or archive (1,316-item archive, no `lokal mieszkalny` przetarg hits).

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP `www.bip.um.wielun.pl` (server-rendered):**
- Komunikaty (where property notices actually land — land auctions + dzierżawa wykazy): `https://www.bip.um.wielun.pl/bipkod/002` (archive: append `?showArchive=true`, paginate `?start=N&showArchive=true`; archive board id `25393658`).
- Nieruchomości i planowanie przestrzenne (forms incl. the tenant flat-sale wniosek): `https://www.bip.um.wielun.pl/bipkod/18471887`
- "Przetargi": `https://www.bip.um.wielun.pl/bipkod/012` — **public procurement**, individual notices redirect to `https://ezamowienia.gov.pl/mp-client/search/list/` (NOT property).
- "Wyniki przetargów": `https://www.bip.um.wielun.pl/bipkod/013` — procurement award results only (post-2023 results routed via ezamowienia link under each proceeding); no property hammer prices.
- Attachment/document URL shape: `/res/serwisy/pliki/{ID}?version=1.0` (PDF/DOC files).
- Locale prefixes `/pl/…` and `/en/…` mirror every board.
- Also cross-posted to `www.wielun.pl` and the physical tablica ogłoszeń at Plac Kazimierza Wielkiego 1, pok. 11.
Contact for nieruchomości: Michał Janik, janikm@um.wielun.pl.

**No separate housing-manager host** (no ZGM/ZBM/TBS BIP for Wieluń). Do not confuse with `bip-pcuw.powiat.wielun.pl` / `powiat-wielun.finn.pl` (the powiat, separate JST, out of scope).

## 3. Format + rendering
- **Server-rendered HTML** BIP CMS: boards addressed by `/bipkod/NNN`, list pagination via `?start=N&showArchive=true`, born-digital PDF/DOC attachments at `/res/serwisy/pliki/{ID}`. Some lists show a "Trwa wczytywanie…" placeholder but content is in the server HTML (no hard SPA gate). Bespoke/regional BIP vendor — **not** a clean match to Logonet / IDcom / bip.info.pl / REKORD families.
- No SPA, auth, or CAPTCHA blockers observed; attachments would parse via `pdfText`/`docText`.

## 4. Volume + achieved-price stream
- **Flat volume: effectively zero open auctions/yr.** Flats leave the stock via tenant wykup (bezprzetargowo), which never appears as a scheduled `przetarg` with `cena wywoławcza`.
- **Property auctions that do appear are land** — a handful of `działka` auctions per year, mixed with dzierżawa wykazy and asset sales.
- **Achieved-price stream: none for flats.** The "Wyniki przetargów" board is procurement-only; land-auction results (if published) would sit in Komunikaty as informacja o wyniku, low frequency. No flat hammer-price feed exists to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a small bespoke server-HTML gmina BIP — parse Komunikaty (`/bipkod/002`) list → filter `przetarg ustny … na sprzedaż` `działki` → attachment via `pdfText`. But that yields land-only records with no flat stream.
- **CMS family:** bespoke/regional server-rendered BIP (`/bipkod/NNN` boards + `/res/serwisy/pliki/` attachments) — ADAPTER-GUIDE §3 "WordPress / custom HTML" bucket at best; no exact analog.
- **Effort if forced:** Medium (custom board parser + procurement-vs-property classification), but the **payload is out of scope** — it's the land + tenant-sale pattern the spike heuristic flags as NO-BUILD.
- **Blockers:** No open municipal **flat**-auction stream. No ZGM/ZBM/TBS. Flats sold bezprzetargowo na rzecz najemcy. Procurement and property share confusingly-labelled boards ("Przetargi" = zamówienia publiczne).

**VERDICT: NO-BUILD** — Wieluń publishes only land (`działka`) oral auctions plus dzierżawa wykazy on its BIP; municipal flats are sold to sitting tenants bezprzetargowo (bonifikata/wykup), with no dedicated housing manager and no open flat-auction or flat-price stream to extract.
