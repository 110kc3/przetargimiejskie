# Spike — Przeworsk (Podkarpackie · powiat przeworski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (land + tenant-sale skew, ~0 open flat auctions).

## TL;DR
Gmina Miejska Przeworsk (Urząd Miasta, Burmistrz) publishes property notices on the town BIP `przeworsk.bip.info.pl`, which runs the **bip.info.pl** hosted CMS (clean server-HTML article lists + `plik.php?id=NNNNN` PDF attachments — same family as the Zgorzelec/Złotoryja analogs). The town DOES run `przetarg ustny nieograniczony` for property — but the live auctions are **undeveloped land (działki)**, confirmed by PDF (Gorliczyńska dz. nr 30, 0.1086 ha, 29 000 zł; Kasprowicza). The only municipal **flat** in the current stream (Konopnickiej 19/55, 56.80 m², 317 309 zł) is a **"zasiedlony lokal mieszkalny"** disposed to the sitting tenant under statutory pre-emption (art. 34 ust. 1 pkt 1) — i.e. **bezprzetargowo na rzecz najemcy, NOT open auction**. Rest of the board is `wykaz ... do dzierżawy` (lease lists). Municipal housing sits under **Przeworski TBS Sp. z o.o.** (spółka miejska, ul. Krakowska 5), which runs its own occasional flat auctions off-BIP. No recurring open flat-auction volume → NO-BUILD.

## 1. Sells municipal property at auction?
**Land: YES. Flats at OPEN auction: effectively NO.** The Burmistrz Miasta Przeworska runs `nieograniczony ustny przetarg na sprzedaż nieruchomości`, but every live example is **land**:
- **ul. Gorliczyńska** — I ustny przetarg, działka nr 30 Obręb 2, pow. 0,1086 ha, **niezabudowana**, cena wywoławcza 29 000 zł (ogł. 01.06.2026, iddok 9971). PDF-confirmed as undeveloped plot.
- **ul. Kasprowicza** — I i II ustny przetarg na sprzedaż nieruchomości + `Informacja o wyniku` (result) — land.
- **ul. Konopnickiej 19/55** — **the one flat**: `Zasiedlony lokal mieszkalny`, 56,80 m² + piwnica 4,77 m², cena 317 309 zł, sold with `pierwszeństwo w nabyciu na podstawie art. 34 ust. 1 pkt 1` → **tenant pre-emption, bezprzetargowo**. Not an open auction.

So residential disposal here is the classic NO-BUILD shape: tenant sales + land auctions + lease `wykaz` lists. No `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` in the stream.

## 2. Where published? (hosts + boards, URLs)
**Target = Gmina Miejska Przeworsk (the TOWN)** — do NOT confuse with the rural **Gmina Przeworsk** (`przeworsk.biuletyn.net`, biuletyn.net/INTERmedi@, separate JST, out of scope).

**Town BIP (bip.info.pl CMS):** `https://przeworsk.bip.info.pl`
- **Ogłoszenia** (property notices: przetargi sprzedaż + wykazy + wyniki): `https://przeworsk.bip.info.pl/index,idmp,86,r,r`
- **Przetargi** (menu idmp,256): `https://przeworsk.bip.info.pl/index,idmp,256,r,r` — this is **public procurement** (roboty/usługi, links to ezamowienia.gov.pl), **not** property. No property here.
- Document pattern: `dokument.php?iddok=NNNN&idmp=86&r=r`; PDF attachment: `plik.php?id=NNNNN&wer=1`.
- Live examples: Gorliczyńska `dokument.php?iddok=9971` (PDF `plik.php?id=73102`); Konopnickiej flat `dokument.php?iddok=9957` (PDF `plik.php?id=73054`); Kasprowicza wynik `dokument.php?iddok=10026`.

**Housing manager:** **Przeworski TBS Sp. z o.o.**, ul. Krakowska 5, 37-200 Przeworsk (tel. 16 648 76 72 / 16 648 82 45). Runs its own flat auctions at its HQ (e.g. one at cena wyw. 242 000 zł brutto) — but those are advertised on the TBS site / listing aggregators, not as a recurring open board on the municipal BIP.

Contact (UM): Wydział Gospodarki Nieruchomościami, Urząd Miasta Przeworska, ul. Jagiellońska 10.

## 3. Format + rendering
- **Server-rendered HTML** (bip.info.pl hosted CMS) for article lists — no JS gate, no auth, no CAPTCHA. Confirmed live via fetch of idmp,86 and idmp,256.
- **Notice bodies are born-digital PDF attachments** (`plik.php?id=NNNNN&wer=1`) — text-PDF, extractable with `pdftotext -layout` (verified: pulled działka/cena/lokal fields cleanly; no OCR needed).
- Same shape as the Dolnośląskie bip.info.pl analogs, just PDF-heavy on the notice body rather than inline HTML.

## 4. Volume + achieved-price stream
- **Open flat-auction volume: ~0.** Across the current Ogłoszenia board the property auctions are land only; the single flat is a tenant pre-emption sale. No history of `przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego` surfaced in search or on-board.
- **Achieved prices exist but for LAND** — the board carries `Informacja o wyniku ... przetargu na sprzedaż nieruchomości` (Kasprowicza), so there IS a results stream, but not a flat hammer-price stream.
- Overall municipal property throughput is low (a handful of land plots/year + dzierżawa lists + sporadic tenant flat sale). No flat-auction cadence to justify an adapter.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built):** small bip.info.pl gmina — **Zgorzelec / Złotoryja** pattern (identical `index,idmp,NN,r,r` boards + `dokument.php?iddok=...` + `plik.php` PDFs). Technically LOW effort — list idmp,86 → doc fetch → `pdftotext` parse of PDF fields → land vs flat classifier → wynik pass.
- **But the content isn't there.** This is the podkarpackie-seat NO-BUILD shape: generic town BIP skewing to **land auctions + tenant (bezprzetargowo) flat sales + dzierżawa wykazy**, with essentially **zero open flat auctions**. Municipal flats flow through Przeworski TBS off-BIP, not as a recurring open board with achieved prices.
- **Blockers:** no data blocker (site is clean, PDFs are text) — the blocker is **subject-matter volume**: nothing recurring to scrape for the flat-auction dataset.

**VERDICT: NO-BUILD** — clean bip.info.pl server-HTML BIP, but residential disposal is tenant pre-emption + land auctions + lease lists; ~0 open `lokal mieszkalny` auctions. Podkarpackie seat pattern holds. Revisit only if Przeworski TBS starts publishing recurring open flat auctions on a scrapeable board.
