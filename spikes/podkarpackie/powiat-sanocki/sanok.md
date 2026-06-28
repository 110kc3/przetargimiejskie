# Spike — Sanok (Podkarpackie · powiat sanocki)

> **Status:** spike LIVE-VERIFIED — 2026-06-28. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasta Sanoka sells municipal flats **bezprzetargowo** — direct to sitting tenants with a 30% bonifikata set by Rada Miasta resolution, under art. 34 ust. 1 pkt 3 ustawy o gospodarce nieruchomościami. The city BIP przetargi section (sanok.biuletyn.net, cid=291) runs exclusively land parcel (działki gruntowe) and commercial-space lease auctions. No *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* was found in current listings or archives going back through 2021. Housing manager SPGM (Sanockie Przedsiębiorstwo Gospodarki Mieszkaniowej) was absorbed into SPGK (Sanockie Przedsiębiorstwo Gospodarki Komunalnej) effective March 31, 2026 — no evidence it ever ran public flat auctions.

---

## 1. Sells municipal property at auction?

**Yes — land and commercial; No — flats.**

The Burmistrz Miasta Sanoka runs frequent *przetargi ustne nieograniczone* for land parcels (e.g. ul. Sanockiej, ul. Zielnej, ul. Olchowieckiej, ul. Ustrzyckiej, ul. Mazurskiej — multiple batches in 2025–2026) and commercial lease auctions (lokale użytkowe). Volume is moderate: roughly 4–8 land auctions per month with results published separately.

Municipal flats go on the **Tablica ogłoszeń** (cid=105) as *wykaz lokali mieszkalnych przeznaczonych do sprzedaży w drodze bezprzetargowej*. Example confirmed live: "Wykaz nr 2/2026 lokalu mieszkalnego przeznaczonego do sprzedaży na rzecz najemcy wraz ze sprzedażą udziału w gruncie, w drodze bezprzetargowej" — https://sanok.biuletyn.net/?bip=2&cid=105&id=1841

A 2021 esanok.pl report confirmed the mechanism: two flats (ul. Wąska 5 at ~97k PLN and ul. Traugutta 17A at ~97k PLN), both sold bezprzetargowo to tenants with 30% discount. No competing bidder allowed.

**The Starostwo Powiatowe w Sanoku** (a separate entity — powiat, not gmina) did run a przetarg ustny nieograniczony on *nieruchomości lokalowe* (powiat-owned locals, 2017). This is the county office, not the gmina, and is out of scope.

---

## 2. Where published? (hosts + boards, URLs)

| Type | Host | URL | Board |
|------|------|-----|-------|
| Przetargi (active) | sanok.biuletyn.net | https://sanok.biuletyn.net/?bip=1&cid=291 | Ogłoszenia i komunikaty > Przetargi |
| Przetargi (archive) | sanok.biuletyn.net | https://sanok.biuletyn.net/?bip=1&cid=291&bsc=T | Same, 25 pages |
| Sprzedaż nieruchomości (dedicated sub-section) | sanok.biuletyn.net | https://sanok.biuletyn.net/?bip=1&cid=301&bsc=N | Wydział Rozwoju Miasta |
| Wyniki przetargów | sanok.biuletyn.net | inline in same cid=291 list (separate articles) | Same section |
| Wykazy lokali mieszkalnych (bezprzetarg) | sanok.biuletyn.net | https://sanok.biuletyn.net/?bip=2&cid=105&id=1841 | Tablica ogłoszeń (cid=105) |
| Old/legacy BIP | bip.um.sanok.pl | https://bip.um.sanok.pl/?c=mdPrzetargi-cmPokaz-210 | Separate older system |
| SPGK (ex-SPGM) BIP | spgk.nowybip.pl | https://spgk.nowybip.pl/przetargi-i-zamowienia-publiczne | Housing manager (procurement only) |

Result notices (wyniki / informacja o wynikach) are published as separate articles in the same cid=291 section. They include parcel number, starting price, and achieved price (cena osiągnięta) inline in article body text.

---

## 3. Format + rendering

- **Platform:** biuletyn.net — a standard Polish CMS used by many gminy.
- **Rendering:** HTML, fully text-rendered. No PDF, no OCR needed. Page text is accessible via Chrome MCP `get_page_text` cleanly (confirmed LIVE).
- **Structure:** Article list (cid=291) with snippet + link to full article. Full articles contain inline text with parcel identifiers, starting price, achieved price, date, location.
- **Auth/bot blocks:** None observed. Public access, no CAPTCHA, no login.
- **SPA:** No — standard server-rendered HTML.
- **Pagination:** List uses `&strona=N` parameter but pagination appears article-ID-based (25 archive pages visible). Confirmed: at least 250 archive articles.
- **Result format:** Free-form prose, e.g. "działka nr 668/23 o pow. [...] cena wywoławcza [...] osiągnięta cena sprzedaży [...]". Scraping requires regex/NLP parse, not structured data.

---

## 4. Volume + achieved-price stream

- Land auction volume: ~4–10 auctions/month (based on 25 archive pages covering ~2+ years).
- Achieved price is published in result articles (same cid=291 board), inline in Polish prose.
- **Zero flat auction volume** — no *lokal mieszkalny* sale by przetarg found across all searches and live page reviews.
- Bezprzetargowa flat sales: very low volume (~1–3 wykazy per year based on esanok.pl 2021 example and wykaz nr 2/2026 suggesting at most 2 in 2026 so far).

---

## 5. Adapter effort + verdict

**VERDICT: NO-BUILD**

The fundamental disqualifier: Gmina Miasta Sanoka does not auction municipal flats. Flat sales are bezprzetargowe — direct to tenants only. The przetargi stream is land-only, which is outside the project's primary target (lokale mieszkalne).

**Closest analog:** None among gliwice/zabrze/bytom/krakow/tarnowskie-gory — those all have flat auction streams. Sanok is a negative example matching the "bezprzetargowa only" pattern.

**Blockers:**
- No flat auction stream exists to scrape.
- Even if land auctions were in scope, the achieved-price format is unstructured prose requiring NLP parsing.
- SPGM absorbed into SPGK (March 2026) — no dedicated housing manager publishing flat auctions.

**Risks if reconsidered:** biuletyn.net pagination is inconsistent (strona param didn't advance pages in test — archive may require crawling by article ID range). Result articles are prose-only, no structured price field.

**Sources:**
- BIP przetargi live: https://sanok.biuletyn.net/?bip=1&cid=291
- BIP archive: https://sanok.biuletyn.net/?bip=1&cid=291&bsc=T
- Bezprzetargowa flat wykaz: https://sanok.biuletyn.net/?bip=2&cid=105&id=1841
- esanok.pl 2021 flat sale article: https://esanok.pl/2021/sanok-miasto-sprzedaje-mieszkania-jaka-cena-00e7ts.html
- SPGK takeover notice: https://spgk.com.pl/2026/03/30/zawiadomienie-o-przejeciu-spolki/
- jakiwniosek.pl wykup komunalnego: https://jakiwniosek.pl/wnioski/nieruchomosci/wykup-mieszkania-komunalnego/sanok
- Starostwo powiat (out of scope): https://powiat-sanok.pl/bip/przetargi/ii-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-lokalowych-stanowiacych-wlasnosc-powiatu-sanockiego-282/
