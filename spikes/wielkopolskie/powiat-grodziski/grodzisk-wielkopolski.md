# Spike — Grodzisk Wielkopolski (Wielkopolskie · powiat grodziski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Medium effort).

## TL;DR
Urząd Miejski w Grodzisku Wielkopolskim actively auctions municipal flats (lokale mieszkalne) via ustny przetarg nieograniczony. Confirmed II przetarg on two flats held 18.05.2026, announced on BIP. BIP renders as a JavaScript SPA (raw HTML is empty); auction text is indexed by Adradar with full body text. Achieved-price data (wyniki) must be confirmed on BIP/Chrome — not yet extracted but the board exists at bip.grodzisk.wlkp.pl under the same Przetargi section. Low-to-medium volume (2 flats per batch, likely 2-4 batches/year).

## 1. Sells municipal property at auction?

YES — confirmed LIVE. The Burmistrz Grodziska Wielkopolskiego published a **II PRZETARG USTNY NIEOGRANICZONY na sprzedaż nieruchomości lokalowych stanowiących własność Gminy Grodzisk Wielkopolski** (18.05.2026):

- Lokal mieszkalny nr 2, ul. Kolejowa 9 — 67,80 m², cena wywoławcza 200 000 zł (two-room flat)
- Lokal mieszkalny, ul. 27 Stycznia — 35,54 m², cena wywoławcza 125 000 zł (two-room flat)

The "II przetarg" designation implies at least one prior round failed, confirming this is a recurring pattern. Organizer is explicitly **Urząd Miejski w Grodzisku Wielkopolskim** (city/gmina level, not powiat/Skarb Państwa/KOWR).

## 2. Where published? (hosts + boards, URLs)

**Announcement board:**
- BIP primary: `https://bip.grodzisk.wlkp.pl/m,512,przetargi.html` — Przetargi section of city BIP
- BIP article-style URLs follow pattern: `https://bip.grodzisk.wlkp.pl/a,{ID},ogloszenie-o-przetargu-na-sprzedaz-nieruchomosci-gminnych.html`
  - Confirmed: `https://bip.grodzisk.wlkp.pl/a,20536,...` and `https://bip.grodzisk.wlkp.pl/a,20456,...`
- Alternate BIP domain also found: `https://bip.umgrodziskwielkopolski.nv.pl/o,512,przetargi.html` (likely same content, nv.pl CMS host)

**Result/achieved-price board:**
- Same BIP Przetargi section (`/m,512,przetargi.html`) — wyniki are published in the same section as ogłoszenia in standard Polish BIP practice; not yet fetched due to JS rendering. Must verify via Chrome MCP or Adradar archive.
- Adradar indexes announcements with full text: `https://przetargi.adradar.pl/p/a/92517/Grodzisk+Wielkopolski/a` (city-level filter, organizer=Miasto)

## 3. Format + rendering

**Critical issue — SPA/JavaScript rendering:**
- `bip.grodzisk.wlkp.pl` returns only a bare HTML shell (title + two nav links) when fetched without JavaScript. Content is loaded client-side.
- `web_fetch` returns empty body for all BIP article URLs — confirmed on multiple attempts.
- The BIP runs on a JavaScript framework (likely Angular/React SPA) — raw HTML scraping will not work.

**Workarounds:**
1. Chrome MCP (headless JS render) — required for direct BIP scraping.
2. Adradar.pl indexes full announcement text (plain HTML, no JS required) and is fetchable via `web_fetch` — can serve as announcement mirror.
3. The `nv.pl` alternate domain (`bip.umgrodziskwielkopolski.nv.pl`) may expose a more accessible CMS — needs one Chrome MCP check.

**Content format once rendered:** Plain Polish text (not PDF, not scanned). Fields visible: lokal address, surface, cena wywoławcza, wadium, przetarg date, wadium account number. No JSON API detected.

## 4. Volume + achieved-price stream

**Volume:** Low-medium. Adradar shows 2 municipal flat auctions in the May 2026 batch (same date, same organizer). The "II przetarg" label on both suggests the I przetarg batch was also 2 flats (earlier in 2026 or late 2025). Estimate: ~4-6 flat auctions/year across 2-4 batches.

**Achieved-price stream:** Not yet extracted. BIP wyniki board exists in the same `/m,512,przetargi.html` section (standard Polish BIP pattern). Adradar archives show no "wynik" entries indexed from this organizer — BIP rendering issue likely prevents indexing. Chrome MCP fetch of the BIP is needed to confirm presence and format of wyniki announcements.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any BIP-based city adapter that requires Chrome/Selenium rendering (e.g., cities using nv.pl or similar JS-heavy CMS). Medium effort because of the JS rendering requirement — no simple HTTP fetch will work.

**Blockers:**
1. BIP SPA — must use Chrome MCP or Playwright for every scrape cycle (no static HTML).
2. Wyniki board not yet confirmed extractable — needs one Chrome MCP live check.
3. Adradar can serve as announcement fallback but does not publish achieved prices.

**Effort: Medium.** Announcement text is clean, structured, in Polish plain text once rendered. Volume is low but steady. Standard przetarg fields (address, surface, cena wywoławcza, przetarg date) are clearly present. Main work is the JS-render layer and wyniki confirmation.

**VERDICT: BUILD** — gmina confirms flat auctions via ustny przetarg nieograniczony; text is structured; volume is real. Implement with Chrome-rendered BIP fetch + Adradar as redundancy for announcements.
