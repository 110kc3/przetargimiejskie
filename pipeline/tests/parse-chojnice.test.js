// Chojnice parser unit tests.
// Fixtures groundtruthed against real announcements and results from miastochojnice.pl:
// - Plac Jagielloński 6/5 (lokal mieszkalny: announcement, sold result, and negative result)
// - ul. Drzymały 1C/7 (spółdzielcze własnościowe prawo do lokalu mieszkalnego)
// - ul. Młodzieżowa 7 (lokal użytkowy U2)
// - ul. Szymborskiej/Żeromskiego (działka niezabudowana 3024/6)
// - ul. Żeromskiego (działki niezabudowane 49/11 i 51/12)
// - ul. Zakładowa (multi-offer land notice)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  auctionDateFromText,
  roundFromText,
  wadiumDeadlineToISO,
  extractPriceAndWadium,
  extractOutcomeAndFinalPrice,
  unitAreaFromText,
  plotAreaFromText,
  parcelFromText,
  obrebFromText,
  landStreetFromText,
  extractAddress,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/chojnice/parse.js';

import { extractAttachmentUrl } from '../src/cities/chojnice/crawl.js';

// ----------------------------------------------------------------- title routing

test('title routing: sale announcement vs result notice vs noise', () => {
  assert.equal(
    isAnnouncementTitle('31.03.2026 – przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy Placu Jagiellońskim 6/5.'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('14.08.2024 r. – przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu przy ulicy Drzymały 1 C w Chojnicach'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej ul. Szymborskiej/Żeromskiego dz. nr 3024/6 – 20.10.2026 r.'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('28.01.2025 godz. 10:00 – przetarg ustny nieograniczony na zbycie nieruchomości miejskiej/lokal u2 ul. Młodzieżowa'),
    true,
  );

  // Result notices must NOT match announcement
  assert.equal(
    isAnnouncementTitle('31.03.2026 – Wyniki przetargu na zbycie lokalu mieszkalnego – Pl. Jagielloński 6/5'),
    false,
  );
  assert.equal(
    isResultTitle('31.03.2026 – Wyniki przetargu na zbycie lokalu mieszkalnego – Pl. Jagielloński 6/5'),
    true,
  );
  assert.equal(
    isResultTitle('21.10.2025 – wynik przetargu na lokal mieszkalny'),
    true,
  );
  assert.equal(
    isResultTitle('01.06.2026 – Wyniki przetargu na sprzedaż nieruchomości niezabudowanej – ul. Żeromskiego dz. nr 49/11 i 51/12'),
    true,
  );

  // Lease / rental / non-sale noise must be excluded
  assert.equal(
    isAnnouncementTitle('26.03.2025 – wyniku przetargu ustnego ograniczonego na najem trzech miejsc przeznaczonych na ogródki gastronomiczne'),
    false,
  );
  assert.equal(
    isAnnouncementTitle('06.06.2023 - przetarg na najem pomieszczeń'),
    false,
  );
  assert.equal(
    isAnnouncementTitle('Wykaz nieruchomości przeznaczonych do sprzedaży'),
    false,
  );
});

// --------------------------------------------------------------- unit extractors

test('date extraction from announcement and result text', () => {
  assert.equal(
    auctionDateFromText('Przetarg ustny nieograniczony odbędzie się w dniu 31 marca 2026 r. o godz. 10.00'),
    '2026-03-31',
  );
  assert.equal(
    auctionDateFromText('ogłasza wyniki przetargu na sprzedaż lokalu mieszkalnego, który odbył się w dniu 21 października 2025r.'),
    '2025-10-21',
  );
  assert.equal(
    auctionDateFromText('którego otwarcie ofert oraz rozstrzygniecie nastąpiło 3 lipca 2026 r. w pok. 614'),
    '2026-07-03',
  );
  assert.equal(
    auctionDateFromText('', '31.03.2026 – przetarg ustny nieograniczony'),
    '2026-03-31',
  );
});

test('round extraction: ordinals, roman numerals, and consecutive rounds', () => {
  assert.equal(roundFromText('ogłasza pierwszy przetarg na sprzedaż', ''), 1);
  assert.equal(roundFromText('', 'ogłasza wyniki drugiego przetargu na sprzedaż'), 2);
  assert.equal(roundFromText('1. Drugiego przetargu na sprzedaż nieruchomości', ''), 2);
  assert.equal(
    roundFromText(
      'ogłasza kolejny przetarg na sprzedaż',
      'Poprzednie przetargi odbyły się w dniu 11 września 2025 r., 21 października 2025 r., 28 listopada 2025 r. i zakończyły się wynikiem negatywnym.',
    ),
    4,
  );
});

test('wadium deadline extraction', () => {
  assert.equal(
    wadiumDeadlineToISO('Wadium na przetarg należy wpłacić do dnia 27 marca 2026 r. na konto Urzędu'),
    '2026-03-27',
  );
  assert.equal(
    wadiumDeadlineToISO('Wadium na przetarg należy wpłacić do dnia 14 sierpnia 2024r. na konto Urzędu'),
    '2024-08-14',
  );
});

test('price and wadium extraction from table rows', () => {
  const t1 = '11/25    Chojnice, Plac Jagielloński 6. lokal mieszkalny nr 5, zapisany w KW SL1C/00018610/2 120 000        6 000';
  assert.deepEqual(extractPriceAndWadium(t1), { starting_price_pln: 120000, wadium_pln: 6000 });

  const t2 = '24/23    Chojnice, ul. Drzymały 1 C. Spółdzielcze własnościowe... 126 000   13 000';
  assert.deepEqual(extractPriceAndWadium(t2), { starting_price_pln: 126000, wadium_pln: 13000 });

  const t3 = '8/26   Chojnice, ul. Szymborskiej/Żeromskiego. Działka nr 3024/6 o pow. 1678 m²  440 000,00      22 000,00';
  assert.deepEqual(extractPriceAndWadium(t3), { starting_price_pln: 440000, wadium_pln: 22000 });

  const t4 = '18/25    Chojnice, ul. Żeromskiego. Działki nr 49/11 i 51/12 o łącznej pow. 658 m²  94 000,00   5000,00';
  assert.deepEqual(extractPriceAndWadium(t4), { starting_price_pln: 94000, wadium_pln: 5000 });
});

test('outcome and final price extraction', () => {
  assert.deepEqual(
    extractOutcomeAndFinalPrice('Wpłynęły cztery wadia. Nabyli Białecka-Ziemińska Aleksandra i Ziemiński Piotr Za cenę 153 600 zł'),
    { outcome: 'sold', final_price_pln: 153600, unsold_reason: null },
  );
  assert.deepEqual(
    extractOutcomeAndFinalPrice('Nie wpłynęło żadne wadium. Przetarg zakończył się wynikiem negatywnym.'),
    { outcome: 'unsold', final_price_pln: null, unsold_reason: 'brak wadium' },
  );
  assert.deepEqual(
    extractOutcomeAndFinalPrice('Wpłynęły trzy wadia po terminie. Przetarg zakończył się wynikiem negatywnym.'),
    { outcome: 'unsold', final_price_pln: null, unsold_reason: 'wadia po terminie' },
  );
  assert.deepEqual(
    extractOutcomeAndFinalPrice('Nabył Józef Urbaniak Zakład Ogólnobudowlany za cenę 4 040 000,00 zł.'),
    { outcome: 'sold', final_price_pln: 4040000, unsold_reason: null },
  );
});

test('area extraction for flats, commercial and land', () => {
  assert.equal(
    unitAreaFromText('Chojnice, Plac Jagielloński 6. lokal mieszkalny nr 5, zapisany w KW SL1C/00018610/2 o pow. 39,6 m2 (1 pokój, kuchnia) oraz pomieszczeniami przynależnymi – piwnicami o łącznej pow. użytkowej 6,8 m2'),
    39.6,
  );
  assert.equal(
    unitAreaFromText('Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 7 o łącznej powierzchni 27,98 m² (pokój 13,6 m²)'),
    27.98,
  );
  assert.equal(
    unitAreaFromText('Lokal użytkowy U2. Lokal o pow. użytkowej 504,68 m² z pom. przynależnymi o pow. 90,63 m²'),
    504.68,
  );
  assert.equal(
    plotAreaFromText('Działka nr 3024/6 o pow. 1678 m², zapisana w KW'),
    1678,
  );
  assert.equal(
    plotAreaFromText('Działka nr 4608/105 o pow. 30 699 m², zapisana w KW'),
    30699,
  );
});

test('parcel and land street extraction', () => {
  assert.equal(parcelFromText('Działka nr 3024/6 o pow. 1678 m²'), '3024/6');
  assert.equal(parcelFromText('Działki nr 49/11 i 51/12 o łącznej pow. 658 m²'), '49/11, 51/12');
  assert.equal(parcelFromText('działka nr 168 ROD Metalowiec'), '168');

  assert.equal(
    landStreetFromText('BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, Chojnice, ul. Szymborskiej/Żeromskiego. Działka nr 3024/6'),
    'ul. Szymborskiej/Żeromskiego',
  );
  assert.equal(
    landStreetFromText('Chojnice, ul. Bytowska. Działka nr 4608/105'),
    'ul. Bytowska',
  );
  assert.equal(
    landStreetFromText('sprzedaż nieruchomości niezabudowanych – Osiedle Bajkowe'),
    'Osiedle Bajkowe',
  );
  assert.equal(
    landStreetFromText('sprzedaż działki ROD „Metalowiec”'),
    'ROD Metalowiec',
  );
});

test('address extraction: flats and commercial units', () => {
  const a1 = extractAddress('Chojnice, Plac Jagielloński 6. lokal mieszkalny nr 5, zapisany w KW SL1C/00018610/2 o pow. 39,6 m2');
  assert.ok(a1);
  assert.equal(a1.address_raw, 'Plac Jagielloński 6/5');
  assert.equal(a1.address.street, 'Plac Jagielloński');
  assert.equal(a1.address.building, '6');
  assert.equal(a1.address.apt, '5');
  assert.equal(a1.address.key, 'plac jagiellonski|6|5');

  const a2 = extractAddress('Chojnice, ul. Drzymały 1 C. Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 7');
  assert.ok(a2);
  assert.equal(a2.address_raw, 'Drzymały 1C/7');
  assert.equal(a2.address.street, 'Drzymały');
  assert.equal(a2.address.building, '1C');
  assert.equal(a2.address.apt, '7');
  assert.equal(a2.address.key, 'drzymaly|1C|7');

  const a3 = extractAddress('Chojnice, ul. Młodzieżowa 7. Lokal użytkowy U2 położony w budynku przedszkola- żłobka.');
  assert.ok(a3);
  assert.equal(a3.address_raw, 'Młodzieżowa 7');
  assert.equal(a3.address.street, 'Młodzieżowa');
  assert.equal(a3.address.building, '7');
  assert.equal(a3.address.apt, null);
  assert.equal(a3.address.key, 'mlodziezowa|7|');
});

// ---------------------------------------------------------------------- fixtures

const FIXTURE_ANN_JAGIELLONSKI = `     BURMISTRZ MIASTA
            CHOJNICE
           Stary Rynek 1
          89-600 Chojnice
                                                                                                                     Chojnice, dnia 26 lutego 2026 r.
     GN.6840.1.2.2026

                                BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice,
                                    ogłasza kolejny przetarg na sprzedaż lokalu mieszkalnego
  Nr                                                Położenie, opis, przeznaczenie terenu                                       Cena           Wadium
 oferty                                                                                                                         Wywoław.       zł
                                                                                                                                zł brutto      brutto
 11/25    Chojnice, Plac Jagielloński 6. lokal mieszkalny nr 5, zapisany w KW SL1C/00018610/2 o pow. 39,6 m2                    120 000        6 000
          (1 pokój, kuchnia, łazienka z w-c i przedpokój) oraz pomieszczeniami przynależnymi – piwnicami o łącznej
          pow. użytkowej 6,8 m2, położony na II piętrze w budynku wraz z udziałem do 58/100 części w nieruchomości wspólnej.
          Budynek znajduje się na działce o nr ewid. 1520/3 o pow. 298 m2, zapisanej w KW SL1C/00018583/3.
          Działka położona w strefie mieszkalnictwa i usług.
Przetarg ustny nieograniczony odbędzie się w dniu 31 marca 2026 r. o godz. 10.00 w sali nr 408 Urzędu Miejskiego w Chojnicach.

Wadium na przetarg należy wpłacić do dnia 27 marca 2026 r. na konto Urzędu Miejskiego w Chojnicach.
Poprzednie przetargi odbyły się w dniu 11 września 2025 r., 21 października 2025 r., 28 listopada 2025 r. i zakończyły się wynikiem negatywnym.`;

const FIXTURE_RES_JAGIELLONSKI_SOLD = `     BURMISTRZ MIASTA
            CHOJNICE
           Stary Rynek 1
          89-600 Chojnice
                                                                                                               Chojnice, dnia 7 kwietnia 2026 r.
     GN.6840.1.2.2026

                               BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice,
                 ogłasza wyniki przetargu na sprzedaż lokalu mieszkalnego, który odbył się w dniu 31 marca 2026 r.
  Nr                                 Położenie, opis, przeznaczenie terenu                     Cena        Wadium     Wyniki
 oferty                                                                                        wywoła      zł/        przetargu
                                                                                               w.          brutto
                                                                                               zł brutto
 11/25    Chojnice, Plac Jagielloński 6. lokal mieszkalny nr 5, zapisany w KW SL1C/00018610/2 120 000      6 000      Wpłynęły cztery wadia.
          o pow. 39,6 m2 (1 pokój, kuchnia, łazienka z w-c i przedpokój) oraz pomieszczeniami                         Nabyli Białecka-Ziemińska
          przynależnymi – piwnicami o łącznej pow. użytkowej 6,8 m2, położony na II piętrze                           Aleksandra i Ziemiński Piotr
          w budynku wraz z udziałem do 58/1000 części w nieruchomości                                                 Za cenę 153 600 zł
          wspólnej. Budynek znajduje się na działce o nr ewid. 1520/3 o pow. 298 m2, zapisanej
          w KW SL1C/00018583/3. Działka położona w strefie mieszkalnictwa i usług.`;

const FIXTURE_RES_JAGIELLONSKI_UNSOLD = `                                                                                                          Chojnice, dn. 23 października 2025r.
 GN.6840.1.21.2025


                    BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice, ogłasza
           wyniki przetargu na sprzedaż lokalu mieszkalnego, który odbył się w dniu 21 października 2025r.
                              o godz. 11 w sali nr 408 Urzędu Miejskiego w Chojnicach


       Nr                              Położenie, opis, przeznaczenie terenu                             Cena    Wadium       Wyniki
      oferty                                                                                           wywoław. zł/          przetargu
                                                                                                       zł brutto brutto
      11/25    Chojnice, ul. Plac Jagielloński 6. Lokal mieszkalny nr 5, zapisany w KW SL1C/00018610/2 200 000    20 000    Nie wpłynęło
               o pow. 39,6 m² (1 pokój, kuchnia, łazienka z w-c i przedpokój) oraz pomieszczeniami                         żadne wadium.
               przynależnymi- piwnicami o łącznej           pow. użytkowej 6,8 m², położony na II piętrze                     Przetarg
               w budynku wraz z udziałem do 58/100 części w nieruchomości wspólnej.                                          zakończył się
                                                                                                                             wynikiem
                                                                                                                             negatywnym.`;

const FIXTURE_ANN_SZYMBORSKIEJ = `     BURMISTRZ MIASTA
            CHOJNICE
           Stary Rynek 1
          89-600 Chojnice
                                                                                                                  Chojnice, dnia 20 sierpnia 2026 r.
     GN.6840.1.12.2026

                                BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice,
                                  ogłasza pierwszy przetarg na sprzedaż własności nieruchomości

  Nr                                              Położenie, opis, przeznaczenie terenu                                      Cena            Wadium
 oferty                                                                                                                      wywoławcza      zł
                                                                                                                             zł brutto       brutto
  8/26   Chojnice, ul. Szymborskiej/Żeromskiego. Działka nr 3024/6 o pow. 1678 m², zapisana w KW SL1C/00009685/2.            440 000,00      22 000,00
         Zjazd z ulicy Żeromskiego. Przeznaczenie: teren zabudowy mieszkaniowej jednorodzinnej i usług.
Przetarg ustny nieograniczony odbędzie się w dniu 20 października 2026 r. o godz. 10.00 w sali nr 408 Urzędu Miejskiego w Chojnicach.`;

// ----------------------------------------------------------- parseAnnouncement tests

test('parseAnnouncement: Plac Jagielloński flat — address, area, price, round, auction date', () => {
  const [rec] = parseAnnouncement(
    '31.03.2026 – przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy Placu Jagiellońskim 6/5.',
    FIXTURE_ANN_JAGIELLONSKI,
    'https://miastochojnice.pl/31-03-2026-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-placu-jagiellonskim-6-5/',
    'https://miastochojnice.pl/.../?aid=99198&sa=0',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Plac Jagielloński 6/5');
  assert.equal(rec.address.street, 'Plac Jagielloński');
  assert.equal(rec.address.building, '6');
  assert.equal(rec.address.apt, '5');
  assert.equal(rec.address.key, 'plac jagiellonski|6|5');
  assert.equal(rec.area_m2, 39.6);
  assert.equal(rec.starting_price_pln, 120000);
  assert.equal(rec.wadium_pln, 6000);
  assert.equal(rec.auction_date, '2026-03-31');
  assert.equal(rec.wadium_deadline, '2026-03-27');
  assert.equal(rec.round, 4);
});

test('parseAnnouncement: Szymborskiej/Żeromskiego land plot', () => {
  const [rec] = parseAnnouncement(
    'pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej ul. Szymborskiej/Żeromskiego dz. nr 3024/6 – 20.10.2026 r.',
    FIXTURE_ANN_SZYMBORSKIEJ,
    'https://miastochojnice.pl/pierwszy-przetarg-...',
    'https://miastochojnice.pl/.../?aid=101195&sa=0',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '3024/6');
  assert.equal(rec.area_m2, 1678);
  assert.equal(rec.address_raw, 'ul. Szymborskiej/Żeromskiego');
  assert.equal(rec.starting_price_pln, 440000);
  assert.equal(rec.wadium_pln, 22000);
  assert.equal(rec.auction_date, '2026-10-20');
  assert.equal(rec.round, 1);
});

// ------------------------------------------------------------- parseResultDoc tests

test('parseResultDoc: Plac Jagielloński SOLD — achieved price, buyer, round 4', () => {
  const [rec] = parseResultDoc(
    FIXTURE_RES_JAGIELLONSKI_SOLD,
    null,
    'https://miastochojnice.pl/wyniki-przetargu-.../?aid=99600&sa=0',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Plac Jagielloński 6/5');
  assert.equal(rec.address.key, 'plac jagiellonski|6|5');
  assert.equal(rec.area_m2, 39.6);
  assert.equal(rec.starting_price_pln, 120000);
  assert.equal(rec.final_price_pln, 153600);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2026-03-31');
  assert.equal(rec.notes.length, 0);
});

test('parseResultDoc: Plac Jagielloński UNSOLD — negative outcome, no final price', () => {
  const [rec] = parseResultDoc(
    FIXTURE_RES_JAGIELLONSKI_UNSOLD,
    null,
    'https://miastochojnice.pl/21-10-2025-wynik-.../?aid=97549&sa=0',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Plac Jagielloński 6/5');
  assert.equal(rec.address.key, 'plac jagiellonski|6|5');
  assert.equal(rec.starting_price_pln, 200000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'brak wadium');
  assert.equal(rec.auction_date, '2025-10-21');
  assert.equal(rec.notes.length, 0);
});

// --------------------------------------------------------- attachment link extraction

test('extractAttachmentUrl: prefers primary auction document over auxiliary files', () => {
  const sampleHtml = `
    <div class="attachments">
      <div class="col-10 col-sm-11 m-2">
        <a class="custom-1-link" title="Metalowiec przetarg 10.11.2026" href="https://miastochojnice.pl/sample/?aid=101680&sa=0">Metalowiec przetarg</a>
      </div>
      <div class="col-10 col-sm-11 m-2">
        <a class="custom-1-link" title="Oferta kupna publ_2026_10_02" href="https://miastochojnice.pl/sample/?aid=101681&sa=0">Oferta kupna</a>
      </div>
      <div class="col-10 col-sm-11 m-2">
        <a class="custom-1-link" title="Zgłoszenie udziału w przetargu Metalowiec" href="https://miastochojnice.pl/sample/?aid=101682&sa=0">Zgłoszenie</a>
      </div>
    </div>
  `;
  const url = extractAttachmentUrl(sampleHtml);
  assert.equal(url, 'https://miastochojnice.pl/sample/?aid=101680&sa=0');
});

// ------------------------------------------------ additional real fixtures tests

const FIXTURE_ANN_DRZYMALY = `                                                                                                                                                                                                    Chojnice, dn. 16 lipca 2024r.
GN.6840.1.14.2024

                                     BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice, ogłasza

przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu
  Nr
oferty
  Położenie, opis, przeznaczenie terenu
Cena
wywoław.
zł brutto
Wadium
zł/
brutto
24/23
Chojnice, ul. Drzymały 1 C. Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 7 o łącznej powierzchni 27,98 m² (pokój 13,6 m², kuchnia 6,93 m², łazienka z wc 3,47 m², przedpokój 3,98 m²), położony na IV piętrze w budynku 1 klatka C na działce o nr ewid. 4253/1 o pow. 15204 m², zapisanej w KW SL1C/00002778/2. Działka położona w strefie mieszkalnictwa i usług.
126 000
13 000
Przetarg ustny nieograniczony odbędzie się w dniu  20 sierpnia 2024r. o godz. 12.00 w sali nr 408 Urzędu Miejskiego w Chojnicach.

Wadium na przetarg należy wpłacić do dnia  14 sierpnia 2024r. na konto Urzędu Miejskiego w Chojnicach.`;

const FIXTURE_RES_DRZYMALY_SOLD = `                                                                                                                          Chojnice, dn. 28 sierpnia 2024r.
GN.6840.1.14.2024


          BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice, ogłasza wyniki przetargu ustnego
           nieograniczonego na sprzedaż spółdzielczego własnościowego prawa do lokalu, który odbył się w dniu
                      20 sierpnia 2024r. o godz. 12.00 w sali nr 408 Urzędu Miejskiego w Chojnicach

Nr                                    Położenie, opis, przeznaczenie terenu                                    Cena      Wadium        Wyniki przetargu/
oferty                                                                                                         wywoław. zł/           nabywca, osiągnięta
                                                                                                               zł brutto brutto         cena brutto (zł)
 24/23   Chojnice, ul. Drzymały 1 C. Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 7 o łącznej      126 000   13 000     Wpłynęło jedno wadium.
          powierzchni 27,98 m² (pokój 13,6 m², kuchnia 6,93 m², łazienka z wc 3,47 m², przedpokój 3,98 m²),                          Nabył Tomasz Stecko za
         położony na IV piętrze w budynku 1 klatka C na działce o nr ewid. 4253/1 o pow. 15204 m², zapisanej                         kwotę 127 300 zł brutto
                     w KW SL1C/00002778/2. Działka położona w strefie mieszkalnictwa i usług.`;

const FIXTURE_RES_MLODZIEZOWA = `                                                                                                                                                                                                  Chojnice, dn. 3 lutego 2025r.
GN.6840.1.26.2024

BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice, ogłasza wyniki drugiego przetargu na sprzedaż lokalu użytkowego, który odbył się w dniu 28 stycznia 2025r. o godz. 10.00 w sali 408 Urzędu Miejskiego w Chojnicach

  Nr
oferty
                              
             Położenie, opis, przeznaczenie terenu
Cena
wywoław.
zł brutto
Wadium
zł/
brutto
Wyniki przetargu
10/23
Chojnice, ul. Młodzieżowa 7. Lokal użytkowy U2 położony w budynku przedszkola- żłobka.
Lokal o pow. użytkowej 504,68 m² z pom. przynależnymi o pow. 90,63 m² wraz z udziałem do 59531/95497 w nieruchomości wspólnej, w skład której wchodzi działka o nr ewid. 495/50 o pow. 3784 m², zapisana w KW SL1C/00028096/5.
860 000
45 000
Wpłynęły trzy wadia.
Nabywca:
Urbaniak Inwestycje
Spółka z ograniczoną odpowiedzialnością
za cenę 868 600 zł
brutto.`;

const FIXTURE_RES_ZAKLADOWA_MULTI = `   BURMISTRZ MIASTA
      CHOJNICE
     Stary Rynek 1
    89-600 Chojnice

                                                                                                                      Chojnice, dn. 19 maja 2026 r.
GN.6840.1.4.2026

                        BURMISTRZ MIASTA CHOJNICE, Stary Rynek 1, 89-600 Chojnice, ogłasza wyniki
            przetargu na sprzedaż nieruchomości niezabudowanych, który odbył się w dniu 12 maja 2026 r.

Nr       Położenie, opis, przeznaczenie terenu                                                         Cena         Wadium     Wyniki przetargu
oferty                                                                                                  wywoław.
                                                                                                        zł brutto    brutto
12/25    Chojnice, ul. Zakładowa. Działka nr 684/77 o pow. 638 m², zapisana w KW SL1C/00028900/5.      108 000,00   6 000,00   Wpłynęły dwa wadia.
         Działka nie jest objęta m.p.z.p.                                                                                      Nabył Jan Kowalski
                                                                                                                               za cenę 260 000,00 zł.
13/25    Chojnice, ul. Zakładowa. Działka nr 5421/5 o pow. 765 m2, zapisana w KW SL1C/00028900/5.      129 000,00   7 000,00   Wpłynęły dwa wadia.
         Działka nie jest objęta m.p.z.p.                                                                                      Nabył TERMOWENT SERVICE
                                                                                                                               za cenę 233 000,00 zł.`;

test('parseAnnouncement: Drzymały flat — starting price, area, address', () => {
  const [rec] = parseAnnouncement(
    'przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu przy ulicy Drzymały 1 C w Chojnicach – 14.08.2024 r.',
    FIXTURE_ANN_DRZYMALY,
    'https://miastochojnice.pl/przetarg-na-sprzedaz-spoldzielczego-...',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Drzymały 1C/7');
  assert.equal(rec.address.street, 'Drzymały');
  assert.equal(rec.address.building, '1C');
  assert.equal(rec.address.apt, '7');
  assert.equal(rec.area_m2, 27.98);
  assert.equal(rec.starting_price_pln, 126000);
  assert.equal(rec.wadium_pln, 13000);
  assert.equal(rec.auction_date, '2024-08-20');
  assert.equal(rec.wadium_deadline, '2024-08-14');
});

test('parseResultDoc: Drzymały SOLD — achieved price, buyer', () => {
  const [rec] = parseResultDoc(
    FIXTURE_RES_DRZYMALY_SOLD,
    null,
    'https://miastochojnice.pl/20-08-2024-wyniki-przetargu-...',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Drzymały 1C/7');
  assert.equal(rec.area_m2, 27.98);
  assert.equal(rec.starting_price_pln, 126000);
  assert.equal(rec.final_price_pln, 127300);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2024-08-20');
});

test('parseResultDoc: Młodzieżowa commercial unit SOLD — round 2, starting + final price', () => {
  const [rec] = parseResultDoc(
    FIXTURE_RES_MLODZIEZOWA,
    null,
    'https://miastochojnice.pl/28-01-2025-r-godz-1000-wyniki-...',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'uzytkowy');
  assert.equal(rec.address_raw, 'Młodzieżowa 7');
  assert.equal(rec.address.key, 'mlodziezowa|7|');
  assert.equal(rec.area_m2, 504.68);
  assert.equal(rec.starting_price_pln, 860000);
  assert.equal(rec.final_price_pln, 868600);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2025-01-28');
});

test('parseResultDoc: Zakładowa multi-offer — 2 distinct land plots sold in one notice', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_ZAKLADOWA_MULTI,
    null,
    'https://miastochojnice.pl/19-05-2026-wyniki-przetargu-...',
  );

  assert.equal(recs.length, 2);

  const [lot1, lot2] = recs;
  assert.equal(lot1.kind, 'grunt');
  assert.equal(lot1.dzialka_nr, '684/77');
  assert.equal(lot1.area_m2, 638);
  assert.equal(lot1.starting_price_pln, 108000);
  assert.equal(lot1.final_price_pln, 260000);
  assert.equal(lot1.outcome, 'sold');

  assert.equal(lot2.kind, 'grunt');
  assert.equal(lot2.dzialka_nr, '5421/5');
  assert.equal(lot2.area_m2, 765);
  assert.equal(lot2.starting_price_pln, 129000);
  assert.equal(lot2.final_price_pln, 233000);
  assert.equal(lot2.outcome, 'sold');
});
