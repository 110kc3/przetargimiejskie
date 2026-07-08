# Spike — Lubliniec (Śląskie · powiat lubliniecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Lubliniec (Urząd Miejski) sells municipal property — including **lokale mieszkalne / nieruchomości lokalowe** — via *I/II/III/IV przetarg ustny (licytacja) nieograniczony na sprzedaż*. Everything is published on the city BIP `lubliniec.bip.info.pl`, the **bip.info.pl** hosted CMS: clean server-rendered HTML, dated article lists, comma-path document URLs (`dokument,iddok,NNNNN,idmp,93,r,r`). Dedicated **"Ogłoszenia o przetargach"** board (idmp,93, 6 pages) **plus a separate "Wyniki przetargów"** results board (idmp,94) whose positive notices carry the **hammer price + buyer + bidder count** (confirmed live). No ZGM/ZBM housing manager — sales run directly by the UM Wydział Nieruchomości. Stream is land-heavy with a modest-but-recurring flat sub-stream (Częstochowska 6/34, Wojska Polskiego 3/22, Częstochowska 34, Oświęcimska 19, Paderewskiego 12/16, Mickiewicza 9/6 — several going to II/III/IV rounds). Closest analog: **Zgorzelec / Złotoryja** (identical bip.info.pl shape). No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** UM Lubliniec (Wydział Nieruchomości i Zagospodarowania Przestrzennego) runs `przetarg ustny (licytacja) nieograniczony` for sale of municipal property. Confirmed lokal / nieruchomość lokalowa sale auctions (via BIP + search index):
- ul. Częstochowska 6/34 — I przetarg ustny nieograniczony na sprzedaż **spółdzielczego własnościowego prawa do lokalu mieszkalnego**, pow. 46,20 m², KW CZ1L/00061662/4, cena wyw. 250.000 zł (iddok 22526).
- ul. Wojska Polskiego 3/22 — I przetarg ustny nieograniczony, spółdzielcze własnościowe prawo do lokalu, pow. 46,80 m², KW CZ1L/00059575/0.
- ul. Częstochowska 34, lok. nr 2 — I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej, pow. 52,20 m² (po pożarze, do remontu) (iddok 22384).
- ul. Oświęcimska 19, lok. nr 1 — I przetarg ustny, pow. 26,50 m² (iddok 13865).
- ul. Paderewskiego 12/16 — **III** przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej (iddok 24601).
- ul. Mickiewicza 9/6 — **IV** przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej (27.03.2026).

Board mix is dominated by **nieruchomości gruntowe** (land, in-scope for the wider dataset) with 4 flats + 4 dzierżawa on the current front page of 40; flat auctions cycle in/out and frequently repeat as II/III/IV przetarg when unsold. Both natural and legal persons may bid.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.info.pl CMS):** host `lubliniec.bip.info.pl`.
- Nieruchomości (parent menu): `https://lubliniec.bip.info.pl/index,idmp,19,r,r`
- **Ogłoszenia o przetargach** (announcements): `https://lubliniec.bip.info.pl/index,idmp,93,r,r` (6 pages, ~40/page)
- **Wyniki przetargów** (results): `https://lubliniec.bip.info.pl/index,idmp,94,r,r`
- Informacje o wykazach nieruchomości (wykazy): `https://lubliniec.bip.info.pl/index,idmp,95,r,r`
- Najem lokali użytkowych: `https://lubliniec.bip.info.pl/index,idmp,352,r,r`
- Document URL pattern: `dokument,iddok,NNNNN,idmp,93,r,r` (also `dokument.php?iddok=NNNNN&idmp=93&r=r`).

**Secondary mirror (non-authoritative):** city portal `lubliniec.eu` (`/nieruchomosci-na-sprzedaz`, e.g. `.../4250-i-przetarg...wojska-polskiego-3...html`) re-lists the same notices — scrape BIP, not this.

**No dedicated housing manager (ZGM/ZBM/MZBM/TBS)** publishing sales — disposal is handled by the UM directly. Contact: Wydział Nieruchomości i Zagospodarowania Przestrzennego, tel. 34 3530-100 w. 127/129, grunty@lubliniec.pl; ul. Paderewskiego 5 (auctions held in sala nr 11).

## 3. Format + rendering
- **Server-rendered HTML** — bip.info.pl hosted CMS. Article lists are dated HTML; individual notices are **inline HTML text** at `dokument,iddok,...`. Confirmed live via fetch of the announcement board, a flat announcement, and a result doc (all plain server HTML, no JS gate).
- Structured fields sit **inline in the HTML body**: adres, powierzchnia użytkowa, cena wywoławcza, wysokość postąpienia, wadium (+ termin wpłaty), data/godzina przetargu, numer KW.
- **Attachments** on notices are only `.doc/.docx` consent/oświadczenie forms (współwłasność, stan techniczno-prawny, RODO) — **not** the notice text. No scans; **no OCR needed**.
- **No SPA, no auth, no CAPTCHA** observed. Printable `dokument_druk.php?iddok=NNNNN` variant available for a clean text pass.

## 4. Volume + achieved-price stream
- **Volume:** Modest-to-healthy. Announcement board = 6 pages × ~40 ≈ **~230+ archived items**; front page alone spans 12.09.2024 → 12.06.2026. That window is ~32 land / 4 flats / 4 dzierżawa → **a few flat auctions per year**, land is the bulk (also in-scope). Repeat rounds are common (Mickiewicza 9/6 → IV, Paderewskiego 12/16 → III), so effective flat throughput is a handful of distinct units/year.
- **Achieved-price stream:** **YES — strong.** Dedicated **Wyniki przetargów** board (idmp,94) posts `Informacja pozytywna/negatywna o wyniku przetargu`. Positive docs are inline HTML carrying **cena wywoławcza, najwyższa cena osiągnięta w przetargu, liczba oferentów, nabywca** — confirmed live (iddok 27200: 552.000 zł hammer vs 400.000 zł wywoławcza, 3 oferentów, nabywca KOMTERM Sp. z o.o.). Negative flat rounds (Mickiewicza 9/6 II/III/IV) are logged too. Announcement ↔ result pairing is by address + round number.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Zgorzelec / Złotoryja** — identical **bip.info.pl** shape (`index,idmp,NN,r,r` list boards + `dokument,iddok,...` docs + separate results board). Clone that adapter; only the idmp ids change (93 announcements, 94 results, 95 wykazy).
- **CMS family:** bip.info.pl hosted BIP (server-rendered HTML; WordPress/custom-HTML family in ADAPTER-GUIDE §3 terms).
- **Effort:** **LOW.** List board (idmp,93, paginate 6) → article fetch → regex/DOM parse (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, postąpienie, wadium, date, round from "I/II/III/IV przetarg"); second pass over results board (idmp,94) for cena osiągnięta + nabywca. Classify on `lokal mieszkalny` / `nieruchomość lokalowa` / `spółdzielcze własnościowe prawo do lokalu`; drop/segregate `nieruchomość gruntowa` (land) and `dzierżawa/najem`.
- **Blockers:** None. No rate-limit/auth/CAPTCHA signals. Only watch-items: land-heavy stream (classify flats vs land), repeat-round dedup, and separate announcement vs result boards.

**VERDICT: BUILD (Low effort)** — recurring municipal flat auctions (plus high land volume) on a clean bip.info.pl server-HTML BIP with a dedicated results board publishing hammer prices; drop-in Zgorzelec/Złotoryja analog, no blockers.
