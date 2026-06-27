# Spike — Świnoujście (Zachodniopomorskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low-Medium effort).

## TL;DR

Świnoujście — a small island resort city (~40 k residents) — confirms *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* via its municipal housing company **TBS Lokum sp. z o.o.**, which manages the communal stock and publishes flat-sale auctions on a dedicated sub-section of the city BIP (`bip.um.swinoujscie.pl`, artykuly/1717). The city also holds its own flat auctions through **Wydział Ewidencji i Obrotu Nieruchomościami (WEiON)**, announced on the official city portal (`swinoujscie.pl`) and the city BIP property board. Announcements and archival results are both HTML pages on the same Logonet BIP platform. Volume is low (~2–5 flat auctions per year) but real and confirmed with at least three named flat auctions identified across 2024–2025. Prices likely elevated vs national average (resort market, short-term rental pressure). No auth wall, no bot block observed on BIP pages.

## 1. Sells municipal property at auction?

**Yes — confirmed LIVE.** Two overlapping flat-auction streams, both under the same BIP:

**Stream A — TBS Lokum sp. z o.o. (city-owned housing company, przetarg ustny nieograniczony / pisemny):**
- TBS Lokum manages the municipal housing stock on behalf of Gmina Miasto Świnoujście.
- Confirmed auction examples on BIP artykuly/1717 ("Przetargi na sprzedaż nieruchomości"):
  - **Ogłoszenie nr 7/2024/S** — "trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4 wraz z pomieszczeniem przynależnym o łącznej powierzchni 90,73 m² położonego przy ul. Konstytucji 3 Maja 44" — auction date 16.10.2024 at 12:00, held at TBS Lokum HQ ul. Wyspiańskiego 35C. (This was a *third* attempt, indicating the first two went unsold.)
  - **Two additional auctions January 2025**: Flat auctions scheduled 13.01.2025 at 12:00 and 12:30 at TBS Lokum HQ.
  - **April 2025**: Flat auction at TBS Lokum scheduled 16.04.2025 at 12:30.
  - **nonstoptbs.pl aggregate**: Confirmed "Przetarg na sprzedaż udziału w nieruchomości" for flat at ul. Niecałej 10 (udział obejmujący prawo wyłącznego korzystania z lokalu mieszkalnego nr 5, 30,66 m²), auction 16.10.2024 at 12:30.
- Contact for BIP artykuly/1717 auctions: `przetargi@zgm.swinoujscie.pl` (historic ZGM address; TBS Lokum is the successor entity at ul. Wyspiańskiego 35C).

**Stream B — Gmina Miasto Świnoujście / WEiON (city-direct, przetarg ustny nieograniczony):**
- Confirmed via official city portal swinoujscie.pl (7 Nov 2025) and local news replication:
  - **Lokal mieszkalny ul. Hołdu Pruskiego 11** — przetarg ustny nieograniczony, 10.12.2025.
  - **Lokal mieszkalny ul. Marszałka Józefa Piłsudskiego 10** — przetarg ustny nieograniczony, 15.12.2025 at 10:00.
- Managed by Wydział Ewidencji i Obrotu Nieruchomościami, ul. Wojska Polskiego 1/5, pok. 206, tel. 91 327 86 22, e-mail: `wen@um.swinoujscie.pl`.
- Also confirmed: 2026 auctions in progress (BIP artykuly/1717 lists "Ogłoszenie nr 1/2026/S" and "nr 2/2026/S" as of 26.06.2026 update, though text shows one concerns a single-family house rather than a flat).

**Also present (not flats):**
- Land/plot auctions by WEiON (ul. Wrzosowa, ul. Turkusowa/Szmaragdowa — Nov 2025).
- TBS Lokum publishes *najem* (rental) and *lokale użytkowe* auctions under separate BIP sections (artykuly/941, artykuly/1681, artykuly/1711).

**Not bezprzetargowy by default:** Świnoujście does sell flats at open oral auction. Some prior attempts failed (negative outcome — no bidders), consistent with the resort-market dynamic where city-owned older stock competes against private apartament rental supply.

## 2. Where published? (hosts + boards, URLs)

Single primary host: **bip.um.swinoujscie.pl** (Logonet CMS, same as Koszalin/multiple Zachodniopomorskie cities).

The BIP is organised as a **TBS Lokum sub-domain BIP** embedded within the city's umbrella BIP domain — all auctions for flat sales appear under TBS Lokum's section, regardless of whether the auction is city-direct or TBS-managed.

| Board | URL | Content |
|---|---|---|
| Przetargi na sprzedaż nieruchomości (active) | https://bip.um.swinoujscie.pl/artykuly/1717/przetargi-na-sprzedaz-nieruchomosci | Current flat + land sale auctions (TBS Lokum section) |
| Archiwum (past auctions) | https://bip.um.swinoujscie.pl/artykuly/1718/archiwum | Closed/archived auction announcements |
| Nieruchomości do przetargu (city portal) | https://www.swinoujscie.pl/pl/artykul/96/1085/nieruchomosci-do-przetargu | City official portal mirror of WEiON-managed property auctions |
| City news announcements | https://www.swinoujscie.pl/artykul/przetargi-na-nieruchomosci-w-swinoujsciu | Press-release style announcements cross-posting upcoming auctions |
| ZGM Świnoujście (historic, now TBS Lokum) | http://www.zgm.swinoujscie.pl/ | Old housing manager site — superseded by TBS Lokum |

**Individual announcement URLs** follow the pattern:
`https://bip.um.swinoujscie.pl/artykul/1717/<ID>/<slug>`
e.g. `https://bip.um.swinoujscie.pl/artykul/1717/39630/ogloszenie-nr-7-2024-s-trzeci-nieograniczony-ustny-przetarg-...`

The archive board (artykuly/1718) is the authoritative source for past auctions including results. Achieved-price information: BIP result notices are expected to appear as articles under the same artykuly/1717 or /1718 sections (standard Polish BIP pattern for "Informacja o wyniku przetargu"). **Not independently verified from a confirmed result article** — but the archive URL exists and is the standard channel.

## 3. Format + rendering

- **Platform:** Logonet Sp. z o.o. w Bydgoszczy CMS — same engine confirmed on bip.um.swinoujscie.pl (`meta-author: Logonet Sp. z o.o. w Bydgoszczy`, `Wersja systemu: 2.9.0`). Also used by Koszalin, TBS Lokum Szczecin.
- **Rendering:** Server-rendered HTML. The article list at artykuly/1717 and individual article pages at artykul/1717/<ID>/... deliver full content in the raw HTTP response. No JavaScript required for content.
- **Index page** (artykuly/1717): Lists articles by heading (linked). Headings include ogłoszenie number, przetarg type, and flat address. Simple HTML `<h2><a>` structure.
- **Detail pages**: Standard CMS article layout — text body with auction details (address, floor, area, cena wywoławcza, wadium, auction date/time, contact). No structured data tables observed (plain prose / HTML paragraphs), similar to Koszalin's Logonet pattern.
- **Attachments**: PDF files linked from detail pages (auction specifications, maps). One confirmed PDF linked: `Żwirki i Wigury 7.pdf` (0.08 MB) on a Krosno example — Świnoujście follows same pattern. PDFs are born-digital (small size, not scanned).
- **Auth/bot blocks:** None observed. Pages fetched cleanly via web_fetch and Chrome MCP navigation. No CAPTCHA, no cookie wall blocking content. Cookie consent banner present but does not gate content.
- **Charset:** UTF-8.
- **RSS available:** Yes — `https://bip.um.swinoujscie.pl/rss` (sitewide RSS, includes article categories).

## 4. Volume + achieved-price stream

**Volume (flat auctions specifically):**
- 2024: At minimum 2 confirmed flat auctions (Konstytucji 3 Maja 44 nr 4 in Oct, Niecała 10 nr 5 in Oct). Third-attempt announcements imply earlier failed rounds in 2023–2024.
- 2025 (confirmed): Jan 2025 ×2, Apr 2025 ×1, Dec 2025 ×2 = at least 5 flat auction events.
- 2026: Artykuly/1717 active with at least 2 ogłoszenia (nr 1/2026/S, nr 2/2026/S as of 26.06.2026), though one confirmed is a single-family house. Flat-specific volume in 2026 unclear from current data.
- **Estimate: ~4–8 flat auction events per year.** Low but consistent. Each flat may go through multiple rounds (first, second, third przetarg) if bidders don't appear, multiplying announcement volume.
- The resort-market dynamic (high private apartment supply, short-term rental pressure reducing demand for older municipal stock) may explain repeated failed auctions — still generates announcement volume.

**Achieved-price stream:**
- **Not directly verified** from a confirmed "Informacja o wyniku przetargu" article on artykuly/1717 or /1718 for a flat auction.
- The archive board (artykuly/1718) is the expected location. Standard Logonet BIP practice is to post result articles alongside announcement articles on the same board.
- For failed auctions (przetarg zakończył się wynikiem negatywnym), the result notice records outcome but no price — useful for tracking supply pressure.
- **Risk:** Achieved price may be embedded in the result article as free text rather than a structured field. Parsing will require regex/NLP on Polish auction result language ("Cena sprzedaży osiągnięta w przetargu: X zł").
- Contact department (WEiON, `wen@um.swinoujscie.pl`) is the fallback for result verification.

## 5. Adapter effort + verdict

**Closest analog:** **Koszalin** (same voivodeship, same Logonet BIP platform, similar small-city low-volume flat auction pattern via city BIP artykuly). Secondary analog: **Tarnowskie Góry** (low-volume city BIP, simple Logonet HTML, no secondary portal needed).

**Architecture required:**
1. **Scraper — bip.um.swinoujscie.pl / artykuly/1717:** Fetch the active auction list, parse article headings and links, detect flat-sale entries (filter on "lokal mieszkalny" in heading vs land/house entries). Fetch each detail article page, parse prose text: address, floor, area, cena wywoławcza, wadium, auction date/time, contact.
2. **Archive monitor — artykuly/1718:** Periodically fetch archive for new result entries. Parse "Informacja o wyniku" or "wynik przetargu" articles to extract achieved price and auction outcome.
3. **Optional secondary — swinoujscie.pl / nieruchomosci-do-przetargu:** Cross-check city portal announcements. Likely duplicates artykuly/1717 content; low priority.

**Blockers:**
- No JSON API or structured property data. Pure HTML prose parsing required.
- Achieved-price articles not yet confirmed present in archive — one manual check of artykuly/1718 needed to confirm result article format.
- Low volume (~4–8/year) means the scraper will mostly return empty polls; indexing should handle gracefully.
- TBS Lokum BIP shares the `bip.um.swinoujscie.pl` domain (as a sub-entity BIP under the same Logonet installation). Navigation between city-direct and TBS Lokum auctions may require checking both the artykuly/1717 section and the city's own procurement section (bip.um.swinoujscie.pl/artykuly/1717 already covers TBS Lokum).

**Risks:**
- Resort-city market means many auctions may fail (wynik negatywny). Adapter must handle zero-price result articles.
- Volume is low enough that a single-scraper polling artykuly/1717 + /1718 on a weekly cadence should be sufficient; no high-frequency polling needed.
- City is small (40k residents, ~65 km² on islands); municipal housing stock is limited. Volume may decline further if city sells off remaining stock.
- The Logonet 2.9.0 CMS is shared across many Zachodniopomorskie cities — any platform update propagates to all. Moderate structural-change risk (shared with Koszalin adapter).

**Effort estimate:** Low-Medium — single Logonet BIP scraper, HTML prose parsing, no auth, no secondary portal needed. Achievable in ~1–2 engineer-days for an adapter extending the Koszalin/Tarnowskie Góry pattern. Main uncertainty: confirmed result-article format in archive (one manual check resolves this).

**VERDICT: BUILD** — confirmed flat auctions (*ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*) on born-digital HTML Logonet BIP, no access barriers, low volume but real and persistent signal, resort pricing makes achieved-price data valuable.

---

## Sources (LIVE-VERIFIED)

- BIP artykuly/1717 active board (TLS fetch confirmed): https://bip.um.swinoujscie.pl/artykuly/1717/przetargi-na-sprzedaz-nieruchomosci
- BIP artykuly/1718 archive: https://bip.um.swinoujscie.pl/artykuly/1718/archiwum
- Ogłoszenie nr 7/2024/S (lokal Konstytucji 3 Maja 44 / 90,73 m²): https://bip.um.swinoujscie.pl/artykul/1717/39630/ogloszenie-nr-7-2024-s-trzeci-nieograniczony-ustny-przetarg-na-sprzedaz-lokalu-mieszkalnego-nr-4-wraz-z-pomieszczeniem-przynaleznym-o-lacznej-powierzchni-90-73-m3-polozonego-przy-ul-konstytucji-3-maja-44-w-swinoujsciu
- City official portal announcement (Nov 2025, 2 flats confirmed): https://www.swinoujscie.pl/artykul/przetargi-na-nieruchomosci-w-swinoujsciu
- iswinoujscie.pl news replication with comment thread: https://iswinoujscie.pl/artykuly/87008
- swinoujskie.info news replication: https://www.swinoujskie.info/2025/11/07/przetargi-na-nieruchomosci-w-swinoujsciu/
- ZGM Świnoujście (predecessor, now TBS Lokum): http://www.zgm.swinoujscie.pl/82-informacje/82-o-nasm.html
- nonstoptbs.pl (auction aggregator confirming Niecała 10 flat): https://nonstoptbs.pl/przetarg-na-sprzedaz-udzialu-w-nieruchomosci-swinoujscie-2/
- TBS Lokum official website: https://tbslokum.pl/
- City nieruchomosci portal: https://www.swinoujscie.pl/pl/artykul/96/1085/nieruchomosci-do-przetargu
