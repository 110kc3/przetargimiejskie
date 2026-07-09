# Spike — Wołów (Dolnośląskie · powiat wołowski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Wołów (miejsko-wiejska; Urząd Miejski w Wołowie, Rynek 34) sells municipal property — including **lokale mieszkalne** — via `I/II/III ustny przetarg nieograniczony na sprzedaż`. The authoritative, machine-readable surface is the **city portal `wolow.pl`**, which runs **SkyCMS** (netkoncept.com): clean server-rendered HTML, dated articles, numeric article/category URLs (`/NNN/CAT/slug.html`), with `cena wywoławcza` / `wadium` / area / round rendered inline as static text. A parallel BIP mirror at `bip.wolow.pl` (`m,105,ogloszenia-o-przetargach-na-sprzedaz.html`) exists but is JS-gated on fetch — **use `wolow.pl` instead** (same content, server-rendered). Confirmed recurring flat auctions (Wojska Polskiego 17/2, Komuny Paryskiej 41, Lubiąż, Tarchalice); achieved prices are published (e.g. Prawików wylicytowano 84 200 zł). Mixed board (flats + land + działki), low-to-modest volume. Closest analog: the **SkyCMS/netkoncept** adapters already in-repo — **Olesno** / **Prudnik** (opolskie). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Burmistrz Wołowa runs `ustny przetarg nieograniczony` for sale of municipal property; flats are an explicit, recurring category. Confirmed lokal-mieszkalny auctions:
- **ul. Wojska Polskiego 17/2** — I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego; 38,63 m² (+0,59 m² pom. przynależne), parter 2-izbowy; **cena wywoławcza 77 000,00 zł**, wadium 7 700,00 zł.
- **ul. Komuny Paryskiej 41/1** — lokal mieszkalny 39,47 m², przetarg wyznaczony na 30.06.2026 (recent, confirms live 2026 flat volume).
- **Lubiąż** (sołectwo gm. Wołów) — mieszkanie na sprzedaż w wykazie/przetargu.
- **Tarchalice** — lokal mieszkalny + działki (kuriergmin, przetargi gm. Wołów).

Also land/działki (ul. Polna dz. 8/12, ul. Polna cena wyw. 80 000 zł, Pełczyn dz. 234/3 III przetarg) — so the stream is mixed property, flats cycle in and out. Both natural and legal persons may bid; 10% wadium. (NB: `bip.powiatwolowski.pl/przetargi-nieruchomosci` is the **Starostwo Powiatowe** — county property, separate JST, out of scope.)

## 2. Where published? (hosts + boards, URLs)
**Primary — city portal `wolow.pl` (SkyCMS, server-rendered, USE THIS):**
- Przetargi na sprzedaż nieruchomości listing (category): `https://wolow.pl/115/` (segment `/115/` = ogłoszenia o przetargach na sprzedaż; individual notices carry it as `/NNN/115/slug.html`).
- Example flat notice: `https://wolow.pl/466/i-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-polozonego-w-wolowie-ul-wojska-polskiego-172-dz-nr-946-am-34.html`
- Example land notice: `https://wolow.pl/801/115/i-ustny-przetarg-nieograniczony-na-sprzedaz-nieruchomosci-polozonej-w-wolowie-ul-polna-dz-nr-812-am-25.html`
- URL pattern: `wolow.pl/<idart>/<idcat>/<slug>.html` (or `/<idart>/<slug>.html`), `Data publikacji: DD-MM-YYYY HH:MM` metadata inline.

**Mirror — BIP `bip.wolow.pl`:**
- Ogłoszenia o przetargach na sprzedaż: `http://bip.wolow.pl/m,105,ogloszenia-o-przetargach-na-sprzedaz.html`
- Sprzedaż nieruchomości (parent): `https://bip.wolow.pl/m,20,sprzedaz-nieruchomosci.html`
- URL pattern `m,NN,slug.html` / `Article/id,NN.html`. **JS-gated on WebFetch (only nav renders)** — prefer `wolow.pl`, which is plain server HTML.

Contact: Wydział Geodezji i Gospodarki Nieruchomościami, tel. 71 319 13 24 / 71 319 13 15; wykazy wywieszane 21 dni na tablicy UM (Rynek 34, oficyna B).

## 3. Format + rendering
- **Server-rendered HTML** — `wolow.pl` = **SkyCMS** (footer: "Projekt i realizacja: netkoncept.com — SkyCMS strony i portale internetowe"). Notices are inline HTML text; fields (`cena wywoławcza`, `wadium`, `powierzchnia`, VAT note, round, auction date) confirmed rendered as static text on two live fetches (Wojska Polskiego 17/2; Polna 8/12).
- **No SPA gate, no auth, no CAPTCHA** on `wolow.pl`. (The `bip.wolow.pl` mirror is JS-rendered — avoid.)
- Some longer notices may attach a born-digital PDF; handle with `pdfText` if encountered (OCR unlikely). Printable/clean text otherwise available.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. A handful of property auctions/year across the mixed board (flats + land + działki rolne). Flats recur but are not high-frequency (~a few/year, some as II/III przetarg when unsold). 2021 and 2026 flat notices both present → sustained multi-year stream.
- **Achieved-price stream:** YES. `Informacja o wyniku przetargu` notices are published with `cena wylicytowana / nabywca` (e.g. Prawików gm. Wołów — wylicytowano **84 200,00 zł**). Announcement carries `cena wywoławcza`; result notice carries the hammer price. Both parseable from `wolow.pl` server HTML (same category / result articles).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **SkyCMS / netkoncept.com** family — clone the in-repo **Olesno** / **Prudnik** (opolskie) adapters (identical CMS: numeric `/idart/idcat/slug.html` articles, inline HTML fields, `Data publikacji` metadata).
- **CMS family:** SkyCMS hosted municipal portal (server-rendered HTML; ADAPTER-GUIDE §3 "custom-HTML/plain article" family).
- **Effort:** **LOW–MEDIUM.** Category listing (`/115/`) → article fetch → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round, VAT); second pass for `informacja o wyniku` result articles → cena wylicytowana. Filter out land/działki/dzierżawa where flats are the target (land also in-scope for the wider dataset). Slight bump over pure-LOW because przetargi + results share the mixed category and need classification, and the BIP mirror is unusable (must scrape the SkyCMS portal, not the BIP).
- **Blockers:** None. No rate-limit/auth signals on `wolow.pl`. Watch-items: (1) scrape `wolow.pl` not `bip.wolow.pl` (JS gate); (2) classify flat vs land in a mixed stream; (3) don't ingest `bip.powiatwolowski.pl` (county, different JST).

**VERDICT: BUILD (Low–Medium effort)** — recurring municipal flat auctions with published achieved prices on a clean SkyCMS server-HTML city portal; direct Olesno/Prudnik (netkoncept SkyCMS) analog; only nuance is scraping the portal instead of the JS-gated BIP mirror and classifying a mixed flat/land stream.
