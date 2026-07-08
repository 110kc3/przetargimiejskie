# Spike — Słupca (Wielkopolskie · powiat słupecki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD.

## TL;DR
Gmina Miejska Słupca (a ~13k-inhabitant town gmina, **Burmistrz**) publishes all property notices on its FINN-platform BIP `bip.umslupca.finn.pl`, on one mixed board — **"Sprzedaż i najem nieruchomości"** (`/bipkod/005/006/003`, 272 archived entries). That board is dominated by **land/lease wykazy** (dzierżawa, użyczenie, zbycie działek). Municipal **flats** are disposed of predominantly **bezprzetargowo na rzecz najemcy** under the classic **80% bonifikata** model (e.g. "Wykaz lokalu mieszkalnego przeznaczonego do zbycia" — Traugutta 7A, 04-02-2026, 37.8 m², 100 100 zł, 80% discount for lump-sum). Open flat auctions are essentially non-recurring: only **one** *przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* was found in the last ~3 years (Orzeszkowej 3A/23, przetarg 24-05-2023). No dedicated results/achieved-price board. Combined with FINN's JS-shell default view (server-HTML only on the `?showArchive=true` variant — same awkwardness flagged for **Sieradz**), the open-flat-auction stream is ~0 and there is nothing recurring to aggregate.

## 1. Sells municipal property at auction?
**Land: YES. Flats: predominantly bezprzetargowo — open flat auctions ~0/yr.**
- The **Burmistrz Słupcy** runs *przetarg ustny/pisemny nieograniczony* for **land** (nieruchomości gruntowe / niezabudowane) and publishes property **wykazy** regularly (e.g. ul. Poznańska "sale by przetarg" 104 m² 12-02-2026; ul. Wspólna zbycie 456 m² 25-02-2026).
- **Flats** follow the tenant-sale route: designations carry an **80% bonifikata for lump-sum payment** (Traugutta 7A, 04-02-2026) — the standard *sprzedaż na rzecz najemcy, bezprzetargowo* signal.
- Only **one confirmed open flat auction**: *I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 23, ul. Orzeszkowej 3A* (auction 24-05-2023, cena wywoławcza + 80% bonus for lump-sum). No other open flat auction surfaced in 2024–2026.
- Net: flats are not a recurring open-auction category here; the recurring stream is land + leases.

## 2. Where published? (hosts + boards, URLs)
**Primary — town BIP (FINN CMS):** `bip.umslupca.finn.pl`
- Property board (sales, leases, wykazy, the occasional przetarg): **`https://www.bip.umslupca.finn.pl/bipkod/005/006/003?showArchive=true`** ("Sprzedaż i najem nieruchomości", 272 archived entries; the `?showArchive=true` variant server-renders the full dated list — the plain URL returns a JS shell).
- Ogłoszenia board `https://www.bip.umslupca.finn.pl/bipkod/005/006/004` — **generic municipal notices** (konkursy ofert, zarządzenia dot. dotacji, obwieszczenia), **not** property; no przetarg-nieruchomości content.
- Zamówienia publiczne (procurement, out of scope): `https://www.bip.umslupca.finn.pl/bipkod/10694278`.
- Document/attachment pattern: notices are HTML stubs of **zarządzenia** with born-digital **PDF attachments** at `/res/serwisy/pliki/[ID]?version=1.0`.
- No dedicated **wyniki / rozstrzygnięcia** (achieved-price) board found — any *informacja o wyniku przetargu* would land back on board 003.

**Do NOT confuse** with the rural **Gmina Słupca** (separate JST, **Wójt**): BIP `bip.gminaslupca.pl` + `gminaslupca.pl` — land/grunt przetargi only (Cienin, Wilczna, Zaborze, Korwin), out of scope. Our target is the town **Gmina Miejska Słupca** (Burmistrz, `bip.umslupca.finn.pl`).

## 3. Format + rendering
- **CMS:** FINN eBIP (`bip.<x>.finn.pl`) — same platform as **Sieradz** (NO-BUILD precedent).
- **Rendering:** the default board view is a **JS-rendered shell**; only the **`?showArchive=true`** variant returns a server-rendered, paginated HTML list (dated titles, 28 pages). Individual notices are short HTML wrappers around **born-digital PDF** zarządzenia (`/res/serwisy/pliki/[ID]`), which would need `pdfText`.
- No CAPTCHA/auth, but the JS-shell default means a naive fetch of the live board misses content unless the archive param is forced.

## 4. Volume + achieved-price stream
- **Open flat auctions:** ~**0/yr** — one in ~3 years (Orzeszkowej 3A, 2023). Flats otherwise go bezprzetargowo (80% bonifikata, tenant).
- **Land/lease:** modest, recurring (a handful of wykazy + occasional land przetarg per year), but flats are the target category and they are absent from the auction stream.
- **Achieved-price stream:** **none found** — no dedicated wyniki/rozstrzygnięcia board; achieved prices for flats are not published (flats aren't auctioned).

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Sieradz** (`spikes/lodzkie/powiat-sieradzki/sieradz.md`) — same FINN CMS, same finding (flats bezprzetargowo, only land at open auction) → NO-BUILD.
- **Why NO-BUILD:** the load-bearing category (open flat-sale auctions) is essentially non-recurring here (~1 in 3 years); municipal flats are disposed of *bezprzetargowo na rzecz najemcy* under an 80% bonifikata. No achieved-price stream to aggregate. FINN's JS-shell default view adds friction on top of an empty flat pipeline.
- **Blockers:** JS-rendered default board (workaround: `?showArchive=true`); mixed land/lease-dominated board; no wyniki board. None of these are worth clearing given ~0 flat-auction volume.
- **Effort:** — (not applicable).

**VERDICT: NO-BUILD** — Gmina Miejska Słupca sells flats predominantly *bezprzetargowo na rzecz najemcy* (80% bonifikata); open flat auctions are non-recurring (~1 in 3 years), the only recurring auction stream is land, and there is no achieved-price board. FINN CMS, mirroring the Sieradz NO-BUILD precedent.
