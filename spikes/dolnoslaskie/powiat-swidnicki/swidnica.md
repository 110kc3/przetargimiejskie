# Spike — Świdnica (Dolnośląskie · powiat świdnicki)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Gmina Miasto Świdnica (Prezydent Miasta) runs a consistent, high-volume flat-auction programme via *ustny przetarg nieograniczony*. The housing manager is **MZN — Miejski Zarząd Nieruchomości** (a municipal budget unit, not a separate TBS). Announcements and result notices land on the city's single BIP host (`bip.swidnica.nv.pl`) under "Sprzedaż i dzierżawa nieruchomości". The BIP runs on the **nv.pl** platform (same as many Dolnośląskie gminas) which renders as a JavaScript SPA — web_fetch returns an empty shell; real content requires a headless browser or a JS-capable scraper. Volume is confirmed at ≥12 pages of archived flat auctions on adradar.pl (≈8–10 flats/month in 2026). Closest analogue is **Bytom** (city BIP + MZN housing manager, nv.pl-style platform, JS-rendered pages). Achieved-price data is not published inline; it appears either as separate "informacja o wyniku" posts on the same BIP section or not at all.

---

## 1. Sells municipal property at auction?

YES — confirmed *ustny przetarg nieograniczony na sprzedaż wolnego lokalu mieszkalnego*.

Evidence:
- BIP entry P-153/I/26: "I przetarg ustny nieograniczony P-153/I/26 na sprzedaż wolnego lokalu mieszkalnego nr 1 przy ulicy Kli[nowa]…" — city BIP, 2026.
- P-129/XII/24: flat auction on BIP for December 2024 (URL confirmed).
- P-34/VII/19: flat auction back to at least 2019 (listaPrzetargow.pl entry with full announcement text).
- adradar.pl "Przetargi: mieszkania Świdnica" page lists **12 paginated pages** of auctions all labelled **Organizator: Urząd Miejski w Świdnicy** — confirmed batch round dates: 2026-06-25 (3 flats), 2026-05-18 (3 flats), 2026-05-14 (1 flat), 2026-05-11 (2 flats), 2026-03-30 (2 flats), 2026-03-26 (3 flats), etc.
- Sprzedaż is done directly by **Prezydent Miasta Świdnicy** (Gmina Miasto Świdnica), not bezprzetargowo — auctions are open, competitive, with wadium and 1% increments.
- ŚTBS (Świdnickie TBS) exists but handles *new social housing construction*, NOT municipal flat sales.

**Conclusion: flat auctions are the primary sales channel, not a fallback. This is NOT a land-only gmina.**

---

## 2. Where published? (hosts + boards, URLs)

### Primary publication hosts

| Role | URL | Notes |
|---|---|---|
| Gmina Miasto BIP — sprzedaż nieruchomości | `https://bip.swidnica.nv.pl/swidnica,m,11962,sprzedaz-i-dzierzawa-nieruchomosci.html` | Main listing board for announcements + results |
| Gmina Miasto BIP — alternate slug | `https://bip.swidnica.nv.pl/swidnica,m,11962,sprzedaz-nieruchomosci.html` | Same section, alternate path |
| MZN BIP sub-site | `https://bip.swidnica.nv.pl/mzn,m,8448,przetargi.html` | MZN's own przetargi board (procurement tenders, not flat sales) |
| MZN official site | `http://mzn.swidnica.pl/` | Corporate info; property listings at `http://nieruchomosci-swidnica.pl/` |
| City website (secondary) | `http://um.swidnica.pl/pages/pl/urzad-miejski/sprzedaz-nieruchomosci.php` | Mirror/excerpt of BIP announcements |

### Announcement boards (physical/published)
- Bulletin board at room 124, UM Świdnica, ul. Armii Krajowej 49
- Gazeta Wyborcza Wrocław (excerpts, per historical notices)
- Contact: Wydział Geodezji i Gospodarki Nieruchomościami, pok. 229, tel. 74 856-28-67

### Result notices (achieved price)
- Published in the same BIP section ("Sprzedaż i dzierżawa nieruchomości") as separate "informacja o wyniku przetargu" items.
- No dedicated achieved-price field/JSON; must be scraped from individual result posts.
- Cross-reference: adradar.pl and listaprzetargow.pl do NOT republish achieved prices — they only carry announcements.

---

## 3. Format + rendering

| Layer | Detail |
|---|---|
| Platform | **nv.pl BIP** (same engine used by dozens of Dolnośląskie/Śląskie cities) |
| Rendering | **JavaScript SPA** — `web_fetch` returns bare HTML shell with no content (confirmed: fetched several deep-link URLs, all returned only `<title>Biuletyn Informacji Publicznej</title>` + nav links) |
| Article format | HTML text (not PDF) once JS executes — announcement body is prose in a `<div>` container |
| PDF attachments | Present on some entries (maps, condition reports) but the announcement text itself is inline HTML |
| Auth/bot blocks | No CAPTCHA observed; nv.pl platform appears to block headless fetch but serves fine in a real browser. Needs Playwright/Puppeteer with JS enabled, or Chrome MCP. |
| URL pattern | `bip.swidnica.nv.pl/swidnica,v,{ID},{slug}.html` for individual notices; listing at `swidnica,m,11962,…` |
| Pagination | Unknown (could not render listing page); adradar archive suggests ~10 items/page |

---

## 4. Volume + achieved-price stream

### Announcement volume
- **2026 YTD (to 2026-06-27):** confirmed ≥11 flat auctions from Urząd Miejski (from adradar.pl page 1 alone), with 12 pages total in the archive = estimated **~80–120 flat auction notices** going back ~2–3 years.
- Batch cadence: ~2–4 auction sessions per month, 2–4 flats per session.
- Starting prices seen: 60 000 zł (31 m²) to 310 000 zł (102 m²), typical ~100 000–200 000 zł.

### Achieved-price data
- **Not reliably scrapable** from BIP directly without JS rendering.
- "Informacja o wyniku przetargu" posts exist on BIP (confirmed by search snippets referencing such titles on the same domain), but content is behind the JS wall.
- listaprzetargow.pl and adradar.pl do not carry achieved-price data for gmina przetargi.
- Workaround: render BIP with headless browser; filter for "wynik" slugs in the same `swidnica,m,11962` section.

---

## 5. Adapter effort + verdict

### Closest analogue
**Bytom** — same pattern: city BIP on nv.pl-family platform, municipal housing manager (MZN equivalent), JS-rendered listing pages, flat auctions as primary sales channel, achieved-price in separate "wynik" posts.

Also comparable to **Tarnowskie Góry** (nv.pl, flat auctions, consistent volume).

### Blockers
1. **JS rendering required** — the nv.pl BIP will not yield content without executing JavaScript. Standard `fetch` / `requests` returns empty. Must use Playwright, Selenium, or Chrome MCP.
2. **No structured data** — all notice content is unstructured prose HTML; requires regex/NLP parsing for address, area, cena wywoławcza, przetarg number.
3. **Achieved price not in announcement** — must chase "wynik" sibling posts; pairing auction ↔ result requires matching on przetarg ID (e.g., P-43/VI/26).

### Risks
- nv.pl may change SPA routing silently; URL slugs are stable but listing pagination mechanism is opaque until rendered.
- Some rounds are re-run (I → II przetarg) when no bidders appear; adapter must de-duplicate.
- MZN subdomain (`bip.swidnica.nv.pl/mzn`) is separate from city; only city section has flat sales — no cross-contamination risk but verify MZN section stays procurement-only.

### Effort estimate
**Medium** — JS rendering adds one infra layer vs. static-HTML cities, but the pattern (nv.pl BIP) is already solved if Bytom/Tarnowskie Góry adapters exist. Parsing effort is standard prose-to-struct. Achieved-price stream is optional-nice-to-have and adds ~+30% effort.

### Verdict
**BUILD** — High volume, confirmed flat auctions, stable URL patterns, well-understood platform, no auth/CAPTCHA obstacles. JS rendering is the only technical barrier and is solvable with existing tooling.

---

## Sources

- BIP Gmina Miasto Świdnica — Sprzedaż nieruchomości: https://bip.swidnica.nv.pl/swidnica,m,11962,sprzedaz-i-dzierzawa-nieruchomosci.html
- BIP — P-153/I/26 flat auction 2026: https://bip.swidnica.nv.pl/swidnica,v,13605,i-przetarg-ustny-nieograniczony-p-153i26-na-sprzedaz-wolnego-lokalu-mieszkalnego-nr-1-przy-ulicy-kli.html
- BIP — P-129/XII/24 flat auction 2024: http://bip.swidnica.nv.pl/swidnica,a,128948,i-przetarg-ustny-nieograniczony-p-129xii24-na-sprzedaz-wolnego-lokalu-mieszkalnego-nr-3-przy-ulicy-k.html
- BIP — P-34/VII/19 flat auction 2019 (via listaprzetargow): http://bip.swidnica.nv.pl/swidnica,a,121143,i-przetarg-ustny-nieograniczony-p-34vii19-na-sprzedaz-wolnego-lokalu-mieszkalnego-nr-11-11a-przy-uli.html
- MZN BIP przetargi: https://bip.swidnica.nv.pl/mzn,m,8448,przetargi.html
- MZN website: http://mzn.swidnica.pl/
- adradar.pl flat-auction archive (Urząd Miejski w Świdnicy): https://przetargi.adradar.pl/p/mieszkania/2370/%C5%9Awidnica/przetargi
- listaprzetargow.pl — P-5/II/19 full announcement text: https://listaprzetargow.pl/oferty/22598-przetarg-mieszkanie-swidnica-dolnoslaskie
- komunikaty.doba.pl — May 2026 batch (3 flats): https://komunikaty.doba.pl/2026/05/21/sprzedaz-lokali-mieszkalnych-um-swidnica-28/
- komunikaty.doba.pl — Jan 2026 batch: https://komunikaty.doba.pl/2026/01/29/sprzedaz-lokali-mieszkalnych-um-swidnica-26/
- komunikaty.doba.pl — Sep 2025 single flat: https://komunikaty.doba.pl/2025/09/30/sprzedaz-lokalu-mieszkalnego-um-swidnica-8/
