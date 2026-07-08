# Spike — Rawicz (Wielkopolskie · powiat rawicki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (thin flat-auction stream).

## TL;DR
Gmina Rawicz (miejsko-wiejska, town seat) publishes all property notices on its city BIP `bip.rawicz.pl`, a **Logonet eUrząd**-family CMS (`/artykuly/<board>/<page>/<perpage>/<slug>` list pages, `/artykul/<board>/<id>/<slug>` inline server-HTML details, "Zapisz do PDF" export). The single property board — "Przetargi nieruchomości" (board **786**) — is clean, scrapeable, ~600 records over ~40 pages, and carries `informacja o wyniku przetargu` (achieved-price) notices on the same board. **BUT the flat stream is the wrong shape:** municipal **lokale mieszkalne are sold overwhelmingly `bezprzetargowo na rzecz najemcy`** (direct to sitting tenants — recurring wykazy), while **open oral auctions (`ustny przetarg nieograniczony`) are almost entirely land (działki), rolne, and dzierżawa**. Open flat auctions occur only sporadically (one confirmed: ul. Wojska Polskiego 31 lok. 4, 18,77 m², I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego). That is below the BUILD bar for flats. Technically LOW effort to build (clone a Wielkopolska Logonet analog) if/when land is prioritized for the wider dataset — but as a **flat-auction** source it is NO-BUILD.

## 1. Sells municipal property at auction?
**Municipal property: YES. Flats at OPEN auction: mostly NO.**
- **Open oral auctions (`ustny przetarg nieograniczony`)** run regularly for **land/działki** (e.g. Dębno Polskie dz. 528/2, Łąkta, Łaszczyno dz. 275/13 & 326/9, Rawicz dz. 469/3 & 1952/14), **nieruchomości rolne** (przetarg ograniczony — Załęcze), and **dzierżawa** (lease). These are the bulk of the auction stream.
- **Flats (`lokale mieszkalne`)** are almost always disposed **`bezprzetargowo na rzecz najemcy`** — recurring wykazy (e.g. ul. S. Bobrowskiego 8/33; earlier ul.-level wykazy). These are tenant sales, out of scope (no open bidding, no achieved-price contest).
- **Open flat auction — confirmed but rare:** ul. Wojska Polskiego 31, lokal nr 4 (parter, 1 izba, pow. użytkowa 18,77 m² + WC 1,00 m², udział w częściach wspólnych), announced as **I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego**, wadium 10% ceny wywoławczej netto. This is the only open flat auction surfaced across the archive — i.e. ~0–1/year, not a recurring category.
- Also present: `przetarg nieograniczony na sprzedaż mienia ruchomego` (movables, board 666) — out of scope.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (`bip.rawicz.pl`, Logonet eUrząd family):**
- Property board — "Przetargi nieruchomości" (announcements + wykazy + wyniki, mixed): `https://bip.rawicz.pl/artykuly/786/przetargi-nieruchomosci`
  - Paginated form: `https://bip.rawicz.pl/artykuly/786/<page>/<perpage>/przetargi-nieruchomosci` (e.g. `/786/9/15/…`) — ~40 pages @ 15/page.
- General "Przetargi" board (incl. mienie ruchome): `https://bip.rawicz.pl/artykuly/473/…/przetargi` and `https://bip.rawicz.pl/artykuly/666/…` (movables).
- "PRZETARGI - SPRZEDAŻ DZIAŁEK": `https://bip.rawicz.pl/artykuly/964/przetargi-sprzedaz-dzialek`
- "Aktualne przetargi ZUK": `https://bip.rawicz.pl/artykuly/808/…` (utility company — out of scope).
- Detail URL shape: `https://bip.rawicz.pl/artykul/<board>/<id>/<slug>` — e.g. flat: `…/artykul/786/…/…-wojska-polskiego-31…`; land: `https://bip.rawicz.pl/artykul/786/11903/ogloszenie-o-pierwszym-ustnym-przetargu-nieograniczonym-na-sprzedaz-dzialki-niezabudowanej-nr-528-2-w-debnie-polskim…`.
- Results live on board 786 too — e.g. `https://bip.rawicz.pl/artykul/786/11829/wynik-przetargu-na-sprzedaz-dzialki-nr-30-w-konarzewie`.
- Notice-serving authority: **Burmistrz Gminy Rawicz**, Urząd Miejski Gminy Rawicz, ul. Marszałka J. Piłsudskiego 21.

**Housing manager:** local municipal housing is handled via the gmina (ZUK Rawicz for utilities); no separate ZGM/ZBM/TBS board publishing flat auctions was found — flat disposals appear on the city BIP itself, and they are tenant sales.

**Do NOT confuse** with `rsmrawicz.pl` (Rawicka Spółdzielnia Mieszkaniowa — a cooperative, not the gmina) or `bip.zwikrawicz.pl` / `osir.rawicz.pl` (water/sport company tenders) — all out of scope.

## 3. Format + rendering
- **Server-rendered HTML**, Logonet eUrząd CMS. List pages and detail articles are plain server HTML (confirmed via live fetch of board 786 and multiple details). No SPA, no auth, no CAPTCHA.
- Notice bodies are **inline HTML text** (born-digital in the CMS); a "Zapisz do PDF" export exists but the source of truth is the HTML. Occasional born-digital PDF attachments possible → `pdfText` if encountered (OCR unlikely).
- Pagination is path-based (`/artykuly/786/<page>/<perpage>/…`) — trivially crawlable and boundable.

## 4. Volume + achieved-price stream
- **Open FLAT auctions:** ~**0–1/year** — only ul. Wojska Polskiego 31 lok. 4 surfaced. Below the recurring-flat bar.
- **Open LAND auctions:** recurring — several działki + rolne + dzierżawa per year (in-scope for the wider land dataset, not for the flat objective).
- **Flat disposals overall:** dominated by `bezprzetargowo na rzecz najemcy` wykazy (out of scope).
- **Achieved-price stream:** YES for what does auction — `wynik przetargu` / `informacja o wyniku przetargu` notices are posted on board 786 (cena osiągnięta / nabywca, or wynik negatywny), parseable from server HTML. But for flats specifically there is essentially no achieved-price contest to harvest.

## 5. Adapter effort + verdict (closest analog; blockers)
- **CMS family:** Logonet eUrząd (ADAPTER-GUIDE §3) — `/artykul/<board>/<id>` details, path-paginated boards, inline HTML, results on the same board.
- **Closest analog:** a Wielkopolska Logonet board (`tarnowskie-gory` / `gniezno`-shape list-then-detail HTML crawl). Build effort *itself* would be **Low**.
- **Blockers:** none technical. The blocker is **product fit, not tooling** — the flat-auction stream is too thin (flats go to tenants bezprzetargowo; open flat auctions ~0–1/yr). Building this as a flat source would yield near-zero flat records; the yield here is land/działki.
- **Recommendation:** NO-BUILD for the flat objective now. Revisit as a **Low-effort land/mixed** source if the dataset scope broadens to municipal land auctions in Wielkopolska (the board 786 crawler would drop straight in).

**VERDICT: NO-BUILD** — clean, easily-scrapeable Logonet BIP with a real achieved-price stream, but municipal flats are sold `bezprzetargowo na rzecz najemcy`, not at open auction; open oral flat auctions are sporadic (~0–1/yr, one confirmed). Below the recurring-flat-auction BUILD bar. (Would be Low effort as a land/mixed source if scope expands.)
