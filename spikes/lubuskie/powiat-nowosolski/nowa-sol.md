# Spike — Nowa Sól (Lubuskie · powiat nowosolski)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Low effort).

## TL;DR

Gmina Nowa Sól-Miasto (Prezydent Miasta) runs regular *przetargi ustne nieograniczone* for the sale of municipal flats (lokale mieszkalne). Auctions are published on a single WordPress site at `nowasol.pl/przetargi`, rendered as clean server-side HTML with structured data tables (address, KW number, area, cena wywoławcza, wadium). No auth, no SPA, no PDF. Page 1 of the listing index was fetched live and shows 2 flat-sale notices dated 22 June 2026 and 25 June 2026. A full individual listing was fetched live (ul. Głogowska 28 lokal nr 4, cena wywoławcza 105 000 zł, auction 30 July 2026). Volume across pages 1–2: at least 5 lokal mieszkalny auctions visible in ~3 months (Jan–Jun 2026). Achieved-price stream is NOT published on the same page; results appear to be accessible via BIP (`bip.nowasol.pl/przetargi.html`) or the older BIP mirror (`bip2.nowasol.mserwer.pl`) — not confirmed live but indexed by search. The housing manager ZUM (Zakład Usług Mieszkaniowych Sp. z o.o., `zum.nowasol.pl`) handles property viewings (contact emails `p.suska@zum.nowasol.pl`, `d.slotwinska@zum.nowasol.pl`) but does NOT publish separate auctions — those remain with the Wydział Gospodarki Nieruchomościami at the city hall.

---

## 1. Sells municipal property at auction?

**YES — confirmed LIVE.** Gmina Nowa Sól-Miasto holds *przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych*, announced by the Prezydent Miasta. This is NOT bezprzetargowa sale to existing tenants. Examples observed live on 2026-06-29:

- *Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4 w budynku nr 28, przy ul. Głogowskiej* — pub. 25 June 2026, auction 30 July 2026, cena wywoławcza **105 000 zł**, wadium 10 000 zł.
  URL: https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-4-w-budynku-nr-28-przy-ul-glogowskiej/25-06-2026
- *Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 w budynku nr 34 przy ul. B. Chrobrego* — pub. 22 June 2026.
- *Przetarg na sprzedaż lokalu mieszkalnego nr 7 w budynku nr 6, przy ul. Hutniczej* — pub. 25 May 2026.
- Two further lokal mieszkalny auctions published 27 January 2026 (page 2 of index).

Some flats appear repeatedly (same flat re-auctioned after failed prior rounds — e.g. ul. Głogowska lokal 4 previously held on 2 March 2026 and 21 May 2026, now 30 July 2026), which is normal and confirms continuous pipeline.

---

## 2. Where published? (hosts + boards, URLs)

**Primary publication board (announcements):**
- `https://nowasol.pl/przetargi` — official city website, WordPress 6.7.5, Wydział Gospodarki Nieruchomościami. Paginated list (3 pages observed). Individual listing URLs follow pattern: `https://nowasol.pl/przetargi/przetarg/{slug}/{YYYY-MM-DD}`.

**BIP (Biuletyn Informacji Publicznej):**
- `https://bip.nowasol.pl/przetargi.html` — BIP UM Nowa Sól, also references RODO klauzula for przetargi. May carry result notices (informacja o wyniku). Fetch returned empty body (bot-blocked or CAPTCHA); confirmed real via search snippets.
- `http://bip2.nowasol.mserwer.pl/subcontent.php?cms_id=1002&p=p4` — older BIP mirror, lists *Przetarg na sprzedaż lokali mieszkalnych i użytkowych*, also confirmed in search snippets. Legacy, may not carry latest notices.

**Achieved-price / wynik notices:**
- Not visible on the `nowasol.pl/przetargi` listing pages (announcements only). Polish law (art. 12 ustawy o gosp. nieruchomościami) requires result notices to be posted on the same board for ≥7 days. Likely posted at `bip.nowasol.pl` or as a separate "informacja o wyniku" page under the same WordPress slug — to be confirmed by adapter at build time.

**Contact / responsible office:**
- Wydział Gospodarki Nieruchomościami UM Nowa Sól, ul. Parafialna 2, 67-100 Nowa Sól. Tel. 68 459 03 40 / 43 / 45. Email: gn@nowasol.pl, masiakm@nowasol.pl. Naczelnik: Piotr Żuberek.
- Housing manager ZUM (Zakład Usług Mieszkaniowych Sp. z o.o.): https://zum.nowasol.pl/ — handles viewings only, not auctions.

---

## 3. Format + rendering

| Property | Value |
|---|---|
| CMS | WordPress 6.7.5 |
| Rendering | Server-side HTML, fully rendered on first fetch — no JavaScript required |
| Content type | `text/html; charset=UTF-8` |
| Structured data | HTML `<table>` inside each listing: columns Lp., KW Nr, Opis nieruchomości (obreb, address, działka, udział w gruncie), Opis lokalu (lokal nr, pow. użytkowa m², rooms, piętro, piwnica), Cena wywoławcza (PLN), Wadium (PLN) |
| Date in URL | Yes — YYYY-MM-DD in slug (`/25-06-2026`) = publication date, not auction date |
| Auction date | In prose body text ("Przetarg odbędzie się 30 lipca 2026 r.") |
| Floor plan image | PNG attached inline (e.g. `szkic-lokalu-nr-4-1024x724.png`) — informational only |
| Auth / bot block | None on `nowasol.pl`; `bip.nowasol.pl` returned empty body (possible Cloudflare/JS challenge) |
| Pagination | `nowasol.pl/przetargi/page/N` — standard WordPress pagination, 11 items/page |
| Previous auctions note | Inline prose lists prior auction dates for same property (useful for staleness detection) |

---

## 4. Volume + achieved-price stream

**Announcement volume (LIVE-VERIFIED, 2026-06-29):**
- Page 1 (11 items, ~Apr–Jun 2026): 2 × lokal mieszkalny, 1 × lokal użytkowy, 1 × nieruchomość zabudowana, rest = działki/garaże.
- Page 2 (11 items, ~Dec 2025–Mar 2026): 2 × lokal mieszkalny (27 Jan 2026), 1 × lokal użytkowy, rest = działki/garaże.
- Rough rate: **~1–2 flat auctions per month**, consistent cadence. Some are re-runs of the same flat (3 rounds observed for ul. Głogowska 28/4).

**Distinct flats observed Jan–Jun 2026 (~6 months):** at minimum 4–5 distinct lokale mieszkalne auctioned (some recurring). Low-to-medium volume city (pop. ~37 000).

**Achieved-price stream:**
- NOT confirmed live — `bip.nowasol.pl/przetargi.html` body was empty on fetch (likely JS-gated BIP). Per legal requirement, results must be posted publicly. The infopublikator.pl aggregator (https://infopublikator.pl/ogloszenia/) picks up Nowa Sól flat-auction announcements, suggesting content is machine-readable.
- Risk: result notices may be on BIP only (not on `nowasol.pl`), requiring a second scrape target. Fallback: result notices sometimes posted as separate items in the same `nowasol.pl/przetargi` WordPress list — needs adapter verification.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom pattern — city-BIP hybrid with a WordPress front-end carrying structured HTML tables, Wydział Gospodarki Nieruchomościami as single publisher, no housing-company intermediary for the auction itself.

**Effort assessment: LOW**

| Factor | Detail |
|---|---|
| Scrape target | Single domain, single paginated WordPress list — trivial |
| HTML structure | Clean `<table>` inside each listing; data is well-labelled |
| Auth/captcha | None on primary source (`nowasol.pl`) |
| Result (wynik) notices | Secondary target `bip.nowasol.pl` may be JS-gated — fallback: check same WordPress list for "informacja o wyniku" posts, or use infopublikator.pl as proxy |
| Volume | ~1–2 flat announcements/month — manageable, low noise |
| Re-auction pattern | Same flat re-listed 2–3× before sale — deduplication by KW number + lokal number recommended |
| URL pattern | Stable slug + date, no session tokens |

**Blockers:**
- `bip.nowasol.pl` returns empty body on direct fetch — if result notices live there exclusively, a headless-browser pass or Chrome MCP fetch will be needed for the achieved-price stream. Low priority if announcement stream is the primary goal.
- ZUM email contacts embedded in listing body (viewings); not relevant to adapter but confirms ZUM is NOT a separate auction source.

**Risks:**
- Low: WordPress structure stable, no custom JS framework.
- Medium: achieved-price / wynik data location unconfirmed (BIP vs. WordPress) — needs one live check at adapter build time.

**VERDICT: BUILD** — clean WordPress HTML, confirmed flat auctions at steady cadence, single scrape target, no auth. Low effort. Achieved-price stream needs one extra check but is not a blocker for the announcement adapter.
