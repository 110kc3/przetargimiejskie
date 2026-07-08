# Spike — Płońsk (Mazowieckie · powiat płoński)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Miasto Płońsk (gmina miejska, ~22k — the TOWN, distinct from the rural Gmina Płońsk at `gminaplonsk.eu`) sells municipal property — including **lokale mieszkalne** — via *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*. Announcements + results are on the town BIP `umplonsk.bip.org.pl`, a **bip.org.pl-network CMS** (server-rendered HTML `/id/NNNN` lists) under *Gospodarka nieruchomościami › Przetargi*, split into per-year boards. There IS a genuine recurring open flat-auction stream WITH published hammer-price results ("informacja o wyniku przetargu") — Północna 10/22 (2023) and Młodzieżowa 23/4 (2026, incl. result). A housing manager exists (**ZGM Płońsk**, `zgmplonsk.bip.gov.pl`) but only administers/rents — it does NOT run the sales; the UM Wydział Planowania Przestrzennego i Gospodarki Nieruchomościami does. Caveats: **low flat volume (~1 open flat auction/year)** — most residential disposal is *bezprzetargowo na rzecz najemcy* at an 85% discount (policy: 1–3 units/yr) — and notice content lives inside **mixed .docx/.pdf attachments** (born-digital), so the adapter needs both docx + pdf text extraction plus flat-vs-land classification. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats, at open oral auction (low volume).** The UM Płońsk (Wydział Planowania Przestrzennego i Gospodarki Nieruchomościami, ul. Płocka 39) runs `przetarg ustny nieograniczony`. Confirmed open flat-sale auctions:
- **ul. Północna 10, lokal mieszk. nr 22** — *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*; 15.12.2023, 11:00; pow. 36,65 m² (+2,32 m² piwnica); **cena wywoławcza 183 250 zł**, wadium 18 325 zł (10%). Notice added 2023-11-14.
- **ul. Młodzieżowa 23, lokal mieszk. nr 4** — *I przetarg ustny nieograniczony*; announced 2026-02-10, **result ("informacja o wyniku") published 2026-03-27**.
- **udział w Pl. 15-go Sierpnia 2** — *I przetarg ustny nieograniczony na udział* (2024; share in a residential building, part of the Warszawska 25/27 + Pl. 15-go Sierpnia 18 communal-buildings program).

Mixed board otherwise skews to **land** (Sadyba, Różana, Zdunska 8a, Pułtuska, Rzemieślnicza 1793/44, "manhattan") and **commercial** (pawilon ul. Sienkiewicza). Most flat disposal is **bezprzetargowo na rzecz najemcy** (85% discount since 2017; ~1–3 units/yr) — so open flat auctions are the minority, ~1/year, but recurring and real.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (bip.org.pl network):** `umplonsk.bip.org.pl`
Path: *MENU PRZEDMIOTOWE › Dane publiczne › Planowanie przestrzenne i gospodarka nieruchomościami › Gospodarka nieruchomościami › Przetargi*.
- Przetargi parent node: `https://umplonsk.bip.org.pl/id/1999`
- Per-year boards (announcements **and** results interleaved on the same board):
  - 2026 — `https://umplonsk.bip.org.pl/id/2602`
  - 2025 — `https://umplonsk.bip.org.pl/id/2482`
  - 2024 — `https://umplonsk.bip.org.pl/id/2407`
  - 2023 — `https://umplonsk.bip.org.pl/id/2234`
  - 2022 — `https://umplonsk.bip.org.pl/id/2131`
  - 2021 — `https://umplonsk.bip.org.pl/id/2000`
- URL pattern: numeric `/id/NNNN` nodes; documents are file attachments (.docx/.pdf).
- Archive host: `archiw-umplonsk.bip.org.pl` (older notices).
- **Mirror / human-readable:** `plonsk.pl` (news site) republishes each notice as an *aktualność* (e.g. the Północna 10/22 flat page) and lists tenders at `https://plonsk.pl/przetargi.html`.
- Housing manager: **ZGM Płońsk**, ul. Zajazd 5 — BIP `https://zgmplonsk.bip.gov.pl/`, site `zgmplonsk.pl`. Publishes only *wykaz lokali wolnych* / najem / regulaminy — **no sale auctions** (not a data source).

**Do NOT confuse** with the rural **Gmina Płońsk** (separate JST): `gminaplonsk.eu` / `bip.gminaplonsk.eu`. Out of scope.

## 3. Format + rendering
- **Server-rendered HTML** — bip.org.pl-network CMS; `/id/NNNN` list nodes, no JS SPA, no auth, no CAPTCHA (confirmed live via fetch of the przetargi node + every year board).
- **Notice content is in attachments, and the file type is MIXED:** many announcements are **.docx** (2023 Północna/Różana/Zdunska all docx; 2024/2026 land docx), results and some newer notices are **.pdf** (Młodzieżowa result, Sienkiewicza pawilon, Pułtuska). Both are **born-digital** (text-extractable) — no scans/OCR observed.
- Adapter therefore needs **both DOCX and PDF text extraction** to reach the fields; the HTML list gives only titles + dates + file links.

## 4. Volume + achieved-price stream
- **Volume: LOW.** ~1 open flat auction/year (Północna 2023, Młodzieżowa 2026, udział 2024). The board is dominated by land parcels + occasional commercial pawilon. Residential disposal is mostly tenant bezprzetargowo sales at 85% discount, which never hit the auction board. A 2021→2026 backfill likely yields only a handful of flat auctions.
- **Achieved-price stream: YES.** *Informacja o wyniku (I) przetargu ustnego nieograniczonego* documents are published on the same year boards — e.g. `informacja_wynik_pierwszego_przetargu_ustnego_nieograniczonego_ul._mlodziezowa_23_m._4` (2026), pawilon ul. Sienkiewicza (2024), ul. Pułtuska (2025), Sadyba land (2021). These carry cena osiągnięta / nabywca (or wynik negatywny), pairable to the announcement by address.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** No exact match in the guide's CMS list. Family is the **bip.org.pl network** (numeric `/id/NNNN` server-HTML nodes) — treat as a new bip.org.pl-network template; the crawl shape is closest to plain server-HTML gminy (brzeg/nowa-sol pattern), but with **attachment-based content** rather than inline HTML text. Building this template has leverage — bip.org.pl is a widespread Polish BIP host, so the adapter unlocks other mazowieckie/regional gminy on the same platform.
- **Effort: MEDIUM.** Trivial part: crawl year nodes (`/id/2000`…`/id/2602`, discover new years off `/id/1999`), collect title+date+file link. Real work: **fetch each .docx/.pdf attachment and extract** address (parseAddress), pow. użytkowa, cena wywoławcza, wadium, date, round; **classify** flat vs land vs pawilon/udział to keep flats; second pass over *informacja o wyniku* docs for cena osiągnięta, joined by address. Mixed docx+pdf extraction is the main lift.
- **Blockers:** None technical (no rate-limit/auth/CAPTCHA). Watch-items: (1) thin flat volume → marginal standalone ROI, best batched with other bip.org.pl gminy; (2) docx + pdf both required; (3) results interleaved on year boards (no dedicated results board) — pair by address.

**VERDICT: BUILD (Medium effort)** — recurring OPEN flat auctions on a clean bip.org.pl-network server-HTML BIP, WITH a published achieved-price ("informacja o wyniku") stream and a named housing manager (ZGM). Low flat volume and mixed docx/pdf attachment parsing are the only downsides; both are surmountable and the bip.org.pl template is reusable, so the go-signal holds.
