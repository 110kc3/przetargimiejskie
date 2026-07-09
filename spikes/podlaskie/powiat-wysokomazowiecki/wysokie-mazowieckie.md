# Spike — Wysokie Mazowieckie (Podlaskie · powiat wysokomazowiecki)
> **Status:** spike LIVE — 2026-07-09. VERDICT: NO-BUILD (no open flat-auction stream).

## TL;DR
Gmina Miejska (Miasto) Wysokie Mazowieckie **does** sell municipal property, but its **auctions (przetarg ustny nieograniczony) are land-only** — niezabudowane nieruchomości gruntowe (e.g. the Warszawska plots). Municipal **flats (lokale mieszkalne) are disposed of `w trybie bezprzetargowym / w drodze bezprzetargowej na rzecz dotychczasowego najemcy`** — i.e. sitting-tenant sales published only as a *wykaz*, never as an open oral auction with a competitive hammer price. That is the standard podlaskie town pattern and it puts the only in-scope stream (open flat auctions) out of scope. BIP runs the **Wrota Podlasia / podlaskie.eu** hosted CMS (`bip-umwysokiemaz.podlaskie.eu`, legacy `bip.um.wysmaz.wrotapodlasia.pl`). No dedicated municipal housing manager (only a Spółdzielnia Mieszkaniowa — a cooperative, not a JST manager). **NO-BUILD.**

## 1. Sells municipal property at auction?
**Land YES; flats NO (bezprzetargowo).** The Urząd Miasta Wysokie Mazowieckie publishes, on its "Inne ogłoszenia" board:
- **Open oral auctions — land only:** "Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż niezabudowanej nieruchomości gruntowej", "…o trzecim przetargu ustnym nieograniczonym na sprzedaż niezabudowanej nieruchomości", plus the batch sale of unbuilt plots on ul. Warszawska. All *niezabudowane grunty* — no lokale mieszkalne go to auction.
- **Flats — non-auction, sitting tenant:** "Ogłoszenie o wykazie lokalu mieszkalnego przeznaczonego do zbycia **w trybie bezprzetargowym**" and "…**do sprzedaży w drodze bezprzetargowej na rzecz dotychczasowego najemcy**" (with an udział in użytkowanie wieczyste gruntu). These are wykazy (designation lists), not competitive auctions — no cena wywoławcza contest, no achieved hammer price.
- **Results board:** "Informacja o wyniku przetargu ustnego nieograniczonego…" exists, but tracks the land auctions (and lokal-lease tenders), not flat sales.

So the one in-scope signal — an **open oral flat auction** — is absent. This is the textbook podlaskie land-only / tenant-flat profile flagged in the dispatch.

**Disambiguation:** target is the **TOWN** — *Miasto (Gmina Miejska) Wysokie Mazowieckie*, BIP `bip-umwysokiemaz.podlaskie.eu`. Do **not** confuse with the surrounding rural **Gmina Wysokie Mazowieckie** (separate JST), whose BIP is `ugwm.biuletyn.net` on the **biuletyn.net** CMS — a different host/platform, out of scope here.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (Wrota Podlasia / podlaskie.eu hosted CMS):**
- Inne ogłoszenia (property notices, auctions, wykazy, results): `https://bip-umwysokiemaz.podlaskie.eu/ogloszenia/inne/`
- Legacy mirror (same content, older host, DNS intermittently down): `http://bip.um.wysmaz.wrotapodlasia.pl/ogloszenia/inne/inne.html`
- Zamówienia publiczne (works/services procurement — not property): `https://bip-umwysokiemaz.podlaskie.eu/zamowieniap/`
- Note: an alternate label `bip-umwysokiemaz.wrotapodlasia.pl` did **not** resolve on this Pi (ENOTFOUND); the live host is the `podlaskie.eu` variant.

**Not a source for us:**
- Spółdzielnia Mieszkaniowa Wysokie Mazowieckie (`sm-wysmaz.pl`) — a housing **cooperative**, sells its own lokale użytkowe; not municipal, not a JST manager.
- Starostwo Powiatowe (`bip-stwysmaz.wrotapodlasia.pl`) — county, different owner, out of scope.
- Rural Gmina Wysokie Mazowieckie (`ugwm.biuletyn.net`) — separate JST.

## 3. Format + rendering
- **Server-rendered HTML** — Wrota Podlasia / podlaskie.eu hosted BIP. Descriptive slug URLs `/ogloszenia/inne/<year>/<descriptor>.html`; some notices attach born-digital PDFs via `/resource/` paths. No SPA, no auth, no CAPTCHA observed.
- If built, this CMS is straightforward to parse (plain HTML lists + occasional `pdfText` PDFs). The blocker is **content, not format**: there is no flat-auction stream to extract.

## 4. Volume + achieved-price stream
- **Open flat auctions/yr: ~0.** Flats leave municipal ownership via bezprzetargowa sprzedaż na rzecz najemcy (wykaz only) — no competitive price, no result notice for flats.
- **Land auctions:** a handful per year (Warszawska plots, occasional single niezabudowana działka; some reach II/III przetarg). In scope for a land dataset, but not the flat target.
- **Achieved-price stream:** the "Informacja o wyniku przetargu" board carries land-auction and lease-tender results only — **no flat hammer prices**. Nothing to feed the municipal-flat price stream.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (if ever built for land):** any Wrota Podlasia / podlaskie.eu hosted BIP (podlaskie town pattern) — plain server HTML board + `/resource/` PDFs. Low technical effort.
- **CMS family:** Wrota Podlasia / podlaskie.eu hosted BIP (server-rendered HTML; "WordPress / custom HTML" family in ADAPTER-GUIDE §3 terms).
- **Effort:** **— (n/a).** Not worth building: no in-scope flat-auction data regardless of how easy the HTML is.
- **Blockers:** **Content blocker — decisive.** Municipal flats are sold bezprzetargowo to sitting tenants (wykaz only); auctions are land-only; no achieved-price stream for flats. No dedicated municipal housing manager (ZGM/TBS), only a cooperative. Minor operational note: the `wrotapodlasia.pl` host label was DNS-unresolvable from the Pi; use `bip-umwysokiemaz.podlaskie.eu`.

**VERDICT: NO-BUILD** — small podlaskie town: open oral auctions are land-only, municipal flats go bezprzetargowo na rzecz najemcy (wykaz, no hammer price), no housing-manager flat-auction stream. Clean Wrota Podlasia/podlaskie.eu HTML, but nothing in scope to extract.
