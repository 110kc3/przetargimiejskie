# Spike — Piaseczno (Mazowieckie · powiat piaseczyński)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (Medium effort if reconsidered).

## TL;DR

Gmina Piaseczno does sell municipal flats at auction — confirmed live on bip.piaseczno.eu and piaseczno.eu.
However, flat-auction volume is very low (one confirmed example from January 2024, sporadic
cooperative-ownership-right disposals rather than a continuous stream). The dominant auction activity
is land sales and commercial uses. No dedicated housing manager; the Burmistrz disposes directly via
Wydział Geodezji i Gospodarki Gruntami. Result notices are buried as free-text articles in the
Tablica ogłoszeń, not in a structured field. Achieved price is not consistently machine-readable.
Volume does not justify an adapter at this time.

## 1. Sells municipal property at auction?

**YES — but primarily land; flats are occasional and use pisemny (written) form, not ustny.**

- Confirmed live: "przetarg pisemny nieograniczony na sprzedaż spółdzielczego własnościowego prawa
  do lokalu mieszkalnego nr 83 o powierzchni użytkowej 58,44 m2 przy ul. Sikorskiego 1A"
  (cena wywoławcza 446 000 PLN, wadium 22 300 PLN, public part 22.03.2024).
  Source: <https://piaseczno.eu/przetarg-na-sprzedaz-spoldzielczego-wlasnosciowego-prawa-do-lokalu-mieszkalnego-nr-83-o-powierzchni-uzytkowej-5844-m2/>
- Legal basis: ustawa z 21.08.1997 r. o gospodarce nieruchomościami + Rozp. RM z 14.09.2004 r.
- Form used: **pisemny nieograniczony** (written sealed-bid open tender), NOT "ustny przetarg
  nieograniczony" (oral). Flat auctions in Piaseczno are sealed-bid, not vocal-bid.
- Also seen: land plots (działki) sold via the same pisemny form; these are much more frequent.
- No evidence of a bezprzetargowy pathway to tenants for the examined flat — it was sold to the open
  market. However, there is no confirmed ongoing series; this appears to be ad-hoc disposal of
  municipally-held cooperative shares (spółdzielcze własnościowe prawo), not outright gmina-owned
  lokale mieszkalne stock in bulk.
- No dedicated TBS / ZGM / housing manager found for Piaseczno. Disposal managed directly by
  Burmistrz / Wydział Geodezji i Gospodarki Gruntami, tel. 22 70-17-523.

## 2. Where published? (hosts + boards, URLs)

Two channels, both operated by Urząd Miasta i Gminy Piaseczno:

| Channel | URL | Content |
|---|---|---|
| BIP — Tablica ogłoszeń | <https://bip.piaseczno.eu/artykuly/21/tablica-ogloszen> | Free-text articles; property announcements and result notices posted here (115 pages of entries as of 2026-06-29) |
| Municipal website — Nieruchomości category | <https://piaseczno.eu/category/nieruchomosci/> | WordPress mirror of BIP property posts, with photos |
| BIP — Zamówienia publiczne (public procurement) | <https://bip.piaseczno.eu/przetargi/23> | Service/works/supplies tenders only — NOT property sales |

Individual announcement pattern:
- BIP article: `https://bip.piaseczno.eu/artykul/21/{ID}/{slug}`
- piaseczno.eu post: `https://piaseczno.eu/{slug}/`

RSS available: `https://bip.piaseczno.eu/rss` (site-wide) and `https://bip.piaseczno.eu/rss/21`
(Tablica ogłoszeń category feed — directly useful for scraping).

No dedicated "wyniki przetargów nieruchomości" index page found. Result notices appear as separate
articles in the same Tablica ogłoszeń feed, titled e.g. "Informacja o wyniku przetargu …".

## 3. Format + rendering

- **HTML** — clean server-rendered HTML via Logonet CMS (version 2.9.0), no JavaScript required
  to load main content. BIP page last updated 2026-06-29 08:43 — site is live and current.
- Announcement body: structured free prose within `<article>` / `<div>` content area.
  Key fields (cena wywoławcza, wadium, date of auction) are embedded in bold paragraphs, not in
  structured tables.
- PDF export button exists per-article (`/artykul/pdf/{cat}/{id}/1`) but is a print-style PDF of
  the same HTML — not a scanned document.
- No login / auth wall observed. No Cloudflare or bot challenge encountered on any fetch.
- No SPA / JS-only rendering. Standard anchor navigation between pages (pagination via
  `/artykuly/21/{page}/{perpage}/tablica-ogloszen`).
- RSS feed at `/rss/21` provides titles + links for new articles — this is the most efficient
  polling mechanism.

## 4. Volume + achieved-price stream

- **Estimated flat-auction volume: very low — 1–3 per year at most.** Only one confirmed flat
  auction found across 2024 (the Sikorskiego 1A flat). The piaseczno.eu Nieruchomości feed shows
  mostly land plots (działki) and occasional commercial spaces; related articles visible in the feed
  are land only (działka 539/8, 539/10 — multiple rounds 2025–2026).
- **Achieved price (wynik) stream: UNSTRUCTURED.** Result notices appear as free-text articles on
  the Tablica ogłoszeń, not in the BIP "Zamówienia publiczne" structured database. There is no
  dedicated results index page. Extracting achieved price requires parsing a free-text article body.
- No JSON/API endpoint for property results found.
- BIP CMS does have XML per-article (`/artykul/xml/{cat}/{id}/1`) but these are metadata wrappers,
  not structured auction-result records.

## 5. Adapter effort + verdict

**Closest analog: none of the existing adapters match well.** Bytom/Zabrze/Gliwice have dedicated
housing-manager BIPs with continuous flat-sale streams. Kraków has a separate ZBK. Piaseczno
resembles a smaller generic city-BIP property adapter (cf. Tarnowskie Góry pattern) but with even
lower flat volume.

**Effort assessment (Medium):**
- Scraping the RSS feed (`/rss/21`) for new Tablica ogłoszeń articles is straightforward.
- Detecting flat-auction articles requires a keyword filter (lokal mieszkalny, spółdzielcze
  własnościowe prawo, przetarg pisemny nieograniczony na sprzedaż).
- Parsing cena wywoławcza, wadium, date from free-text HTML is doable but fragile (no fixed
  template across years).
- Achieved-price scraping requires a second pass: find a paired "wynik" article by slug/title
  matching. No guaranteed link from announcement to result notice.
- No auth / CAPTCHA blocker.

**Blockers:**
1. Volume is too low for a standalone adapter to pay off: ~1–2 flat auctions per year.
2. Auction form is pisemny, not ustny — still valid (Rozp. RM 2004 covers both), but confirms
   this is not a high-throughput bidding stream.
3. No dedicated housing-manager entity — municipally fragmented, ad-hoc.
4. Result-price extraction requires heuristic free-text parsing with uncertain reliability.

**VERDICT: NO-BUILD.** Flat-auction volume is too low (1–3/year) to justify maintaining a Piaseczno
adapter. Should the gmina begin disposing of larger municipal flat stock (e.g. post-renovation
buildings) this should be re-evaluated. Monitor the Nieruchomości RSS feed passively.

**Confidence: High** — both announcement and format confirmed live on 2026-06-29.
