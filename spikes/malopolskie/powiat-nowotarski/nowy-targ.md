# Spike — Nowy Targ (Małopolskie · powiat nowotarski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Medium effort if re-scoped to land-only; see §5).

## TL;DR

Gmina Miasto Nowy Targ auctions municipal property via its own BIP at `bip.nowytarg.pl`. It does hold **ustny przetarg nieograniczony (licytacja)** on residential flats — but all confirmed flat auctions are for apartments physically located in **Kraków** (legacy portfolio from some historic transfer), not flats in Nowy Targ city itself. The local housing manager ZGM Nowy Targ Sp. z o.o. does not publish flat-sale przetargi (it handles property management/rentals, not sales). Primary property-sale przetargi visible on the BIP are for **niezabudowane nieruchomości gruntowe** (unbuilt land parcels). Flat-auction volume is extremely low (~5 lots, one batch, in all of 2025) and geographically anomalous. This is a NO-BUILD under the przetargi-mieszkalne aggregation model, but could be a low-priority BUILD if the scope is broadened to land parcels.

---

## 1. Sells municipal property at auction?

**YES — but primarily land, not local flats.**

Confirmed auction types on BIP:
- `GN.6840.64.2024` (2024-12-23): *"publiczny przetarg ustny nieograniczony (licytacja) na sprzedaż niezabudowanej nieruchomości gruntowej przy ul. Szewskiej w Nowym Targu"* — land parcel.
- `GN.6840.65.2024` (2024-12-23): same type, ul. Sądowa — land parcel.
- Batch of ~5 auctions (Zarządzenia 0050.125–0050.129.2025, dated 2025-08-21): *publiczny przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* — BUT all units are in **Kraków**: ul. Mazowieckiej 11/7a, ul. Królowej Jadwigi 33a/21, ul. Barskiej 19/10, al. Słowackiego 50/14a, ul. Kazimierza Wielkiego 87/32. Auction date: 2025-10-29, conducted at Nowy Targ City Hall.
- A second batch announced 2025-08-25 with further Kraków flats (ul. Św. Sebastiana 20/2, ul. Dietla 69/6, al. Słowackiego 50/14a, ul. Mazowieckiej 11/7a; starting prices 470k–950k PLN).

**Assessment:** The gmina does use the *ustny przetarg nieograniczony* form for flats, satisfying the legal/procedural criterion. However, these are Kraków-located properties being sold by Nowy Targ — a one-time or rare portfolio liquidation, not a repeating stream of locally-located flat auctions. No evidence of flat auctions for Nowy Targ-located municipal housing.

---

## 2. Where published? (hosts + boards, URLs)

**Primary host:** `bip.nowytarg.pl` (custom BIP, not on malopolska.pl platform)
- Tenders index: https://bip.nowytarg.pl/6021
- 2025 tenders: https://bip.nowytarg.pl/6622 (6 pages)
- 2026 tenders: https://bip.nowytarg.pl/6693 (3 pages, as of 2026-06-27)
- 2024 tenders: https://bip.nowytarg.pl/6470
- Archive (pre-2024): https://arch.nowytarg.pl/jb_wys_all.php?zm_ar=1 (separate old CMS)

**Document URLs:** Each announcement is a sub-page, e.g. `https://bip.nowytarg.pl/6470/dokument/8480` for the 2024-12-23 land auction. The flat auction Zarządzenia (0050.125–0050.129.2025) are in the Zarządzenia Burmistrza section at https://bip.nowytarg.pl/6426/wszystkie.

**Result/achieved-price notices:** No dedicated "wyniki przetargu" section observed on the live BIP. The archive site had `przetarg_XXXX_par_86.pdf` suffix files which appear to be §86 notifications (informacja o wyniku przetargu per rozporządzenie) — format: PDF attached to the same document record. Example seen in archive: `arch.nowytarg.pl/dok/przetargi/przetarg_9347_par_86.pdf`. Whether current BIP (post-2024) follows the same pattern is unconfirmed (rate-limited before verifying a 2024+ result notice).

**City news page** (not a board but used for Kraków flat announcements): https://www.nowytarg.pl/miasto-nowy-targ/aktualnosci/sprzedaz-mieszkan-wkrakowie--dodatkowe-informacje,2690

**ZGM Nowy Targ (housing manager):** http://www.zgm.nowytarg.pl/ — 100% city-owned Sp. z o.o., manages housing stock but only publishes service procurement (Zapytania Ofertowe), not flat-sale przetargi. Not a BUILD candidate as a source.

---

## 3. Format + rendering

**Listing pages:** Standard server-rendered HTML. Paginated list at `/6622`, `/6693`, etc. Each item is a text summary + link to a detail page. No SPA, no JavaScript-gated content observed. No auth/bot blocks encountered (BIP pages loaded cleanly).

**Document detail pages:** `/6622/dokument/NNNNN` — server-rendered HTML containing the announcement text inline or linking to attached PDF files.

**Attached documents:** Mixed:
- Older archive (arch.nowytarg.pl): PDFs — both text-PDFs (announcement body) and separate `_par_86.pdf` result files. The one confirmed PDF (`arch.nowytarg.pl/dok/przetargi/przetarg_10649.pdf`) was a ZGM-issued tender, format unknown (returned empty body on fetch — likely scanned or access-restricted).
- Current BIP (2024+): Document bodies appear to be rendered as HTML text within the BIP CMS pages, with PDFs attached for formal documents. The 2024 land-auction pages fetched at non-rate-limited moments showed text summaries inline.

**No OCR burden apparent** for current-BIP auctions — text is in HTML. Older archive material may require OCR if scanned PDFs are encountered.

---

## 4. Volume + achieved-price stream

**Flat-sale volume:** ~5–8 lots total across 2025 (one batch), all Kraków-located. Zero confirmed repeat batches; this appears to be portfolio clearance, not regular programme. 2024: zero flat auctions confirmed; 2023 and earlier: no flat auctions found in archive searches.

**Land-parcel volume:** 2 confirmed in Dec 2024 (GN.6840.64 and GN.6840.65). Likely a handful per year.

**Achieved-price stream:** Result notices exist in archive as `_par_86.pdf` files. Current BIP structure unclear — no confirmed result pages fetched from 2024+ data (rate limiting). DESK-only for this element.

**Cadence:** Irregular. No evidence of quarterly or fixed-schedule releases.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry or Bytom (small city, BIP-hosted, HTML listings, PDF attachments for details, low volume) — not Kraków (which has a structured nieruchomości sub-site with dedicated result boards).

**Blockers:**
1. **Wrong property type:** The only flat auctions are for Kraków-located units — outside Nowy Targ scope. Aggregating them would require tagging them as "Kraków, sprzedawca: Nowy Targ" which is out of scope for a city-level scraper.
2. **No dedicated nieruchomości board:** Flat and land przetargi are mixed into the general przetargi list alongside road works, school canteens, fuel deliveries, etc. Filtering requires keyword matching on title text (no category taxonomy).
3. **Two BIP systems:** Current content on `bip.nowytarg.pl` (2024+); older content on `arch.nowytarg.pl` with a different CMS and URL scheme. Any historical backfill needs both scrapers.
4. **Result notices:** Likely PDF attachments on detail pages — requires per-document fetch and PDF parse to get achieved prices.

**Risks:**
- Kraków flat batch may be a one-off; future flat auctions may never appear or appear under a different gmina instrument (bezprzetargowa sprzedaż to sitting tenants).
- ZGM may take over flat-sale programme without publishing on city BIP.

**Effort (if re-scoped to land parcels only):** Medium — two BIP systems to cover, keyword filtering needed, PDF result parsing, low volume (~2–4/year). Not worth standalone adapter.

**VERDICT: NO-BUILD.** The gmina sells flats by auction only as an anomalous one-time Kraków portfolio clearance; there is no ongoing local flat-sale przetarg stream. Land parcel auctions exist but are low-volume and not the project target. If the project scope ever expands to land + commercial nieruchomości (not just lokale mieszkalne), re-evaluate as LOW-PRIORITY BUILD at Medium effort.

---

**Sources:**
- BIP Przetargi index: https://bip.nowytarg.pl/6021
- 2025 przetargi list: https://bip.nowytarg.pl/6622
- 2026 przetargi list: https://bip.nowytarg.pl/6693
- 2024 przetargi list: https://bip.nowytarg.pl/6470
- Archive all przetargi: https://arch.nowytarg.pl/jb_wys_all.php?zm_ar=1
- Zarządzenia Burmistrza 2024–2029: https://bip.nowytarg.pl/6426/wszystkie
- City news — Kraków flat sale: https://www.nowytarg.pl/miasto-nowy-targ/aktualnosci/sprzedaz-mieszkan-wkrakowie--dodatkowe-informacje,2690
- ZGM Nowy Targ Sp. z o.o.: http://www.zgm.nowytarg.pl/
- ZGM on eGospodarka: https://www.przetargi.egospodarka.pl/zamawiajacy/Zaklad-Gospodarki-Mieszkaniowej-w-Nowym-Targu-Sp-z-o-o.html
