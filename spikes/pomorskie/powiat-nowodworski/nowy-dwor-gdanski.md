# Spike — Nowy Dwór Gdański (Pomorskie · powiat nowodworski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (thin flat stream).

## TL;DR
Miasto i Gmina Nowy Dwór Gdański (gmina miejsko-wiejska, Żuławy, ~18k) **does** run open flat auctions — `przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej lokal mieszkalny` is a real, confirmed category (Jazowa 36/6; Kopernika 10/2). But the **volume is near-floor**: an independent auction monitor shows a **16:1 land-to-flat skew**, and the only current flat is a single 60 m² unit (Jazowa 36/6) that has cycled I→VIII rounds since May 2025 without selling. The BIP runs the **2ClickPortal** CMS (clean server-HTML, kebab-case `.html` notices) at `bip.miastonowydwor.pl` — technically cheap. But there is **no housing manager** (no ZGM/ZBM/TBS) and **no property results board** (the only "rozstrzygnięte" board is public-procurement, not sales), so there is no achieved-price stream. Genuine open flat auctions exist but yield ~1 distinct flat, dominated by land + dzierżawa + procurement. Closest analog: **łobez** (2ClickPortal). Not worth a dedicated adapter.

## 1. Sells municipal property at auction?
**YES — incl. flats, but thin.** The Burmistrz runs `pierwszy/…/ósmy przetarg ustny nieograniczony na sprzedaż` for municipal property (open, natural + legal persons, wadium, hammer price). Confirmed flat auctions:
- **Jazowa 36/6** — `lokal mieszkalny`, parter + poddasze in a wielorodzinny budynek, **60,20 m²**, cena wywoławcza **75 000 zł** (grunt 21 000 zł), wadium 7 500 zł. Now on the **VIII (ósmy)** round (board 2026-06-18); prior rounds ran I (May 2025) → VII (auction 04.05.2026) — repeatedly unsold, price stepped down. Handled by Referat Majątku Komunalnego.
- **Kopernika 10/2** — `pierwszy przetarg ustny nieograniczony na sprzedaż … lokal mieszkalny` (earlier cycle).

Dominant stream is **land**: current board carries `Szósty przetarg … sprzedaż działek Złota-Wiosenna` and `drugi ustny ograniczony przetarg … działka 211/4 Kmiecin`, plus recurring `przetarg na dzierżawę nieruchomości gruntowych` (lease). An external monitor (adradar) lists **16 land parcels vs 1 flat** in a single issue — a land-heavy disposal profile.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (2ClickPortal CMS):**
- Property notices ("aktualne"): `https://bip.miastonowydwor.pl/191-aktualne.html` (paginated `?page=2` …)
- Flat notice (Jazowa 36/6): `https://bip.miastonowydwor.pl/osmy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stanowiacej-lokal-mieszkalny-w-m-jazowa-nr-366.html`
- Land notice ex.: `https://bip.miastonowydwor.pl/szosty-przetarg-ustny-nieograniczony-na-sprzedaz-dzialek-polozonych-w-obrebie-ulic-zlota-wiosenna-w-ndg.html`
- "Przetargi - inne" (regulaminy only): `https://bip.miastonowydwor.pl/190-przetargi-inne.html`
- `przetargi.html` and `?app=przetargi&status=3` = **public-procurement** (zamówienia / platformazakupowa.pl), NOT property sales.
- Notice URL pattern: `[kebab-case-title].html` (also legacy `?cid=NNN` params).

**Legacy mirror host:** `bip138.lo.pl` (same 2ClickPortal) — `?cid=222` "Przetargi ogłaszane przez UM - inne", `?cid=218` "Ogłoszenia, obwieszczenia" (cert altnames mismatch on that host; use `bip.miastonowydwor.pl`).

Contact: **Referat Majątku Komunalnego**, ul. Wejhera 5A, pok. 3, tel. 55 625 77 81. Full notices also on `miastonowydwor.pl` + tablica ogłoszeń.

**Do NOT confuse with:** the county — `bip.nowydworgdanski.pl` / `nowydworgdanski.pl` (Starostwo Powiatowe, out of scope); and **Nowy Dwór Mazowiecki** (mazowieckie), a different town.

## 3. Format + rendering
- **Server-rendered HTML** — footer "Powered by 2ClickPortal® – Portale nowej generacji". No JS gate, no auth, no CAPTCHA. Confirmed live via fetch of the board + notices.
- Notice bodies are inline HTML text (Żuławy TV reproduces full notice text verbatim); occasional attached PDF/DOC possible but the styled `.html` carries the notice.
- Kebab-case `.html` slugs; paginated list board. Same shape as łobez.

## 4. Volume + achieved-price stream
- **Volume: VERY LOW.** Effectively **1 distinct flat** in the pipeline (Jazowa 36/6, 8 repeat rounds = same asset re-listed) + occasional prior flats (Kopernika 10/2). Monitor skew **16 land : 1 flat**. Small gmina; flats surface rarely and mostly go bezprzetargowo na rzecz najemcy (see `Sprzedaż lokali mieszkalnych.pdf` service card / `Nabycie … w trybie bezprzetargowym`).
- **Achieved-price stream: NONE (usable).** No dedicated property "rozstrzygnięcia"/"informacja o wyniku przetargu" board — the only "Przetargi - Rozstrzygnięte" board (`?app=przetargi`) is public procurement. Sale results would appear only as sporadic individual notices; the Jazowa flat has produced only negative results (unsold) across rounds, so no hammer prices to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **łobez** (2ClickPortal) — same CMS, kebab `.html` notices, paginated board. Cloning is technically **Low** effort in isolation.
- **Why NO-BUILD anyway:** the flat-auction yield is at the floor. One recurring unsold flat + a land/dzierżawa/procurement-dominated BIP, **no housing manager (ZGM/ZBM/TBS)**, and **no achieved-price results board**. Per the ledger heuristic this is a "generic city-BIP skewing to land + tenant sales with ~0 open flat auctions" — the residential disposal is mostly bezprzetargowo na rzecz najemcy, and open flat auctions are too sparse to justify a dedicated adapter or feed the hammer-price stream.
- **Blockers:** none technical (clean server-HTML). Blocker is **data thinness**, not access. Revisit only if bundled into a shared 2ClickPortal multi-gmina adapter (łobez family) where NDG rides along at near-zero marginal cost.

**VERDICT: NO-BUILD** — open flat auctions exist but are near-zero volume (1 recurring unsold flat; 16:1 land skew), no housing manager, no property results/achieved-price board. Clean 2ClickPortal CMS (łobez analog), so revisit only as a bundled add-on, not a standalone build.
