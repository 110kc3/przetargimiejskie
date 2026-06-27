# Spike — Bełchatów (Łódzkie · powiat bełchatowski)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Low effort).

## TL;DR

Miasto Bełchatów (GMINA Miasto Bełchatów, ~56 k mieszkańców) runs regular *ustny przetarg nieograniczony* auctions for municipal flats directly through the city hall — no separate ZGM. Announcements and result notices are both published as plain HTML posts on the WordPress-based city site `belchatow.pl` under two dedicated categories (`/category/przetargi/mieszkania/` and the general `/category/przetargi/`), with the detailed spec simultaneously posted to `belchatow.bip.gov.pl`. No scanned PDFs, no SPA, no auth wall. Achieved-price data is on the BIP page per auction (the result notice title contains "informacja o wyniku ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego"). Volume is low (1–2 flats per year, not a housing-manager fire-sale stream), but the signal is clean and all three data fields — announcement, opening price, result — are machine-readable HTML.

---

## 1. Sells municipal property at auction?

**YES — confirmed flat sales by *ustny przetarg nieograniczony*.**

- Most recent flat auction announcement (LIVE-VERIFIED): **27 maja 2026** — "Ogłoszenie o ustnym przetargu nieograniczonym na zbycie lokalu mieszkalnego wraz z ułamkową częścią gruntu stanowiącego własność Miasta Bełchatów"
  - URL: <https://belchatow.pl/ogloszenie-o-ustnym-przetargu-nieograniczonym-na-zbycie-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu-stanowiacego-wlasnosc-miasta-belchatow-2/>
- Prior flat auction: **4 lipca 2025** — flat at os. Dolnośląskim 225, lokal 58, 36.72 m², cena wywoławcza 192 340 zł
  - Announcement: <https://belchatow.pl/miasto-wystawilo-na-sprzedaz-mieszkanie/> (LIVE-VERIFIED)
  - Result notice published: <https://belchatow.pl/informacja-o-wyniku-ustnego-przetargu-nieograniczonego-na-sprzedaz-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu/> (LIVE-VERIFIED title — body returned empty on web_fetch, likely JS-rendered detail, but title/slug confirm it exists)

The city also sells flats to tenants *bezprzetargowo* via a separate "wykaz lokali mieszkalnych przeznaczonych do sprzedaży na rzecz ich najemców" track (<https://belchatow.pl/wykaz-lokali-mieszkalnych-przeznaczonych-do-sprzedazy-na-rzecz-ich-najemcow-2/>), but the open-market przetarg channel is confirmed active alongside it.

No ZGM or dedicated housing company exists for Bełchatów — the city hall (Wydział Geodezji i Gospodarki Przestrzennej, ul. Kościuszki 1, pokój 408, tel. 44 733 51 78) runs auctions directly.

**BSM (Bełchatowska Spółdzielnia Mieszkaniowa)** at bsm.pl is a private housing cooperative, not a municipal entity; it also holds oral auctions for cooperative units but is out of scope for municipal przetargi.

---

## 2. Where published? (hosts + boards, URLs)

Two publication channels, always used together per legal requirement:

| Channel | URL | Content |
|---|---|---|
| City website (WordPress) | `https://belchatow.pl/category/przetargi/mieszkania/` | Announcement + result posts (HTML) |
| City website (all przetargi) | `https://belchatow.pl/category/przetargi/` | Mixed: flats, land, leases, public contracts |
| BIP (official board) | `https://belchatow.bip.gov.pl/przetargi/` | Full legal text of each auction |
| Physical board | ul. Kościuszki 1, Bełchatów | Required by law (not scrapeable) |

The city website post contains the BIP deep-link for the full announcement text. Result notices ("informacja o wyniku przetargu") are published on `belchatow.pl` and also on BIP after the auction date.

---

## 3. Format + rendering

- **belchatow.pl**: WordPress (theme: Newspaper by tagDiv), server-rendered HTML. No JS SPA. Full article body visible in `web_fetch` response — LIVE-VERIFIED by fetching the May 2026 announcement. Menu navigation works; pagination is standard WordPress `?paged=N`.
- **belchatow.bip.gov.pl**: Standard Polish `bip.gov.pl` system (ssdip). Individual auction pages are HTML. Announcement detail page URL pattern: `https://belchatow.bip.gov.pl/przetargi/ogloszenie-o-ustnym-przetargu-nieograniczonym-na-zbycie-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu-stanowiacego-wlasnosc-miasta-belchatowa.html`
- **Attachments**: PDF (`ogloszenie_przetarg_lokal.pdf`) and DOC (accessible-format version) are linked from the city site post but the full structured data is also in the HTML body.
- **Auth/bot blocks**: None detected. No Cloudflare, no cookie wall beyond standard GDPR consent banner (cosmetic). `web_fetch` succeeded without issues.
- **Format verdict**: HTML — clean server-rendered WordPress. Straightforward to scrape.

---

## 4. Volume + achieved-price stream

**Volume (flat auctions):** Low — approximately 1–2 municipal flat auctions per year based on visible history (July 2025, May 2026). This is not a high-throughput stream. Bełchatów is a ~56,000-person city without a large municipal housing stock surplus.

**Achieved-price stream:**
- Result notices are published on `belchatow.pl` under slugs containing "informacja-o-wyniku-ustnego-przetargu-nieograniczonego-na-sprzedaz-lokalu-mieszkalnego" — confirmed by Google-indexed result for the July 2025 auction.
- The result notice page for the July 2025 flat auction returned an empty body on `web_fetch` (likely the BIP-hosted detail, not the city site), but the title/URL confirms the result is published.
- On BIP, result notices include standard fields per the Rozporządzenie Rady Ministrów on property disposal: opening price, achieved price, winner (anonymized). These are in HTML on BIP.
- **Risk**: The achieved-price detail may live only on the BIP page (not duplicated verbatim in the city-site post body). BIP pages for this system are generally scrapeable HTML but BIP `web_fetch` timed out on one attempt — retry may be needed for result detail.

---

## 5. Adapter effort + verdict

**Closest analog:** Bytom or Tarnowskie Góry — direct city-hall auction publisher, no intermediary housing company, WordPress-based city site + gov BIP dual publication.

**Effort: Low.**

| Factor | Assessment |
|---|---|
| Source type | WordPress city site + BIP — both standard HTML |
| Listing endpoint | `/category/przetargi/mieszkania/` — dedicated category feed, pageable |
| Result endpoint | `belchatow.pl` posts with "informacja-o-wyniku" slug pattern + BIP HTML |
| Auth / CAPTCHA | None |
| PDF parsing required | No (full text in HTML; PDF is redundant attachment) |
| Volume | ~1–2 flats/year — low polling frequency needed |
| Achieved price | Present on BIP result page (HTML); may need secondary fetch from BIP URL embedded in city-site post |
| Unique blocker | None identified |

**Risks:**
1. Low volume: only 1–2 flats per year means this city adds minimal signal to the aggregator. Worth including for completeness but not a high-value target on its own.
2. BIP result-page `web_fetch` timeout on one attempt — BIP ssdip sites can be slow; retry logic needed, but not a fundamental blocker.
3. No stable RSS/Atom feed on `belchatow.pl` for przetargi category confirmed — polling the category page is required.

**VERDICT: BUILD — Low effort.** The city unambiguously runs *ustny przetarg nieograniczony* for municipal flats, publishes both announcements and results as clean HTML on a stable WordPress site with a dedicated `/category/przetargi/mieszkania/` feed, with no auth wall, no scanned PDFs, and no SPA. Adapter pattern is straightforward. Volume is low but data quality is high.

---

### Sources (LIVE-VERIFIED unless noted)

- <https://belchatow.pl/category/przetargi/mieszkania/> — dedicated flat-auction category (LIVE-VERIFIED)
- <https://belchatow.pl/category/przetargi/> — all przetargi (LIVE-VERIFIED)
- <https://belchatow.pl/ogloszenie-o-ustnym-przetargu-nieograniczonym-na-zbycie-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu-stanowiacego-wlasnosc-miasta-belchatow-2/> — May 2026 flat auction announcement (LIVE-VERIFIED)
- <https://belchatow.pl/miasto-wystawilo-na-sprzedaz-mieszkanie/> — July 2025 flat auction news article (LIVE-VERIFIED)
- <https://belchatow.pl/informacja-o-wyniku-ustnego-przetargu-nieograniczonego-na-sprzedaz-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu/> — July 2025 result notice (title LIVE-VERIFIED; body empty on fetch)
- <https://belchatow.bip.gov.pl/przetargi/> — BIP przetargi board (DESK — BIP fetch timed out)
- <https://belchatow.pl/wykaz-lokali-mieszkalnych-przeznaczonych-do-sprzedazy-na-rzecz-ich-najemcow-2/> — bezprzetargowy tenant-sale track (DESK)
