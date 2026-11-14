
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  areaFromText,
  startingPriceFromText,
  dzialkaNrFromText,
  landAreaM2FromText,
  landStreetFromText,
  isPositiveOutcome,
  isNegativeOutcome,
  isLeaseRow,
  inScopeKind,
  extractLokalAddress,
  dateOnly,
  parseActiveFlatRow,
  parseActiveLandRow,
  buildResultText,
  parseResultDoc,
} from '../src/cities/zagan/parse.js';
import { boardUrl, parseBoardPage } from '../src/cities/zagan/crawl.js';


const ZELAZNA_ROW = {
  detailUrl: 'https://bip.zagan.pl/przetargi/344/599/3_/',
  dotyczyText:
    'Sprzedaż lokalu mieszkalnego nr 3, położony przy ul. Żelaznej 16, o powierzchni 30,00 m2, wraz z pomieszczeniami przynależnymi – piwnicą oraz komórką o powierzchni 20,10 m2 z udziałem 197/1000 w częściach wspólnych budynku ul. Żelaznej oraz nieruchomości oznaczonej numerem ewidencyjnym 3117/2, o powierzchni 0,0437 ha, dla którego prowadzona jest księga wieczysta ZG1G/00039027/5',
  cenaText: 'Cena wywoławcza 135.000,00 zł',
  wynikText: 'Wynik Negatywny',
  announcedDate: '2025-11-14 00:00:00',
  auctionDateRaw: '2025-12-16 10:00:00',
  attachments: [
    {
      url: 'https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie_3_Zelazna_16-3__3112-7.docx&id=05bcaae81397d0bbb77773d709f07a9c',
      filename: 'ogloszenie_3_Zelazna_16-3__3112-7.docx',
    },
  ],
};

const BRODATEGO_ROW = {
  detailUrl: 'https://bip.zagan.pl/przetargi/344/600/6_/',
  dotyczyText:
    'Sprzedaż lokalu mieszkalnego nr 2, przy ul. Brodatego 12, o powierzchni 115,54 m2, wraz z pomieszczeniami przynależnymi – dwoma piwnicami o powierzchni 33,49 m2, wraz z udziałem 445/1000 w częściach wspólnych budynku ul. Brodatego 12 oraz nieruchomości oznaczonej numerem ewidencyjnym 1067/2, o powierzchni 0,0682 ha, dla której prowadzona jest księga wieczysta ZG1G/00033839/8.',
  cenaText: 'Cena wywoławcza 300.000,00 zł',
  wynikText: 'Wynik Pozytywny',
  announcedDate: '2025-11-14 00:00:00',
  auctionDateRaw: '2025-12-16 10:30:00',
  attachments: [
    {
      url: 'https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie_6_brodatego_12-2.docx&id=bc81624e42479229f476125551956893',
      filename: 'ogloszenie_6_brodatego_12-2.docx',
    },
  ],
};

const CHROBREGO_ROW = {
  detailUrl: 'https://bip.zagan.pl/przetargi/344/651/2_/',
  dotyczyText:
    'Sprzedaż w drodze przetargu nieograniczonego niezabudowanej nieruchomości gruntowej, o pow. 0,0869 ha, oznaczonej numerem ewidencyjnym 1786/14, dla której Sąd Rejonowy w Żaganiu prowadzi księgę wieczystą ZG1G/00041683/8, położonej przy ul. Bolesława Chrobrego w Żaganiu.',
  cenaText: 'Cena wywoławcza 130.000,00 zł.',
  wynikText: 'Wynik Negatywny',
  announcedDate: '2026-05-28 00:00:00',
  auctionDateRaw: '2026-06-30 15:00:00',
  attachments: [
    {
      url: 'https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie__2_Chrobrego_1786-14.docx&id=76b354a5ce10d092a6aa0e181774e32e',
      filename: 'ogloszenie__2_Chrobrego_1786-14.docx',
    },
  ],
};

const KOLEJOWA_QUIRK_ROW = {
  detailUrl: 'https://bip.zagan.pl/przetargi/344/649/5_/',
  dotyczyText:
    'Sprzedaż w drodze przetargu nieograniczonego niezabudowanej nieruchomości gruntowej, o pow. 0, 0926 ha, oznaczona numerem ewidencyjnym 3116/9, dla której Sąd Rejonowy w Żaganiu prowadzi księgę wieczystą ZG1G/00053511/9, położona przy ul. Kolejowej w Żaganiu.',
  cenaText: 'Cena wywoławcza 150.000,00 zł.',
  wynikText: 'Wynik Negatywny',
  announcedDate: '2026-05-28 00:00:00',
  auctionDateRaw: '2026-06-30 14:00:00',
  attachments: [
    {
      url: 'https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie_5_kolejowa_3116-9..docx&id=ad65b926e90234991d7b119182676542',
      filename: 'ogloszenie_5_kolejowa_3116-9..docx',
    },
  ],
};

const ASNYKA_ROW = {
  detailUrl: 'https://bip.zagan.pl/przetargi/344/653/1_/',
  dotyczyText:
    'Sprzedaż w drodze przetargu nieograniczonego niezabudowanej nieruchomości gruntowej o pow. 0,0565 ha, oznaczonej numerem ewidencyjnym 1979/2, dla której Sąd Rejonowy w Żaganiu prowadzi księgę wieczystą ZG1G/00049757/4, położonej przy ul. Asnyka w Żaganiu.',
  cenaText: 'Cena wywoławcza 85.000,00 zł.',
  wynikText: 'Wynik Brak wyniku',
  announcedDate: '2026-06-12 00:00:00',
  auctionDateRaw: '2026-07-14 09:00:00',
  attachments: [
    {
      url: 'https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie__1_Asnyka_1979-2_.docx&id=1dab3344444cb2efafeeaacd19f2c5e9',
      filename: 'ogloszenie__1_Asnyka_1979-2_.docx',
    },
  ],
};

const NARUTOWICZA_HOUSE_TEXT =
  'Sprzedaż budynku mieszkalnego przy ul. Narutowicza 19, o powierzchni użytkowej 66,76 m2, wraz z prawem własności nieruchomości oznaczonej numerem ewidencyjnym 2306, o powierzchni 0.0660 ha. dla którego prowadzona jest księga wieczysta ZG1G/00019593/7.';

const LEASE_TEXT =
  'Ogłoszenie Burmistrza Miasta Żagań o pierwszym nieograniczonym przetargu ustnym na oddanie w dzierżawę na okres 10 lat komunalnego gruntu przy ul. Krętej w Żaganiu. Termin przetargu 27 maja 2015 r. godz. 12:00';

const ACTIVE_ROW_HTML = `<tr class="odd">
			<td class="td-no"><span>Lp: </span>1</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2026-06-12 00:00:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2026-07-14 09:00:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.zagan.pl/przetargi/344/653/1_/" title="Przejdź do szczegółów informacji">Sprzedaż w drodze przetargu nieograniczonego niezabudowanej nieruchomości gruntowej o pow. 0,0565 ha, oznaczonej numerem ewidencyjnym 1979/2, dla której Sąd Rejonowy w Żaganiu prowadzi księgę wieczystą ZG1G/00049757/4, położonej przy ul. Asnyka w Żaganiu.</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>85.000,00 zł.</td>
			<td class="td-title-1"><div>Wynik</div>Brak wyniku</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- .......................... start : lista uproszczona zalacznikow .......................... -->
	<ul class="attachments">
			<li><a href="https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie__1_Asnyka_1979-2_.docx&amp;id=1dab3344444cb2efafeeaacd19f2c5e9" title="Pobierz załącznik"><img src="https://bip.zagan.pl/ikona.php?plik=ogloszenie__1_Asnyka_1979-2_.docx" alt="Ikona (DOCX)" /></a></li>
			</ul>
	<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->
	</td>
		</tr>`;

const RESOLVED_ROW_HTML = `<tr class="even">
			<td class="td-no"><span>Lp: </span>52</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2025-11-14 00:00:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2025-12-16 10:30:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.zagan.pl/przetargi/344/600/6_/" title="Przejdź do szczegółów informacji">Sprzedaż lokalu mieszkalnego nr 2, przy ul. Brodatego 12, o powierzchni 115,54 m2, wraz z pomieszczeniami przynależnymi – dwoma piwnicami o powierzchni 33,49 m2, wraz z udziałem 445/1000 w częściach wspólnych budynku ul. Brodatego 12 oraz nieruchomości oznaczonej numerem ewidencyjnym 1067/2, o powierzchni 0,0682 ha, dla której prowadzona jest księga wieczysta ZG1G/00033839/8.</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>300.000,00 zł</td>
			<td class="td-title-1"><div>Wynik</div>Pozytywny</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- .......................... start : lista uproszczona zalacznikow .......................... -->
	<ul class="attachments">
			<li><a href="https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie_6_brodatego_12-2.docx&amp;id=bc81624e42479229f476125551956893" title="Pobierz załącznik"><img src="https://bip.zagan.pl/ikona.php?plik=ogloszenie_6_brodatego_12-2.docx" alt="Ikona (DOCX)" /></a></li>
			</ul>
	<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->
	</td>
		</tr>`;


test('parsePLN: dot-thousands, comma-grosze', () => {
  assert.equal(parsePLN('135.000,00'), 135000);
  assert.equal(parsePLN('300.000,00'), 300000);
  assert.equal(parsePLN('1.500.000,00'), 1500000);
  assert.equal(parsePLN('brak'), null);
});

test('areaFromText: "o powierzchni X m2" — the LOKAL\'s own area, not the piwnica/komórka figure that follows it', () => {
  assert.equal(areaFromText(ZELAZNA_ROW.dotyczyText), 30);
  assert.equal(areaFromText(BRODATEGO_ROW.dotyczyText), 115.54);
  assert.equal(areaFromText('no area mentioned here'), null);
});

test('startingPriceFromText: skips the repeated "Cena wywoławcza" <div> label, finds the real value', () => {
  assert.equal(startingPriceFromText(ZELAZNA_ROW.cenaText), 135000);
  assert.equal(startingPriceFromText(BRODATEGO_ROW.cenaText), 300000);
  assert.equal(startingPriceFromText(ASNYKA_ROW.cenaText), 85000);
});

test('dzialkaNrFromText + landAreaM2FromText: real parcels, incl. the "0, 0926 ha" stray-space quirk', () => {
  assert.equal(dzialkaNrFromText(ASNYKA_ROW.dotyczyText), '1979/2');
  assert.equal(landAreaM2FromText(ASNYKA_ROW.dotyczyText), 565);
  assert.equal(dzialkaNrFromText(CHROBREGO_ROW.dotyczyText), '1786/14');
  assert.equal(landAreaM2FromText(CHROBREGO_ROW.dotyczyText), 869);
  assert.equal(dzialkaNrFromText(KOLEJOWA_QUIRK_ROW.dotyczyText), '3116/9');
  assert.equal(landAreaM2FromText(KOLEJOWA_QUIRK_ROW.dotyczyText), 926);
});

test('landStreetFromText: street only (land has no building number — parcel-keyed, not address-keyed)', () => {
  assert.equal(landStreetFromText(ASNYKA_ROW.dotyczyText), 'Asnyka');
  assert.equal(landStreetFromText(CHROBREGO_ROW.dotyczyText), 'Bolesława Chrobrego');
  assert.equal(landStreetFromText(KOLEJOWA_QUIRK_ROW.dotyczyText), 'Kolejowej');
});

test('isPositiveOutcome / isNegativeOutcome: the board\'s bare Wynik-cell words', () => {
  assert.equal(isPositiveOutcome('Wynik Pozytywny'), true);
  assert.equal(isNegativeOutcome('Wynik Pozytywny'), false);
  assert.equal(isPositiveOutcome('Wynik Negatywny'), false);
  assert.equal(isNegativeOutcome('Wynik Negatywny'), true);
  assert.equal(isPositiveOutcome('Wynik Brak wyniku'), false);
  assert.equal(isNegativeOutcome('Wynik Brak wyniku'), false);
});

test('isLeaseRow / inScopeKind: dzierżawa excluded, flats + land in scope, houses out of scope', () => {
  assert.equal(isLeaseRow(LEASE_TEXT), true);
  assert.equal(inScopeKind(LEASE_TEXT), null);
  assert.equal(inScopeKind(ZELAZNA_ROW.dotyczyText), 'mieszkalny');
  assert.equal(inScopeKind(BRODATEGO_ROW.dotyczyText), 'mieszkalny');
  assert.equal(inScopeKind(ASNYKA_ROW.dotyczyText), 'grunt');
  assert.equal(inScopeKind(CHROBREGO_ROW.dotyczyText), 'grunt');
  assert.equal(inScopeKind(NARUTOWICZA_HOUSE_TEXT), null);
});

test('extractLokalAddress: four real live templates', () => {
  assert.equal(extractLokalAddress(ZELAZNA_ROW.dotyczyText), 'Żelaznej 16/3');
  assert.equal(extractLokalAddress(BRODATEGO_ROW.dotyczyText), 'Brodatego 12/2');
  const armiiKrajowej =
    'Sprzedaż lokalu mieszkalnego nr 6, położonego przy  ul. Armii Krajowej 13, o powierzchni 17,82 m2, wraz z pomieszczeniami przynależnymi.';
  assert.equal(extractLokalAddress(armiiKrajowej), 'Armii Krajowej 13/6');
  const bema =
    'Sprzedaż lokalu mieszkalnego nr 3, przy ul. Bema 8 w m. Żagań, o powierzchni 30,40 m2, wraz z pomieszczeniem przynależnym.';
  assert.equal(extractLokalAddress(bema), 'Bema 8/3');
  assert.equal(extractLokalAddress(ASNYKA_ROW.dotyczyText), null);
  assert.equal(extractLokalAddress(''), null);
});

test('dateOnly: strips the time-of-day from the board\'s date+time column', () => {
  assert.equal(dateOnly('2025-12-16 10:00:00'), '2025-12-16');
  assert.equal(dateOnly(null), null);
});


test('parseBoardPage: real ACTIVE land row (Asnyka 1979/2) — all 7 columns extracted, zero fetches needed', () => {
  const [row] = parseBoardPage(ACTIVE_ROW_HTML);
  assert.equal(row.detailUrl, 'https://bip.zagan.pl/przetargi/344/653/1_/');
  assert.match(row.dotyczyText, /niezabudowanej nieruchomości gruntowej/);
  assert.match(row.cenaText, /85\.000,00 zł/);
  assert.equal(row.wynikText, 'Wynik Brak wyniku');
  assert.equal(row.announcedDate, '2026-06-12 00:00:00');
  assert.equal(row.auctionDateRaw, '2026-07-14 09:00:00');
  assert.equal(row.attachments.length, 1);
  assert.equal(row.attachments[0].filename, 'ogloszenie__1_Asnyka_1979-2_.docx');
});

test('parseBoardPage: real RESOLVED flat row (Brodatego 12/2, Pozytywny) — Wynik is the SECOND td-title-1 cell', () => {
  const [row] = parseBoardPage(RESOLVED_ROW_HTML);
  assert.match(row.dotyczyText, /Brodatego 12/);
  assert.match(row.cenaText, /300\.000,00 zł/);
  assert.equal(row.wynikText, 'Wynik Pozytywny');
  assert.equal(row.auctionDateRaw, '2025-12-16 10:30:00');
  assert.equal(row.attachments.length, 1);
  assert.equal(row.attachments[0].filename, 'ogloszenie_6_brodatego_12-2.docx');
});

test('boardUrl: page 1 omits the page segment, page N inserts it before "status"', () => {
  assert.equal(boardUrl(0, 1), 'https://bip.zagan.pl/przetargi/344/status/0/');
  assert.equal(boardUrl(1, 1), 'https://bip.zagan.pl/przetargi/344/status/1/');
  assert.equal(boardUrl(1, 6), 'https://bip.zagan.pl/przetargi/344/6/status/1/');
});


test('parseActiveFlatRow: Zelazna 16/3 real prose -> listing (extraction logic; see file header for this notice\'s actual current resolved state)', () => {
  const rec = parseActiveFlatRow(ZELAZNA_ROW);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'zelaznej|16|3');
  assert.equal(rec.address.street, 'Żelaznej');
  assert.equal(rec.address.building, '16');
  assert.equal(rec.address.apt, '3');
  assert.equal(rec.area_m2, 30);
  assert.equal(rec.starting_price_pln, 135000);
  assert.equal(rec.auction_date, '2025-12-16');
  assert.equal(rec.round, null);
  assert.equal(rec.detail_url, 'https://bip.zagan.pl/przetargi/344/599/3_/');
  assert.equal(
    rec.source_url,
    'https://bip.zagan.pl/system/pobierz.php?plik=ogloszenie_3_Zelazna_16-3__3112-7.docx&id=05bcaae81397d0bbb77773d709f07a9c',
  );
});

test('parseActiveLandRow: Asnyka 1979/2 real row -> land record', () => {
  const rec = parseActiveLandRow(ASNYKA_ROW);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1979/2');
  assert.equal(rec.street, 'Asnyka');
  assert.equal(rec.area_m2, 565);
  assert.equal(rec.starting_price_pln, 85000);
  assert.equal(rec.auction_date, '2026-07-14');
  assert.equal(rec.round, null);
  assert.equal(rec.detail_url, 'https://bip.zagan.pl/przetargi/344/653/1_/');
});


test('buildResultText: pending (Brak wyniku) row never gets an outcome sentence appended', () => {
  const text = buildResultText(ASNYKA_ROW);
  assert.doesNotMatch(text, /wynikiem/);
});

test('parseResultDoc: Zelazna 16/3 UNSOLD — real CURRENT state (III przetarg, Negatywny)', () => {
  const text = buildResultText(ZELAZNA_ROW);
  const [r] = parseResultDoc(text, dateOnly(ZELAZNA_ROW.auctionDateRaw), ZELAZNA_ROW.detailUrl);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'zelaznej|16|3');
  assert.equal(r.area_m2, 30);
  assert.equal(r.starting_price_pln, 135000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.round, null);
  assert.equal(r.auction_date, '2025-12-16');
  assert.equal(r.source_pdf, ZELAZNA_ROW.detailUrl);
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: Brodatego 12/2 SOLD (Pozytywny) — achieved price never published by this city\'s BIP, final_price_pln stays null with an explanatory note', () => {
  const text = buildResultText(BRODATEGO_ROW);
  const [r] = parseResultDoc(text, dateOnly(BRODATEGO_ROW.auctionDateRaw), BRODATEGO_ROW.detailUrl);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'brodatego|12|2');
  assert.equal(r.area_m2, 115.54);
  assert.equal(r.starting_price_pln, 300000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2025-12-16');
  assert.ok(r.notes.some((n) => /achieved price not published/.test(n)), `notes=${JSON.stringify(r.notes)}`);
});

test('parseResultDoc: Chrobrego 1786/14 LAND UNSOLD (Negatywny) — routes to a grunt-kind record', () => {
  const text = buildResultText(CHROBREGO_ROW);
  const [r] = parseResultDoc(text, dateOnly(CHROBREGO_ROW.auctionDateRaw), CHROBREGO_ROW.detailUrl);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1786/14');
  assert.equal(r.street, 'Bolesława Chrobrego');
  assert.equal(r.area_m2, 869);
  assert.equal(r.starting_price_pln, 130000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2026-06-30');
});

test('parseResultDoc: Kolejowa 3116/9 LAND UNSOLD — the "0, 0926 ha" stray-space quirk is tolerated end-to-end', () => {
  const text = buildResultText(KOLEJOWA_QUIRK_ROW);
  const [r] = parseResultDoc(text, dateOnly(KOLEJOWA_QUIRK_ROW.auctionDateRaw), KOLEJOWA_QUIRK_ROW.detailUrl);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '3116/9');
  assert.equal(r.area_m2, 926);
  assert.equal(r.starting_price_pln, 150000);
});

test('parseResultDoc: lease / out-of-scope text -> []', () => {
  assert.deepEqual(parseResultDoc(LEASE_TEXT, null, 'x'), []);
  assert.deepEqual(parseResultDoc(NARUTOWICZA_HOUSE_TEXT, null, 'x'), []);
});

test('parseResultDoc: empty / pending (no outcome sentence) text -> []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildResultText(ASNYKA_ROW), null, 'x'), []);
});
