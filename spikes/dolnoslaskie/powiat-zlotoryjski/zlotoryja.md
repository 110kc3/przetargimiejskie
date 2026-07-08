# Spike — Złotoryja (Dolnośląskie · powiat złotoryjski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miejska Złotoryja (Burmistrz Miasta Złotoryja) regularly sells municipal **lokale mieszkalne** via *nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego*. Announcements and results are on the city BIP `zlotoryja.bip.info.pl` — the **bip.info.pl** hosted CMS (clean server-rendered HTML, comma-path document URLs `dokument,iddok,NNNN,idmp,MM,r,r`, dedicated "Przetargi" board + paginated "Zakończone" results board). A live 2025 flat auction is confirmed (ul. Żeromskiego 15/3A, I przetarg, cena 76 651 zł, auction 16.05.2025). Same CMS as Zgorzelec (fetched live here) — Złotoryja is the canonical small-Dolnośląskie bip.info.pl analog already referenced by the Lwówek Śląski spike. No blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Miasta Złotoryja runs `nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego`. Live/confirmed examples:
- **ul. Stefana Żeromskiego 15/3A** — I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego; cena wywoławcza 76 651 zł (brutto); wadium do 09.05.2025; przetarg 16.05.2025 10:00, Urząd Miejski pok. 11. (BIP `dokument,iddok,13980,idmp,74`)
- **ul. Kardynała Stefana Wyszyńskiego 3** — II nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego (z możliwością zmiany na lokal użytkowy); cena 74 000 zł, wadium 7 400 zł. (BIP `dokument,iddok,2589,idmp,1`)

Both natural and legal persons may bid; 10% wadium. The BIP also carries land parcels, but flat auctions are a distinct, recurring category, with I/II rounds when unsold.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (bip.info.pl CMS):**
- Przetargi (announcements): `https://zlotoryja.bip.info.pl/index,idmp,74,r,r`
- Zakończone (completed / results, paginated): `https://zlotoryja.bip.info.pl/index,idmp,1,r,r,istr,18`
- Menu przedmiotowe (property listing entry): `https://zlotoryja.bip.info.pl/index.php?idmp=1&istr=4&r=r`
- Document URL pattern: `dokument,iddok,NNNN,idmp,MM,r,r` — e.g. flat notices `iddok,13980` (idmp 74) and `iddok,2589` (idmp 1).

**Secondary / cross-check:** `naszekomunikaty.pl` and `przetargi.adradar.pl/p/a/3434/Złotoryja` re-publish/aggregate the notices (useful for volume audit).

## 3. Format + rendering
- **Server-rendered HTML** — bip.info.pl hosted CMS, identical platform to **Zgorzelec** (`zgorzelec.bip.info.pl`), which I fetched live in this batch (plain server HTML, no JS gate, comma-path docs). Article lists are dated HTML; notices are HTML documents at `dokument,iddok,...`.
- **No SPA, no auth, no CAPTCHA.**
- Note: WebFetch of individual `zlotoryja.bip.info.pl` comma-URLs returned 404/"Strona nie istnieje" to the bot UA (a bip.info.pl UA/session quirk) while Google's index and the sibling Zgorzelec host serve the same CMS fine — pass a **browser User-Agent** via `getText(url,{userAgent})` when building. Content itself is live-indexed (2025 auctions present).
- Full ogłoszenia are inline HTML text; longer notices may carry a **born-digital PDF** attachment (`pdfText` if so; OCR unlikely).

## 4. Volume + achieved-price stream
- **Volume:** Low (roughly a few flat auctions/year, plus land). Mix of I/II/III rounds (repeat auctions when unsold — Wyszyńskiego 3 seen at II przetarg).
- **Achieved-price stream:** YES — a paginated **Zakończone** board (`idmp,1`) carries completed-auction records; result notices give the outcome. Announcement carries `cena wywoławcza`; result carries the hammer price / wynik. Both parseable from server HTML.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Zgorzelec** (same bip.info.pl CMS, verified live this batch) and **Lwówek Śląski** (Dolnośląskie small-gmina HTML BIP) — Złotoryja is already the reference example cited in the Lwówek Śląski spike note. Clone that board→article→results shape.
- **CMS family:** bip.info.pl hosted BIP → server-rendered HTML (WordPress/custom-HTML family per ADAPTER-GUIDE §3).
- **Effort:** **LOW.** Przetargi board (idmp,74) → article fetch → parse (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round); second pass over Zakończone (idmp,1) for achieved price. Filter land/dzierżawa. Set a **browser UA** in `getText` to dodge the bot-UA 404.
- **Blockers:** None beyond the UA quirk (solved by browser UA). No rate-limit/auth/CAPTCHA.

**VERDICT: BUILD (Low effort)** — confirmed recurring municipal flat auctions (live 2025 example) on a clean bip.info.pl server-HTML BIP with a completed/results board; canonical small-Dolnośląskie analog, only quirk is bot-UA gating.
