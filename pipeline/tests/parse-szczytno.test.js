import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeEntities,
  stripHtml,
  parseBoardTable,
  parsePLN,
  parseAreaNum,
  isSkippableTitle,
  isBezprzetargowyTitle,
  roundFromText,
  auctionDateFromText,
  resolveKind,
  extractAddress,
  extractParcelAndObreb,
  extractArea,
  extractStartingPrice,
  extractAchievedPrice,
  isNegativeOutcome,
  isPositiveOutcome,
  parseAnnouncement,
  parseWykaz,
  parseResultDoc,
} from '../src/cities/szczytno/parse.js';

// ------------------------------------------------------------------ Title routing

test('isSkippableTitle: lease, rental, cancellation, rokowania, announcements', () => {
  assert.equal(
    isSkippableTitle('Wykaz nieruchomości stanowiących własność Gminy Miejskiej Szczytno przeznaczonych do oddania w użyczenie w drodze bezprzetargowej'),
    true,
  );
  assert.equal(
    isSkippableTitle('Wykaz nieruchomości przeznaczonych do oddania w najem i dzierżawę'),
    true,
  );
  assert.equal(isSkippableTitle('Odwołanie przetargu ustnego nieograniczonego'), true);
  assert.equal(isSkippableTitle('Lista osób zakwalifikowanych do przetargów'), true);
  assert.equal(isSkippableTitle('UCHWAŁA Nr XXII/197/04 Rady Miejskiej w Szczytnie'), true);

  // Real sale announcements are NOT skippable
  assert.equal(
    isSkippableTitle('Ogłoszenie o I przetargu ustnym nieograniczonym na zbycie nieruchomości lokalowej przy ul. Żeromskiego 3/4 w Szczytnie'),
    false,
  );
  assert.equal(
    isSkippableTitle('Ogłoszenie o II przetargu ustnym nieograniczonym na zbycie nieruchomości przy ul. Norwida w Szczytnie'),
    false,
  );
  assert.equal(
    isSkippableTitle('Wykaz nieruchomości lokalowej przeznaczonej do zbycia w drodze przetargu, ul. Dąbrowskiego 4/4a w Szczytnie'),
    false,
  );
});

test('isBezprzetargowyTitle: tenant sales and non-auction conveyances', () => {
  assert.equal(
    isBezprzetargowyTitle('Wykaz lokali mieszkalnych do sprzedaży najemcom wraz ze zbyciem na współwłasność udziału w działce w trybie bezprzetargowym'),
    true,
  );
  assert.equal(
    isBezprzetargowyTitle('Wykaz nieruchomości przeznaczonej do zbycia w trybie bezprzetargowym działki nr 209/16, ul. Mieszka I w Szczytnie'),
    true,
  );
  assert.equal(
    isBezprzetargowyTitle('Wykaz nieruchomości lokalowej przeznaczonej do zbycia w drodze przetargu, ul. Dąbrowskiego 4/4a w Szczytnie'),
    false,
  );
});

// ------------------------------------------------------------------ Number & Area parsing

test('parsePLN: space and dot thousands with grosze', () => {
  assert.equal(parsePLN('135.370,00 zł'), 135370);
  assert.equal(parsePLN('59 000,00 zł'), 59000);
  assert.equal(parsePLN('454.500,00 zł'), 454500);
  assert.equal(parsePLN('75.530,00 zł'), 75530);
  assert.equal(parsePLN('93.600,00 zł brutto'), 93600);
  assert.equal(parsePLN('156.000 zł'), 156000);
  assert.equal(parsePLN('40.450,00 zł.'), 40450);
  assert.equal(parsePLN(null), null);
});

test('parseAreaNum: comma and dot decimals', () => {
  assert.equal(parseAreaNum('31,80'), 31.8);
  assert.equal(parseAreaNum('18,82'), 18.82);
  assert.equal(parseAreaNum('276,36'), 276.36);
  assert.equal(parseAreaNum('871'), 871);
  assert.equal(parseAreaNum('1310'), 1310);
  assert.equal(parseAreaNum('11.10'), 11.1);
  assert.equal(parseAreaNum(null), null);
});

// ------------------------------------------------------------------ Round & Date extraction

test('roundFromText: roman and word forms, vendor typos', () => {
  assert.equal(roundFromText('ogłoszenie o I przetargu ustnym nieograniczonym'), 1);
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('ogłoszenie o II przetargu ustnym nieograniczonym'), 2);
  assert.equal(roundFromText('odbył się drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('ogłoszenie o III przetargu ustnym'), 3);
  assert.equal(roundFromText('odbył się trzeci przetarg ustny'), 3);
  assert.equal(roundFromText('informacja o wyniku czwartego przetragu ustnego'), 4);
  assert.equal(roundFromText('ogłasza V przetarg ustny'), 5);
});

test('auctionDateFromText: Polish genitive months and dot dates', () => {
  assert.equal(auctionDateFromText('odbył się w dniu 25 lutego 2021 r. o godz. 10:00'), '2021-02-25');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 17 maja 2021r. o godz. 10:00'), '2021-05-17');
  assert.equal(auctionDateFromText('przeprowadzony w dniu 5 czerwca 2025 r. o godz. 12:00'), '2025-06-05');
  assert.equal(auctionDateFromText('odbył się w dniu 18 lipca 2024 r. o godz. 13:00'), '2024-07-18');
  assert.equal(auctionDateFromText('odbył się w dniu 4 września 2026 r. o godzinie 10:00'), '2026-09-04');
  assert.equal(auctionDateFromText('przeprowadzony w dniu 7 października 2026 r. o godzinie 10:00'), '2026-10-07');
  assert.equal(auctionDateFromText('w dniu 15.09.2026r.'), '2026-09-15');
});

// ------------------------------------------------------------------ Kind resolution

test('resolveKind: accurately routes flats, buildings, commercial, and land', () => {
  assert.equal(resolveKind('zbycie nieruchomości lokalowej przy ul. Żeromskiego 3/4'), 'mieszkalny');
  assert.equal(resolveKind('zbycie lokalu mieszkalnego nr 17 przy ul. Polskiej 20'), 'mieszkalny');
  assert.equal(resolveKind('przedmiotowy lokal użytkowy/niemieszkalny nr 4'), 'uzytkowy');
  assert.equal(resolveKind('lokal użytkowy - garaż zlokalizowany w budynku'), 'uzytkowy');
  assert.equal(resolveKind('nieruchomość zabudowana budynkiem mieszkalnym oraz budynkiem gospodarczym Pasymska 40'), 'zabudowana');
  assert.equal(resolveKind('zbycie nieruchomości zabudowanej położonej w Szczytnie przy ul. Poznańskiej 20 A'), 'zabudowana');
  assert.equal(resolveKind('zbycie nieruchomości niezabudowanej przy ul. Norwida w Szczytnie, działka 516/4'), 'grunt');
});

// ------------------------------------------------------------------ Address & Venue protection

test('extractAddress: protects City Hall venue from becoming property address', () => {
  const textWithVenue =
    'W dniu 25 lutego 2021 r. o godz. 10:00 w Urzędzie Miejskim w Szczytnie przy ul. Henryka Sienkiewicza 1 ' +
    'odbył się pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej położonej w Szczytnie ' +
    'przy ul. Odrodzenia 36 składającej się z lokali nr 9 oraz nr 10.';

  const addr = extractAddress(textWithVenue);
  assert.ok(addr);
  assert.equal(addr.raw, 'ul. Odrodzenia 36/9');
  assert.equal(addr.parsed.street_norm, 'odrodzenia');
  assert.equal(addr.parsed.building, '36');
  assert.equal(addr.parsed.apt, '9');
});

test('extractAddress: parses complex building and unit numbers', () => {
  const a1 = extractAddress('zbycie nieruchomości lokalowej przy ul. Żeromskiego 3/4 w Szczytnie');
  assert.equal(a1.parsed.key, 'zeromskiego|3|4');

  const a2 = extractAddress('lokal przy ul. Dąbrowskiego 4/4a w Szczytnie');
  assert.equal(a2.parsed.key, 'dabrowskiego|4|4A');

  const a3 = extractAddress('nieruchomość przy ul. Poznańskiej 20 A w Szczytnie');
  assert.equal(a3.parsed.key, 'poznanskiej|20A|');

  const a4 = extractAddress('nieruchomość zabudowana przy ul. Pasymskiej 40 w Szczytnie');
  assert.equal(a4.parsed.key, 'pasymskiej|40|');

  const a5 = extractAddress('budynek mieszkalny przy ul. Lipperta 8 w Szczytnie');
  assert.equal(a5.parsed.key, 'lipperta|8|');
});

// ------------------------------------------------------------------ Board Table Parser

test('parseBoardTable: parses CMS rows with unclosed anchor tags', () => {
  const tableHtml = `
    <table class="table table-striped lista_artykuly" style="width: 100%;">
      <thead>
        <tr><th>Tytuł</th><th>Data publikacji</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><a href="/artykul/ogloszenie-o-ii-przetargu-norwida">Ogłoszenie o II przetargu przy ul. Norwida</td>
          <td>2026-08-13 10:01:38</td>
        </tr>
        <tr>
          <td><a href="/artykul/wykaz-dabrowskiego">Wykaz nieruchomości lokalowej ul. Dąbrowskiego 4/4a</td>
          <td>2025-08-21 08:31:01</td>
        </tr>
      </tbody>
    </table>
  `;

  const items = parseBoardTable(tableHtml, 'https://bip.um.szczytno.pl');
  assert.equal(items.length, 2);
  assert.equal(items[0].url, 'https://bip.um.szczytno.pl/artykul/ogloszenie-o-ii-przetargu-norwida');
  assert.equal(items[0].title, 'Ogłoszenie o II przetargu przy ul. Norwida');
  assert.equal(items[0].date, '2026-08-13 10:01:38');
  assert.equal(items[1].url, 'https://bip.um.szczytno.pl/artykul/wykaz-dabrowskiego');
  assert.equal(items[1].date, '2025-08-21 08:31:01');
});

// ------------------------------------------------------------------ Real Fixtures Groundtruth

test('FIXTURE 1: Flat announcement — Żeromskiego 3/4 (.doc)', () => {
  const docText = `
    OGŁOSZENIE
    Burmistrz Miasta Szczytno ogłasza pierwszy przetarg ustny nieograniczony na zbycie następujących nieruchomości w mieście Szczytno.
    Lp. 1.
    498/22 Obręb 2 13/100 414 OL1S/00039438/7 Szczytno ul. Żeromskiego 3
    Przedmiotowy lokal użytkowy/niemieszkalny nr 4 o pow. użytkowej 31,80 m2 znajduje się w budynku mieszkalno - użytkowym.
    Cena wywoławcza w zł: 135.370,00 zł brutto w tym: Cena lokalu: 120.528,00 zł.
    Wadium: 14.000,00 zł.
    Przetarg zostanie przeprowadzony w dniu 5 czerwca 2025 r. o godz. 12:00 w sali konferencyjnej Urzędu Miejskiego w Szczytnie.
  `;
  const fullText = `Ogłoszenie o I przetargu ustnym nieograniczonym na zbycie nieruchomości lokalowej przy ul. Żeromskiego 3/4 w Szczytnie (znak: GPO.6840.9.2020)\n${docText}`;

  const recs = parseAnnouncement(fullText, 'https://bip.um.szczytno.pl/artykul/ogloszenie-zeromskiego');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'uzytkowy');
  assert.equal(r.address.key, 'zeromskiego|3|4');
  assert.equal(r.area_m2, 31.8);
  assert.equal(r.starting_price_pln, 135370);
  assert.equal(r.auction_date, '2025-06-05');
  assert.equal(r.round, 1);
});

test('FIXTURE 2: Flat announcement — Polska 20 m. 17 (.pdf)', () => {
  const pdfText = `
    znak sprawy: GPO.6840.23.2020 Szczytno, dnia 8 kwietnia 2021 r.
    OGŁOSZENIE
    Burmistrz Miasta Szczytno ogłasza pierwszy przetarg ustny nieograniczony na zbycie nieruchomości.
    1. 410/2 351 OL1S/00005110/5 Szczytno ul. Polska 20 m. 17
    Lokal mieszkalny o pow. 18,82 m2 położony jest na 2 piętrze.
    Cena wywoławcza: 59.000,00 zł brutto. Wadium: 5.900,00.
    Przetarg zostanie przeprowadzony w dniu 17 maja 2021r. o godz. 10:00 w sali konferencyjnej Urzędu Miejskiego w Szczytnie.
  `;
  const fullText = `Ogłoszenie o I przetargu ustnym nieograniczonym na zbycie lokalu mieszkalnego nr 17 przy ul. Polskiej 20 w Szczytnie\n${pdfText}`;

  const recs = parseAnnouncement(fullText, 'https://bip.um.szczytno.pl/artykul/ogloszenie-polska-20');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'polskiej|20|17');
  assert.equal(r.area_m2, 18.82);
  assert.equal(r.starting_price_pln, 59000);
  assert.equal(r.auction_date, '2021-05-17');
  assert.equal(r.round, 1);
});

test('FIXTURE 3: Building announcement — Pasymska 40 (.doc)', () => {
  const docText = `
    OGŁOSZENIE
    Burmistrz Miasta Szczytno ogłasza trzeci przetarg ustny nieograniczony na zbycie nieruchomości zabudowanej.
    1. 207 Obręb 1 Pow. działki: 2395 m2 Pow. użytkowa budynku mieszkalnego: 276,36 m2 OL1S/00010934/5 ul. Pasymska 40 Szczytno
    Nieruchomość zabudowana budynkiem mieszkalnym oraz budynkiem gospodarczym.
    Cena wywoławcza: 570.000,00 zł brutto.
    Przetarg zostanie przeprowadzony w dniu 4 września 2026 r. o godz. 10:00 w sali konferencyjnej.
  `;
  const fullText = `Ogłoszenie o III przetargu ustnym nieograniczonym na zbycie nieruchomości zabudowanej przy ul. Pasymskiej 40 w Szczytnie\n${docText}`;

  const recs = parseAnnouncement(fullText, 'https://bip.um.szczytno.pl/artykul/ogloszenie-pasymska-40');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'pasymskiej|40|');
  assert.equal(r.area_m2, 276.36);
  assert.equal(r.starting_price_pln, 570000);
  assert.equal(r.auction_date, '2026-09-04');
  assert.equal(r.round, 3);
});

test('FIXTURE 4: Multi-parcel land announcement — Norwida 516/4 and 516/5 (.doc)', () => {
  const docText = `
    OGŁOSZENIE
    Burmistrz Miasta Szczytno ogłasza drugi przetarg ustny nieograniczony na zbycie następujących nieruchomości.
    1\t516/4\tObręb 4\t871 m2\tOL1S/00068650/1\tSzczytno ul. Norwida\tdziałka niezabudowana\t93.600,00 zł brutto\tWadium: 10.000,00zł
    2\t516/5\tObręb 4\t1129 m2\tOL1S/00068649/1\tSzczytno ul. Norwida\tdziałka niezabudowana\t132.300,00 zł brutto\tWadium: 14.000,00zł
    Przetarg zostanie przeprowadzony w dniu 7 października 2026 r. o godzinie 10:00 w Sali Konferencyjnej.
  `;
  const fullText = `Ogłoszenie o II przetargu ustnym nieograniczonym na zbycie nieruchomości przy ul. Norwida w Szczytnie, działki nr 516/4, 516/5, obręb 4\n${docText}`;

  const recs = parseAnnouncement(fullText, 'https://bip.um.szczytno.pl/artykul/ogloszenie-norwida');
  assert.equal(recs.length, 2);

  assert.equal(recs[0].kind, 'grunt');
  assert.equal(recs[0].dzialka_nr, '516/4');
  assert.equal(recs[0].obreb, '4');
  assert.equal(recs[0].area_m2, 871);
  assert.equal(recs[0].starting_price_pln, 93600);
  assert.equal(recs[0].auction_date, '2026-10-07');
  assert.equal(recs[0].round, 2);

  assert.equal(recs[1].kind, 'grunt');
  assert.equal(recs[1].dzialka_nr, '516/5');
  assert.equal(recs[1].obreb, '4');
  assert.equal(recs[1].area_m2, 1129);
  assert.equal(recs[1].starting_price_pln, 132300);
  assert.equal(recs[1].auction_date, '2026-10-07');
  assert.equal(recs[1].round, 2);
});

test('FIXTURE 5: Wykaz pre-announcement — Dąbrowskiego 4/4a (.doc)', () => {
  const docText = `
    WYKAZ nieruchomości przeznaczonej do zbycia w drodze przetargu
    1. 220 Obręb 5 11.10 m2 OL1S/00016744/8 Szczytno ul. Dąbrowskiego 4/4a
    Lokal niemieszkalny o powierzchni użytkowej 11.10 m.
    Cena nieruchomości w zł: 40.450,00 zł. brutto
  `;
  const fullText = `Wykaz nieruchomości lokalowej przeznaczonej do zbycia w drodze przetargu, ul. Dąbrowskiego 4/4a w Szczytnie\n${docText}`;

  const rec = parseWykaz(fullText, 'https://bip.um.szczytno.pl/artykul/wykaz-dabrowskiego');
  assert.ok(rec);
  assert.equal(rec.kind, 'uzytkowy');
  assert.equal(rec.address.key, 'dabrowskiego|4|4A');
  assert.equal(rec.area_m2, 11.1);
  assert.equal(rec.starting_price_pln, 40450);
});

test('FIXTURE 6: Flat result SOLD — Odrodzenia 36 (inline HTML)', () => {
  const text = `
    Informacja o wyniku I przetargu ustnego nieograniczonego na zbycie nieruchomości przy ul. Odrodzenia 36
    Szczytno, dn. 05.03.2021 r.
    W dniu 25 lutego 2021 r. o godz. 10:00 w Urzędzie Miejskim w Szczytnie przy ul. Henryka Sienkiewicza 1
    odbył się pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej położonej w Szczytnie
    przy ul. Odrodzenia 36 składającej się z lokali nr 9 o pow. użytkowej 76,94 m2 oraz nr 10 o pow. użytkowej 70,73 m2.
    Cena wywoławcza nieruchomości wynosi 450.000,00 zł brutto.
    Przetarg zakończył się wynikiem pozytywnym. Jako nabywcę wyłoniono Pana Łukasza Bałon zam. w Szczytnie.
    Cena sprzedaży uzyskana w wyniku przetargu to 454.500,00 zł brutto.
  `;

  const recs = parseResultDoc(text, '2021-03-05', 'https://bip.um.szczytno.pl/artykul/wynik-odrodzenia');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'odrodzenia|36|9');
  assert.equal(r.area_m2, 76.94);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2021-02-25');
  assert.equal(r.starting_price_pln, 450000);
  assert.equal(r.final_price_pln, 454500);
  assert.equal(r.outcome, 'sold');
});

test('FIXTURE 7: Building result SOLD — Poznańska 20 A (inline HTML)', () => {
  const text = `
    Informacja o wyniku trzeciego przetargu ustnego nieograniczonego na zbycie nieruchomości zabudowanej położonej w Szczytnie przy ul. Poznańskiej 20 A
    W dniu 18 lipca 2024 r. o godz. 13:00 w Urzędzie Miejskim w Szczytnie przy ul. Henryka Sienkiewicza 1
    odbył się trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej położonej w Szczytnie przy ul. Poznańskiej.
    Nieruchomość zabudowana budynkiem mieszkalnym oznaczonym numerem 20A, usytuowanym na działce nr 31/3, ob. 3, o pow. 339 m 2.
    Cena wywoławcza do przetargu wynosiła 62.930,00 zł brutto.
    Przetarg zakończył się wynikiem pozytywnym, został wyłoniony nabywca nieruchomości. Nabywcą nieruchomości został Pan Janusz Brzeziński.
    Cena wylicytowana to 75.530,00 zł brutto.
  `;

  const recs = parseResultDoc(text, '2024-07-26', 'https://bip.um.szczytno.pl/artykul/wynik-poznanska');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'poznanskiej|20A|');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2024-07-18');
  assert.equal(r.starting_price_pln, 62930);
  assert.equal(r.final_price_pln, 75530);
  assert.equal(r.outcome, 'sold');
});

test('FIXTURE 8: Building result SOLD — Pasymska 40 (inline HTML)', () => {
  const text = `
    Informacja o wyniku trzeciego przetargu ustnego nieograniczonego na zbycie nieruchomości zabudowanej położonej w Szczytnie przy ul. Pasymskiej 40
    W dniu 4 września 2026 r. o godzinie 10:00 w Urzędzie Miejskim w Szczytnie przy ul. Henryka Sienkiewicza 1
    odbył się trzeci przetarg ustny nieograniczony na zbycie nieruchomości zabudowanej położonej w Szczytnie przy ulicy Pasymskiej 40.
    Działka numer 207, ob. 1 miasta Szczytno, o powierzchni 2395 m2.
    Cena wywoławcza do przetargu wynosiła 570.000,00 zł brutto.
    Przetarg zakończył się wynikiem pozytywnym.
    Cena wylicytowana to 575.700,00 zł brutto.
  `;

  const recs = parseResultDoc(text, '2026-09-14', 'https://bip.um.szczytno.pl/artykul/wynik-pasymska');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'pasymskiej|40|');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-09-04');
  assert.equal(r.starting_price_pln, 570000);
  assert.equal(r.final_price_pln, 575700);
  assert.equal(r.outcome, 'sold');
});

test('FIXTURE 9: Land result SOLD — Norwida 516/4 (inline HTML)', () => {
  const text = `
    Informacja o wyniku drugiego przetargu ustnego nieograniczonego na zbycie nieruchomości niezabudowanej położonej w Szczytnie przy ulicy Norwida, dz. 516/4
    W dniu 7 października 2026 r. o godzinie 10:00 w Urzędzie Miejskim w Szczytnie przy ul. Henryka Sienkiewicza 1
    odbył się drugi przetarg ustny nieograniczony na zbycie nieruchomości niezabudowanej położonej w Szczytnie przy ulicy Norwida.
    Działka numer 516/4, ob. 4 miasta Szczytno, o powierzchni 871 m2.
    Cena wywoławcza do przetargu wynosiła 93.600,00 zł brutto, w tym należny podatek VAT.
    Przetarg zakończył się wynikiem pozytywnym. Nabywcą nieruchomości został Kamil Sieruta.
    Cena wylicytowana to 94.600,00 zł brutto, w tym należny podatek VAT.
  `;

  const recs = parseResultDoc(text, '2026-10-09', 'https://bip.um.szczytno.pl/artykul/wynik-norwida-516-4');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '516/4');
  assert.equal(r.obreb, '4');
  assert.equal(r.area_m2, 871);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-10-07');
  assert.equal(r.starting_price_pln, 93600);
  assert.equal(r.final_price_pln, 94600);
  assert.equal(r.outcome, 'sold');
});

test('FIXTURE 10: Land result UNSOLD — Wołyńska 68/3 (inline HTML)', () => {
  const text = `
    Informacja o wyniku pierwszego przetargu ustnego nieograniczonego na zbycie nieruchomości przy ul. Wołyńskiej, działka numer 68/3
    W dniu 25 września 2026 r. o godzinie 10:00 w Urzędzie Miejskim w Szczytnie przy ul. Henryka Sienkiewicza 1
    odbył się pierwszy przetarg ustny nieograniczony na zbycie nieruchomości niezabudowanej położonej w Szczytnie przy ulicy Wołyńskiej.
    Działka numer 68/3, ob. 1 miasta Szczytno, o powierzchni 1310m2.
    Cena wywoławcza do przetargu wynosiła 156.000,00 zł brutto, w tym należny podatek VAT.
    Przetarg zakończył się wynikiem negatywnym ze względu na brak zainteresowania nabyciem przedmiotowej nieruchomości.
  `;

  const recs = parseResultDoc(text, '2026-10-09', 'https://bip.um.szczytno.pl/artykul/wynik-wolynska');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '68/3');
  assert.equal(r.obreb, '1');
  assert.equal(r.area_m2, 1310);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-09-25');
  assert.equal(r.starting_price_pln, 156000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});
