# Spike — Proszowice (Małopolskie · powiat proszowicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina i Miasto Proszowice (gmina miejsko-wiejska seat) **actively sells municipal flats at open auction** — `pierwszy/kolejny przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego`. Live-confirmed flats: ul. Królewska 72/4 (280.000 zł, sold 18.06.2026), 70/57, 70/60. The authoritative, **server-rendered HTML** source is the **city portal `proszowice.pl`** (bespoke ASP CMS, `asp/pl_start.asp?...` + friendly `aktualnosc-NNNN-*.html` URLs), which exposes a dedicated **"Nieruchomości gminne"** category = one paginated board (≈125 articles / 14 pages) carrying announcements *and* `Informacja o przetargu` result notices with **named buyer + result**. Full notice text is **inline HTML** (born-digital, no PDF-only, no JS gate). The parallel `bip.malopolska.pl/ugimproszowice` BIP is the usual Małopolska Liferay JS-SPA (near-empty without JS) — not needed, the city portal is richer. Closest analog: WordPress/custom-HTML Małopolska city portal (bochnia/olkusz shape). No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, flats explicitly and recurring.** Burmistrz GiM Proszowice runs `przetarg ustny nieograniczony` for sale (`zbycie`) of municipal property, flats included. Live-confirmed lokal-mieszkalny auctions:
- **ul. Królewska 72/4** — I przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego nr 4; pow. użytk. **43,34 m²** + piwnica 2,56 m²; **cena wywoławcza 280.000,00 zł (brutto)**, wadium 20.000 zł; przetarg **18.06.2026 g.10:00**; wynik: **pozytywny, nabywca p. Urszula Korfel** (2 uczestników).
- **ul. Królewska 70/57** — I przetarg ustny nieograniczony, lokal mieszkalny na poddaszu (2 pokoje, kuchnia, łazienka), pow. **37,43 m²** + piwnica 4,37 m²; cena wywoławcza **160.000,00 zł**, wadium 10.000 zł.
- **ul. Królewska 70/60** — przetarg ustny nieograniczony + regulamin przetargu, lokal mieszkalny.
Also on the same board: lokal użytkowy ul. 3 Maja 70 (przetarg ograniczony / najem), and land auctions (dz. 18/3 Wolwanowice — up to VIII przetarg + odwołania; Bobin). So the stream is mixed flats + land + lokale użytkowe, with flats a live, recurring category — not merely bezprzetargowo-na-rzecz-najemcy or dzierżawa.

## 2. Where published? (hosts + boards, URLs)
**Primary — city portal `proszowice.pl` (bespoke ASP CMS, server-HTML):**
- Property category board (announcements + results): `https://proszowice.pl/aktualnosci-25-nieruchomosci_gminne.html` (≈125 art. / 14 stron; paginacja `aktualnosci-25-nieruchomosci_gminne-N.html`).
- "Ogłoszenia i obwieszczenia" board (ASP view): `https://www.proszowice.pl/asp/pl_start.asp?typ=13&menu=41&akcja=lista` (article: `...&akcja=artykul&artykul=NNNN`).
- Friendly article URL pattern: `https://proszowice.pl/aktualnosc-NNNN-slug.html` (e.g. `aktualnosc-10833-...` ogłoszenie Królewska 72/4; `aktualnosc-10934-...` informacja/wynik 72/4).
**Secondary — BIP on bip.malopolska.pl:** `https://bip.malopolska.pl/ugimproszowice` (menu np. `,m,192181,zamowienia-publiczne-ogloszenia.html`, `,m,273201,sprzedaz-udzialow.html`) — official BIP mirror but **Liferay JS-SPA**, near-empty in raw HTML; skip in favour of the city portal.
Contact: Urząd Gminy i Miasta Proszowice, ul. 3 Maja 72, pok. 42/40, tel. (12) 386-10-05 w. 142/140.

## 3. Format + rendering
- **Server-rendered HTML** on `proszowice.pl` — confirmed by fetch: category list and both a full ogłoszenie and a full wynik render with **inline body text** (cena wywoławcza, wadium, powierzchnia, data/godzina, nabywca) — **no JS gate, no PDF-only, no CAPTCHA/auth**.
- **Born-digital inline text** (occasional PDF załącznik possible — handle with `pdfText`; OCR unlikely).
- `bip.malopolska.pl/ugimproszowice` = JS-SPA (analog **chrzanow render.js**) — only fall back to it if the portal ever moves; not required now.

## 4. Volume + achieved-price stream
- **Volume:** solid for a small gmina — the "Nieruchomości gminne" category holds **≈125 articles across 14 pages**; flats recur (multiple Królewska units in the last cycle) alongside land + lokale użytkowe. Expect a few flat auctions/year, some as kolejny/II+ przetarg when unsold.
- **Achieved-price stream:** **YES** — same board publishes `Informacja o [pierwszym] przetargu ustnym...` result notices naming the **nabywca** and confirming `wynik pozytywny/negatywny` (Królewska 72/4 → p. Urszula Korfel). Announcements carry `cena wywoławcza`; result notices carry outcome/buyer (and cena osiągnięta where a postąpienie occurred). Both parseable from inline HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress/custom-HTML **Małopolska city portal** — bochnia / olkusz / nowa-sol shape (single category-scoped article board, friendly `aktualnosc-NNNN` URLs, server-HTML, no SPA). Clone that pattern, point at `proszowice.pl` category 25.
- **CMS family:** bespoke ASP portal (`pl_start.asp?typ/menu/artykul` + friendly-URL rewrite) → custom/WordPress-HTML family in ADAPTER-GUIDE terms (plain HTML article body).
- **Effort:** **LOW.** Crawl `aktualnosci-25-nieruchomosci_gminne(-N).html` pagination → fetch each `aktualnosc-NNNN` → regex/DOM parse inline text (parseAddress, pow. użytkowa, cena wywoławcza, wadium, data, runda); classify `lokal mieszkalny` vs land vs lokal użytkowy vs najem/dzierżawa; second pass pairs `Informacja o przetargu` wynik notices (nabywca / result) to their announcement.
- **Blockers:** none — no auth/rate-limit/CAPTCHA. Watch-items: (a) mixed flat/land/najem stream → classify + filter; (b) `odwołanie przetargu` notices (drop/flag cancelled rounds); (c) keep the city portal (not the SPA BIP) as source.

**VERDICT: BUILD (Low effort)** — recurring open municipal flat auctions on a clean server-HTML city portal with a single property board carrying announcements + named-buyer results; standard custom-HTML Małopolska analog, no blockers.
