# Spike — Ostrzeszów (Wielkopolskie · powiat ostrzeszowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina miejsko-wiejska Ostrzeszów disposes of municipal residential flats via **przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego** through TWO channels: (a) the Burmistrz / Wydział Gospodarki Nieruchomościami (WGN) on the city BIP `ostrzeszow.nowoczesnagmina.pl` (nowoczesnagmina CMS), and (b) a dedicated **housing manager — Zakład Gospodarki Mieszkaniowej "Z.G.M." Sp. z o.o.**, ul. Sportowa 2a, which runs its own BIP `bip.zgm-ostrzeszow.pl` (PAD CMS) with "Aktualne przetargi" / "Zakończone przetargi" boards. The housing-manager exception (Wielkopolskie seats skew NO-BUILD *except where a manager exists*) applies here: ZGM carries a **live 2026 open-flat-auction stream** (21 Stycznia 1a, Szklarka Przygodzicka 89, both 12.05.2026). Both boards are server-HTML, but flat notices + prices live in **born-digital text-PDF attachments** (land auctions, by contrast, have inline HTML tables). Volume is LOW (a few flats/yr) and there is no clean inline hammer-price board, so effort is Medium, not Low. Closest analog: a nowoczesnagmina city-BIP + secondary manager BIP, text-PDF stream à la extranet.pl/bip.net.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** Open oral auctions run under both the Burmistrz (WGN, symbol `WGN.7145.*` / `WGN.6840.*`) and the ZGM housing company. Confirmed **lokal-mieszkalny** open auctions:
- **ul. Poprzeczna 1, lok. nr 4** — I przetarg (`?a=12633`) then **II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego** (`?a=13281`), Burmistrz MiG Ostrzeszów, znak `WGN.7145.1.2020.2021` — city BIP.
- **Olszyna nr 74** — I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w budynku wielorodzinnym — city BIP.
- **ul. 21 Stycznia 1a** — przetarg na sprzedaż lokalu mieszkalnego, **ZGM**, ogł. 12.05.2026.
- **Szklarka Przygodzicka 89** — przetarg na sprzedaż lokalu mieszkalnego, **ZGM**, ogł. 12.05.2026.

Also active: land sales (`przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej` — e.g. Niedźwiedź `?a=1752`, `WGN.6840.11.2025`), dzierżawa (lease) auctions, and `wykaz` lists. Residential disposal is NOT only tenant-sale/lease/wykaz — genuine open flat auctions exist, so the NO-BUILD "~0 flat auctions" trigger is **not** met.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (nowoczesnagmina CMS):** `ostrzeszow.nowoczesnagmina.pl`
- Aktualne przetargi: `https://ostrzeszow.nowoczesnagmina.pl/?c=678`
- Przetargi na nieruchomości: `https://ostrzeszow.nowoczesnagmina.pl/?c=1274`
- Ogłoszenia: `https://ostrzeszow.nowoczesnagmina.pl/?c=667`
- Article pattern: `?a=ID` (e.g. `?a=13281`, `?a=12633`, `?a=1752`); ZGM company page `?a=13006`.
- Search: `?p=search&searchstr=lokalu+mieszkalnego` (paged via `&offset=NN`).
- PDF/document download: `index.php?action=save&bar_id=NNNN&id=NNNN&p=document` (e.g. regulamin przetargu).

**Housing manager — ZGM BIP (PAD CMS, CC-BY-SA):** `bip.zgm-ostrzeszow.pl`
- Aktualne przetargi: `https://bip.zgm-ostrzeszow.pl/index.php?c=page&id=31&s=0`
- Zakończone przetargi: `https://bip.zgm-ostrzeszow.pl/index.php?c=page&id=32&s=0` (`&s=` = page offset; ~15 pages)
- ZGM "Z.G.M." Sp. z o.o., ul. Sportowa 2a, 63-500 Ostrzeszów, tel. 62 730 11 16, zgm23@wp.pl.

**Do NOT rely on** `www.ostrzeszow.pl` (INTERmedi@ "CMS-SPI" promo site, `/asp/przetargi,346,,1`) — it only links out to BIP and to a stub `ostrzeszow.biuletyn.net/?bip=1&cid=32` (biuletyn.net). Authoritative property boards are the two above. Contact (WGN): UMiG Ostrzeszów, ul. Zamkowa 31, 63-500 Ostrzeszów.

## 3. Format + rendering
- **Server-rendered HTML** on both hosts — no SPA, no auth, no CAPTCHA. City BIP = category boards (`?c=NN`) → article pages (`?a=ID`); ZGM = `index.php?c=page&id=NN` boards.
- **Land** auctions on the city BIP are **inline HTML tables** (Położenie | Nr działki | Powierzchnia | Nr KW | Cena wywoławcza | Wadium) — cleanly parseable (confirmed on `?a=1752`).
- **Flat** auctions (the target) carry only a headline inline; **powierzchnia użytkowa, cena wywoławcza, wadium, termin are inside born-digital text-PDF attachments** on BOTH hosts (confirmed on `?a=13281` Poprzeczna II — price/area PDF-only). ZGM board notices are entirely PDF attachments ("Wszelkie informacje zostały zawarte w załącznikach poniżej").
- Extraction path: server-HTML board crawl → PDF fetch → `pdfText` (born-digital; OCR unlikely but keep a fallback).

## 4. Volume + achieved-price stream
- **Volume: LOW.** City-BIP search for "lokalu mieszkalnego" returns 110+ hits but only ~1 distinct open flat auction (Poprzeczna 1/4, cycling I→II round) amid mostly `wykaz` lists, `bezprzetargowo na rzecz najemcy` tenant sales, `użyczenie`, and lokal użytkowy. ZGM adds ~2 flats live in 2026 (21 Stycznia 1a, Szklarka Przygodzicka 89). Net ≈ a few flats/year across both channels; land auctions are more frequent.
- **Achieved-price stream: WEAK.** No dedicated inline "informacja o wyniku / cena osiągnięta" board found. ZGM's "Zakończone przetargi" board is dominated by **maintenance procurement** (roof replacements ul. Pogodnej 8 / ul. Kolejowa 47, garages, inspector oversight, Rojów school→housing conversion) — completed-tender records, not flat hammer prices, and PDF-only. Flat results, where published, are `informacja o wyniku przetargu` PDFs. Expect to derive hammer prices from PDFs, not a table.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** a nowoczesnagmina city-BIP (`?a=ID`/`?c=NN` server-HTML) plus a secondary manager BIP; text-PDF notice handling nearest the **extranet.pl/bip.net (server-HTML + text-PDF)** pattern. No exact analog in the guide's CMS list (nowoczesnagmina and PAD CMS are both new families here).
- **Effort: MEDIUM.** Two disjoint sources to crawl (nowoczesnagmina + PAD-CMS ZGM); flat prices are **PDF-bound** (born-digital `pdfText`); the ZGM board needs **procurement filtering** (drop roof/garage/nadzór/roboty); no clean results board so achieved prices come from result PDFs. Land auctions (inline HTML) are an easy bonus for the wider dataset.
- **Blockers:** None hard — Polish-IP reachable, server-HTML, no auth/CAPTCHA/rate-limit seen. Watch-items: two hosts, PDF extraction for flats, classify-and-drop tenant-sale/lease/wykaz/procurement noise.

**VERDICT: BUILD (Medium effort)** — a real housing manager (ZGM "Z.G.M." Sp. z o.o.) runs recurring open flat-sale auctions with a live 2026 stream (the Wielkopolskie housing-manager exception), on reachable server-HTML BIPs; Medium (not Low) because the flat stream is thin, split across two hosts, and price/results data is text-PDF with no inline hammer-price board.
