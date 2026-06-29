# SPIKE-PROGRESS — all-Poland city spike + build ledger

> Updated 2026-06-29. Resume point for the all-Poland spike + build-out.
> Master list: [master-cities.json](./master-cities.json) · convention: [README.md](./README.md).

## Roll-up (131 cities)

| Status | Count |
|---|---|
| ✅ Built (registered, tests green) | 46 |
| 🟢 BUILD (spiked, ready) | 30 |
| 🟡 NEEDS-LIVE-VERIFY | 2 |
| 🔴 NO-BUILD (spiked) | 44 |
| ❌ Dropped (prior, Śląsk) | 6 |
| ⏸️ Deferred (prior, Śląsk) | 3 |
| ⬜ Pending | 0 |

**Tiers.** Wave A = all **66 miasta na prawach powiatu** (100% spiked). Land-powiat seats spiked: **59**. Public site = Śląskie only; non-Śląskie are test-tier (`/archiwum-all`).

## Built adapters (46) — registered, parser tests green

Kłodzko, Legnica, Wałbrzych, Toruń, Łódź, Pabianice, Chełm, Nowa Sól, Chrzanów, Kraków, Olkusz, Oświęcim, Trzebinia, Warszawa, Brzeg, Kędzierzyn-Koźle, Nysa, Opole, Przemyśl, Augustów, Białystok, Gdańsk, Słupsk, Tczew, Wejherowo, Bielsko-Biała, Bytom, Cieszyn, Gliwice, Katowice, Mysłowice, Racibórz, Rybnik, Sosnowiec, Świętochłowice, Tarnowskie Góry, Zabrze, Kielce, Skarżysko-Kamienna, Giżycko, Olsztyn, Gniezno, Piła, Stargard, Szczecin, Świnoujście.

> **Needs clean rebuild (mount-sync corruption):** Bydgoszcz, Gorzów Wielkopolski (unregistered, tests stubbed).

## BUILD-ready queue (30, by effort)

Bełchatów (Low), Bochnia (Low), Ostrołęka (Low), Bolesławiec (Medium), Jelenia Góra (Medium), Lubin (Medium), Świdnica (Medium), Wrocław (Medium), Bydgoszcz (Medium), Grudziądz (Medium), Włocławek (Medium), Tomaszów Mazowiecki (Medium), Zgierz (Medium), Biała Podlaska (Medium), Gorzów Wielkopolski (Medium), Zakopane (Medium), Płock (Medium), Siedlce (Medium), Żyrardów (Medium), Chojnice (Medium), Malbork (Medium), Sopot (Medium), Starogard Gdański (Medium), Starachowice (Medium), Elbląg (Medium), Ełk (Medium), Kalisz (Medium), Poznań (Medium), Września (Medium), Kołobrzeg (Medium).

SPA/JS-rendered (use `core/render.js`): Świdnica, Malbork, Bolesławiec, Sopot, Zgierz, Starogard Gdański, Kołobrzeg, Zakopane, Września, Żyrardów.

## Caching / CI

Extraction caches (pdf/doc/ocr/rtf) content-addressed + committed. `core/known-urls.js` skips already-captured result pages (Białystok + Słupsk). `merge-history.js` drops null-twin duplicates. CI commit-push hardened (-X theirs + rebase --abort).

## Resume protocol

1. **Build:** clone the closest analog + groundtruthed `tests/parse-<city>.test.js`; register in `pipeline/src/cities/index.js`. Re-verify each build in a fresh shell (test + null-byte + node --check) BEFORE registering.
2. **Spike (breadth):** remaining land-powiat seats then the town long tail — expect mostly NO-BUILD.

## Ledger by voivodeship

### Dolnośląskie (9)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Bolesławiec | powiat boleslawiecki | C | 🟢 BUILD | Medium · LIVE | `dolnoslaskie/powiat-boleslawiecki/boleslawiec.md` |
| Jelenia Góra | Jelenia Góra— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `dolnoslaskie/jelenia-gora/jelenia-gora.md` |
| Kłodzko | powiat klodzki | D | ✅ BUILT | Medium · LIVE | `dolnoslaskie/powiat-klodzki/klodzko.md` |
| Legnica | Legnica— m.n.p.p. | A | ✅ BUILT | Low · LIVE | `dolnoslaskie/legnica/legnica.md` |
| Lubin | powiat lubinski | C | 🟢 BUILD | Medium · LIVE | `dolnoslaskie/powiat-lubinski/lubin.md` |
| Oleśnica | powiat olesnicki | D | 🔴 NO-BUILD | — · LIVE | `dolnoslaskie/powiat-olesnicki/olesnica.md` |
| Świdnica | powiat swidnicki | C | 🟢 BUILD | Medium · LIVE | `dolnoslaskie/powiat-swidnicki/swidnica.md` |
| Wałbrzych | Wałbrzych— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `dolnoslaskie/walbrzych/walbrzych.md` |
| Wrocław | Wrocław— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `dolnoslaskie/wroclaw/wroclaw.md` |

### Kujawsko-Pomorskie (7)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Brodnica | powiat brodnicki | H | 🔴 NO-BUILD | — · LIVE | `kujawsko-pomorskie/powiat-brodnicki/brodnica.md` |
| Bydgoszcz | Bydgoszcz— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `kujawsko-pomorskie/bydgoszcz/bydgoszcz.md` |
| Grudziądz | Grudziądz— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `kujawsko-pomorskie/grudziadz/grudziadz.md` |
| Inowrocław | powiat inowroclawski | B | 🔴 NO-BUILD | — · LIVE | `kujawsko-pomorskie/powiat-inowroclawski/inowroclaw.md` |
| Świecie | powiat swiecki | G | 🔴 NO-BUILD | — · LIVE | `kujawsko-pomorskie/powiat-swiecki/swiecie.md` |
| Toruń | Toruń— m.n.p.p. | A | ✅ BUILT | Low · LIVE | `kujawsko-pomorskie/torun/torun.md` |
| Włocławek | Włocławek— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `kujawsko-pomorskie/wloclawek/wloclawek.md` |

### Lubelskie (8)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Biała Podlaska | Biała Podlaska— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `lubelskie/biala-podlaska/biala-podlaska.md` |
| Biłgoraj | powiat bilgorajski | H | 🔴 NO-BUILD | — · LIVE | `lubelskie/powiat-bilgorajski/bilgoraj.md` |
| Chełm | Chełm— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `lubelskie/chelm/chelm.md` |
| Kraśnik | powiat krasnicki | G | 🔴 NO-BUILD | — · LIVE | `lubelskie/powiat-krasnicki/krasnik.md` |
| Lublin | Lublin— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `lubelskie/lublin/lublin.md` |
| Puławy | powiat pulawski | D | 🔴 NO-BUILD | — · LIVE | `lubelskie/powiat-pulawski/pulawy.md` |
| Świdnik | powiat swidnicki | D | 🔴 NO-BUILD | — · LIVE | `lubelskie/powiat-swidnicki/swidnik.md` |
| Zamość | Zamość— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `lubelskie/zamosc/zamosc.md` |

### Lubuskie (3)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Gorzów Wielkopolski | Gorzów Wielkopolski— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md` |
| Nowa Sól | powiat nowosolski | F | ✅ BUILT | Low · LIVE | `lubuskie/powiat-nowosolski/nowa-sol.md` |
| Zielona Góra | Zielona Góra— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `lubuskie/zielona-gora/zielona-gora.md` |

### Łódzkie (10)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Bełchatów | powiat belchatowski | B | 🟢 BUILD | Low · LIVE | `lodzkie/powiat-belchatowski/belchatow.md` |
| Kutno | powiat kutnowski | D | 🔴 NO-BUILD | — · LIVE | `lodzkie/powiat-kutnowski/kutno.md` |
| Łódź | Łódź— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `lodzkie/lodz/lodz.md` |
| Pabianice | powiat pabianicki | C | ✅ BUILT | Low–Medium · LIVE | `lodzkie/powiat-pabianicki/pabianice.md` |
| Piotrków Trybunalski | Piotrków Trybunalski— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `lodzkie/piotrkow-trybunalski/piotrkow-trybunalski.md` |
| Radomsko | powiat radomszczanski | F | 🔴 NO-BUILD | — · LIVE | `lodzkie/powiat-radomszczanski/radomsko.md` |
| Sieradz | powiat sieradzki | E | 🔴 NO-BUILD | — · DESK | `lodzkie/powiat-sieradzki/sieradz.md` |
| Skierniewice | Skierniewice— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `lodzkie/skierniewice/skierniewice.md` |
| Tomaszów Mazowiecki | powiat tomaszowski | C | 🟢 BUILD | Medium · LIVE | `lodzkie/powiat-tomaszowski/tomaszow-mazowiecki.md` |
| Zgierz | powiat zgierski | D | 🟢 BUILD | Medium · LIVE | `lodzkie/powiat-zgierski/zgierz.md` |

### Małopolskie (11)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Bochnia | powiat bochenski | F | 🟢 BUILD | Low · LIVE | `malopolskie/powiat-bochenski/bochnia.md` |
| Chrzanów | powiat chrzanowski | — | ✅ BUILT |  | `malopolskie/powiat-chrzanowski/chrzanow.md` |
| Kraków | Kraków— m.n.p.p. | A | ✅ BUILT |  | `malopolskie/krakow/krakow.md` |
| Nowy Sącz | Nowy Sącz— m.n.p.p. | A | 🟡 VERIFY | — · DESK | `malopolskie/nowy-sacz/nowy-sacz.md` |
| Nowy Targ | powiat nowotarski | B | 🔴 NO-BUILD | — · LIVE | `malopolskie/powiat-nowotarski/nowy-targ.md` |
| Olkusz | powiat olkuski | — | ✅ BUILT |  | `malopolskie/powiat-olkuski/olkusz.md` |
| Oświęcim | powiat oświęcimski | — | ✅ BUILT |  | `malopolskie/powiat-oswiecimski/oswiecim.md` |
| Tarnów | Tarnów— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE/DESK | `malopolskie/tarnow/tarnow.md` |
| Trzebinia | powiat chrzanowski | — | ✅ BUILT |  | `malopolskie/powiat-chrzanowski/trzebinia.md` |
| Wadowice | powiat wadowicki | H | 🔴 NO-BUILD | — · LIVE | `malopolskie/powiat-wadowicki/wadowice.md` |
| Zakopane | powiat tatrzanski | G | 🟢 BUILD | Medium · LIVE | `malopolskie/powiat-tatrzanski/zakopane.md` |

### Mazowieckie (11)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Ciechanów | powiat ciechanowski | D | 🔴 NO-BUILD | — · LIVE | `mazowieckie/powiat-ciechanowski/ciechanow.md` |
| Mińsk Mazowiecki | powiat minski | C | 🔴 NO-BUILD | — · LIVE | `mazowieckie/powiat-minski/minsk-mazowiecki.md` |
| Ostrołęka | Ostrołęka— m.n.p.p. | A | 🟢 BUILD | Low · LIVE | `mazowieckie/ostroleka/ostroleka.md` |
| Piaseczno | powiat piaseczynski | G | 🔴 NO-BUILD | — · LIVE | `mazowieckie/powiat-piaseczynski/piaseczno.md` |
| Płock | Płock— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `mazowieckie/plock/plock.md` |
| Pruszków | powiat pruszkowski | B | 🔴 NO-BUILD | — · LIVE | `mazowieckie/powiat-pruszkowski/pruszkow.md` |
| Radom | Radom— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `mazowieckie/radom/radom.md` |
| Siedlce | Siedlce— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `mazowieckie/siedlce/siedlce.md` |
| Warszawa | Warszawa— m.n.p.p. | A | ✅ BUILT | High · LIVE | `mazowieckie/warszawa/warszawa.md` |
| Wołomin | powiat wolominski | F | 🔴 NO-BUILD | — · LIVE | `mazowieckie/powiat-wolominski/wolomin.md` |
| Żyrardów | powiat zyrardowski | H | 🟢 BUILD | Medium · LIVE | `mazowieckie/powiat-zyrardowski/zyrardow.md` |

### Opolskie (4)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Brzeg | powiat brzeski | D | ✅ BUILT | Medium · LIVE | `opolskie/powiat-brzeski/brzeg.md` |
| Kędzierzyn-Koźle | powiat kędzierzyńsko-kozielski | — | ✅ BUILT |  | `opolskie/powiat-kedzierzynsko-kozielski/kedzierzyn-kozle.md` |
| Nysa | powiat nyski | B | ✅ BUILT | Low · LIVE | `opolskie/powiat-nyski/nysa.md` |
| Opole | Opole— m.n.p.p. | A | ✅ BUILT |  | `opolskie/opole/opole.md` |

### Podkarpackie (9)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Dębica | powiat debicki | D | 🔴 NO-BUILD | — · LIVE | `podkarpackie/powiat-debicki/debica.md` |
| Jarosław | powiat jaroslawski | D | 🔴 NO-BUILD | — · LIVE | `podkarpackie/powiat-jaroslawski/jaroslaw.md` |
| Krosno | Krosno— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `podkarpackie/krosno/krosno.md` |
| Mielec | powiat mielecki | C | 🔴 NO-BUILD | — · LIVE | `podkarpackie/powiat-mielecki/mielec.md` |
| Przemyśl | Przemyśl— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `podkarpackie/przemysl/przemysl.md` |
| Rzeszów | Rzeszów— m.n.p.p. | A | 🟡 VERIFY | — · LIVE/DESK | `podkarpackie/rzeszow/rzeszow.md` |
| Sanok | powiat sanocki | E | 🔴 NO-BUILD | — · LIVE | `podkarpackie/powiat-sanocki/sanok.md` |
| Stalowa Wola | powiat stalowowolski | B | 🔴 NO-BUILD | — · DESK | `podkarpackie/powiat-stalowowolski/stalowa-wola.md` |
| Tarnobrzeg | Tarnobrzeg— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `podkarpackie/tarnobrzeg/tarnobrzeg.md` |

### Podlaskie (4)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Augustów | powiat augustowski | H | ✅ BUILT | Medium · LIVE | `podlaskie/powiat-augustowski/augustow.md` |
| Białystok | Białystok— m.n.p.p. | A | ✅ BUILT | Low–Medium · LIVE | `podlaskie/bialystok/bialystok.md` |
| Łomża | Łomża— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `podlaskie/lomza/lomza.md` |
| Suwałki | Suwałki— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `podlaskie/suwalki/suwalki.md` |

### Pomorskie (9)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Chojnice | powiat chojnicki | E | 🟢 BUILD | Medium · LIVE | `pomorskie/powiat-chojnicki/chojnice.md` |
| Gdańsk | Gdańsk— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `pomorskie/gdansk/gdansk.md` |
| Gdynia | Gdynia— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `pomorskie/gdynia/gdynia.md` |
| Malbork | powiat malborski | D | 🟢 BUILD | Medium · LIVE | `pomorskie/powiat-malborski/malbork.md` |
| Słupsk | Słupsk— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `pomorskie/slupsk/slupsk.md` |
| Sopot | Sopot— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `pomorskie/sopot/sopot.md` |
| Starogard Gdański | powiat starogardzki | E | 🟢 BUILD | Medium · LIVE | `pomorskie/powiat-starogardzki/starogard-gdanski.md` |
| Tczew | powiat tczewski | B | ✅ BUILT | Medium · LIVE | `pomorskie/powiat-tczewski/tczew.md` |
| Wejherowo | powiat wejherowski | C | ✅ BUILT | Medium · LIVE | `pomorskie/powiat-wejherowski/wejherowo.md` |

### Śląskie (23)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Bielsko-Biała | Bielsko-Biała— m.n.p.p. | A | ✅ BUILT |  | `slaskie/bielsko-biala/bielsko-biala.md` |
| Bytom | Bytom— m.n.p.p. | A | ✅ BUILT |  | `slaskie/bytom/bytom.md` |
| Chorzów | Chorzów— m.n.p.p. | A | ❌ DROPPED |  | `slaskie/chorzow/chorzow.md` |
| Cieszyn | powiat cieszynski | B | ✅ BUILT | Medium · LIVE | `slaskie/powiat-cieszynski/cieszyn.md` |
| Częstochowa | Częstochowa— m.n.p.p. | A | ❌ DROPPED |  | `slaskie/czestochowa/czestochowa.md` |
| Dąbrowa Górnicza | Dąbrowa Górnicza— m.n.p.p. | A | ❌ DROPPED |  | `slaskie/dabrowa-gornicza/dabrowa-gornicza.md` |
| Gliwice | Gliwice— m.n.p.p. | A | ✅ BUILT |  | `slaskie/gliwice/gliwice.md` |
| Jastrzębie-Zdrój | Jastrzębie-Zdrój— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `slaskie/jastrzebie-zdroj/jastrzebie-zdroj.md` |
| Jaworzno | Jaworzno— m.n.p.p. | A | ⏸️ DEFERRED |  | `slaskie/jaworzno/jaworzno.md` |
| Katowice | Katowice— m.n.p.p. | A | ✅ BUILT |  | `slaskie/katowice/katowice.md` |
| Mysłowice | Mysłowice— m.n.p.p. | A | ✅ BUILT |  | `slaskie/myslowice/myslowice.md` |
| Piekary Śląskie | Piekary Śląskie— m.n.p.p. | A | ❌ DROPPED |  | `slaskie/piekary-slaskie/piekary-slaskie.md` |
| Racibórz | powiat raciborski | C | ✅ BUILT | Low · LIVE | `slaskie/powiat-raciborski/raciborz.md` |
| Ruda Śląska | Ruda Śląska— m.n.p.p. | A | ⏸️ DEFERRED |  | `slaskie/ruda-slaska/ruda-slaska.md` |
| Rybnik | Rybnik— m.n.p.p. | A | ✅ BUILT |  | `slaskie/rybnik/rybnik.md` |
| Siemianowice Śląskie | Siemianowice Śląskie— m.n.p.p. | A | ❌ DROPPED |  | `slaskie/siemianowice-slaskie/siemianowice-slaskie.md` |
| Sosnowiec | Sosnowiec— m.n.p.p. | A | ✅ BUILT |  | `slaskie/sosnowiec/sosnowiec.md` |
| Świętochłowice | Świętochłowice— m.n.p.p. | A | ✅ BUILT |  | `slaskie/swietochlowice/swietochlowice.md` |
| Tarnowskie Góry | powiat tarnogórski | — | ✅ BUILT |  | `slaskie/powiat-tarnogorski/tarnowskie-gory.md` |
| Tychy | Tychy— m.n.p.p. | A | ❌ DROPPED |  | `slaskie/tychy/tychy.md` |
| Zabrze | Zabrze— m.n.p.p. | A | ✅ BUILT |  | `slaskie/zabrze/zabrze.md` |
| Zawiercie | powiat zawiercianski | B | 🔴 NO-BUILD | — · LIVE | `slaskie/powiat-zawiercianski/zawiercie.md` |
| Żory | Żory— m.n.p.p. | A | ⏸️ DEFERRED |  | `slaskie/zory/zory.md` |

### Świętokrzyskie (4)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Kielce | Kielce— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `swietokrzyskie/kielce/kielce.md` |
| Ostrowiec Świętokrzyski | powiat ostrowiecki | C | 🔴 NO-BUILD | — · LIVE | `swietokrzyskie/powiat-ostrowiecki/ostrowiec-swietokrzyski.md` |
| Skarżysko-Kamienna | powiat skarzyski | H | ✅ BUILT | Low–Medium · LIVE | `swietokrzyskie/powiat-skarzyski/skarzysko-kamienna.md` |
| Starachowice | powiat starachowicki | C | 🟢 BUILD | Medium · LIVE | `swietokrzyskie/powiat-starachowicki/starachowice.md` |

### Warmińsko-Mazurskie (5)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Elbląg | Elbląg— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `warminsko-mazurskie/elblag/elblag.md` |
| Ełk | powiat elcki | F | 🟢 BUILD | Medium · LIVE | `warminsko-mazurskie/powiat-elcki/elk.md` |
| Giżycko | powiat gizycki | H | ✅ BUILT | Low–Medium · LIVE | `warminsko-mazurskie/powiat-gizycki/gizycko.md` |
| Olsztyn | Olsztyn— m.n.p.p. | A | ✅ BUILT | Low · LIVE | `warminsko-mazurskie/olsztyn/olsztyn.md` |
| Ostróda | powiat ostrodzki | G | 🔴 NO-BUILD | — · LIVE | `warminsko-mazurskie/powiat-ostrodzki/ostroda.md` |

### Wielkopolskie (9)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Gniezno | powiat gnieznienski | C | ✅ BUILT | Medium · LIVE | `wielkopolskie/powiat-gnieznienski/gniezno.md` |
| Kalisz | Kalisz— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE | `wielkopolskie/kalisz/kalisz.md` |
| Konin | Konin— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `wielkopolskie/konin/konin.md` |
| Krotoszyn | powiat krotoszynski | D | 🔴 NO-BUILD | — · LIVE | `wielkopolskie/powiat-krotoszynski/krotoszyn.md` |
| Leszno | Leszno— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `wielkopolskie/leszno/leszno.md` |
| Ostrów Wielkopolski | powiat ostrowski | B | 🔴 NO-BUILD | — · LIVE | `wielkopolskie/powiat-ostrowski/ostrow-wielkopolski.md` |
| Piła | powiat pilski | B | ✅ BUILT | Low–Medium · LIVE | `wielkopolskie/powiat-pilski/pila.md` |
| Poznań | Poznań— m.n.p.p. | A | 🟢 BUILD | Medium · LIVE/DESK | `wielkopolskie/poznan/poznan.md` |
| Września | powiat wrzesinski | G | 🟢 BUILD | Medium · LIVE | `wielkopolskie/powiat-wrzesinski/wrzesnia.md` |

### Zachodniopomorskie (5)

| City | District (powiat) | Tier | Status | Effort·conf | File |
|---|---|---|---|---|---|
| Kołobrzeg | powiat kolobrzeski | F | 🟢 BUILD | Medium · LIVE | `zachodniopomorskie/powiat-kolobrzeski/kolobrzeg.md` |
| Koszalin | Koszalin— m.n.p.p. | A | 🔴 NO-BUILD | — · LIVE | `zachodniopomorskie/koszalin/koszalin.md` |
| Stargard | powiat stargardzki | B | ✅ BUILT | Medium · LIVE | `zachodniopomorskie/powiat-stargardzki/stargard.md` |
| Szczecin | Szczecin— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `zachodniopomorskie/szczecin/szczecin.md` |
| Świnoujście | Świnoujście— m.n.p.p. | A | ✅ BUILT | Medium · LIVE | `zachodniopomorskie/swinoujscie/swinoujscie.md` |

---

*Doc/data only — no `extension/` change, so no version bump (per CLAUDE.md).*
