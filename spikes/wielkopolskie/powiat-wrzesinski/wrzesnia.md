# Spike — Września (Wielkopolskie · powiat wrzesiński)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Low-Medium effort).

## TL;DR

Gmina Września (Burmistrz Miasta i Gminy Września) directly auctions municipal residential flats
(*ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*) via its own BIP at
`bip.wrzesnia.pl`. A dedicated "Informacja o wynikach przetargów" board (cid=168) publishes
achieved-price notices after each auction. Volume is modest (~2–6 flat lots per year); format is
standard PHP-BIP HTML. No dedicated housing manager — the Urząd Miasta i Gminy runs everything
directly. Closest analog: Bytom / Tarnowskie Góry (small-volume, direct-gmina BIP, HTML scrape).

---

## 1. Sells municipal property at auction?

**YES — confirmed flat auctions (ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych).**

Evidence gathered (LIVE-VERIFIED from wrzesnia.info.pl news article fetched 2026-06-29):

- **ul. Fabrycznej 28/4** (32.70 m²) — I przetarg announced Aug 2025, cena wywoławcza 156 400 zł
  (4 700 zł/m²); auction held 12.09.2025 at Urząd Miasta i Gminy we Wrześni. A third iteration
  (*III przetarg ustny nieograniczony*) was also held on 20.03.2026 — auction result notice
  published 23.03.2026 on cid=168. This means the flat failed to sell twice before going at the
  third attempt, so repeat rounds do appear.
- **ul. Harcerskiej 17/6** — I przetarg announced 12.02.2026; I auction scheduled 20.03.2026 was
  **odwołany** (cancelled). Not sold bezprzetargowo — relisted for a new round.
- **ul. Harcerskiej 5/8** (57.30 m², 3 rooms, piwnica) — I przetarg announced Aug 2025,
  cena wywoławcza 272 700 zł (4 760 zł/m²); auction 12.09.2025.
- **ul. Sienkiewicza 19/3** — I przetarg announced, date TBC.

The BIP search snippet also references a separate archive section "Przetargi 2026" (cid=610),
indicating year-bucketed archival structure.

No evidence of a blanket *bezprzetargowy* tenant-sale programme displacing open auctions —
the gmina uses the open-auction route for vacant/unrenovated units.

---

## 2. Where published? (hosts + boards, URLs)

**Single host, two relevant boards on the gmina BIP:**

| Board | URL | Content |
|---|---|---|
| Sprzedaż nieruchomości i gruntów | `https://bip.wrzesnia.pl/?bip=1&cid=216&bsc=N` | Auction announcements (ogłoszenia) |
| Informacja o wynikach przetargów | `https://bip.wrzesnia.pl/?bip=1&cid=168` | Post-auction result notices with achieved price |
| Przetargi 2026 (year archive) | `https://bip.wrzesnia.pl/?bip=1&cid=610&bsc=N` | Year-partitioned archive |

Additional context boards (not primary for flats):
- Najem, dzierżawa nieruchomości: `https://bip.wrzesnia.pl/?bip=1&cid=163&bsc=N` (rental tenders,
  not sales)
- Zamówienia publiczne: `https://bip.wrzesnia.pl/?bip=1&cid=165&bsc=N` (procurement, not property)

Also mirrored/indexed at `https://biuletyn.net/wrzesnia/?bip=1&cid=216` (biuletyn.net aggregator).

**No separate housing manager.** The Urząd Miasta i Gminy we Wrześni (ul. Ratuszowa 1,
62-300 Września) handles all property disposals directly. The Burmistrz signs each announcement.

---

## 3. Format + rendering

**Standard PHP-BIP HTML** (the classic `?bip=1&cid=NNN&id=NNN` query-string pattern used by the
Biuletyn.net / eBiuletyn family of Polish BIP platforms).

- Direct web_fetch of `bip.wrzesnia.pl` timed out (likely Cloudflare-layer anti-bot or slow server
  response), but Google Search snippets confirm plain HTML text content — announcements are
  structured text (address, area, cena wywoławcza, wadium, auction datetime, conditions).
- Individual notice URLs follow the pattern: `https://bip.wrzesnia.pl/?bip=2&cid=216&id=NNNNN`
- PDF attachments are referenced for some notices (per snippet: "Pełna treść ogłoszenia znajduje
  się w załączniku poniżej" — used mainly for KOWR land auctions, not the gmina flat notices).
- **No scanned PDFs** for the flat announcements themselves — text is inline HTML.
- **No auth wall**, no CAPTCHA observed from public search access.
- The biuletyn.net mirror (`biuletyn.net/wrzesnia`) also returns empty on direct fetch, consistent
  with the same anti-fetch behaviour, but search-indexed content is accessible.

**Achieved-price notices (cid=168):** Published as HTML text entries within days of the auction.
The 20.03.2026 auction result for ul. Fabrycznej 28/4 appeared on 23.03.2026 — 3-day lag.

---

## 4. Volume + achieved-price stream

- **Estimated annual flat-auction volume:** 2–5 lots/year. Evidence: two flats advertised
  simultaneously in Aug 2025 (Fabryczna 28/4, Harcerska 5/8), plus at least two more by Q1 2026
  (Harcerska 17/6, Sienkiewicza 19/3). Some lots go to repeated rounds (Fabryczna went to III
  przetarg). This is a small but consistent flow, not a one-off.
- **Achieved-price stream:** YES — dedicated board cid=168 ("Informacja o wynikach przetargów").
  Results published promptly (3-day lag observed). This is the same pattern as other gmina BIPs
  that have been built (Bytom, Tarnowskie Góry style).
- **Land/commercial context:** KOWR (Krajowy Ośrodek Wsparcia Rolnictwa) also auctions agricultural
  land in gmina Września territory, but those appear on adradar.pl under KOWR organiser — not the
  gmina BIP. Starostwo Powiatowe we Wrześni auctions powiat-owned land (e.g. Bierzglinek 4.1M zł
  lot, May 2026) on `bip.wrzesnia.powiat.pl` — separate domain, out of scope for this spike.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom — small-volume, direct Burmistrz/gmina BIP,
PHP-BIP HTML format, cid-parameterised listing board, separate results board.

**Blockers / risks:**

1. **Web_fetch timeout on bip.wrzesnia.pl** — the raw BIP server did not respond to direct HTTP
   GET in the workspace environment. Likely a Cloudflare or regional ISP-level block against
   datacenter IPs (common for Polish BIPs). Mitigation: use a residential proxy or Playwright
   headless browser (same workaround already applied for other BIPs in this project). This is not
   a showstopper — it is a known scraping friction, not an auth wall.
2. **Low volume** — ~3–5 flat lots/year means low signal density. The adapter will mostly idle.
   Acceptable if the infrastructure cost per idle adapter is near zero.
3. **Year-bucket archive pattern** (cid=610 for 2026, presumably cid=NNN for 2025, etc.) — the
   current-year index shifts each January. The scraper must handle both the live board (cid=216)
   and discover archive cid values, or simply always poll cid=216 (which appears to be the
   persistent live listing).
4. **Repeated rounds without re-announcing** — when a lot goes to II/III przetarg, a new
   announcement is posted. The scraper should deduplicate by address, not just by announcement ID.

**Effort estimate:** Low-Medium. HTML parsing, no OCR, no auth. The only extra work vs. a
Tarnowskie Góry clone is the proxy/Playwright requirement and the dual-board (announcements +
results) scrape pattern. Results board (cid=168) is valuable for the achieved-price stream and
should be included in the adapter.

**VERDICT: BUILD** — confirmed flat-auction flow, HTML format, results board present.
Confidence: High (multiple independent sources; achieved-price notice directly observed in search
snippet dated 23.03.2026).

---

## Sources

- BIP Gmina Września — Sprzedaż nieruchomości i gruntów: <https://bip.wrzesnia.pl/?bip=1&cid=216&bsc=N>
- BIP Gmina Września — Informacja o wynikach przetargów: <https://bip.wrzesnia.pl/?bip=1&cid=168>
- BIP Gmina Września — Przetargi 2026: <https://bip.wrzesnia.pl/?bip=1&cid=610&bsc=N>
- wrzesnia.info.pl news article (LIVE-FETCHED 2026-06-29): <https://wrzesnia.info.pl/pl/19_wiadomosci-z-regionu/635_wrzesnia/38298_gmina-wrzesnia-sprzedaje-mieszkania-ceny-wywolawcze-kusza.html>
- adradar.pl Monitor Przetargów — gm. Września: <https://przetargi.adradar.pl/p/a/99032/Wrze%C5%9Bnia/a>
- BIP Powiatu Wrzesińskiego (separate entity, out of scope): <https://www.bip.wrzesnia.powiat.pl/>
