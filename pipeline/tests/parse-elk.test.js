import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanText,
  parsePLN,
  parseArea,
  parseDate,
  extractRound,
  extractParcels,
  extractKw,
  isAnnouncement,
  isResult,
  isFlat,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/elk/parse.js';

test('elk parsePLN', () => {
  assert.equal(parsePLN('302.665,00 zł'), 302665);
  assert.equal(parsePLN('460.000,00 zł'), 460000);
  assert.equal(parsePLN('170 990 zł'), 170990);
  assert.equal(parsePLN('brak'), null);
});

test('elk parseArea', () => {
  assert.equal(parseArea('46,10 m2'), 46.1);
  assert.equal(parseArea('103,63 m²'), 103.63);
  assert.equal(parseArea('1,2147 ha'), 1.2147);
  assert.equal(parseArea('xyz'), null);
});

test('elk parseDate', () => {
  assert.equal(parseDate('28 maja 2026 r.'), '2026-05-28');
  assert.equal(parseDate('26 marca 2026 r.'), '2026-03-26');
  assert.equal(parseDate('2026-04-13'), '2026-04-13');
  assert.equal(parseDate('brak terminu'), null);
});

test('elk extractRound', () => {
  assert.equal(extractRound('Ogłoszenie pierwszego przetargu ustnego nieograniczonego'), 1);
  assert.equal(extractRound('Ogłoszenie kolejnego przetargu ustnego'), 2);
  assert.equal(extractRound('Informacja o wyniku trzeciego przetargu'), 3);
  assert.equal(extractRound('IV przetarg ustny nieograniczony'), 4);
});

test('elk extractParcels and extractKw', () => {
  const text = 'działkę gruntu oznaczoną nr 1378/2 o pow. 1,2147 ha ujawnioną w KW OL1E/00051533/0 oraz lokal w KW OL1E/00056464/0';
  assert.deepEqual(extractParcels(text), ['1378/2']);
  assert.deepEqual(extractKw(text), ['OL1E/00051533/0', 'OL1E/00056464/0']);
});

test('elk isAnnouncement and isResult', () => {
  assert.equal(isAnnouncement('Ogłoszenie pierwszego przetargu ustnego nieograniczonego na sprzedaż lokalu'), true);
  assert.equal(isAnnouncement('Wykaz nieruchomości gruntowej'), false);
  assert.equal(isAnnouncement('Informacja o wyniku przetargu'), false);

  assert.equal(isResult('Informacja o wyniku trzeciego przetargu ustnego nieograniczonego'), true);
  assert.equal(isResult('Ogłoszenie pierwszego przetargu ustnego'), false);
});

test('elk isFlat', () => {
  assert.equal(isFlat('sprzedaż lokalu mieszkalnego nr 15 przy ul. Gizewiusza'), true);
  assert.equal(isFlat('sprzedaż lokalu użytkowego nr 2'), false);
  assert.equal(isFlat('sprzedaż nieruchomości gruntowej niezabudowanej'), false);
});

test('elk parseAnnouncement real sample', () => {
  const sample = `
PREZYDENT MIASTA EŁKU ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 15, opisanego w KW OL1E/00056464/0, położonego na IV piętrze
w budynku nr 10A przy ul. Gustawa Gizewiusza w Ełku o pow. użytkowej 46,10 m2
wraz z pomieszczeniem przynależnym, tj. piwnica o pow. 3,78 m2 oraz z udziałem
wynoszącym 48/10000 części w nieruchomości wspólnej oraz działkę gruntu oznaczoną
nr 1378/2 o pow. 1,2147 ha ujawnioną w KW OL1E/00051533/0;
cena wywoławcza – 302.665,00 zł
wadium – 60.500,00 zł
Przetarg odbędzie się w dniu 28 maja 2026 r. o godz. 10:00 w Urzędzie Miasta Ełku.
  `;
  const parsed = parseAnnouncement(
    sample,
    'Ogłoszenie pierwszego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 15 przy ul. Gizewiusza',
    'https://www.elk.pl/aktualnosci-wpis/9637',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 46.1);
  assert.equal(parsed.price, 302665);
  assert.equal(parsed.auction_date, '2026-05-28');
  assert.deepEqual(parsed.parcels, ['1378/2']);
  assert.ok(parsed.kw.includes('OL1E/00056464/0'));
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('elk parseResultDoc won outcome', () => {
  const doc = {
    title: 'INFORMACJA O WYNIKU KOLEJNEGO PRZETARGU USTNEGO NIEOGRANICZONEGO',
    pdf_url: 'https://www.elk.pl/aktualnosci-wpis/9220',
    auction_date: '2025-10-15',
    text: `
INFORMACJA O WYNIKU KOLEJNEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż nieruchomości lokalowej przy ul. 3 Maja 9 m. 7 w Ełku.
Cena wywoławcza wynosi – 169.290,00 zł.
W przetargu osiągnięto najwyższą cenę ww. nieruchomości w kwocie 170.990,00 zł.
Nabywcy: Ewa i Błażej Bielscy.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 169290);
  assert.equal(parsed.price_achieved, 170990);
  assert.equal(parsed.buyer, 'Ewa i Błażej Bielscy');
  assert.equal(parsed.auction_date, '2025-10-15');
});

test('elk parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'INFORMACJA O WYNIKU TRZECIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO',
    pdf_url: 'https://www.elk.pl/aktualnosci-wpis/9602',
    auction_date: '2026-03-26',
    text: `
Cena wywoławcza nieruchomości lokalowej mieszkalnej wynosi – 460.000,00 zł.
Wadium: 92.000,00 zł.
Przetarg został wyznaczony na dzień 26 marca 2026 r. na godzinę 10:00.
W wyznaczonym terminie nie wpłynęło wadium jw., w związku z czym przetarg zakończył się wynikiem negatywnym.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 460000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2026-03-26');
});
