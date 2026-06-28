# Spike — Sieradz (Łódzkie · powiat sieradzki)

> **Status:** spike DESK — 2026-06-28. VERDICT: NO-BUILD (Medium confidence).

## TL;DR

Gmina Miasto Sieradz (BIP: bip.umsieradz.pl) does **not** run open-auction sales of municipal flats. Municipal housing stock has been managed since September 2022 by a division within Przedsiębiorstwo Komunalne Sp. z o.o. (pksieradz.pl — Zakład Gospodarki Mieszkaniowej), which administers 46 housing communities / 1 126 residential units — but this entity is a building manager, not a flat-sale auctioneer. Flat buy-out in Sieradz happens **bezprzetargowo** (non-auction, by tenant application to Urząd Miasta). The only active flat-auction scene in Sieradz is the **Sieradzka Spółdzielnia Mieszkaniowa** (SSM, a housing cooperative — not a municipal body) and occasional one-off sales by Urząd Marszałkowski Województwa Łódzkiego (voivodeship property). No evidence of gmina-run *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* in any year reviewed (2021–2026).

---

## 1. Sells municipal property at auction?

**Gruntowe (land): YES.** Gmina Miasto Sieradz ran 7 oral unlimited auctions (*przetarg ustny nieograniczony*) for undeveloped land parcels on ul. Staropolna and ul. Gen. Sikorskiego in November 2024. These are normal land sales from the city's real-estate portfolio. Contact dept: Referat Gospodarki Gruntami i Rolnictwa, tel. 43 826-61-55.

**Lokale mieszkalne (flats): NO-AUCTION.** Municipal flat buy-out works via tenant application to Urząd Miasta Sieradza (pl. Wojewódzki 1). The city decides case-by-case whether a flat is for sale; no public open-auction procedure found. Search of BIP announcements, adradar.pl aggregator, and the e-Sieradz city news portal turned up zero instances of a gmina-run flat auction. Flat sales in Sieradz that do appear in auction databases come exclusively from:
- **Sieradzka Spółdzielnia Mieszkaniowa** (cooperative, not gmina) — runs frequent written tenders (*przetarg pisemny*), ~6–10 per year, at ssmsieradz.pl;
- **Agencja Mienia Wojskowego** (military property) — one-off;
- **Urząd Marszałkowski Województwa Łódzkiego** — one flat at ul. Jana Pawła II 90A, auctioned repeatedly 2025–2026.

There is a generic page on jakiwniosek.pl confirming "Wykup mieszkania komunalnego Sieradz" is handled at Urząd Gminy / Urząd Miasta non-auction, with typical 5–10 year minimum tenancy, bonifikata negotiated per uchwała Rady Miejskiej. No specific bonifikata percentage was published.

A 2023 BIP search snippet also references Resolution No. LXXXIX/613/2023 (26 Sep 2023) on allocation rules and Resolution No. LXIII/426/2022 establishing the housing-management arrangement with PK Sieradz — confirming the non-auction administrative model.

**Verdict on Q1: gmina auctions land ✓, but flats → bezprzetargowo only ✗**

---

## 2. Where published? (hosts + boards, URLs)

| Type | Host | URL | Notes |
|---|---|---|---|
| Gmina BIP (main) | bip.umsieradz.pl | https://bip.umsieradz.pl/bipkod/036 | Przetargi i konkursy ofert; JS-heavy, did not load via web_fetch |
| Gmina BIP (nieruchomości) | bip.umsieradz.pl | https://bip.umsieradz.pl/bipkod/33941756 | Ogłoszenia 2024 — land przetargi found here (timed out on direct fetch) |
| City news (mirror) | sieradz.eu | https://sieradz.eu/sprzedzaz-nieruchomosci-gruntowych | Article about Nov 2024 land auction — HTML, fully fetchable |
| SSM cooperative przetargi | ssmsieradz.pl | https://ssmsieradz.pl/przetargi | Flat written tenders; separate from gmina |
| PK Sieradz (housing mgr) | pksieradz.pl | https://pksieradz.pl/dzialy/zaklad-gospodarki-mieszkaniowej/ | No przetarg / sale listings; admin only |

There is no dedicated housing-manager BIP board for flat auctions because no flat auctions exist. The gmina BIP sits on the FINN platform (bip.umsieradz.pl is finn-based).

Result notices (wyniki przetargów): The BIP path https://bip.umsieradz.pl/bipkod/20074049 is listed as "Prowadzone postępowania" but content is JS-rendered and could not be fetched in one attempt. No confirmed achieved-price stream.

---

## 3. Format + rendering

- **bip.umsieradz.pl**: FINN-based CMS, JS-rendered page shell. Timed out on direct web_fetch; likely SPA or dynamic table. Google snippets confirm textual auction notices exist in the HTML once rendered.
- **sieradz.eu** (city news mirror): Standard WordPress/CMS HTML, fully fetchable. Auction text embedded directly in article body — no PDF, no login.
- **SSM (ssmsieradz.pl)**: Standard HTML listing; flat przetargi published as plain text + contact info, no login, no bot blocking detected.
- No scanned-PDF or OCR scenario found for any of the above.
- **Auth/bot blocks**: BIP pages returned empty on web_fetch (likely JS gate, not a bot block per se). Retry with Chrome MCP or a JS-capable fetcher would be needed to scrape BIP directly.

---

## 4. Volume + achieved-price stream

**Flat auctions (gmina): 0 per year** — not applicable.

**Land auctions (gmina):** ~7 lots in one batch (Nov 2024). Previous batches likely exist but volume appears sporadic (1–2 batches per year at most). No achieved-price records found in public-facing BIP pages from desk research; result notices may be buried in BIP announcements archive.

**SSM cooperative flats (not gmina):** ~6–10 written-tender flat sales per year, 2025–2026 visible on adradar.pl. Prices 128 000–361 000 zł. SSM is a cooperative, not a municipal body — out of scope.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the existing BUILD adapters (Gliwice/Zabrze/Bytom/Kraków/Tarnowskie Góry) match, because all those cities sell municipal flats at auction. Sieradz's gmina does not.

**Blockers:**
1. No municipal flat auctions exist in Sieradz — the fundamental data stream (flat auction → achieved price) is absent from the gmina.
2. Land-only przetargi are out of scope for the product (przetargimiejskie targets flat/lokal sales).
3. BIP is JS-rendered (FINN CMS), adding scraping complexity even if the content were useful.
4. No housing manager (no TBS, no ZBM/ZGM equivalent) publishes flat przetargi — the housing manager (PK Sieradz ZGM) is purely an administrator of wspólnoty and does not sell units.

**Risks:** If gmina policy changes and tenant buy-out is converted to open auction (possible under future uchwała), that would create a new stream — but no signal of this in 2026.

**VERDICT: NO-BUILD.** Sieradz's municipal housing disposal model is exclusively bezprzetargowe. Only land parcels go to open auction. Without a flat-auction stream, there is nothing to aggregate.

---

## Sources

- BIP Miasto Sieradz — przetargi: https://bip.umsieradz.pl/bipkod/036
- BIP Miasto Sieradz — nieruchomości 2024: https://bip.umsieradz.pl/bipkod/33941756
- e-Sieradz land przetargi (Nov 2024): https://sieradz.eu/sprzedzaz-nieruchomosci-gruntowych
- PK Sieradz / ZGM: https://pksieradz.pl/dzialy/zaklad-gospodarki-mieszkaniowej/
- Adradar flat przetargi Sieradz (SSM dominant): https://przetargi.adradar.pl/przetargi/mieszkania/24469/Sieradz/all
- jakiwniosek.pl — wykup mieszkania komunalnego Sieradz: https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/sieradz
- Sieradzka Spółdzielnia Mieszkaniowa: https://ssmsieradz.pl/przetargi
