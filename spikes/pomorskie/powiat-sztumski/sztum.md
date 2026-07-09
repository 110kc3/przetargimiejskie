# Spike — Sztum (Pomorskie · powiat sztumski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Sztum (Miasto i Gmina Sztum — miejsko-wiejska) sells municipal property, **including lokale mieszkalne**, via `przetarg ustny nieograniczony` run by the Burmistrz (Referat IM — mienie/nieruchomości). Everything is published on the city BIP `bip.sztum.pl`, a numeric-page-id server-rendered HTML CMS (`NNNN.html` boards, PDF-per-notice via `NNNN.html?file=NNNNN`, `templates/template4` + `showFileDetailsAsIcon`/`fileDetailsPopup` signature — same platform as neighbouring `bip.malbork.pl`). One **single mixed "Ogłoszenia" board** (`1186.html`) carries announcements, results, wykazy and rokowania together, all as **born-digital text PDFs** with clean structured fields (`Cena wywoławcza: 271 000 zł`, `Najwyższa cena osiągnięta w przetargu: …`, `wynikiem negatywnym` / nabywca). Open oral **flat** auctions do occur but are **low-volume** — the board is land-dominated (działki); confirmed flats: Nowowiejskiego 18/1A (I+II ustny przetarg → then rokowania), Jagiełły 6/6, Żeromskiego 24A/3 (przetargi then rokowania), Skłodowskiej 17D/7 Kościerzyna (udział). Achieved-price stream is present and cleanly parseable. New CMS family (no existing clone), single mixed board needs classification → Medium effort, no technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats via OPEN oral przetarg.** The Burmistrz Miasta i Gminy Sztum runs `przetarg ustny nieograniczony` on municipal property. Flats genuinely go through open oral auction (not only bezprzetargowo na rzecz najemcy / not only rokowania):
- **ul. Nowowiejskiego 18/1A, Sztum** — lokal mieszkalny 67,39 m², parter, 3 pokoje; ran **I and II `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`** (result PDF file=19550: *"drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1A … Cena wywoławcza: 271 000 zł … wynikiem negatywnym"*), then moved to `pierwsze rokowania` (file=19572) after both przetargi failed.
- **ul. Jagiełły 6/6, Sztum** — II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego (indexed).
- **ul. Żeromskiego 24A/3, Sztumskie Pole** — lokal mieszkalny; przetargi failed → IV/V rokowania (files 19511, 19529).
- **ul. Skłodowskiej 17D/7, Kościerzyna** — udział 2/3 w spółdzielczym własnościowym prawie do lokalu; rokowania (files 19548, 19576).

Land is the dominant category (działki budowlane / niezabudowane across Sztum, Sztumskie Pole, Biała Góra, Koniecwałd, Postolin, etc.). Sale run by Urząd Miasta i Gminy Sztum; no separate ZGM/ZBM/TBS auction board — flats are sold directly by the gmina. Both natural and legal persons may bid.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.sztum.pl`):**
- **Ogłoszenia (single mixed board — announcements + results + wykazy + rokowania):** `https://bip.sztum.pl/1186.html`
- **Document (PDF) endpoint:** `https://bip.sztum.pl/1186.html?file=NNNNN` (e.g. `?file=19550` = Nowowiejskiego II-przetarg result; `?file=19572` = Nowowiejskiego rokowania ogłoszenie; `?file=19640` = wykaz).
- **Zamówienia publiczne (procurement, separate — out of scope):** `https://bip.sztum.pl/1471.html`
- Board utility params: `?print=true`, `?bipHistory=true`, `?pageHistory=true` (client-side history/print variants).

**Do NOT confuse** with `bip.powiatsztumski.pl` — that is **Starostwo Powiatowe w Sztumie** (Skarb Państwa / powiat property), a different JST, out of scope for the gmina target.

Authority: Burmistrz Miasta i Gminy Sztum (Bartosz Mazerski); Referat Inwestycji/Mienia (case-sign `IM.V.6840…`), Urząd Miasta i Gminy Sztum.

## 3. Format + rendering
- **Server-rendered HTML** board (no SPA, no JS gate, no CAPTCHA, no auth). CMS: numeric-page-id BIP, `templates/template4`, `showFileDetailsAsIcon` / `fileDetailsPopup` — same platform as `bip.malbork.pl`. Board listing is plain HTML anchors `<a href="1186.html?file=NNNNN">Title</a>`.
- **Notices are born-digital text PDFs** (PDF 1.7). `pdftotext -layout` yields clean, structured text — no OCR needed. `core/pdf-text.js` (`pdfText`) is the right tool.
- **TLS caveat:** host serves an incomplete cert chain — WebFetch failed with *"unable to verify the first certificate"*. Crawl with a tolerant fetch (curl `-k` equivalent / browser-UA); the Pi (Polish IP) reaches it fine. Flag this for the adapter's fetch config.

## 4. Volume + achieved-price stream
- **Volume:** Low for flats. Over the visible board window (~2025–2026) a handful of distinct municipal flats (Nowowiejskiego 18/1A, Jagiełły 6/6, Żeromskiego 24A/3, Skłodowskiej udział) — several rounds each because they repeatedly fail to sell (II przetarg → rokowania). Land (działki) is the bulk of the stream. Expect ~a few flat auctions/year plus their repeat rounds.
- **Achieved-price stream:** **YES — clean.** Result PDFs (`Informacja o wyniku … przetargu` / `… rokowań`) carry structured fields: `Cena wywoławcza: 271 000 zł`, `Najwyższa cena osiągnięta w przetargu: …`, plus `Przetarg zakończył się wynikiem negatywnym` (unsold) or nabywca (sold), date, godz., liczba osób dopuszczonych, and the case-sign / KW number. Announcement PDFs carry `cena wywoławcza`, `wadium`, `powierzchnia użytkowa`, address, date. Both cleanly parseable from born-digital text.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** No exact CMS clone exists (`template4` numeric-page-id family is new to the registry). Handling shape ≈ **`slupsk` / small `bip.info.pl` gmina (`zgorzelec`)** pattern: one server-HTML board → harvest `?file=NNNN` PDF links → `pdfText` each → regex/DOM parse. Clone that crawl/parse skeleton.
- **CMS family:** Numeric-page-id server-rendered HTML BIP (`NNNN.html` boards + `?file=NNNN` born-digital PDFs) — the "Bespoke server-rendered / born-digital PDF per notice" branch of ADAPTER-GUIDE §3.
- **Effort:** **MEDIUM.** Extraction is mechanically simple (clean text PDFs, exact fields), but: (a) new CMS = fresh crawl adapter, no drop-in clone; (b) **single mixed board** — must classify each notice (`classifyKind`) and route announcement vs `Informacja o wyniku` vs `wykaz` vs `rokowania`, and separate flats from the land-heavy majority; (c) TLS chain quirk needs a tolerant fetch. Fields: `parseAddress` (ul. Nowowiejskiego 18/1A), `area_m2` (powierzchnia użytkowa), `starting_price_pln` (Cena wywoławcza), `final_price_pln` (Najwyższa cena osiągnięta), `auction_date`, `round` (I/II ustny przetarg → rokowania).
- **Blockers:** None hard. Watch-items: incomplete TLS chain (use `-k`/browser-UA fetch); mixed land+flat+rokowania board (classify + filter); low flat volume (land is in-scope for the wider dataset anyway); pagination/history params for backfill (bound it).

**VERDICT: BUILD (Medium effort)** — genuine open oral municipal flat auctions on a clean server-HTML BIP with born-digital result PDFs carrying exact `Cena wywoławcza` / `Najwyższa cena osiągnięta` fields; new `template4` CMS family (no drop-in clone) + single mixed land-dominated board push effort to Medium, but no technical blockers.
