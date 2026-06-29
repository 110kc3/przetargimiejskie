# Spike — Bochnia (Małopolskie · powiat bocheński)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Low effort).

## TL;DR

Gmina Miasta Bochnia (Urząd Miasta, Wydział Gospodarki Mieniem Komunalnym i Rolnictwa — GMiR) directly conducts and publishes *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*. No separate housing manager. Announcements and result notices are both published as plain WordPress HTML posts on **bochnia.eu** — the BIP SPA mirror at bip.malopolska.pl/umbochnia returns empty HTML and is not fetchable. Volume is low (~2–4 flat auctions/year) but the format is clean, structured, and scraper-friendly. Achieved-price result notices are published in the same category feed. Closest analog: **tarnowskie-gory** (small city, generic BIP-mirror + own CMS, low volume flat auctions, Burmistrz directly).

---

## 1. Sells municipal property at auction?

**YES — confirmed flat auctions (ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych).**

Multiple live-verified examples found:

- *II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 przy ul. Murowianka 1* — 43.89 m², cena wywoławcza 136 800 zł, wadium 14 000 zł, auction date 2024-01-12.  
  URL: https://bochnia.eu/ii-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-1-przy-ul-murowianka-1-w-bochni/

- *I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 przy ul. Jana Achacego Kmity 4* — announced Dec 2024.  
  URL: https://bochnia.eu/en/i-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-polozonego-w-bochni-przy-ul-jana-achacego-kmity-4/

- *Przetargi na lokale mieszkalne nr 5 i 13 w domu wielolokalowym przy ul. Ignacego Kraszewskiego 12* — two flats (58.26 m² and 25.73 m²), auction 2018-04-13.  
  URL: http://bochnia.eu/przetargi-na-lokale-mieszkalne-nr-5-i-13-w-domu-wielolokalowym-przy-ul-ignacego-kraszewskiego-12-w-bochni/

Publisher: **Burmistrz Miasta Bochnia** acting under art. 39 ust. 1 ustawy o gospodarce nieruchomościami + Rozporządzenie RM z 14 września 2004 r. Internal handling unit: Wydział GMiR, pokój 119, tel. 14 614-91-46.

The city also sells undeveloped land (działki) and rents premises, but flat sales via open auction are confirmed present. No evidence of a blanket *bezprzetargowy* policy for flats — the Council passes individual uchwały authorising each sale (e.g. Uchwała Nr XLIII/403/18 for Murowianka 1 flat), then the auction proceeds publicly.

---

## 2. Where published? (hosts + boards, URLs)

### Announcement board (ogłoszenia)

| Host | URL | Fetchable? |
|------|-----|-----------|
| **bochnia.eu** (WordPress CMS) | https://bochnia.eu/kategorie/komunikaty-i-ogloszenia/ | YES — plain HTML, no auth |
| bip.malopolska.pl/umbochnia (SPA mirror) | https://bip.malopolska.pl/umbochnia,m,113167,zamowienia-publiczne-ogloszenia.html | NO — SPA returns empty HTML |

Individual auction posts follow the slug pattern:  
`https://bochnia.eu/{ordinal}-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-{nr}-przy-ul-{street}/`

Physical notice also posted on the bulletin board at Urząd Miasta Bochnia, ul. Kazimierza Wielkiego 2, 32-700 Bochnia.

### Result notices (wyniki przetargów)

Published in the **same category** on bochnia.eu — "Komunikaty i ogłoszenia":

- *Wyniki II przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 przy ul. Floris 3* — 2024-07-02, flat 44.84 m², cena wywoławcza 180 000 zł, result: **negatywny (brak oferentów)**.  
  URL: https://bochnia.eu/wyniki-ii-przetargu-ustnego-nieograniczonego-na-sprzedaz-lokalu-nr-2-przy-ul-floris-3/

The BIP SPA "Wyniki przetargów" board at https://bip.malopolska.pl/umbochnia,m,113181,wyniki-przetargow.html returns empty.

**Canonical fetchable source: bochnia.eu only.**

---

## 3. Format + rendering

- **Platform:** WordPress (Slider Revolution theme, generator confirmed in meta tags).
- **Post format:** Plain HTML article, no PDF attachment for the announcement text. All key fields (address, area m², cena wywoławcza, wadium, auction date/time/location) are in the post body as inline text.
- **Encoding:** UTF-8, `text/html`.
- **JavaScript dependency:** Navigation menus use JS, but article body content is present in raw HTML — no JS required to read the data.
- **No auth/bot block detected** — both pages fetched successfully on first attempt.
- **Images:** No property photos (nophoto placeholder image), so no OCR needed.
- **Result notices:** Same format. The achieved price is stated inline when the auction succeeds; when it fails, the text reads "wynik negatywny z uwagi na brak oferentów".
- **RSS feed:** WordPress standard feed exists at `https://bochnia.eu/feed/` (timed out on direct fetch but structurally expected for a WP site; category feed likely at `?cat=komunikaty-i-ogloszenia`).

**Parse strategy:** HTTP GET on the category archive page, iterate paginated posts (`/page/N/`), filter by slug keywords `przetarg` + `lokal-mieszkalny` OR `wyniki`, parse article body with CSS selectors or regex.

---

## 4. Volume + achieved-price stream

**Volume (flat auctions):** Low — approximately 2–5 flat auctions per year based on evidence from 2018, 2023, 2024. The "Komunikaty i ogłoszenia" category has 107 pages total (covering all announcement types). Flat auctions are a small fraction; land/dzierżawa posts also appear.

**Achieved-price stream:**
- Result notices (wyniki) are published on bochnia.eu in the same category, following the pattern `wyniki-{ordinal}-przetargu-...`
- In at least two observed cases the auction ended negatively (brak oferentów), suggesting low demand. When sold, the achieved price would appear inline in the wyniki post.
- There is **no dedicated wyniki board** apart from the bochnia.eu category feed and the (unfetchable) BIP SPA.

**Implication:** Because many flat auctions end negatively (repeat I → II przetarg pattern), the achieved-price data stream will be sparse. This is low signal density but the data is structurally present and parseable when it occurs.

---

## 5. Adapter effort + verdict

**Closest analog:** tarnowskie-gory (small city, Burmistrz publishes flat auction announcements directly on own CMS, no housing-manager intermediary, low volume, clean HTML).

**Adapter design:**

1. Poller: paginated GET on `https://bochnia.eu/kategorie/komunikaty-i-ogloszenia/page/{N}/` — iterate until no new posts.
2. Filter: slug or title contains `przetarg` AND (`lokal-mieszkalny` OR `lokalu-mieszkalnego` OR `lokale-mieszkalne`), OR `wyniki` + `przetarg`.
3. Parser: extract structured fields from article HTML — address (`przy ul.`), area (`m2`), cena wywoławcza (PLN), wadium, date/time.
4. Result linker: pair each ogłoszenie with its wyniki post by unit number + street.

**Blockers:** None structural. No auth, no SPA JS dependency, no PDFs.

**Risks:**
- Low volume (~3/year) — limited ROI but zero incremental cost once the bochnia.eu poller is built.
- "Negatywny" auctions are common → achieved-price data will be sparse/null.
- No RSS confirmed (feed timed out); must rely on paginated HTML scrape.
- The BIP SPA mirror is useless for fetching — must not use bip.malopolska.pl for this city.

**Verdict: BUILD — Low effort.** The WordPress CMS is clean, fetchable, and requires no special handling. Plugs directly into a standard paginated-HTML poller identical to other small Małopolska cities. Volume is low but non-zero, and both announcement and result streams are in one place.
