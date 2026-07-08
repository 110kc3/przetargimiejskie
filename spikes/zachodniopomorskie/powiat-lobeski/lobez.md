# Spike — Łobez (Zachodniopomorskie · powiat łobeski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Łobez (miejsko-wiejska, seat of powiat łobeski) **does run open flat auctions.** The Urząd Miejski w Łobzie sells municipal **lokale mieszkalne** via `przetarg ustny nieograniczony na zbycie niewyodrębnionego lokalu mieszkalnego`, with I/II rounds and published `informacja o wyniku przetargu` result notices. Everything is on the city BIP `bip.lobez.pl`, which runs the Polish **2ClickPortal** CMS (server-HTML, `.html` slug articles, year subcategories). The catch: the disposal stream is **heavily land-dominated** and flats are low-volume (~2-4/yr), small "niewyodrębnione" units (13-40 m²); and every price lives inside an **e-signed PDF attachment** (`-sig.pdf`), never in the HTML. Convenient upside: each flat gets one slug page aggregating wykaz + ogłoszenie I + ogłoszenie II + wynik I + wynik II, so announcement↔result matching is trivial. No ZGM/TBS — property handled in-house (Referat Rolnictwa i Gospodarki Nieruchomościami). Closest analog: a WordPress/custom-HTML board with PDF payloads (bip.net text-PDF pattern).

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats at OPEN auction.** The Burmistrz Łobza runs `przetarg ustny nieograniczony` for municipal property disposal. Confirmed live open FLAT auctions (each with full I/II round + results):
- **ul. Niepodległości 26, lokal mieszkalny nr 2** (39,35 m², niewyodrębniony) — Ogłoszenie o I przetargu 31.07.2025 → II przetarg 24.10.2025 → Informacja o wynikach z dnia 18.12.2025.
- **ul. Kraszewskiego 28, lokal mieszkalny nr 5** (13,81 m², niewyodrębniony) — wykaz + ogłoszenie I + ogłoszenie II + Informacja o wyniku przetargu z 23.09.2025 + Informacja o wyniku z 18.12.2025.
- **ul. Przyrzeczna, lokal mieszkalny nr 3** (19,0 m², dz. 106/4 obr. 1) — wykaz 16.01.2026 → przetarg-track 18.02.2026 (2026 cycle).

Caveats: the board is dominated by **land** (`nieruchomość gruntowa zabudowana/niezabudowana`, działki) — ~14 land items in 2025 vs ~2 flats; 2022's only `przetarg ustny nieograniczony` was a **lokal użytkowy** (commercial), not a flat. Some residential/commercial units are also sold **bezprzetargowo na rzecz najemcy** (separate categories). But flat OPEN-auction disposal is real and recurs — this is not a tenant-sale-only / wykaz-only city.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (2ClickPortal CMS): `bip.lobez.pl`**
- Zbycie (disposal hub, year subcats): `https://bip.lobez.pl/342-zbycie.html`
  - 2026: `https://bip.lobez.pl/1508-2026.html`
  - 2025: `https://bip.lobez.pl/1286-2025.html`
  - 2024: `https://bip.lobez.pl/1110-2024.html` (+ 2023/2022/2021 subcats)
- Procedural page: `https://bip.lobez.pl/zbywanie-nieruchomosci-w-drodze-przetargu.html`
- Per-property article pattern (slug): `https://bip.lobez.pl/sprzedaz-niewyodrebnionego-lokalu-mieszkalnego-nr-5-...-kraszewskiego-w-lobzie.html` — the article page carries ALL PDFs (wykaz, ogłoszenie I, ogłoszenie II, wynik I, wynik II).
- Tenant-sale categories (mostly out of scope): `.../sprzedaz-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-na-rzecz-ich-najemcow.html`, `.../237-...lokali-uzytkowych...na-rzecz-ich-najemcow.html`
- Lease auctions (out of scope): `.../oddanie-w-dzierzawe-nieruchomosci-w-formie-przetargu.html`

**NOT here:** `.../przetargi.html` and `zamowienia-publiczne.html` redirect to `lobez.ezamawiajacy.pl` — that is **public procurement (zamówienia)**, not property. Ignore.
**Legacy host:** old BIP at `bip.lobez.mserwer.pl` (still indexed; superseded by `bip.lobez.pl`).
Contact: Referat Rolnictwa i Gospodarki Nieruchomościami, Agnieszka Drogosz, pok. 11, tel. 91 397-61-73, ul. Niepodległości 13.

## 3. Format + rendering
- **Server-rendered HTML** — 2ClickPortal (footer "2ClickPortal® – Portale nowej generacji", 2clickportal.pl). Year subcategory pages are dated `.html` article lists; each property is a `.html` slug article. No SPA, no auth gate, no CAPTCHA on the article/list HTML.
- **Payload is PDF, not inline HTML.** The article HTML gives titles + a file list; the actual ogłoszenie/wykaz/wynik (and every price) is in **e-signed PDF attachments** named descriptively (`ogłoszenie I lokal mieszkalny nr 5 ul. Kraszewskiego-sig.pdf`, `INFORMACJA o wyniku przetargu z dnia 18 grudnia 2025 r-sig.pdf`, 320-430 kB each).
- **PDF type:** born-digital text PDFs, e-signed (`-sig.pdf` = podpis elektroniczny) by the office in 2025/26 — text layer expected intact; **pdfText should parse, OCR unlikely.** Confirm text-layer on first build fetch.

## 4. Volume + achieved-price stream
- **Volume:** LOW for flats. ~2-4 open flat auctions/year; the wider disposal board is land-heavy (14+ land wykazy/sales in 2025). Flats are small niewyodrębnione units (13-40 m²). Repeat rounds (I→II) common when unsold.
- **Achieved-price stream:** YES. Every flat auction publishes `Informacja o wyniku przetargu` on the same article page (cena osiągnięta / nabywca, or wynik negatywny). `cena wywoławcza` lives in the ogłoszenie PDF; hammer price in the wynik PDF. Both are PDF-locked — parse via pdfText, not HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** WordPress/custom-HTML board **with PDF payloads** → **bip.net text-PDF pattern** (server-HTML list + text-PDF docs). Structurally: crawl year subcats like a WP category (brzeg/nowa-sol family), but extract prices from PDFs like a text-PDF adapter.
- **CMS family:** 2ClickPortal (server-HTML, `.html` slugs, numeric-prefixed year subcats).
- **Effort: MEDIUM.** Steps: (1) crawl `342-zbycie.html` → year subcats (`1508-2026`, `1286-2025`, …); (2) filter titles to `lokal mieszkalny` (drop działki/grunt land, drop `lokal użytkowy`, drop `na rzecz najemcy`/dzierżawa/zamiana/darowizna); (3) per flat article, list attachments, fetch `ogłoszenie`/`wykaz` PDF → pdfText for adres, powierzchnia użytkowa, cena wywoławcza, wadium, data, runda; (4) fetch `Informacja o wyniku` PDF → cena osiągnięta / negatywny. Announcement↔result already co-located on one page — no cross-board join. Not Low because nothing is in HTML text (mandatory PDF extraction + land-heavy classification).
- **Blockers:** None hard. No auth/rate-limit/CAPTCHA. Watch-items: low flat volume (expect a thin stream); e-signature wrapper on PDFs (verify text layer, else OCR fallback); title-based classification must reliably separate the ~2 flats/yr from the land majority.

**VERDICT: BUILD (Medium effort)** — Łobez genuinely runs recurring OPEN flat auctions (`przetarg ustny nieograniczony na zbycie niewyodrębnionego lokalu mieszkalnego`) with I/II rounds and published result notices on a clean 2ClickPortal server-HTML BIP; the only friction is PDF-locked prices and low flat volume in a land-dominated stream.
