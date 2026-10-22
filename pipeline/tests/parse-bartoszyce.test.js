// Bartoszyce parser tests — REAL fixtures: pdftotext extracted text from
// bip.bartoszyce.pl.
// Groundtruth hand-verified against source PDFs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePLN,
  parseHa,
  haToM2,
  parseAreaM2,
  monthNum,
  announceRoundFromText,
  announceDateFromText,
  resultDateFromText,
  isLease,
  isResultNotice,
  isAnnouncementNotice,
  isNegativeOutcome,
  announceFlatAddressRaw,
  flatAreaFromText,
  startingPriceFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/bartoszyce/parse.js';
import {
  parseInformationList,
  parseAttachments,
  isWynikAttachment,
  isOgloszenieAttachment,
} from '../src/cities/bartoszyce/crawl.js';

// ── FIXTURES ─────────────────────────────────────────────────────────────────

const BEMA_WYNIK = `                                        Informacja o wyniku I przetargu ustnego nieograniczonego
 przeprowadzonego w dniu 16 kwietnia 2026 r. w Sali nr 9 Urzędu Miasta Bartoszyce, ul. Boh. Monte Cassino 1 w Bartoszycach, na sprzedaż
                      lokalu mieszkalnego położonego w budynku przy ul. Generała Bema 57/2 w Bartoszycach

 Lp.   Oznaczenie nieruchomości wg     Liczba osób dopuszczonych i    Cena wywoławcza      Najwyższa cena      Imię i nazwisko osoby
       katastru nieruchomości i KW     nie dopuszczonych do           nieruchomości        osiągnięta w        ustalonej jako nabywca
                                       przetargu                                           przetargu           nieruchomości

 1.    Lokal mieszkalny położony      Osoby dopuszczone - 1           96.000,00 zł         96.960,00 zł.       Michał Andruszkiewicz
       w budynku przy ul. Generała    Osoby nie dopuszczone - 0
       Bema 57/2 o pow. 49,80 m2
       oraz udział 13/100 w działce
       Nr 28 , o pow. 0,4366 ha,
       obręb 1, dla której prowadzona
       jest w Sądzie Rejonowym
       księga wieczysta OL1Y ….

Informację wywieszono na tablicy ogłoszeń Urzędu Miasta Bartoszyce na okres 7 dni tj. w dniach od 24.04.2026 do 04.05.2026 r. zgodnie z § 12
Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (t.j. Dz. U 2021r. poz. 2213).

                                                                                                                           Burmistrz Miasta
                                                                                                                            Wiesław Kurach
`;

const TOPOLOWA_WYNIK = `Informacja o wyniku I przetargu ustnego nieograniczonego
przeprowadzonego w dniu 5 marca 2026 r. w Sali nr 9 Urzędu Miasta Bartoszyce, ul. Boh. Monte Cassino 1 w Bartoszycach, na sprzedaż
nieruchomości pod zabudowę mieszkaniową jednorodzinną, położonych przy ul. Topolowej i ul. Poprzecznej w Bartoszycach.

 Lp.   Oznaczenie               Liczba osób dopuszczonych i nie        Cena wywoławcza      Najwyższa cena      Imię i nazwisko osoby
       nieruchomości wg         dopuszczonych do przetargu             nieruchomości        osiągnięta w        ustalonej jako nabywca
       katastru nieruchomości                                                               przetargu           nieruchomości
       i KW

 1.    Działka nr 409 pow.      Osoby dopuszczone - 4                  74.000,00 zł         80.000,00 zł        Radosław Matuszyk
       0,1035 ha ul. Topolowa   Osoby nie dopuszczone - 0
       KW OL1Y/00011702/1

 2.    Działka nr 410 pow.      Osoby dopuszczone - 4                  73.000,00 zł         74.000,00 zł        Marta i Rafał Jurkowscy
       0,1129 ha ul.            Osoby nie dopuszczone - 0
       Poprzeczna KW
       OL1Y/000110702/1

Informację wywieszono na tablicy ogłoszeń Urzędu Miasta Bartoszyce na okres 7 dni tj. w dniach od 13.03.2026 do 19.03.2026 r. zgodnie z § 12
Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (t.j. Dz. U 2021r. poz. 2213).

Burmistrz Miasta Bartoszyce
Wiesław Kurach
`;

const PILECKIEGO_II_WYNIK = `Informacja o wyniku II przetargu ustnego nieograniczonego
przeprowadzonego w dniu 7 lipca 2026r. w Sali nr 9 Urzędu Miasta Bartoszyce, ul. Boh. Monte Cassino 1 w Bartoszycach, na sprzedaż
nieruchomości pod zabudowę mieszkalną jednorodzinną, położonych przy ul. Rotmistrza Witolda Pileckiego w Bartoszycach.
 Lp.    Oznaczenie nieruchomości wg        Liczba osób dopuszczonych i Cena wywoławcza        Najwyższa cena     Imię i nazwisko osoby
        katastru nieruchomości i KW        nie dopuszczonych do        nieruchomości          osiągnięta w       ustalonej jako nabywca
                                           przetargu                                          przetargu          nieruchomości
     1. Działka nr 458 pow. 0,1629 ha ul.  Osoby dopuszczone - 0       92.800,00 zł                              Działka nie została zbyta
        Rotmistrza Witolda Pileckiego KW   Osoby nie dopuszczone - 0
        OL1Y/000……/..
     2. Działka nr 457 pow. 0,1727 ha ul.  Osoby dopuszczone - 0       98.400,00 zł                              Działka nie została zbyta
        Rotmistrza Witolda Pileckiego KW   Osoby nie dopuszczone - 0
        OL1Y/000……/..
     3. Działka nr 456 pow. 0,1724 ha ul.  Osoby dopuszczone - 0       98.000,00 zł                              Działka nie została zbyta
        Rotmistrza Witolda Pileckiego KW   Osoby nie dopuszczone - 0
        OL1Y/000……./..
     4. Działka nr 455 pow. 0,2223 ha ul.  Osoby dopuszczone - 0       121.600,00 zł                             Działka nie została zbyta
        Rotmistrza Witolda Pileckiego KW   Osoby nie dopuszczone - 0
        OL1Y/000……./..
     5. Działka nr 454 pow. 0,2141 ha ul.  Osoby dopuszczone - 0       117.200,00 zł                             Działka nie została zbyta
        Rotmistrza Witolda Pileckiego KW   Osoby nie dopuszczone - 0
        OL1Y/000……./...
Informację wywieszono na tablicy ogłoszeń Urzędu Miasta Bartoszyce na okres 7 dni tj. w dniach od 15.07.2026 do 21.07.2026 r. zgodnie z § 12
Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (t.j. Dz. U 2021r. poz. 2213).

Burmistrz Miasta Bartoszyce
Wiesław Kurach
`;

const GDANSKA_WYNIK = `Informacja o wyniku I przetargu ustnego nieograniczonego
przeprowadzonego w dniu 1 października 2026 r. w Sali nr 9 Urzędu Miasta Bartoszyce, ul. Boh. Monte Cassino 1 w Bartoszycach,
na sprzedaż nieruchomości składającej się z działek Nr 431 i Nr 432, położonej przy ul. Gdańskiej w Bartoszycach, przeznaczonej pod
usługi rzemiosła i handlu.
 Lp.   Oznaczenie                Liczba osób dopuszczonych i nie Cena wywoławcza            Najwyższa cena      Imię i nazwisko osoby/
       nieruchomości wg          dopuszczonych do przetargu      nieruchomości              osiągnięta w        firmy ustalonej jako
       katastru nieruchomości                                                               przetargu           nabywca nieruchomości
       i KW

 1.    Działka nr 431 i nr 432   Osoby dopuszczone - 2                 363.000,00 zł        366.630,00 zł       Arkadiusz i Izabela
       o pow. 0,7183 ha                                                                                         Gołombiewscy
                                 Osoby nie dopuszczone - 0
       ul. Gdańska KW
       OL1Y/00… /…

Informację wywieszono na tablicy ogłoszeń Urzędu Miasta Bartoszyce na okres 7 dni tj. w dniach od 9.10.2026 do 15.10.2026 r. zgodnie z § 12
Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (t.j. Dz. U 2021 r. poz. 2213).

Burmistrz
Wiesław Kurach
`;

const BEMA_OGLOSZENIE = `                                    Ogłoszenie o przetargu

       Burmistrz Miasta Bartoszyce ogłasza I przetarg ustny nieograniczony na sprzedaż
                                             nieruchomości

I.Oznaczenie nieruchomości, powierzchnia i cena wywoławcza do I przetargu
        Przedmiotem przetargu jest lokal mieszkalny Nr 2 o pow. 49,80 m2, położony w budynku
        przy ul. Generała Bema 57 w Bartoszycach oraz udział 13/100 w częściach wspólnych
        budynku i współwłasności działki na której znajduje się budynek.
        Cena wywoławcza do I przetargu. 96.000,00 zł.

II.Opis nieruchomości i przeznaczenie
     1. Przedmiot sprzedaży – lokal mieszkalny nr 2 o powierzchni 49,80 m2, położony w budynku
        mieszkalnym przy ul. Generała Bema 57 w Bartoszycach.

IV.Termin przetargu, wysokość wadium:
      1. Przetarg odbędzie się dnia 16 kwietnia 2026 r. o godz. 900 w pok. Nr 9, Urzędu Miasta
         Bartoszyce ( Urząd Stanu Cywilnego).
      2. Osoby przystępujące do przetargu winny wpłacić wadium w pieniądzu w wys. 15.000,00 zł.
`;

const WARSZAWSKA_OGLOSZENIE = `                          OGŁOSZENIE O PRZETARGU
                BURMISTRZ MIASTA BARTOSZYCE O G Ł A S Z A
                 II PRZETARG USTNY NIEOGRANICZONY NA ZBYCIE
                               NIERUCHOMOSCI

I. Oznaczenie nieruchomości objętej przetargiem, powierzchnia i cena wywoławcza do
   II przetargu
   Lokal mieszkalny Nr 3 o pow. 42,06 m2, położony w budynku przy ul. Warszawskiej 14
   w Bartoszycach, KW OL1Y/00016122/6 oraz udział 95/1000 w częściach wspólnych budynku.
   Cena wywoławcza do II przetargu 120.000,00 zł.

IV. Termin II przetargu
II Przetarg odbędzie się dnia 4 lipca 2024 r. o godz. 900 w pok. Nr 9 Urzędu Miasta.
Wys. 20.000,00 zł. do dnia 28 czerwca 2024 r.
`;

const SLOWACKIEGO_OGLOSZENIE = `OGŁOSZENIE O PRZETARGU
BURMISTRZ MIASTA BARTOSZYCE OGŁASZA
I PRZETARG USTNY NIEOGRANICZONY NA SPRZEDAŻ
NIERUCHOMOSCI

I.      Oznaczenie nieruchomości, powierzchnia i cena wywoławcza do I przetargu
        Przedmiotem przetargu jest nieruchomość lokalowa - lokal mieszkalny Nr 50 o pow.
        36,06 m2, położony w budynku przy ul. Słowackiego 28 w Bartoszycach, KW
        OL1Y/32932/5 oraz udział 15/1000 w częściach wspólnych budynku.
        Cena wywoławcza do I przetargu. 120.000,00 zł.

IV. Termin przetargu, wysokość wadium:
1. Przetarg odbędzie się dnia 12.06.2025 r. o godz. 900 w pok. Nr 17C, Urzędu Miasta
    Bartoszyce ( Sala narad).
`;

const KONOPNICKIEJ_OGLOSZENIE = `                        OGŁOSZENIE O PRZETARGU
                 BURMISTRZ MIASTA BARTOSZYCE O G Ł A S Z A
                  I PRZETARG USTNY NIEOGRANICZONY NA ZBYCIE
                                NIERUCHOMOSCI

 I. Oznaczenie nieruchomości objętej przetargiem, powierzchnia i cena wywoławcza do
    I przetargu
    Nieruchomość lokalowa - lokal mieszkalny Nr 4A o pow. 39,40 m2, położony w budynku przy
    ul. Konopnickiej 4,5,6,7 w wejściu oznaczonym Nr 6 w Bartoszycach, KW OL1Y/00025124/6.
    Cena wywoławcza 99.000,00 zł.

IV.     Informacje dodatkowe
Przetarg odbędzie się dnia 7 września 2023 r. o godz. 900 w pok. Nr 9 Urzędu Miasta.
`;

const PILECKIEGO_OGLOSZENIE = `                                         Ogłoszenie o przetargu

            Burmistrz Miasta Bartoszyce ogłasza III przetarg ustny nieograniczony na sprzedaż
                                            nieruchomości

I.        Oznaczenie nieruchomości, powierzchnia i cena wywoławcza do III przetargu.
                                                                                            Cena
                Nr                           Klasyfikacja                             wywoławcza do
     L.p.                Powierzchnia                             Położenie
              działki                         gruntów                                  III przetargu
                                                                                            netto
      1        458        0,1629 ha       PsIV   0,0499 ha   ul. Rotmistrza Witolda    64.900,00 zł
                                          Ps V   0,1130 ha          Pileckiego
      2        457        0,1727 ha       Ls V   0,0981 ha   ul. Rotmistrza Witolda    68.900,00 zł
                                          PsIV   0,0090 ha          Pileckiego
                                          Ps V   0,0175 ha
                                          RV     0,0481 ha
      3        456        0,1724 ha       Ls V   0,1049 ha   ul. Rotmistrza Witolda    68.600,00 zł
                                          Ps V   0,0675 ha          Pileckiego
      4        455        0,2223 ha       Ls V   0,1264 ha   ul. Rotmistrza Witolda    85.100,00 zł
                                          RV     0,0959 ha          Pileckiego
      5        454        0,2141 ha       Ls V   0,0423 ha   ul. Rotmistrza Witolda    82.000,00 zł
                                          PsIV   0,0475 ha          Pileckiego
                                          Ps V   0,0113 ha
                                          RV     0,1130 ha

IV. Termin przetargu, wysokość wadium:
Przetarg odbędzie się dnia 25 listopada 2026 r. o godz. 1000 w sali Nr 9 Urzędu Miasta.
`;

const LEASE_FIXTURE = `Burmistrz Miasta Bartoszyce ogłasza I przetarg ustny nieograniczony na oddanie w dzierżawę części nieruchomości położonej przy Placu Konstytucji 3 Maja w Bartoszycach w celu lokalizacji ogródków gastronomicznych`;

// ── TESTS ────────────────────────────────────────────────────────────────────

test('parsePLN handles varied Polish currency formats', () => {
  assert.equal(parsePLN('96.000,00 zł'), 96000);
  assert.equal(parsePLN('96.960,00 zł.'), 96960);
  assert.equal(parsePLN('120 000,00 zł'), 120000);
  assert.equal(parsePLN('363.000,00'), 363000);
  assert.equal(parsePLN('85 100,00 zł'), 85100);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

test('haToM2 converts hectares to integer square meters', () => {
  assert.equal(haToM2('0,1629 ha'), 1629);
  assert.equal(haToM2('0,1727 ha'), 1727);
  assert.equal(haToM2('0,7183 ha'), 7183);
  assert.equal(haToM2('0.1035 ha'), 1035);
  assert.equal(haToM2(''), null);
});

test('parseAreaM2 parses square meters into float', () => {
  assert.equal(parseAreaM2('49,80 m2'), 49.8);
  assert.equal(parseAreaM2('42,06 m2'), 42.06);
  assert.equal(parseAreaM2('36,06'), 36.06);
  assert.equal(parseAreaM2(''), null);
});

test('monthNum maps Polish genitive months to 1-12', () => {
  assert.equal(monthNum('stycznia'), 1);
  assert.equal(monthNum('kwietnia'), 4);
  assert.equal(monthNum('lipca'), 7);
  assert.equal(monthNum('października'), 10);
  assert.equal(monthNum('listopada'), 11);
  assert.equal(monthNum('grudnia'), 12);
  assert.equal(monthNum('foobar'), null);
});

test('announceRoundFromText handles Roman numerals and Polish words', () => {
  assert.equal(announceRoundFromText('ogłasza I przetarg ustny'), 1);
  assert.equal(announceRoundFromText('ogłasza II przetarg ustny'), 2);
  assert.equal(announceRoundFromText('ogłasza III przetarg ustny'), 3);
  assert.equal(announceRoundFromText('ogłasza IV przetarg ustny'), 4);
  assert.equal(announceRoundFromText('ogłoszenie o pierwszym przetargu'), 1);
  assert.equal(announceRoundFromText('ogłoszenie o drugim przetargu'), 2);
  assert.equal(announceRoundFromText('ogłoszenie o trzecim przetargu'), 3);
});

test('announceDateFromText and resultDateFromText extract ISO dates', () => {
  assert.equal(announceDateFromText(BEMA_OGLOSZENIE), '2026-04-16');
  assert.equal(announceDateFromText(WARSZAWSKA_OGLOSZENIE), '2024-07-04');
  assert.equal(announceDateFromText(SLOWACKIEGO_OGLOSZENIE), '2025-06-12');
  assert.equal(announceDateFromText(KONOPNICKIEJ_OGLOSZENIE), '2023-09-07');
  assert.equal(announceDateFromText(PILECKIEGO_OGLOSZENIE), '2026-11-25');

  assert.equal(resultDateFromText(BEMA_WYNIK), '2026-04-16');
  assert.equal(resultDateFromText(TOPOLOWA_WYNIK), '2026-03-05');
  assert.equal(resultDateFromText(PILECKIEGO_II_WYNIK), '2026-07-07');
  assert.equal(resultDateFromText(GDANSKA_WYNIK), '2026-10-01');
});

test('gates classify correctly', () => {
  assert.equal(isLease(LEASE_FIXTURE), true);
  assert.equal(isLease(BEMA_OGLOSZENIE), false);
  assert.equal(isLease(TOPOLOWA_WYNIK), false);

  assert.equal(isResultNotice(BEMA_WYNIK), true);
  assert.equal(isResultNotice(TOPOLOWA_WYNIK), true);
  assert.equal(isResultNotice(BEMA_OGLOSZENIE), false);

  assert.equal(isAnnouncementNotice(BEMA_OGLOSZENIE), true);
  assert.equal(isAnnouncementNotice(BEMA_WYNIK), false);

  assert.equal(isNegativeOutcome('Działka nie została zbyta'), true);
  assert.equal(isNegativeOutcome('przetarg zakończył się wynikiem negatywnym'), true);
  assert.equal(isNegativeOutcome('Michał Andruszkiewicz 96.960,00 zł'), false);
});

test('announceFlatAddressRaw resolves addresses correctly', () => {
  assert.equal(announceFlatAddressRaw(BEMA_OGLOSZENIE), 'ul. Generała Bema 57/2');
  assert.equal(announceFlatAddressRaw(WARSZAWSKA_OGLOSZENIE), 'ul. Warszawskiej 14/3');
  assert.equal(announceFlatAddressRaw(SLOWACKIEGO_OGLOSZENIE), 'ul. Słowackiego 28/50');
  assert.equal(announceFlatAddressRaw(KONOPNICKIEJ_OGLOSZENIE), 'ul. Konopnickiej 6/4A');
});

test('parseAnnouncement parses flat announcements correctly', () => {
  const bema = parseAnnouncement(BEMA_OGLOSZENIE, { pdfUrl: 'https://bip.bartoszyce.pl/bema.pdf' });
  assert.equal(bema.length, 1);
  assert.equal(bema[0].kind, 'mieszkalny');
  assert.equal(bema[0].address_raw, 'ul. Generała Bema 57/2');
  assert.equal(bema[0].address.street, 'Generała Bema');
  assert.equal(bema[0].address.building, '57');
  assert.equal(bema[0].address.apt, '2');
  assert.equal(bema[0].area_m2, 49.8);
  assert.equal(bema[0].starting_price_pln, 96000);
  assert.equal(bema[0].auction_date, '2026-04-16');
  assert.equal(bema[0].round, 1);

  const warszawska = parseAnnouncement(WARSZAWSKA_OGLOSZENIE);
  assert.equal(warszawska.length, 1);
  assert.equal(warszawska[0].kind, 'mieszkalny');
  assert.equal(warszawska[0].address.building, '14');
  assert.equal(warszawska[0].address.apt, '3');
  assert.equal(warszawska[0].area_m2, 42.06);
  assert.equal(warszawska[0].starting_price_pln, 120000);
  assert.equal(warszawska[0].auction_date, '2024-07-04');
  assert.equal(warszawska[0].round, 2);

  const slowackiego = parseAnnouncement(SLOWACKIEGO_OGLOSZENIE);
  assert.equal(slowackiego.length, 1);
  assert.equal(slowackiego[0].kind, 'mieszkalny');
  assert.equal(slowackiego[0].address.building, '28');
  assert.equal(slowackiego[0].address.apt, '50');
  assert.equal(slowackiego[0].area_m2, 36.06);
  assert.equal(slowackiego[0].starting_price_pln, 120000);
  assert.equal(slowackiego[0].auction_date, '2025-06-12');
  assert.equal(slowackiego[0].round, 1);

  const konopnickiej = parseAnnouncement(KONOPNICKIEJ_OGLOSZENIE);
  assert.equal(konopnickiej.length, 1);
  assert.equal(konopnickiej[0].kind, 'mieszkalny');
  assert.equal(konopnickiej[0].address.street, 'Konopnickiej');
  assert.equal(konopnickiej[0].address.building, '6');
  assert.equal(konopnickiej[0].address.apt, '4A');
  assert.equal(konopnickiej[0].area_m2, 39.4);
  assert.equal(konopnickiej[0].starting_price_pln, 99000);
  assert.equal(konopnickiej[0].auction_date, '2023-09-07');
  assert.equal(konopnickiej[0].round, 1);
});

test('parseAnnouncement parses multi-parcel land announcement', () => {
  const pileckiego = parseAnnouncement(PILECKIEGO_OGLOSZENIE, { pdfUrl: 'https://bip.bartoszyce.pl/pileckiego.pdf' });
  assert.equal(pileckiego.length, 5);
  for (const r of pileckiego) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.auction_date, '2026-11-25');
    assert.equal(r.round, 3);
  }
  assert.equal(pileckiego[0].dzialka_nr, '458');
  assert.equal(pileckiego[0].area_m2, 1629);
  assert.equal(pileckiego[0].starting_price_pln, 64900);

  assert.equal(pileckiego[1].dzialka_nr, '457');
  assert.equal(pileckiego[1].area_m2, 1727);
  assert.equal(pileckiego[1].starting_price_pln, 68900);

  assert.equal(pileckiego[2].dzialka_nr, '456');
  assert.equal(pileckiego[2].area_m2, 1724);
  assert.equal(pileckiego[2].starting_price_pln, 68600);

  assert.equal(pileckiego[3].dzialka_nr, '455');
  assert.equal(pileckiego[3].area_m2, 2223);
  assert.equal(pileckiego[3].starting_price_pln, 85100);

  assert.equal(pileckiego[4].dzialka_nr, '454');
  assert.equal(pileckiego[4].area_m2, 2141);
  assert.equal(pileckiego[4].starting_price_pln, 82000);
});

test('parseAnnouncement drops lease announcements', () => {
  const lease = parseAnnouncement(LEASE_FIXTURE);
  assert.deepEqual(lease, []);
});

test('parseResultDoc parses flat result notice (sold)', () => {
  const recs = parseResultDoc(BEMA_WYNIK, null, 'https://bip.bartoszyce.pl/bema-wynik.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.auction_date, '2026-04-16');
  assert.equal(r.address.street, 'Generała Bema');
  assert.equal(r.address.building, '57');
  assert.equal(r.address.apt, '2');
  assert.equal(r.starting_price_pln, 96000);
  assert.equal(r.final_price_pln, 96960);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 49.8);
});

test('parseResultDoc parses land result notices (sold)', () => {
  const topolowa = parseResultDoc(TOPOLOWA_WYNIK);
  assert.equal(topolowa.length, 2);
  assert.equal(topolowa[0].kind, 'grunt');
  assert.equal(topolowa[0].dzialka_nr, '409');
  assert.equal(topolowa[0].area_m2, 1035);
  assert.equal(topolowa[0].starting_price_pln, 74000);
  assert.equal(topolowa[0].final_price_pln, 80000);
  assert.equal(topolowa[0].outcome, 'sold');

  assert.equal(topolowa[1].kind, 'grunt');
  assert.equal(topolowa[1].dzialka_nr, '410');
  assert.equal(topolowa[1].area_m2, 1129);
  assert.equal(topolowa[1].starting_price_pln, 73000);
  assert.equal(topolowa[1].final_price_pln, 74000);
  assert.equal(topolowa[1].outcome, 'sold');

  const gdanska = parseResultDoc(GDANSKA_WYNIK);
  assert.equal(gdanska.length, 1);
  assert.equal(gdanska[0].kind, 'grunt');
  assert.equal(gdanska[0].dzialka_nr, '431 i nr 432');
  assert.equal(gdanska[0].area_m2, 7183);
  assert.equal(gdanska[0].starting_price_pln, 363000);
  assert.equal(gdanska[0].final_price_pln, 366630);
  assert.equal(gdanska[0].outcome, 'sold');
});

test('parseResultDoc parses multi-row land result notices (all unsold)', () => {
  const pileckiego = parseResultDoc(PILECKIEGO_II_WYNIK);
  assert.equal(pileckiego.length, 5);
  for (const r of pileckiego) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.auction_date, '2026-07-07');
    assert.equal(r.outcome, 'unsold');
    assert.equal(r.final_price_pln, null);
    assert.equal(r.unsold_reason, 'unknown');
  }
  assert.equal(pileckiego[0].dzialka_nr, '458');
  assert.equal(pileckiego[0].starting_price_pln, 92800);

  assert.equal(pileckiego[1].dzialka_nr, '457');
  assert.equal(pileckiego[1].starting_price_pln, 98400);

  assert.equal(pileckiego[2].dzialka_nr, '456');
  assert.equal(pileckiego[2].starting_price_pln, 98000);

  assert.equal(pileckiego[3].dzialka_nr, '455');
  assert.equal(pileckiego[3].starting_price_pln, 121600);

  assert.equal(pileckiego[4].dzialka_nr, '454');
  assert.equal(pileckiego[4].starting_price_pln, 117200);
});

test('crawl helpers parse HTML and classify attachments', () => {
  const sampleBoardHtml = `
    <div class="information">
      <p class="phx ph3">
        <a href="https://bip.bartoszyce.pl/160/3472/Burmistrz_Miasta/">Ogłoszenie o III przetargu</a>
      </p>
    </div>
  `;
  const entries = parseInformationList(sampleBoardHtml);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, 'https://bip.bartoszyce.pl/160/3472/Burmistrz_Miasta/');
  assert.equal(entries[0].title, 'Ogłoszenie o III przetargu');

  const sampleEntryHtml = `
    <a href="/system/pobierz.php?plik=Ogloszenie_o_III_przetargu.pdf&amp;id=123&amp;stats=true">Ogłoszenie</a>
    <a href="/system/pobierz.php?plik=Regulamin.pdf&amp;id=456&amp;stats=true">Regulamin</a>
  `;
  const atts = parseAttachments(sampleEntryHtml);
  assert.equal(atts.length, 2);
  assert.equal(atts[0].filename, 'Ogloszenie_o_III_przetargu.pdf');
  assert.equal(atts[0].url, 'https://bip.bartoszyce.pl/system/pobierz.php?plik=Ogloszenie_o_III_przetargu.pdf&id=123&stats=true');

  assert.equal(isOgloszenieAttachment('Ogloszenie_o_III_przetargu.pdf', 'Ogłoszenie o przetargu'), true);
  assert.equal(isOgloszenieAttachment('Regulamin.pdf', 'Ogłoszenie o przetargu'), false);

  assert.equal(isWynikAttachment('2026.04.24_Informacja_o_wyniku_I_przetargu.pdf', 'Informacja o wyniku'), true);
  assert.equal(isWynikAttachment('Ogloszenie_o_III_przetargu.pdf', 'Ogłoszenie'), false);
});
