# Spike — Pułtusk (Mazowieckie · powiat pułtuski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Pułtusk (Miasto i Gmina Pułtusk, ~19k) **does** run recurring `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`. Confirmed live: ul. Na Skarpie 3, lokal nr 25, 73,00 m², cena wywoławcza 300 000,00 zł, wadium 30 000,00 zł — cycled through I → II → III przetarg (Feb–May 2026), plus a separate batch of gmina-owned flats offered in Warsaw. The practical, machine-friendly publication channel is the **city portal `pultusk.pl`, which is WordPress with a working `wp-json` REST API** — announcements are posted as aktualności with **full inline HTML** bodies (address, KW, powierzchnia, cena wywoławcza, wadium, przetarg date) **plus a born-digital text-PDF mirror**. Statutory duplicate lives on the BIP `bip.pultusk.pl`, but that BIP is a **Next.js SPA** (RSC payload, no clean JSON) and has no dedicated property-przetarg board — so WP is the source to scrape. Housing-manager layer exists (TBS Pułtusk Sp. z o.o. on the bip.org.pl network). Volume is modest (a few flats/yr inside a mostly-land stream); no achieved-price results board (`informacja o wyniku` = 0 hits). Closest analog: WordPress WP-REST gmina (brzeg / nowa-sol / bochnia). No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats (open oral auction).** Burmistrz Miasta Pułtusk runs `przetarg ustny nieograniczony` for sale of municipal property, flats included. Concrete confirmed lokal-mieszkalny auctions:
- **ul. Na Skarpie 3, lokal nr 25** — 73,00 m², 4 pokoje + kuchnia, II piętro; obręb 19, dz. 113, KW OS1U/00044602/6; cena wywoławcza **300 000,00 zł**, wadium **30 000,00 zł**. Ran as **I → II → III przetarg ustny nieograniczony** (Feb 24 2026, then III on 05.05.2026) — i.e. repeat rounds when unsold. This is the "Cztery pokoje na sprzedaż" notice in local press.
- **"Mieszkania w Warszawie na sprzedaż – informacja o przetargu"** — Gmina Pułtusk owns flats in Warsaw disposed by przetarg.
- Recent feed (Jun 30 2026): **"OGŁOSZENIE O III PRZETARGACH"**, **"OGŁOSZENIE O I PRZETARGACH"** (bundled land + property), plus rolling **"WYKAZ NIERUCHOMOŚCI PRZEZNACZONYCH DO SPRZEDAŻY"**.

Stream is **mixed land + flats** (land dominates); flats recur but are not high-frequency. Housing-manager sales also occur: **TBS Pułtusk Sp. z o.o.** ran "III przetarg pisemny nieograniczony na sprzedaż nieruchomości" (its own property).

## 2. Where published? (hosts + boards, URLs)
**Primary (scrape this) — city portal `pultusk.pl`, WordPress + wp-json REST:**
- REST base: `https://pultusk.pl/wp-json/wp/v2/posts` (confirmed 200, `x-wp-total` paging).
- Keyword feed via `?search=…`: `sprzedaż lokalu mieszkalnego` → 12 posts; `przetarg ustny nieograniczony` → 5; `wykaz nieruchomości` → 58; total site posts 2239.
- Example notices (inline-HTML + PDF): `https://pultusk.pl/ogloszenie-z-dnia-26-03-2026-r/` (III przetarg, Na Skarpie 3), `https://pultusk.pl/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-na-skarpie-3/`, `https://pultusk.pl/ii-przetarg-ustny-nieograniczony-sprzedaz-lokalu-mieszkalnego-w-pultusku/`, `https://pultusk.pl/mieszkania-w-warszawie-na-sprzedaz-informacja-o-przetargu/`.
- PDF mirror pattern: `https://pultusk.pl/wp-content/uploads/YYYY/MM/UMPultusk__*.pdf` (born-digital).
- **No dedicated przetargi/nieruchomości WP category or tag** — notices sit in the general aktualności feed; filter by title keywords (`przetarg`, `wykaz nieruchomości`, `sprzedaż lokalu`).

**Statutory BIP (harder, secondary) — `bip.pultusk.pl`, Next.js SPA:**
- Procurement board `kategorie/89-…` / `kategorie/90-zamowienia-publiczne-w-formie-przetargu` = works/services (roof, waste), **not property sales**. Property notices land under `kategorie/45-zawiadomienia-obwieszczenia-i-ogloszenia` (thin) — no clean dedicated flat board.

**Housing manager:** `tbs-pultusk.bip.org.pl/przetargi/index` (bip.org.pl network, doc pattern `/przetargi/pokaz/id/NN/param/1`); also `ppuk-pultusk.bip.org.pl` (Eco Pułtusk / PPUK).

Contact: Wydział Gospodarki Nieruchomościami i Architektury, tel. 23 306 72 37; Urząd Miejski w Pułtusku, Rynek (Ratusz).

## 3. Format + rendering
- **Primary source = server-rendered inline HTML via WordPress, exposed as clean JSON through `wp-json`.** Post `content.rendered` carries the full ogłoszenie as an HTML table/paragraphs: oznaczenie/KW, opis lokalu, powierzchnia (73,00 m²), cena wywoławcza (300 000,00 zł), wadium (30 000,00 zł), przetarg date/place, konto. ~5 KB text/post. Strip tags → parse.
- **Born-digital text-PDF mirror** attached per notice (`wp-content/uploads/.../UMPultusk__*.pdf`) — `pdfText` fallback, **no OCR** needed.
- **No SPA/auth/CAPTCHA** on `pultusk.pl` (LiteSpeed). The BIP `bip.pultusk.pl` **is** a Next.js/RSC SPA (`x-powered-by: Next.js`; content only in `self.__next_f` chunks; `/api/page-content?slug=…` returns the SPA shell, not JSON) — avoid; use WP.

## 4. Volume + achieved-price stream
- **Volume:** Modest. A few open flat auctions per year inside a larger land/wykaz stream; `sprzedaż lokalu mieszkalnego` search = 12 posts, `przetarg ustny nieograniczony` = 5. Repeat rounds (I/II/III) inflate per-property notices. Typical for a ~19k miejsko-wiejska seat — real and recurring, enough for BUILD.
- **Achieved-price stream:** **WEAK.** `informacja o wyniku przetargu` search = **0** hits on the WP portal; only **cena wywoławcza** (starting price) is reliably published. No hammer-price/results board found. (Statutory result notices, if any, would be on the SPA BIP — not worth the render cost.) Treat as cena-wywoławcza dataset.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress WP-REST gmina — **brzeg / nowa-sol / bochnia** family, but *easier* because `wp-json` is live (JSON list + `content.rendered`), so no HTML-list crawl. Pull `?search=przetarg|wykaz&per_page=…`, page via `x-wp-total`, parse inline HTML body (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round). PDF only as fallback.
- **CMS family:** WordPress (LiteSpeed) with WP REST API — server-rendered HTML.
- **Effort:** **LOW.** Main work is the classifier — no dedicated feed, so filter the general aktualności stream and separate flat-przetarg vs land-przetarg vs wykaz vs unrelated news by title/body keywords. wp-json removes all scraping friction.
- **Blockers:** None technical. Watch-items: (1) no results board → cena-wywoławcza only, no achieved prices; (2) mixed land/flat stream needs classification; (3) ignore the Next.js BIP.

**VERDICT: BUILD (Low effort)** — recurring open oral flat auctions (Na Skarpie 3 lok. 25 across I/II/III rounds + Warsaw flats), published on a clean WordPress `wp-json` portal with inline-HTML bodies and born-digital PDF mirrors; only caveats are modest volume, no hammer-price board, and a mixed land/flat feed. WP-REST analog, no blockers.
