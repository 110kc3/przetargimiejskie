# Spike — Pisz (Warmińsko-Mazurskie · powiat piski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Pisz (Urząd Miejski, Burmistrz Pisza) disposes of municipal property — **including lokale mieszkalne** — through *przetarg ustny nieograniczony na sprzedaż*, published on the city BIP `bip.pisz.hi.pl`. This is a **server-rendered HTML** BIP (the `hi.pl`/PUBLIKATOR-style engine: articles at `index.php?wiad=NNNN`, category boards at `index.php?k=NN`; no SPA, no auth, no PDF — announcements are inline HTML). Open **flat** auctions recur at market prices: Klementowskiego 6/3 (109.83 m², cena wyw. 330 000 zł, 2023), Klementowskiego 6/4 (91.35 m², 235 000 zł, II przetarg 14.10.2025), Klementowskiego 15/28 (35.82 m², 86 000 zł, 2017), Rybacka 6 (3 flats, 2003). Results are published inline as *„Ogłoszenie o wyniku przetargu"*. The board mixes flats with a heavier **land** auction stream and a very large **lease** (wydzierżawienie) wykaz stream, so classification matters — but the CMS is clean and the flat + achieved-price signal is real. Closest analog: server-HTML text BIP (Zgorzelec `bip.info.pl` / WordPress-HTML family). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Burmistrz Pisza runs `publiczny przetarg ustny nieograniczony na sprzedaż` for municipal property. Market-rate open **flat** auctions confirmed across years (not tenant bezprzetargowo deals):
- ul. Klementowskiego 6/3 — lokal mieszkalny 109.83 m², cena wyw. 330 000 zł, wadium 60 000 zł, auction 15.02.2023 (`wiad=29472` building; also earlier notices for the same address).
- ul. Klementowskiego 6/4 — lokal mieszkalny 91.35 m², cena wyw. 235 000 zł, wadium 40 000 zł, **II** przetarg 14.10.2025 (`wiad=29472`).
- ul. Klementowskiego 15/28 — lokal mieszkalny 35.82 m², cena wyw. 86 000 zł, wadium 15 000 zł, **II** przetarg 14.06.2017 (`wiad=17226`).
- ul. Rybacka 6 (dz. 420/5) — 3 lokale mieszkalne (71.89 / 42.42 / 51.81 m²), II przetarg 21.11.2003 (`wiad=13561`).

Separately, flats are ALSO disposed of *na rzecz najemcy* (bezprzetargowo, up to 95% bonifikata) via *„Wykaz nieruchomości przeznaczonych do sprzedaży"* — a distinct, non-auction channel (e.g. `wiad=26333` Matejki, `wiad=24353` Gdańska, `wiad=22693` Lipowa). The open **land**-auction stream is the largest sale-auction source (Pogobie Średnie/Tylne, Trzonki, Jagodne, Karwik, Pisz 1/2 działki — `wiad=23119`, `31059`, `15094`, `26963`). Both natural and legal persons may bid; 10%-ish wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.pisz.hi.pl`, hi.pl/PUBLIKATOR-style engine):**
- **Ogłoszenia** (announcements board — przetargi + wykazy mixed): `https://bip.pisz.hi.pl/index.php?k=84`
- **Urzędowa Tablica Ogłoszeń**: `https://bip.pisz.hi.pl/index.php?k=27`
- **Zamówienia Publiczne** (procurement, not in scope): `https://bip.pisz.hi.pl/index.php?k=83`
- **Majątek Gminy**: `https://bip.pisz.hi.pl/index.php?k=934`; **Wydział Gospodarki Komunalnej** (manages the municipal housing stock): `https://bip.pisz.hi.pl/index.php?k=35`
- Article URL pattern: `index.php?wiad=NNNN` (both `bip.pisz.hi.pl` and `www.bip.pisz.hi.pl` resolve).
- Results (inline): *„Ogłoszenie o wyniku przetargu …"* articles, e.g. `https://bip.pisz.hi.pl/index.php?wiad=31101` (Karwik dz. 69/4, 2026).

**Secondary (mirror, not authoritative):** city portal `www.pisz.pl` reposts some notices under `szczegoly-kategorii/14` and `/15` (`https://www.pisz.pl/pl/szczegoly-kategorii/15`). Use the BIP as source of truth.

Contact / venue: Urząd Miejski w Piszu, ul. G. Gizewiusza 5, 12-200 Pisz; auctions held in sala nr 58/62/64.

## 3. Format + rendering
- **Server-rendered HTML** — confirmed live across 7+ fetches (flat auctions, land auctions, wykazy, result notices). Full notice text is **inline HTML**; no attached PDF observed, **no OCR needed**.
- **No SPA, no auth, no CAPTCHA, no JS gate.** Stable numeric IDs (`wiad`) and category IDs (`k`) — trivial to enumerate/crawl.
- Category board (`k=84`) is a dated article list; each item links to a `wiad=NNNN` full-text article. Printable/clean text is the default.

## 4. Volume + achieved-price stream
- **Flat auctions:** LOW-to-MODEST but genuinely recurring and market-rate — clustered in active periods (e.g. the Klementowskiego 6 building yielded 6/3 in 2023 and 6/4 in 2025; Klementowskiego 15/28 in 2017; Rybacka 6 in 2003). Expect roughly a few flats/year in active years, some as II/III przetarg. Prices 86k–330k zł (real market flats, not discounted tenant sales).
- **Land auctions:** REGULAR and the dominant open-auction stream (multiple działki events per year) — in scope for the wider dataset.
- **Achieved-price stream:** YES — dedicated *„Ogłoszenie o wyniku przetargu"* notices published inline on the same board carry the outcome (cena osiągnięta / nabywca, or *„wynik negatywny — nikt nie przystąpił"*). Announcement carries cena wywoławcza; result notice carries the hammer price. Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** server-HTML text BIP — **Zgorzelec** (`bip.info.pl`) / WordPress-HTML family (list board → `wiad` article fetch → regex/DOM parse; second pass over result notices for cena osiągnięta). The `hi.pl` engine differs in URL scheme (`?wiad=`/`?k=`) but the parse shape is identical to a `bip.info.pl` clone.
- **CMS family:** `bip.pisz.hi.pl` — hi.pl/PUBLIKATOR-style hosted BIP (server-rendered HTML; WordPress/custom-HTML tier in ADAPTER-GUIDE §3 terms). No new engine primitives needed.
- **Effort: LOW.** Crawl board `k=84` → fetch each `wiad=NNNN` → title-classify: keep *„przetarg … na sprzedaż lokalu mieszkalnego"* (and land, if in scope), DROP *„wydzierżawienie"/„najem"* and *„wykaz … na rzecz najemcy"* (bezprzetargowo). Extract address (parseAddress), pow. użytkowa, cena wywoławcza, wadium, date, round; second pass over *„Ogłoszenie o wyniku przetargu"* for cena osiągnięta / nabywca.
- **Blockers:** None technical. Main watch-item is **classification noise** — the single `k=84` board is dominated by lease wykazy (89+) and land, with flat auctions a minority; the adapter must filter hard. No dedicated housing manager (Wydział Gospodarki Komunalnej administers the stock; UM sells directly). No rate-limit/auth signals.

**VERDICT: BUILD (Low effort)** — recurring, market-rate open flat auctions (plus a strong land stream) with inline achieved-price result notices on a clean server-HTML `hi.pl` BIP; standard Zgorzelec-style analog. Only caveat: heavy lease/wykaz noise on the shared board requires solid title classification.
