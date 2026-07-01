# Spike — Drawsko Pomorskie (Zachodniopomorskie · powiat drawski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Drawsko Pomorskie runs regular *ustny przetarg nieograniczony na sprzedaż* for **lokale mieszkalne** — confirmed by multiple announcements on drawsko.pl (e.g. ul. Ratuszowa 7/2, ul. Sikorskiego 4/4, ul. 11 Pułku Piechoty 59/1, ul. J. Sobieskiego 7/9, Przytoń 19/2). Announcements and result notices (with achieved price) are both published as plain HTML articles in the `/aktualnosci-2/33-nieruchomosci/` section of drawsko.pl. Full article body is also embedded in JSON-LD `articleBody`. No auth, no bot-block, no SPA. Closest analog: standard municipal news-article scraper (similar to e.g. Świdnica, Żary). Volume: ~12 items/page × 33 pages = approx. 390+ nieruchomości articles total (mix of announcements, wykazs, wyniki, dzierżawa); flat-auction entries estimated ~10–20 over 3–4 years.

## 1. Sells municipal property at auction?

YES — confirmed LIVE.

- Legal basis: art. 38 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami + §13 rozporządzenia RM z 2004 r.
- Auction form: **I/II/III przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej — lokal mieszkalny**
- Examples found (all on drawsko.pl):
  - `ul. Sikorskiego 4/4` — 44.40 m², cena wywoławcza 79,000 zł, wadium 15,800 zł, II przetarg 23-01-2025
  - `ul. Ratuszowa 7/2` — I przetarg 10-07-2025, wadium 15,000 zł
  - `ul. 11 Pułku Piechoty 59/1` — 45.40 m², cena wywoławcza 57,821 zł, III przetarg 23-11-2023
  - `ul. J. Sobieskiego 7/9` — I przetarg (year unknown from slug)
  - `Przytoń 19/2` (gmina wiejska) — I przetarg
  - `Pl. Orzeszkowej 4, lok. 6 i 7` — wykaz + auction
- Also confirmed: bezprzetargowo sales to tenants are separate (wykazy) — the gmina uses **both** paths; the przetarg stream is real and active.

## 2. Where published? (hosts + boards, URLs)

**Primary announcement board:** `https://drawsko.pl/aktualnosci-2/33-nieruchomosci/`
- Custom CMS by TI sp. z o.o. / 2ClickPortal
- Paginated listing: 33 pages at `/strona-N/` suffix, ~12 items/page
- Each item: relative URL `/aktualnosci-2/33-nieruchomosci/<slug>.html`
- Full content server-rendered HTML; also embedded in JSON-LD `NewsArticle.articleBody`

**Result notices (wyniki, with achieved price):** also published in the same section on drawsko.pl
- URL pattern: `/aktualnosci-2/33-nieruchomosci/informacja-o-wyniku-przetargu-na-sprzedaz-*.html`
- Structure confirmed (LIVE from 2026-06-30 notice for działka 62/9): includes "Najwyższa cena osiągnięta w przetargu: 97,970.00 zł brutto", buyer name, number of participants admitted
- Flat-specific result slugs follow the same pattern (e.g. `lokal-mieszkalny` in slug)

**Secondary BIP:** `https://umdrawsko.bip.gov.pl/`
- Sections: `/przetargi-na-nieruchomosci/`, `/sprzedaz-nieruchomosci/`, `/przetargi-2026/`, `/przetargi-2025/` etc.
- Also paginated (`/articles/index/sprzedaz-nieruchomosci/page:N`, 7+ pages)
- BIP also publishes result notices with achieved price (separate from drawsko.pl)
- Older BIP: `https://bip.gminadrawsko.pl/` (gmina wiejska, different entity — contains its own flat listings at Drawski Młyn)

**Announcement also published in:** www.przetargi-gctrader.pl (online journal, PR 17996) — not a primary source.

## 3. Format + rendering

- **drawsko.pl articles:** Server-rendered HTML, no JavaScript required for content. Clean `<article>` body with Polish-text announcement. Full content also in `<script type="application/ld+json">` → `NewsArticle.articleBody` (HTML-entity-encoded). Direct curl with Referer header returns 200 (without Referer, direct article URLs return 403 — listing page is 200 regardless).
- **Listing page:** Standard paginated HTML, article links as relative hrefs, h2/h3 headings contain title text. No infinite scroll, no auth, no bot challenge observed.
- **Announcement body structure:** prose table: Lp / Adres / Oznaczenie geodezyjne / Pow. działki / Nr KW / Opis / Cena wywoławcza. Then prose block: date, place, wadium amount, bank account, participation conditions.
- **Result notice structure:** numbered paragraphs: (1) date + type, (2) property details, (3) admitted count, (4) excluded count, (5) cena wywoławcza, (6) **Najwyższa cena osiągnięta w przetargu**, (7) Nabywcą nieruchomości został: [name].
- **No PDFs**, no scanned docs, no SPA, no OAuth/login.

## 4. Volume + achieved-price stream

- Total nieruchomości articles: ~390 across 33 pages (mix of announcements, wykazs, wyniki, dzierżawa, użyczenie)
- Flat auction announcements: visible on pages 1–2 at rate of ~2–3 per page; rough estimate **15–25 flat-auction events** in the archive (some go to II/III przetarg, indicating unsold re-listings)
- Achieved-price stream: YES — result notices published on same drawsko.pl section per §12 rozporządzenia RM. Structured text with exact PLN figure. Both land and flat wyniki present.
- Cadence: roughly 3–6 flat auctions per year (small gmina, ~17,000 residents)
- BIP has a parallel achieved-price stream under `/sprzedaz-nieruchomosci/` (7+ pages)

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any existing city adapter that scrapes a paginated news-article CMS and parses prose auction notices (e.g. Żary, Świdnica pattern). The JSON-LD `articleBody` field makes extraction very clean — no need to parse HTML DOM of the article body itself.

**Effort breakdown:**
| Step | Notes |
|---|---|
| Listing scraper | Paginate `/aktualnosci-2/33-nieruchomosci/strona-N/`, extract `<h2/h3>` + relative href; filter for `lokal mieszkalny` in title | Low |
| Article fetch | curl with `Referer: https://drawsko.pl/aktualnosci-2/33-nieruchomosci/` header to avoid 403 | Trivial |
| Content parse | Extract `articleBody` from JSON-LD; parse prose table for address, area, KW, cena wywoławcza, date, wadium | Low |
| Result-notice parse | Same section, detect `informacja-o-wyniku` slug; parse paragraphs (5)–(7) for cena wywoławcza, osiągnięta cena, nabywca | Low |
| BIP secondary | Optional parallel source; same structure `/articles/index/sprzedaz-nieruchomosci/page:N` | Optional |

**Blockers:** None. No auth, no JS rendering, no CAPTCHA, no PDF. Single Referer header sidesteps the 403 on direct article URLs.

**VERDICT: BUILD — Low effort.**
