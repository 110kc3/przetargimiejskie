# Spike — Kościerzyna (Pomorskie · powiat kościerski)
> **Status:** spike LIVE-VERIFIED — 2026-06-30. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Miejska Kościerzyna actively sells municipal flats via *ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego*. Announcements and result documents are published on a standard BIP CMS at `bip.koscierzyna.gda.pl`. Per-year index boards expose HTML listings; each entry links to PDF attachments (text PDF, not scanned). Achieved-price results ("Wyniki przetargu") PDFs are posted on the same entry after the auction. No auth, no SPA, no bot blocks observed.

## 1. Sells municipal property at auction?

YES — confirmed. Multiple ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego entries live-verified on BIP:

| Ref | Date | Property | Type |
|-----|------|----------|------|
| WGN/1/2024 | 2024-02-19 | ul. Sikorskiego 6/7 + ul. Heykego 1/11 (plural flats) | 2nd auction, ustny nieograniczony |
| WGN/5/2024 | 2024-07-15 | ul. Świętojańska 14/5 | 1st auction, ustny nieograniczony |
| WGN/2/2026 | 2026-04-09 | ul. Sikorskiego 6/7 | ustny nieograniczony (3rd+ attempt) |
| WGN/4/2026 | 2026-06-22 | ul. Sikorskiego 6/7 | ustny nieograniczony (4th+ attempt) |

The Sikorskiego 6/7 flat has been re-auctioned at least 4 times across 2024–2026, confirming the city does not default to bezprzetargowe sales to tenants. Land lots and commercial/leisure properties also appear on the same board.

## 2. Where published? (hosts + boards, URLs)

**Announcement board (per-year BIP pages):**
- 2026: `https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid=557`
- 2025: `https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid=501`
- 2024: `https://bip.koscierzyna.gda.pl/?bip=1&cid=454&bsc=N`
- 2023: `https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid=437`

Each entry detail page: `https://bip.koscierzyna.gda.pl/?bip=2&cid=<year_cid>&id=<article_id>`

**Result/achieved-price board:** Same BIP entry — after auction, a "Wyniki przetargu" PDF link is appended to the same article. Confirmed present on land lots (WGN/7/2024, WGN/9/2024, WGN/11/2025). Expected same pattern for flat lots; not yet found a completed flat auction result PDF to confirm achieved price appears in the PDF body.

**PDF file URL pattern:** `https://bip.koscierzyna.gda.pl/fls/bip_pliki/<YYYY_MM>/BIP<hash>Z/<filename>.pdf`

## 3. Format + rendering

- **Index boards:** Standard BIP HTML, no JS gating, plain `<main>` content with article summaries and inline text links. Easily scrapable.
- **Detail page:** HTML with "Treść ogłoszenia" and "Wyniki przetargu" as `<a>` links to PDF files.
- **Announcement PDFs:** Text PDF (not scanned) — filename conventions like `Ogloszenie_przetarg_-_lokal_Sikorskiego_6_i_Heykego_1.pdf`. Standard `pdfplumber`/`pypdf` extractable.
- **Result PDFs:** Text PDF, same host path. Content not yet directly read — NEEDS-LIVE-VERIFY for exact achieved-price field name/position in result document.
- No SPA, no auth wall, no CAPTCHA observed across all tested pages.

## 4. Volume + achieved-price stream

- **Annual flat auction volume:** ~2–4 announcements/year (some are re-runs of same unit). 2024 had at least 2 flat entries (WGN/1/2024 plural, WGN/5/2024). 2025 had 0 flat entries visible on page 1 of 12 entries. 2026 has 2 flat entries in first half of year.
- **Overall WGN volume (all property types):** ~10–12 entries/year across flats, land, leases, auctions.
- **Achieved-price stream:** "Wyniki przetargu" PDF linked from same BIP entry after auction. Confirmed present for non-flat property types. Flat-specific wyniki not confirmed — blocker for price data extraction (NEEDS-LIVE-VERIFY on one completed flat entry).
- Low volume city (powiat seat, ~23k residents) — expect 2–5 flat auctions/year.

## 5. Adapter effort + verdict (closest analog; blockers)

**Closest analog:** Any standard BIP CMS city (e.g., Malbork, Bytów, similar small Pomorskie seats). Pattern is: year-indexed HTML boards → PDF links.

**Effort breakdown:**
- Index scraper: scrape per-year board pages, extract article links — straightforward HTML, ~1 day
- Detail parser: follow link to PDF "Treść ogłoszenia", extract address/area/price-floor/auction-date — standard text PDF extraction, ~1 day
- Result parser: follow "Wyniki przetargu" PDF when present, extract achieved price — PDF structure unknown; ~0.5 day once confirmed
- Year-nav: cid changes per year (not a sequential pattern visible yet; need to map 2019–2023 cids) — ~0.5 day

**Blockers:**
1. Year→cid mapping for pre-2024 boards (cids: 2019=?, 2020=?, 2021=360, 2022=?, 2023=437) — partial; need to confirm 2019/2020/2022 cids.
2. Achieved-price presence in flat-specific wyniki PDF not yet directly confirmed (only seen on land lots).

**Verdict: BUILD — Low–Medium effort.** Standard BIP CMS, text PDFs, no technical blockers. Volume is low but the achieved-price trail is present. Effort is Low if wyniki PDFs confirm price in header; Medium if PDF layout requires regex tuning.
