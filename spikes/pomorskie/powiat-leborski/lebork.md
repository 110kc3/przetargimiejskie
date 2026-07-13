# Spike — Lębork (Pomorskie · powiat lęborski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-13** (7/7 parse test; TERYT 220801_1 best-effort). Analog wabrzezno (multi-lokal parser + content-routed announce/result split) × zgorzelec (html board → article → inline text). Live-groundtruthed 2026-07-13, correcting three DESK assumptions: the board is ONE **recursive** "Lista artykułów" tree (board → year → month → leaf, decorative slugs — follow the row href, classify by BODY), not a flat `/artykul/` list; flat RESULT prose **drops "ul."** ("przy Łokietka 24") → address anchor made ul.-optional/uppercase-initial; tabular LAND rows **abut a bare area to the price** ("2392 210.000,00") → amount regex got a `(?<!\d)` guard; a multi-lokal middle unit can read **"nr 17 oficyna o pow"** → lokal anchor tolerates the qualifier. Multi-lokal notices split one record/lokal; land → land.json; results carry sold (achieved) + unsold (negative) outcomes. source:'html', browser UA, no PDF/OCR.

## TL;DR
Gmina Miasto Lębork actively sells municipal flats at *ustny przetarg nieograniczony na sprzedaż*. Announcements and result notices are published on a single BIP host (`bip.um.lebork.pl`) as standard HTML article pages. Volume is moderate (2–5 flats per batch, several batches per year). Result notices with achieved prices are posted on the same BIP. Low-effort adapter — clean HTML, no auth, no SPA, no bot blocks observed.

## 1. Sells municipal property at auction?
**YES — confirmed.** The Burmistrz Miasta Lęborka regularly announces *I/II/III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*. Confirmed examples from 2024–2025:
- I przetarg 08.01.2025: ul. Wita Stwosza 6 (47.26 m²), ul. Stryjewskiego 55 no. 9 (34.39 m²)
- II przetarg 26.02.2025: ul. Czołgistów 4 no. 3 (120.45 m²), ul. Wita Stwosza 6 no. 2 (47.26 m²)
- III przetarg 23.04.2025: ul. Chopina 5 no. 4 (79.77 m²)
- Batches with 4+ flats at once also appear (e.g. ul. Skłodowskiej 22, ul. Kossaka 18, ul. Grunwaldzkiej 17 in one announcement).

Not bezprzetargowo-only. Municipal flats are sold at open auction to the general public.

## 2. Where published? (hosts + boards, URLs)
- **Primary BIP host:** `https://bip.um.lebork.pl/` — canonical BIP of Urząd Miejski w Lęborku
- **Auction board (index):** `http://bip.um.lebork.pl/strony/menu/38.dhtml` — "Sprzedaż i dzierżawa nieruchomości - przetargi"
- **Individual announcement articles:** `https://bip.um.lebork.pl/artykul/...` (slug-based HTML pages)
- **Result/achieved-price board:** Same BIP, articles titled "Informacja o wyniku [I/II/III] przetargu ustnego nieograniczonego..." — confirmed at `https://bip.um.lebork.pl/artykul/informacja-o-wyniku-...` and `https://bip.um.lebork.pl/artykul/informacja-burmistrza-miasta-leborka-dotyczaca-przeprowadzonego-przetargu-na-lokal-mieszkalny-p`
- **Mirror/legacy BIP:** `https://lebork.bip.alfatv.pl/` (older entries, e.g. ul. Jesionowej 23) — may need fallback check
- **Portal mirror:** `https://www.lebork.pl/przetargi-2/` — city portal re-publishes same listings (secondary)

## 3. Format + rendering
- **HTML articles** on standard BIP CMS (`bip.um.lebork.pl`) — standard Polish municipal BIP layout, no JavaScript-gated content observed
- Text is inline HTML, not PDF attachments (announcement text appears in body of article pages based on search snippet content)
- No login / auth wall
- No SPA detected; pages are server-rendered
- No bot blocks encountered in search indexing (Google indexes individual article slugs)
- Legacy mirror (`alfatv.pl`) may have `.dhtml` pages — same static HTML pattern
- Result notices: HTML articles, not scanned PDFs

## 4. Volume + achieved-price stream
- **Announcement volume:** Moderate — roughly 3–6 batches per year, 1–5 flats per batch → ~5–15 flat auctions/year
- **Round progression:** Multiple rounds per flat (I → II → III) when no bidders; III przetarg seen as recently as 2025/2026, indicating some flats require multiple rounds before sale
- **Result notices confirmed:** "Informacja o wyniku przetargu" articles posted on BIP after each auction (confirmed for Dec 2022, and Feb 2026 land auction result visible — same pattern for flats per "Informacja Burmistrza…" article confirmed in search)
- **Achieved price in results:** Result notices confirm outcome (positive/negative) and — for successful auctions — achieved price; negative results (nikt nie przystąpił) also posted
- **Note:** Some auctions end without bidders (confirmed: Jan 2025 ul. Czołgistów 4 no. 3 — negative result posted), leading to repeated rounds at lower wadium

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** Standard Polish BIP HTML adapter (similar to other Pomorskie municipalities already spiked)
- **Scrape targets:** (a) index page `menu/38.dhtml` or article list filtered by category; (b) individual `/artykul/` pages for announcement + result details
- **Parsing:** Straightforward HTML; flat details (address, area, cena wywoławcza, wadium, date) appear in article body text
- **Result stream:** Separate result articles on same BIP — need to match announcement↔result by lokal address/slug
- **Blockers:** None identified. No auth, no CAPTCHA, no PDF-only content, no SPA
- **Effort:** LOW — standard BIP scraper, two-page-type parser (announcement + result), HTML only
- **VERDICT: BUILD**
