# Spike — Wrocław (Dolnośląskie · miasto na prawach powiatu)

> **Status:** spike LIVE-VERIFIED — 2026-06-27. VERDICT: BUILD (Medium effort).

## TL;DR

Wrocław runs active *przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego* auctions at high volume, published on a clean server-rendered BIP at `bip.um.wroc.pl`. The city also operates a supplementary portal, Giełda Nieruchomości (`gn.um.wroc.pl`), which exposes a structured "Cena uzyskana" (achieved price) field per lot. Both sources were directly fetched and verified. Achieved-price data is accessible, making this a strong BUILD. The only medium-effort wrinkle is that the full auction result notice (§12 information) is posted only on a physical bulletin board and on Giełda Nieruchomości rather than as a separate BIP article — so the scraper must integrate two sources (BIP for announcements, Giełda for achieved prices).

---

## 1. Sells municipal property at auction?

**YES — confirmed, high volume, residential flats are a primary category.**

The city sells municipal property (gruntowe, zabudowane, lokale mieszkalne, lokale użytkowe) exclusively through the *ustny przetarg nieograniczony* procedure under the Act of 21 August 1997 on real-estate management. Critically for this project:

- The BIP listing page (`bip.um.wroc.pl/przetargi-nieruchomosci/496`) shows 10 current items on its first page, of which **5 out of the first 10 visible entries are "lokal mieszkalny"** — all typed as *Przetarg ustny nieograniczony*, with cena wywoławcza ranging from 480,000 zł to 1,166,000 zł.
- Examples seen live on 2026-06-27:
  - ul. Wesoła 12 lokal 10 — 510,000 zł — 02.09.2026
  - Rynek 14 lokal 5 — 950,000 zł — 31.08.2026
  - Rynek 14 lokal 6 — 450,000 zł — 31.08.2026
  - ul. Michała Wrocławczyka 40 lokal 6 — 1,166,000 zł — 26.08.2026
  - ul. Powstańców Śląskich 198 lokal 23 — 480,000 zł — 19.08.2026
- The BIP index has **482 pages** (at 10/page = ~4,820 entries total, all years), confirming deep historical archive.
- The dedicated city procedure page confirms: responsible unit = **Wydział Sprzedaży Lokali** (WSL), initiated by ZZK or Wydział Lokali Mieszkalnych; no indication of *bezprzetargowy* preference for flat sales.
- ZZK (Zarząd Zasobu Komunalnego, `bip.zzk.wroc.pl`) runs separate auctions for **lokale użytkowe** (commercial units) — NOT residential flats. Residential flat auctions flow exclusively through the city BIP / WSL.

**Verdict on Q1: STRONG BUILD signal** — residential flat auctions confirmed live and frequent.

---

## 2. Where published? (hosts + boards, with URLs)

### Primary — City BIP (bip.um.wroc.pl)

| Purpose | URL |
|---|---|
| All current property auctions (listing) | https://bip.um.wroc.pl/przetargi-nieruchomosci/496 |
| All property auctions with filter/pagination | `https://bip.um.wroc.pl/przetargi-nieruchomosci/{page}/{per_page}` |
| Single auction detail | `https://bip.um.wroc.pl/przetarg-nieruchomosci/{id}/{slug}` |
| XML feed (list) | https://bip.um.wroc.pl/przetargi-nieruchomosci/xml/1/1 |
| Procedure/info page | https://bip.um.wroc.pl/sprawa-do-zalatwienia/9159/sprzedaz-gminnych-mieszkan-i-lokali-uzytkowych-w-drodze-przetargu |
| Auction info / results policy | https://bip.um.wroc.pl/artykul/100/2765/informacje-dotyczace-przetargow-na-nieruchomosci |
| Wykazy nieruchomości (pre-auction lists) | https://bip.um.wroc.pl/artykuly/1103/wykazy-nieruchomosci-do-sprzedazy-zbycia-i-dzierzawy |

The BIP listing supports URL-based filtering by: typ przetargu, rodzaj nieruchomości (incl. "lokal mieszkalny"), rok publikacji, status (Aktualne / W trakcie rozstrzygania / Rozstrzygnięte / Unieważnione), and date range. This is server-rendered HTML — filters appear to be query parameters (needs verification of exact param names vs. JS-driven).

### Secondary — Giełda Nieruchomości (gn.um.wroc.pl)

| Purpose | URL |
|---|---|
| Portal home | https://gn.um.wroc.pl/ |
| All lokale listings | https://gn.um.wroc.pl/oferty/lokale |
| Single lokal detail (with "Cena uzyskana" field) | `https://gn.um.wroc.pl/oferta/lokal/{id}` |
| All nieruchomości listings | https://gn.um.wroc.pl/oferty/nieruchomosci |

The Giełda detail page for each lot cross-links to the BIP announcement (`bip.um.wroc.pl/przetarg-nieruchomosci/…`) and includes a **"Cena uzyskana:" field** — the achieved/hammer price. This is the primary machine-readable source for post-auction prices. Confirmed live: field present in HTML at `gn.um.wroc.pl/oferta/lokal/{id}`, empty for lots still in pre-auction preparation, populated after resolution.

### Physical board only (not scraped)

Per §12 of the 2004 regulation, the formal "informacja o wyniku przetargu" is posted on the physical bulletin board at pl. Nowy Targ 1-8, I piętro obok pok. 102 — for 7 days from auction date. It is **not** published as a separate BIP article. The digital equivalent is the "Cena uzyskana" field on Giełda Nieruchomości.

### ZZK BIP (bip.zzk.wroc.pl) — secondary, non-residential

- https://bip.zzk.wroc.pl/?app=przetargi_lokale — commercial unit auctions only
- Not relevant for residential flat aggregation.

---

## 3. Format + rendering

### bip.um.wroc.pl

- **Server-rendered HTML** — confirmed. Full page content returned by direct HTTP fetch with no JS execution. CMS: Logonet Sp. z o.o. (Bydgoszcz), version 2.8.30.09.
- Listing page: paginated HTML table (`{page}/{per_page}` in URL path). Each row has: address, przetarg type, rodzaj nieruchomości, cena wywoławcza, data przetargu.
- Detail page: HTML table with the same fields plus a "Rozstrzygnięcie" section (currently rendered as RODO-boilerplate text, not as structured achieved-price data). No achieved price in BIP detail.
- XML endpoint exists: `https://bip.um.wroc.pl/przetargi-nieruchomosci/xml/{page}/1` — worth probing; if it returns structured data, it may be preferable to HTML scraping.
- No auth, no bot blocks observed. TLS: standard HTTPS. `meta-robots: index,follow,all`.
- No PDF or scanned documents in the auction announcement itself; the announcement is HTML. Attachments (maps, floor plans) may be PDFs linked from detail pages.

### gn.um.wroc.pl (Giełda Nieruchomości)

- **Server-rendered HTML** — confirmed. Content returned by direct HTTP fetch, no JS execution required for core data fields.
- Detail page structure: key-value pairs for address, powierzchnia, przeznaczenie, cena wywoławcza, data przetargu, rodzaj przetargu, **cena uzyskana**. Also includes cross-links to BIP wykaz and BIP przetarg pages.
- No auth, no bot blocks observed. Both `http://gn.um.wroc.pl/` and `https://gn.um.wroc.pl/` resolve.
- Lot IDs appear sequential integers (`/oferta/lokal/1097`, `/oferta/lokal/1283`, etc.) — ~1,295 lokal records estimated from highest seen ID.

---

## 4. Volume + achieved-price stream

- **Active listing volume:** 5+ residential flat auctions on first BIP page (10 items), published weekly to bi-weekly. The 482-page BIP archive at 10/page indicates a large historical corpus; filtering to "lokal mieszkalny" + "Rozstrzygnięte" will yield the usable historical resolved set.
- **Achieved-price stream:** Available via Giełda Nieruchomości detail pages (`gn.um.wroc.pl/oferta/lokal/{id}` → "Cena uzyskana" field). Each Giełda lot cross-links to its BIP auction page, and vice versa. Join key is the BIP przetarg URL referenced from the Giełda detail page.
- **Caveat:** BIP detail pages themselves do **not** embed the achieved price — only Giełda does. Adapter must join BIP (announcements + metadata) and Giełda (achieved price). The join key (BIP URL) is explicit in Giełda pages.
- **Scale estimate:** Giełda "Lokale" catalog reached L/14/2026 by 29 April 2026 (14 lots in ~4 months), suggesting 30–50 residential/commercial lots per year on Giełda. BIP volume is higher — dozens of flat auctions per year — because not all BIP lots may appear on Giełda (some may remain in preparation state or be commercial-only).

---

## 5. Adapter effort + verdict

### Closest analog

**Kraków** — both cities use a city BIP as the primary auction announcement source, supplemented by a secondary portal for achieved-price data.

### Architecture

1. **BIP scraper** (`bip.um.wroc.pl/przetargi-nieruchomosci/…`):
   - Paginate listing filtered to `rodzaj=lokal+mieszkalny` + `status=Rozstrzygnięte` (and separately `Aktualne`).
   - Parse each row: address, cena wywoławcza, data przetargu, detail URL.
   - Fetch detail page for Giełda cross-link (if present) or store BIP ID for join.
   - **First step: probe XML endpoint** (`/xml/{page}/1`) — if structured, prefer over HTML scraping.

2. **Giełda scraper** (`gn.um.wroc.pl/oferta/lokal/{id}`):
   - Iterate sequential IDs or follow BIP→Giełda links.
   - Extract "Cena uzyskana" field for achieved price.
   - Join to BIP record via shared BIP przetarg URL present in Giełda detail.

3. **Join layer**: match Giełda lots to BIP auctions via the `bip.um.wroc.pl/przetarg-nieruchomosci/{id}/…` cross-link.

### Effort assessment

| Item | Assessment |
|---|---|
| Announcement scraping | Low — clean server-rendered HTML, no auth, stable Logonet CMS |
| Achieved-price scraping | Low-Medium — second source (Giełda) required; sequential ID crawl feasible |
| Join/dedup | Medium — two-source join; handle lots in preparation (no date/price yet) |
| Historical archive | Low — BIP 482-page history; Giełda IDs from ~2020 |
| XML endpoint | TBD — if BIP XML is structured, could replace HTML scraping |
| Bot blocks / auth | None observed on either source |

**Overall: Medium effort** — two-source architecture adds complexity vs. single-source cities, but both sources are clean server-rendered HTML with no auth.

### Blockers / risks

- **RODO deletion of BIP detail pages:** BIP policy states auction detail pages are removed 7 days after the auction date per RODO data minimisation. This means resolved auctions drop off BIP quickly. **The scraper must run promptly after each auction date** or rely on Giełda as the durable record. Risk: **High for historical backfill** (pages already deleted); manageable for ongoing scraping.
- **Achieved price only on Giełda, not BIP:** If Giełda lags or omits some lots, achieved-price coverage may be incomplete. Risk: Medium. Mitigation: cross-validate BIP "Rozstrzygnięte" count against Giełda lot count.
- **Giełda scope:** Some BIP lots (nieruchomości zabudowane, land) may not appear in Giełda's "Lokale" section — out of scope for residential flat use case.
- **XML endpoint format:** Unknown until probed. Could be schema-less or expose all needed structured fields.

### Verdict

**BUILD** — Wrocław is one of the strongest candidates in Dolnośląskie: confirmed weekly *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych*, clean server-rendered BIP, explicit "Cena uzyskana" field on Giełda Nieruchomości, no auth/bot blocks, deep historical archive. The two-source architecture is manageable (cf. Kraków analog). The RODO deletion risk requires prompt scraping cadence but is not a blocker for ongoing operation.

**Recommended first step:** Probe `https://bip.um.wroc.pl/przetargi-nieruchomosci/xml/1/1` to assess XML structure before committing to HTML scraping.
