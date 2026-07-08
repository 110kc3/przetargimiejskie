# Spike — Łęczyca (Łódzkie · powiat łęczycki)
> **Status:** spike LIVE — 2026-07-08. VERDICT: BUILD (Medium effort).

## TL;DR
Miasto Łęczyca (gmina **miejska**, Burmistrz Miasta Łęczyca — distinct from the surrounding rural gmina Łęczyca) sells municipal **lokale mieszkalne** at **open oral auction** (*przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego*). Flats recur 2022→2026, standalone and inside mixed batches (flats + lokale użytkowe + land). Two publishing surfaces share the domain: the legally-authoritative BIP `bip.leczyca.info.pl` (Nefeni **BIPv2**, a Next.js SSR app with JSON backend `bip-api.leczyca.info.pl`, full text hidden in attached **Zarządzenie PDFs**), and the city news site `leczyca.info.pl` (**WordPress 6.5.8 + REST API**) that reposts every ogłoszenie as a **full-text HTML post** — the clean adapter target. No dedicated housing manager (no ZGM/ZBM/TBS); flats are sold directly by the Referat Gospodarki Nieruchomościami. Volume is low-to-modest (~a few flats/year) and the achieved-price stream is weak (no dedicated wyniki board on the new BIP). Closest analog: a WordPress-REST gmina (Brzeg / Nowa Sól pattern) for the news site; Nefeni (Mogilno) for the BIP fallback.

## 1. Sells municipal property at auction?
**YES — confirmed, incl. flats.** The Burmistrz Miasta Łęczyca runs `pierwszy/II/III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego`. Concrete, dated flat auctions (real addresses/areas/prices):
- **2025-06-03** — ul. **Zachodnia 19 / lok. 11**, 3. piętro, 2 pokoje + kuchnia + łazienka, **32,87 m²** — *pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego* (full inline text on leczyca.info.pl).
- **2023-10-26** batch — ul. **Zachodnia 21 / lok. 21**, 49,18 m², cena wywoławcza **240 000 zł**, wadium 12 000 zł; ul. **Szkolna 1 / lok. 14**, 45,89 m², **212 500 zł**, wadium 11 000 zł (+ 3 lokale użytkowe + 4 działki, all open oral auctions).
- Recurring flat-sale ogłoszenia: 2022-06-29 & 2022-09-15 ("sprzedaż lokali mieszkalnych i użytkowych"), 2024-02-27 & 2024-04-23 ("Nieruchomości lokalowe na sprzedaż"), 2024-07-11, 2024-01-12, 2023-11-07, 2023-06-27 batches.

Both natural and legal persons may bid; 10% wadium. Sold directly by the town (Referat Gospodarki Nieruchomościami, ul. Marii Konopnickiej 14, pok. 42, tel. 24 721 03 30) — **no ZGM/ZBM/MZBM/TBS** intermediary.

## 2. Where published? (hosts + boards, URLs)
**Authoritative — city BIP (Nefeni BIPv2 / Next.js):**
- Ogłoszenia board: `https://bip.leczyca.info.pl/kategorie/7-ogloszenia`
- Article URL pattern: `/kategorie/7-ogloszenia/artykuly/<id>-<slug>` (e.g. `.../1898-...`, `.../891-...`, `.../1253-ogloszenie-...-nieruchomosci-lokalowej`).
- JSON backend / static assets: `https://bip-api.leczyca.info.pl` (`/api/page-content`, `/api/image-proxy`; attachments + `/static/<hash>/thumbs/*.png|jpg`).
- Full ogłoszenie text lives in an **attached Zarządzenie Burmistrza PDF** (e.g. "120.100.2026", "120.125.2024") — the article body itself carries only title + date + attachment.

**Best parse target — city news site (WordPress 6.5.8):**
- REST API: `https://leczyca.info.pl/wp-json/wp/v2/posts?search=przetarg+ustny+nieograniczony` → full `content.rendered` HTML per notice (address, m², cena wywoławcza, wadium, date all inline).
- Hub page: `https://leczyca.info.pl/nieruchomosci-na-sprzedaz/`; example post `https://leczyca.info.pl/ogloszenie-o-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego/` (id 109674-class).

**Legacy archives (backfill / wyniki):** `http://biparch.leczyca.info.pl/news.html` (2011-2017 static HTML — carried winning bids / auction results), `https://leczyca.archiwum.bip.net.pl/` (bip.net.pl extranet archive).

**Do NOT confuse** with the rural **Gmina Łęczyca**: `bip.gminaleczyca.pl` / `gminaleczyca.pl` — separate JST, out of scope.

## 3. Format + rendering
- **leczyca.info.pl (primary):** WordPress 6.5.8, `wp-json/wp/v2/posts` returns clean JSON with full server-rendered HTML body; dated, searchable, paginated. No JS gate, no auth, no CAPTCHA. Ideal.
- **bip.leczyca.info.pl (authoritative):** Nefeni BIPv2 — a **Next.js SSR** app. Lists and article title/date **are** in the initial HTML (curl-parseable), but the substantive ogłoszenie is only in **PDF attachments** served from `bip-api.leczyca.info.pl` under hashed `/static/<hash>/` paths with generated **png/jpg thumbnails** → attachments are likely **image/scanned PDFs → OCR risk**, and the file URL must be resolved from the Next.js flight payload (no plain `href` in HTML). Harder path.
- Net: parse the WordPress REST full-text as the field source; treat the BIP as the legal cross-check / backfill.

## 4. Volume + achieved-price stream
- **Volume:** Low-to-modest but steady. WP REST shows a well-populated 2022→2026 auction stream; **flats appear a few times/year**, standalone (2025-06-03 Zachodnia 19/11; 2022 lokale mieszkalne posts) and inside mixed batches (2023-10-26 had 2 flats among 9 lots). On the spike day the active board skewed to land + one lokal użytkowy (Kościuszki 10, cena 43 000 zł) + a lease — i.e. flats cycle in/out, not permanently open.
- **Achieved-price stream:** **WEAK.** No dedicated *rozstrzygnięcia / informacja o wyniku przetargu* board on the new BIP; result notices appear ad hoc ("Wyciąg z ogłoszeń…" / occasional wynik posts). The 2011-2017 `biparch` archive did carry winning bids. Expect to parse cena wywoławcza reliably; hammer prices only opportunistically.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog:** **WordPress-REST/HTML gmina — Brzeg / Nowa Sól / Bochnia** pattern (parse `wp-json/wp/v2/posts`, regex per-lot over prose). Fallback/authoritative BIP mirrors the **Nefeni → Mogilno** family (Next.js + attachments).
- **Effort: MEDIUM.** WP REST gives clean full-text JSON, but: (a) fields are in Polish **prose**, not table columns — regex per lot (address via parseAddress, powierzchnia użytkowa, cena wywoławcza, wadium, data, runda); (b) **multi-lot batch posts** must be split and each lot **classified** (lokal mieszkalny vs lokal użytkowy vs grunt vs najem/dzierżawa lease — drop leases); (c) weak/ad-hoc results stream; (d) authoritative BIP text sits behind Next.js + likely scanned PDFs if a cross-check is required.
- **Blockers:** None hard. No rate-limit/auth/CAPTCHA signals on either host. Watch-items: dual-source dedupe (WP post vs BIP article) and lease/land filtering.

**VERDICT: BUILD (Medium effort)** — recurring open municipal flat auctions with real addresses/areas/prices, exposed cleanly via a WordPress REST API (with a Nefeni Next.js BIP as legal backstop); no blockers, only a weak achieved-price stream and free-text/multi-lot parsing keep it out of "Low".
