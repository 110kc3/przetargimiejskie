# Spike — Śrem (Wielkopolskie · powiat śremski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Medium effort).

## TL;DR
Gmina Śrem (miejsko-wiejska; **Burmistrz Śremu**) sells municipal property — **including lokale mieszkalne** — via *publiczny nieograniczony przetarg ustny na sprzedaż*, and the flat stream is real and recurring (Ogrodowa 31/16 in 2026, Grota Roweckiego 4/61, Mickiewicza 29/4 and 71/6, Modrzewskiego 4/10 — several as II/III round). Announcements, wykazy and results all live on the city BIP **`bip.srem.pl`** (mirror `umsrem.bip.eur.pl`), which runs the **iBIP** hosted CMS (`bip.eur.pl` platform, served off `bip6.ibip.pl`): plain server-rendered PHP HTML, query-param URLs `public/?id=NNNN`, single "Zbycie i najem nieruchomości" board (id=1162) with yearly sub-pages carrying ogłoszenia + wykaz + "informacja o wyniku przetargu". No SPA, no auth, no CAPTCHA. One real quirk: the HTTPS cert is issued for `bip6.ibip.pl`, not `bip.srem.pl`, so a strict Node TLS fetch rejects it — handle with a browser-UA / cert-tolerant fetch or hit the notice pages by `?id`. Closest analog: the WordPress/custom-HTML family (`brzeg` / `nowa-sol` pattern) — plain HTML tables/articles — but the `?id=NNNN` query-param shape and TLS quirk make this a *new iBIP CMS* for the fleet, hence Medium not Low.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats (OPEN oral).** The **Burmistrz Śremu** (Urząd Miejski w Śremie, Pl. 20 Października 1) runs `publiczny nieograniczony przetarg ustny na sprzedaż` for municipal property, and flats are an explicit, recurring category — these are genuine open auctions, not `bezprzetargowo na rzecz najemcy` tenant sales. Confirmed lokal-mieszkalny auctions:
- ul. Ogrodowa 31/16 — 36.12 m², cena wywoławcza 150 000 zł, przetarg ustny nieograniczony (Wykaz Burmistrza Śremu, ed. 27.03.2026).
- ul. Stefana Grota Roweckiego 4 m.61 — sprzedaż lokalu mieszkalnego (BIP `?id=202922`).
- ul. Adama Mickiewicza 29/4 — III publiczny nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego (wadium 15 000 zł, 2025).
- ul. Adama Mickiewicza 71/6 — III przetarg ustny, 33.88 m² + piwnica 19 m², cena wywoławcza 51 000 zł, wadium 6 000 zł.
- ul. Andrzeja Frycza Modrzewskiego 4/10 — II przetarg ustny na sprzedaż lokalu mieszkalnego (poddasze).

The mix also includes zabudowane/niezabudowane land (e.g. a 690 000 zł netto property, wadium 70 000 zł, auction 19.02.2025) — flats cycle in and out of a mixed property board rather than being permanently open; both natural and legal persons may bid; ~10% wadium. Housing manager: **Śremskie TBS Sp. z o.o.** (builds/manages municipal housing) + **PGK Śrem** — but the *sale* auctions are run by the Burmistrz on the city BIP, not by the TBS.

> Do NOT confuse with **`bip.powiat-srem.pl`** — that is the **Starostwo Powiatowe** (powiat / Skarb Państwa nieruchomości, IDcom-style CMS), a different JST, out of scope. Our target is Gmina Śrem / Burmistrz Śremu on `bip.srem.pl`.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (iBIP / bip.eur.pl CMS):**
- Board "Zbycie i najem nieruchomości" (announcements + wykaz + results): `https://bip.srem.pl/public/?id=1162`
- Mirror host (same content): `http://umsrem.bip.eur.pl/public/?id=1162`
- Individual notice example (flat, Grota Roweckiego 4/61): `https://bip.srem.pl/public/?id=202922`
- Yearly sibling pages under the same board (e.g. zamówienia 2025 `?id=233341`, 2023 `?id=223153`) — property years likely follow the same `?id=NNNN` sub-page pattern.
- Document/notice URL pattern: `public/?id=NNNN` (query param — no path segments).
- Housing context: Mieszkania komunalne `?id=176859`; Śremskie TBS `?id=750` / `?id=839`.

Contact: Biuro Obsługi Inwestora, tel. 61 28 47 134; Urząd Miejski w Śremie, Pl. 20 Października 1, 63-100 Śrem; urzad@srem.pl.

**Aggregator mirrors (backfill / cross-check):** otoprzetargi.pl and przetargi-gctrader.pl both republish full "WYKAZ BURMISTRZA ŚREMU" and individual przetarg notices verbatim — useful fallback if the BIP TLS quirk bites.

## 3. Format + rendering
- **Server-rendered HTML** — iBIP (`bip.eur.pl`, served off `bip6.ibip.pl`), classic PHP BIP. Notice bodies are inline HTML on `public/?id=NNNN` pages. No SPA, no JS gate, no auth, no CAPTCHA.
- **TLS quirk (the one real blocker):** the certificate on `bip.srem.pl` / `umsrem.bip.eur.pl` is issued for `DNS:bip6.ibip.pl` (shared hosting cert) → a strict Node TLS `getText` rejects it ("Hostname/IP does not match certificate's altnames" / "unable to verify the first certificate"). Fetch with a browser UA + relaxed cert verification for this host, or read notice pages by `?id`. WebFetch hit both symptoms during this spike.
- Longer notices are typically inline HTML; some wykazy/ogłoszenia may carry a **born-digital PDF** attachment — handle with `pdfText` if encountered (OCR unlikely).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest. A handful of municipal flat auctions per year plus land/lokal użytkowy on the same mixed board; several flats appear as II/III przetarg (repeats when unsold), which inflates notice count. Expect ~a few flats/year — steady, not high-frequency (confirmed spanning 2020 → 2026).
- **Achieved-price stream:** YES — `informacja o wyniku przetargu` notices are published on the same board (`?id=1162` yearly sub-pages), carrying cena osiągnięta / nabywca or wynik negatywny; announcements carry cena wywoławcza + wadium. Both parseable from server HTML. No dedicated separate results board — results and announcements share the `Zbycie i najem` board, so the adapter classifies by title (`ogłoszenie o przetargu` vs `informacja o wyniku` vs `wykaz`).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **WordPress / custom-HTML** family — `brzeg` / `nowa-sol` / `olkusz` pattern (plain HTML article/tables + occasional PDF). Clone that shape for the parse layer, but the crawl layer is new: iBIP uses **query-param `?id=NNNN`** URLs (not path segments) and lists notices on yearly sub-pages of one board.
- **CMS family:** **iBIP** (`bip.eur.pl` / `bip6.ibip.pl`) — new to the fleet (no existing adapter greps to `bip.eur.pl`/`ibip.pl`/`public/?id=`). Server-rendered HTML.
- **Effort:** **MEDIUM.** Reasons it's not Low: (1) new CMS crawl shape (`?id=NNNN` query-param board + yearly sub-pages) with no analog to clone; (2) TLS cert mismatch requires a per-host cert-tolerant / browser-UA fetch tweak in `core/fetch.js`; (3) single mixed board — must classify ogłoszenie vs wynik vs wykaz and drop land/dzierżawa/procurement by title/body. Parse itself is standard (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, date, round, cena osiągnięta). Aggregator mirrors give a clean backfill fallback.
- **Blockers:** Only the TLS cert-name mismatch — a small, well-understood fetch-config fix, not a hard blocker. No rate-limit/auth signals.

**VERDICT: BUILD (Medium effort)** — recurring OPEN municipal flat auctions with a published achieved-price stream on a clean server-HTML iBIP BIP (`bip.srem.pl`); Medium because iBIP is a new CMS shape for the fleet and the shared-hosting TLS cert needs a per-host fetch tweak.
