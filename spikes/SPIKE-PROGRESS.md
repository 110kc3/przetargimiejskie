# SPIKE-PROGRESS — all-Poland city spike + build ledger

> **GENERATED FILE — do not hand-edit.** Regenerate with `node spikes/build-progress.mjs` after updating [master-cities.json](./master-cities.json) (the source of truth).
>
> Updated 2026-09-06 from the official GUS TERYT snapshot effective 2026-01-01. Queue: [backlog.json](./backlog.json) (0 pending / 380 done of 380 powiat rows; 335 distinct seat cities). Inventory differences: [inventory/DISCREPANCIES.md](./inventory/DISCREPANCIES.md). Build guide: [../pipeline/ADAPTER-GUIDE.md](../pipeline/ADAPTER-GUIDE.md).

## Official inventory roll-up (1026 cities)

| Status | Count |
|---|---|
| ✅ BUILT | 121 |
| 🟢 BUILD | 50 |
| 🟡 VERIFY | 0 |
| 🔴 NO-BUILD | 156 |
| ❌ Dropped | 6 |
| ⏸️ Deferred | 3 |
| ⚪ UNRESEARCHED | 690 |

**Convention:** official identity is `official.simc`; product/pipeline aliases never replace it. A surveyed city has a per-city evidence path. New official cities remain `unresearched` until direct source evidence exists.

## Lifecycle coverage

| Dimension | State | Count |
|---|---|---:|
| research | surveyed | 336 |
| research | unresearched | 690 |
| implementation | deferred | 9 |
| implementation | enabled | 121 |
| implementation | no-source-found | 156 |
| implementation | ready | 50 |
| implementation | unresearched | 690 |
| runtime | monitored | 121 |
| runtime | not-enabled | 905 |

## Built adapters (121)

Augustów, Bełchatów, Biała Podlaska, Białystok, Bielsko-Biała, Bochnia, Bolesławiec, Braniewo, Brzeg, Busko-Zdrój, Bydgoszcz, Bytom, Chełm, Chełmno, Chodzież, Choszczno, Chrzanów, Cieszyn, Drawsko Pomorskie, Elbląg, Gdańsk, Giżycko, Gliwice, Głogów, Głubczyce, Gniezno, Golub-Dobrzyń, Gorzów Wielkopolski, Gostyń, Grudziądz, Jarocin, Jelenia Góra, Kalisz, Kamienna Góra, Katowice, Kędzierzyn-Koźle, Kętrzyn, Kielce, Kłobuck, Kłodzko, Kolbuszowa, Końskie, Kraków, Krosno Odrzańskie, Kwidzyn, Legnica, Lębork, Lipsko, Lubin, Lubliniec, Lwówek Śląski, Łódź, Międzyrzecz, Mrągowo, Mysłowice, Nakło nad Notecią, Namysłów, Nowa Sól, Nysa, Olesno, Olkusz, Olsztyn, Opole, Ostrołęka, Oświęcim, Pabianice, Pajęczno, Piła, Pisz, Pleszew, Płock, Poddębice, Poznań, Proszowice, Przemyśl, Pszczyna, Pułtusk, Racibórz, Rawa Mazowiecka, Rybnik, Sandomierz, Sępólno Krajeńskie, Siedlce, Skarżysko-Kamienna, Słupsk, Sopot, Sosnowiec, Stargard, Strzelce Krajeńskie, Strzelce Opolskie, Sucha Beskidzka, Sulęcin, Szczecin, Szczecinek, Środa Wielkopolska, Świdnica, Świętochłowice, Świnoujście, Tarnowskie Góry, Tczew, Tomaszów Mazowiecki, Toruń, Trzebinia, Trzebnica, Wałbrzych, Warszawa, Wąbrzeźno, Wejherowo, Węgorzewo, Węgrów, Włocławek, Wołów, Wrocław, Wschowa, Zabrze, Ząbkowice Śląskie, Zduńska Wola, Zgorzelec, Złotoryja, Żagań, Żnin.

## BUILD-ready queue (50, by effort)

Bartoszyce (Medium), Będzin (Medium), Brzesko (Medium), Chojnice (Medium), Człuchów (Medium), Dzierżoniów (Medium), Ełk (Medium), Goleniów (Medium), Góra (Medium), Grodzisk Mazowiecki (Medium), Grodzisk Wielkopolski (Medium), Gryfino (Medium), Iława (Medium), Jędrzejów (Medium), Kluczbork (Medium), Kolno (Medium), Kołobrzeg (Medium), Kościerzyna (Medium), Lidzbark Warmiński (Medium), Lubań (Medium), Łęczyca (Medium), Łobez (Medium), Malbork (Medium), Mogilno (Medium), Nidzica (Medium), Oława (Medium), Ostrzeszów (Medium), Otwock (Medium), Ożarów Mazowiecki (Medium), Płońsk (Medium), Prudnik (Medium), Słubice (Medium), Sochaczew (Medium), Starachowice (Medium), Starogard Gdański (Medium), Staszów (Medium), Szamotuły (Medium), Szczytno (Medium), Sztum (Medium), Szydłowiec (Medium), Śrem (Medium), Środa Śląska (Medium), Wałcz (Medium), Wodzisław Śląski (Medium), Września (Medium), Zakopane (Medium), Zgierz (Medium), Złotów (Medium), Żary (Medium), Żyrardów (Medium).

## Unresearched official cities (690)

These are inventory entries, not claims of monitoring or source absence. Research is queued only through an accepted batch.

## Ledger by voivodeship

### Dolnośląskie (93)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Bardo | 0983801 | powiat ząbkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bielawa | 0983818 | powiat dzierżoniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bierutów | 0987035 | powiat oleśnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bogatynia | 0935908 | powiat zgorzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Boguszów-Gorce | 0983824 | powiat wałbrzyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bolesławiec | 0935989 | powiat boleslawiecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bolków | 0935995 | powiat jaworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brzeg Dolny | 0987064 | powiat wołowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bystrzyca Kłodzka | 0983899 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chocianów | 0954060 | powiat polkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chojnów | 0954076 | powiat legnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Duszniki-Zdrój | 0983913 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dzierżoniów | 0983988 | powiat dzierżoniowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Głogów | 0954082 | powiat głogowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Głuszyca | 0984002 | powiat wałbrzyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Góra | 0954449 | powiat górowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Gryfów Śląski | 0936003 | powiat lwówecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jawor | 0954120 | powiat jaworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jaworzyna Śląska | 0984019 | powiat świdnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jedlina-Zdrój | 0984025 | powiat wałbrzyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jelcz-Laskowice | 0987118 | powiat oławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jelenia Góra | 0935802 | Jelenia Góra (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kamieniec Ząbkowicki | 0852631 | powiat ząbkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kamienna Góra | 0936026 | powiat kamiennogórski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Karpacz | 0936032 | powiat karkonoski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kąty Wrocławskie | 0987124 | powiat wrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kłodzko | 0984077 | powiat klodzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kowary | 0936078 | powiat karkonoski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kudowa-Zdrój | 0984120 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lądek-Zdrój | 0984203 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Legnica | 0954047 | Legnica (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Leśna | 0936121 | powiat lubański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lubań | 0936150 | powiat lubański | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Lubawka | 0936180 | powiat kamiennogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lubin | 0954142 | powiat lubinski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubomierz | 0936210 | powiat lwówecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lwówek Śląski | 0936227 | powiat lwówecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Mieroszów | 0984210 | powiat wałbrzyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Międzybórz | 0937037 | powiat oleśnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Międzylesie | 0984226 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miękinia | 0877424 | powiat średzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Milicz | 0987130 | powiat milicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mirsk | 0936233 | powiat lwówecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Niemcza | 0984232 | powiat dzierżoniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowa Ruda | 0984278 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowogrodziec | 0936262 | powiat bolesławiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Oborniki Śląskie | 0987182 | powiat trzebnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Oleśnica | 0987213 | powiat olesnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Olszyna | 0191684 | powiat lubański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Oława | 0987259 | powiat oławski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Piechowice | 0936285 | powiat karkonoski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pieńsk | 0936351 | powiat zgorzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pieszyce | 0984396 | powiat dzierżoniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piława Górna | 0984491 | powiat dzierżoniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Polanica-Zdrój | 0984522 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Polkowice | 0954165 | powiat polkowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Prochowice | 0954171 | powiat legnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Prusice | 0879914 | powiat trzebnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Przemków | 0954194 | powiat polkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radków | 0984539 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Siechnice | 0881160 | powiat wrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sobótka | 0987294 | powiat wrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stronie Śląskie | 0984545 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Strzegom | 0984551 | powiat świdnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Strzelin | 0987331 | powiat strzeliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Syców | 0937379 | powiat oleśnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczawno-Zdrój | 0984574 | powiat wałbrzyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczytna | 0984597 | powiat kłodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szklarska Poręba | 0936368 | powiat karkonoski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ścinawa | 0954202 | powiat lubiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Środa Śląska | 0987348 | powiat średzki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Świdnica | 0984657 | powiat swidnicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Świebodzice | 0984663 | powiat świdnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świeradów-Zdrój | 0936457 | powiat lubański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świerzawa | 0936486 | powiat złotoryjski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Trzebnica | 0987383 | powiat trzebnicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Twardogóra | 0987390 | powiat oleśnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wałbrzych | 0983681 | Wałbrzych (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wąsosz | 0954662 | powiat górowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Węgliniec | 0936492 | powiat zgorzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wiązów | 0987437 | powiat strzeliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wleń | 0936500 | powiat lwówecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wojcieszów | 0936517 | powiat złotoryjski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wołów | 0987466 | powiat wołowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wrocław | 0986283 | Wrocław (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zawidów | 0936523 | powiat zgorzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ząbkowice Śląskie | 0984692 | powiat ząbkowicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zgorzelec | 0936546 | powiat zgorzelecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ziębice | 0984700 | powiat ząbkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Złotoryja | 0954219 | powiat złotoryjski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Złoty Stok | 0984723 | powiat ząbkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żarów | 0984746 | powiat świdnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żmigród | 0987503 | powiat trzebnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Kujawsko-Pomorskie (56)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Aleksandrów Kujawski | 0985384 | powiat aleksandrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Barcin | 0928825 | powiat żniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bobrowniki | 0858480 | powiat lipnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brodnica | 0982954 | powiat brodnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Brześć Kujawski | 0985444 | powiat włocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bydgoszcz | 0928363 | Bydgoszcz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chełmno | 0983066 | powiat chełmiński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chełmża | 0983126 | powiat toruński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chodecz | 0985562 | powiat włocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ciechocinek | 0985616 | powiat aleksandrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobrzyń nad Wisłą | 0985651 | powiat lipnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gąsawa | 0085189 | powiat żniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gniewkowo | 0928937 | powiat inowrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Golub-Dobrzyń | 0983155 | powiat golubsko-dobrzyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Górzno | 0983244 | powiat brodnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Grudziądz | 0983333 | Grudziądz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Inowrocław | 0928989 | powiat inowroclawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Izbica Kujawska | 0985734 | powiat włocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jabłonowo Pomorskie | 0983474 | powiat brodnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Janikowo | 0929109 | powiat inowrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Janowiec Wielkopolski | 0929167 | powiat żniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kamień Krajeński | 0929210 | powiat sępoleński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kcynia | 0929233 | powiat nakielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kikół | 0863480 | powiat lipnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koronowo | 0929285 | powiat bydgoski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kowal | 0985786 | powiat włocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kowalewo Pomorskie | 0983540 | powiat golubsko-dobrzyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kruszwica | 0929380 | powiat inowrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lipno | 0985830 | powiat lipnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lubień Kujawski | 0985898 | powiat włocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lubraniec | 0985929 | powiat włocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łabiszyn | 0929405 | powiat żniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łasin | 0983557 | powiat grudziądzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mogilno | 0929428 | powiat mogileński | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Mrocza | 0929440 | powiat nakielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nakło nad Notecią | 0929463 | powiat nakielski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nieszawa | 0985987 | powiat aleksandrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowe | 0929492 | powiat świecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pakość | 0929517 | powiat inowrocławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piotrków Kujawski | 0867510 | powiat radziejowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pruszcz | 0094024 | powiat świecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radziejów | 0986060 | powiat radziejowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radzyń Chełmiński | 0983630 | powiat grudziądzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rypin | 0986136 | powiat rypiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Sępólno Krajeńskie | 0929546 | powiat sępoleński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Skępe | 0869583 | powiat lipnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Solec Kujawski | 0929552 | powiat bydgoski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Strzelno | 0929598 | powiat mogileński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szubin | 0929612 | powiat nakielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świecie | 0929664 | powiat swiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Toruń | 0982724 | Toruń (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tuchola | 0929724 | powiat tucholski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wąbrzeźno | 0983652 | powiat wąbrzeski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Więcbork | 0929820 | powiat sępoleński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Włocławek | 0984752 | Włocławek (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Żnin | 0929865 | powiat żniński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |

### Lubelskie (58)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Annopol | 0786213 | powiat kraśnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bełżyce | 0955555 | powiat lubelski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Biała Podlaska | 0922018 | Biała Podlaska (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Biłgoraj | 0987673 | powiat bilgorajski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Bychawa | 0955621 | powiat lubelski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chełm | 0929902 | Chełm (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czemierniki | 0011179 | powiat radzyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dęblin | 0955740 | powiat rycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Frampol | 0887196 | powiat biłgorajski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Goraj | 0887693 | powiat biłgorajski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Hrubieszów | 0987800 | powiat hrubieszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Izbica | 0889700 | powiat krasnostawski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Janów Lubelski | 0980493 | powiat janowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Janów Podlaski | 0012960 | powiat bialski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Józefów | 0987897 | powiat biłgorajski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Józefów nad Wisłą | 0382036 | powiat opolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kamionka | 0382480 | powiat lubartowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kazimierz Dolny | 0955905 | powiat puławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kock | 0956069 | powiat lubartowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Końskowola | 0383656 | powiat puławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krasnobród | 0891281 | powiat zamojski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krasnystaw | 0930070 | powiat krasnostawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kraśnik | 0956112 | powiat krasnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kurów | 0384443 | powiat puławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lubartów | 0956313 | powiat lubartowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lublin | 0954700 | Lublin (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lubycza Królewska | 0892889 | powiat tomaszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łaszczów | 0893742 | powiat tomaszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łęczna | 0956388 | powiat łęczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Łuków | 0975530 | powiat łukowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Międzyrzec Podlaski | 0922159 | powiat bialski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Modliborzyce | 0799760 | powiat janowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nałęczów | 0956454 | powiat puławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Opole Lubelskie | 0956550 | powiat opolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ostrów Lubelski | 0956690 | powiat lubartowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Parczew | 0922254 | powiat parczewski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Piaski | 0389386 | powiat świdnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piszczac | 0017124 | powiat bialski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Poniatowa | 0956744 | powiat opolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Puławy | 0956810 | powiat pulawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radzyń Podlaski | 0922277 | powiat radzyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Rejowiec | 0105667 | powiat chełmski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rejowiec Fabryczny | 0930176 | powiat chełmski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ryki | 0956980 | powiat rycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Siedliszcze | 0107821 | powiat chełmski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stoczek Łukowski | 0975813 | powiat łukowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczebrzeszyn | 0987934 | powiat zamojski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świdnik | 0957146 | powiat swidnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Tarnogród | 0988069 | powiat biłgorajski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Terespol | 0922343 | powiat bialski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tomaszów Lubelski | 0988075 | powiat tomaszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Turobin | 0903200 | powiat biłgorajski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tyszowce | 0903676 | powiat tomaszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Urzędów | 0392684 | powiat kraśnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wąwolnica | 0393117 | powiat puławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Włodawa | 0930294 | powiat włodawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Zamość | 0987510 | Zamość (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Zwierzyniec | 0988253 | powiat zamojski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Lubuskie (44)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Babimost | 0988342 | powiat zielonogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brody | 0908030 | powiat żarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bytom Odrzański | 0988359 | powiat nowosolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Cybinka | 0988365 | powiat słubicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czerwieńsk | 0988371 | powiat zielonogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobiegniew | 0935334 | powiat strzelecko-drezdenecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Drezdenko | 0935400 | powiat strzelecko-drezdenecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gorzów Wielkopolski | 0935140 | Gorzów Wielkopolski (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gozdnica | 0988388 | powiat żagański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gubin | 0988394 | powiat krośnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Iłowa | 0988402 | powiat żagański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jasień | 0988431 | powiat żarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kargowa | 0988448 | powiat zielonogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kostrzyn nad Odrą | 0935452 | powiat gorzowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kożuchów | 0988454 | powiat nowosolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krosno Odrzańskie | 0988460 | powiat krośnieński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubniewice | 0182969 | powiat sulęciński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lubsko | 0988490 | powiat żarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łęknica | 0988508 | powiat żarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Małomice | 0988514 | powiat żagański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Międzyrzecz | 0935529 | powiat międzyrzecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nowa Sól | 0988520 | powiat nowosolski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nowe Miasteczko | 0988566 | powiat nowosolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowogród Bobrzański | 0988572 | powiat zielonogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ośno Lubuskie | 0935587 | powiat słubicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Otyń | 0912824 | powiat nowosolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rzepin | 0935682 | powiat słubicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skwierzyna | 0935699 | powiat międzyrzecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sława | 0988589 | powiat wschowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Słubice | 0935736 | powiat słubicki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Strzelce Krajeńskie | 0935742 | powiat strzelecko-drezdenecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sulechów | 0988595 | powiat zielonogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sulęcin | 0935759 | powiat sulęciński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Szlichtyngowa | 0954640 | powiat wschowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szprotawa | 0988603 | powiat żagański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świebodzin | 0988626 | powiat świebodziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Torzym | 0915484 | powiat sulęciński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Trzciel | 0935771 | powiat międzyrzecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Witnica | 0935794 | powiat gorzowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wschowa | 0954685 | powiat wschowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zbąszynek | 0988649 | powiat świebodziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zielona Góra | 0988313 | Zielona Góra (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żagań | 0988661 | powiat żagański | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Żary | 0988684 | powiat żarski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |

### Łódzkie (60)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Aleksandrów Łódzki | 0958654 | powiat zgierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bełchatów | 0967647 | powiat belchatowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Biała Rawska | 0977019 | powiat rawski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Białaczów | 0536350 | powiat opoczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Błaszki | 0976267 | powiat sieradzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bolesławiec | 0194330 | powiat wieruszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bolimów | 0725068 | powiat skierniewicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brzeziny | 0977025 | powiat brzezinski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Dąbrowice | 0562880 | powiat kutnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Drzewica | 0973346 | powiat opoczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Działoszyn | 0703026 | powiat pajęczański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Głowno | 0958714 | powiat zgierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Grabów | 0284003 | powiat łęczycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Inowłódz | 0540989 | powiat tomaszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jeżów | 0728658 | powiat brzeziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kamieńsk | 0541180 | powiat radomszczański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kiernozia | 0566894 | powiat łowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koluszki | 0967831 | powiat łódzki wschodni | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Konstantynów Łódzki | 0958826 | powiat pabianicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krośniewice | 0969095 | powiat kutnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kutno | 0969103 | powiat kutnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lutomiersk | 0705893 | powiat pabianicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lututów | 0706651 | powiat wieruszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łask | 0976296 | powiat łaski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Łęczyca | 0969250 | powiat łęczycki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Łowicz | 0977031 | powiat łowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Łódź | 0957650 | Łódź (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Opoczno | 0967943 | powiat opoczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Osjaków | 0708420 | powiat wieluński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ozorków | 0958967 | powiat zgierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pabianice | 0959079 | powiat pabianicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pajęczno | 0932330 | powiat pajęczański | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Parzęczew | 0415340 | powiat zgierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piątek | 0573256 | powiat łęczycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piotrków Trybunalski | 0967430 | Piotrków Trybunalski (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Poddębice | 0976400 | powiat poddębicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Przedbórz | 0968026 | powiat radomszczański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radomsko | 0968078 | powiat radomszczanski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Rawa Mazowiecka | 0977077 | powiat rawski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Rozprza | 0550717 | powiat piotrkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rzgów | 0415787 | powiat łódzki wschodni | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sieradz | 0976050 | powiat sieradzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Skierniewice | 0976942 | Skierniewice (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Stryków | 0959240 | powiat zgierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sulejów | 0968233 | powiat piotrkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szadek | 0976451 | powiat zduńskowolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tomaszów Mazowiecki | 0968300 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tuszyn | 0968569 | powiat łódzki wschodni | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ujazd | 0554721 | powiat tomaszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Uniejów | 0949359 | powiat poddębicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Warta | 0976557 | powiat sieradzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wieluń | 0976586 | powiat wieluński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wieruszów | 0937400 | powiat wieruszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wolbórz | 0556648 | powiat piotrkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zduńska Wola | 0976675 | powiat zduńskowolski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zelów | 0968664 | powiat bełchatowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zgierz | 0959263 | powiat zgierski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Złoczew | 0976830 | powiat sieradzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żarnów | 0558274 | powiat opoczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żychlin | 0969391 | powiat kutnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Małopolskie (64)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Alwernia | 0314454 | powiat chrzanowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Andrychów | 0924023 | powiat wadowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Biecz | 0952752 | powiat gorlicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bobowa | 0417728 | powiat gorlicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bochnia | 0981682 | powiat bochenski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Brzesko | 0981966 | powiat brzeski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Brzeszcze | 0938120 | powiat oświęcimski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bukowno | 0938404 | powiat olkuski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chełmek | 0924098 | powiat oświęcimski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chrzanów | 0938982 | powiat chrzanowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ciężkowice | 0815239 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czarny Dunajec | 0421629 | powiat nowotarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czchów | 0816871 | powiat brzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dąbrowa Tarnowska | 0982167 | powiat dąbrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Dobczyce | 0951505 | powiat myślenicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gorlice | 0959903 | powiat gorlicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Grybów | 0960042 | powiat nowosądecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jordanów | 0960154 | powiat suski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kalwaria Zebrzydowska | 0924253 | powiat wadowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kęty | 0924365 | powiat oświęcimski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koszyce | 0244630 | powiat proszowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kraków | 0950463 | Kraków (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Krynica-Zdrój | 0960390 | powiat nowosądecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krzeszowice | 0951570 | powiat krakowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Książ Wielki | 0246617 | powiat miechowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Libiąż | 0940938 | powiat chrzanowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Limanowa | 0960510 | powiat limanowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Maków Podhalański | 0924537 | powiat suski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miechów | 0947225 | powiat miechowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mszana Dolna | 0960697 | powiat limanowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Muszyna | 0961283 | powiat nowosądecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Myślenice | 0951617 | powiat myślenicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Niepołomice | 0951675 | powiat wielicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowe Brzesko | 0329705 | powiat proszowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowy Sącz | 0959435 | Nowy Sącz (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowy Targ | 0961538 | powiat nowotarski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowy Wiśnicz | 0824936 | powiat bocheński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Olkusz | 0941777 | powiat olkuski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Oświęcim | 0924997 | powiat oświęcimski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Piwniczna-Zdrój | 0961768 | powiat nowosądecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Proszowice | 0951818 | powiat proszowicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Rabka-Zdrój | 0962503 | powiat nowotarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radłów | 0827923 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ryglice | 0829098 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skała | 0951860 | powiat krakowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skawina | 0951876 | powiat krakowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Słomniki | 0952077 | powiat krakowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stary Sącz | 0963359 | powiat nowosądecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sucha Beskidzka | 0925287 | powiat suski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sułkowice | 0952137 | powiat myślenicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczawnica | 0963454 | powiat nowotarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczucin | 0831149 | powiat dąbrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świątniki Górne | 0337774 | powiat krakowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tarnów | 0981570 | Tarnów (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Trzebinia | 0944149 | powiat chrzanowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tuchów | 0982457 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wadowice | 0926921 | powiat wadowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wieliczka | 0952232 | powiat wielicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wojnicz | 0836276 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wolbrom | 0945315 | powiat olkuski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zakliczyn | 0837436 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zakopane | 0963773 | powiat tatrzanski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Zator | 0927576 | powiat oświęcimski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żabno | 0982641 | powiat tarnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Mazowieckie (114)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Białobrzegi | 0973286 | powiat bialobrzeski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Bieżuń | 0111981 | powiat żuromiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Błonie | 0920249 | powiat warszawski zachodni | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bodzanów | 0560213 | powiat płocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brok | 0966151 | powiat ostrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brwinów | 0920284 | powiat pruszkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Cegłów | 0668956 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chorzele | 0966270 | powiat przasnyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ciechanów | 0930414 | powiat ciechanowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ciepielów | 0617203 | powiat lipski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czerwińsk nad Wisłą | 0561885 | powiat płoński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobre | 0670278 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Drobin | 0563223 | powiat płocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Garwolin | 0975285 | powiat garwoliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Gąbin | 0968871 | powiat płocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gielniów | 0618817 | powiat przysuski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Glinojeck | 0114620 | powiat ciechanowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Głowaczów | 0619366 | powiat kozienicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gostynin | 0968977 | powiat gostyniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Góra Kalwaria | 0920321 | powiat piaseczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Grodzisk Mazowiecki | 0920380 | powiat grodziski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Grójec | 0973352 | powiat grójecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Halinów | 0002766 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Iłża | 0973375 | powiat radomski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jadów | 0673220 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jastrząb | 0623988 | powiat szydłowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jedlnia-Letnisko | 0625444 | powiat radomski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Józefów | 0920404 | powiat otwocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kałuszyn | 0975380 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Karczew | 0920500 | powiat otwocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kazanów | 0625728 | powiat zwoleński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kobyłka | 0920539 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Konstancin-Jeziorna | 0920634 | powiat piaseczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kosów Lacki | 0676128 | powiat sokołowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kozienice | 0973524 | powiat kozienicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Latowicz | 0677636 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Legionowo | 0920806 | powiat legionowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lipsko | 0973613 | powiat lipski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubowidz | 0118606 | powiat żuromiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łaskarzew | 0975434 | powiat garwoliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łochów | 0975492 | powiat węgrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łomianki | 0920864 | powiat warszawski zachodni | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łosice | 0922120 | powiat łosicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Maciejowice | 0680503 | powiat garwoliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Magnuszew | 0628833 | powiat kozienicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Maków Mazowiecki | 0966300 | powiat makowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Małkinia Górna | 0514408 | powiat ostrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Marki | 0920901 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Milanówek | 0921020 | powiat grodziski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mińsk Mazowiecki | 0975687 | powiat minski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mława | 0930696 | powiat mławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mogielnica | 0973665 | powiat grójecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mordy | 0975747 | powiat siedlecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mrozy | 0682940 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mszczonów | 0977054 | powiat żyrardowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Myszyniec | 0514928 | powiat ostrołęcki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nasielsk | 0930740 | powiat nowodworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowe Miasto | 0120900 | powiat płoński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowe Miasto nad Pilicą | 0973725 | powiat grójecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowy Dwór Mazowiecki | 0921148 | powiat nowodworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Odrzywół | 0630110 | powiat przysuski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Osieck | 0683192 | powiat otwocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ostrołęka | 0966079 | Ostrołęka (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ostrów Mazowiecka | 0966330 | powiat ostrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Otwock | 0921237 | powiat otwocki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Ożarów Mazowiecki | 0921415 | powiat warszawski zachodni | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Piaseczno | 0921438 | powiat piaseczynski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Piastów | 0921496 | powiat pruszkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pilawa | 0975753 | powiat garwoliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pionki | 0973748 | powiat radomski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Płock | 0968687 | Płock (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Płońsk | 0930800 | powiat płoński | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Podkowa Leśna | 0921504 | powiat grodziski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pruszków | 0921510 | powiat pruszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Przasnysz | 0966398 | powiat przasnyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Przysucha | 0973777 | powiat przysuski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Przytyk | 0634348 | powiat radomski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pułtusk | 0930816 | powiat pułtuski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Raciąż | 0930839 | powiat płoński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radom | 0972750 | Radom (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radzymin | 0921591 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Różan | 0966412 | powiat makowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sanniki | 0574511 | powiat gostyniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Serock | 0921645 | powiat legionowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Siedlce | 0975173 | Siedlce (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Siennica | 0687273 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sienno | 0636650 | powiat lipski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sierpc | 0969310 | powiat sierpecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Skaryszew | 0973820 | powiat radomski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sochaczew | 0977120 | powiat sochaczewski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Sochocin | 0125954 | powiat płoński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sokołów Podlaski | 0975760 | powiat sokołowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Solec nad Wisłą | 0637921 | powiat lipski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stanisławów | 0690186 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Staroźreby | 0577060 | powiat płocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sulejówek | 0921668 | powiat miński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szydłowiec | 0973895 | powiat szydłowiecki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Tarczyn | 0009478 | powiat piaseczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tłuszcz | 0966441 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Warka | 0973978 | powiat grójecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Warszawa | 0918123 | Warszawa (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Węgrów | 0975871 | powiat węgrowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wiskitki | 0739656 | powiat żyrardowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wołomin | 0921792 | powiat wolominski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wyszków | 0966470 | powiat wyszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wyszogród | 0969356 | powiat płocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wyśmierzyce | 0974044 | powiat białobrzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zakroczym | 0921869 | powiat nowodworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ząbki | 0921958 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zielonka | 0921970 | powiat wołomiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zwoleń | 0974096 | powiat zwoleński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żelechów | 0975983 | powiat garwoliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żuromin | 0930851 | powiat żuromiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żyrardów | 0977210 | powiat zyrardowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |

### Opolskie (38)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Baborów | 0965200 | powiat głubczycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Biała | 0965223 | powiat prudnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Branice | 0491742 | powiat głubczycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brzeg | 0965252 | powiat brzeski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Byczyna | 0965275 | powiat kluczborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobrodzień | 0931454 | powiat oleski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Głogówek | 0965281 | powiat prudnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Głubczyce | 0965329 | powiat głubczycki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Głuchołazy | 0965341 | powiat nyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gogolin | 0965364 | powiat krapkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gorzów Śląski | 0931490 | powiat oleski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Grodków | 0965401 | powiat brzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kędzierzyn-Koźle | 0965424 | powiat kędzierzyńsko-kozielski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kietrz | 0965602 | powiat głubczycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kluczbork | 0965619 | powiat kluczborski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Kolonowskie | 0965631 | powiat strzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Korfantów | 0496946 | powiat nyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krapkowice | 0965677 | powiat krapkowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Leśnica | 0965714 | powiat strzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lewin Brzeski | 0965720 | powiat brzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Namysłów | 0965743 | powiat namysłowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Niemodlin | 0965750 | powiat opolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nysa | 0965789 | powiat nyski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Olesno | 0932293 | powiat oleski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Opole | 0965016 | Opole (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Otmuchów | 0965832 | powiat nyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ozimek | 0965849 | powiat opolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Paczków | 0965855 | powiat nyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Praszka | 0932353 | powiat oleski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Prószków | 0502523 | powiat opolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Prudnik | 0965878 | powiat prudnicki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Strzelce Opolskie | 0965915 | powiat strzelecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Strzeleczki | 0503600 | powiat krapkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tułowice | 0504090 | powiat opolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ujazd | 0965967 | powiat strzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wołczyn | 0965996 | powiat kluczborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zawadzkie | 0966004 | powiat strzelecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zdzieszowice | 0966040 | powiat krapkowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Podkarpackie (54)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Baranów Sandomierski | 0980352 | powiat tarnobrzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bircza | 0598990 | powiat przemyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Błażowa | 0974280 | powiat rzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Boguchwała | 0644750 | powiat rzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brzostek | 0814493 | powiat dębicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Brzozów | 0952841 | powiat brzozowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Cieszanów | 0972051 | powiat lubaczowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dębica | 0982233 | powiat debicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Dubiecko | 0600496 | powiat przemyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dukla | 0952924 | powiat krośnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dynów | 0972080 | powiat rzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Głogów Małopolski | 0974328 | powiat rzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Iwonicz-Zdrój | 0953007 | powiat krośnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jarosław | 0972192 | powiat jaroslawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jasło | 0953059 | powiat jasielski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jawornik Polski | 0603900 | powiat przeworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jedlicze | 0953237 | powiat krośnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kańczuga | 0972424 | powiat przeworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kolbuszowa | 0974392 | powiat kolbuszowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kołaczyce | 0353968 | powiat jasielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krosno | 0952410 | Krosno (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lesko | 0953409 | powiat leski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Leżajsk | 0974400 | powiat leżajski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lubaczów | 0972447 | powiat lubaczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Łańcut | 0974529 | powiat łańcucki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mielec | 0974618 | powiat mielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Narol | 0606984 | powiat lubaczowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nisko | 0980530 | powiat niżański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowa Dęba | 0980636 | powiat tarnobrzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowa Sarzyna | 0974788 | powiat leżajski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Oleszyce | 0972507 | powiat lubaczowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pilzno | 0982345 | powiat dębicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pruchnik | 0608316 | powiat jarosławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Przecław | 0658828 | powiat mielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Przemyśl | 0971672 | Przemyśl (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Przeworsk | 0972513 | powiat przeworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radomyśl Wielki | 0982411 | powiat mielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radymno | 0972594 | powiat jarosławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ropczyce | 0974825 | powiat ropczycko-sędziszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Rudnik nad Sanem | 0980850 | powiat niżański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rymanów | 0953421 | powiat krośnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rzeszów | 0974133 | Rzeszów (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Sanok | 0953510 | powiat sanocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Sędziszów Małopolski | 0974937 | powiat ropczycko-sędziszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sieniawa | 0972683 | powiat przeworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sokołów Małopolski | 0974966 | powiat rzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stalowa Wola | 0981133 | powiat stalowowolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Strzyżów | 0975010 | powiat strzyżowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Tarnobrzeg | 0980085 | Tarnobrzeg (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Tyczyn | 0975078 | powiat rzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ulanów | 0981386 | powiat niżański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ustrzyki Dolne | 0953817 | powiat bieszczadzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Zagórz | 0953881 | powiat sanocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zaklików | 0810615 | powiat stalowowolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Podlaskie (40)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Augustów | 0977539 | powiat augustowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Białystok | 0922410 | Białystok (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bielsk Podlaski | 0922685 | powiat bielski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Brańsk | 0922745 | powiat bielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Choroszcz | 0922811 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ciechanowiec | 0957324 | powiat wysokomazowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czarna Białostocka | 0922886 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czyżew | 0395984 | powiat wysokomazowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dąbrowa Białostocka | 0922923 | powiat sokólski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Drohiczyn | 0922998 | powiat siemiatycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Goniądz | 0957360 | powiat moniecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Grajewo | 0957376 | powiat grajewski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Hajnówka | 0923035 | powiat hajnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jedwabne | 0957382 | powiat łomżyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kleszczele | 0031727 | powiat hajnowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Knyszyn | 0923213 | powiat moniecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kolno | 0957420 | powiat kolneński | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Krynki | 0032655 | powiat sokólski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lipsk | 0977717 | powiat augustowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łapy | 0923271 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łomża | 0957241 | Łomża (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Michałowo | 0034507 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mońki | 0923348 | powiat moniecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowogród | 0957459 | powiat łomżyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rajgród | 0957465 | powiat grajewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sejny | 0977918 | powiat sejneński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Siemiatycze | 0923360 | powiat siemiatycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Sokółka | 0923443 | powiat sokólski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Stawiski | 0957548 | powiat kolneński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Suchowola | 0041312 | powiat sokólski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Supraśl | 0923472 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Suraż | 0923510 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Suwałki | 0977456 | Suwałki (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Szczuczyn | 0957560 | powiat grajewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szepietowo | 0407380 | powiat wysokomazowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tykocin | 0043446 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wasilków | 0923526 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wysokie Mazowieckie | 0957620 | powiat wysokomazowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Zabłudów | 0923578 | powiat białostocki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zambrów | 0957637 | powiat zambrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |

### Pomorskie (43)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Brusy | 0928848 | powiat chojnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bytów | 0977290 | powiat bytowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Chojnice | 0928854 | powiat chojnicki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Czarna Woda | 0162139 | powiat starogardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czarne | 0977309 | powiat człuchowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czersk | 0928920 | powiat chojnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Człuchów | 0977321 | powiat człuchowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Debrzno | 0977338 | powiat człuchowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dzierzgoń | 0932726 | powiat sztumski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gdańsk | 0933016 | Gdańsk (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gdynia | 0934100 | Gdynia (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Gniew | 0934470 | powiat tczewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Hel | 0934501 | powiat pucki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jastarnia | 0934518 | powiat pucki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kartuzy | 0934547 | powiat kartuski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kępice | 0977344 | powiat słupski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kobylnica | 0745289 | powiat słupski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kościerzyna | 0934553 | powiat kościerski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Krynica Morska | 0932755 | powiat nowodworski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kwidzyn | 0932790 | powiat kwidzyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lębork | 0977373 | powiat lęborski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Łeba | 0977380 | powiat lęborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Malbork | 0932815 | powiat malborski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Miastko | 0977404 | powiat bytowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowy Dwór Gdański | 0932880 | powiat nowodworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowy Staw | 0932904 | powiat malborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pelplin | 0934599 | powiat tczewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Prabuty | 0932962 | powiat kwidzyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pruszcz Gdański | 0934620 | powiat gdański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Puck | 0934636 | powiat pucki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Reda | 0934659 | powiat wejherowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rumia | 0934694 | powiat wejherowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skarszewy | 0934754 | powiat starogardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skórcz | 0934777 | powiat starogardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Słupsk | 0977278 | Słupsk (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sopot | 0934783 | Sopot (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Starogard Gdański | 0934837 | powiat starogardzki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Sztum | 0932991 | powiat sztumski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Tczew | 0934903 | powiat tczewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ustka | 0977427 | powiat słupski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wejherowo | 0934984 | powiat wejherowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Władysławowo | 0935015 | powiat pucki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żukowo | 0935127 | powiat kartuski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Śląskie (75)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Będzin | 0937899 | powiat bedzinski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Bielsko-Biała | 0923584 | Bielsko-Biała (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bieruń | 0938077 | powiat bierunsko-ledzinski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Blachownia | 0931365 | powiat częstochowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bytom | 0938670 | Bytom (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chorzów | 0938887 | Chorzów (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Cieszyn | 0924158 | powiat cieszynski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czechowice-Dziedzice | 0939094 | powiat bielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czeladź | 0939349 | powiat będziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czerwionka-Leszczyny | 0939409 | powiat rybnicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Częstochowa | 0930868 | Częstochowa (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Dąbrowa Górnicza | 0939473 | Dąbrowa Górnicza (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Gliwice | 0940000 | Gliwice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Imielin | 0941582 | powiat bieruńsko-lędziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Janów | 0133273 | powiat częstochowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jastrzębie-Zdrój | 0940163 | Jastrzębie-Zdrój (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jaworzno | 0940335 | Jaworzno (m.n.p.p.) | ⏸️ Deferred | surveyed | deferred | not-enabled | 2026-10-18 |
| Kalety | 0931589 | powiat tarnogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Katowice | 0937474 | Katowice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kłobuck | 0931678 | powiat kłobucki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Knurów | 0940849 | powiat gliwicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koniecpol | 0931750 | powiat częstochowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koziegłowy | 0931827 | powiat myszkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krzanowice | 0215427 | powiat raciborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krzepice | 0931862 | powiat kłobucki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kuźnia Raciborska | 0940884 | powiat raciborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lędziny | 0940890 | powiat bieruńsko-lędziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lubliniec | 0931945 | powiat lubliniecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Łaziska Górne | 0941139 | powiat mikołowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łazy | 0941197 | powiat zawierciański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miasteczko Śląskie | 0943902 | powiat tarnogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mikołów | 0941286 | powiat mikołowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mysłowice | 0941487 | Mysłowice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Myszków | 0932057 | powiat myszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ogrodzieniec | 0941748 | powiat zawierciański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Olsztyn | 0140675 | powiat częstochowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Orzesze | 0941984 | powiat mikołowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piekary Śląskie | 0942104 | Piekary Śląskie (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Pilica | 0219566 | powiat zawierciański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Poręba | 0942216 | powiat zawierciański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Przyrów | 0143550 | powiat częstochowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pszczyna | 0942222 | powiat pszczyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pszów | 0945083 | powiat wodzisławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pyskowice | 0942417 | powiat gliwicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Racibórz | 0942469 | powiat raciborski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Radlin | 0945108 | powiat wodzisławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radzionków | 0938806 | powiat tarnogórski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ruda Śląska | 0942630 | Ruda Śląska (m.n.p.p.) | ⏸️ Deferred | surveyed | deferred | not-enabled | 2026-10-18 |
| Rybnik | 0942765 | Rybnik (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Rydułtowy | 0943121 | powiat wodzisławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Siemianowice Śląskie | 0943150 | Siemianowice Śląskie (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Siewierz | 0943204 | powiat będziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skoczów | 0925198 | powiat cieszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sławków | 0943285 | powiat będziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sosnowiec | 0943428 | Sosnowiec (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sośnicowice | 0221936 | powiat gliwicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Strumień | 0925258 | powiat cieszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczekociny | 0932413 | powiat zawierciański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczyrk | 0925850 | powiat bielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Świętochłowice | 0943724 | Świętochłowice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tarnowskie Góry | 0943813 | powiat tarnogórski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Toszek | 0944126 | powiat gliwicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tychy | 0944534 | Tychy (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Ustroń | 0926677 | powiat cieszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wilamowice | 0926996 | powiat bielski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wisła | 0927091 | powiat cieszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Włodowice | 0146821 | powiat zawierciański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wodzisław Śląski | 0944853 | powiat wodzisławski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Wojkowice | 0945232 | powiat będziński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Woźniki | 0932494 | powiat lubliniecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zabrze | 0945380 | Zabrze (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zawiercie | 0945491 | powiat zawiercianski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żarki | 0932643 | powiat myszkowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Żory | 0945746 | Żory (m.n.p.p.) | ⏸️ Deferred | surveyed | deferred | not-enabled | 2026-10-18 |
| Żywiec | 0927642 | powiat żywiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |

### Świętokrzyskie (51)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Bodzentyn | 0230102 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bogoria | 0788070 | powiat staszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Busko-Zdrój | 0946651 | powiat buski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chęciny | 0946846 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chmielnik | 0946906 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ćmielów | 0980435 | powiat ostrowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Daleszyce | 0236429 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Działoszyce | 0946987 | powiat pińczowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gowarczów | 0620659 | powiat konecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Iwaniska | 0793673 | powiat opatowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jędrzejów | 0947030 | powiat jędrzejowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Kazimierza Wielka | 0947076 | powiat kazimierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kielce | 0945930 | Kielce (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Klimontów | 0795933 | powiat sandomierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Końskie | 0947136 | powiat konecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Koprzywnica | 0796588 | powiat sandomierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kunów | 0947202 | powiat ostrowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łagów | 0247670 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łopuszno | 0248622 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Małogoszcz | 0249343 | powiat jędrzejowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Morawica | 0254226 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowa Słupia | 0255510 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowy Korczyn | 0256142 | powiat buski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Oleśnica | 0257118 | powiat staszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Opatowiec | 0257963 | powiat kazimierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Opatów | 0980671 | powiat opatowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Osiek | 0802202 | powiat staszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ostrowiec Świętokrzyski | 0947308 | powiat ostrowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ożarów | 0980777 | powiat opatowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pacanów | 0258715 | powiat buski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Piekoszów | 0261746 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pierzchnica | 0262310 | powiat kielecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pińczów | 0947580 | powiat pińczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Połaniec | 0980783 | powiat staszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Radoszyce | 0264986 | powiat konecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sandomierz | 0980926 | powiat sandomierski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sędziszów | 0947610 | powiat jędrzejowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skalbmierz | 0947627 | powiat kazimierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skarżysko-Kamienna | 0947716 | powiat skarzyski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sobków | 0270604 | powiat jędrzejowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Starachowice | 0947930 | powiat starachowicki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Staszów | 0981274 | powiat staszowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Stąporków | 0948271 | powiat konecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stopnica | 0272951 | powiat buski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Suchedniów | 0948360 | powiat skarżyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szydłów | 0275062 | powiat staszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wąchock | 0276802 | powiat starachowicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wiślica | 0277470 | powiat buski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Włoszczowa | 0948472 | powiat włoszczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wodzisław | 0279686 | powiat jędrzejowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zawichost | 0981417 | powiat sandomierski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Warmińsko-Mazurskie (50)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Barczewo | 0964577 | powiat olsztyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bartoszyce | 0964583 | powiat bartoszycki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Biała Piska | 0977640 | powiat piski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Biskupiec | 0964590 | powiat olsztyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bisztynek | 0964608 | powiat bartoszycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Braniewo | 0932710 | powiat braniewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Dobre Miasto | 0964614 | powiat olsztyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Działdowo | 0930609 | powiat działdowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Elbląg | 0932703 | Elbląg (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ełk | 0977670 | powiat elcki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Frombork | 0932732 | powiat braniewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Giżycko | 0977692 | powiat gizycki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gołdap | 0977700 | powiat gołdapski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Górowo Iławeckie | 0964643 | powiat bartoszycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Iława | 0964650 | powiat iławski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Jeziorany | 0964703 | powiat olsztyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kętrzyn | 0964710 | powiat kętrzyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kisielice | 0932749 | powiat iławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Korsze | 0964726 | powiat kętrzyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lidzbark | 0930644 | powiat działdowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lidzbark Warmiński | 0964732 | powiat lidzbarski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Lubawa | 0964749 | powiat iławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mikołajki | 0977723 | powiat mrągowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miłakowo | 0481761 | powiat ostródzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miłomłyn | 0482192 | powiat ostródzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Młynary | 0932873 | powiat elbląski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Morąg | 0964850 | powiat ostródzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mrągowo | 0964896 | powiat mrągowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nidzica | 0964904 | powiat nidzicki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Nowe Miasto Lubawskie | 0983563 | powiat nowomiejski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Olecko | 0977798 | powiat olecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Olsztyn | 0964465 | Olsztyn (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Olsztynek | 0964910 | powiat olsztyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Orneta | 0932910 | powiat lidzbarski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Orzysz | 0977806 | powiat piski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ostróda | 0964927 | powiat ostrodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Pasłęk | 0932927 | powiat elbląski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pasym | 0485813 | powiat szczycieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pieniężno | 0932956 | powiat braniewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pisz | 0977835 | powiat piski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Reszel | 0964979 | powiat kętrzyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ruciane-Nida | 0977841 | powiat piski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ryn | 0977893 | powiat giżycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sępopol | 0964985 | powiat bartoszycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Susz | 0932979 | powiat iławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczytno | 0964991 | powiat szczycieński | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Tolkmicko | 0933000 | powiat elbląski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Węgorzewo | 0977947 | powiat węgorzewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wielbark | 0490470 | powiat szczycieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zalewo | 0965000 | powiat iławski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Wielkopolskie (120)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Bojanowo | 0954308 | powiat rawicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Borek Wielkopolski | 0954343 | powiat gostyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Budzyń | 0524393 | powiat chodzieski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Buk | 0970520 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chocz | 0195564 | powiat pleszewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chodzież | 0966760 | powiat chodzieski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czarnków | 0966777 | powiat czarnkowsko-trzcianecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Czempiń | 0970537 | powiat kościański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Czerniejewo | 0970543 | powiat gnieźnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dąbie | 0948992 | powiat kolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobra | 0949000 | powiat turecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobrzyca | 0196380 | powiat pleszewski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dolsk | 0970589 | powiat śremski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gniezno | 0970632 | powiat gnieznienski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Golina | 0949017 | powiat koniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gołańcz | 0966820 | powiat wągrowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gostyń | 0954395 | powiat gostyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Grabów nad Prosną | 0936760 | powiat ostrzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Grodzisk Wielkopolski | 0970810 | powiat grodziski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Jaraczewo | 0199088 | powiat jarociński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jarocin | 0936776 | powiat jarociński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Jastrowie | 0966843 | powiat złotowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Jutrosin | 0954461 | powiat rawicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kaczory | 0526469 | powiat pilski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kalisz | 0936569 | Kalisz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kępno | 0936871 | powiat kępiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kleczew | 0949023 | powiat koniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kłecko | 0970840 | powiat gnieźnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kłodawa | 0949046 | powiat kolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kobylin | 0954478 | powiat krotoszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koło | 0949052 | powiat kolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Konin | 0948667 | Konin (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kostrzyn | 0970885 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kościan | 0954484 | powiat kościański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Koźmin Wielkopolski | 0936925 | powiat krotoszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Koźminek | 0201141 | powiat kaliski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kórnik | 0970922 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krajenka | 0966932 | powiat złotowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krobia | 0954538 | powiat gostyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krotoszyn | 0936931 | powiat krotoszynski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Krzywiń | 0954544 | powiat kościański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Krzyż Wielkopolski | 0966961 | powiat czarnkowsko-trzcianecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Książ Wielkopolski | 0970968 | powiat śremski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Leszno | 0954225 | Leszno (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Luboń | 0970974 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Lwówek | 0971028 | powiat nowotomyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łobżenica | 0966984 | powiat pilski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Margonin | 0966990 | powiat chodzieski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miasteczko Krajeńskie | 0528132 | powiat pilski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miejska Górka | 0954550 | powiat rawicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mieścisko | 0588855 | powiat wągrowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Międzychód | 0935506 | powiat międzychodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mikstat | 0937066 | powiat ostrzeszowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Miłosław | 0971034 | powiat wrzesiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mosina | 0971057 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Murowana Goślina | 0971152 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nekla | 0590310 | powiat wrzesiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowe Skalmierzyce | 0937089 | powiat ostrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowy Tomyśl | 0971175 | powiat nowotomyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Oborniki | 0971181 | powiat obornicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Obrzycko | 0971212 | powiat szamotulski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Odolanów | 0937110 | powiat ostrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Okonek | 0967044 | powiat złotowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Opalenica | 0971241 | powiat nowotomyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Opatówek | 0205386 | powiat kaliski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Osieczna | 0954567 | powiat leszczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ostroróg | 0971264 | powiat szamotulski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Ostrów Wielkopolski | 0937132 | powiat ostrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ostrzeszów | 0937250 | powiat ostrzeszowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Piła | 0966530 | powiat pilski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pleszew | 0937280 | powiat pleszewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pniewy | 0971270 | powiat szamotulski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pobiedziska | 0971287 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pogorzela | 0954580 | powiat gostyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Poniec | 0954596 | powiat gostyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Poznań | 0969400 | Poznań (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Przedecz | 0949129 | powiat kolski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Puszczykowo | 0971376 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pyzdry | 0949164 | powiat wrzesiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rakoniewice | 0971413 | powiat grodziski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Raszków | 0937310 | powiat ostrowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rawicz | 0954604 | powiat rawicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Rogoźno | 0967080 | powiat obornicki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rychtal | 0208077 | powiat kępiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rychwał | 0949193 | powiat koniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Rydzyna | 0954633 | powiat leszczyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sieraków | 0971436 | powiat międzychodzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Skoki | 0971459 | powiat wągrowiecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Słupca | 0949247 | powiat słupecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Sompolno | 0949253 | powiat koniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stawiszyn | 0937327 | powiat kaliski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Stęszew | 0971494 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sulmierzyce | 0937333 | powiat krotoszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Swarzędz | 0971502 | powiat poznański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szamocin | 0967096 | powiat chodzieski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szamotuły | 0971531 | powiat szamotulski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Ślesin | 0949282 | powiat koniński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Śmigiel | 0954656 | powiat kościański | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Śrem | 0971560 | powiat śremski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Środa Wielkopolska | 0971614 | powiat średzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Trzcianka | 0967162 | powiat czarnkowsko-trzcianecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Trzemeszno | 0929701 | powiat gnieźnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tuliszków | 0949320 | powiat turecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Turek | 0949336 | powiat turecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ujście | 0967191 | powiat pilski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wągrowiec | 0967297 | powiat wągrowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wieleń | 0967334 | powiat czarnkowsko-trzcianecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wielichowo | 0971620 | powiat grodziski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Witkowo | 0949388 | powiat gnieźnieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wolsztyn | 0988632 | powiat wolsztyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wronki | 0967386 | powiat szamotulski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Września | 0971637 | powiat wrzesinski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Wyrzysk | 0967392 | powiat pilski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wysoka | 0967417 | powiat pilski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zagórów | 0949431 | powiat słupecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zaniemyśl | 0598546 | powiat średzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zbąszyń | 0988655 | powiat nowotomyski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Zduny | 0937439 | powiat krotoszyński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Złotów | 0967423 | powiat złotowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Żerków | 0937445 | powiat jarociński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

### Zachodniopomorskie (66)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Barlinek | 0935268 | powiat myśliborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Barwice | 0949649 | powiat szczecinecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Białogard | 0949690 | powiat bialogardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Biały Bór | 0949767 | powiat szczecinecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Bobolice | 0949804 | powiat koszaliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Borne Sulinowo | 0988715 | powiat szczecinecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Cedynia | 0978734 | powiat gryfiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chociwel | 0978757 | powiat stargardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Chojna | 0978786 | powiat gryfiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Choszczno | 0935280 | powiat choszczeński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czaplinek | 0949810 | powiat drawski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Człopa | 0966808 | powiat wałecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Darłowo | 0949833 | powiat sławieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dębno | 0935305 | powiat myśliborski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobra | 0978852 | powiat łobeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Dobrzany | 0978875 | powiat stargardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Drawno | 0935357 | powiat choszczeński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Drawsko Pomorskie | 0949862 | powiat drawski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Dziwnów | 0774782 | powiat kamieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Golczewo | 0978881 | powiat kamieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Goleniów | 0978929 | powiat goleniowski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Gościno | 0306236 | powiat kołobrzeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Gryfice | 0979053 | powiat gryficki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Gryfino | 0979076 | powiat gryfiński | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Ińsko | 0979099 | powiat stargardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kalisz Pomorski | 0949916 | powiat drawski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kamień Pomorski | 0979113 | powiat kamieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Karlino | 0949968 | powiat białogardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Kołobrzeg | 0950026 | powiat kolobrzeski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Koszalin | 0949448 | Koszalin (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lipiany | 0979120 | powiat pyrzycki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Łobez | 0979136 | powiat łobeski | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Maszewo | 0979188 | powiat goleniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mielno | 0308353 | powiat koszaliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mieszkowice | 0979202 | powiat gryfiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Międzyzdroje | 0979248 | powiat kamieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Mirosławiec | 0967038 | powiat wałecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Moryń | 0979283 | powiat gryfiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Myślibórz | 0935558 | powiat myśliborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowe Warpno | 0979308 | powiat policki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Nowogard | 0979389 | powiat goleniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pełczyce | 0935601 | powiat choszczeński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Płoty | 0979432 | powiat gryficki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Polanów | 0950115 | powiat koszaliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Police | 0979449 | powiat policki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Połczyn-Zdrój | 0950144 | powiat świdwiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Pyrzyce | 0979515 | powiat pyrzycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Recz | 0935653 | powiat choszczeński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Resko | 0979580 | powiat łobeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sianów | 0950240 | powiat koszaliński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Sławno | 0977410 | powiat sławieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Stargard | 0979596 | powiat stargardzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Stepnica | 0783864 | powiat goleniowski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Suchań | 0979716 | powiat stargardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Szczecin | 0977976 | Szczecin (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Szczecinek | 0950262 | powiat szczecinecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Świdwin | 0950322 | powiat świdwiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Świnoujście | 0979722 | Świnoujście (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Trzcińsko-Zdrój | 0979952 | powiat gryfiński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Trzebiatów | 0979969 | powiat gryficki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tuczno | 0967185 | powiat wałecki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Tychowo | 0313839 | powiat białogardzki | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wałcz | 0967245 | powiat wałecki | 🟢 BUILD | surveyed | ready | not-enabled | 2026-10-18 |
| Węgorzyno | 0980062 | powiat łobeski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Wolin | 0980079 | powiat kamieński | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |
| Złocieniec | 0950374 | powiat drawski | ⚪ UNRESEARCHED | unresearched | unresearched | not-enabled | — |

---

*Generated by spikes/build-progress.mjs — doc/data only, no version bump.*
