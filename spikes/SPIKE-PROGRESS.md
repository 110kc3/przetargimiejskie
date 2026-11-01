# SPIKE-PROGRESS — all-Poland city spike + build ledger

> **GENERATED FILE — do not hand-edit.** Regenerate with `node spikes/build-progress.mjs` after updating [master-cities.json](./master-cities.json) (the source of truth).
>
> Updated 2026-10-31 from the official GUS TERYT snapshot effective 2026-01-01. Queue: [backlog.json](./backlog.json) (0 pending / 380 done of 380 powiat rows; 335 distinct seat cities). Inventory differences: [inventory/DISCREPANCIES.md](./inventory/DISCREPANCIES.md). Build guide: [../pipeline/ADAPTER-GUIDE.md](../pipeline/ADAPTER-GUIDE.md).

## Official inventory roll-up (1026 cities)

| Status | Count |
|---|---|
| ✅ BUILT | 619 |
| 🟢 BUILD | 0 |
| 🟡 VERIFY | 0 |
| 🔴 NO-BUILD | 404 |
| ❌ Dropped | 3 |
| ⏸️ Deferred | 0 |
| ⚪ UNRESEARCHED | 0 |

**Convention:** official identity is `official.simc`; product/pipeline aliases never replace it. A surveyed city has a per-city evidence path. New official cities remain `unresearched` until direct source evidence exists.

## Lifecycle coverage

| Dimension | State | Count |
|---|---|---:|
| research | completed | 1 |
| research | surveyed | 1025 |
| implementation | built | 1 |
| implementation | deferred | 3 |
| implementation | enabled | 618 |
| implementation | no-source-found | 404 |
| runtime | enabled | 1 |
| runtime | monitored | 618 |
| runtime | not-enabled | 407 |

Lifecycle totals are retained manifest declarations, not a live health result. Source freshness and failures are recorded in [data/index.json](../data/index.json) and enforced by the health checks.

## Existing-city source/asset audit

619 enabled cities: **0 complete**, **618 partial**, **1 unchecked**. Source observations do not prove parser completeness or healthy hosted monitoring. Remaining execution is in [TODO.md](../TODO.md).

| City | Last source check | Audit | Observed sale assets | Evidence |
|---|---|---|---|---|
| Aleksandrów Łódzki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/aleksandrow-lodzki/aleksandrow-lodzki.md) |
| Alwernia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/alwernia/alwernia.md) |
| Andrychów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/andrychow/andrychow.md) |
| Annopol | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/annopol/annopol.md) |
| Augustów | 2026-10-21 | partial | residential | [source notes](../spikes/podlaskie/powiat-augustowski/augustow.md) |
| Babimost | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/babimost/babimost.md) |
| Baborów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/baborow/baborow.md) |
| Barcin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/barcin/barcin.md) |
| Barczewo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/barczewo/barczewo.md) |
| Bartoszyce | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-bartoszycki/bartoszyce.md) |
| Bełchatów | 2026-10-21 | partial | residential | [source notes](../spikes/lodzkie/powiat-belchatowski/belchatow.md) |
| Bełżyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/belzyce/belzyce.md) |
| Będzin | 2026-10-30 | partial | residential, land | [source notes](../spikes/slaskie/powiat-bedzinski/bedzin.md) |
| Biała Piska | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/biala-piska/biala-piska.md) |
| Biała Podlaska | 2026-10-21 | partial | residential, commercial, building | [source notes](../spikes/lubelskie/biala-podlaska/biala-podlaska.md) |
| Białaczów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/bialaczow/bialaczow.md) |
| Białystok | 2026-10-21 | partial | residential | [source notes](../spikes/podlaskie/bialystok/bialystok.md) |
| Biecz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/biecz/biecz.md) |
| Bielsk Podlaski | 2026-10-30 | partial | residential, land | [source notes](../spikes/podlaskie/powiat-bielski/bielsk-podlaski.md) |
| Bielsko-Biała | 2026-10-21 | partial | building, commercial, land, residential | [source notes](../spikes/slaskie/bielsko-biala/bielsko-biala.md) |
| Bierutów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/bierutow/bierutow.md) |
| Biłgoraj | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-bilgorajski/bilgoraj.md) |
| Bircza | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/bircza/bircza.md) |
| Biskupiec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/biskupiec/biskupiec.md) |
| Bisztynek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/bisztynek/bisztynek.md) |
| Błaszki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/blaszki/blaszki.md) |
| Bobowa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/bobowa/bobowa.md) |
| Bobrowniki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/bobrowniki/bobrowniki.md) |
| Bochnia | 2026-10-21 | partial | land, residential | [source notes](../spikes/malopolskie/powiat-bochenski/bochnia.md) |
| Bogatynia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/bogatynia/bogatynia.md) |
| Bogoria | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/bogoria/bogoria.md) |
| Bojanowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/bojanowo/bojanowo.md) |
| Bolesławiec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/boleslawiec-0194330/boleslawiec-0194330.md) |
| Bolesławiec | 2026-10-19 | partial | residential | [source notes](../spikes/dolnoslaskie/powiat-boleslawiecki/boleslawiec.md) |
| Bolków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/bolkow/bolkow.md) |
| Branice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/branice/branice.md) |
| Braniewo | 2026-10-21 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-braniewski/braniewo.md) |
| Brańsk | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/bransk/bransk.md) |
| Brody | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/brody/brody.md) |
| Brok | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/brok/brok.md) |
| Brusy | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/brusy/brusy.md) |
| Brwinów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/brwinow/brwinow.md) |
| Brzeg | 2026-10-21 | partial | residential | [source notes](../spikes/opolskie/powiat-brzeski/brzeg.md) |
| Brzeg Dolny | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/brzeg-dolny/brzeg-dolny.md) |
| Brzesko | 2026-10-30 | partial | residential, land | [source notes](../spikes/malopolskie/powiat-brzeski/brzesko.md) |
| Brzeszcze | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/brzeszcze/brzeszcze.md) |
| Brześć Kujawski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/brzesc-kujawski/brzesc-kujawski.md) |
| Budzyń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/budzyn/budzyn.md) |
| Bukowno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/bukowno/bukowno.md) |
| Busko-Zdrój | 2026-10-20 | partial | land | [source notes](../spikes/swietokrzyskie/powiat-buski/busko-zdroj.md) |
| Bychawa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/bychawa/bychawa.md) |
| Byczyna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/byczyna/byczyna.md) |
| Bydgoszcz | 2026-10-21 | partial | building, commercial, residential | [source notes](../spikes/kujawsko-pomorskie/bydgoszcz/bydgoszcz.md) |
| Bystrzyca Kłodzka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/bystrzyca-klodzka/bystrzyca-klodzka.md) |
| Bytom | 2026-10-21 | partial | commercial, garage, land, residential | [source notes](../spikes/slaskie/bytom/bytom.md) |
| Bytów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/powiat-bytowski/bytow.md) |
| Cedynia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/cedynia/cedynia.md) |
| Chełm | 2026-10-21 | partial | residential, building | [source notes](../spikes/lubelskie/chelm/chelm.md) |
| Chełmek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/chelmek/chelmek.md) |
| Chełmno | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/kujawsko-pomorskie/powiat-chelminski/chelmno.md) |
| Chęciny | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/checiny/checiny.md) |
| Chmielnik | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/chmielnik/chmielnik.md) |
| Chodzież | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/wielkopolskie/powiat-chodzieski/chodziez.md) |
| Chojna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/chojna/chojna.md) |
| Chojnice | 2026-10-21 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/powiat-chojnicki/chojnice.md) |
| Choroszcz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/choroszcz/choroszcz.md) |
| Choszczno | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/zachodniopomorskie/powiat-choszczenski/choszczno.md) |
| Chrzanów | 2026-10-21 | partial | land | [source notes](../spikes/malopolskie/powiat-chrzanowski/chrzanow.md) |
| Ciechanowiec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/ciechanowiec/ciechanowiec.md) |
| Ciechocinek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/ciechocinek/ciechocinek.md) |
| Cieszanów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/cieszanow/cieszanow.md) |
| Cieszyn | 2026-10-21 | partial | building, residential | [source notes](../spikes/slaskie/powiat-cieszynski/cieszyn.md) |
| Ciężkowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/ciezkowice/ciezkowice.md) |
| Cybinka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/cybinka/cybinka.md) |
| Czarna Białostocka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/czarna-bialostocka/czarna-bialostocka.md) |
| Czarny Dunajec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/czarny-dunajec/czarny-dunajec.md) |
| Czchów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/czchow/czchow.md) |
| Czechowice-Dziedzice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/czechowice-dziedzice/czechowice-dziedzice.md) |
| Czemierniki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/czemierniki/czemierniki.md) |
| Czempiń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/czempin/czempin.md) |
| Czerniejewo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/czerniejewo/czerniejewo.md) |
| Czerwieńsk | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/czerwiensk/czerwiensk.md) |
| Częstochowa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/czestochowa/czestochowa.md) |
| Człopa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/czlopa/czlopa.md) |
| Człuchów | 2026-10-30 | partial | residential, land | [source notes](../spikes/pomorskie/powiat-czluchowski/czluchow.md) |
| Ćmielów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/cmielow/cmielow.md) |
| Dąbie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/dabie/dabie.md) |
| Dąbrowa Białostocka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/dabrowa-bialostocka/dabrowa-bialostocka.md) |
| Dąbrowa Górnicza | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/dabrowa-gornicza/dabrowa-gornicza.md) |
| Dąbrowa Tarnowska | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-dabrowski/dabrowa-tarnowska.md) |
| Dębno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/debno/debno.md) |
| Dobiegniew | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/dobiegniew/dobiegniew.md) |
| Dobrodzień | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/dobrodzien/dobrodzien.md) |
| Dolsk | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/dolsk/dolsk.md) |
| Drawno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/drawno/drawno.md) |
| Drawsko Pomorskie | 2026-10-21 | partial | residential | [source notes](../spikes/zachodniopomorskie/powiat-drawski/drawsko-pomorskie.md) |
| Drohiczyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/drohiczyn/drohiczyn.md) |
| Dubiecko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/dubiecko/dubiecko.md) |
| Działdowo | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-dzialdowski/dzialdowo.md) |
| Działoszyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/dzialoszyn/dzialoszyn.md) |
| Dzierżoniów | 2026-10-21 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-dzierzoniowski/dzierzoniow.md) |
| Dziwnów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/dziwnow/dziwnow.md) |
| Elbląg | 2026-10-21 | partial | building, land, residential | [source notes](../spikes/warminsko-mazurskie/elblag/elblag.md) |
| Ełk | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-elcki/elk.md) |
| Frampol | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/frampol/frampol.md) |
| Gdańsk | 2026-10-21 | partial | residential | [source notes](../spikes/pomorskie/gdansk/gdansk.md) |
| Giżycko | 2026-10-21 | partial | residential | [source notes](../spikes/warminsko-mazurskie/powiat-gizycki/gizycko.md) |
| Gliwice | 2026-10-21 | partial | commercial, garage, land, residential | [source notes](../spikes/slaskie/gliwice/gliwice.md) |
| Głogów | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/dolnoslaskie/powiat-glogowski/glogow.md) |
| Głogówek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/glogowek/glogowek.md) |
| Głowaczów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/glowaczow/glowaczow.md) |
| Głowno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/glowno/glowno.md) |
| Głubczyce | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/opolskie/powiat-glubczycki/glubczyce.md) |
| Głuchołazy | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/glucholazy/glucholazy.md) |
| Głuszyca | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/gluszyca/gluszyca.md) |
| Gniew | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/gniew/gniew.md) |
| Gniezno | 2026-10-21 | partial | land, residential | [source notes](../spikes/wielkopolskie/powiat-gnieznienski/gniezno.md) |
| Gogolin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/gogolin/gogolin.md) |
| Golczewo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/golczewo/golczewo.md) |
| Goleniów | 2026-10-30 | partial | residential, land | [source notes](../spikes/zachodniopomorskie/powiat-goleniowski/goleniow.md) |
| Golina | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/golina/golina.md) |
| Golub-Dobrzyń | 2026-10-21 | partial | land, residential | [source notes](../spikes/kujawsko-pomorskie/powiat-golubsko-dobrzynski/golub-dobrzyn.md) |
| Goniądz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/goniadz/goniadz.md) |
| Goraj | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/goraj/goraj.md) |
| Gorlice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-gorlicki/gorlice.md) |
| Gorzów Wielkopolski | 2026-10-21 | partial | residential | [source notes](../spikes/lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md) |
| Gostynin | 2026-10-30 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-gostyninski/gostynin.md) |
| Gostyń | 2026-10-21 | partial | land | [source notes](../spikes/wielkopolskie/powiat-gostynski/gostyn.md) |
| Gościno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/goscino/goscino.md) |
| Góra | 2026-10-21 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-gorowski/gora.md) |
| Grodków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/grodkow/grodkow.md) |
| Grodzisk Mazowiecki | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/mazowieckie/powiat-grodziski/grodzisk-mazowiecki.md) |
| Grodzisk Wielkopolski | 2026-10-30 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-grodziski/grodzisk-wielkopolski.md) |
| Grudziądz | 2026-10-21 | partial | residential | [source notes](../spikes/kujawsko-pomorskie/grudziadz/grudziadz.md) |
| Grybów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/grybow/grybow.md) |
| Gryfice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/powiat-gryficki/gryfice.md) |
| Gryfino | 2026-10-30 | partial | residential, land | [source notes](../spikes/zachodniopomorskie/powiat-gryfinski/gryfino.md) |
| Gubin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/gubin/gubin.md) |
| Hajnówka | 2026-10-30 | partial | commercial, land | [source notes](../spikes/podlaskie/powiat-hajnowski/hajnowka.md) |
| Halinów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/halinow/halinow.md) |
| Hrubieszów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-hrubieszowski/hrubieszow.md) |
| Iława | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-ilawski/ilawa.md) |
| Iłża | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/ilza/ilza.md) |
| Inowrocław | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/powiat-inowroclawski/inowroclaw.md) |
| Janów Podlaski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/janow-podlaski/janow-podlaski.md) |
| Jarocin | 2026-10-20 | partial | land | [source notes](../spikes/wielkopolskie/powiat-jarocinski/jarocin.md) |
| Jarosław | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/powiat-jaroslawski/jaroslaw.md) |
| Jasień | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/jasien/jasien.md) |
| Jastrowie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/jastrowie/jastrowie.md) |
| Jastrzębie-Zdrój | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/jastrzebie-zdroj/jastrzebie-zdroj.md) |
| Jaworzno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/jaworzno/jaworzno.md) |
| Jedlicze | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/jedlicze/jedlicze.md) |
| Jelcz-Laskowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/jelcz-laskowice/jelcz-laskowice.md) |
| Jelenia Góra | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/dolnoslaskie/jelenia-gora/jelenia-gora.md) |
| Jędrzejów | 2026-10-30 | partial | residential, land | [source notes](../spikes/swietokrzyskie/powiat-jedrzejowski/jedrzejow.md) |
| Jordanów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/jordanow/jordanow.md) |
| Józefów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/jozefow-0987897/jozefow-0987897.md) |
| Jutrosin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/jutrosin/jutrosin.md) |
| Kalety | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/kalety/kalety.md) |
| Kalisz | 2026-10-21 | partial | residential, building | [source notes](../spikes/wielkopolskie/kalisz/kalisz.md) |
| Kalwaria Zebrzydowska | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/kalwaria-zebrzydowska/kalwaria-zebrzydowska.md) |
| Kamienna Góra | 2026-10-21 | partial | residential | [source notes](../spikes/dolnoslaskie/powiat-kamiennogorski/kamienna-gora.md) |
| Kamień Krajeński | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/kamien-krajenski/kamien-krajenski.md) |
| Kamionka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/kamionka/kamionka.md) |
| Kańczuga | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/kanczuga/kanczuga.md) |
| Karczew | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/karczew/karczew.md) |
| Kargowa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/kargowa/kargowa.md) |
| Karpacz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/karpacz/karpacz.md) |
| Kartuzy | 2026-10-30 | partial | commercial, land | [source notes](../spikes/pomorskie/powiat-kartuski/kartuzy.md) |
| Katowice | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/slaskie/katowice/katowice.md) |
| Kazimierz Dolny | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/kazimierz-dolny/kazimierz-dolny.md) |
| Kąty Wrocławskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/katy-wroclawskie/katy-wroclawskie.md) |
| Kcynia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/kcynia/kcynia.md) |
| Kędzierzyn-Koźle | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/opolskie/powiat-kedzierzynsko-kozielski/kedzierzyn-kozle.md) |
| Kępno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-kepinski/kepno.md) |
| Kętrzyn | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/warminsko-mazurskie/powiat-ketrzynski/ketrzyn.md) |
| Kęty | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/kety/kety.md) |
| Kielce | 2026-10-21 | partial | residential, land | [source notes](../spikes/swietokrzyskie/kielce/kielce.md) |
| Kiernozia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/kiernozia/kiernozia.md) |
| Kietrz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/kietrz/kietrz.md) |
| Kikół | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/kikol/kikol.md) |
| Kleszczele | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/kleszczele/kleszczele.md) |
| Kluczbork | 2026-10-30 | partial | residential, land | [source notes](../spikes/opolskie/powiat-kluczborski/kluczbork.md) |
| Kłecko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/klecko/klecko.md) |
| Kłobuck | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/slaskie/powiat-klobucki/klobuck.md) |
| Kłodawa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/klodawa/klodawa.md) |
| Kłodzko | 2026-10-21 | partial | residential | [source notes](../spikes/dolnoslaskie/powiat-klodzki/klodzko.md) |
| Knyszyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/knyszyn/knyszyn.md) |
| Kobylnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/kobylnica/kobylnica.md) |
| Kock | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/kock/kock.md) |
| Kolbuszowa | 2026-10-21 | partial | residential, land | [source notes](../spikes/podkarpackie/powiat-kolbuszowski/kolbuszowa.md) |
| Kolno | 2026-10-30 | partial | residential, land | [source notes](../spikes/podlaskie/powiat-kolnenski/kolno.md) |
| Kolonowskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/kolonowskie/kolonowskie.md) |
| Kołaczyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/kolaczyce/kolaczyce.md) |
| Koło | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-kolski/kolo.md) |
| Kołobrzeg | 2026-10-30 | partial | residential, land | [source notes](../spikes/zachodniopomorskie/powiat-kolobrzeski/kolobrzeg.md) |
| Konin | 2026-10-30 | partial | residential, land | [source notes](../spikes/wielkopolskie/konin/konin.md) |
| Konstancin-Jeziorna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/konstancin-jeziorna/konstancin-jeziorna.md) |
| Końskie | 2026-10-21 | partial | residential | [source notes](../spikes/swietokrzyskie/powiat-konecki/konskie.md) |
| Końskowola | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/konskowola/konskowola.md) |
| Koprzywnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/koprzywnica/koprzywnica.md) |
| Korfantów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/korfantow/korfantow.md) |
| Koronowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/koronowo/koronowo.md) |
| Kostrzyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/kostrzyn/kostrzyn.md) |
| Koszalin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/koszalin/koszalin.md) |
| Koszyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/koszyce/koszyce.md) |
| Kościan | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-koscianski/koscian.md) |
| Kościerzyna | 2026-10-21 | partial | residential, land | [source notes](../spikes/pomorskie/powiat-koscierski/koscierzyna.md) |
| Kowal | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/kowal/kowal.md) |
| Kowalewo Pomorskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/kowalewo-pomorskie/kowalewo-pomorskie.md) |
| Kowary | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/kowary/kowary.md) |
| Kozienice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-kozienicki/kozienice.md) |
| Koźminek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/kozminek/kozminek.md) |
| Kożuchów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/kozuchow/kozuchow.md) |
| Kórnik | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/kornik/kornik.md) |
| Krajenka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/krajenka/krajenka.md) |
| Kraków | 2026-10-21 | partial | residential, land, building, commercial, garage | [source notes](../spikes/malopolskie/krakow/krakow.md) |
| Krapkowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/powiat-krapkowicki/krapkowice.md) |
| Krasnobród | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/krasnobrod/krasnobrod.md) |
| Krasnystaw | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-krasnostawski/krasnystaw.md) |
| Kraśnik | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-krasnicki/krasnik.md) |
| Krobia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/krobia/krobia.md) |
| Krosno Odrzańskie | 2026-10-21 | partial | residential | [source notes](../spikes/lubuskie/powiat-krosnienski/krosno-odrzanskie.md) |
| Krotoszyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-krotoszynski/krotoszyn.md) |
| Krynica-Zdrój | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/krynica-zdroj/krynica-zdroj.md) |
| Krynki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/krynki/krynki.md) |
| Krzepice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/krzepice/krzepice.md) |
| Krzeszowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/krzeszowice/krzeszowice.md) |
| Krzywiń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/krzywin/krzywin.md) |
| Książ Wielki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/ksiaz-wielki/ksiaz-wielki.md) |
| Kunów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/kunow/kunow.md) |
| Kwidzyn | 2026-10-21 | partial | residential, land | [source notes](../spikes/pomorskie/powiat-kwidzynski/kwidzyn.md) |
| Legionowo | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-legionowski/legionowo.md) |
| Legnica | 2026-10-21 | partial | residential, commercial | [source notes](../spikes/dolnoslaskie/legnica/legnica.md) |
| Leszno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/leszno/leszno.md) |
| Leśnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/lesnica/lesnica.md) |
| Lewin Brzeski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/lewin-brzeski/lewin-brzeski.md) |
| Lębork | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/pomorskie/powiat-leborski/lebork.md) |
| Libiąż | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/libiaz/libiaz.md) |
| Lidzbark Warmiński | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-lidzbarski/lidzbark-warminski.md) |
| Limanowa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-limanowski/limanowa.md) |
| Lipiany | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/lipiany/lipiany.md) |
| Lipsk | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/lipsk/lipsk.md) |
| Lipsko | 2026-10-21 | partial | land | [source notes](../spikes/mazowieckie/powiat-lipski/lipsko.md) |
| Lubań | 2026-10-21 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-lubanski/luban.md) |
| Lubartów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-lubartowski/lubartow.md) |
| Lubawa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/lubawa/lubawa.md) |
| Lubień Kujawski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/lubien-kujawski/lubien-kujawski.md) |
| Lubin | 2026-10-19 | partial | land | [source notes](../spikes/dolnoslaskie/powiat-lubinski/lubin.md) |
| Lubliniec | 2026-10-21 | partial | residential, commercial, garage, land, building | [source notes](../spikes/slaskie/powiat-lubliniecki/lubliniec.md) |
| Lubowidz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/lubowidz/lubowidz.md) |
| Lubraniec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/lubraniec/lubraniec.md) |
| Lubsko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/lubsko/lubsko.md) |
| Lubycza Królewska | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/lubycza-krolewska/lubycza-krolewska.md) |
| Lwówek Śląski | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/dolnoslaskie/powiat-lwowecki/lwowek-slaski.md) |
| Łabiszyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/labiszyn/labiszyn.md) |
| Łagów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/lagow/lagow.md) |
| Łapy | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/lapy/lapy.md) |
| Łasin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/lasin/lasin.md) |
| Łask | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/powiat-laski/lask.md) |
| Łaszczów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/laszczow/laszczow.md) |
| Łęczna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-leczynski/leczna.md) |
| Łęczyca | 2026-10-30 | partial | residential, land | [source notes](../spikes/lodzkie/powiat-leczycki/leczyca.md) |
| Łęknica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/leknica/leknica.md) |
| Łobez | 2026-10-30 | partial | residential, land | [source notes](../spikes/zachodniopomorskie/powiat-lobeski/lobez.md) |
| Łochów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/lochow/lochow.md) |
| Łódź | 2026-10-21 | partial | residential, commercial, garage | [source notes](../spikes/lodzkie/lodz/lodz.md) |
| Łuków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-lukowski/lukow.md) |
| Maków Podhalański | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/makow-podhalanski/makow-podhalanski.md) |
| Malbork | 2026-10-21 | partial | residential | [source notes](../spikes/pomorskie/powiat-malborski/malbork.md) |
| Małkinia Górna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/malkinia-gorna/malkinia-gorna.md) |
| Małogoszcz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/malogoszcz/malogoszcz.md) |
| Miasteczko Śląskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/miasteczko-slaskie/miasteczko-slaskie.md) |
| Miastko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/miastko/miastko.md) |
| Michałowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/michalowo/michalowo.md) |
| Miechów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-miechowski/miechow.md) |
| Mieroszów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/mieroszow/mieroszow.md) |
| Mieszkowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/mieszkowice/mieszkowice.md) |
| Międzylesie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/miedzylesie/miedzylesie.md) |
| Międzyrzecz | 2026-10-21 | partial | residential | [source notes](../spikes/lubuskie/powiat-miedzyrzecki/miedzyrzecz.md) |
| Międzyzdroje | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/miedzyzdroje/miedzyzdroje.md) |
| Miękinia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/miekinia/miekinia.md) |
| Mikołajki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/mikolajki/mikolajki.md) |
| Mikołów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/powiat-mikolowski/mikolow.md) |
| Milicz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/powiat-milicki/milicz.md) |
| Miłomłyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/milomlyn/milomlyn.md) |
| Mirosławiec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/miroslawiec/miroslawiec.md) |
| Mława | 2026-10-30 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-mlawski/mlawa.md) |
| Modliborzyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/modliborzyce/modliborzyce.md) |
| Mogilno | 2026-10-21 | partial | residential, land | [source notes](../spikes/kujawsko-pomorskie/powiat-mogilenski/mogilno.md) |
| Morawica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/morawica/morawica.md) |
| Morąg | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/morag/morag.md) |
| Moryń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/moryn/moryn.md) |
| Mrągowo | 2026-10-21 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-mragowski/mragowo.md) |
| Mrocza | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/mrocza/mrocza.md) |
| Mszana Dolna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/mszana-dolna/mszana-dolna.md) |
| Muszyna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/muszyna/muszyna.md) |
| Mysłowice | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/slaskie/myslowice/myslowice.md) |
| Myszków | 2026-10-30 | partial | land, garage, commercial | [source notes](../spikes/slaskie/powiat-myszkowski/myszkow.md) |
| Myślenice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-myslenicki/myslenice.md) |
| Myślibórz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/powiat-mysliborski/mysliborz.md) |
| Nakło nad Notecią | 2026-10-21 | partial | residential, land | [source notes](../spikes/kujawsko-pomorskie/powiat-nakielski/naklo-nad-notecia.md) |
| Nałęczów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/naleczow/naleczow.md) |
| Namysłów | 2026-10-21 | partial | residential | [source notes](../spikes/opolskie/powiat-namyslowski/namyslow.md) |
| Nidzica | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-nidzicki/nidzica.md) |
| Niemcza | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/niemcza/niemcza.md) |
| Niemodlin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/niemodlin/niemodlin.md) |
| Niepołomice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/niepolomice/niepolomice.md) |
| Nowa Dęba | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/nowa-deba/nowa-deba.md) |
| Nowa Ruda | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/nowa-ruda/nowa-ruda.md) |
| Nowa Sól | 2026-10-21 | partial | residential | [source notes](../spikes/lubuskie/powiat-nowosolski/nowa-sol.md) |
| Nowe | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/nowe/nowe.md) |
| Nowe Miasteczko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/nowe-miasteczko/nowe-miasteczko.md) |
| Nowe Miasto | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/nowe-miasto/nowe-miasto.md) |
| Nowe Miasto Lubawskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/powiat-nowomiejski/nowe-miasto-lubawskie.md) |
| Nowe Warpno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/nowe-warpno/nowe-warpno.md) |
| Nowogard | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/nowogard/nowogard.md) |
| Nowogrodziec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/nowogrodziec/nowogrodziec.md) |
| Nowogród | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/nowogrod/nowogrod.md) |
| Nowy Dwór Gdański | 2026-10-30 | partial | residential, land | [source notes](../spikes/pomorskie/powiat-nowodworski/nowy-dwor-gdanski.md) |
| Nowy Dwór Mazowiecki | 2026-10-30 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-nowodworski/nowy-dwor-mazowiecki.md) |
| Nowy Sącz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/nowy-sacz/nowy-sacz.md) |
| Nowy Tomyśl | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-nowotomyski/nowy-tomysl.md) |
| Nowy Wiśnicz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/nowy-wisnicz/nowy-wisnicz.md) |
| Nysa | 2026-10-21 | partial | residential | [source notes](../spikes/opolskie/powiat-nyski/nysa.md) |
| Oborniki Śląskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/oborniki-slaskie/oborniki-slaskie.md) |
| Obrzycko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/obrzycko/obrzycko.md) |
| Okonek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/okonek/okonek.md) |
| Olecko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/powiat-olecki/olecko.md) |
| Olesno | 2026-10-21 | partial | residential | [source notes](../spikes/opolskie/powiat-oleski/olesno.md) |
| Oleśnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/olesnica-0257118/olesnica-0257118.md) |
| Oleśnica | 2026-10-30 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-olesnicki/olesnica.md) |
| Olkusz | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/malopolskie/powiat-olkuski/olkusz.md) |
| Olsztyn | 2026-10-21 | partial | residential | [source notes](../spikes/warminsko-mazurskie/olsztyn/olsztyn.md) |
| Olszyna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/olszyna/olszyna.md) |
| Oława | 2026-10-30 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-olawski/olawa.md) |
| Opole | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/opolskie/opole/opole.md) |
| Opole Lubelskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-opolski/opole-lubelskie.md) |
| Orneta | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/orneta/orneta.md) |
| Osieck | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/osieck/osieck.md) |
| Osieczna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/osieczna/osieczna.md) |
| Osiek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/osiek/osiek.md) |
| Osjaków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/osjakow/osjakow.md) |
| Ostrołęka | 2026-10-21 | partial | residential | [source notes](../spikes/mazowieckie/ostroleka/ostroleka.md) |
| Ostroróg | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/ostrorog/ostrorog.md) |
| Ostrowiec Świętokrzyski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/powiat-ostrowiecki/ostrowiec-swietokrzyski.md) |
| Ostrów Lubelski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/ostrow-lubelski/ostrow-lubelski.md) |
| Ostrów Wielkopolski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-ostrowski/ostrow-wielkopolski.md) |
| Ostrzeszów | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/wielkopolskie/powiat-ostrzeszowski/ostrzeszow.md) |
| Oświęcim | 2026-10-21 | partial | residential | [source notes](../spikes/malopolskie/powiat-oswiecimski/oswiecim.md) |
| Otmuchów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/otmuchow/otmuchow.md) |
| Otwock | 2026-10-21 | partial | residential | [source notes](../spikes/mazowieckie/powiat-otwocki/otwock.md) |
| Otyń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/otyn/otyn.md) |
| Ożarów Mazowiecki | 2026-10-21 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-warszawski-zachodni/ozarow-mazowiecki.md) |
| Pabianice | 2026-10-21 | partial | residential | [source notes](../spikes/lodzkie/powiat-pabianicki/pabianice.md) |
| Pajęczno | 2026-10-21 | partial | residential, land | [source notes](../spikes/lodzkie/powiat-pajeczanski/pajeczno.md) |
| Parczew | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-parczewski/parczew.md) |
| Pasym | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/pasym/pasym.md) |
| Pelplin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/pelplin/pelplin.md) |
| Pełczyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/pelczyce/pelczyce.md) |
| Piaseczno | 2026-10-30 | partial | residential, land, garage | [source notes](../spikes/mazowieckie/powiat-piaseczynski/piaseczno.md) |
| Piaski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/piaski/piaski.md) |
| Piekary Śląskie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/piekary-slaskie/piekary-slaskie.md) |
| Piekoszów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/piekoszow/piekoszow.md) |
| Pieniężno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/pieniezno/pieniezno.md) |
| Piła | 2026-10-21 | partial | residential | [source notes](../spikes/wielkopolskie/powiat-pilski/pila.md) |
| Piława Górna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/pilawa-gorna/pilawa-gorna.md) |
| Pisz | 2026-10-21 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-piski/pisz.md) |
| Piszczac | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/piszczac/piszczac.md) |
| Piwniczna-Zdrój | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/piwniczna-zdroj/piwniczna-zdroj.md) |
| Pleszew | 2026-10-21 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-pleszewski/pleszew.md) |
| Płock | 2026-10-21 | partial | residential, building | [source notes](../spikes/mazowieckie/plock/plock.md) |
| Płońsk | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/mazowieckie/powiat-plonski/plonsk.md) |
| Płoty | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/ploty/ploty.md) |
| Pobiedziska | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/pobiedziska/pobiedziska.md) |
| Poddębice | 2026-10-21 | partial | land, residential | [source notes](../spikes/lodzkie/powiat-poddebicki/poddebice.md) |
| Police | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/powiat-policki/police.md) |
| Polkowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/powiat-polkowicki/polkowice.md) |
| Poniatowa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/poniatowa/poniatowa.md) |
| Poznań | 2026-10-21 | partial | land | [source notes](../spikes/wielkopolskie/poznan/poznan.md) |
| Prabuty | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/prabuty/prabuty.md) |
| Praszka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/praszka/praszka.md) |
| Proszowice | 2026-10-21 | partial | residential, land | [source notes](../spikes/malopolskie/powiat-proszowicki/proszowice.md) |
| Prószków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/proszkow/proszkow.md) |
| Prudnik | 2026-10-30 | partial | residential, land | [source notes](../spikes/opolskie/powiat-prudnicki/prudnik.md) |
| Prusice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/prusice/prusice.md) |
| Pruszcz Gdański | 2026-10-30 | partial | land, commercial | [source notes](../spikes/pomorskie/powiat-gdanski/pruszcz-gdanski.md) |
| Pruszków | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-pruszkowski/pruszkow.md) |
| Przedbórz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/przedborz/przedborz.md) |
| Przedecz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/przedecz/przedecz.md) |
| Przemyśl | 2026-10-21 | partial | residential | [source notes](../spikes/podkarpackie/przemysl/przemysl.md) |
| Przysucha | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-przysuski/przysucha.md) |
| Przytyk | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/przytyk/przytyk.md) |
| Pszczyna | 2026-10-21 | partial | residential, land | [source notes](../spikes/slaskie/powiat-pszczynski/pszczyna.md) |
| Puck | 2026-10-30 | partial | residential, land | [source notes](../spikes/pomorskie/powiat-pucki/puck.md) |
| Puławy | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-pulawski/pulawy.md) |
| Pułtusk | 2026-10-21 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-pultuski/pultusk.md) |
| Puszczykowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/puszczykowo/puszczykowo.md) |
| Pyrzyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/powiat-pyrzycki/pyrzyce.md) |
| Pyskowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/pyskowice/pyskowice.md) |
| Racibórz | 2026-10-21 | partial | residential, land | [source notes](../spikes/slaskie/powiat-raciborski/raciborz.md) |
| Radków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/radkow/radkow.md) |
| Radlin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/radlin/radlin.md) |
| Radłów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/radlow/radlow.md) |
| Radomsko | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/powiat-radomszczanski/radomsko.md) |
| Radoszyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/radoszyce/radoszyce.md) |
| Radymno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/radymno/radymno.md) |
| Radzionków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/radzionkow/radzionkow.md) |
| Radzymin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/radzymin/radzymin.md) |
| Radzyń Podlaski | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-radzynski/radzyn-podlaski.md) |
| Rajgród | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/rajgrod/rajgrod.md) |
| Rakoniewice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/rakoniewice/rakoniewice.md) |
| Raszków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/raszkow/raszkow.md) |
| Rawa Mazowiecka | 2026-10-21 | partial | building, land, residential | [source notes](../spikes/lodzkie/powiat-rawski/rawa-mazowiecka.md) |
| Rawicz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-rawicki/rawicz.md) |
| Recz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/recz/recz.md) |
| Reda | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/reda/reda.md) |
| Rejowiec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/rejowiec/rejowiec.md) |
| Rejowiec Fabryczny | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/rejowiec-fabryczny/rejowiec-fabryczny.md) |
| Ropczyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/powiat-ropczycko-sedziszowski/ropczyce.md) |
| Rozprza | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/rozprza/rozprza.md) |
| Rumia | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/rumia/rumia.md) |
| Rybnik | 2026-10-21 | partial | residential, land | [source notes](../spikes/slaskie/rybnik/rybnik.md) |
| Rychtal | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/rychtal/rychtal.md) |
| Rydułtowy | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/rydultowy/rydultowy.md) |
| Ryglice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/ryglice/ryglice.md) |
| Ryki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-rycki/ryki.md) |
| Rypin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/powiat-rypinski/rypin.md) |
| Rzepin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/rzepin/rzepin.md) |
| Rzeszów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/rzeszow/rzeszow.md) |
| Rzgów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/rzgow/rzgow.md) |
| Sandomierz | 2026-10-21 | partial | residential, garage, land, building | [source notes](../spikes/swietokrzyskie/powiat-sandomierski/sandomierz.md) |
| Sejny | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/powiat-sejnenski/sejny.md) |
| Sędziszów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/sedziszow/sedziszow.md) |
| Sępólno Krajeńskie | 2026-10-21 | partial | residential, commercial | [source notes](../spikes/kujawsko-pomorskie/powiat-sepolenski/sepolno-krajenskie.md) |
| Sianów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/sianow/sianow.md) |
| Siedlce | 2026-10-21 | partial | residential, building | [source notes](../spikes/mazowieckie/siedlce/siedlce.md) |
| Siedliszcze | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/siedliszcze/siedliszcze.md) |
| Siemiatycze | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/powiat-siemiatycki/siemiatycze.md) |
| Sienno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/sienno/sienno.md) |
| Sieradz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/powiat-sieradzki/sieradz.md) |
| Sieraków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/sierakow/sierakow.md) |
| Sierpc | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-sierpecki/sierpc.md) |
| Skała | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/skala/skala.md) |
| Skarszewy | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/skarszewy/skarszewy.md) |
| Skarżysko-Kamienna | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/swietokrzyskie/powiat-skarzyski/skarzysko-kamienna.md) |
| Skawina | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/skawina/skawina.md) |
| Skępe | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/skepe/skepe.md) |
| Skórcz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/skorcz/skorcz.md) |
| Skwierzyna | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/skwierzyna/skwierzyna.md) |
| Sława | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/slawa/slawa.md) |
| Sławno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/powiat-slawienski/slawno.md) |
| Słomniki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/slomniki/slomniki.md) |
| Słubice | 2026-10-21 | partial | residential | [source notes](../spikes/lubuskie/powiat-slubicki/slubice.md) |
| Słupca | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-slupecki/slupca.md) |
| Słupsk | 2026-10-21 | partial | residential | [source notes](../spikes/pomorskie/slupsk/slupsk.md) |
| Sobków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/sobkow/sobkow.md) |
| Sobótka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/sobotka/sobotka.md) |
| Sochaczew | 2026-10-30 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-sochaczewski/sochaczew.md) |
| Sokołów Podlaski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-sokolowski/sokolow-podlaski.md) |
| Sokółka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/powiat-sokolski/sokolka.md) |
| Sopot | 2026-10-21 | partial | commercial, garage, residential | [source notes](../spikes/pomorskie/sopot/sopot.md) |
| Sosnowiec | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/slaskie/sosnowiec/sosnowiec.md) |
| Starachowice | 2026-10-30 | partial | residential, land | [source notes](../spikes/swietokrzyskie/powiat-starachowicki/starachowice.md) |
| Stargard | 2026-10-21 | partial | residential, land | [source notes](../spikes/zachodniopomorskie/powiat-stargardzki/stargard.md) |
| Starogard Gdański | 2026-10-21 | partial | residential, land, garage | [source notes](../spikes/pomorskie/powiat-starogardzki/starogard-gdanski.md) |
| Staroźreby | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/starozreby/starozreby.md) |
| Stary Sącz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/stary-sacz/stary-sacz.md) |
| Staszów | 2026-10-30 | partial | residential, land | [source notes](../spikes/swietokrzyskie/powiat-staszowski/staszow.md) |
| Stąporków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/staporkow/staporkow.md) |
| Stepnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/stepnica/stepnica.md) |
| Stoczek Łukowski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/stoczek-lukowski/stoczek-lukowski.md) |
| Strumień | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/strumien/strumien.md) |
| Stryków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/strykow/strykow.md) |
| Strzelce Krajeńskie | 2026-10-21 | partial | land | [source notes](../spikes/lubuskie/powiat-strzelecko-drezdenecki/strzelce-krajenskie.md) |
| Strzelce Opolskie | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/opolskie/powiat-strzelecki/strzelce-opolskie.md) |
| Strzeleczki | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/strzeleczki/strzeleczki.md) |
| Strzelin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/powiat-strzelinski/strzelin.md) |
| Sucha Beskidzka | 2026-10-21 | partial | residential, land | [source notes](../spikes/malopolskie/powiat-suski/sucha-beskidzka.md) |
| Suchań | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/suchan/suchan.md) |
| Suchowola | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/suchowola/suchowola.md) |
| Sulechów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/sulechow/sulechow.md) |
| Sulejów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/sulejow/sulejow.md) |
| Sulęcin | 2026-10-21 | partial | residential, land | [source notes](../spikes/lubuskie/powiat-sulecinski/sulecin.md) |
| Sulmierzyce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/sulmierzyce/sulmierzyce.md) |
| Sułkowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/sulkowice/sulkowice.md) |
| Supraśl | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/suprasl/suprasl.md) |
| Suraż | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/suraz/suraz.md) |
| Susz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/susz/susz.md) |
| Szadek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/szadek/szadek.md) |
| Szamocin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/szamocin/szamocin.md) |
| Szamotuły | 2026-10-30 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-szamotulski/szamotuly.md) |
| Szczawnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/szczawnica/szczawnica.md) |
| Szczecin | 2026-10-21 | partial | residential | [source notes](../spikes/zachodniopomorskie/szczecin/szczecin.md) |
| Szczecinek | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/zachodniopomorskie/powiat-szczecinecki/szczecinek.md) |
| Szczekociny | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/szczekociny/szczekociny.md) |
| Szczucin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/szczucin/szczucin.md) |
| Szczuczyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/szczuczyn/szczuczyn.md) |
| Szczytno | 2026-10-30 | partial | residential, land | [source notes](../spikes/warminsko-mazurskie/powiat-szczycienski/szczytno.md) |
| Szepietowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/szepietowo/szepietowo.md) |
| Szprotawa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/szprotawa/szprotawa.md) |
| Sztum | 2026-10-21 | partial | residential, land | [source notes](../spikes/pomorskie/powiat-sztumski/sztum.md) |
| Szubin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/kujawsko-pomorskie/szubin/szubin.md) |
| Szydłowiec | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/powiat-szydlowiecki/szydlowiec.md) |
| Śmigiel | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/smigiel/smigiel.md) |
| Śrem | 2026-10-30 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-sremski/srem.md) |
| Środa Śląska | 2026-10-30 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-sredzki/sroda-slaska.md) |
| Środa Wielkopolska | 2026-10-21 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-sredzki/sroda-wielkopolska.md) |
| Świątniki Górne | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/swiatniki-gorne/swiatniki-gorne.md) |
| Świdnica | 2026-10-21 | partial | residential, commercial | [source notes](../spikes/dolnoslaskie/powiat-swidnicki/swidnica.md) |
| Świdnik | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-swidnicki/swidnik.md) |
| Świebodzin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/powiat-swiebodzinski/swiebodzin.md) |
| Świecie | 2026-10-30 | partial | residential, land | [source notes](../spikes/kujawsko-pomorskie/powiat-swiecki/swiecie.md) |
| Świeradów-Zdrój | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/swieradow-zdroj/swieradow-zdroj.md) |
| Świętochłowice | 2026-10-21 | partial | residential, commercial, land, building | [source notes](../spikes/slaskie/swietochlowice/swietochlowice.md) |
| Świnoujście | 2026-10-21 | partial | residential, commercial | [source notes](../spikes/zachodniopomorskie/swinoujscie/swinoujscie.md) |
| Tarnobrzeg | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/tarnobrzeg/tarnobrzeg.md) |
| Tarnogród | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/tarnogrod/tarnogrod.md) |
| Tarnowskie Góry | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/slaskie/powiat-tarnogorski/tarnowskie-gory.md) |
| Tarnów | 2026-10-30 | partial | residential, land | [source notes](../spikes/malopolskie/tarnow/tarnow.md) |
| Tczew | 2026-10-21 | partial | residential | [source notes](../spikes/pomorskie/powiat-tczewski/tczew.md) |
| Terespol | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/terespol/terespol.md) |
| Tomaszów Lubelski | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-tomaszowski/tomaszow-lubelski.md) |
| Tomaszów Mazowiecki | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/lodzkie/powiat-tomaszowski/tomaszow-mazowiecki.md) |
| Toruń | 2026-10-21 | partial | residential | [source notes](../spikes/kujawsko-pomorskie/torun/torun.md) |
| Torzym | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/torzym/torzym.md) |
| Toszek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/toszek/toszek.md) |
| Trzcianka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/trzcianka/trzcianka.md) |
| Trzciel | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/trzciel/trzciel.md) |
| Trzcińsko-Zdrój | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/trzcinsko-zdroj/trzcinsko-zdroj.md) |
| Trzebinia | 2026-10-21 | partial | residential, building | [source notes](../spikes/malopolskie/powiat-chrzanowski/trzebinia.md) |
| Trzebnica | 2026-10-19 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-trzebnicki/trzebnica.md) |
| Tuchola | 2026-10-30 | partial | residential, land | [source notes](../spikes/kujawsko-pomorskie/powiat-tucholski/tuchola.md) |
| Tuchów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/tuchow/tuchow.md) |
| Tuczno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/tuczno/tuczno.md) |
| Tuliszków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/tuliszkow/tuliszkow.md) |
| Tułowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/tulowice/tulowice.md) |
| Turek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-turecki/turek.md) |
| Turobin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/turobin/turobin.md) |
| Twardogóra | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/twardogora/twardogora.md) |
| Tychowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/tychowo/tychowo.md) |
| Tykocin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/tykocin/tykocin.md) |
| Tyszowce | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/tyszowce/tyszowce.md) |
| Ujazd | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/ujazd-0554721/ujazd-0554721.md) |
| Ujazd | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/ujazd-0965967/ujazd-0965967.md) |
| Ujście | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/ujscie/ujscie.md) |
| Ulanów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/ulanow/ulanow.md) |
| Urzędów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/urzedow/urzedow.md) |
| Ustka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/ustka/ustka.md) |
| Wadowice | 2026-10-30 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-wadowicki/wadowice.md) |
| Wałbrzych | 2026-10-21 | partial | residential | [source notes](../spikes/dolnoslaskie/walbrzych/walbrzych.md) |
| Wałcz | 2026-10-30 | partial | residential, land | [source notes](../spikes/zachodniopomorskie/powiat-walecki/walcz.md) |
| Warszawa | 2026-10-21 | partial | residential | [source notes](../spikes/mazowieckie/warszawa/warszawa.md) |
| Warta | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/warta/warta.md) |
| Wasilków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/wasilkow/wasilkow.md) |
| Wąbrzeźno | 2026-10-21 | partial | residential, land | [source notes](../spikes/kujawsko-pomorskie/powiat-wabrzeski/wabrzezno.md) |
| Wągrowiec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-wagrowiecki/wagrowiec.md) |
| Wejherowo | 2026-10-21 | partial | residential | [source notes](../spikes/pomorskie/powiat-wejherowski/wejherowo.md) |
| Węgorzewo | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/warminsko-mazurskie/powiat-wegorzewski/wegorzewo.md) |
| Węgorzyno | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/wegorzyno/wegorzyno.md) |
| Węgrów | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/mazowieckie/powiat-wegrowski/wegrow.md) |
| Wieleń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/wielen/wielen.md) |
| Wielichowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/wielichowo/wielichowo.md) |
| Wieliczka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/powiat-wielicki/wieliczka.md) |
| Wieluń | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/powiat-wielunski/wielun.md) |
| Wieruszów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/powiat-wieruszowski/wieruszow.md) |
| Wiślica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/wislica/wislica.md) |
| Witnica | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/witnica/witnica.md) |
| Władysławowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/wladyslawowo/wladyslawowo.md) |
| Włocławek | 2026-10-21 | partial | residential, building | [source notes](../spikes/kujawsko-pomorskie/wloclawek/wloclawek.md) |
| Włodawa | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/powiat-wlodawski/wlodawa.md) |
| Włodowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/wlodowice/wlodowice.md) |
| Wodzisław | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/wodzislaw/wodzislaw.md) |
| Wodzisław Śląski | 2026-10-30 | partial | residential, land | [source notes](../spikes/slaskie/powiat-wodzislawski/wodzislaw-slaski.md) |
| Wojnicz | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/wojnicz/wojnicz.md) |
| Wolbrom | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/wolbrom/wolbrom.md) |
| Wolin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/wolin/wolin.md) |
| Wolsztyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/powiat-wolsztynski/wolsztyn.md) |
| Wołomin | 2026-10-30 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-wolominski/wolomin.md) |
| Wołów | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/dolnoslaskie/powiat-wolowski/wolow.md) |
| Wrocław | 2026-10-21 | partial | residential | [source notes](../spikes/dolnoslaskie/wroclaw/wroclaw.md) |
| Września | 2026-10-30 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-wrzesinski/wrzesnia.md) |
| Wschowa | 2026-10-19 | partial |  | [source notes](../spikes/lubuskie/powiat-wschowski/wschowa.md) |
| Wyrzysk | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/wyrzysk/wyrzysk.md) |
| Wysokie Mazowieckie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/powiat-wysokomazowiecki/wysokie-mazowieckie.md) |
| Zabłudów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/zabludow/zabludow.md) |
| Zabrze | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/slaskie/zabrze/zabrze.md) |
| Zakliczyn | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/zakliczyn/zakliczyn.md) |
| Zaklików | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podkarpackie/zaklikow/zaklikow.md) |
| Zakopane | 2026-10-30 | partial | residential, land | [source notes](../spikes/malopolskie/powiat-tatrzanski/zakopane.md) |
| Zalewo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/warminsko-mazurskie/zalewo/zalewo.md) |
| Zambrów | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/podlaskie/powiat-zambrowski/zambrow.md) |
| Zamość | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubelskie/zamosc/zamosc.md) |
| Zator | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/malopolskie/zator/zator.md) |
| Zawadzkie | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/zawadzkie/zawadzkie.md) |
| Zawichost | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/swietokrzyskie/zawichost/zawichost.md) |
| Ząbkowice Śląskie | 2026-10-19 | partial | land, garage | [source notes](../spikes/dolnoslaskie/powiat-zabkowicki/zabkowice-slaskie.md) |
| Zbąszynek | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/zbaszynek/zbaszynek.md) |
| Zduńska Wola | 2026-10-21 | partial | residential, land, building | [source notes](../spikes/lodzkie/powiat-zdunskowolski/zdunska-wola.md) |
| Zdzieszowice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/opolskie/zdzieszowice/zdzieszowice.md) |
| Zgierz | 2026-10-30 | partial | residential, land | [source notes](../spikes/lodzkie/powiat-zgierski/zgierz.md) |
| Zgorzelec | 2026-10-20 | partial | land, building | [source notes](../spikes/dolnoslaskie/powiat-zgorzelecki/zgorzelec.md) |
| Zielona Góra | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lubuskie/zielona-gora/zielona-gora.md) |
| Zielonka | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/mazowieckie/zielonka/zielonka.md) |
| Ziębice | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/ziebice/ziebice.md) |
| Złocieniec | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/zachodniopomorskie/zlocieniec/zlocieniec.md) |
| Złotoryja | 2026-10-21 | partial | residential, land | [source notes](../spikes/dolnoslaskie/powiat-zlotoryjski/zlotoryja.md) |
| Złotów | 2026-10-30 | partial | residential, land | [source notes](../spikes/wielkopolskie/powiat-zlotowski/zlotow.md) |
| Złoty Stok | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/dolnoslaskie/zloty-stok/zloty-stok.md) |
| Żagań | 2026-10-19 | partial |  | [source notes](../spikes/lubuskie/powiat-zaganski/zagan.md) |
| Żary | 2026-10-30 | partial | residential, land | [source notes](../spikes/lubuskie/powiat-zarski/zary.md) |
| Żerków | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/wielkopolskie/zerkow/zerkow.md) |
| Żnin | 2026-10-21 | partial | residential, commercial, land | [source notes](../spikes/kujawsko-pomorskie/powiat-zninski/znin.md) |
| Żory | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/slaskie/zory/zory.md) |
| Żukowo | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/pomorskie/zukowo/zukowo.md) |
| Żychlin | 2026-10-31 | partial | residential, land, commercial | [source notes](../spikes/lodzkie/zychlin/zychlin.md) |
| Żyrardów | 2026-10-30 | partial | residential, land | [source notes](../spikes/mazowieckie/powiat-zyrardowski/zyrardow.md) |
| Żywiec | 2026-10-30 | partial | land, commercial, building | [source notes](../spikes/slaskie/powiat-zywiecki/zywiec.md) |

## Built adapters (619)

Aleksandrów Łódzki, Alwernia, Andrychów, Annopol, Augustów, Babimost, Baborów, Barcin, Barczewo, Bartoszyce, Bełchatów, Bełżyce, Będzin, Biała Piska, Biała Podlaska, Białaczów, Białystok, Biecz, Bielsk Podlaski, Bielsko-Biała, Bierutów, Biłgoraj, Bircza, Biskupiec, Bisztynek, Błaszki, Bobowa, Bobrowniki, Bochnia, Bogatynia, Bogoria, Bojanowo, Bolesławiec, Bolesławiec, Bolków, Branice, Braniewo, Brańsk, Brody, Brok, Brusy, Brwinów, Brzeg, Brzeg Dolny, Brzesko, Brzeszcze, Brześć Kujawski, Budzyń, Bukowno, Busko-Zdrój, Bychawa, Byczyna, Bydgoszcz, Bystrzyca Kłodzka, Bytom, Bytów, Cedynia, Chełm, Chełmek, Chełmno, Chęciny, Chmielnik, Chodzież, Chojna, Chojnice, Choroszcz, Choszczno, Chrzanów, Ciechanowiec, Ciechocinek, Cieszanów, Cieszyn, Ciężkowice, Cybinka, Czarna Białostocka, Czarny Dunajec, Czchów, Czechowice-Dziedzice, Czemierniki, Czempiń, Czerniejewo, Czerwieńsk, Częstochowa, Człopa, Człuchów, Ćmielów, Dąbie, Dąbrowa Białostocka, Dąbrowa Górnicza, Dąbrowa Tarnowska, Dębno, Dobiegniew, Dobrodzień, Dolsk, Drawno, Drawsko Pomorskie, Drohiczyn, Dubiecko, Działdowo, Działoszyn, Dzierżoniów, Dziwnów, Elbląg, Ełk, Frampol, Gdańsk, Giżycko, Gliwice, Głogów, Głogówek, Głowaczów, Głowno, Głubczyce, Głuchołazy, Głuszyca, Gniew, Gniezno, Gogolin, Golczewo, Goleniów, Golina, Golub-Dobrzyń, Goniądz, Goraj, Gorlice, Gorzów Wielkopolski, Gostynin, Gostyń, Gościno, Góra, Grodków, Grodzisk Mazowiecki, Grodzisk Wielkopolski, Grudziądz, Grybów, Gryfice, Gryfino, Gubin, Hajnówka, Halinów, Hrubieszów, Iława, Iłża, Inowrocław, Janów Podlaski, Jarocin, Jarosław, Jasień, Jastrowie, Jastrzębie-Zdrój, Jaworzno, Jedlicze, Jelcz-Laskowice, Jelenia Góra, Jędrzejów, Jordanów, Józefów, Jutrosin, Kalety, Kalisz, Kalwaria Zebrzydowska, Kamienna Góra, Kamień Krajeński, Kamionka, Kańczuga, Karczew, Kargowa, Karpacz, Kartuzy, Katowice, Kazimierz Dolny, Kąty Wrocławskie, Kcynia, Kędzierzyn-Koźle, Kępno, Kętrzyn, Kęty, Kielce, Kiernozia, Kietrz, Kikół, Kleszczele, Kluczbork, Kłecko, Kłobuck, Kłodawa, Kłodzko, Knyszyn, Kobylnica, Kock, Kolbuszowa, Kolno, Kolonowskie, Kołaczyce, Koło, Kołobrzeg, Konin, Konstancin-Jeziorna, Końskie, Końskowola, Koprzywnica, Korfantów, Koronowo, Kostrzyn, Koszalin, Koszyce, Kościan, Kościerzyna, Kowal, Kowalewo Pomorskie, Kowary, Kozienice, Koźminek, Kożuchów, Kórnik, Krajenka, Kraków, Krapkowice, Krasnobród, Krasnystaw, Kraśnik, Krobia, Krosno Odrzańskie, Krotoszyn, Krynica-Zdrój, Krynki, Krzepice, Krzeszowice, Krzywiń, Książ Wielki, Kunów, Kwidzyn, Legionowo, Legnica, Leszno, Leśnica, Lewin Brzeski, Lębork, Libiąż, Lidzbark Warmiński, Limanowa, Lipiany, Lipsk, Lipsko, Lubań, Lubartów, Lubawa, Lubień Kujawski, Lubin, Lubliniec, Lubowidz, Lubraniec, Lubsko, Lubycza Królewska, Lwówek Śląski, Łabiszyn, Łagów, Łapy, Łasin, Łask, Łaszczów, Łęczna, Łęczyca, Łęknica, Łobez, Łochów, Łódź, Łuków, Maków Podhalański, Malbork, Małkinia Górna, Małogoszcz, Miasteczko Śląskie, Miastko, Michałowo, Miechów, Mieroszów, Mieszkowice, Międzylesie, Międzyrzecz, Międzyzdroje, Miękinia, Mikołajki, Mikołów, Milicz, Miłomłyn, Mirosławiec, Mława, Modliborzyce, Mogilno, Morawica, Morąg, Moryń, Mrągowo, Mrocza, Mszana Dolna, Muszyna, Mysłowice, Myszków, Myślenice, Myślibórz, Nakło nad Notecią, Nałęczów, Namysłów, Nidzica, Niemcza, Niemodlin, Niepołomice, Nowa Dęba, Nowa Ruda, Nowa Sól, Nowe, Nowe Miasteczko, Nowe Miasto, Nowe Miasto Lubawskie, Nowe Warpno, Nowogard, Nowogrodziec, Nowogród, Nowy Dwór Gdański, Nowy Dwór Mazowiecki, Nowy Sącz, Nowy Tomyśl, Nowy Wiśnicz, Nysa, Oborniki Śląskie, Obrzycko, Okonek, Olecko, Olesno, Oleśnica, Oleśnica, Olkusz, Olsztyn, Olszyna, Oława, Opole, Opole Lubelskie, Orneta, Osieck, Osieczna, Osiek, Osjaków, Ostrołęka, Ostroróg, Ostrowiec Świętokrzyski, Ostrów Lubelski, Ostrów Wielkopolski, Ostrzeszów, Oświęcim, Otmuchów, Otwock, Otyń, Ożarów Mazowiecki, Pabianice, Pajęczno, Parczew, Pasym, Pelplin, Pełczyce, Piaseczno, Piaski, Piekary Śląskie, Piekoszów, Pieniężno, Piła, Piława Górna, Pisz, Piszczac, Piwniczna-Zdrój, Pleszew, Płock, Płońsk, Płoty, Pobiedziska, Poddębice, Police, Polkowice, Poniatowa, Poznań, Prabuty, Praszka, Proszowice, Prószków, Prudnik, Prusice, Pruszcz Gdański, Pruszków, Przedbórz, Przedecz, Przemyśl, Przysucha, Przytyk, Pszczyna, Puck, Puławy, Pułtusk, Puszczykowo, Pyrzyce, Pyskowice, Racibórz, Radków, Radlin, Radłów, Radomsko, Radoszyce, Radymno, Radzionków, Radzymin, Radzyń Podlaski, Rajgród, Rakoniewice, Raszków, Rawa Mazowiecka, Rawicz, Recz, Reda, Rejowiec, Rejowiec Fabryczny, Ropczyce, Rozprza, Ruda Śląska, Rumia, Rybnik, Rychtal, Rydułtowy, Ryglice, Ryki, Rypin, Rzepin, Rzeszów, Rzgów, Sandomierz, Sejny, Sędziszów, Sępólno Krajeńskie, Sianów, Siedlce, Siedliszcze, Siemiatycze, Sienno, Sieradz, Sieraków, Sierpc, Skała, Skarszewy, Skarżysko-Kamienna, Skawina, Skępe, Skórcz, Skwierzyna, Sława, Sławno, Słomniki, Słubice, Słupca, Słupsk, Sobków, Sobótka, Sochaczew, Sokołów Podlaski, Sokółka, Sopot, Sosnowiec, Starachowice, Stargard, Starogard Gdański, Staroźreby, Stary Sącz, Staszów, Stąporków, Stepnica, Stoczek Łukowski, Strumień, Stryków, Strzelce Krajeńskie, Strzelce Opolskie, Strzeleczki, Strzelin, Sucha Beskidzka, Suchań, Suchowola, Sulechów, Sulejów, Sulęcin, Sulmierzyce, Sułkowice, Supraśl, Suraż, Susz, Szadek, Szamocin, Szamotuły, Szczawnica, Szczecin, Szczecinek, Szczekociny, Szczucin, Szczuczyn, Szczytno, Szepietowo, Szprotawa, Sztum, Szubin, Szydłowiec, Śmigiel, Śrem, Środa Śląska, Środa Wielkopolska, Świątniki Górne, Świdnica, Świdnik, Świebodzin, Świecie, Świeradów-Zdrój, Świętochłowice, Świnoujście, Tarnobrzeg, Tarnogród, Tarnowskie Góry, Tarnów, Tczew, Terespol, Tomaszów Lubelski, Tomaszów Mazowiecki, Toruń, Torzym, Toszek, Trzcianka, Trzciel, Trzcińsko-Zdrój, Trzebinia, Trzebnica, Tuchola, Tuchów, Tuczno, Tuliszków, Tułowice, Turek, Turobin, Twardogóra, Tychowo, Tykocin, Tyszowce, Ujazd, Ujazd, Ujście, Ulanów, Urzędów, Ustka, Wadowice, Wałbrzych, Wałcz, Warszawa, Warta, Wasilków, Wąbrzeźno, Wągrowiec, Wejherowo, Węgorzewo, Węgorzyno, Węgrów, Wieleń, Wielichowo, Wieliczka, Wieluń, Wieruszów, Wiślica, Witnica, Władysławowo, Włocławek, Włodawa, Włodowice, Wodzisław, Wodzisław Śląski, Wojnicz, Wolbrom, Wolin, Wolsztyn, Wołomin, Wołów, Wrocław, Września, Wschowa, Wyrzysk, Wysokie Mazowieckie, Zabłudów, Zabrze, Zakliczyn, Zaklików, Zakopane, Zalewo, Zambrów, Zamość, Zator, Zawadzkie, Zawichost, Ząbkowice Śląskie, Zbąszynek, Zduńska Wola, Zdzieszowice, Zgierz, Zgorzelec, Zielona Góra, Zielonka, Ziębice, Złocieniec, Złotoryja, Złotów, Złoty Stok, Żagań, Żary, Żerków, Żnin, Żory, Żukowo, Żychlin, Żyrardów, Żywiec.

## BUILD-ready queue (0, by effort)

.

## Unresearched official cities (0)

These are inventory entries, not claims of monitoring or source absence. Research is queued only through an accepted batch.

## Ledger by voivodeship

### Dolnośląskie (93)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Bardo | 0983801 | powiat ząbkowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bielawa | 0983818 | powiat dzierżoniowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bierutów | 0987035 | powiat oleśnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bogatynia | 0935908 | powiat zgorzelecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Boguszów-Gorce | 0983824 | powiat wałbrzyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bolesławiec | 0935989 | powiat boleslawiecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bolków | 0935995 | powiat jaworski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Brzeg Dolny | 0987064 | powiat wołowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bystrzyca Kłodzka | 0983899 | powiat kłodzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chocianów | 0954060 | powiat polkowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Chojnów | 0954076 | powiat legnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Duszniki-Zdrój | 0983913 | powiat kłodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dzierżoniów | 0983988 | powiat dzierżoniowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Głogów | 0954082 | powiat głogowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Głuszyca | 0984002 | powiat wałbrzyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Góra | 0954449 | powiat górowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gryfów Śląski | 0936003 | powiat lwówecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jawor | 0954120 | powiat jaworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jaworzyna Śląska | 0984019 | powiat świdnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jedlina-Zdrój | 0984025 | powiat wałbrzyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jelcz-Laskowice | 0987118 | powiat oławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Jelenia Góra | 0935802 | Jelenia Góra (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kamieniec Ząbkowicki | 0852631 | powiat ząbkowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kamienna Góra | 0936026 | powiat kamiennogórski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Karpacz | 0936032 | powiat karkonoski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kąty Wrocławskie | 0987124 | powiat wrocławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kłodzko | 0984077 | powiat klodzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kowary | 0936078 | powiat karkonoski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kudowa-Zdrój | 0984120 | powiat kłodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lądek-Zdrój | 0984203 | powiat kłodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Legnica | 0954047 | Legnica (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Leśna | 0936121 | powiat lubański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lubań | 0936150 | powiat lubański | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubawka | 0936180 | powiat kamiennogórski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lubin | 0954142 | powiat lubinski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubomierz | 0936210 | powiat lwówecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lwówek Śląski | 0936227 | powiat lwówecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Mieroszów | 0984210 | powiat wałbrzyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Międzybórz | 0937037 | powiat oleśnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Międzylesie | 0984226 | powiat kłodzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Miękinia | 0877424 | powiat średzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Milicz | 0987130 | powiat milicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mirsk | 0936233 | powiat lwówecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Niemcza | 0984232 | powiat dzierżoniowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowa Ruda | 0984278 | powiat kłodzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowogrodziec | 0936262 | powiat bolesławiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Oborniki Śląskie | 0987182 | powiat trzebnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Oleśnica | 0987213 | powiat olesnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Olszyna | 0191684 | powiat lubański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Oława | 0987259 | powiat oławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Piechowice | 0936285 | powiat karkonoski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pieńsk | 0936351 | powiat zgorzelecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pieszyce | 0984396 | powiat dzierżoniowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Piława Górna | 0984491 | powiat dzierżoniowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Polanica-Zdrój | 0984522 | powiat kłodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Polkowice | 0954165 | powiat polkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Prochowice | 0954171 | powiat legnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Prusice | 0879914 | powiat trzebnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Przemków | 0954194 | powiat polkowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Radków | 0984539 | powiat kłodzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Siechnice | 0881160 | powiat wrocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sobótka | 0987294 | powiat wrocławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Stronie Śląskie | 0984545 | powiat kłodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Strzegom | 0984551 | powiat świdnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Strzelin | 0987331 | powiat strzeliński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Syców | 0937379 | powiat oleśnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szczawno-Zdrój | 0984574 | powiat wałbrzyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szczytna | 0984597 | powiat kłodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szklarska Poręba | 0936368 | powiat karkonoski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ścinawa | 0954202 | powiat lubiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Środa Śląska | 0987348 | powiat średzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Świdnica | 0984657 | powiat swidnicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Świebodzice | 0984663 | powiat świdnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Świeradów-Zdrój | 0936457 | powiat lubański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Świerzawa | 0936486 | powiat złotoryjski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Trzebnica | 0987383 | powiat trzebnicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Twardogóra | 0987390 | powiat oleśnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wałbrzych | 0983681 | Wałbrzych (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wąsosz | 0954662 | powiat górowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Węgliniec | 0936492 | powiat zgorzelecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wiązów | 0987437 | powiat strzeliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wleń | 0936500 | powiat lwówecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wojcieszów | 0936517 | powiat złotoryjski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wołów | 0987466 | powiat wołowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wrocław | 0986283 | Wrocław (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zawidów | 0936523 | powiat zgorzelecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ząbkowice Śląskie | 0984692 | powiat ząbkowicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zgorzelec | 0936546 | powiat zgorzelecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ziębice | 0984700 | powiat ząbkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Złotoryja | 0954219 | powiat złotoryjski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Złoty Stok | 0984723 | powiat ząbkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Żarów | 0984746 | powiat świdnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Żmigród | 0987503 | powiat trzebnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |

### Kujawsko-Pomorskie (56)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Aleksandrów Kujawski | 0985384 | powiat aleksandrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Barcin | 0928825 | powiat żniński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bobrowniki | 0858480 | powiat lipnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Brodnica | 0982954 | powiat brodnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Brześć Kujawski | 0985444 | powiat włocławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bydgoszcz | 0928363 | Bydgoszcz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chełmno | 0983066 | powiat chełmiński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chełmża | 0983126 | powiat toruński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Chodecz | 0985562 | powiat włocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ciechocinek | 0985616 | powiat aleksandrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dobrzyń nad Wisłą | 0985651 | powiat lipnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gąsawa | 0085189 | powiat żniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gniewkowo | 0928937 | powiat inowrocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Golub-Dobrzyń | 0983155 | powiat golubsko-dobrzyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-20 |
| Górzno | 0983244 | powiat brodnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Grudziądz | 0983333 | Grudziądz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Inowrocław | 0928989 | powiat inowroclawski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Izbica Kujawska | 0985734 | powiat włocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jabłonowo Pomorskie | 0983474 | powiat brodnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Janikowo | 0929109 | powiat inowrocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Janowiec Wielkopolski | 0929167 | powiat żniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kamień Krajeński | 0929210 | powiat sępoleński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kcynia | 0929233 | powiat nakielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kikół | 0863480 | powiat lipnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Koronowo | 0929285 | powiat bydgoski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kowal | 0985786 | powiat włocławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kowalewo Pomorskie | 0983540 | powiat golubsko-dobrzyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kruszwica | 0929380 | powiat inowrocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lipno | 0985830 | powiat lipnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lubień Kujawski | 0985898 | powiat włocławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Lubraniec | 0985929 | powiat włocławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łabiszyn | 0929405 | powiat żniński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łasin | 0983557 | powiat grudziądzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mogilno | 0929428 | powiat mogileński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Mrocza | 0929440 | powiat nakielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nakło nad Notecią | 0929463 | powiat nakielski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nieszawa | 0985987 | powiat aleksandrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowe | 0929492 | powiat świecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pakość | 0929517 | powiat inowrocławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Piotrków Kujawski | 0867510 | powiat radziejowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pruszcz | 0094024 | powiat świecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Radziejów | 0986060 | powiat radziejowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radzyń Chełmiński | 0983630 | powiat grudziądzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Rypin | 0986136 | powiat rypiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sępólno Krajeńskie | 0929546 | powiat sępoleński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Skępe | 0869583 | powiat lipnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Solec Kujawski | 0929552 | powiat bydgoski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Strzelno | 0929598 | powiat mogileński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szubin | 0929612 | powiat nakielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Świecie | 0929664 | powiat swiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Toruń | 0982724 | Toruń (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tuchola | 0929724 | powiat tucholski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Wąbrzeźno | 0983652 | powiat wąbrzeski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Więcbork | 0929820 | powiat sępoleński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Włocławek | 0984752 | Włocławek (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Żnin | 0929865 | powiat żniński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |

### Lubelskie (58)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Annopol | 0786213 | powiat kraśnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bełżyce | 0955555 | powiat lubelski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Biała Podlaska | 0922018 | Biała Podlaska (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Biłgoraj | 0987673 | powiat bilgorajski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bychawa | 0955621 | powiat lubelski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chełm | 0929902 | Chełm (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czemierniki | 0011179 | powiat radzyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dęblin | 0955740 | powiat rycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Frampol | 0887196 | powiat biłgorajski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Goraj | 0887693 | powiat biłgorajski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Hrubieszów | 0987800 | powiat hrubieszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Izbica | 0889700 | powiat krasnostawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Janów Lubelski | 0980493 | powiat janowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Janów Podlaski | 0012960 | powiat bialski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Józefów | 0987897 | powiat biłgorajski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Józefów nad Wisłą | 0382036 | powiat opolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kamionka | 0382480 | powiat lubartowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kazimierz Dolny | 0955905 | powiat puławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kock | 0956069 | powiat lubartowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Końskowola | 0383656 | powiat puławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krasnobród | 0891281 | powiat zamojski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krasnystaw | 0930070 | powiat krasnostawski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Kraśnik | 0956112 | powiat krasnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kurów | 0384443 | powiat puławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lubartów | 0956313 | powiat lubartowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Lublin | 0954700 | Lublin (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lubycza Królewska | 0892889 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łaszczów | 0893742 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łęczna | 0956388 | powiat łęczyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łuków | 0975530 | powiat łukowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Międzyrzec Podlaski | 0922159 | powiat bialski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Modliborzyce | 0799760 | powiat janowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nałęczów | 0956454 | powiat puławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Opole Lubelskie | 0956550 | powiat opolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ostrów Lubelski | 0956690 | powiat lubartowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Parczew | 0922254 | powiat parczewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Piaski | 0389386 | powiat świdnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Piszczac | 0017124 | powiat bialski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Poniatowa | 0956744 | powiat opolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Puławy | 0956810 | powiat pulawski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Radzyń Podlaski | 0922277 | powiat radzyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Rejowiec | 0105667 | powiat chełmski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rejowiec Fabryczny | 0930176 | powiat chełmski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ryki | 0956980 | powiat rycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Siedliszcze | 0107821 | powiat chełmski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Stoczek Łukowski | 0975813 | powiat łukowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczebrzeszyn | 0987934 | powiat zamojski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Świdnik | 0957146 | powiat swidnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tarnogród | 0988069 | powiat biłgorajski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Terespol | 0922343 | powiat bialski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tomaszów Lubelski | 0988075 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Turobin | 0903200 | powiat biłgorajski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tyszowce | 0903676 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Urzędów | 0392684 | powiat kraśnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wąwolnica | 0393117 | powiat puławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Włodawa | 0930294 | powiat włodawski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zamość | 0987510 | Zamość (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zwierzyniec | 0988253 | powiat zamojski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |

### Lubuskie (44)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Babimost | 0988342 | powiat zielonogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Brody | 0908030 | powiat żarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bytom Odrzański | 0988359 | powiat nowosolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Cybinka | 0988365 | powiat słubicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czerwieńsk | 0988371 | powiat zielonogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dobiegniew | 0935334 | powiat strzelecko-drezdenecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Drezdenko | 0935400 | powiat strzelecko-drezdenecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gorzów Wielkopolski | 0935140 | Gorzów Wielkopolski (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gozdnica | 0988388 | powiat żagański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gubin | 0988394 | powiat krośnieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Iłowa | 0988402 | powiat żagański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jasień | 0988431 | powiat żarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kargowa | 0988448 | powiat zielonogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kostrzyn nad Odrą | 0935452 | powiat gorzowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kożuchów | 0988454 | powiat nowosolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krosno Odrzańskie | 0988460 | powiat krośnieński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubniewice | 0182969 | powiat sulęciński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lubsko | 0988490 | powiat żarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łęknica | 0988508 | powiat żarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Małomice | 0988514 | powiat żagański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Międzyrzecz | 0935529 | powiat międzyrzecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nowa Sól | 0988520 | powiat nowosolski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nowe Miasteczko | 0988566 | powiat nowosolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowogród Bobrzański | 0988572 | powiat zielonogórski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ośno Lubuskie | 0935587 | powiat słubicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Otyń | 0912824 | powiat nowosolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rzepin | 0935682 | powiat słubicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skwierzyna | 0935699 | powiat międzyrzecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sława | 0988589 | powiat wschowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Słubice | 0935736 | powiat słubicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Strzelce Krajeńskie | 0935742 | powiat strzelecko-drezdenecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sulechów | 0988595 | powiat zielonogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sulęcin | 0935759 | powiat sulęciński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Szlichtyngowa | 0954640 | powiat wschowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szprotawa | 0988603 | powiat żagański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Świebodzin | 0988626 | powiat świebodziński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Torzym | 0915484 | powiat sulęciński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Trzciel | 0935771 | powiat międzyrzecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Witnica | 0935794 | powiat gorzowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wschowa | 0954685 | powiat wschowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zbąszynek | 0988649 | powiat świebodziński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zielona Góra | 0988313 | Zielona Góra (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Żagań | 0988661 | powiat żagański | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Żary | 0988684 | powiat żarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |

### Łódzkie (60)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Aleksandrów Łódzki | 0958654 | powiat zgierski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bełchatów | 0967647 | powiat belchatowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Biała Rawska | 0977019 | powiat rawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Białaczów | 0536350 | powiat opoczyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Błaszki | 0976267 | powiat sieradzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bolesławiec | 0194330 | powiat wieruszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bolimów | 0725068 | powiat skierniewicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Brzeziny | 0977025 | powiat brzezinski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Dąbrowice | 0562880 | powiat kutnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Drzewica | 0973346 | powiat opoczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Działoszyn | 0703026 | powiat pajęczański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Głowno | 0958714 | powiat zgierski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Grabów | 0284003 | powiat łęczycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Inowłódz | 0540989 | powiat tomaszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jeżów | 0728658 | powiat brzeziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kamieńsk | 0541180 | powiat radomszczański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kiernozia | 0566894 | powiat łowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Koluszki | 0967831 | powiat łódzki wschodni | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Konstantynów Łódzki | 0958826 | powiat pabianicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Krośniewice | 0969095 | powiat kutnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kutno | 0969103 | powiat kutnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lutomiersk | 0705893 | powiat pabianicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lututów | 0706651 | powiat wieruszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Łask | 0976296 | powiat łaski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łęczyca | 0969250 | powiat łęczycki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Łowicz | 0977031 | powiat łowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Łódź | 0957650 | Łódź (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Opoczno | 0967943 | powiat opoczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Osjaków | 0708420 | powiat wieluński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ozorków | 0958967 | powiat zgierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pabianice | 0959079 | powiat pabianicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pajęczno | 0932330 | powiat pajęczański | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Parzęczew | 0415340 | powiat zgierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Piątek | 0573256 | powiat łęczycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Piotrków Trybunalski | 0967430 | Piotrków Trybunalski (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Poddębice | 0976400 | powiat poddębicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Przedbórz | 0968026 | powiat radomszczański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Radomsko | 0968078 | powiat radomszczanski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rawa Mazowiecka | 0977077 | powiat rawski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-20 |
| Rozprza | 0550717 | powiat piotrkowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rzgów | 0415787 | powiat łódzki wschodni | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sieradz | 0976050 | powiat sieradzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skierniewice | 0976942 | Skierniewice (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Stryków | 0959240 | powiat zgierski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sulejów | 0968233 | powiat piotrkowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szadek | 0976451 | powiat zduńskowolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tomaszów Mazowiecki | 0968300 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tuszyn | 0968569 | powiat łódzki wschodni | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ujazd | 0554721 | powiat tomaszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Uniejów | 0949359 | powiat poddębicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Warta | 0976557 | powiat sieradzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wieluń | 0976586 | powiat wieluński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wieruszów | 0937400 | powiat wieruszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wolbórz | 0556648 | powiat piotrkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zduńska Wola | 0976675 | powiat zduńskowolski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zelów | 0968664 | powiat bełchatowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zgierz | 0959263 | powiat zgierski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Złoczew | 0976830 | powiat sieradzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Żarnów | 0558274 | powiat opoczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Żychlin | 0969391 | powiat kutnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Małopolskie (64)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Alwernia | 0314454 | powiat chrzanowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Andrychów | 0924023 | powiat wadowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Biecz | 0952752 | powiat gorlicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bobowa | 0417728 | powiat gorlicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bochnia | 0981682 | powiat bochenski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Brzesko | 0981966 | powiat brzeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Brzeszcze | 0938120 | powiat oświęcimski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bukowno | 0938404 | powiat olkuski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chełmek | 0924098 | powiat oświęcimski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chrzanów | 0938982 | powiat chrzanowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ciężkowice | 0815239 | powiat tarnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czarny Dunajec | 0421629 | powiat nowotarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czchów | 0816871 | powiat brzeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dąbrowa Tarnowska | 0982167 | powiat dąbrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dobczyce | 0951505 | powiat myślenicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gorlice | 0959903 | powiat gorlicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Grybów | 0960042 | powiat nowosądecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Jordanów | 0960154 | powiat suski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kalwaria Zebrzydowska | 0924253 | powiat wadowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kęty | 0924365 | powiat oświęcimski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Koszyce | 0244630 | powiat proszowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kraków | 0950463 | Kraków (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Krynica-Zdrój | 0960390 | powiat nowosądecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krzeszowice | 0951570 | powiat krakowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Książ Wielki | 0246617 | powiat miechowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Libiąż | 0940938 | powiat chrzanowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Limanowa | 0960510 | powiat limanowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Maków Podhalański | 0924537 | powiat suski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Miechów | 0947225 | powiat miechowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mszana Dolna | 0960697 | powiat limanowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Muszyna | 0961283 | powiat nowosądecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Myślenice | 0951617 | powiat myślenicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Niepołomice | 0951675 | powiat wielicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowe Brzesko | 0329705 | powiat proszowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowy Sącz | 0959435 | Nowy Sącz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowy Targ | 0961538 | powiat nowotarski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowy Wiśnicz | 0824936 | powiat bocheński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Olkusz | 0941777 | powiat olkuski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Oświęcim | 0924997 | powiat oświęcimski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Piwniczna-Zdrój | 0961768 | powiat nowosądecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Proszowice | 0951818 | powiat proszowicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Rabka-Zdrój | 0962503 | powiat nowotarski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Radłów | 0827923 | powiat tarnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ryglice | 0829098 | powiat tarnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skała | 0951860 | powiat krakowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skawina | 0951876 | powiat krakowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Słomniki | 0952077 | powiat krakowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Stary Sącz | 0963359 | powiat nowosądecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sucha Beskidzka | 0925287 | powiat suski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sułkowice | 0952137 | powiat myślenicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczawnica | 0963454 | powiat nowotarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczucin | 0831149 | powiat dąbrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Świątniki Górne | 0337774 | powiat krakowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tarnów | 0981570 | Tarnów (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Trzebinia | 0944149 | powiat chrzanowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tuchów | 0982457 | powiat tarnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wadowice | 0926921 | powiat wadowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Wieliczka | 0952232 | powiat wielicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wojnicz | 0836276 | powiat tarnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wolbrom | 0945315 | powiat olkuski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zakliczyn | 0837436 | powiat tarnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zakopane | 0963773 | powiat tatrzanski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zator | 0927576 | powiat oświęcimski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Żabno | 0982641 | powiat tarnowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |

### Mazowieckie (114)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Białobrzegi | 0973286 | powiat bialobrzeski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Bieżuń | 0111981 | powiat żuromiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Błonie | 0920249 | powiat warszawski zachodni | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bodzanów | 0560213 | powiat płocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Brok | 0966151 | powiat ostrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Brwinów | 0920284 | powiat pruszkowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Cegłów | 0668956 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Chorzele | 0966270 | powiat przasnyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ciechanów | 0930414 | powiat ciechanowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Ciepielów | 0617203 | powiat lipski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Czerwińsk nad Wisłą | 0561885 | powiat płoński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dobre | 0670278 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Drobin | 0563223 | powiat płocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Garwolin | 0975285 | powiat garwoliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Gąbin | 0968871 | powiat płocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gielniów | 0618817 | powiat przysuski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Glinojeck | 0114620 | powiat ciechanowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Głowaczów | 0619366 | powiat kozienicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gostynin | 0968977 | powiat gostyniński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Góra Kalwaria | 0920321 | powiat piaseczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Grodzisk Mazowiecki | 0920380 | powiat grodziski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Grójec | 0973352 | powiat grójecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Halinów | 0002766 | powiat miński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Iłża | 0973375 | powiat radomski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Jadów | 0673220 | powiat wołomiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jastrząb | 0623988 | powiat szydłowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jedlnia-Letnisko | 0625444 | powiat radomski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Józefów | 0920404 | powiat otwocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kałuszyn | 0975380 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Karczew | 0920500 | powiat otwocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kazanów | 0625728 | powiat zwoleński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kobyłka | 0920539 | powiat wołomiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Konstancin-Jeziorna | 0920634 | powiat piaseczyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kosów Lacki | 0676128 | powiat sokołowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kozienice | 0973524 | powiat kozienicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Latowicz | 0677636 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Legionowo | 0920806 | powiat legionowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Lipsko | 0973613 | powiat lipski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubowidz | 0118606 | powiat żuromiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łaskarzew | 0975434 | powiat garwoliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Łochów | 0975492 | powiat węgrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łomianki | 0920864 | powiat warszawski zachodni | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Łosice | 0922120 | powiat łosicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Maciejowice | 0680503 | powiat garwoliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Magnuszew | 0628833 | powiat kozienicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Maków Mazowiecki | 0966300 | powiat makowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Małkinia Górna | 0514408 | powiat ostrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Marki | 0920901 | powiat wołomiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Milanówek | 0921020 | powiat grodziski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mińsk Mazowiecki | 0975687 | powiat minski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mława | 0930696 | powiat mławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Mogielnica | 0973665 | powiat grójecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mordy | 0975747 | powiat siedlecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mrozy | 0682940 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mszczonów | 0977054 | powiat żyrardowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Myszyniec | 0514928 | powiat ostrołęcki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nasielsk | 0930740 | powiat nowodworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowe Miasto | 0120900 | powiat płoński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowe Miasto nad Pilicą | 0973725 | powiat grójecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowy Dwór Mazowiecki | 0921148 | powiat nowodworski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Odrzywół | 0630110 | powiat przysuski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Osieck | 0683192 | powiat otwocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ostrołęka | 0966079 | Ostrołęka (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ostrów Mazowiecka | 0966330 | powiat ostrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Otwock | 0921237 | powiat otwocki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ożarów Mazowiecki | 0921415 | powiat warszawski zachodni | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Piaseczno | 0921438 | powiat piaseczynski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Piastów | 0921496 | powiat pruszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pilawa | 0975753 | powiat garwoliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pionki | 0973748 | powiat radomski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Płock | 0968687 | Płock (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Płońsk | 0930800 | powiat płoński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Podkowa Leśna | 0921504 | powiat grodziski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pruszków | 0921510 | powiat pruszkowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Przasnysz | 0966398 | powiat przasnyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Przysucha | 0973777 | powiat przysuski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Przytyk | 0634348 | powiat radomski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pułtusk | 0930816 | powiat pułtuski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Raciąż | 0930839 | powiat płoński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Radom | 0972750 | Radom (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radzymin | 0921591 | powiat wołomiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Różan | 0966412 | powiat makowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sanniki | 0574511 | powiat gostyniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Serock | 0921645 | powiat legionowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Siedlce | 0975173 | Siedlce (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Siennica | 0687273 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sienno | 0636650 | powiat lipski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sierpc | 0969310 | powiat sierpecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skaryszew | 0973820 | powiat radomski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sochaczew | 0977120 | powiat sochaczewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Sochocin | 0125954 | powiat płoński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sokołów Podlaski | 0975760 | powiat sokołowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Solec nad Wisłą | 0637921 | powiat lipski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Stanisławów | 0690186 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Staroźreby | 0577060 | powiat płocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sulejówek | 0921668 | powiat miński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szydłowiec | 0973895 | powiat szydłowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Tarczyn | 0009478 | powiat piaseczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Tłuszcz | 0966441 | powiat wołomiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Warka | 0973978 | powiat grójecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Warszawa | 0918123 | Warszawa (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Węgrów | 0975871 | powiat węgrowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wiskitki | 0739656 | powiat żyrardowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wołomin | 0921792 | powiat wolominski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Wyszków | 0966470 | powiat wyszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wyszogród | 0969356 | powiat płocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wyśmierzyce | 0974044 | powiat białobrzeski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zakroczym | 0921869 | powiat nowodworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ząbki | 0921958 | powiat wołomiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zielonka | 0921970 | powiat wołomiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zwoleń | 0974096 | powiat zwoleński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żelechów | 0975983 | powiat garwoliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Żuromin | 0930851 | powiat żuromiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żyrardów | 0977210 | powiat zyrardowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |

### Opolskie (38)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Baborów | 0965200 | powiat głubczycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Biała | 0965223 | powiat prudnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Branice | 0491742 | powiat głubczycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Brzeg | 0965252 | powiat brzeski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Byczyna | 0965275 | powiat kluczborski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dobrodzień | 0931454 | powiat oleski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Głogówek | 0965281 | powiat prudnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Głubczyce | 0965329 | powiat głubczycki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Głuchołazy | 0965341 | powiat nyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gogolin | 0965364 | powiat krapkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gorzów Śląski | 0931490 | powiat oleski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Grodków | 0965401 | powiat brzeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kędzierzyn-Koźle | 0965424 | powiat kędzierzyńsko-kozielski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kietrz | 0965602 | powiat głubczycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kluczbork | 0965619 | powiat kluczborski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kolonowskie | 0965631 | powiat strzelecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Korfantów | 0496946 | powiat nyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krapkowice | 0965677 | powiat krapkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Leśnica | 0965714 | powiat strzelecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Lewin Brzeski | 0965720 | powiat brzeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Namysłów | 0965743 | powiat namysłowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Niemodlin | 0965750 | powiat opolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nysa | 0965789 | powiat nyski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Olesno | 0932293 | powiat oleski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Opole | 0965016 | Opole (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Otmuchów | 0965832 | powiat nyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ozimek | 0965849 | powiat opolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Paczków | 0965855 | powiat nyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Praszka | 0932353 | powiat oleski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Prószków | 0502523 | powiat opolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Prudnik | 0965878 | powiat prudnicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Strzelce Opolskie | 0965915 | powiat strzelecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Strzeleczki | 0503600 | powiat krapkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tułowice | 0504090 | powiat opolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ujazd | 0965967 | powiat strzelecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wołczyn | 0965996 | powiat kluczborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zawadzkie | 0966004 | powiat strzelecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zdzieszowice | 0966040 | powiat krapkowicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Podkarpackie (54)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Baranów Sandomierski | 0980352 | powiat tarnobrzeski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bircza | 0598990 | powiat przemyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Błażowa | 0974280 | powiat rzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Boguchwała | 0644750 | powiat rzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Brzostek | 0814493 | powiat dębicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Brzozów | 0952841 | powiat brzozowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Cieszanów | 0972051 | powiat lubaczowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dębica | 0982233 | powiat debicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Dubiecko | 0600496 | powiat przemyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dukla | 0952924 | powiat krośnieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dynów | 0972080 | powiat rzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Głogów Małopolski | 0974328 | powiat rzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Iwonicz-Zdrój | 0953007 | powiat krośnieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jarosław | 0972192 | powiat jaroslawski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Jasło | 0953059 | powiat jasielski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Jawornik Polski | 0603900 | powiat przeworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jedlicze | 0953237 | powiat krośnieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kańczuga | 0972424 | powiat przeworski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kolbuszowa | 0974392 | powiat kolbuszowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kołaczyce | 0353968 | powiat jasielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krosno | 0952410 | Krosno (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lesko | 0953409 | powiat leski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Leżajsk | 0974400 | powiat leżajski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Lubaczów | 0972447 | powiat lubaczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Łańcut | 0974529 | powiat łańcucki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mielec | 0974618 | powiat mielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Narol | 0606984 | powiat lubaczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nisko | 0980530 | powiat niżański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowa Dęba | 0980636 | powiat tarnobrzeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowa Sarzyna | 0974788 | powiat leżajski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Oleszyce | 0972507 | powiat lubaczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pilzno | 0982345 | powiat dębicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pruchnik | 0608316 | powiat jarosławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Przecław | 0658828 | powiat mielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Przemyśl | 0971672 | Przemyśl (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Przeworsk | 0972513 | powiat przeworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Radomyśl Wielki | 0982411 | powiat mielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Radymno | 0972594 | powiat jarosławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ropczyce | 0974825 | powiat ropczycko-sędziszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rudnik nad Sanem | 0980850 | powiat niżański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Rymanów | 0953421 | powiat krośnieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Rzeszów | 0974133 | Rzeszów (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sanok | 0953510 | powiat sanocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Sędziszów Małopolski | 0974937 | powiat ropczycko-sędziszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sieniawa | 0972683 | powiat przeworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sokołów Małopolski | 0974966 | powiat rzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Stalowa Wola | 0981133 | powiat stalowowolski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Strzyżów | 0975010 | powiat strzyżowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Tarnobrzeg | 0980085 | Tarnobrzeg (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tyczyn | 0975078 | powiat rzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ulanów | 0981386 | powiat niżański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ustrzyki Dolne | 0953817 | powiat bieszczadzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Zagórz | 0953881 | powiat sanocki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zaklików | 0810615 | powiat stalowowolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Podlaskie (40)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Augustów | 0977539 | powiat augustowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Białystok | 0922410 | Białystok (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bielsk Podlaski | 0922685 | powiat bielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Brańsk | 0922745 | powiat bielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Choroszcz | 0922811 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ciechanowiec | 0957324 | powiat wysokomazowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czarna Białostocka | 0922886 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czyżew | 0395984 | powiat wysokomazowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dąbrowa Białostocka | 0922923 | powiat sokólski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Drohiczyn | 0922998 | powiat siemiatycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Goniądz | 0957360 | powiat moniecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Grajewo | 0957376 | powiat grajewski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Hajnówka | 0923035 | powiat hajnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Jedwabne | 0957382 | powiat łomżyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kleszczele | 0031727 | powiat hajnowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Knyszyn | 0923213 | powiat moniecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kolno | 0957420 | powiat kolneński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Krynki | 0032655 | powiat sokólski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Lipsk | 0977717 | powiat augustowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łapy | 0923271 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łomża | 0957241 | Łomża (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Michałowo | 0034507 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mońki | 0923348 | powiat moniecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Nowogród | 0957459 | powiat łomżyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rajgród | 0957465 | powiat grajewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sejny | 0977918 | powiat sejneński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Siemiatycze | 0923360 | powiat siemiatycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sokółka | 0923443 | powiat sokólski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Stawiski | 0957548 | powiat kolneński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Suchowola | 0041312 | powiat sokólski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Supraśl | 0923472 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Suraż | 0923510 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Suwałki | 0977456 | Suwałki (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Szczuczyn | 0957560 | powiat grajewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szepietowo | 0407380 | powiat wysokomazowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tykocin | 0043446 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wasilków | 0923526 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wysokie Mazowieckie | 0957620 | powiat wysokomazowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zabłudów | 0923578 | powiat białostocki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zambrów | 0957637 | powiat zambrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Pomorskie (43)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Brusy | 0928848 | powiat chojnicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bytów | 0977290 | powiat bytowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chojnice | 0928854 | powiat chojnicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czarna Woda | 0162139 | powiat starogardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Czarne | 0977309 | powiat człuchowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Czersk | 0928920 | powiat chojnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Człuchów | 0977321 | powiat człuchowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Debrzno | 0977338 | powiat człuchowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dzierzgoń | 0932726 | powiat sztumski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gdańsk | 0933016 | Gdańsk (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gdynia | 0934100 | Gdynia (m.n.p.p.) | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Gniew | 0934470 | powiat tczewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Hel | 0934501 | powiat pucki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jastarnia | 0934518 | powiat pucki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kartuzy | 0934547 | powiat kartuski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Kępice | 0977344 | powiat słupski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kobylnica | 0745289 | powiat słupski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kościerzyna | 0934553 | powiat kościerski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Krynica Morska | 0932755 | powiat nowodworski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kwidzyn | 0932790 | powiat kwidzyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lębork | 0977373 | powiat lęborski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Łeba | 0977380 | powiat lęborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Malbork | 0932815 | powiat malborski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Miastko | 0977404 | powiat bytowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowy Dwór Gdański | 0932880 | powiat nowodworski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Nowy Staw | 0932904 | powiat malborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pelplin | 0934599 | powiat tczewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Prabuty | 0932962 | powiat kwidzyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pruszcz Gdański | 0934620 | powiat gdański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Puck | 0934636 | powiat pucki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Reda | 0934659 | powiat wejherowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rumia | 0934694 | powiat wejherowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skarszewy | 0934754 | powiat starogardzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skórcz | 0934777 | powiat starogardzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Słupsk | 0977278 | Słupsk (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sopot | 0934783 | Sopot (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Starogard Gdański | 0934837 | powiat starogardzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sztum | 0932991 | powiat sztumski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tczew | 0934903 | powiat tczewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ustka | 0977427 | powiat słupski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wejherowo | 0934984 | powiat wejherowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Władysławowo | 0935015 | powiat pucki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Żukowo | 0935127 | powiat kartuski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Śląskie (75)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Będzin | 0937899 | powiat bedzinski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bielsko-Biała | 0923584 | Bielsko-Biała (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Bieruń | 0938077 | powiat bierunsko-ledzinski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Blachownia | 0931365 | powiat częstochowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bytom | 0938670 | Bytom (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chorzów | 0938887 | Chorzów (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Cieszyn | 0924158 | powiat cieszynski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czechowice-Dziedzice | 0939094 | powiat bielski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czeladź | 0939349 | powiat będziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Czerwionka-Leszczyny | 0939409 | powiat rybnicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Częstochowa | 0930868 | Częstochowa (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dąbrowa Górnicza | 0939473 | Dąbrowa Górnicza (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gliwice | 0940000 | Gliwice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-20 |
| Imielin | 0941582 | powiat bieruńsko-lędziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Janów | 0133273 | powiat częstochowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jastrzębie-Zdrój | 0940163 | Jastrzębie-Zdrój (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Jaworzno | 0940335 | Jaworzno (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kalety | 0931589 | powiat tarnogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Katowice | 0937474 | Katowice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kłobuck | 0931678 | powiat kłobucki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Knurów | 0940849 | powiat gliwicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Koniecpol | 0931750 | powiat częstochowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Koziegłowy | 0931827 | powiat myszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Krzanowice | 0215427 | powiat raciborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Krzepice | 0931862 | powiat kłobucki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kuźnia Raciborska | 0940884 | powiat raciborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lędziny | 0940890 | powiat bieruńsko-lędziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lubliniec | 0931945 | powiat lubliniecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Łaziska Górne | 0941139 | powiat mikołowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Łazy | 0941197 | powiat zawierciański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Miasteczko Śląskie | 0943902 | powiat tarnogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mikołów | 0941286 | powiat mikołowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mysłowice | 0941487 | Mysłowice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Myszków | 0932057 | powiat myszkowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Ogrodzieniec | 0941748 | powiat zawierciański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Olsztyn | 0140675 | powiat częstochowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Orzesze | 0941984 | powiat mikołowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Piekary Śląskie | 0942104 | Piekary Śląskie (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pilica | 0219566 | powiat zawierciański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Poręba | 0942216 | powiat zawierciański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Przyrów | 0143550 | powiat częstochowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pszczyna | 0942222 | powiat pszczyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pszów | 0945083 | powiat wodzisławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pyskowice | 0942417 | powiat gliwicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Racibórz | 0942469 | powiat raciborski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Radlin | 0945108 | powiat wodzisławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Radzionków | 0938806 | powiat tarnogórski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ruda Śląska | 0942630 | Ruda Śląska (m.n.p.p.) | ✅ BUILT | completed | built | enabled | 2026-10-18 |
| Rybnik | 0942765 | Rybnik (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Rydułtowy | 0943121 | powiat wodzisławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Siemianowice Śląskie | 0943150 | Siemianowice Śląskie (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Siewierz | 0943204 | powiat będziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Skoczów | 0925198 | powiat cieszyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sławków | 0943285 | powiat będziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sosnowiec | 0943428 | Sosnowiec (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sośnicowice | 0221936 | powiat gliwicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Strumień | 0925258 | powiat cieszyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczekociny | 0932413 | powiat zawierciański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczyrk | 0925850 | powiat bielski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Świętochłowice | 0943724 | Świętochłowice (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tarnowskie Góry | 0943813 | powiat tarnogórski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Toszek | 0944126 | powiat gliwicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tychy | 0944534 | Tychy (m.n.p.p.) | ❌ Dropped | surveyed | deferred | not-enabled | 2026-10-18 |
| Ustroń | 0926677 | powiat cieszyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wilamowice | 0926996 | powiat bielski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wisła | 0927091 | powiat cieszyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Włodowice | 0146821 | powiat zawierciański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wodzisław Śląski | 0944853 | powiat wodzisławski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wojkowice | 0945232 | powiat będziński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Woźniki | 0932494 | powiat lubliniecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zabrze | 0945380 | Zabrze (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Zawiercie | 0945491 | powiat zawiercianski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Żarki | 0932643 | powiat myszkowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Żory | 0945746 | Żory (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Żywiec | 0927642 | powiat żywiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |

### Świętokrzyskie (51)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Bodzentyn | 0230102 | powiat kielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bogoria | 0788070 | powiat staszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Busko-Zdrój | 0946651 | powiat buski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Chęciny | 0946846 | powiat kielecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chmielnik | 0946906 | powiat kielecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ćmielów | 0980435 | powiat ostrowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Daleszyce | 0236429 | powiat kielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Działoszyce | 0946987 | powiat pińczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gowarczów | 0620659 | powiat konecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Iwaniska | 0793673 | powiat opatowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jędrzejów | 0947030 | powiat jędrzejowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kazimierza Wielka | 0947076 | powiat kazimierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Kielce | 0945930 | Kielce (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Klimontów | 0795933 | powiat sandomierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Końskie | 0947136 | powiat konecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Koprzywnica | 0796588 | powiat sandomierski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kunów | 0947202 | powiat ostrowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łagów | 0247670 | powiat kielecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łopuszno | 0248622 | powiat kielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Małogoszcz | 0249343 | powiat jędrzejowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Morawica | 0254226 | powiat kielecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowa Słupia | 0255510 | powiat kielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowy Korczyn | 0256142 | powiat buski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Oleśnica | 0257118 | powiat staszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Opatowiec | 0257963 | powiat kazimierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Opatów | 0980671 | powiat opatowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Osiek | 0802202 | powiat staszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ostrowiec Świętokrzyski | 0947308 | powiat ostrowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ożarów | 0980777 | powiat opatowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pacanów | 0258715 | powiat buski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Piekoszów | 0261746 | powiat kielecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pierzchnica | 0262310 | powiat kielecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pińczów | 0947580 | powiat pińczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Połaniec | 0980783 | powiat staszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Radoszyce | 0264986 | powiat konecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sandomierz | 0980926 | powiat sandomierski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sędziszów | 0947610 | powiat jędrzejowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skalbmierz | 0947627 | powiat kazimierski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Skarżysko-Kamienna | 0947716 | powiat skarzyski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Sobków | 0270604 | powiat jędrzejowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Starachowice | 0947930 | powiat starachowicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Staszów | 0981274 | powiat staszowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Stąporków | 0948271 | powiat konecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Stopnica | 0272951 | powiat buski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Suchedniów | 0948360 | powiat skarżyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szydłów | 0275062 | powiat staszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wąchock | 0276802 | powiat starachowicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wiślica | 0277470 | powiat buski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Włoszczowa | 0948472 | powiat włoszczowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Wodzisław | 0279686 | powiat jędrzejowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Zawichost | 0981417 | powiat sandomierski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Warmińsko-Mazurskie (50)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Barczewo | 0964577 | powiat olsztyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bartoszyce | 0964583 | powiat bartoszycki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Biała Piska | 0977640 | powiat piski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Biskupiec | 0964590 | powiat olsztyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Bisztynek | 0964608 | powiat bartoszycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Braniewo | 0932710 | powiat braniewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Dobre Miasto | 0964614 | powiat olsztyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Działdowo | 0930609 | powiat działdowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Elbląg | 0932703 | Elbląg (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ełk | 0977670 | powiat elcki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Frombork | 0932732 | powiat braniewski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Giżycko | 0977692 | powiat gizycki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Gołdap | 0977700 | powiat gołdapski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Górowo Iławeckie | 0964643 | powiat bartoszycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Iława | 0964650 | powiat iławski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Jeziorany | 0964703 | powiat olsztyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kętrzyn | 0964710 | powiat kętrzyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kisielice | 0932749 | powiat iławski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Korsze | 0964726 | powiat kętrzyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lidzbark | 0930644 | powiat działdowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lidzbark Warmiński | 0964732 | powiat lidzbarski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Lubawa | 0964749 | powiat iławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mikołajki | 0977723 | powiat mrągowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Miłakowo | 0481761 | powiat ostródzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Miłomłyn | 0482192 | powiat ostródzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Młynary | 0932873 | powiat elbląski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Morąg | 0964850 | powiat ostródzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mrągowo | 0964896 | powiat mrągowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nidzica | 0964904 | powiat nidzicki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Nowe Miasto Lubawskie | 0983563 | powiat nowomiejski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Olecko | 0977798 | powiat olecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Olsztyn | 0964465 | Olsztyn (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Olsztynek | 0964910 | powiat olsztyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Orneta | 0932910 | powiat lidzbarski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Orzysz | 0977806 | powiat piski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ostróda | 0964927 | powiat ostrodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Pasłęk | 0932927 | powiat elbląski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pasym | 0485813 | powiat szczycieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pieniężno | 0932956 | powiat braniewski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pisz | 0977835 | powiat piski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Reszel | 0964979 | powiat kętrzyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ruciane-Nida | 0977841 | powiat piski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Ryn | 0977893 | powiat giżycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sępopol | 0964985 | powiat bartoszycki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Susz | 0932979 | powiat iławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczytno | 0964991 | powiat szczycieński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Tolkmicko | 0933000 | powiat elbląski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Węgorzewo | 0977947 | powiat węgorzewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Wielbark | 0490470 | powiat szczycieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zalewo | 0965000 | powiat iławski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Wielkopolskie (120)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Bojanowo | 0954308 | powiat rawicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Borek Wielkopolski | 0954343 | powiat gostyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Budzyń | 0524393 | powiat chodzieski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Buk | 0970520 | powiat poznański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Chocz | 0195564 | powiat pleszewski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Chodzież | 0966760 | powiat chodzieski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czarnków | 0966777 | powiat czarnkowsko-trzcianecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Czempiń | 0970537 | powiat kościański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Czerniejewo | 0970543 | powiat gnieźnieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dąbie | 0948992 | powiat kolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dobra | 0949000 | powiat turecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dobrzyca | 0196380 | powiat pleszewski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dolsk | 0970589 | powiat śremski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gniezno | 0970632 | powiat gnieznienski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-20 |
| Golina | 0949017 | powiat koniński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gołańcz | 0966820 | powiat wągrowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Gostyń | 0954395 | powiat gostyński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Grabów nad Prosną | 0936760 | powiat ostrzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Grodzisk Wielkopolski | 0970810 | powiat grodziski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Jaraczewo | 0199088 | powiat jarociński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Jarocin | 0936776 | powiat jarociński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Jastrowie | 0966843 | powiat złotowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Jutrosin | 0954461 | powiat rawicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kaczory | 0526469 | powiat pilski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kalisz | 0936569 | Kalisz (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Kępno | 0936871 | powiat kępiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kleczew | 0949023 | powiat koniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kłecko | 0970840 | powiat gnieźnieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kłodawa | 0949046 | powiat kolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kobylin | 0954478 | powiat krotoszyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Koło | 0949052 | powiat kolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Konin | 0948667 | Konin (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Kostrzyn | 0970885 | powiat poznański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kościan | 0954484 | powiat kościański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Koźmin Wielkopolski | 0936925 | powiat krotoszyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Koźminek | 0201141 | powiat kaliski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Kórnik | 0970922 | powiat poznański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krajenka | 0966932 | powiat złotowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krobia | 0954538 | powiat gostyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krotoszyn | 0936931 | powiat krotoszynski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krzywiń | 0954544 | powiat kościański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Krzyż Wielkopolski | 0966961 | powiat czarnkowsko-trzcianecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Książ Wielkopolski | 0970968 | powiat śremski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Leszno | 0954225 | Leszno (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Luboń | 0970974 | powiat poznański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Lwówek | 0971028 | powiat nowotomyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Łobżenica | 0966984 | powiat pilski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Margonin | 0966990 | powiat chodzieski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Miasteczko Krajeńskie | 0528132 | powiat pilski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Miejska Górka | 0954550 | powiat rawicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mieścisko | 0588855 | powiat wągrowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Międzychód | 0935506 | powiat międzychodzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Mikstat | 0937066 | powiat ostrzeszowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Miłosław | 0971034 | powiat wrzesiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mosina | 0971057 | powiat poznański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Murowana Goślina | 0971152 | powiat poznański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nekla | 0590310 | powiat wrzesiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowe Skalmierzyce | 0937089 | powiat ostrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Nowy Tomyśl | 0971175 | powiat nowotomyski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Oborniki | 0971181 | powiat obornicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Obrzycko | 0971212 | powiat szamotulski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Odolanów | 0937110 | powiat ostrowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Okonek | 0967044 | powiat złotowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Opalenica | 0971241 | powiat nowotomyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Opatówek | 0205386 | powiat kaliski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Osieczna | 0954567 | powiat leszczyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ostroróg | 0971264 | powiat szamotulski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ostrów Wielkopolski | 0937132 | powiat ostrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ostrzeszów | 0937250 | powiat ostrzeszowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Piła | 0966530 | powiat pilski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pleszew | 0937280 | powiat pleszewski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Pniewy | 0971270 | powiat szamotulski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pobiedziska | 0971287 | powiat poznański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pogorzela | 0954580 | powiat gostyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Poniec | 0954596 | powiat gostyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Poznań | 0969400 | Poznań (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Przedecz | 0949129 | powiat kolski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Puszczykowo | 0971376 | powiat poznański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pyzdry | 0949164 | powiat wrzesiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Rakoniewice | 0971413 | powiat grodziski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Raszków | 0937310 | powiat ostrowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rawicz | 0954604 | powiat rawicki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rogoźno | 0967080 | powiat obornicki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Rychtal | 0208077 | powiat kępiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Rychwał | 0949193 | powiat koniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Rydzyna | 0954633 | powiat leszczyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sieraków | 0971436 | powiat międzychodzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Skoki | 0971459 | powiat wągrowiecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Słupca | 0949247 | powiat słupecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sompolno | 0949253 | powiat koniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Stawiszyn | 0937327 | powiat kaliski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Stęszew | 0971494 | powiat poznański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sulmierzyce | 0937333 | powiat krotoszyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Swarzędz | 0971502 | powiat poznański | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Szamocin | 0967096 | powiat chodzieski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szamotuły | 0971531 | powiat szamotulski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Ślesin | 0949282 | powiat koniński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Śmigiel | 0954656 | powiat kościański | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Śrem | 0971560 | powiat śremski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Środa Wielkopolska | 0971614 | powiat średzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Trzcianka | 0967162 | powiat czarnkowsko-trzcianecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Trzemeszno | 0929701 | powiat gnieźnieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Tuliszków | 0949320 | powiat turecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Turek | 0949336 | powiat turecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Ujście | 0967191 | powiat pilski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wągrowiec | 0967297 | powiat wągrowiecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wieleń | 0967334 | powiat czarnkowsko-trzcianecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wielichowo | 0971620 | powiat grodziski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Witkowo | 0949388 | powiat gnieźnieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Wolsztyn | 0988632 | powiat wolsztyński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wronki | 0967386 | powiat szamotulski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Września | 0971637 | powiat wrzesinski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Wyrzysk | 0967392 | powiat pilski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wysoka | 0967417 | powiat pilski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zagórów | 0949431 | powiat słupecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zaniemyśl | 0598546 | powiat średzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zbąszyń | 0988655 | powiat nowotomyski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Zduny | 0937439 | powiat krotoszyński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Złotów | 0967423 | powiat złotowski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Żerków | 0937445 | powiat jarociński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

### Zachodniopomorskie (66)

| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |
|---|---|---|---|---|---|---|---|
| Barlinek | 0935268 | powiat myśliborski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Barwice | 0949649 | powiat szczecinecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Białogard | 0949690 | powiat bialogardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Biały Bór | 0949767 | powiat szczecinecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Bobolice | 0949804 | powiat koszaliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Borne Sulinowo | 0988715 | powiat szczecinecki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Cedynia | 0978734 | powiat gryfiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Chociwel | 0978757 | powiat stargardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Chojna | 0978786 | powiat gryfiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Choszczno | 0935280 | powiat choszczeński | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Czaplinek | 0949810 | powiat drawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Człopa | 0966808 | powiat wałecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Darłowo | 0949833 | powiat sławieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dębno | 0935305 | powiat myśliborski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Dobra | 0978852 | powiat łobeski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Dobrzany | 0978875 | powiat stargardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Drawno | 0935357 | powiat choszczeński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Drawsko Pomorskie | 0949862 | powiat drawski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Dziwnów | 0774782 | powiat kamieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Golczewo | 0978881 | powiat kamieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Goleniów | 0978929 | powiat goleniowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Gościno | 0306236 | powiat kołobrzeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gryfice | 0979053 | powiat gryficki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Gryfino | 0979076 | powiat gryfiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Ińsko | 0979099 | powiat stargardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kalisz Pomorski | 0949916 | powiat drawski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kamień Pomorski | 0979113 | powiat kamieński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Karlino | 0949968 | powiat białogardzki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Kołobrzeg | 0950026 | powiat kolobrzeski | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Koszalin | 0949448 | Koszalin (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Lipiany | 0979120 | powiat pyrzycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Łobez | 0979136 | powiat łobeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-30 |
| Maszewo | 0979188 | powiat goleniowski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mielno | 0308353 | powiat koszaliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Mieszkowice | 0979202 | powiat gryfiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Międzyzdroje | 0979248 | powiat kamieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Mirosławiec | 0967038 | powiat wałecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Moryń | 0979283 | powiat gryfiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Myślibórz | 0935558 | powiat myśliborski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowe Warpno | 0979308 | powiat policki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Nowogard | 0979389 | powiat goleniowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Pełczyce | 0935601 | powiat choszczeński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Płoty | 0979432 | powiat gryficki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Polanów | 0950115 | powiat koszaliński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Police | 0979449 | powiat policki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Połczyn-Zdrój | 0950144 | powiat świdwiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Pyrzyce | 0979515 | powiat pyrzycki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Recz | 0935653 | powiat choszczeński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Resko | 0979580 | powiat łobeski | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Sianów | 0950240 | powiat koszaliński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Sławno | 0977410 | powiat sławieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Stargard | 0979596 | powiat stargardzki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Stepnica | 0783864 | powiat goleniowski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Suchań | 0979716 | powiat stargardzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Szczecin | 0977976 | Szczecin (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Szczecinek | 0950262 | powiat szczecinecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Świdwin | 0950322 | powiat świdwiński | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2026-10-18 |
| Świnoujście | 0979722 | Świnoujście (m.n.p.p.) | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Trzcińsko-Zdrój | 0979952 | powiat gryfiński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Trzebiatów | 0979969 | powiat gryficki | 🔴 NO-BUILD | surveyed | no-source-found | not-enabled | 2027-10-31 |
| Tuczno | 0967185 | powiat wałecki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Tychowo | 0313839 | powiat białogardzki | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wałcz | 0967245 | powiat wałecki | ✅ BUILT | surveyed | enabled | monitored | 2026-10-18 |
| Węgorzyno | 0980062 | powiat łobeski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Wolin | 0980079 | powiat kamieński | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |
| Złocieniec | 0950374 | powiat drawski | ✅ BUILT | surveyed | enabled | monitored | 2027-01-31 |

---

*Generated by spikes/build-progress.mjs — doc/data only, no version bump.*
