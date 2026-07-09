# Spike — Szydłowiec (Mazowieckie · powiat szydłowiecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Miasto i Gmina Szydłowiec (miejsko-wiejska, town seat) sells municipal property — **including lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Notices and results are published on the city BIP `bip.szydlowiec.pl`, which runs the **SystemDoBIP** hosted CMS (E-LINE SYSTEMY INTERNETOWE / systemdobip.pl) — clean server-rendered HTML with stable numeric detail URLs `/<menu>/<id>/<slug>/`. Property auctions, wykazy, results and other obwieszczenia all land on **one mixed board — "Komunikaty i ogłoszenia" (menu 44)** — with the announcement body inline HTML plus a born-digital PDF, and the *informacja o wyniku przetargu* published as a small born-digital PDF (~96 KiB). No dedicated ZGM/TBS — property handled directly by the Referat Gospodarowania Mieniem Gminnym. Volume is low but recurring (Staszica 13, Staszica 15/2 II przetarg, Dec-2025 flat wykaz confirmed), mixed with land + repeat rounds. Closest analog: the SystemDoBIP family already profiled as BUILD — **nidzica / iława / krosno-odrzańskie** (same CMS, same parse strategy). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Burmistrz Szydłowca runs `ustny przetarg nieograniczony` for sale of municipal property (Referat Gospodarowania Mieniem Gminnym, ul. Słomiana 17, tel. 48 617 86 57). Confirmed lokal-mieszkalny sale auctions:
- **ul. Staszica 13**, lokal nr 1, parter — ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, 39.00 m², cena wywoławcza 109 700 zł, wadium 6 000 zł (BIP `/44/2232/`).
- **ul. Staszica 15**, lokal nr 2, parter — **II** ustny przetarg nieograniczony, 46.00 m² (2 pokoje + kuchnia), cena wywoławcza 106 160 zł, wadium 10 616 zł.
- Grudzień 2025 — *informacja o wykazie nieruchomości przeznaczonej do sprzedaży* covering a flat, and a **Informacja o wyniku przetargu** (result, 2025-12-30) at `/44/3983/`.

The mixed board also carries land sales (działki), *wykaz do dzierżawy*, and one recent *przetarg ustny ograniczony* (limited — the exception, correctly out-of-target). Open oral flat auctions are the recurring in-scope category. Both natural and legal persons may bid; 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SystemDoBIP CMS):**
- Board (announcements + wykazy + results + obwieszczenia): **`https://bip.szydlowiec.pl/44/Komunikaty_i_ogloszenia/`**
- Pagination: `https://bip.szydlowiec.pl/44/Komunikaty_i_ogloszenia/<page>/`
- Individual notice pattern: `https://bip.szydlowiec.pl/44/<id>/<Title_slug>/`
  - Flat auction example: `https://bip.szydlowiec.pl/44/2232/Ogloszenie_przetargu_na_sprzedaz_lokalu_mieszkalnego/`
  - Result example: `https://bip.szydlowiec.pl/44/3983/Informacja_o_wyniku_przetargu/`
- Public-procurement module (separate, NOT property-sale primary): `https://bip.szydlowiec.pl/zamowienia_publiczne/...` — occasionally mirrors a *przetarg ustny na sprzedaż nieruchomości* under "Rozstrzygnięte zamówienia publiczne"; treat BIP menu 44 as authoritative.

**Secondary / human mirror (non-BIP city site):** `https://www.szydlowiec.pl/index.php/pl/dla-mieszkanca/sprzedaz-nieruchomosci` and `.../dla-inwestora/sprzedaz-nieruchomosci` — a paginated running list of sale/lease notices (useful for cross-check, not the parse target).

**Do NOT confuse** with the powiat BIP `bip.szydlowiecpowiat.akcessnet.net` (Starostwo Powiatowe, akcessnet CMS) — separate JST (Skarb Państwa / powiat property), out of scope for the gmina target.

## 3. Format + rendering
- **Server-rendered HTML** — SystemDoBIP hosted CMS (footer: "Wszelkie prawa do programu SYSTEMDOBIP.PL … E - LINE SYSTEMY INTERNETOWE Tadeusz Kozłowski"). No SPA, no JS gate, no auth/CAPTCHA observed.
- **Announcement body** is inline HTML text (address, powierzchnia użytkowa, cena wywoławcza, wadium, termin, round) **plus** a duplicate born-digital PDF attachment (~100 KiB).
- **Results** (*informacja o wyniku przetargu*) are published as a **born-digital PDF attachment** (~96 KiB), only metadata inline → needs `pdfText` for hammer price.
- Stable numeric detail URLs (`/44/<id>/…`) make crawling + dedup straightforward.

## 4. Volume + achieved-price stream
- **Volume:** LOW but recurring. A small miejsko-wiejska gmina (~12k town) — expect ~2–5 property auctions/yr across the mixed board (flats + land), some as **II/III przetarg** (repeat when unsold; e.g. Staszica 15/2 was a II przetarg). Flats are a minority but a real, recurring category.
- **Achieved-price stream:** YES — dedicated *Informacja o wyniku przetargu* notices on the same board (born-digital PDF, e.g. `/44/3983/` published 2026-01-05 for a 2025-12-30 auction). Announcement carries `cena wywoławcza`; result PDF carries `cena osiągnięta / nabywca`. Requires PDF text extraction.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** the **SystemDoBIP** family already profiled as BUILD — **nidzica / iława / krosno-odrzańskie** (identical CMS, identical `/<menu>/<id>/<slug>/` URL shape, inline-HTML announcement + PDF/DOC results). Clone that parse strategy. Shape/effort otherwise mirrors the zgorzelec/złotoryja server-HTML gmina pattern.
- **CMS family:** SystemDoBIP (server-rendered HTML; classic BIP, no SPA). Fingerprint: `systemdobip` / E-LINE footer.
- **Effort: LOW–MEDIUM.** Primary path is easy: crawl board menu 44 (+ pagination), follow numeric detail URLs, regex/DOM-parse address + powierzchnia użytkowa + cena wywoławcza + wadium + termin + round from **inline HTML**; classify `lokal mieszkalny` vs land/dzierżawa/obwieszczenie. **Bumps to Medium** because (a) results are **born-digital PDFs** → `pdfText` for hammer prices, and (b) the board is **mixed/general** ("Komunikaty i ogłoszenia" carries obwieszczenia, konsultacje, wykazy, przetargi, wyniki all together) rather than a dedicated `/przetargi/NNN/status/` module like nidzica — so classification/filtering does more work.
- **Blockers:** None technical. No rate-limit/auth/CAPTCHA signals. Watch-items: (1) mixed board → robust keyword classification + drop non-property + drop *przetarg ograniczony* if only open auctions are targeted; (2) low absolute flat volume + repeat rounds (dedupe by address/KW across I–IV przetarg); (3) PDF extraction for achieved prices.

**VERDICT: BUILD (Low–Medium effort)** — recurring OPEN flat auctions (`przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`) on a clean server-HTML SystemDoBIP BIP with an inline-HTML announcement body and a born-digital result-PDF stream; low volume and a mixed board are the only frictions, no technical blockers. Direct clone of the nidzica/iława SystemDoBIP analog.
