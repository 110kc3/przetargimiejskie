# Spike — Bartoszyce (Warmińsko-Mazurskie · powiat bartoszycki)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Burmistrz Bartoszyce sells municipal **flats (lokale mieszkalne)** via **ustny przetarg nieograniczony** — confirmed at least 2 flat auctions in 2024–2026. Published on the city BIP (`bip.bartoszyce.pl/160/`) and main city site (`bartoszyce.pl`). Housing manager "Lokum" Sp. z o.o. manages buildings but does NOT publish sale auctions. Format is HTML listing + PDF attachments (scanned PDFs confirmed — OCR needed). Achieved-price stream not yet confirmed on BIP. Volume is low (~1–2 flats/year).

## 1. Sells municipal property at auction?

**YES — lokale mieszkalne at ustny przetarg nieograniczony confirmed.**

- **2026-03-10**: I przetarg ustny nieograniczony — lokal mieszkalny, ul. Generała Bema 57/2, Bartoszyce. Published on `test.bartoszyce.pl` (staging/mirror of main city site) and `bip.bartoszyce.pl`.
- **2024-07-04**: II przetarg ustny nieograniczony — lokal mieszkalny Nr 3, ul. Warszawska 14 (42,06 m², 2 pokoje), cena wywoławcza 120 000 zł. I przetarg failed on 2024-04-23. (Source: adradar.pl, full text of announcement recovered.)
- City also auctions land/plots (ul. Rotmistrza Witolda Pileckiego, 2026) — these are separate from flat auctions.
- Rural gmina Bartoszyce (separate BIP: `bip.gmina-bartoszyce.pl`) had one flat sale in Maszewach (2016, archived 2026-03-16) — not active.
- Starostwo Powiatowe (`bipspbartoszyce.warmia.mazury.pl`) auctions Skarb Państwa land — not municipal flats.

## 2. Where published? (hosts + boards, URLs)

| Channel | URL | Notes |
|---|---|---|
| City BIP auctions list | `https://bip.bartoszyce.pl/160/Ogloszenia_o_przetargach/` | Primary publication; HTML listing |
| City BIP disposal index | `https://bip.bartoszyce.pl/158/Zbycie_w_trybie_przetargu/` | Secondary index |
| Main city site news | `https://bartoszyce.pl/aktualnosci/` | Parallel publication of each przetarg |
| Physical board | Tablica ogłoszeń Urzędu Miasta Bartoszyce | Statutory requirement, not scraped |
| Housing manager BIP | `https://www.bip.lokum-bartoszyce.pl/8,przetargi` | "Lokum" Sp. z o.o. — najem/rental only, NOT flat sales |

Contact for auction details: Wydział Gospodarowania Mieniem i Planowania Przestrzennego, ul. Boh. Monte Cassino 1, pok. 32, tel. 089 762 98 53.

## 3. Format + rendering

- **BIP listing page**: HTML text, standard eSolution/BIP system. Navigation works; listing enumerates auctions with titles + dates.
- **Announcement body**: Short HTML summary on BIP/city site, with full details in attached PDFs.
- **PDFs**: Mix of formats — the 2023 PDF (`9674_2023_07_12_Ogloszenie_o_przetargu.pdf`) returned no text on get_page_text → **scanned/image PDF → OCR required**. The 2024 announcement text was fully recoverable via adradar.pl which had scraped the PDF text.
- **No SPA, no auth, no bot blocks** observed. Standard Polish BIP (eSolution).
- Achieved-price notices (wynik przetargu / informacja o wyniku): not observed on BIP pages checked — may be absent or in a separate section not yet found.

## 4. Volume + achieved-price stream

- **Volume**: Low — ~1–2 flat auctions per year. I przetarg often fails (as in 2024), leading to II przetarg at lower price. Suggests thin market.
- **Achieved price**: Not confirmed on BIP. No "wynik przetargu" page found in the auction section. May need to check full BIP archive or contact the city. This is a gap — the achieved-price stream may require a separate scrape target or may be absent entirely.
- **Archive**: BIP has an archive section (`bip.bartoszyce.pl/160/Ogloszenia_o_przetargach/` → "Przejdź do archiwum") — not yet fully enumerated but likely holds 5–10 years of entries.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog**: Standard Polish city BIP with PDF attachments — similar pattern to Elbląg or Olsztyn spike patterns.

**Effort: Medium**
- BIP listing scrape: straightforward HTML, no auth/SPA.
- PDF extraction: OCR pipeline required for scanned PDFs (at least some announcements are image-only scans). Text PDFs may also exist — needs per-file detection.
- Achieved-price stream: unconfirmed — either absent or in a section not yet located. Blocker for full price tracking.
- Volume is low (1–2/year) so polling frequency can be low (weekly).

**Blockers**:
1. PDF format varies — scanned vs. text PDFs; OCR needed.
2. Achieved-price publication point unknown — needs further investigation or omission from v1.
3. Low volume may not justify dedicated adapter vs. grouping with other Warmia-Mazury cities.

**VERDICT: BUILD** — city does sell flats at open auction, published on standard BIP. Medium effort due to PDF/OCR requirement and missing achieved-price stream.
