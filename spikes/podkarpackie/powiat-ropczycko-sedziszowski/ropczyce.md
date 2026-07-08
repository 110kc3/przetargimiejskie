# Spike — Ropczyce (Podkarpackie · powiat ropczycko-sędziszowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD — flats are tenant-first (TBS, bonifikaty); only a sporadic leftover flat reaches open auction, and the current scrapeable board is 100% land.

## TL;DR
Gmina Ropczyce (miejsko-wiejska, town seat) publishes property notices on the city BIP `ropczyce.bip.net.pl`, which runs the **Nefeni / bip.net.pl** hosted CMS — clean server-HTML with a dedicated two-board structure (`/kategorie/143` ogłoszenia o zbyciu + `/kategorie/142` wyniki), article stubs + born-digital PDF attachments. Technically this is a Low/Medium adapter. BUT the flat-auction stream is too thin: the municipal housing stock is managed by **TBS Ropczyce sp. z o.o.** (gmina sole shareholder) and sold **bezprzetargowo na rzecz najemcy** with bonifikaty (2009 uchwała). Flats DID historically reach *ustny przetarg nieograniczony* (Grunwaldzka 1/9, 1/4, 2/22 across I+II rounds, Kościuszki 1/14) — but that evidence is only in Google's cache of the **retired legacy host** `bip.ropczyce.eu`; on the current live board the entire announcement + results stream is **land only** (działki via rokowania). Classic Podkarpackie skew: tenant pre-emption + land at auction → NO-BUILD.

## 1. Sells municipal property at auction?
**Land: YES. Flats: mostly bezprzetargowo (tenant), only a sporadic leftover to open auction.**
- The live `Ogłoszenia o zbyciu nieruchomości` board carries only **land** — e.g. *Ogłoszenie o rokowaniach na sprzedaż nieruchomości gruntowej — działki 706/3, 707/5 — Ropczyce-Witkowice*; działki 706/2, 707/4; działka zabudowana 492/5 — Okonin (all 2026-06-17, negotiations after prior failed auctions). No flats on the current board.
- Municipal housing is managed by **TBS Ropczyce sp. z o.o.** (Towarzystwo Budownictwa Społecznego, gmina = sole shareholder; ~43,286 m² managed incl. Ropczyce + Sędziszów Małopolski). Sale of communal flats is governed by a 2009 Rada Miejska uchwała providing tenant **bonifikaty** — i.e. flats go **bezprzetargowo na rzecz najemcy** first.
- Flats DID reach *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* historically (leftovers the tenant declined): **Grunwaldzka 1/9, Grunwaldzka 1/4, Grunwaldzka 2/22 (I i II przetarg), Kościuszki 1/14** — but this is a thin trickle from essentially one apartment block, and it is only visible via Google's cache of the OLD host (`bip.ropczyce.eu`), NOT on the current scrapeable board.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Nefeni / bip.net.pl CMS):** `https://ropczyce.bip.net.pl`
- Przetargi (parent): `https://ropczyce.bip.net.pl/kategorie/135-przetargi?lang=PL`
- Ogłoszenia o zbyciu nieruchomości (announcements): `https://ropczyce.bip.net.pl/kategorie/143-ogloszenia-o-zbyciu-nieruchomosci?lang=PL`
- Informacja o wynikach przetargów (results): `https://ropczyce.bip.net.pl/kategorie/142-informacja-o-wynikach-przetargow?lang=PL`
- Article URL shape: `/kategorie/143-.../artykuly/NNN-<slug>?lang=PL` (e.g. `.../artykuly/633`, results `.../artykuly/500-wynik-przetargu-dzialka-7063-7075-w-ropczycachwitkowicach`).
- CMS footer: **"CMS & Hosting: Nefeni Sp. z o.o."** (bip.net.pl family).

**Retired legacy host:** `bip.ropczyce.eu` — **301-redirects** to `ropczyce.bip.net.pl`, and the legacy `?c=NNN` deep-links (e.g. `?c=347` Przetargi 2021, `?c=468` 2025, `?c=527` 2026, `?c=237` wykazy, `?c=239`) are **NOT honored** by the new CMS — they all resolve to the generic homepage. So the old flat-auction archive (Grunwaldzka/Kościuszki) that Google still indexes is effectively unreachable on the live site.

Housing manager: **TBS Ropczyce sp. z o.o.** (`tbs-ropczyce.pl`). Also present but out of scope: Spółdzielnia Mieszkaniowa w Ropczycach (`sm-ropczyce.com`, cooperative, not gmina stock).

## 3. Format + rendering
- **Server-rendered HTML** (Nefeni bip.net.pl) — no SPA/JS gate, no auth, no CAPTCHA. `/kategorie/` + `/artykuly/` scheme with per-page size selector (10/25/50/100).
- Article body = **thin HTML stub (title + date) + born-digital PDF attachments**: the ogłoszenie PDF (e.g. `rokowania 706_3-RW.pdf`), an application form (PDF+DOCX), and a map (PNG). Result notices are the same shape — title stub + a `wynik przetargu ....pdf` (e.g. 165 KB born-digital PDF).
- So the substantive data (cena wywoławcza, wadium, powierzchnia, and the achieved price) lives **inside born-digital PDFs** → needs `pdfText` on both boards. OCR unlikely needed.

## 4. Volume + achieved-price stream
- **Volume (flats):** effectively **~0 on the live board.** Current announcement + results boards are 100% land (a few działki/year via rokowania). Historical flat auctions cluster around one building (Grunwaldzka) with repeat I/II rounds — a handful of units over multiple years, tenant-first. Not a recurring, standalone flat-auction stream.
- **Achieved-price stream:** YES structurally — dedicated `Informacja o wynikach przetargów` board (`/kategorie/142`) publishes `wynik przetargu` notices with cena osiągnięta / nabywca — but **inside PDF attachments**, and currently for land only.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** bip.net.pl / Nefeni two-board gmina (dedicated announcements + results categories, `/kategorie/NN` list → `/artykuly/NN` stub + PDF). A WordPress/custom-HTML-family clone with `pdfText` (ADAPTER-GUIDE §3).
- **CMS family:** Nefeni bip.net.pl (server-HTML; born-digital PDF payloads).
- **Effort if built:** Low/Medium tech (clean scrapeable board), but blocked on **content**, not code.
- **Blockers (why NO-BUILD):**
  1. Flat volume on the live scrapeable board is ~0 — flats go **bezprzetargowo na rzecz najemcy** (TBS-managed, bonifikaty); only sporadic leftovers ever hit open auction.
  2. The only concrete flat-auction evidence (Grunwaldzka/Kościuszki) is stale Google cache of the **retired** `bip.ropczyce.eu`; legacy `?c=` deep-links are dead on the new CMS, so there's no live/backfillable flat stream to scrape.
  3. Matches the heavy Podkarpackie NO-BUILD pattern (tenant pre-emption + land-only at auction).
- **Re-check trigger:** if a flat cluster reappears on `/kategorie/143` (watch for `lokal mieszkalny` / Grunwaldzka), revisit — the CMS itself is easy.

**VERDICT: NO-BUILD** — Ropczyce sells communal flats bezprzetargowo to tenants (TBS + bonifikaty); the live BIP board is land-only and the historical open flat auctions are a thin, now-unreachable trickle. Clean Nefeni bip.net.pl CMS, but no recurring open flat-auction volume to justify an adapter.
