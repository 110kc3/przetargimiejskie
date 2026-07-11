// Żagań parser tests. Fixtures are REAL text/HTML fetched live from
// bip.zagan.pl (verified 2026-07-11):
//
//   Żelazna 16/3   (id 599, /przetargi/344/599/3_/) — 30,00 m², 135.000,00 zł
//     starting. The task brief (from the 2026-07-09 spike) called this a
//     "live pending" flat; by this verification date its III przetarg
//     (16.12.2025) has already concluded NEGATYWNY (confirmed on the
//     resolved board, page 6 Lp 53) — I (22.07.2025) and II (07.10.2025) were
//     already negatywny per the detail page's own history text. The live
//     ACTIVE board is 100% land right now (10 parcels, zero flats) — matches
//     the spike's own "flats cycle in and out" observation. Żelazna's real
//     prose is used BOTH ways below: as an ACTIVE-row fixture (groundtruths
//     the active-parsing path against real text) and as its actual current
//     RESOLVED (Negatywny) state.
//   Brodatego 12/2 (id 600, /przetargi/344/600/6_/) — 115,54 m², 300.000,00 zł
//     starting, SOLD (Pozytywny) after a SIXTH przetarg. Demonstrates a real,
//     verified city-BIP property: neither the resolved row, the detail page,
//     nor its single "ogloszenie" DOCX attachment ever gains an achieved
//     price or buyer name — see parse.js file header. final_price_pln stays
//     null with an explanatory note.
//   Chrobrego 1786/14, Asnyka 1979/2 — LAND (niezabudowana), Negatywny/active.
//   Kolejowa 3116/9 (id 649) — LAND, carries a REAL source typo: "o pow.
//     0, 0926 ha" (stray space after the decimal comma) — the SAME parcel
//     re-listed at ids 649/607/597 all carry this typo; a later relisting
//     (id 632) does not, confirming it's a real, recurring source quirk
//     landAreaM2FromText must tolerate, not a one-off.
//   Narutowicza 19 — a real "budynku mieszkalnego" (house, kind 'zabudowana')
//     row — out of scope for this build (neither analog handles houses
//     either); groundtruths that inScopeKind correctly excludes it.
//   A 2015 dzierżawa (lease) notice from the /152/ Nieruchomości archive —
//     real text; this city's OWN /przetargi/344/ board carried zero
//     dzierżawa/najem rows across every page sampled (active + resolved +
//     unieważnione), so this groundtruths the lease-skip gate defensively,
//     same spirit as miedzyrzecz's own isFlatSaleRow.
//
// Raw single-row HTML fixtures (ACTIVE_ROW_HTML, RESOLVED_ROW_HTML) are
// byte-faithful copies of one <tr> from the live board fetch, used to
// groundtruth crawl.js's parseBoardPage() independently of the object-literal
// BoardRow fixtures used everywhere else in this file.

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

// --------------------------------------------------------------- real fixtures

// Resolved board (status=1), page 6, Lp 53 — real CURRENT state (see file header).
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

// Resolved board, page 6, Lp 52 — real SOLD (Pozytywny) flat.
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

// Resolved board, page 1, Lp 1 — real LAND, Negatywny.
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

// Resolved board, page 1, Lp 3 (id 649) — real LAND, Negatywny, carrying the
// REAL "o pow. 0, 0926 ha" stray-space quirk (see file header).
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

// Active board (status=0), page 1, Lp 1 — real LAND, Brak wyniku (pending).
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

// Real "budynku mieszkalnego" (house) row, resolved board page 4 Lp 36 —
// out-of-scope kind for this build (neither analog handles houses).
const NARUTOWICZA_HOUSE_TEXT =
  'Sprzedaż budynku mieszkalnego przy ul. Narutowicza 19, o powierzchni użytkowej 66,76 m2, wraz z prawem własności nieruchomości oznaczonej numerem ewidencyjnym 2306, o powierzchni 0.0660 ha. dla którego prowadzona jest księga wieczysta ZG1G/00019593/7.';

// Real (2015) dzierżawa notice, /152/Nieruchomosci/ archive — lease-skip fixture.
const LEASE_TEXT =
  'Ogłoszenie Burmistrza Miasta Żagań o pierwszym nieograniczonym przetargu ustnym na oddanie w dzierżawę na okres 10 lat komunalnego gruntu przy ul. Krętej w Żaganiu. Termin przetargu 27 maja 2015 r. godz. 12:00';

// Raw <tr> HTML, active board (status=0), page 1, Lp 1 — byte-faithful (whitespace/entities intact).
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

// Raw <tr> HTML, resolved board (status=1), page 6, Lp 52 (Brodatego 12/2, Pozytywny flat).
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

// ------------------------------------------------------------------- unit funcs

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
  assert.equal(landAreaM2FromText(ASNYKA_ROW.dotyczyText), 565); // 0,0565 ha
  assert.equal(dzialkaNrFromText(CHROBREGO_ROW.dotyczyText), '1786/14');
  assert.equal(landAreaM2FromText(CHROBREGO_ROW.dotyczyText), 869); // 0,0869 ha
  assert.equal(dzialkaNrFromText(KOLEJOWA_QUIRK_ROW.dotyczyText), '3116/9');
  assert.equal(landAreaM2FromText(KOLEJOWA_QUIRK_ROW.dotyczyText), 926); // "0, 0926 ha" -> 0.0926 ha
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
  // Houses ("budynku mieszkalnego") classify as 'zabudowana' — out of scope
  // for this build (neither gorzow-wielkopolski nor miedzyrzecz handle them
  // either); a real board row, groundtruthed to make sure it is silently
  // skipped rather than mis-filed as a flat or land record.
  assert.equal(inScopeKind(NARUTOWICZA_HOUSE_TEXT), null);
});

test('extractLokalAddress: four real live templates', () => {
  assert.equal(extractLokalAddress(ZELAZNA_ROW.dotyczyText), 'Żelaznej 16/3');
  assert.equal(extractLokalAddress(BRODATEGO_ROW.dotyczyText), 'Brodatego 12/2');
  // Multi-word street name ("Armii Krajowej") + "położonego" (genitive lokal
  // form) + a double space before "ul." in the live source.
  const armiiKrajowej =
    'Sprzedaż lokalu mieszkalnego nr 6, położonego przy  ul. Armii Krajowej 13, o powierzchni 17,82 m2, wraz z pomieszczeniami przynależnymi.';
  assert.equal(extractLokalAddress(armiiKrajowej), 'Armii Krajowej 13/6');
  // Trailing "w m. Żagań" (city name) right after the building number must
  // never be swallowed into the street/building capture.
  const bema =
    'Sprzedaż lokalu mieszkalnego nr 3, przy ul. Bema 8 w m. Żagań, o powierzchni 30,40 m2, wraz z pomieszczeniem przynależnym.';
  assert.equal(extractLokalAddress(bema), 'Bema 8/3');
  assert.equal(extractLokalAddress(ASNYKA_ROW.dotyczyText), null); // land — no "lokal ... nr N" anchor
  assert.equal(extractLokalAddress(''), null);
});

test('dateOnly: strips the time-of-day from the board\'s date+time column', () => {
  assert.equal(dateOnly('2025-12-16 10:00:00'), '2025-12-16');
  assert.equal(dateOnly(null), null);
});

// ------------------------------------------------------------------- board rows

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

// ----------------------------------------------------------------- active rows

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

// ------------------------------------------------------------------ result docs

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
