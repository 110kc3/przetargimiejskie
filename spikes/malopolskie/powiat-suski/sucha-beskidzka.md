# Spike — Sucha Beskidzka (Małopolskie · powiat suski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina miejska Sucha Beskidzka (Urząd Miasta, Burmistrz) sells municipal property — including **lokale mieszkalne** — via *przetarg ustny nieograniczony na sprzedaż*. The scrapeable announcement stream lives on the **city website `sucha-beskidzka.pl`**, which runs the **Interaktywna Polska** CMS: clean server-rendered HTML board at `/pl/879/0/przetargi-na-nieruchomosci.html` listing **born-digital PDF** notices under `/mfiles/879/28/0/z/*.pdf`. A live flat auction is confirmed — *III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, blok nr 1, os. Beskidzkie* — alongside land sales (ul. Spółdzielców) and najem/dzierżawa notices. The formal BIP (`bip.malopolska.pl/umsuchabeskidzka`) is a **JS-SPA** and carries the *informacja o wyniku przetargu* (achieved-price) stream; the announcement PDFs, however, are fully scrapeable off the Interaktywna city site without rendering. Small town (~9k), so flat-auction volume is low and mixed with land, but recurring (the os. Beskidzkie flat has cycled I→II→III). Closest analog: the custom-HTML PDF-attachment family (bochnia / olkusz / nowa-sol shape: server-HTML list → PDF href → `pdfText` → parse). No auth/CAPTCHA blockers on the announcement board.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Miasta Sucha Beskidzka runs `przetarg ustny nieograniczony` for sale of municipal property. Confirmed on the live board:
- **ul. os. Beskidzkie, blok nr 1, lokal mieszkalny nr 9** — *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* (currently at **III przetarg**; second and third rounds both announced — a recurring, cycling flat sale). PDF: `/mfiles/879/28/0/z/Ogloszenie-przetarg_III.pdf`.
- **ul. Spółdzielców** — *przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej* (land). PDF: `/mfiles/879/28/0/z/Przetarg_S.pdf`.
- **ul. J. Piłsudskiego** — land sale (open oral auction), seen in prior notices.

The rest of the board skews to non-sale letting: *przetarg pisemny nieograniczony na najem lokalu użytkowego* (blok nr 6, os. Beskidzkie), *dzierżawa nieruchomości gruntowej* (ul. Mickiewicza / dworzec autobusowy), *najem budynku oranżerii* (Zespół Zamkowo-Parkowy). So: flats **are** sold at open oral auction, but the flat volume is thin and mixed with land + najem/dzierżawa. No evidence flats are restricted to *bezprzetargowo na rzecz najemcy* — the os. Beskidzkie flat is a genuine open auction.

Housing manager: no dedicated ZGM/ZBM company surfaced; property sales are run directly by the Urząd Miasta (Referat Gospodarki Nieruchomościami). TBS not identified as the auction author.

## 2. Where published? (hosts + boards, URLs)
**Primary (scrapeable) — city website, Interaktywna Polska CMS:**
- Property-auction board: `https://sucha-beskidzka.pl/pl/879/0/przetargi-na-nieruchomosci.html`
- Notice PDFs: `https://sucha-beskidzka.pl/mfiles/879/28/0/z/<filename>.pdf` (e.g. `Ogloszenie-przetarg_III.pdf` — flat; `Przetarg_S.pdf` — land ul. Spółdzielców; `Og-oszenie-przetargu-na-najem-lokalu-u-ytkowego_1.pdf`; `Og-oszenie-przetarg.pdf`).
- URL shape: static `/pl/<sectionId>/0/<slug>.html` pages + `/mfiles/<sectionId>/…/z/<file>.pdf` attachments (Interaktywna Polska hallmark).

**Formal BIP + results stream — `bip.malopolska.pl/umsuchabeskidzka` (JS-SPA):**
- Home: `https://bip.malopolska.pl/umsuchabeskidzka`
- Wyniki / rozstrzygnięcia (achieved price): article URLs `…/umsuchabeskidzka,a,<artId>,<slug>.html` — e.g. `,a,2405649,…` (*informacja o wyniku przetargu na najem budynku*), `,a,2066408,…` (*informacja … o wynikach przetargu na najem lokalu użytkowego*). This host is where *informacja o wyniku przetargu* (cena osiągnięta / nabywca) is posted.

**Do NOT confuse** with `spsuchabeskidzka.bip.info.pl` — that is the **Starostwo Powiatowe** (powiat suski, bip.info.pl CMS), a separate JST, out of scope. Our target is the town Gmina Miejska Sucha Beskidzka.

## 3. Format + rendering
- **Announcement board (`sucha-beskidzka.pl`): server-rendered HTML** — Interaktywna Polska CMS. The `/pl/879/…` page is plain server HTML listing notice links; fetched cleanly with no JS gate. Individual notices are **born-digital text PDFs** (FlateDecode text streams, ~220 KB, embedded fonts) at `/mfiles/879/28/0/z/*.pdf` → parseable with `pdfText` (pdftotext); **no OCR needed**.
- **Results/wyniki (`bip.malopolska.pl/umsuchabeskidzka`): JS-SPA** — confirmed: WebFetch returns only the nav/header shell, no article body. This is the standard bip.malopolska SPA (per ADAPTER-GUIDE §3 — same family as `chrzanow`, needs `core/render.js` / Playwright, `needsRender: true`).
- No auth / CAPTCHA / rate-limit signals on the announcement board.

## 4. Volume + achieved-price stream
- **Volume:** Low. Small gmina miejska (~9k residents). A handful of property notices on the board at any time, mostly najem/dzierżawa; open **sale** auctions are a minority (one flat + a couple of land parcels). The single flat (os. Beskidzkie 1/9) has cycled I→II→III, so expect on the order of a few sale auctions/year, with repeats when unsold. Recurring but thin.
- **Achieved-price stream:** YES, but on the JS-SPA host — *informacja o wyniku przetargu* notices are published under `bip.malopolska.pl/umsuchabeskidzka,a,<id>,…`. Extracting cena osiągnięta / nabywca requires rendering that SPA (render.js). The announcement PDFs carry cena wywoławcza + wadium + termin. Primary flow (announcements) needs no render; the result stream does.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** custom-HTML **PDF-attachment** family — **bochnia / olkusz / nowa-sol** shape (server-HTML board → collect PDF hrefs → `pdfText` → regex/DOM field extraction). No existing Interaktywna Polska adapter in the repo yet (grep for `mfiles`/`interaktywna` = none), but the crawl shape is identical to the custom-HTML analogs; only the list-selector + `/mfiles/` href pattern are new.
- **CMS family:** Interaktywna Polska (server-rendered HTML board + born-digital PDFs) for announcements; bip.malopolska JS-SPA for results.
- **Effort:** **LOW–MEDIUM.** Announcement path is LOW: fetch `/pl/879/0/przetargi-na-nieruchomosci.html` → list `/mfiles/879/…/*.pdf` → `pdfText` → parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, termin, round I/II/III) → filter out najem/dzierżawa/land where flats are the target. The MEDIUM increment is only if you also want the achieved-price stream: add a `core/render.js` pass over `bip.malopolska.pl/umsuchabeskidzka` (set `needsRender: true`), analog `chrzanow`.
- **Blockers:** None hard. Watch-items: (1) two hosts (announcements on Interaktywna city site, results on bip.malopolska SPA) — build announcements first, results as an optional render-backed second pass; (2) mixed sale/najem/dzierżawa stream → classify + drop non-sale; (3) low flat volume — mostly land + one recurring flat.

**VERDICT: BUILD (Low–Medium effort)** — recurring open oral flat auction (os. Beskidzkie 1/9, cycling I→II→III) on a clean Interaktywna Polska server-HTML board with born-digital PDF notices; clone the bochnia/olkusz custom-HTML PDF-attachment analog. Achieved-price stream is on the bip.malopolska JS-SPA and is an optional render-backed second pass. Low volume is the only real caveat.
