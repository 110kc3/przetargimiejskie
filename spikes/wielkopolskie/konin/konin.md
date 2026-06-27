# Spike — Konin (Wielkopolskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: NO-BUILD (Low effort to confirm, but no usable flat-auction stream).

## TL;DR

Konin (pop. ~74 k, Wielkopolskie) sells municipal property via *przetarg ustny nieograniczony*, but **all residential flat sales go bezprzetargowo to sitting tenants** — no open flat-auction stream exists. Auction volume consists exclusively of land plots, garages, and occasional commercial/perpetual-usufruct lots. The housing manager PGKiM Plus Sp. z o.o. handles building maintenance only, not flat sales. Both publication hosts are clean server-rendered HTML with no auth/bot blocks, but there is nothing to scrape for the core product use case.

---

## 1. Sells municipal property at auction?

**Yes — but not flats.** The City of Konin (Prezydent Miasta Konina) regularly publishes *przetarg ustny nieograniczony na sprzedaż nieruchomości* for:

- Undeveloped land plots (działki gruntu) in districts Przydziałki, Wilków, Maliniec, Chorzeń, Czarków, Pawłówek
- Garages / garage-plot nieruchomości (e.g. "nieruchomości zabudowanej garażem obręb Czarków")
- Perpetual usufruct rights to built parcels (użytkowanie wieczyste + budynek)
- Occasional commercial premises (lokal użytkowy — only one example found, Aleje 1 Maja 15, from 2019)

**Residential flats (lokale mieszkalne):** All flat transfers are **bezprzetargowe** — recorded as "Wykaz lokali mieszkalnych stanowiących własność Miasta Konina przeznaczonych do sprzedaży **głównemu najemcy**" (most-recent entries: GN.6840.1.67.2025 on 2026-06-17 and GN.6840.1.46.2025 on 2026-05-27). There is no evidence of even a single *przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych* in Konin's auction history.

**Verdict on flat-auction stream:** ABSENT.

---

## 2. Where published? (hosts + boards, with URLs)

Two active hosts (both HTTPS, no auth):

| Host | Role | URL |
|---|---|---|
| `bipum.konin.eu` | **Primary / current BIP** — Urząd Miejski w Koninie. Unified property announcement board (wykazy, przetargi, wyniki, dzierżawy). | https://bipum.konin.eu/6194/wszystkie |
| `gospodarka.konin.pl` | **City economic portal** — mirrors/supplements BIP with individual auction announcement pages, paginated list of ~13 pages. | https://gospodarka.konin.pl/Przetargi.htmlx |
| `bip.konin.eu` | **Old/archive BIP** — still indexed by search engines; pre-migration content. Some pages return no text (image-only). | https://bip.konin.eu/index.php?d=przet_nieruch_aktual |

**Announcement board (ogłoszenia):** https://bipum.konin.eu/6194/wszystkie

**Auction result notices:** Published on `bipum.konin.eu` inline in the same board. Example live entry: "Informacja o wyniku I przetargu na sprzedaż nieruchomości, będących własnością Miasta Konina położonych w Koninie, obręb Przydziałki" (symbol GN.6840.4.10.2025, dated 2026-06-24). Achieved price is included in the HTML notice body (confirmed by search snippet: Starówka II auction Jan 2023 → 26 516,26 zł net stated in text).

**Municipal housing manager:** Przedsiębiorstwo Gospodarki Komunalnej i Mieszkaniowej Plus Sp. z o.o. (`bip.pgkimplus.konin.pl`) — building maintenance contractor only; tenders are for roofing, electrical, painting, etc. No flat sales. Not relevant to the product.

---

## 3. Format + rendering

| Property | Detail |
|---|---|
| Rendering | Server-rendered HTML on both active domains; no JavaScript SPA |
| PDF use | Not observed for auction announcements; some old-BIP items returned empty (possible image-PDF or JS-gated content on `bip.konin.eu`) |
| Auth / bot blocks | None detected on `bipum.konin.eu` or `gospodarka.konin.pl` |
| TLS | Valid HTTPS on both active hosts |
| Pagination | `bipum.konin.eu/6194/wszystkie` — paginated list, query-param style; `gospodarka.konin.pl/Przetargi.htmlx?&p=N` — 13 pages |
| Entry URLs | `bipum.konin.eu`: entries accessed via article slug; `gospodarka.konin.pl`: readable slug URLs (e.g. `.../II-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stanowiacej-wlasnosc-Miasta-Konina-polozonej-w-Koninie_-obreb-Maliniec.htmlx`) |

---

## 4. Volume + achieved-price stream

- **Announcement volume:** ~130 items total across 13 pages on gospodarka.konin.pl (covering several years); approx. 10–15 land/garage auctions per year. Very low cadence.
- **Flat auction volume:** Zero. Flat sales go bezprzetargowo to tenants; no open-bidding flat notices found anywhere.
- **Achieved-price stream:** Result notices ("Informacja o wyniku przetargu") are published on `bipum.konin.eu` in the same board, with price stated in HTML body text. Stream exists for land/garage auctions, but is irrelevant for the product without flat auctions.
- **Historic depth on old BIP:** `bip.konin.eu` has archive sections back to at least 2019–2020; some pages are inaccessible (no text content, possibly image-only documents).

---

## 5. Adapter effort + verdict

**Closest analog among known cities:** None — Konin's pattern (bezprzetargowy for flats, land-only auctions) matches the *weak* end of the spectrum, unlike Gliwice/Zabrze/Bytom/Kraków/Tarnowskie Góry which all have active flat-auction streams.

**Blockers:**
1. **No flat-auction stream.** This is the fundamental blocker. The city's entire residential inventory goes to sitting tenants, not open auction. This is structural, not a scraping difficulty.
2. Land/garage auctions are too low-volume (~10–15/year) and off-product to justify an adapter.

**Risks / considerations:**
- Policy could change in future years — the infrastructure (BIP board, HTML rendering) is perfectly scrapeable if flat auctions were ever introduced.
- Old archive BIP (`bip.konin.eu`) has some pages that return no text content, suggesting image-only PDFs or JavaScript dependency — would require additional investigation if ever needed.

**Effort if policy changes:** Low-Medium. Both active hosts are clean HTML, no auth, paginated lists with stable URL patterns. A basic HTTP scraper + HTML parser would suffice. Result notices include achieved price in body text.

**VERDICT: NO-BUILD.** No flat-auction stream exists; residential sales are bezprzetargowe to tenants. Land/garage volume (~10–15/year) is insufficient to justify an adapter.

---

**Sources verified live 2026-06-27:**
- https://bipum.konin.eu/6194/wszystkie (LIVE-VERIFIED — page text read directly)
- https://gospodarka.konin.pl/Przetargi.htmlx (LIVE-VERIFIED — full HTML fetched)
- https://bip.pgkimplus.konin.pl/index.php/przetargi (LIVE-VERIFIED — full HTML fetched)
- https://bip.konin.eu/index.php?d=oglkosp (no text content returned — archive page)
- https://bip.konin.eu/index.php?d=przet_nieruch_aktual (DESK — indexed by search engines)
