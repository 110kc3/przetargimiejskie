# Spike — Środa Wielkopolska (Wielkopolskie · powiat średzki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low–Medium effort).

## TL;DR
Gmina Środa Wielkopolska (miejsko-wiejska; Urząd Miejski w Środzie Wielkopolskiej) sells municipal property — **including lokale mieszkalne** — via *przetarg ustny nieograniczony na sprzedaż*. Notices are published on the city BIP `bip.umsroda.pl`, which runs the **IDcom.pl** hosted CMS (footer "Realizacja: IDcom.pl") — clean server-rendered HTML, dated article lists, stable `/wiadomosci/<dzial>/wiadomosc/<id>/<slug>` and `/struktura/1/<node>/dokumenty/<lista>/lista/<n>` URLs. A dedicated **"Ogłoszenia o przetargach"** board plus a separate **"Wyniki przetargów"** board (with `informacja o wyniku przetargu` / achieved price) plus a **"Wykazy nieruchomości"** board. Volume is low-to-modest and land-dominated, but flat auctions recur (Górki 7/2, Daszyńskiego 20/14, Westerplatte 9/13 I+II, Brzeziak 1/2 Dębicz confirmed). Closest analog: **Gniezno** (same voivodeship, identical IDcom.pl BIP). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Urząd Miejski (Burmistrz Miasta Środa Wielkopolska) runs `przetarg ustny nieograniczony` for sale of municipal property. Confirmed lokal-mieszkalny sale auctions (via search index + live BIP fetch):
- **ul. Górki 7 / lokal nr 2** — I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego; pow. użytkowa 36.10 m² (+ piwnica 7.0 m², pomieszczenie gospodarcze 9.3 m²); cena wywoławcza 80 000 zł, wadium 8 000 zł, przetarg 14.01.2022. (Fetched live — inline HTML.)
- **ul. Daszyńskiego 20 / lokal nr 14** — przetarg na sprzedaż lokalu mieszkalnego, pow. 36.80 m².
- **ul. Westerplatte 9 / lokal nr 13** — I i II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego (II przetarg dated 29.01.2026 — recent, active cycle).
- **Brzeziak 1/2, Dębicz** — pustostan (vacant flat) w budynku dwulokalowym, ogłoszenie 19.11.2025.

The active "Ogłoszenia o przetargach" board on the spike day carried mostly land (nieruchomości niezabudowane — Lotnicza, Strzelecka, Chocicza) + the Westerplatte 9/13 flat — i.e. flats cycle in/out among a land-heavy stream. Both natural and legal persons may bid; 10% wadium.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (IDcom.pl CMS), host `bip.umsroda.pl`:**
- Ogłoszenia o przetargach (announcements): `https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/lista/1`
- Ogłoszenia Burmistrza Miasta (obwieszczenia i ogłoszenia — carries przetarg wyciągi + flat notices): `https://bip.umsroda.pl/wiadomosci/14420/ogloszenia_burmistrza_miasta_sroda_wielkopolska`
- Wyniki przetargów (results / informacja o wyniku — achieved price): `https://bip.umsroda.pl/struktura/1/2911/dokumenty/archiwum/14925/...` and `https://bip.umsroda.pl/struktura/1/2912/dokumenty/14925/...` (dokumenty node 14925)
- Wykazy nieruchomości w Gminie Środa Wielkopolska (pre-auction property lists): `https://bip.umsroda.pl/wiadomosci/14660/wykazy_nieruchomosci_w_gminie_sroda_wielkopolska`
- Article URL pattern: `/wiadomosci/<dzial>/wiadomosc/<id>/<slug>` (e.g. `.../14420/wiadomosc/601246/...`); board pattern `/struktura/1/<node>/dokumenty/<lista>/lista/<n>`.

Contact: Urząd Miejski, ul. Daszyńskiego 5, 63-000 Środa Wielkopolska, tel. 61 286 77 00.

**No dedicated housing manager (ZGM/TBS) stream needed** — flats are sold directly by the Urząd (Burmistrz) via przetarg ustny, published on the city BIP. A legacy archive host exists (`srodawlkp.biuletyn.net` / archiwumbip) but the authoritative current source is `bip.umsroda.pl`.

## 3. Format + rendering
- **Server-rendered HTML** — IDcom.pl hosted CMS. Article lists are dated HTML; individual notices are inline HTML documents (confirmed live: Górki 7/2 wyciąg rendered as inline HTML, all fields present in text — no PDF gate).
- **No SPA, no auth, no CAPTCHA** observed. Year-based filtering (2021–2026) + pagination (~18 pages of notices in Ogłoszenia Burmistrza).
- Full ogłoszenia are typically inline HTML text; some notices may attach a **born-digital PDF** wyciąg — handle with `pdfText` if encountered (OCR unlikely on this CMS).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest, land-dominated. A handful of property auctions/year; flat auctions recur but are a minority (~a few flats/year, some as II przetarg when unsold — e.g. Westerplatte 9/13 went to II round).
- **Achieved-price stream:** YES — a dedicated **"Wyniki przetargów"** board publishes `informacja o wyniku przetargu` notices (cena osiągnięta / nabywca, or wynik negatywny). Announcement board carries `cena wywoławcza`; results board carries the hammer price. Both parseable from server HTML. Also a Wykazy board for pre-auction listings.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Gniezno** (Wielkopolskie, identical `bip.*.pl` IDcom.pl CMS) — same `/wiadomosci/<dzial>/wiadomosc/<id>` + `/struktura/.../dokumenty/.../lista/<n>` shape and separate wyniki board. Clone that adapter shape. Other IDcom.pl analogs in the ledger: Nisko, Łask, Słubice, Końskie, Mława, Pruszcz Gdański, Tczew, Mogilno.
- **CMS family:** IDcom.pl hosted BIP (server-rendered HTML; plain HTML article/list family in ADAPTER-GUIDE §3 terms).
- **Effort:** **LOW–MEDIUM.** List board (dokumenty 14926) → article fetch → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round I/II); second pass over Wyniki board (dokumenty 14925) for cena osiągnięta. Must **classify + filter** the land-heavy stream to isolate lokale mieszkalne (land also in-scope for the wider dataset). Optionally crawl year filters for bounded backfill.
- **Blockers:** None. No rate-limit/auth/CAPTCHA signals. Watch-items: (a) separate announcement vs results boards; (b) land-dominated mixed stream (flats are the minority — classify carefully); (c) legacy `biuletyn.net` archive host for pre-2021 backfill if ever needed.

**VERDICT: BUILD (Low–Medium effort)** — recurring municipal flat auctions on a clean IDcom.pl server-HTML BIP with a dedicated results board; standard Wielkopolska IDcom analog (Gniezno), no blockers. Only friction is filtering flats out of a land-heavy stream.
