# Spike — Goleniów (Zachodniopomorskie · powiat goleniowski)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Goleniów (Urząd Gminy i Miasta) actively sells municipal flats at *ustny przetarg nieograniczony na sprzedaż* — confirmed across multiple auction rounds in 2024, 2025 and 2026. Announcements published on BIP at **bip.goleniow.pl** (current) and a legacy alfatv mirror. The BIP site is a JS-rendered SPA (web_fetch returns empty; direct HTML not accessible without a browser). Volume is Low–Medium (~2–4 lokale mieszkalne per round, several rounds per year). Achieved-price stream: result posts appear on the same BIP under the same "Przetargi — miasto i gmina" section but live-verification of the exact result-post URL is still needed (alfatv mirror also carries them). Closest analog: other Zachodniopomorskie small-city gmina BIPs on alfatv/dedicated CMS stacks.

## 1. Sells municipal property at auction?

YES — confirmed. The Burmistrz Gminy Goleniów runs *ustny przetarg nieograniczony na zbycie nieruchomości* rounds that explicitly include **lokale mieszkalne** (residential flats). Specific confirmed examples from search results:

- lokal mieszkalny nr 4, ul. Cicha 9, Goleniów — 28.54 m² (auction 10.10.2024)
- lokal mieszkalny nr 3, ul. Marii Konopnickiej 11 — 20.94 m² + komórka (auction 10.10.2024)
- lokal mieszkalny, Komarowo gm. Goleniów — 56 m², 3 pokoje, cena wywoławcza 81 000 zł (auction 28.05.2026, "Urząd Gminy i Miasta w Goleniowie" as organiser — confirmed on adradar.pl)
- lokal mieszkalny nr 7/66, Mosty gm. Goleniów — 28 m² (mentioned in search snippets)

Auction rounds identified: July 2024, August 2024, October 2024, December 2024, January 2025, July 2025, February 2026, March 2026, May 2026 — i.e. roughly bi-monthly cadence. Both *nieograniczony* and *ograniczony* variants used.

The gmina does NOT appear to be exclusively bezprzetargowy (tenant first-purchase). Flats go to open auction.

## 2. Where published? (hosts + boards, URLs)

**Announcement board:**
- Primary BIP: `https://bip.goleniow.pl/artykul/przetargi-miasto-i-gmina` — section listing all current and past rounds
- Legacy/mirror BIP (alfatv): `https://goleniow-bip.alfatv.pl/` and `https://goleniow-bip3.alfatv.pl/` — older announcements still indexed there (same CMS, different subdomain vintage)
- Municipality main site cross-link: `http://www.goleniow.pl/sprzedaz-nieruchomosci-gminnych`

**Result/achieved-price board:**
- Results published on the same BIP section (`bip.goleniow.pl`) as follow-up articles titled "informacja o wynikach przetargu" — URL pattern matches other articles on the site (e.g., `bip.goleniow.pl/artykul/informacja-365` was indexed by Google as a results notice)
- DESK only — live URL of a result article with price not directly fetched; needs live verification to confirm exact field/format of achieved price in the HTML

**Aggregator cross-check:** adradar.pl confirms Urząd Gminy i Miasta w Goleniowie as organiser of flat auctions (type "miasto"), sourced from BIP.

## 3. Format + rendering

- **SPA / JS-rendered** — `bip.goleniow.pl` is built on a custom CMS (alfatv platform); `web_fetch` returns empty body on all attempted URLs. Direct HTML scraping will fail.
- Requires **Chrome MCP / headless browser** (Puppeteer/Playwright) to render content before parsing.
- Once rendered, content appears to be **HTML text** (not PDF) — announcement titles and body text visible in Google snippets as plain prose with property details (address, area m², cena wywoławcza, wadium, auction date/time/place).
- No bot/auth wall observed — no login required, no CAPTCHA flagged in any search result; adradar aggregates it freely.
- No PDF detected for announcements (unlike some gminas that post scanned PDFs). Result posts likely same HTML format.
- Article URL pattern: `bip.goleniow.pl/artykul/<slug>` — slugs are human-readable Polish strings, not numeric IDs, which complicates list pagination but the index page (`przetargi-miasto-i-gmina`) should list links.

## 4. Volume + achieved-price stream

**Announcement volume:** ~6–10 auction rounds/year, each containing 1–4 lokale mieszkalne. Estimated 10–20 flat lots/year entering auction. Low–Medium volume for a powiat-seat town (~35 k residents).

**Achieved-price stream:**
- Result posts ("informacja o wynikach przetargu") do exist on bip.goleniow.pl (confirmed by Google index of `informacja-365` article and search snippet references).
- Format of price disclosure: standard PL municipal practice — achieved price (cena osiągnięta) stated in body text of the result article, typically within a few business days after the auction.
- DESK confidence — exact field names and HTML structure of the result post need live scraping to confirm for the adapter.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Other alfatv-CMS BIP gminas (same platform seen in e.g. Stargard, Gryfino region). The CMS renders via client-side JS; the article index page loads a list of article cards.

**Effort: Medium**

Blockers / work items:
1. **Headless rendering required** — no static HTML; must use Playwright/Puppeteer to GET `bip.goleniow.pl/artykul/przetargi-miasto-i-gmina`, wait for article list to render, then extract links. One-time architecture decision shared with other alfatv sites.
2. **Result-post URL live-verification** — need to confirm that result articles are listed on the same index page (vs. a separate section), and identify the exact HTML field containing *cena osiągnięta*.
3. **Slug-based URLs** — article slugs are long Polish strings; need to discover pagination or "load more" mechanism on the index page.
4. **Dual BIP hostnames** — older articles may still only exist on `goleniow-bip.alfatv.pl`; may need to scrape both or rely on redirect.
5. No PDF/OCR work expected.
6. No auth/bot wall expected.

**Verdict: BUILD** — flat auctions confirmed, open (nieograniczony) format, regular cadence, HTML (rendered) format, achieved-price posts present. Medium effort due to SPA rendering requirement and result-URL live-verify gap.
