import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  hasResolution,
  isResultNotice,
  isLease,
  isNegativeOutcome,
  kindFromText,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  obrebFromText,
  addressRawFromText,
  parsePLN,
} from '../src/cities/trzebnica/parse.js';
import { parseBoardPage } from '../src/cities/trzebnica/crawl.js';


const BOLESCIN_FIELDS = {
  adres: 'Boleścin',
  rodzaj: 'Lokal mieszkalny',
  cena: '149.450,00 zł. ',
  data: '10                                .08                                .2026  godz. 08:30',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'I przetarg ustny nieograniczony nr GGN P/14/2026 na sprzedaż prawa własności nieruchomości stanowiących własność Gminy Trzebnica położonych w obrębie wsi Boleścin.',
};

const BOLESCIN_OGLOSZENIE = `                                                        OGŁOSZENIE O PRZETARGU NR GGN P/14/2026

      Burmistrz Gminy Trzebnica, działając na podstawie art. 38 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2024 r. poz. 1145,
      ze zm.) rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
      nieruchomości (Dz. U. z 2021 r. poz. 2213, ze zm.) oraz zgodnie z zarządzeniem Burmistrza Gminy Trzebnica nr OR.0050.225.2025 z dnia 18 listopada
      2025 r. ogłasza I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości stanowiących własność Gminy Trzebnica, przedstawionych
      w tabeli poniżej. Nieruchomości objęte wykazem: GGN/38/2025 opublikowanym w terminie od 19 listopada 2025 r. do 31 grudnia 2025 r.
                 Oznaczenie nieruchomości
                         wg katastru                                                                                                                              Cena
                                                                                                      Przeznaczenie nieruchomości                  Termin                       Wysokość     Termin
                     i księgi wieczystej                                                                                                                       wywoławcza
Położenie                                                  Opis nieruchomości                              (MPZP / studium /                      przetargu                     wadium      wniesienia
            Numer          Numer księgi   Pow.                                                                                                                   netto
                                                                                                              decyzja WZ)                                                         (zł)       wadium
            działki          wieczystej   (ha)                                                                                                                     (zł)

                                                                                                      Dla obszaru, na którym położona jest
             51/11                                  Lokal mieszkalny nr 2, położony na 1                 nieruchomość - brak jest MPZP.
                      WR1W/00027552/9    0,1099
                                                    piętrze budynku, składa się z 6 pokoi i      Zgodnie z studium uwarunkowań i kierunków
                                                   kuchni o łącznej powierzchni użytkowej       zagospodarowania przestrzennego - uchwała nr
                                                         93,40 m² oraz z 4 pomieszczeń               V/31/24 Rady Miejskiej w Trzebnicy:
                                                    gospodarczych o łącznej powierzchni           - dz. nr 51/13 leży na obszarze oznaczonym
                      WR1W/00027554/3                                                              symbolem RU- tereny obsługi produkcji w
                                                                   108,80 m².
                      WR1W/00047730/7                                                                gospodarstwach rolnych hodowlanych,
                                                        Z lokalem związany jest udział         ogrodniczych oraz gospodarstw rolnych i leśnych,
             51/13        (KW dla        0,0471   3388/10000 w nieruchomości wspólnej.            - dz. nr 51/11 leży na obszarze oznaczonym
                       nieruchomości              Z lokalem mieszkalnym nr 2 związane są           symbolem RU- tereny obsługi produkcji w
                         lokalowej)                również udziały: 1456/10000 w działce             gospodarstwach rolnych hodowlanych,
Boleścin                                             mieszkalnym), udział 1456/10000 w             leśnych, M – tereny o dominującej funkcji
                                                                                                                                                  10.08.2026    149.450,00      14.945,00   04.08.2026
 50/2                                                                                           mieszkaniowej, KD-DG- tereny dróg gminnych,`;

const KOBYLICE_FIELDS = {
  adres: 'Kobylice ',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: '215.700,00 zł ',
  data: '11                                .08                                .2026  godz. 09:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'III przetarg ustny nieograniczony nr GGN P /15/2026 na sprzedaż prawa własności nieruchomości stanowiącej własność Gminy Trzebnica położonej w obrębie wsi Kobylice.',
};

const KOBYLICE_OGLOSZENIE = `                                                                 OGŁOSZENIE O PRZETARGU NR GGN P/15/2026

        Burmistrz Gminy Trzebnica, działając na podstawie art. 38 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
        (Dz. U. z 2026 r. poz. 399), rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów
        oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213, ze zm.) oraz zgodnie z zarządzeniem Burmistrza Gminy Trzebnica
        nr OR.0050.41.2025 z dnia 26 lutego 2025 r., ogłasza III przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości stanowiącej
        własność Gminy Trzebnica położonej w obrębie wsi Kobylice, przedstawionej w tabeli poniżej. Nieruchomość objęta wykazem: GGN/5/2026
        opublikowanym w terminie: 06 lutego 2026 r. – 20 marca 2026 r.
                   Oznaczenie nieruchomości
                                                                                                                                                                            Cena
                  wg katastru i księgi wieczystej
                                                                                                                       Przeznaczenie nieruchomości                       wywoławcz      Wysokość     Termin
                                           Pow.                                                                                                              Termin
Lp   Położenie     Nr      Nr księgi                                   Opis nieruchomości                                   (MPZP / studium /                             a działki     Wadium      wniesienia
                                          gruntu                                                                                                            przetargu
                 działki wieczystej                                                                                            decyzja WZ)                                 - netto        (zł)       wadium
                                           (ha)
                                                                                                                                                                              (zł)



                                                       Nieruchomość niezabudowana, położona w południowej
                                                    części obrębu Kobylice, przy granicy z obrębem Księginice, w
                                                     bezpośrednim sąsiedztwie terenów niezabudowanych, sadów
                                                       oraz zabudowy mieszkaniowej jednorodzinnej. Długość
                                                    działki wynosi ok. 181 m, szerokość od ok. 19 m do ok. 24 m.       Zgodnie z uchwałą nr XLV/458/22
                                                      Działka nieogrodzona, o nierównym ukształtowaniu terenu,        Rady Miejskiej w Trzebnicy z dnia
                                                        nieuzbrojona w media; sieci infrastruktury technicznej        29.11.2022 r. w sprawie uchwalenia
                                                                zlokalizowane są w dalszej odległości.               miejscowego planu zagospodarowania
                           WR1W/                                                                                          przestrzennego wsi Kobylice
                  1/2                                Działka posiada dostęp do drogi publicznej poprzez gminną                      - część A
1                         00015820/      0,3873
     Kobylice    AM-1                               drogę wewnętrzną (działka nr 258), o nawierzchni gruntowej,                                            11.08.2026    215.700,00     21.570,00   05.08.2026
                              2                       nieurządzonej. Najbliższa droga publiczna znajduje się w          MNA2.13 – tereny zabudowy
                                                               odległości ok. 360 m od działki nr 1/2.                 mieszkaniowej jednorodzinnej,       godz. 09:00`;

const SZCZYTKOWICE_FIELDS = {
  adres: 'Szczytkowice',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: 'l.p.1  - 158.700,00 zł.         lp.2 -  188.400,00 zł. ',
  data: '09                                .06                                .2026 ',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'I przetarg ustny nieograniczony nr GGN P/10/2026 na sprzedaż prawa własności nieruchomości stanowiących własność Gminy Trzebnica położonych w obrębie Szczytkowice.',
};

const SZCZYTKOWICE_49_1_WYNIK = `                        INFORMACJA O WYNIKU PRZETARGU
                                 GGN P /10/2026

 Data i miejsce przeprowadzonego przetargu:

 09.06.2026 rok, Urząd Miejski w Trzebnicy

 Rodzaj przeprowadzonego przetargu:

 I przetarg ustny nieograniczony

 Oznaczenie nieruchomości będącej przedmiotem przetargu według katastru
 nieruchomości:
 Szczytkowice, dz. nr 49/1
 Oznaczenie nieruchomości będącej przedmiotem przetargu według księgi wieczystej:

 WR1W/00015849/1

 Liczba osób dopuszczonych do uczestniczenia w przetargu:
 0

 Liczba osób niedopuszczonych do uczestniczenia w przetargu:

 Brak.

 Cena wywoławcza nieruchomości:

 158.700,00 zł
 Najwyższa cena osiągnięta w przetargu:
 Brak.
 Imię, nazwisko albo nazwa lub firma osoby ustalonej jako nabywca nieruchomości:

 Nie dotyczy. Przetarg zakończony wynikiem negatywnym.




Sporządziła: Natalia Pamuła
`;

const SZCZYTKOWICE_49_2_WYNIK = `                        INFORMACJA O WYNIKU PRZETARGU
                                 GGN P /10/2026

 Data i miejsce przeprowadzonego przetargu:

 09.06.2026 rok, Urząd Miejski w Trzebnicy

 Rodzaj przeprowadzonego przetargu:

 I przetarg ustny nieograniczony

 Oznaczenie nieruchomości będącej przedmiotem przetargu według katastru
 nieruchomości:
 Szczytkowice, dz. nr 49/2
 Oznaczenie nieruchomości będącej przedmiotem przetargu według księgi wieczystej:

 WR1W/00015849/1

 Liczba osób dopuszczonych do uczestniczenia w przetargu:
 0

 Liczba osób niedopuszczonych do uczestniczenia w przetargu:

 Brak.

 Cena wywoławcza nieruchomości:

 188.400,00 zł
 Najwyższa cena osiągnięta w przetargu:
 Brak.
 Imię, nazwisko albo nazwa lub firma osoby ustalonej jako nabywca nieruchomości:

 Nie dotyczy. Przetarg zakończony wynikiem negatywnym.




Sporządziła: Natalia Pamuła
`;

const KOBYLICE_MISLABELED_ATTACHMENT_BODY = `                                                                  OGŁOSZENIE O PRZETARGU NR GGN P/9/2026

        Burmistrz Gminy Trzebnica, działając na podstawie art. 38 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
        (Dz. U. z 2026 r. poz. 399), rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów
        oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213, ze zm.) oraz zgodnie z zarządzeniem Burmistrza Gminy Trzebnica
        nr OR.0050.41.2025 z dnia 26 lutego 2025 r., ogłasza I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości stanowiącej własność
        Gminy Trzebnica położonej w obrębie wsi Kobylice, przedstawionej w tabeli poniżej. Nieruchomość objęta wykazem: GGN/5/2026 opublikowanym w
        terminie: 06 lutego 2026 r. – 20 marca 2026 r.`;

const SYNTHETIC_LEASE_FIELDS = {
  adres: 'Ujeździec Wielki',
  rodzaj: 'Nieruchomość zabudowana',
  cena: '900,00 zł/brutto/rocznie',
  data: '15                                .09                                .2026  godz. 09:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'Pierwszy przetarg ustny nieograniczony na najem garażu zlokalizowanego na działce nr 12 w miejscowości Ujeździec Wielki. Okres dzierżawy 3 lata.',
};


test('parsePLN: dot-thousands, space-thousands, grosze tail', () => {
  assert.equal(parsePLN('149.450,00'), 149450);
  assert.equal(parsePLN('149.450.00 '), 149450);
  assert.equal(parsePLN('215.700,00'), 215700);
  assert.equal(parsePLN('215 700,00'), 215700);
  assert.equal(parsePLN('364.200,00'), 364200);
  assert.equal(parsePLN('158.700,00'), 158700);
  assert.equal(parsePLN('brak'), null);
});

test('kindFromText: RODZAJ field maps flat/land/built/commercial', () => {
  assert.equal(kindFromText(buildRecordText(BOLESCIN_FIELDS)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(KOBYLICE_FIELDS)), 'grunt');
  assert.equal(kindFromText(buildRecordText(SZCZYTKOWICE_FIELDS)), 'grunt');
});

test('roundFromText: leading Roman numeral in PRZETARGNA (I/III), and the OGLOSZENIE "ogłasza <ROMAN> przetarg" fallback', () => {
  assert.equal(roundFromText(buildRecordText(BOLESCIN_FIELDS)), 1);
  assert.equal(roundFromText(buildRecordText(KOBYLICE_FIELDS)), 3);
  assert.equal(roundFromText(buildRecordText({ ogloszenie: KOBYLICE_OGLOSZENIE })), 3);
});

test('roundFromText: WYNIK ("Rodzaj przeprowadzonego przetargu: I przetarg ...") for concluded records', () => {
  const text = buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_1_WYNIK });
  assert.equal(roundFromText(text), 1);
});

test('auctionDateFromText: spaced-dot DATA field, with and without a "godz." time part', () => {
  assert.equal(auctionDateFromText(buildRecordText(BOLESCIN_FIELDS)), '2026-08-10');
  assert.equal(auctionDateFromText(buildRecordText(KOBYLICE_FIELDS)), '2026-08-11');
  assert.equal(auctionDateFromText(buildRecordText(SZCZYTKOWICE_FIELDS)), '2026-06-09');
});

test('startingPriceFromText: CENA field (dot/space thousands), and WYNIK priority over the shared multi-lot CENA field', () => {
  assert.equal(startingPriceFromText(buildRecordText(BOLESCIN_FIELDS)), 149450);
  assert.equal(startingPriceFromText(buildRecordText(KOBYLICE_FIELDS)), 215700);
  assert.equal(startingPriceFromText(buildRecordText(SZCZYTKOWICE_FIELDS)), 158700);
  assert.equal(
    startingPriceFromText(buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_1_WYNIK })),
    158700,
  );
  assert.equal(
    startingPriceFromText(buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_2_WYNIK })),
    188400,
  );
});

test('achievedPriceFromText / isNegativeOutcome: "Brak." + "Nie dotyczy ... wynikiem negatywnym" => unsold, no achieved price', () => {
  const text = buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_1_WYNIK });
  assert.equal(achievedPriceFromText(text), null);
  assert.equal(isNegativeOutcome(text), true);
});

test('unitAreaFromText: the flat\'s OWN usable area (93,40 m²), never the outbuilding total (108,80 m²)', () => {
  const text = buildRecordText({ ...BOLESCIN_FIELDS, ogloszenie: BOLESCIN_OGLOSZENIE });
  assert.equal(unitAreaFromText(text), 93.4);
});

test('obrebFromText: village name from PRZETARGNA ("w obrębie wsi X")', () => {
  assert.equal(obrebFromText(buildRecordText(BOLESCIN_FIELDS)), 'Boleścin');
  assert.equal(obrebFromText(buildRecordText(KOBYLICE_FIELDS)), 'Kobylice');
});

test('addressRawFromText: village-only flat (no street anywhere) falls back to "<village> 0/<lokalNr>"', () => {
  const text = buildRecordText({ ...BOLESCIN_FIELDS, ogloszenie: BOLESCIN_OGLOSZENIE });
  assert.equal(addressRawFromText(text), 'Boleścin 0/2');
});


test('hasResolution / isResultNotice: pending vs. concluded, and the mislabeled-attachment regression', () => {
  assert.equal(hasResolution(buildRecordText(BOLESCIN_FIELDS)), false);
  const concluded = buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_1_WYNIK });
  assert.equal(hasResolution(concluded), true);
  assert.equal(isResultNotice(SZCZYTKOWICE_49_1_WYNIK), true);
  assert.equal(isResultNotice(KOBYLICE_MISLABELED_ATTACHMENT_BODY), false);
});

test('isLease: synthetic najem/rocznie pattern gates true; real sale fixtures gate false', () => {
  assert.equal(isLease(buildRecordText(SYNTHETIC_LEASE_FIELDS)), true);
  assert.equal(isLease(buildRecordText(BOLESCIN_FIELDS)), false);
  assert.equal(isLease(buildRecordText(KOBYLICE_FIELDS)), false);
});


test('parseAnnouncement: PENDING flat (real fixture, Boleścin GGN P/14/2026)', () => {
  const text = buildRecordText({ ...BOLESCIN_FIELDS, ogloszenie: BOLESCIN_OGLOSZENIE });
  const rec = parseAnnouncement(text);
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Boleścin 0/2');
  assert.equal(rec.address.key, 'bolescin|0|2');
  assert.equal(rec.area_m2, 93.4);
  assert.equal(rec.starting_price_pln, 149450);
  assert.equal(rec.auction_date, '2026-08-10');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: PENDING land (real fixture, Kobylice GGN P/15/2026, round III)', () => {
  const text = buildRecordText({ ...KOBYLICE_FIELDS, ogloszenie: KOBYLICE_OGLOSZENIE });
  const rec = parseAnnouncement(text);
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1/2', 'the SUBJECT parcel, not the "258" access-road neighbour mentioned first');
  assert.equal(rec.area_m2, 3873, '0,3873 ha -> 3873 m²');
  assert.equal(rec.obreb, 'Kobylice');
  assert.equal(rec.address_raw, 'Kobylice');
  assert.equal(rec.starting_price_pln, 215700);
  assert.equal(rec.auction_date, '2026-08-11');
  assert.equal(rec.round, 3);
});

test('parseAnnouncement: without the OGLOSZENIE attachment (historical backfill path), core fields still resolve from board XML alone', () => {
  const rec = parseAnnouncement(buildRecordText(KOBYLICE_FIELDS));
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.starting_price_pln, 215700);
  assert.equal(rec.auction_date, '2026-08-11');
  assert.equal(rec.dzialka_nr, null, 'no OGLOSZENIE fetched -> no parcel number, expected gap');
  assert.equal(rec.address_raw, 'Kobylice', 'still address-identifiable via the bare village name');
});

test('parseAnnouncement: lease (synthetic najem) never reaches an active listing', () => {
  assert.equal(isLease(buildRecordText(SYNTHETIC_LEASE_FIELDS)), true);
});


test('parseResultDoc: Szczytkowice dz 49/1 UNSOLD (real fixture)', () => {
  const text = buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_1_WYNIK });
  const recs = parseResultDoc(text, '2026-06-09', 'https://bip.trzebnica.pl/attachments/download/6929');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '49/1');
  assert.equal(r.obreb, 'Szczytkowice');
  assert.equal(r.starting_price_pln, 158700);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-06-09');
  assert.equal(r.source_url, 'https://bip.trzebnica.pl/attachments/download/6929');
});

test('parseResultDoc: Szczytkowice dz 49/2 UNSOLD — different parcel, different price, same shared board record', () => {
  const text = buildRecordText({ ...SZCZYTKOWICE_FIELDS, wynik: SZCZYTKOWICE_49_2_WYNIK });
  const recs = parseResultDoc(text, '2026-06-09', 'https://bip.trzebnica.pl/attachments/download/6930');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.dzialka_nr, '49/2');
  assert.equal(r.starting_price_pln, 188400, 'own price, not lot 1\'s 158700 from the shared CENA field');
  assert.equal(r.outcome, 'unsold');
});

test('parseResultDoc: a mislabeled attachment (real bug, record 3217/GGN P/9/2026) never fabricates a result', () => {
  const text = buildRecordText({
    adres: 'Kobylice',
    rodzaj: 'Nieruchomość niezabudowana',
    wynik: KOBYLICE_MISLABELED_ATTACHMENT_BODY,
  });
  assert.deepEqual(parseResultDoc(text, null, 'https://bip.trzebnica.pl/attachments/download/6685'), []);
});

test('parseResultDoc: returns [] for a pending record (no WYNIK at all)', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(BOLESCIN_FIELDS), null, 'x'), []);
});


test('parseBoardPage: extracts id + every inline field from real board XML (no per-record fetch needed)', () => {
  const xml = `<artykuly>
    <artykul>
      <url>https://bip.trzebnica.pl/przetarg-nieruchomosci/3445/przetargggnp142026</url>
      <adres-nieruchomosci>Boleścin</adres-nieruchomosci>
      <przetarg-na>I przetarg ustny nieograniczony nr GGN P/14/2026 na sprzedaż prawa własności nieruchomości stanowiących własność Gminy Trzebnica położonych w obrębie wsi Boleścin.</przetarg-na>
      <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
      <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
      <cena-wywolawcza>149.450,00 zł. </cena-wywolawcza>
      <data-przetargu>10                                .08                                .2026  godz. 08:30</data-przetargu>
    </artykul>
    <artykul>
      <url>https://bip.trzebnica.pl/przetarg-nieruchomosci/3245/przetarg-ggn-p-10-2026</url>
      <adres-nieruchomosci>Szczytkowice</adres-nieruchomosci>
      <przetarg-na>I przetarg ustny nieograniczony nr GGN P/10/2026 na sprzedaż prawa własności nieruchomości stanowiących własność Gminy Trzebnica położonych w obrębie Szczytkowice.</przetarg-na>
      <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
      <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
      <cena-wywolawcza>l.p.1  - 158.700,00 zł.         lp.2 -  188.400,00 zł. </cena-wywolawcza>
      <data-przetargu>09                                .06                                .2026 </data-przetargu>
    </artykul>
  </artykuly>`;
  const refs = parseBoardPage(xml);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].id, '3445');
  assert.equal(refs[0].url, 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3445/przetargggnp142026');
  assert.equal(refs[0].rodzaj, 'Lokal mieszkalny');
  assert.equal(refs[0].cena, '149.450,00 zł. ');
  assert.equal(refs[1].id, '3245');
  assert.equal(refs[1].adres, 'Szczytkowice');
});
