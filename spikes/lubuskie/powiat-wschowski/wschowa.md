# Spike — Wschowa (Lubuskie · powiat wschowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Wschowa (miejsko-wiejska; Urząd Miasta i Gminy Wschowa, Rynek 1) sells municipal property — **including lokale mieszkalne** — via **ustny przetarg nieograniczony na sprzedaż**, open to natural and legal persons (not tenant-only bezprzetargowo). Auctions are published on the city BIP `bip.gminawschowa.pl`, which runs the **SYSTEMDOBIP.PL** CMS (E-LINE Systemy Internetowe / Tadeusz Kozłowski) — the Lubuskie-region SystemDoBIP family. The BIP has a dedicated **Przetargi** module (`/przetargi/29/…`) with server-rendered HTML entries and built-in status tabs **Ogłoszone / Rozstrzygnięte / Unieważnione** — i.e. a native results (achieved-price) stream. Confirmed flat auctions: Dworcowa 1/5 (60.88 m², cena wywoławcza 144 000 zł, 18.08.2025), Kilińskiego 3/2 (55.45 m², 88 418 zł). Volume is low-to-modest and mixed with land. No SystemDoBIP adapter exists yet in the repo; closest structural analog is a bespoke server-rendered HTML board (nowa-sol / brzeg WordPress-HTML pattern). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats, open oral auction.** The Burmistrz Miasta i Gminy Wschowa runs `ustny przetarg nieograniczony` for sale of gmina property; announcements explicitly state "W przetargu mogą brać udział osoby fizyczne i prawne" — an **open** auction, not a bezprzetargowo sale to the sitting najemca. Confirmed lokal-mieszkalny auctions:
- **ul. Dworcowa 1, lokal nr 5** — I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego; powierzchnia użytkowa 60,88 m² (2 pokoje, kuchnia, przedpokój, korytarz, łazienka z WC, pomieszczenie gospodarcze); cena wywoławcza 144 000 zł; wadium 14 400 zł; termin 18.08.2025, sala narad Rynek 1.
- **ul. Kilińskiego 3, lokal nr 2** — sprzedaż lokalu mieszkalnego, powierzchnia 55,45 m², II piętro; cena wywoławcza 88 418,00 zł (zw. z VAT).
- Also on the board: land / nieruchomości niezabudowane (ul. Cisowa/Jodłowa/Czereśniowa — 9 działek, II przetarg, 15.07.2026) and nieruchomości pod zabudowę wielorodzinną — so flats cycle in and out of a mixed property/land stream rather than being permanently open.

Sales are handled directly by the **Wydział Gospodarki Miejskiej i Ochrony Środowiska** of the UMiG (Rynek 1, tel. 65 540 86 47) — no separate ZGM/TBS housing-manager BIP observed; the gmina office is the single publisher.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (SYSTEMDOBIP.PL CMS):**
- Przetargi module (all statuses): `https://bip.gminawschowa.pl/przetargi/29/status/`
- Status tabs (native): **Ogłoszone** / **Rozstrzygnięte** (results) / **Unieważnione** — filter views under `/przetargi/29/…`.
- Example detail entry: `https://bip.gminawschowa.pl/przetargi/29/132/6_2FBN_2F2026__2880_2FBN_29/` and `…/29/124/9_2FBN_2F2025__2873_2FBN_29/` (board 29 → numeric id → encoded slug; `_2F` = URL-encoded `/` from the `N/BN/YYYY` sygnatura).
- Zamówienia publiczne (separate procurement module, out of scope): `https://bip.gminawschowa.pl/11/Zamowienia_publiczne/`
- Footer credit: "Wszelkie prawa do programu SYSTEMDOBIP.PL stanowią własność E-LINE SYSTEMY INTERNETOWE Tadeusz Kozłowski."

**Mirror / news host:** `https://gminawschowa.pl/aktualnosci/…` and `…/news/…` — the promotional city site re-posts each przetarg as an article (full text incl. cena wywoławcza, wadium, area). Useful cross-check but BIP `/przetargi/29/…` is the authoritative structured board.

**Legacy BIP:** `https://old.bip.wschowa.pl/` (older articles, still indexed) — superseded by `bip.gminawschowa.pl`.

**Do NOT confuse** with `bip.wschowa.info` / `wschowa.info` — that is the **Powiat Wschowski** (Starostwo/Zarząd Powiatu), a separate JST selling powiat property; out of scope for the gmina target.

## 3. Format + rendering
- **Server-rendered HTML** — SystemDoBIP przetargi module. List + detail pages are plain server HTML (no SPA gate, no auth, no CAPTCHA); confirmed live via fetch of `/przetargi/29/status/` and the gminawschowa.pl article mirror.
- Each przetarg entry has structured status metadata (Ogłoszone/Rozstrzygnięte/Unieważnione, data ogłoszenia, "wynik"/"Brak wyniku"), a title, and the full ogłoszenie body.
- Full notice text is typically **inline HTML**; some notices may attach a **born-digital PDF** wykaz/ogłoszenie — handle with `pdfText` if encountered (OCR unlikely on this CMS).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest — a handful of property przetargi per year across a mixed board (flats + building land + occasional lokal użytkowy). Flats recur (Dworcowa, Kilińskiego confirmed) but are not high-frequency; expect ~a few flats/year, some as II/III przetarg (repeat when unsold), e.g. "II przetarg ustny nieograniczony".
- **Achieved-price stream:** YES — native **Rozstrzygnięte** status tab within the SystemDoBIP przetargi module publishes concluded auctions (wynik / cena osiągnięta), separate from **Ogłoszone** (cena wywoławcza) and **Unieważnione**. Both starting and hammer prices are parseable from server HTML — no separate results host needed.

## 5. Adapter effort + verdict (closest analog; blockers)
- **CMS family:** **SYSTEMDOBIP.PL** (E-LINE) — a Lubuskie-region server-rendered HTML BIP. **First SystemDoBIP city in the repo** (no existing SystemDoBIP adapter to clone directly).
- **Closest analog:** treat as **Bespoke server-rendered HTML** — clone the **nowa-sol / brzeg** WordPress/custom-HTML pattern (ADAPTER-GUIDE §3, "WordPress / custom HTML"): fetch a board, harvest dated detail hrefs, DOM/regex parse. The native status tabs make announcement-vs-result routing trivial (crawl `Ogłoszone` → listings, `Rozstrzygnięte` → results) — cleaner than most bip.info.pl clones.
- **Effort:** **LOW.** `crawlActive` = list `/przetargi/29/…` Ogłoszone → detail fetch → parse `address` (parseAddress), `area_m2` (`powierzchnia użytkowa X,XX m²`), `starting_price_pln` (`cena wywoławcza`), `wadium`, `auction_date`, `round` (I/II/III). `crawlResultDocs` = Rozstrzygnięte tab → `cena osiągnięta`/wynik. Classify + drop land/dzierżawa/procurement where flats are the target (land also in-scope for the wider dataset). Watch the encoded-slash (`_2F`) detail URLs and paginate the "pokaż wszystkie" full-board view (bounded).
- **Blockers:** None. No rate-limit/auth/CAPTCHA signals. Only watch-items: mixed property/land/procurement stream (classify) and a brand-new CMS shape (write the board+detail selectors from scratch, then it's reusable for other Lubuskie SystemDoBIP gminas).

**VERDICT: BUILD (Low effort)** — recurring open municipal flat auctions on a clean SystemDoBIP server-HTML BIP with native Ogłoszone/Rozstrzygnięte/Unieważnione status tabs (built-in achieved-price stream); no blockers. First SystemDoBIP adapter — model it on the nowa-sol/brzeg custom-HTML analog.
