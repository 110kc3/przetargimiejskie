# SPIKE-PROGRESS — all-Poland city spike + build ledger

> Updated 2026-07-01. Queue: [backlog.json](./backlog.json) (132 pending / 248 done of 380 powiat seats). Per-city status: [master-cities.json](./master-cities.json). NO-BUILD detail: [NO-BUILD.md](./NO-BUILD.md). Build guide: [../pipeline/ADAPTER-GUIDE.md](../pipeline/ADAPTER-GUIDE.md).

## Roll-up (204 spiked)

| Status | Count |
|---|---|
| ✅ Built | 46 |
| 🟢 BUILD (ready) | 64 |
| 🟡 VERIFY | 12 |
| 🔴 NO-BUILD | 73 |
| ❌ Dropped | 6 |
| ⏸️ Deferred | 3 |

**Convention:** only BUILD/verify/built cities get a per-city `.md`; NO-BUILD verdicts live in [NO-BUILD.md](./NO-BUILD.md) + master.

## Built adapters (46)

Kłodzko, Legnica, Wałbrzych, Toruń, Łódź, Pabianice, Chełm, Nowa Sól, Chrzanów, Kraków, Olkusz, Oświęcim, Trzebinia, Warszawa, Brzeg, Kędzierzyn-Koźle, Nysa, Opole, Przemyśl, Augustów, Białystok, Gdańsk, Słupsk, Tczew, Wejherowo, Bielsko-Biała, Bytom, Cieszyn, Gliwice, Katowice, Mysłowice, Racibórz, Rybnik, Sosnowiec, Świętochłowice, Tarnowskie Góry, Zabrze, Kielce, Skarżysko-Kamienna, Giżycko, Olsztyn, Gniezno, Piła, Stargard, Szczecin, Świnoujście.

> Needs clean rebuild (mount corruption): Bydgoszcz, Gorzów Wielkopolski.

## BUILD-ready queue (64, by effort)

Kamienna Góra (Low), Chełmno (Low), Bełchatów (Low), Krosno Odrzańskie (Low), Bochnia (Low), Ostrołęka (Low), Głubczyce (Low), Kolbuszowa (Low), Kwidzyn (Low), Lębork (Low), Kłobuck (Low), Busko-Zdrój (Low), Braniewo (Low), Kętrzyn (Low), Gostyń (Low), Jarocin (Low), Drawsko Pomorskie (Low), Lwówek Śląski (Low), Lipsko (Low), Bolesławiec (Medium), Lubań (Medium), Dzierżoniów (Medium), Głogów (Medium), Góra (Medium), Jelenia Góra (Medium), Lubin (Medium), Świdnica (Medium), Wrocław (Medium), Bydgoszcz (Medium), Golub-Dobrzyń (Medium), Grudziądz (Medium), Włocławek (Medium), Tomaszów Mazowiecki (Medium), Zgierz (Medium), Biała Podlaska (Medium), Gorzów Wielkopolski (Medium), Brzesko (Medium), Zakopane (Medium), Grodzisk Mazowiecki (Medium), Płock (Medium), Siedlce (Medium), Żyrardów (Medium), Kolno (Medium), Chojnice (Medium), Człuchów (Medium), Kościerzyna (Medium), Malbork (Medium), Sopot (Medium), Starogard Gdański (Medium), Będzin (Medium), Jędrzejów (Medium), Starachowice (Medium), Bartoszyce (Medium), Elbląg (Medium), Ełk (Medium), Iława (Medium), Lidzbark Warmiński (Medium), Grodzisk Wielkopolski (Medium), Kalisz (Medium), Poznań (Medium), Września (Medium), Goleniów (Medium), Gryfino (Medium), Kołobrzeg (Medium).

## VERIFY (live re-check before building) (12)

Dąbrowa Tarnowska, Nowy Sącz, Gostynin, Kluczbork, Krapkowice, Jasło, Lesko, Rzeszów, Końskie, Chodzież, Choszczno, Gryfice.

## Ledger by voivodeship

### Dolnośląskie (16)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Bolesławiec | powiat boleslawiecki | 🟢 BUILD | Medium · LIVE |
| Dzierżoniów | powiat dzierżoniowski | 🟢 BUILD | Medium · LIVE |
| Głogów | powiat głogowski | 🟢 BUILD | Medium · LIVE |
| Góra | powiat górowski | 🟢 BUILD | Medium · LIVE |
| Jawor | powiat jaworski | 🔴 NO-BUILD | — · LIVE |
| Jelenia Góra | Jelenia Góram.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Kamienna Góra | powiat kamiennogórski | 🟢 BUILD | Low · DESK |
| Kłodzko | powiat klodzki | ✅ BUILT | Medium · LIVE |
| Legnica | Legnicam.n.p.p. | ✅ BUILT | Low · LIVE |
| Lubań | powiat lubański | 🟢 BUILD | Medium · DESK |
| Lubin | powiat lubinski | 🟢 BUILD | Medium · LIVE |
| Lwówek Śląski | powiat lwówecki | 🟢 BUILD | Low · DESK |
| Oleśnica | powiat olesnicki | 🔴 NO-BUILD | — · LIVE |
| Świdnica | powiat swidnicki | 🟢 BUILD | Medium · LIVE |
| Wałbrzych | Wałbrzychm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Wrocław | Wrocławm.n.p.p. | 🟢 BUILD | Medium · LIVE |

### Kujawsko-Pomorskie (10)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Aleksandrów Kujawski | powiat aleksandrowski | 🔴 NO-BUILD | — · LIVE |
| Brodnica | powiat brodnicki | 🔴 NO-BUILD | — · LIVE |
| Bydgoszcz | Bydgoszczm.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Chełmno | powiat chełmiński | 🟢 BUILD | Low · LIVE |
| Golub-Dobrzyń | powiat golubsko-dobrzyński | 🟢 BUILD | Medium · LIVE |
| Grudziądz | Grudziądzm.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Inowrocław | powiat inowroclawski | 🔴 NO-BUILD | — · LIVE |
| Świecie | powiat swiecki | 🔴 NO-BUILD | — · LIVE |
| Toruń | Toruńm.n.p.p. | ✅ BUILT | Low · LIVE |
| Włocławek | Włocławekm.n.p.p. | 🟢 BUILD | Medium · LIVE |

### Lubelskie (11)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Biała Podlaska | Biała Podlaskam.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Biłgoraj | powiat bilgorajski | 🔴 NO-BUILD | — · LIVE |
| Chełm | Chełmm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Hrubieszów | powiat hrubieszowski | 🔴 NO-BUILD | — · DESK |
| Janów Lubelski | powiat janowski | 🔴 NO-BUILD | — · DESK |
| Krasnystaw | powiat krasnostawski | 🔴 NO-BUILD | — · LIVE |
| Kraśnik | powiat krasnicki | 🔴 NO-BUILD | — · LIVE |
| Lublin | Lublinm.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Puławy | powiat pulawski | 🔴 NO-BUILD | — · LIVE |
| Świdnik | powiat swidnicki | 🔴 NO-BUILD | — · LIVE |
| Zamość | Zamośćm.n.p.p. | 🔴 NO-BUILD | — · LIVE |

### Lubuskie (4)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Gorzów Wielkopolski | Gorzów Wielkopolskim.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Krosno Odrzańskie | powiat krośnieński | 🟢 BUILD | Low · DESK |
| Nowa Sól | powiat nowosolski | ✅ BUILT | Low · LIVE |
| Zielona Góra | Zielona Góram.n.p.p. | 🔴 NO-BUILD | — · LIVE |

### Łódzkie (11)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Bełchatów | powiat belchatowski | 🟢 BUILD | Low · LIVE |
| Brzeziny | powiat brzezinski | 🔴 NO-BUILD | — · DESK |
| Kutno | powiat kutnowski | 🔴 NO-BUILD | — · LIVE |
| Łódź | Łódźm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Pabianice | powiat pabianicki | ✅ BUILT | Low–Medium · LIVE |
| Piotrków Trybunalski | Piotrków Trybunalskim.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Radomsko | powiat radomszczanski | 🔴 NO-BUILD | — · LIVE |
| Sieradz | powiat sieradzki | 🔴 NO-BUILD | — · DESK |
| Skierniewice | Skierniewicem.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Tomaszów Mazowiecki | powiat tomaszowski | 🟢 BUILD | Medium · LIVE |
| Zgierz | powiat zgierski | 🟢 BUILD | Medium · LIVE |

### Małopolskie (14)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Bochnia | powiat bochenski | 🟢 BUILD | Low · LIVE |
| Brzesko | powiat brzeski | 🟢 BUILD | Medium · LIVE |
| Chrzanów | powiat chrzanowski | ✅ BUILT |  |
| Dąbrowa Tarnowska | powiat dąbrowski | 🟡 VERIFY | Low · DESK |
| Gorlice | powiat gorlicki | 🔴 NO-BUILD | — · DESK |
| Kraków | Krakówm.n.p.p. | ✅ BUILT |  |
| Nowy Sącz | Nowy Sączm.n.p.p. | 🟡 VERIFY | — · DESK |
| Nowy Targ | powiat nowotarski | 🔴 NO-BUILD | — · LIVE |
| Olkusz | powiat olkuski | ✅ BUILT |  |
| Oświęcim | powiat oświęcimski | ✅ BUILT |  |
| Tarnów | Tarnówm.n.p.p. | 🔴 NO-BUILD | — · LIVE/DESK |
| Trzebinia | powiat chrzanowski | ✅ BUILT |  |
| Wadowice | powiat wadowicki | 🔴 NO-BUILD | — · LIVE |
| Zakopane | powiat tatrzanski | 🟢 BUILD | Medium · LIVE |

### Mazowieckie (19)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Białobrzegi | powiat bialobrzeski | 🔴 NO-BUILD | — · DESK |
| Ciechanów | powiat ciechanowski | 🔴 NO-BUILD | — · LIVE |
| Garwolin | powiat garwoliński | 🔴 NO-BUILD | — · LIVE |
| Gostynin | powiat gostyniński | 🟡 VERIFY | Low · DESK |
| Grodzisk Mazowiecki | powiat grodziski | 🟢 BUILD | Medium · DESK |
| Grójec | powiat grójecki | 🔴 NO-BUILD | — · LIVE |
| Kozienice | powiat kozienicki | 🔴 NO-BUILD | — · DESK |
| Legionowo | powiat legionowski | 🔴 NO-BUILD | — · LIVE |
| Lipsko | powiat lipski | 🟢 BUILD | Low · DESK |
| Mińsk Mazowiecki | powiat minski | 🔴 NO-BUILD | — · LIVE |
| Ostrołęka | Ostrołękam.n.p.p. | 🟢 BUILD | Low · LIVE |
| Piaseczno | powiat piaseczynski | 🔴 NO-BUILD | — · LIVE |
| Płock | Płockm.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Pruszków | powiat pruszkowski | 🔴 NO-BUILD | — · LIVE |
| Radom | Radomm.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Siedlce | Siedlcem.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Warszawa | Warszawam.n.p.p. | ✅ BUILT | High · LIVE |
| Wołomin | powiat wolominski | 🔴 NO-BUILD | — · LIVE |
| Żyrardów | powiat zyrardowski | 🟢 BUILD | Medium · LIVE |

### Opolskie (7)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Brzeg | powiat brzeski | ✅ BUILT | Medium · LIVE |
| Głubczyce | powiat głubczycki | 🟢 BUILD | Low · DESK |
| Kędzierzyn-Koźle | powiat kędzierzyńsko-kozielski | ✅ BUILT |  |
| Kluczbork | powiat kluczborski | 🟡 VERIFY | Medium · DESK |
| Krapkowice | powiat krapkowicki | 🟡 VERIFY | Medium · DESK |
| Nysa | powiat nyski | ✅ BUILT | Low · LIVE |
| Opole | Opolem.n.p.p. | ✅ BUILT |  |

### Podkarpackie (14)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Brzozów | powiat brzozowski | 🔴 NO-BUILD | — · DESK |
| Dębica | powiat debicki | 🔴 NO-BUILD | — · LIVE |
| Jarosław | powiat jaroslawski | 🔴 NO-BUILD | — · LIVE |
| Jasło | powiat jasielski | 🟡 VERIFY | Medium · DESK |
| Kolbuszowa | powiat kolbuszowski | 🟢 BUILD | Low · DESK |
| Krosno | Krosnom.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Lesko | powiat leski | 🟡 VERIFY | Low · DESK |
| Leżajsk | powiat leżajski | 🔴 NO-BUILD | — · LIVE |
| Mielec | powiat mielecki | 🔴 NO-BUILD | — · LIVE |
| Przemyśl | Przemyślm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Rzeszów | Rzeszówm.n.p.p. | 🟡 VERIFY | — · LIVE/DESK |
| Sanok | powiat sanocki | 🔴 NO-BUILD | — · LIVE |
| Stalowa Wola | powiat stalowowolski | 🔴 NO-BUILD | — · DESK |
| Tarnobrzeg | Tarnobrzegm.n.p.p. | 🔴 NO-BUILD | — · LIVE |

### Podlaskie (8)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Augustów | powiat augustowski | ✅ BUILT | Medium · LIVE |
| Białystok | Białystokm.n.p.p. | ✅ BUILT | Low–Medium · LIVE |
| Bielsk Podlaski | powiat bielski | 🔴 NO-BUILD | — · LIVE |
| Grajewo | powiat grajewski | 🔴 NO-BUILD | — · DESK |
| Hajnówka | powiat hajnowski | 🔴 NO-BUILD | — · LIVE |
| Kolno | powiat kolneński | 🟢 BUILD | Medium · DESK |
| Łomża | Łomżam.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Suwałki | Suwałkim.n.p.p. | 🔴 NO-BUILD | — · LIVE |

### Pomorskie (15)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Bytów | powiat bytowski | 🔴 NO-BUILD | — · LIVE |
| Chojnice | powiat chojnicki | 🟢 BUILD | Medium · LIVE |
| Człuchów | powiat człuchowski | 🟢 BUILD | Medium · LIVE |
| Gdańsk | Gdańskm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Gdynia | Gdyniam.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Kartuzy | powiat kartuski | 🔴 NO-BUILD | — · DESK |
| Kościerzyna | powiat kościerski | 🟢 BUILD | Medium · LIVE |
| Kwidzyn | powiat kwidzyński | 🟢 BUILD | Low · DESK |
| Lębork | powiat lęborski | 🟢 BUILD | Low · DESK |
| Malbork | powiat malborski | 🟢 BUILD | Medium · LIVE |
| Słupsk | Słupskm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Sopot | Sopotm.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Starogard Gdański | powiat starogardzki | 🟢 BUILD | Medium · LIVE |
| Tczew | powiat tczewski | ✅ BUILT | Medium · LIVE |
| Wejherowo | powiat wejherowski | ✅ BUILT | Medium · LIVE |

### Śląskie (26)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Będzin | powiat bedzinski | 🟢 BUILD | Medium · LIVE |
| Bielsko-Biała | Bielsko-Białam.n.p.p. | ✅ BUILT |  |
| Bieruń | powiat bierunsko-ledzinski | 🔴 NO-BUILD | — · LIVE |
| Bytom | Bytomm.n.p.p. | ✅ BUILT |  |
| Chorzów | Chorzówm.n.p.p. | ❌ DROPPED |  |
| Cieszyn | powiat cieszynski | ✅ BUILT | Medium · LIVE |
| Częstochowa | Częstochowam.n.p.p. | ❌ DROPPED |  |
| Dąbrowa Górnicza | Dąbrowa Górniczam.n.p.p. | ❌ DROPPED |  |
| Gliwice | Gliwicem.n.p.p. | ✅ BUILT |  |
| Jastrzębie-Zdrój | Jastrzębie-Zdrójm.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Jaworzno | Jaworznom.n.p.p. | ⏸️ DEFERRED |  |
| Katowice | Katowicem.n.p.p. | ✅ BUILT |  |
| Kłobuck | powiat kłobucki | 🟢 BUILD | Low · DESK |
| Mysłowice | Mysłowicem.n.p.p. | ✅ BUILT |  |
| Piekary Śląskie | Piekary Śląskiem.n.p.p. | ❌ DROPPED |  |
| Racibórz | powiat raciborski | ✅ BUILT | Low · LIVE |
| Ruda Śląska | Ruda Śląskam.n.p.p. | ⏸️ DEFERRED |  |
| Rybnik | Rybnikm.n.p.p. | ✅ BUILT |  |
| Siemianowice Śląskie | Siemianowice Śląskiem.n.p.p. | ❌ DROPPED |  |
| Sosnowiec | Sosnowiecm.n.p.p. | ✅ BUILT |  |
| Świętochłowice | Świętochłowicem.n.p.p. | ✅ BUILT |  |
| Tarnowskie Góry | powiat tarnogórski | ✅ BUILT |  |
| Tychy | Tychym.n.p.p. | ❌ DROPPED |  |
| Zabrze | Zabrzem.n.p.p. | ✅ BUILT |  |
| Zawiercie | powiat zawiercianski | 🔴 NO-BUILD | — · LIVE |
| Żory | Żorym.n.p.p. | ⏸️ DEFERRED |  |

### Świętokrzyskie (8)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Busko-Zdrój | powiat buski | 🟢 BUILD | Low · LIVE |
| Jędrzejów | powiat jędrzejowski | 🟢 BUILD | Medium · DESK |
| Kazimierza Wielka | powiat kazimierski | 🔴 NO-BUILD | — · DESK |
| Kielce | Kielcem.n.p.p. | ✅ BUILT | Medium · LIVE |
| Końskie | powiat konecki | 🟡 VERIFY | Medium · DESK |
| Ostrowiec Świętokrzyski | powiat ostrowiecki | 🔴 NO-BUILD | — · LIVE |
| Skarżysko-Kamienna | powiat skarzyski | ✅ BUILT | Low–Medium · LIVE |
| Starachowice | powiat starachowicki | 🟢 BUILD | Medium · LIVE |

### Warmińsko-Mazurskie (12)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Bartoszyce | powiat bartoszycki | 🟢 BUILD | Medium · LIVE |
| Braniewo | powiat braniewski | 🟢 BUILD | Low · LIVE |
| Działdowo | powiat działdowski | 🔴 NO-BUILD | — · LIVE |
| Elbląg | Elblągm.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Ełk | powiat elcki | 🟢 BUILD | Medium · LIVE |
| Giżycko | powiat gizycki | ✅ BUILT | Low–Medium · LIVE |
| Gołdap | powiat gołdapski | 🔴 NO-BUILD | — · LIVE |
| Iława | powiat iławski | 🟢 BUILD | Medium · LIVE |
| Kętrzyn | powiat kętrzyński | 🟢 BUILD | Low · DESK |
| Lidzbark Warmiński | powiat lidzbarski | 🟢 BUILD | Medium · DESK |
| Olsztyn | Olsztynm.n.p.p. | ✅ BUILT | Low · LIVE |
| Ostróda | powiat ostrodzki | 🔴 NO-BUILD | — · LIVE |

### Wielkopolskie (17)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Chodzież | powiat chodzieski | 🟡 VERIFY | Medium · DESK |
| Czarnków | powiat czarnkowsko-trzcianecki | 🔴 NO-BUILD | — · DESK |
| Gniezno | powiat gnieznienski | ✅ BUILT | Medium · LIVE |
| Gostyń | powiat gostyński | 🟢 BUILD | Low · DESK |
| Grodzisk Wielkopolski | powiat grodziski | 🟢 BUILD | Medium · LIVE |
| Jarocin | powiat jarociński | 🟢 BUILD | Low · DESK |
| Kalisz | Kaliszm.n.p.p. | 🟢 BUILD | Medium · LIVE |
| Kępno | powiat kępiński | 🔴 NO-BUILD | — · DESK |
| Koło | powiat kolski | 🔴 NO-BUILD | — · LIVE |
| Konin | Koninm.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Kościan | powiat kościański | 🔴 NO-BUILD | — · DESK |
| Krotoszyn | powiat krotoszynski | 🔴 NO-BUILD | — · LIVE |
| Leszno | Lesznom.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Ostrów Wielkopolski | powiat ostrowski | 🔴 NO-BUILD | — · LIVE |
| Piła | powiat pilski | ✅ BUILT | Low–Medium · LIVE |
| Poznań | Poznańm.n.p.p. | 🟢 BUILD | Medium · LIVE/DESK |
| Września | powiat wrzesinski | 🟢 BUILD | Medium · LIVE |

### Zachodniopomorskie (12)

| City | District | Status | Effort·conf |
|---|---|---|---|
| Białogard | powiat bialogardzki | 🔴 NO-BUILD | — · DESK |
| Choszczno | powiat choszczeński | 🟡 VERIFY | Medium · DESK |
| Drawsko Pomorskie | powiat drawski | 🟢 BUILD | Low · LIVE |
| Goleniów | powiat goleniowski | 🟢 BUILD | Medium · DESK |
| Gryfice | powiat gryficki | 🟡 VERIFY | Medium · DESK |
| Gryfino | powiat gryfiński | 🟢 BUILD | Medium · LIVE |
| Kamień Pomorski | powiat kamieński | 🔴 NO-BUILD | — · DESK |
| Kołobrzeg | powiat kolobrzeski | 🟢 BUILD | Medium · LIVE |
| Koszalin | Koszalinm.n.p.p. | 🔴 NO-BUILD | — · LIVE |
| Stargard | powiat stargardzki | ✅ BUILT | Medium · LIVE |
| Szczecin | Szczecinm.n.p.p. | ✅ BUILT | Medium · LIVE |
| Świnoujście | Świnoujściem.n.p.p. | ✅ BUILT | Medium · LIVE |

---

*Doc/data only — no version bump.*
