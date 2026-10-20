# Spike — Jarocin (Wielkopolskie · powiat jarociński)
> **Status:** spike DESK — 2026-06-30. VERDICT: BUILD (Low effort). **Built + registered 2026-07-11** (10/10 parse test; TERYT ULDK-confirmed 300602). Analog **brzeg** (no WOKISS adapter existed); source is WOKISS `bip2.wokiss.pl` server-HTML year-index + born-digital text PDFs (handles ordinal-word rounds pierwszy/drugi/trzeci + word-month dates). Board is **land-dominated** — flats rare (the one 2025 flat, Konstytucji 3 Maja 20/17, was odwołany).

## TL;DR
Gmina Jarocin (Urząd Miejski) actively sells municipal flats at *ustny przetarg nieograniczony na sprzedaż*. BIP is on the wokiss.pl platform (same as Kalisz, Ostrów Wlkp., Konin etc.) — HTML, year-indexed sub-pages, no auth. Volume is low (1–3 flats/year, often same unit recycled through 1st→2nd→3rd przetarg rounds). Achieved-price stream exists as HTML "Informacja o wyniku" entries on the same BIP pages. Adapter effort is minimal: direct wokiss-family scraper re-use.

## 1. Sells municipal property at auction?

YES — confirmed. Gmina Jarocin (Burmistrz Jarocina) conducts *pierwsze/drugie/trzecie przetargi ustne nieograniczone* for the sale of *lokale mieszkalne*. Known examples:

- Os. Konstytucji 3 Maja 20/17 (68.30 m², 3 rooms + kitchen): cena wywoławcza 320 800 PLN; 3rd przetarg scheduled 2025-05-08 was **cancelled** due to change in investment plans — this confirms the full auction lifecycle (ogłoszenie → wynik/odwołanie) is published on BIP.
- Multiple earlier flats on the same estate published 2020–2024 on BIP year pages.
- jarocin.pl portal also republishes announcements (`/e-targ/118-przetarg-ustny-nieograniczony`), confirming the gmina treats this as a regular, named category.

Starostwo Powiatowe w Jarocinie runs separate auctions (powiat-level, different domain `bip.powiat-jarocinski.pl`) — out of scope for the gmina adapter.

## 2. Where published? (hosts + boards, URLs)

**Primary BIP host:** `bip2.wokiss.pl/jarocin/` (canonical; also mirrored at `www.wokiss.pl/jarocin/`)

| Board | URL pattern |
|---|---|
| Announcements index | `https://bip2.wokiss.pl/jarocin/bip/przetargi-na-sprzedaz-nieruchomosci.html` |
| Year sub-pages | `https://www.wokiss.pl/jarocin/bip/Przetargi-na-sprzedaz-nieruchomosci/przetargi-w-roku-{YYYY}.html?pid=NNNNN` |
| 2025 page | `https://www.wokiss.pl/jarocin/bip/Przetargi-na-sprzedaz-nieruchomosci/przetargi-w-roku-2025.html?pid=21124` |
| Wyniki przetargów | Embedded as "Informacja o wyniku przetargu" entries on the same year pages |

Secondary / cross-check: jarocinska.pl (local news, mirrors announcements with human-readable summaries); otoprzetargi.pl (aggregator, picks up gmina notices). Skaner.com hits for Os. Konstytucji 3 Maja addresses are *komornik* (bailiff) auctions — distinct, not gmina.

## 3. Format + rendering

- **HTML** — standard wokiss.pl CMS: list page with linked entries per przetarg; each entry is a child HTML page or an attached PDF document.
- Some detailed ogłoszenia may be PDFs attached to the BIP entry (text-based PDF, not scanned) — same pattern seen in other wokiss municipalities.
- No SPA, no auth, no bot blocks observed (wokiss.pl is a static CMS with predictable URL structure).
- "Informacja o wyniku" / cancellation notices appear as HTML text or attached PDF on the same year sub-page.

## 4. Volume + achieved-price stream

- **Volume:** Low — approximately 1–4 flat listings/year for gmina Jarocin. Many are the same unit re-listed as 2nd/3rd przetarg after the 1st fails (reduced price each round). The estate Os. Konstytucji 3 Maja appears repeatedly across years.
- **Achieved-price stream:** YES — "Informacja o wyniku przetargu" entries are published on the BIP year pages, giving either the achieved price or a declaration that no valid bidder appeared / the auction was cancelled. This provides the price-stream data the aggregator needs.
- Note: the May 2025 cancellation of the 3rd przetarg for 20/17 (due to "change in investment plans") suggests the gmina's flat portfolio is thinning; volume may dip in 2026.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Kalisz or Ostrów Wielkopolski (both wokiss.pl BIP, identical year-sub-page structure, HTML output, same field layout). Re-use or lightly fork that adapter.

**Effort:** Low.
- Scrape index page → follow year links → parse HTML entries for lokal mieszkalny announcements and wynik entries.
- Handle attached PDFs (text-PDF extraction, no OCR needed).
- No login, no CAPTCHA, no JS-rendered content.

**Blockers:** None identified.
- Low volume means infrequent runs are sufficient (weekly or bi-weekly polling adequate).
- The gmina BIP appears stable and has been on wokiss.pl for 10+ years.
- Risk: if the gmina exhausts its remaining flat stock and stops selling entirely, the adapter would idle — but the infrastructure cost is negligible.


## Partial source/asset audit — 2026-10-20 (Codex)

The hosted city worker in [refresh 39323322737](https://github.com/110kc3/przetargimiejskie/actions/runs/39323322737)
rejected a new property with a table header in its street name. Its
[original Stawna PDF](https://bip2.wokiss.pl/jarocin/zasoby/files/przetargi-sprzedaz/og%C5%82oszenie-1-przetarg-witaszyce-ul.-stawna.pdf)
is a sale of undeveloped land in Witaszyce, beside existing housing. The body
classifier had treated those neighbouring houses as the offered asset, and
address extraction crossed into the following parcel table.

The actual PDF page and its explicit deposit groups confirm two separate lots:
236/2 + 237/3 + 237/4 (**2,671 m² / 372,740 zł**) and
238/2 + 239/1 + 239/2 (**1,051 m² / 146,765 zł**), both first oral unrestricted
auctions on **2 December 2026, 13:00**. The reader keeps each grouped lot's total
price once and verifies parcel membership/areas against the matching 20% deposit.
Duplicate, missing or contradictory groups are withheld. Street extraction no
longer spans table lines; neighbouring-building context no longer changes the
land classification. Exact pdftotext fixture and parser/builder regressions pass.

This is a partial audit: four recent years / 120 extracted-document limits,
missing or scanned PDFs and unparsed result bodies remain coverage gaps.
Result refs now expose incomplete discovery instead of implying full coverage.
Historical first-parcel-only handling outside this verified table family and
other asset classes remain to be reviewed. No review deadline or runtime status
was promoted, and locally crawled data is not production publication.


Final isolated refresh: **3 properties / 24 plots** (21 plots before), prior
property/plot identities and listing dates retained. Strict integrity passes;
property/land source checks are healthy while results remain explicitly
incomplete. No isolated crawl output is published locally.
