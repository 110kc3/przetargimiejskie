# Spike — Żywiec (Śląskie · powiat żywiecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (land + tenant sales; no open flat-auction stream).

## TL;DR
Gmina Miasto Żywiec (Urząd Miejski w Żywcu, **Wydział Geodezji, Nieruchomości i Rolnictwa**) sells municipal property on a clean, custom server-rendered BIP at `www.bip.zywiec.pl` (`/item/NNNN` articles, `/category/<slug>` boards, `/item/NNNN/print` printable variants). But the stream is **land-dominated**: `przetarg ustny nieograniczony` runs almost exclusively for *niezabudowane nieruchomości / działki* (several at a time, some as **online** auctions), plus the odd **lokal użytkowy** (ul. Ks. Słonki 24). **Lokale mieszkalne are sold bezprzetargowo na rzecz najemcy** (tenant right-of-first-refusal + bonifikata, handled by the Wydział), not at open oral auction — no flat-auction stream to scrape. There is **no dedicated municipal housing manager** publishing flat auctions: rental stock sits with **Żywieckie TBS Sp. z o.o.** (tbs.zywiec.pl), and sales are run by the city Wydział. Fails the BUILD heuristic (generic city-BIP property section skewing to land + tenant sales). Technically trivial to parse if flat volume existed — it doesn't. **NO-BUILD.**

## 1. Sells municipal property at auction?
**YES for land, essentially NO for flats.** The Urząd Miejski w Żywcu (Wydział Geodezji, Nieruchomości i Rolnictwa, Naczelnik Wojciech Gołek, Rynek 2, tel. 33 475-42-31) runs `przetarg ustny nieograniczony na sprzedaż` — but the confirmed live inventory is land:
- "Pięć przetargów ustnych nieograniczonych na sprzedaż niezabudowanych nieruchomości" (5 land plots at once) — `/item/8884`.
- Land auctions at ul. Wichrowej (`/item/8308`), ul. Norwida dz. 2240/2 (`/item/5827`), ul. Łagodnej **online** (`/item/6427`), rej. ul. Stolarskiej przy S-1 **online** (`/item/6463`).
- **Lokal użytkowy** (commercial), not residential: ul. Ks. Słonki 24 — `/item/2982`, `/item/2923`.

**Flats:** governed by *Uchwała XXXIX/302/2009* on zasady gospodarowania nieruchomościami (`/item/1856`); the Wydział "opracowuje zasady sprzedaży lokali mieszkalnych, zleca wyceny, przygotowuje protokoły i akty notarialne" — i.e. **sprzedaż bezprzetargowa na rzecz najemcy** with bonifikata (tenant right of first refusal), confirmed by the municipal wykup-mieszkania-komunalnego procedure. No `przetarg ustny na sprzedaż lokalu mieszkalnego` surfaced on the property board or via targeted site/web search. Flat auction volume ≈ **0/yr**.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (custom CMS, "Copyright 2018 © www.bip.zywiec.pl"):**
- Property board (sales + leases): `https://www.bip.zywiec.pl/category/sprzedaz-i-wydzierzawianie-nieruchomosci-1` (~30 pages; mostly `wykaz … bezprzetargowej dzierżawy` + land sale wykazy/auctions).
- Tenders board (public procurement, NOT property): `https://www.bip.zywiec.pl/category/przetargi` (~66 pages; roboty budowlane / remonty / usługi — land property auctions live under the property category, not here).
- Article pattern: `https://www.bip.zywiec.pl/item/NNNN`; printable text variant `https://www.bip.zywiec.pl/item/NNNN/print`.
- Legacy news modul view: `https://www.bip.zywiec.pl/index.php?modul=aktualnosci&kat_id=28`.
- **Online auctions** for some land run on an external e-licytacja platform (linked from the notice).

**Housing manager:** none for sales. Rental/administration → **Żywieckie TBS Sp. z o.o.** (`https://www.tbs.zywiec.pl`). No ZGM/ZBM/MZGM publishing flat auctions.

**Do NOT confuse** with the rural **Gmina Łodygowice / Gmina Żywiec (wiejska)** notices that also appear via the county — target is the town **Gmina Miasto Żywiec**.

## 3. Format + rendering
- **Server-rendered HTML** — bespoke custom CMS (not Logonet/IDcom/SmartSite/REKORD). `/item/NNNN` articles render as plain server HTML; `/item/NNNN/print` gives a clean printable text version. Category boards are dated, paginated HTML lists. No SPA, no JS gate, no CAPTCHA, no auth observed.
- Longer notices may attach a born-digital PDF (would be `pdfText`), but the notice body is inline HTML.
- If ever built, this is a `WordPress/custom HTML` bespoke server-rendered family (§3) — Low technical effort.

## 4. Volume + achieved-price stream
- **Flat auctions:** ~**0/yr**. Flats leave the municipal pool via **bezprzetargowa** tenant sales (no auction, no cena osiągnięta stream) — invisible/uninteresting to a flat-auction dataset.
- **Land auctions:** modest recurring volume (batches of działki, some online) — out of the flat scope, though in-scope for a wider land dataset.
- **Achieved-price stream:** `informacja o wyniku przetargu` notices appear on the property board for land, but **no flat results** — nothing to harvest for the flat-auction product.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** a bespoke server-HTML gmina — `brzeg` / `nowa-sol` shape (HTML article + printable variant + category boards). Trivial parse.
- **CMS family:** custom/bespoke server-rendered HTML (`/item/NNNN` + `/item/NNNN/print` + `/category/<slug>`).
- **Effort:** technically **Low** — but **no flat product to extract**, so effort is **—** for the flat-auction goal.
- **Blockers:** No technical blockers. The real blocker is **content**: no open oral flat auctions, no dedicated ZGM/ZBM/MZGM housing manager, flats sold bezprzetargowo to tenants. The auction stream is land + occasional lokal użytkowy.

**VERDICT: NO-BUILD** — clean scrapeable BIP, but Żywiec runs no open flat-auction stream (land + tenant bezprzetargowo sales; no ZGM). Revisit only if the wider dataset takes municipal *land* auctions, or if flat auctions start appearing on the property board.
