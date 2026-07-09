# Spike — Zduńska Wola (Łódzkie · powiat zduńskowolski)
> **Status:** spike LIVE — 2026-07-09. VERDICT: BUILD (Low effort).

## TL;DR
Gmina Miasto Zduńska Wola (Urząd Miasta, gmina miejska ~41k) sells municipal property — **including lokale mieszkalne** — via *pierwszy/kolejny przetarg ustny nieograniczony na sprzedaż*. Notices and results live on the city BIP `bip.zdunskawola.pl`, which runs the **Logonet eUrząd** CMS (footer: "Wersja systemu: 2.9.0 · CMS i hosting: Logonet Sp. z o.o. w Bydgoszczy"). A dedicated **"Sprzedaż nieruchomości – przetargi"** board with clean server-rendered HTML, per-notice detail pages at `/przetarg-nieruchomosci/<id>/<slug>`, structured fields (cena wywoławcza, wadium, date, round), and **inline results** — the achieved price + nabywca render on the same detail page (ul. Torowa sold 324 000 zł to małż. Wojciechowscy), plus `W trakcie rozstrzygania` / `Rozstrzygnięte` status filters. Flat auctions recur but cycle in/out (active board on spike day = 2 land plots); confirmed flats: 1 Maja 10/18 (cena wyw. 185 000 zł, Nov 2025), Baczyńskiego 11, Karsznice. Closest analog: **Pabianice / Łask** (same Łódzkie + same Logonet CMS), or `tarnowskie-gory` / `skarzysko-kamienna`. No technical blockers.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Urząd Miasta Zduńska Wola (Biuro Gospodarki Nieruchomościami, ul. Stefana Złotnickiego 13, pok. 416, tel. 43 825 02 11) runs `przetarg ustny nieograniczony` for sale of municipal property. Confirmed OPEN oral auctions:
- **ul. 1 Maja 10 / lok. 18** — lokal mieszkalny, 64,40 m², 3 pokoje, II piętro; cena wyw. **185 000 zł**, wadium 18 500 zł; przetarg 20.11.2025 (flat, open oral).
- **ul. Baczyńskiego 11** — two flats in a block offered for sale (miasto sprzedaje mieszkania).
- **osiedle Karsznice** — flat offered at auction (UM Zduńska Wola).
- **ul. Torowa** — I przetarg ustny nieograniczony, nieruchomość niezabudowana 9 232 m², cena wyw. 320 000 zł, wadium 32 000 zł, 24.06.2026 → **sold 324 000 zł** (result inline).
- **ul. Karola Szymanowskiego** — I przetarg ustny nieograniczony, niezabudowana, cena wyw. 108 000 zł, 08.07.2026.

**Caveat (in scope, but watch mix):** the city also sells communal flats to sitting tenants *bezprzetargowo* with a bonifikata — Council recently cut the tenant discount from max 95% → **75%** — and TBS Złotnicki runs *rental* auctions (najem), not sales. Those are OUT of scope. The BUILD stream is the open `przetarg ustny nieograniczony na sprzedaż` on the property board, which mixes flats + land + occasional lokal użytkowy; flats appear intermittently.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Logonet eUrząd CMS):**
- Property-sale auctions board: `https://bip.zdunskawola.pl/przetargi-nieruchomosci/439`
- Alt board index / paginated: `https://bip.zdunskawola.pl/przetargi-nieruchomosci/1/10`
- Standing article "Przetargi na zbycie nieruchomości": `https://bip.zdunskawola.pl/artykuly/415/przetargi-na-zbycie-nieruchomosci`
- Notice detail pattern: `https://bip.zdunskawola.pl/przetarg-nieruchomosci/<id>/<address-slug>` — e.g. `.../przetarg-nieruchomosci/12972/zdunska-wola-ul-torowa`
- Zamówienia publiczne (works/services, not property): `https://bip.zdunskawola.pl/przetargi/23`
- Status filters exposed by the board: `W trakcie rozstrzygania` (open) / `Rozstrzygnięte` (resolved) — results are **inline on the detail page**, no separate results host.

**Do NOT confuse** with the rural **Gmina Zduńska Wola** (separate JST, gmina wiejska), whose BIP is `zdunskawola.bip.net.pl` (bip.net.pl CMS, `/kategorie/13-przetargi`) + legacy `zdunskawola.archiwum.bip.net.pl`. Also distinct: Starostwo Powiatowe `bip.powiatzdunskowolski.pl`. Our target is the TOWN **Miasto Zduńska Wola** → `bip.zdunskawola.pl`.

## 3. Format + rendering
- **Server-rendered HTML** — Logonet eUrząd 2.9.0. Board is a dated HTML list; each notice is a structured HTML detail page with labelled fields (typ przetargu, cena wywoławcza, wadium, termin, runda) — parse from DOM/regex, no JS gate.
- **No SPA, no auth, no CAPTCHA** observed; fetched cleanly with default UA.
- Each detail page carries an **announcement PDF** and (once resolved) a **results PDF**; the achieved price + nabywca are also rendered inline in HTML, so PDF parsing is optional (born-digital `pdfText` if needed, OCR unlikely).

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest — a handful of property auctions/yr across a mixed flats+land board. Flats appear intermittently (a few/yr), often repeated as II/III przetarg when unsold or routed to tenant bezprzetargowo sales.
- **Achieved-price stream:** **YES, strong.** Detail pages flip to `Rozstrzygnięte` and render `nabywca` + achieved price inline (confirmed: Torowa 324 000 zł → małż. Wojciechowscy). Announcement carries `cena wywoławcza`; resolved page carries the hammer price — both from the same server HTML, no second board to crawl.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **Pabianice** / **Łask** — same Łódzkie region **and** same Logonet CMS (already spiked in repo); failing that, `tarnowskie-gory` / `skarzysko-kamienna` / `kedzierzyn-kozle` (Logonet family per ADAPTER-GUIDE §3).
- **CMS family:** Logonet eUrząd (server-rendered HTML; result notices inline; born-digital PDFs).
- **Effort:** **LOW.** Board `/przetargi-nieruchomosci/439` → detail `/przetarg-nieruchomosci/<id>/<slug>` → DOM/regex parse (parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, termin, runda); second pass keys off the same page's `Rozstrzygnięte` state for cena osiągnięta + nabywca. Classify + keep flats/land; drop najem (TBS) and bezprzetargowo tenant sales.
- **Blockers:** None. No rate-limit/auth signals. Only watch-items: (1) intermittent flat volume (mixed with land); (2) exclude TBS Złotnicki rental auctions and 75%-bonifikata tenant sales; (3) disambiguate town host `bip.zdunskawola.pl` from rural `zdunskawola.bip.net.pl`.

**VERDICT: BUILD (Low effort)** — recurring municipal flat + land `przetarg ustny nieograniczony` on a clean Logonet server-HTML BIP with inline achieved prices; direct same-voivodeship Logonet analog (Pabianice/Łask), no blockers.
