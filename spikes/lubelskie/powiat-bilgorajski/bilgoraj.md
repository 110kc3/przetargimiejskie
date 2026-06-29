# Spike — Biłgoraj (Lubelskie · powiat biłgorajski)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: NO-BUILD (High confidence).

## TL;DR

Gmina Miasto Biłgoraj auctions municipal property but exclusively **lokale użytkowe** (commercial/utility units), not **lokale mieszkalne** (residential flats). The city's TBS (100%-owned rental company) holds 135 flats and has never sold them at auction — it is a rental-only vehicle. No municipal flat-sale przetarg has been found across any source. This is a commercial-property-only city BIP; the residential question yields NO-BUILD.

---

## 1. Sells municipal property at auction?

**Yes — but commercial units only.** The Burmistrz Miasta Biłgoraja regularly runs *ustny przetarg nieograniczony* for city-owned property, confirmed with live pages:

- **Dec 2025 announcement** (auction 5 Feb 2026): lokal użytkowy Nr I, ul. Kościuszki 12 (31 m², cena wywoławcza 195 000 zł) + lokal użytkowy Nr III, Plac Wolności 15 (58 m², 365 000 zł). Reference codes PTR.6840.1.2025, PTR.6840.2.2025. Source: https://www.bilgoraj.pl/news/4913/ogloszenie-o-przetargu.html — LIVE-VERIFIED.
- **Apr 2026 announcement**: lokal użytkowy Nr II, ul. Kościuszki 12 (180 m², 865 000 zł). Source: https://przetargi.adradar.pl/przetarg/komercyjne/Bi%C5%82goraj/miasto/16878242 — LIVE-VERIFIED.
- **Earlier**: przetarg na dzierżawę gruntu Plac Wolności (2021), ref PTR.6845.28.2020. Source: https://www.bilgoraj.pl/news/2717/ogloszenie-o-przetargu.html — LIVE-VERIFIED.

**No *lokal mieszkalny* przetarg by Urząd Miasta Biłgoraj was found**, across bilgoraj.pl, umbilgoraj.bip.e-zeto.eu, adradar (Urząd Miasta filter), or any aggregator. All "mieszkania" results for Biłgoraj on adradar are komornik or syndyk auctions — private/court forced sales, not gmina-initiated. The adradar full listing for Urząd Miasta Biłgoraj shows only "komercyjne" entries.

The TBS Biłgoraj Sp. z o.o. (100% city-owned, Łąkowa 13, ~135 flats across 5 buildings at Łąkowa, Zamojska, Włosiankarska) is a **rental-only** entity. Its BIP (tbsbilgoraj.e-bip.eu) contains no flat-sale przetargi — only construction contracts, maintenance orders, and tenant procedures (wniosek o mieszkanie, regulamin przydziału). Source: https://tbsbilgoraj.e-bip.eu/index.php?id=17 — LIVE-VERIFIED.

**Verdict on Q1:** The gmina does NOT auction *lokale mieszkalne*. Residential flats are managed by TBS exclusively as rentals, consistent with standard TBS law (tenants cannot be sold to). This is a **commercial/utility-only auction city**.

---

## 2. Where published? (hosts + boards, URLs)

| Purpose | Host | URL |
|---|---|---|
| Primary announcement board (aktualności) | bilgoraj.pl (Goganet CMS) | https://www.bilgoraj.pl/news/[ID]/ogloszenie-o-przetargu.html |
| BIP (Urząd Miasta) | umbilgoraj.bip.e-zeto.eu (e-ZETO platform) | https://umbilgoraj.bip.e-zeto.eu/index.php (JS-heavy, main nav) |
| BIP legacy (now redirects/notice) | umbilgoraj.bip.lubelskie.pl | https://umbilgoraj.bip.lubelskie.pl/index.php?id=203 (shows migration notice) |
| TBS BIP | tbsbilgoraj.e-bip.eu | https://tbsbilgoraj.e-bip.eu/index.php?id=17 |

**Result notices (wyniki przetargu / informacja o wyniku):** No dedicated "wyniki" board found on either BIP or bilgoraj.pl. The e-ZETO BIP returned empty responses to direct URL fetches — it requires JavaScript rendering. No achieved-price publication was found through any channel. Result announcements, if they exist, are likely posted as further aktualności news items on bilgoraj.pl or buried inside the JS-rendered BIP.

**Bot/access notes:** bilgoraj.pl serves clean HTML, no auth, no bot block (LIVE-VERIFIED, full page fetched). umbilgoraj.bip.e-zeto.eu returned empty body on direct fetch — JS-rendered SPA requiring browser execution. tbsbilgoraj.e-bip.eu renders HTML sitemap on direct fetch but flags "JavaScript wyłączony" for main content.

---

## 3. Format + rendering

| Source | Format | Notes |
|---|---|---|
| bilgoraj.pl news articles | **HTML** — clean server-rendered | Announcement text inline, PDF attachments (consent form .docx). Images (PNG banner). Parseable with standard HTTP. |
| umbilgoraj.bip.e-zeto.eu | **SPA / JS-required** | Empty response on direct fetch; requires headless browser. Standard e-ZETO platform seen in other Polish BIPs. |
| tbsbilgoraj.e-bip.eu | HTML sitemap reachable; content JS-gated | Irrelevant (no flat sales). |

Primary scraping target (bilgoraj.pl aktualności) is **straightforward HTML**, no auth, no CAPTCHA observed. The BIP itself is JS-gated but is not the primary publication channel for przetargi — those go to bilgoraj.pl news first.

---

## 4. Volume + achieved-price stream

**Volume (municipal property auctions, all types):** Approximately 2–4 per year based on adradar history (Urząd Miasta Biłgoraj organiser filter). All observed are lokale użytkowe. No residential flat auctions in the observable 3-year window (2023–2026).

**Achieved-price stream:** No wyniki publication found on bilgoraj.pl or BIP. adradar does not show achieved prices for municipal przetargi (only komornik licytacje show cena uzyskana). This stream would need to be verified against a physical BIP board or direct contact — it is likely absent from any machine-readable channel.

---

## 5. Adapter effort + verdict

**Closest analog:** None of the existing adapters (Gliwice, Zabrze, Bytom, Kraków, Tarnowskie Góry) because those all publish *lokale mieszkalne*. The closest structural analog is a city that auctions only land/commercial (e.g., a small Lubelskie gmina).

**Blockers:**
- No *lokale mieszkalne* przetarg found — the fundamental signal is absent.
- TBS is rental-only; no flat-sale mechanism exists.
- BIP is JS-gated (secondary blocker, but irrelevant given #1).
- No achieved-price stream (secondary blocker).

**Risks:** If the city ever begins selling off inherited municipal flats (e.g., post-TBS restructuring), announcements would appear on bilgoraj.pl aktualności in clean HTML — low integration risk at that point. But currently zero volume means BUILD would have nothing to index.

**VERDICT: NO-BUILD** — Biłgoraj Miasto auctions commercial units only; no *ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych* exists. TBS is rental-only. Re-check warranted only if a flat-sale announcement appears on bilgoraj.pl. (High confidence — multiple sources cross-checked, live pages verified.)

---

### Sources
- https://www.bilgoraj.pl/news/4913/ogloszenie-o-przetargu.html (LIVE — Dec 2025 lokal użytkowy auction)
- https://www.bilgoraj.pl/news/2717/ogloszenie-o-przetargu.html (LIVE — 2020 dzierżawa gruntu)
- https://umbilgoraj.bip.e-zeto.eu/index.php (BIP main, JS-gated)
- https://umbilgoraj.bip.lubelskie.pl/index.php?id=203 (BIP migration notice)
- https://tbsbilgoraj.e-bip.eu/index.php?id=17 (TBS BIP sitemap, LIVE)
- https://przetargi.adradar.pl/p/a/10341/Bi%C5%82goraj/a (adradar Biłgoraj listings, LIVE — confirms Urząd Miasta = commercial only)
- https://przetargi.adradar.pl/przetarg/komercyjne/Bi%C5%82goraj/miasto/16878242 (Apr 2026 lokal użytkowy Nr II)
- https://rejestr.io/krs/163868/zaklad-gospodarki-mieszkaniowej-towarzystwo-budownictwa-spolecznego (TBS KRS, DESK)
