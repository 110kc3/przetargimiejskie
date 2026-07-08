# Spike — Opatów (Świętokrzyskie · powiat opatowski)
> **Status:** spike LIVE — 2026-07-08. VERDICT: NO-BUILD (—).

## TL;DR
Miasto i Gmina Opatów (gmina miejsko-wiejska, seat of powiat opatowski, ~6.2k in town) publishes property notices on its city BIP `www.bip.umopatow.pl`, an **akcessnet.net "System BIP"** installation (server-HTML, Windows-1250, `index.php?idg=N&id=N&x=N&y=N`, year-foldered boards). There is a housing company — **PGKiM Sp. z o.o. w Opatowie** (ul. Partyzantów 42) — but it only administers/rents the stock; it runs no flat-sale auctions and publishes no hammer prices. The whole "Przetargi na zbycie nieruchomości" archive (year folders 2007→2026) carries essentially **one** sale auction: a single 2024 *przetarg ustny **ograniczony** na sprzedaż nieruchomości **gruntowej*** (limited LAND auction). **Zero** open (nieograniczony) auctions, **zero** *lokal mieszkalny* (flat) auctions in any year, and the dedicated results board ("Wyniki postępowania przetargowego", years 2003→2022) is empty ("Brak publikacji"). No open flat-auction volume, no achieved-price stream → NO-BUILD, exactly as anticipated for a small Świętokrzyskie seat.

## 1. Sells municipal property at auction?
**Barely — and NOT flats.** The gmina uses `ustny przetarg` for disposal, but live evidence shows the archive is almost entirely dormant. Sweeping every year board under "Przetargi na zbycie nieruchomości" (idg=5) for 2012–2026, the only sale-auction content found is on the **2024** board (id=975):
- **"Pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej"** — a **limited** (ograniczony, not open) auction on **land** (gruntowej), stanowiącej własność Gminy Opatów.

Counts across all sampled year boards (2012–2026): *przetarg ustny nieograniczony* = **0**, *lokal mieszkalny* = **0**, *dzierżawa* auctions = 0 on the sale board. Housing disposal here is not done via recurring open flat auctions (typical small-gmina pattern: bezprzetargowo na rzecz najemcy / wykaz lists off-board). This fails the BUILD heuristic on the single most important axis: open flat-auction volume ≈ 0.

## 2. Where published? (hosts + boards, URLs)
**Primary — city BIP (akcessnet.net System BIP):** `https://www.bip.umopatow.pl`
- Property-sale announcements ("Przetargi na zbycie nieruchomości"): `https://www.bip.umopatow.pl/index.php?idg=5&id=286&x=70` — year sub-folders: 2026 `id=1051`, 2024 `id=975`, 2021 `id=847`, 2020 `id=814`, 2019 `id=736`, 2018 `id=692`, 2017 `id=655`, 2016 `id=620`, 2015 `id=585`, 2014 `id=547`, 2013 `id=520`, 2012 `id=490` … back to 2007 `id=287`.
- Results ("Przetargi - Wyniki postępowania przetargowego"): `https://www.bip.umopatow.pl/index.php?idg=11&id=55&x=1` — year folders 2003→2022 (2022 `id=877`, 2021 `id=839`, 2020 `id=801`). Sampled 2020/2021/2022 = **"Brak publikacji"** (never populated).
- Housing company (Majątek Gminny): PGKiM Sp. z o.o. w Opatowie — `https://www.bip.umopatow.pl/index.php?idg=2&id=178&x=300` (ul. Partyzantów 42, 27-500 Opatów; sekretariat@pgkimopatow.pl; tel. 15 868-27-87). Administers/rents municipal housing; no sale-auction notices, no achieved prices.
- Wykazy: "Rejestry, wykazy i ewidencje" `https://www.bip.umopatow.pl/index.php?idg=2&id=168&x=900`.

Contact: Urząd Miasta i Gminy, ul. Plac Obrońców Pokoju 34, 27-500 Opatów.

**Do NOT confuse (there are 3 Opatóws):**
- `bip.opatow.akcessnet.net` + `opatow.gmina.pl` = **rural Gmina Opatów, woj. ŚLĄSKIE, pow. kłobucki** (its own akcessnet BIP; przetargi there are roads/lighting procurement + a ZGKiM at 42-152). Out of scope.
- `bip.opatow.pl` = **Starostwo Powiatowe w Opatowie** (the county, not the gmina). Out of scope.
- `bip.opatowek.pl` = **Opatówek** (wielkopolskie), unrelated.

## 3. Format + rendering
- **Server-rendered HTML**, akcessnet.net "System BIP" — confirmed live via curl (Polish residential IP). Charset **Windows-1250** (needs decode, not UTF-8). No JS-SPA, no auth, no CAPTCHA, no rate-limit signals.
- URL model: `index.php?idg=<section>&id=<node>&x=<pos>&y=<pos>`; boards are year-foldered with pagination ("następna strona"); notices are HTML article pages, occasionally with a born-digital PDF attachment (the 2024 land notice carries one).
- Trivially scrapeable rendering-wise (same family/shape as the śląskie sister site `bip.opatow.akcessnet.net`) — but there is nothing worth scraping.

## 4. Volume + achieved-price stream
- **Open flat auctions:** none found in any year (2012–2026). Total sale auctions of any kind on the live board: **1** (2024, limited, land).
- **Achieved-price stream:** **none.** A dedicated "Wyniki postępowania przetargowego" board exists with year folders 2003→2022 but the recent years sampled are all empty ("Brak publikacji"). No cena osiągnięta / nabywca data to harvest.
- This is a generic small-gmina BIP skewed to occasional land + (off-board) tenant sales — precisely the NO-BUILD profile in the brief.

## 5. Adapter effort + verdict (closest analog; blockers)
- **Closest analog (rendering only):** akcessnet.net "System BIP" server-HTML — same shape as the śląskie `bip.opatow.akcessnet.net` and other akcessnet gminy; behaviourally a plain year-foldered HTML BIP (bip.info.pl-class). An adapter would be Low effort *technically*.
- **But effort = — (do not build):** there is no target signal — 0 open flat auctions, 0 achieved prices, an empty results board, and a housing company that only manages/rents. Building a parser would yield an empty/near-empty stream.
- **Blockers:** the data itself. Windows-1250 encoding is a minor nuisance; the real blocker is absence of flat-auction volume.

**VERDICT: NO-BUILD** — clean, scrapeable akcessnet server-HTML BIP, but municipal residential disposal is not done via recurring open flat auctions: the entire sale archive holds a single 2024 limited land auction, the results board is empty, and PGKiM only administers housing. No volume, no hammer-price stream.
