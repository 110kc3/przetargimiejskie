# Spike — Rawa Mazowiecka (Łódzkie · powiat rawski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miasto Rawa Mazowiecka (Urząd Miasta) sells municipal property — **including lokale mieszkalne** — via *ustny przetarg nieograniczony na sprzedaż*. Confirmed live: three flats (lokale mieszkalne nr 1, 4, 5) on działka 308/13, obręb 4, ul. Reymonta, sold at open oral auction 22.10.2024 (ceny wywoławcze 110 000 / 87 000 / 53 000 zł, wadium 20k/16k/10k), with a matching *informacja o wyniku przetargów* published afterward. Announcements and results live on the city BIP `bip.rawamazowiecka.pl`, which runs the **bip.net (Extranet)** hosted CMS, v7.32 — clean server-rendered HTML with inline notice text plus born-digital PDF attachments. Year-partitioned boards (`przetargi-2024`, `przetargi-2025`) + a separate year-partitioned results section. Volume low-to-modest, mixed with land/lokale użytkowe (najem). Closest analog: **Golub-Dobrzyń** (bip.net v7 server-HTML, achieved price+buyer on result pages). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Urząd Miasta Rawa Mazowiecka runs `ustny przetarg nieograniczony` for sale of municipal property, and flats are an explicit recurring category (not only bezprzetargowo na rzecz najemcy):
- **ul. Reymonta / działka 308/13, obręb 4** — *ustne przetargi nieograniczone na sprzedaż trzech lokali mieszkalnych* nr 1 (40 m², 110 000 zł), nr 4 (31,28 m², 87 000 zł), nr 5 (31,88 m², 53 000 zł); auction 22.10.2024; wadium 20 000 / 16 000 / 10 000 zł. (`redir,3496?tresc=32411`.) A matching **informacja o wyniku przetargów na zbycie lokali mieszkalnych nr 1, 4 i 5** was published in the 2024 results section.
- The board also carries land sales (*ustny przetarg nieograniczony na sprzedaż nieruchomości* — ul. Mszczonowska, ul. Biała, obręb 2), *ustny przetarg ograniczony* to adjacent-property co-owners, and lokale użytkowe **na najem** (Pl. Piłsudskiego 7, 15-yr lease) — i.e. flat auctions cycle in and out of a mixed property stream.

**Disambiguation:** target is the **town** Gmina Miasto Rawa Mazowiecka → `bip.rawamazowiecka.pl`. The rural **Gmina Rawa Mazowiecka** (separate JST, e.g. flat in wieś Podlas) publishes at `bip.rawam.ug.gov.pl` — OUT OF SCOPE. The **Starostwo Powiatowe** (`bip.powiatrawski.pl`) runs Skarb Państwa/powiat property and physically hosts some city auctions at Pl. Wolności 1 — also a distinct publisher.

Housing manager: **Rawskie Towarzystwo Budownictwa Społecznego Sp. z o.o.** (`bip.rawskie-tbs.akcessnet.net`, akces­net/Nefeni CMS) — a TBS that manages/builds rental stock and runs its own *sprzedaż lokali mieszkalnych* announcements, but the in-scope open municipal flat auctions are published by the Urząd Miasta on the city BIP.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.net / Extranet CMS):**
- Przetargi hub: `https://bip.rawamazowiecka.pl/1311,przetargi`
- Announcements 2025: `https://bip.rawamazowiecka.pl/3648,przetargi-2025`
- Announcements 2024: `https://bip.rawamazowiecka.pl/3496,przetargi-2024`
- Results (year-partitioned; e.g. 2024): `https://bip.rawamazowiecka.pl/3477,2024` (informacja o wyniku przetargu)
- Document/notice URL pattern: `redir,<boardId>?tresc=<NNNNN>` (e.g. `redir,3496?tresc=32411`, `redir,3648?tresc=33629`). Boards are `/<NNNN>,<slug>`.

**Do NOT confuse:** rural Gmina Rawa Mazowiecka = `bip.rawam.ug.gov.pl`; Starostwo = `bip.powiatrawski.pl`; Rawskie TBS = `bip.rawskie-tbs.akcessnet.net`. Our target is `bip.rawamazowiecka.pl` (UM Rawa Mazowiecka).

## 3. Format + rendering
- **Server-rendered HTML** — bip.net 7.32 (Extranet). Board lists are dated HTML link lists; individual notices are HTML documents at `redir,<board>?tresc=<id>` with the full auction text inline (address, powierzchnia użytkowa, cena wywoławcza, wadium, date, round all confirmed present in-band).
- **Born-digital PDF attachments** — some notices attach the full ogłoszenie as a text PDF (e.g. *ogłoszenie o przetargu lokale Reymonta 11.pdf*). Handle with `pdfText`; OCR unlikely on this CMS.
- **No SPA, no auth, no CAPTCHA** observed. Plain server HTML fetched successfully.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. A handful of property auctions per year on a mixed board (flats + land + lokale użytkowe na najem). Flats recur but are not high-frequency — 2024 alone yielded a batch of 3 lokale mieszkalne (Reymonta); expect ~a few flats/year, some as II/III przetarg when unsold.
- **Achieved-price stream:** YES — a separate year-partitioned **results section** (e.g. `3477,2024`) publishes *informacja o wyniku przetargu* notices, including the Reymonta lokale mieszkalne nr 1/4/5 result. Announcement carries `cena wywoławcza`; result page carries the outcome/nabywca. Both parseable from server HTML (analog Golub-Dobrzyń shows achieved price + buyer on result pages).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Golub-Dobrzyń** (bip.net v7, server-rendered HTML, `/<NNNN>,slug` boards + `redir,...?tresc=` docs, achieved price+buyer on result pages) — clone that shape. Same CMS family as the built dual-publisher pattern; also comparable to Lubaczów/other bip.net (extranet.pl) profiles (server-HTML + born-digital text-PDFs).
- **CMS family:** bip.net / Extranet hosted BIP → "WordPress / custom HTML" bucket in ADAPTER-GUIDE §3 terms (plain HTML lists/articles + text PDFs).
- **Effort:** **LOW.** Crawl year boards (`3648`, `3496`, …) → article fetch (`redir,<board>?tresc=<id>`) → regex/DOM parse (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round); fall back to `pdfText` on attached ogłoszenie PDFs; second pass over year results sections (`3477,…`) for the achieved-price/nabywca stream. Classify + drop land / dzierżawa / najem (lokale użytkowe) where flats are the target (land also in-scope for the wider dataset).
- **Blockers:** None. No rate-limit/auth signals. Watch-items: (a) year-partitioned boards need enumeration/rollover each January; (b) mixed property/land/lease stream needs classification; (c) confirm the exact results-board slug pattern beyond 2024 on first crawl.

**VERDICT: BUILD (Low effort)** — recurring open municipal flat auctions (Reymonta lokale mieszkalne, confirmed announcement + result) on a clean bip.net/Extranet server-HTML BIP with a separate results stream; standard Golub-Dobrzyń analog, no blockers.
