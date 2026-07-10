// Choszczno parser tests. Fixtures are condensed-but-faithful copies of REAL
// pdftotext(-layout) output fetched live from bip.choszczno.pl PDF attachments
// (verified 2026-07-10), plus real <h1>/board-row title text. Trimmed only the
// generic legal-citation boilerplate (identical on every ogłoszenie, unused by
// any regex) — every line a parser actually reads is verbatim, including the
// OCR degradation ("Pizetarg" for "Przetarg", "powieizchni" for "powierzchni")
// and the field-table layout pdftotext -layout produces.
//
//   ul. Rycerska 2/4  round V   — SOLD 2026-03-06, 230 000 -> 236 900 zł
//     (buyer clause "Magdalena i Przemysław małż. Pieśkiewicz." — the "małż."
//     abbreviation's internal period is a trap for a naive buyer regex)
//   ul. Rycerska 2/4  round IV  — UNSOLD 2025-05-12 (niestawiennictwo oferenta)
//     (also used, address-stripped, to exercise the OGLOSZENIE-missing ->
//     TITLE/INFORMACJA fallback path)
//   ul. Fabryczna 5   round I   — SOLD 2026-03-13, 177 000 -> 178 770 zł, a
//     HOUSE not a flat ("Budynek mieszkalny..."); its Opis nieruchomości states
//     TWO areas (house 460,89 m2, THEN outbuildings 97,00 m2) — a trap for a
//     naive "last match" area regex. Its INFORMACJA never restates the street
//     address at all (only obręb/parcel) — address must come from OGLOSZENIE.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  section,
  parsePLN,
  hasResolution,
  isLease,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressRawFromText,
  buyerFromText,
  kindFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/choszczno/parse.js';
import {
  parseListRows,
  parseYearLinks,
  findPrzetargiHref,
  parseAttachments,
} from '../src/cities/choszczno/crawl.js';
import { parseAddress } from '../src/core/normalize.js';

// --------------------------------------------------------------- real fixtures

const RYCERSKA_R5_TITLE =
  'Burmistrz Choszczna ogłasza piąty przetarg ustny nieograniczony na sprzedaż nieruchomości ' +
  'stanowiących własność Gminy Choszczno - Choszczno, ul. Rycerska 2/4';

const RYCERSKA_R5_OGLOSZENIE =
  'OGŁASZA Piąty przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność\n' +
  'Gminy Choszczno:\n\n' +
  ' 1.Miejscowość                   Choszczno, ul. Rycerska 2/4\n' +
  ' Typ nieruchomości               Lokal mieszkalny\n' +
  ' Nr działki, obręb, udział       216, obr. 3, 1025/10000\n' +
  ' Nr księgi wieczystej            SZ1C/00004656/8\n' +
  ' Powierzchnia                    0,0585 ha\n' +
  ' Opis nieruchomości              Budynek nr 2 pizy ul. Rycerskiej położony jest w zwartej zabudowie\n' +
  '                                 budynków wielorodzinnych oraz terenów usługowych, wzniesiony wioku\n' +
  '                                 1968 Jest to budynek wolnostojący, jednoklatkowy, pięciokondygnacyjny,\n' +
  '                                 całkowicie podpiwniczony.\n' +
  '                                 Lokal nr 4 położony jest na pierwszym piętrze i składa się obecnie z trzech\n' +
  '                                 pokoi , kuchni, łazienki i przedpokoju o łącznej powieizchni 53,73 m2 Do\n' +
  '                                 lokalu pizynalezy balkon usytuowany na długości jednego z pokoi i kuchni.\n' +
  '                                 Do lokalu mieszkalnego przynależy pomieszczenie piwniczne o powierzchni\n' +
  '                                 3,00 m2 zaliczone do powierzchni wspólnej.\n' +
  ' Wadium                          46.000,00 zł\n' +
  ' Cena wywoławcza (brutto)        230.000,00 zł\n' +
  '      Warunki przetargu:\n' +
  '    1. Pizetarg odbędzie się w dniu 6 marca 2026 r. w siedzibie Urzędu Miejskiego w Choszcznie o godzinie\n' +
  '10.00\n';

const RYCERSKA_R5_INFORMACJA =
  'Choszczno, dnia 13 marca 2026 r.\n' +
  'Nasz znak: WNA. 6840.17.13.2024.NSz\n\n' +
  'INFORMACJA\n\n' +
  'Burmistrz Choszczna niniejszym informuje, iż w dniu 6 marca 2026 roku o godz. 10.00 w sali\n' +
  'konferencyjnej w Urzędzie Miejskim w Choszcznie został przeprowadzony przetarg ustny\n' +
  'nieograniczony na sprzedaż prawa własności nieruchomości lokalowej położonej\n' +
  'w Choszcznie przy ul. Rycerskiej 2/4, stanowiącą własność Gminy Choszczno, położoną\n' +
  'w obrębie ewidencyjnym nr 3. m. Choszczno.\n\n' +
  'Cena wywoławcza do przetargu wynosiła 230.000,00 zł. Wadium wynosiło 20% ceny\n' +
  'wywoławczej, tj. 46.000,00 zł.\n\n' +
  'Warunki do uczestnictwa w przetargu spełnili : ZDI ZBYSZEWSKI SPÓŁKA Z OGRANICZONĄ\n' +
  'ODPOWIEDZIALNOŚCIĄ, Magdalena i Przemysław małż. Pieśkiewicz.\n\n' +
  'W wyniku przeprowadzenia i rozstrzygnięcia przetargu ustalono cenę 236.900,00 zł (słownie:\n' +
  'dwieście trzydzieści sześć tysięcy dziewięćset złotych oo/ioo), która nie jest opodatkowana\n' +
  'podatkiem VAT.\n\n' +
  'Nabywcą ustaleni zostali Magdalena i Przemysław małż. Pieśkiewicz.\n';

const RYCERSKA_R4_TITLE =
  'Burmistrz Choszczna ogłasza czwarty przetarg ustny nieograniczony na sprzedaż nieruchomości ' +
  'stanowiących własność Gminy Choszczno - Choszczno, ul. Rycerska 2/4';

// Real fixture — note the OCR-dropped period: "ul Rycerska" not "ul. Rycerska".
const RYCERSKA_R4_OGLOSZENIE =
  'OGŁASZA Czwarty przetarg ustny nieograniczony na spizedaz nieruchomości stanowiących\n' +
  'własność Gminy Choszczno:\n\n' +
  '1.Miejscowość                    Choszczno, ul Rycerska 2/4\n' +
  'Typ nieruchomości                Lokal mieszkalny\n' +
  'Nr działki, obręb, udział        216, obr. 3, 1025/10000\n' +
  'Powierzchnia                     0,0585 ha\n' +
  'Opis nieruchomości               Budynek nr 2 przy ul. Rycerskiej położony jest w zwartej zabudowie\n' +
  '                                 budynków wielorodzinnych oraz terenów usługowych, wzniesiony w roku\n' +
  '                                 1968. Jest to budynek wolnostojący, jednoklatkowy, pięciokondygnacyjny.\n' +
  '                                 Lokal nr 4 położony jest na pierwszym piętrze i składa się obecnie z trzech\n' +
  '                                 pokoi , kuchni, łazienki i przedpokoju o łącznej powierzchni 53,73 m2. Do\n' +
  '                                 lokalu przynależy balkon usytuowany na długości jednego z pokoi i kuchni.\n' +
  'Wadium                           46 000,00 zł\n' +
  'Cena wywoławcza (brutto)         230.000,00 zł\n' +
  '      Warunki przetargu-\n' +
  '    1 Przetarg odbędzie się w dniu 12 maja 2025 r. w siedzibie Urzędu Miejskiego w Choszcznie o godzinie\n' +
  '10.00\n';

const RYCERSKA_R4_INFORMACJA =
  'Choszczno, 12 maja 2025 r.\n' +
  'Nasz znak:NA.6840.17.!2.2024.NSz\n\n' +
  'INFORMACJA\n\n' +
  'Burmistrz Choszczna, zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r.\n' +
  'w sprawie sposobu trybu przeprowadzania przetargów oraz rokowań na zbycie\n' +
  'nieruchomości (t.j Dz. U. z 2021 r., poz. 2213), informuję o wyniku IV przetargu ustnego\n' +
  'nieograniczonego przeprowadzonego w dniu 12 maja 2025 r. w siedzibie Urzędu Miejskiego w\n' +
  'Choszcznie.\n\n' +
  'Przedmiotem przetargu była sprzedaż prawa własności lokalu mieszkalnego położonego w\n' +
  'Choszcznie przy ul. Rycerskiej 2/4 wraz z przynależnym do lokalu udziałem w gruncie w\n' +
  'wysokości 1025/10000, położonej w obrębie ewidencyjnym nr 3 m. Choszczno, oznaczonej\n' +
  'działką nr 216 o pow. 0,0585 ha, opisanej w księdze wieczystej nr SZ1C/00004656/8.\n' +
  'Osoby dopuszczone/niedopuszczone do uczestnictwa w przetargu: 1/0.\n' +
  'Cena wywoławcza wynosiła: 230.000,00 zł (słownie: dwieście trzydzieści tysięcy złotych\n' +
  '00/100).\n\n' +
  'Przetarg rozstrzygnął się wynikiem negatywnym z uwagi na niestawiennictwo oferenta.\n';

const FABRYCZNA_TITLE =
  'Burmistrz Choszczna ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości ' +
  'stanowiących własność Gminy Choszczno - Choszczno, ul. Fabryczna 5';

const FABRYCZNA_OGLOSZENIE =
  'OGŁASZA Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących\n' +
  'własność Gminy Choszczno:\n\n' +
  '1.Miejscowość                 Choszczno, ul. Fabryczna 5\n' +
  'Typ nieruchomości             Budynek mieszkalny wraz z dwoma budynkami gospodarczymi\n' +
  'Nr działki, obręb/ udział     48, obr. 2 Choszczno/ 1/1\n' +
  'Nr księgi wieczystej          SZ1C/00031471/5\n' +
  'Powierzchnia                  0,1006 ha\n' +
  'Opis nieruchomości            Nieruchomość położona w miejscowości Choszczno, przy ul. Fabrycznej.\n' +
  '                              Nieruchomość zabudowana budynkiem mieszkalnym o pow. użytkowej ok.\n' +
  '                              460,89 m2 oraz dwoma budynkami gospodaiczymi o łącznej pow. zabudowy\n' +
  '                              97,00 m2. Położenie i lokalizacja ogólna: dobra, bardzo dobra, kształt działki\n' +
  '                              korzystny, dostępność dobra, bezpośredni dostęp od ul. Fabrycznej, teien\n' +
  '                              płaski.\n' +
  'Wadium                        35.400,00 zł\n' +
  'Cena wywoławcza (brutto)      177.000,00 zł\n' +
  '      Warunki przetargu:\n' +
  '    1. Przetarg odbędzie się w dniu 13 marca 2026 r. w siedzibie Urzędu Miejskiego w Choszcznie o godzinie\n' +
  '10.00\n';

const FABRYCZNA_INFORMACJA =
  'Choszczno, dnia 20 marca 2026 r.\n' +
  'Nasz znak: WNA. 6840.21.2.8.2025.NSz\n\n' +
  'INFORMACJA\n\n' +
  'Burmistrz Choszczna niniejszym informuje, iż w dniu 13 marca 2026 roku o godz. 10.00 w sali\n' +
  'konferencyjnej w Urzędzie Miejskim w Choszcznie został przeprowadzony przetarg ustny\n' +
  'nieograniczony na sprzedaż prawa własności nieruchomości nr 48 położonej w obr. 2\n' +
  'm. Choszczno o pow. 0,1006 ha, dla której Sąd Rejonowy w Choszcznie V Wydział Ksiąg\n' +
  'Wieczystych prowadzi księgę nr SZ1C/00031471/5.\n\n' +
  'Cena wywoławcza do przetargu wynosiła 177.000,00 zł. Wadium wynosiło 20% ceny\n' +
  'wywoławczej, tj. 35.400,00 zł.\n\n' +
  'Warunki do uczestnictwa w przetargu spełniło: Przedsiębiorstwo Usługowo Handlowe\n' +
  'Transport Eksport - Import Roman Kaczmarczyk.\n\n' +
  'W wyniku przeprowadzenia i rozstrzygnięcia przetargu ustalono cenę 178.770,00 zł brutto\n' +
  '(słownie: sto siedemdziesiąt osiem tysięcy siedemset siedemdziesiąt złotych oo/ioo), która jest\n' +
  'opodatkowana podatkiem VAT w obowiązującej stawce.\n\n' +
  'Nabywcą ustalone zostało Przedsiębiorstwo Usługowo Handlowe Transport Eksport - Import\n' +
  'Roman Kaczmarczyk.\n';

// A THIRD real record, found by the live crawl check (not part of the task's
// two required fixtures, but kept — it caught two more real bugs): ul.
// Poziomkowa 4, round II, SOLD 2023-06-13, 140 000 -> 141 400 zł. Its
// INFORMACJA reverses the word order of BOTH the achieved-price clause
// ("cena ustalona została na kwotę…" instead of "ustalono cenę…") and the
// buyer clause ("Nabywcą został ustalony…" instead of "Nabywcą ustalony
// został…") relative to the Rycerska/Fabryczna fixtures above — a different
// clerk/year's phrasing. Its OGŁOSZENIE (share-in-building sale, a THIRD
// wording again) also has an extra qualifier word between "użytkowej" and the
// area figure ("pow. użytkowej wynoszącej 126,87 m2") that neither of the
// other two OGŁOSZENIE fixtures has.
const POZIOMKOWA_TITLE =
  'Burmistrz Choszczna ogłasza II przetarg ustny nieograniczony na sprzedaż nieruchomości - ul. Poziomkowa 4';

const POZIOMKOWA_OGLOSZENIE =
  'OGŁASZA\n' +
  'II przetarg ustny nieograniczony na sprzedaż nieruchomości\n' +
  '   Przedmiotem przetargu jest nieruchomość gruntowa stanowiącą własność Gminy Choszczno stanowiąca\n' +
  'udział do wysokości 616/1000 części w zabudowanej nieruchomości gruntowej położonej w Choszcznie\n' +
  'przy ul. Poziomkowej 4, w obrębie nr 4 m. Choszczno, oznaczonej numerem ewidencyjnym działki\n' +
  '101 o pow. 0,0844 ha. W ramach zabudowań nabywca korzystał będzie z części budynku mieszkalnego,\n' +
  'w którego skład wchodzą 3 lokale mieszkalne o przybliżonej pow. użytkowej wynoszącej 126,87 m2. Sąd\n' +
  'Rejonowy w Choszcznie V Wydział Ksiąg Wieczystych prowadzi dla ww. nieruchomości księgę wieczystą\n' +
  'nr SZ1C/00002201/0.\n\n' +
  '  Termin i miejsce przetargu: 13 czerwca 2023 r. o godz. 10:00 w sali narad Urzędu Miejskiego\n' +
  'w Choszcznie przy ul. Wolności 24 (pokój nr -3P).\n' +
  '   I przetarg zakończony wynikiem negatywnym odbył się w dniu 28 lutego 2023 r.\n' +
  '   Cena wywoławcza: 140.000,00 zł (słownie: sto czterdzieści tysięcy złotych 00/100). Cena zbycia\n' +
  'nie podlega opodatkowaniu podatkiem VAT.\n';

const POZIOMKOWA_INFORMACJA =
  'Choszczno, 20 czerwca 2023 r.\n' +
  'Nasz znak: NR.6840.43.9.2022.NSz\n\n' +
  'INFORMACJA\n\n' +
  'Burmistrz Choszczna niniejszym informuje, iż w dniu 13 czerwca 2023 roku o godz. 10.00 w sali\n' +
  'narad w Urzędzie Miejskim w Choszcznie został przeprowadzony II przetarg ustny\n' +
  'nieograniczony na sprzedaż jest udział w wys. 616/1000 części w nieruchomość wspólnej\n' +
  'budynku mieszkalnego wielorodzinnego przy ul. Poziomkowej 4 oraz w gruncie działki\n' +
  'oznaczonej nr ewid. 101, obr. 4 miasta Choszczna o pow. 0,0844 ha. Dla ww. nieruchomości\n' +
  'Sąd Rejonowy w Choszcznie V Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr\n' +
  'SZ1 C/00002201/0.\n\n' +
  'Cena wywoławcza do przetargu wynosiła 140.000,00 zł. Wadium wynosiło 20% ceny\n' +
  'wywoławczej, tj. 28.000,00 zł.\n\n' +
  'W wyniku przeprowadzenia i rozstrzygnięcia przetargu cena ustalona została na kwotę\n' +
  '141.400,00 zł brutto (słownie: sto czterdzieści jeden tysięcy czterysta złotych 00/100), która\n' +
  'zawiera podatek VAT w wysokości 23%.\n\n' +
  'Nabywcą został ustalony Pan Roman Kaczmarczyk.\n';

function blob({ title, ogloszenie = '', informacja = '' }) {
  return buildRecordText({ title, ogloszenie, informacja });
}

const R5_SOLD = blob({ title: RYCERSKA_R5_TITLE, ogloszenie: RYCERSKA_R5_OGLOSZENIE, informacja: RYCERSKA_R5_INFORMACJA });
const R4_UNSOLD = blob({ title: RYCERSKA_R4_TITLE, ogloszenie: RYCERSKA_R4_OGLOSZENIE, informacja: RYCERSKA_R4_INFORMACJA });
const FABRYCZNA_SOLD = blob({ title: FABRYCZNA_TITLE, ogloszenie: FABRYCZNA_OGLOSZENIE, informacja: FABRYCZNA_INFORMACJA });
const R5_PENDING = blob({ title: RYCERSKA_R5_TITLE, ogloszenie: RYCERSKA_R5_OGLOSZENIE }); // informacja not yet published
const POZIOMKOWA_SOLD = blob({ title: POZIOMKOWA_TITLE, ogloszenie: POZIOMKOWA_OGLOSZENIE, informacja: POZIOMKOWA_INFORMACJA });

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, space-thousands, grosze tail', () => {
  assert.equal(parsePLN('230.000,00'), 230000);
  assert.equal(parsePLN('46 000,00'), 46000);
  assert.equal(parsePLN('236.900,00'), 236900);
  assert.equal(parsePLN('brak'), null);
});

test('section: splits the labelled blob on TITLE/OGLOSZENIE/INFORMACJA, tolerates an empty trailing section', () => {
  assert.equal(section(R5_SOLD, 'TITLE'), RYCERSKA_R5_TITLE);
  assert.ok(section(R5_SOLD, 'OGLOSZENIE').includes('Cena wywoławcza (brutto)        230.000,00 zł'));
  assert.ok(section(R5_SOLD, 'INFORMACJA').includes('ustalono cenę 236.900,00 zł'));
  assert.equal(section(R5_PENDING, 'INFORMACJA'), '');
  // OGLOSZENIE must not leak into TITLE nor INFORMACJA.
  assert.ok(!section(R5_SOLD, 'TITLE').includes('Cena wywoławcza'));
});

test('gates: hasResolution, isLease, isNegativeOutcome', () => {
  assert.equal(hasResolution(R5_SOLD), true);
  assert.equal(hasResolution(R5_PENDING), false);
  assert.equal(hasResolution(R4_UNSOLD), true); // a negative outcome IS a resolution
  assert.equal(isNegativeOutcome(R4_UNSOLD), true);
  assert.equal(isNegativeOutcome(R5_SOLD), false);
  assert.equal(
    isLease(blob({ title: 'Burmistrz Choszczna ogłasza pierwszy przetarg ustny nieograniczony na najem części nieruchomości gruntowej, położonej w Choszcznie przy ul. Kossaka' })),
    true,
  );
  assert.equal(isLease(R5_SOLD), false);
});

test('roundFromText: word ordinal (piąty/czwarty/pierwszy) from the TITLE', () => {
  assert.equal(roundFromText(R5_SOLD), 5);
  assert.equal(roundFromText(R4_UNSOLD), 4);
  assert.equal(roundFromText(FABRYCZNA_SOLD), 1);
});

test('roundFromText: Roman numeral form also recognised', () => {
  const romanTitle = 'Burmistrz Choszczna ogłasza IV przetarg ustny nieograniczony na sprzedaż nieruchomości - działka nr 213/5 obręb 4 Choszczno';
  assert.equal(roundFromText(blob({ title: romanTitle })), 4);
});

test('auctionDateFromText: OGLOSZENIE "odbędzie się w dniu" survives the Przetarg->Pizetarg OCR slip', () => {
  assert.equal(auctionDateFromText(R5_SOLD), '2026-03-06');
  assert.equal(auctionDateFromText(R4_UNSOLD), '2025-05-12');
  assert.equal(auctionDateFromText(FABRYCZNA_SOLD), '2026-03-13');
});

test('auctionDateFromText: falls back to INFORMACJA "w dniu" when OGLOSZENIE is unavailable', () => {
  const infoOnly = blob({ title: RYCERSKA_R4_TITLE, informacja: RYCERSKA_R4_INFORMACJA });
  assert.equal(auctionDateFromText(infoOnly), '2025-05-12');
});

test('auctionDateFromText: "Termin i miejsce ... przetargu" label (older/free-prose OGŁOSZENIE templates)', () => {
  // Real fixture text (Ogłoszenie 2243/23, ul. Ogrodowa, 2023 — free-prose
  // land template, colon-labelled, same line as the date).
  const ogrodowaOgl = 'Termin i miejsce przetargu: 18 września 2023 r. o godz. 10:00 w sali narad Urzędu Miejskiego';
  assert.equal(auctionDateFromText(blob({ title: 'x', ogloszenie: ogrodowaOgl })), '2023-09-18');
  // Real fixture text (ul. Wolności 58/4, 2021 — "Adres i oznaczenie
  // nieruchomości" template, no colon, date wraps to the next line).
  const wolnosciOgl =
    'Termin i miejsce części jawnej przetargu\n' +
    '   21 października 2021 r.               godz. 10:00                         sala narad (pokój nr -3P)';
  assert.equal(auctionDateFromText(blob({ title: 'x', ogloszenie: wolnosciOgl })), '2021-10-21');
});

test('startingPriceFromText: OGLOSZENIE structured field, not derailed by an adjacent Wadium figure', () => {
  assert.equal(startingPriceFromText(R5_SOLD), 230000);
  assert.equal(startingPriceFromText(R4_UNSOLD), 230000);
  assert.equal(startingPriceFromText(FABRYCZNA_SOLD), 177000);
});

test('startingPriceFromText: falls back to INFORMACJA\'s restated Cena wywoławcza when OGLOSZENIE is unavailable', () => {
  const infoOnly = blob({ title: RYCERSKA_R4_TITLE, informacja: RYCERSKA_R4_INFORMACJA });
  assert.equal(startingPriceFromText(infoOnly), 230000);
});

test('achievedPriceFromText: sold -> amount, unsold -> null', () => {
  assert.equal(achievedPriceFromText(R5_SOLD), 236900);
  assert.equal(achievedPriceFromText(FABRYCZNA_SOLD), 178770);
  assert.equal(achievedPriceFromText(R4_UNSOLD), null);
});

test('buyerFromText: the internal "małż." abbreviation period does not truncate the match', () => {
  assert.equal(buyerFromText(R5_SOLD), 'Magdalena i Przemysław małż. Pieśkiewicz');
});

test('buyerFromText: a buyer name that wraps onto a second physical line is still captured whole', () => {
  // Real fixture: "...Transport Eksport - Import\nRoman Kaczmarczyk." — the
  // sentence's real terminator is two lines down, not the embedded " - ".
  assert.equal(buyerFromText(FABRYCZNA_SOLD), 'Przedsiębiorstwo Usługowo Handlowe Transport Eksport - Import Roman Kaczmarczyk');
});

test('buyerFromText: no buyer clause -> null', () => {
  assert.equal(buyerFromText(R4_UNSOLD), null);
});

test('buyerFromText: reversed word order ("Nabywcą został ustalony Pan X") is also recognised', () => {
  assert.equal(buyerFromText(POZIOMKOWA_SOLD), 'Pan Roman Kaczmarczyk');
});

test('unitAreaFromText: flat area, tolerant of the powierzchni->powieizchni OCR slip', () => {
  assert.equal(unitAreaFromText(R5_SOLD), 53.73); // OCR "powieizchni"
  assert.equal(unitAreaFromText(R4_UNSOLD), 53.73); // clean "powierzchni"
});

test('unitAreaFromText: house area takes the FIRST figure, not the later outbuilding figure', () => {
  assert.equal(unitAreaFromText(FABRYCZNA_SOLD), 460.89);
});

test('unitAreaFromText: bridges an extra qualifier word ("pow. użytkowej wynoszącej 126,87 m2")', () => {
  assert.equal(unitAreaFromText(POZIOMKOWA_SOLD), 126.87);
});

test('achievedPriceFromText: reversed word order ("cena ustalona została na kwotę", wraps to next line)', () => {
  assert.equal(achievedPriceFromText(POZIOMKOWA_SOLD), 141400);
});

test('kindFromText: flat vs house vs lease', () => {
  assert.equal(kindFromText(R5_SOLD), 'mieszkalny');
  assert.equal(kindFromText(FABRYCZNA_SOLD), 'zabudowana');
});

test('kindFromText: falls back to INFORMACJA prose when OGLOSZENIE is unavailable', () => {
  const infoOnly = blob({ title: RYCERSKA_R4_TITLE, informacja: RYCERSKA_R4_INFORMACJA });
  // INFORMACJA says "sprzedaż prawa własności lokalu mieszkalnego położonego..."
  assert.equal(kindFromText(infoOnly), 'mieszkalny');
});

test('addressRawFromText: OGLOSZENIE Miejscowość field, locality prefix stripped', () => {
  assert.equal(addressRawFromText(R5_SOLD), 'ul. Rycerska 2/4');
  assert.equal(addressRawFromText(FABRYCZNA_SOLD), 'ul. Fabryczna 5');
});

test('addressRawFromText: tolerates the OCR-dropped period ("ul Rycerska")', () => {
  assert.equal(addressRawFromText(R4_UNSOLD), 'ul Rycerska 2/4');
  assert.equal(parseAddress(addressRawFromText(R4_UNSOLD))?.key, 'rycerska|2|4');
});

test('addressRawFromText: falls back to the TITLE tail when OGLOSZENIE is unavailable', () => {
  const titleOnly = blob({ title: RYCERSKA_R5_TITLE });
  assert.equal(addressRawFromText(titleOnly), 'ul. Rycerska 2/4');
});

test('addressRawFromText: a land/obręb-only title (no street token) yields null', () => {
  const landTitle = 'Burmistrz Choszczna ogłasza II przetarg ustny ograniczony na sprzedaż nieruchomości stanowiących własność Gminy Choszczno - obr. Stary Klukom';
  assert.equal(addressRawFromText(blob({ title: landTitle })), null);
});

// ------------------------------------------------------------- result records

test('parseResultDoc: Rycerska 2/4 round V SOLD', () => {
  const [r] = parseResultDoc(R5_SOLD, null, 'https://bip.choszczno.pl/pliki/choszczno/zalaczniki/379333/informacja-o-wyborze-nabywcy.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'rycerska|2|4');
  assert.equal(r.address.street, 'Rycerska');
  assert.equal(r.address.building, '2');
  assert.equal(r.address.apt, '4');
  assert.equal(r.area_m2, 53.73);
  assert.equal(r.starting_price_pln, 230000);
  assert.equal(r.final_price_pln, 236900);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 5);
  assert.equal(r.auction_date, '2026-03-06');
  assert.equal(r.buyer, 'Magdalena i Przemysław małż. Pieśkiewicz');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, 'https://bip.choszczno.pl/pliki/choszczno/zalaczniki/379333/informacja-o-wyborze-nabywcy.pdf');
});

test('parseResultDoc: Rycerska 2/4 round IV UNSOLD (niestawiennictwo oferenta)', () => {
  const [r] = parseResultDoc(R4_UNSOLD, null, 'https://bip.choszczno.pl/pliki/choszczno/zalaczniki/378253/informacja-o-wyniku-iv-przetargu-ustnego.pdf');
  assert.equal(r.address.key, 'rycerska|2|4');
  assert.equal(r.starting_price_pln, 230000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.round, 4);
  assert.equal(r.auction_date, '2025-05-12');
  assert.equal(r.buyer, null);
});

test('parseResultDoc: Fabryczna 5 round I SOLD — a HOUSE, not a flat', () => {
  const [r] = parseResultDoc(FABRYCZNA_SOLD, null, 'https://bip.choszczno.pl/pliki/choszczno/zalaczniki/379346/informacja-o-wylonionym-nabywcy.pdf');
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'fabryczna|5|');
  assert.equal(r.area_m2, 460.89); // not 97.00 (outbuildings)
  assert.equal(r.starting_price_pln, 177000);
  assert.equal(r.final_price_pln, 178770);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-03-13');
  assert.ok(r.buyer.includes('Roman Kaczmarczyk'));
});

test('parseResultDoc: Poziomkowa 4 round II SOLD — reversed-word-order INFORMACJA phrasing', () => {
  const [r] = parseResultDoc(POZIOMKOWA_SOLD, null, 'https://bip.choszczno.pl/pliki/choszczno/zalaczniki/375806/informacja.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'poziomkowa|4|');
  assert.equal(r.area_m2, 126.87);
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.final_price_pln, 141400);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2023-06-13');
  assert.equal(r.buyer, 'Pan Roman Kaczmarczyk');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: falls back to the fallbackDate param when no date is derivable from the text', () => {
  // Strip both the OGLOSZENIE date clause and the INFORMACJA date clause.
  const noDateOgl = RYCERSKA_R5_OGLOSZENIE.replace(/Pizetarg odbędzie się w dniu[^\n]*/, 'Pizetarg odbędzie się.');
  const noDateInfo = RYCERSKA_R5_INFORMACJA.replace(/iż w dniu[^\n]*/, 'iż');
  const noDate = blob({ title: RYCERSKA_R5_TITLE, ogloszenie: noDateOgl, informacja: noDateInfo });
  const [r] = parseResultDoc(noDate, '2026-02-04', 'https://bip.choszczno.pl/x');
  assert.equal(r.auction_date, '2026-02-04');
});

test('parseResultDoc: returns [] for a still-pending (no INFORMACJA) case', () => {
  assert.deepEqual(parseResultDoc(R5_PENDING, null, 'x'), []);
});

// ----------------------------------------------------------- active listings

test('parseAnnouncement: pending flat (no INFORMACJA yet) -> active listing', () => {
  const rec = parseAnnouncement(R5_PENDING);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'rycerska|2|4');
  assert.equal(rec.area_m2, 53.73);
  assert.equal(rec.starting_price_pln, 230000);
  assert.equal(rec.auction_date, '2026-03-06');
  assert.equal(rec.round, 5);
});

test('parseAnnouncement: pending house', () => {
  const pending = blob({ title: FABRYCZNA_TITLE, ogloszenie: FABRYCZNA_OGLOSZENIE });
  const rec = parseAnnouncement(pending);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'fabryczna|5|');
  assert.equal(rec.area_m2, 460.89);
  assert.equal(rec.starting_price_pln, 177000);
});

test('parseAnnouncement: no text -> null', () => {
  assert.equal(parseAnnouncement(''), null);
  assert.equal(parseAnnouncement(null), null);
});

// ----------------------------------------------------------- crawl.js helpers

test('parseListRows: extracts href/title/published_at despite the missing closing </a>', () => {
  // Verbatim shape of the real "Lista artykułów" board table (bip.choszczno.pl
  // /artykul/przetargi-2008, captured live 2026-07-10) — note </a> is absent.
  const html = `
    <table class="table table-striped lista_artykuly" width="100%">
      <thead><tr><th>Tytuł</th><th style="width: 25%">Data publikacji</th></tr></thead>
      <tbody>
        <tr>
          <td><a href="/artykul/burmistrz-choszczna-oglasza-piaty-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stano">Burmistrz Choszczna ogłasza piąty przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Gminy Choszczno - Choszczno, ul. Rycerska 2/4</td>
          <td>2026-02-04 14:19:01</td>
        </tr>
        <tr>
          <td><a href="/artykul/burmistrz-choszczna-oglasza-i-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stanowiac-6">Burmistrz Choszczna ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Gminy Choszczno - Choszczno, dz. 372/6</td>
          <td>2026-06-15 13:43:51</td>
        </tr>
      </tbody>
    </table>`;
  const rows = parseListRows(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].href, 'https://bip.choszczno.pl/artykul/burmistrz-choszczna-oglasza-piaty-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-stano');
  assert.ok(rows[0].title.includes('ul. Rycerska 2/4'));
  assert.equal(rows[0].published_at, '2026-02-04');
  assert.ok(rows[1].title.includes('dz. 372/6'));
});

test('parseYearLinks: extracts year -> url, newest first', () => {
  const html = `
    <a href="/artykul/ogloszenia-2003-r">2003</a>
    <a href="/artykul/ogloszenia-2025-r">2025</a>
    <a href="/artykul/ogloszenia-2026-r">2026</a>
    <a href="https://bip.choszczno.pl/artykul/ogloszenia">Ogłoszenia</a>`;
  const years = parseYearLinks(html);
  assert.deepEqual(years.map((y) => y.year), [2026, 2025, 2003]);
  assert.equal(years[0].url, 'https://bip.choszczno.pl/artykul/ogloszenia-2026-r');
});

test('findPrzetargiHref: locates the row titled exactly "Przetargi" among year-page sub-boards', () => {
  // Verbatim shape of /artykul/ogloszenia-2026-r's own list table.
  const html = `
    <tbody>
      <tr><td><a href="/artykul/lowiectwo-11">Łowiectwo</td><td>2026-01-14 14:29:14</td></tr>
      <tr><td><a href="/artykul/przetargi-2008">Przetargi</td><td>2026-02-04 14:15:38</td></tr>
      <tr><td><a href="/artykul/wykazy-16">Wykazy</td><td>2026-01-19 13:55:29</td></tr>
    </tbody>`;
  const href = findPrzetargiHref(parseListRows(html));
  assert.equal(href, 'https://bip.choszczno.pl/artykul/przetargi-2008');
});

test('parseAttachments: routes on the download-link table, filename recoverable for informacja/ogloszenie routing', () => {
  // Verbatim shape of the Rycerska round V article's "Załączniki do pobrania" table.
  const html = `
    <table class="table table-striped " width="100%">
      <tbody>
        <tr><td><span class="far fa-file-pdf"></span></td>
          <td><a href="/pliki/choszczno/zalaczniki/379333/informacja-o-wyborze-nabywcy.pdf" class="download" id="26098" download="">Informacja o wyborze nabywcy (PDF, 325.40Kb)</a></td>
          <td>2026-03-13 13:22:43</td><td>26</td></tr>
        <tr><td><span class="far fa-file-pdf"></span></td>
          <td><a href="/pliki/choszczno/zalaczniki/379333/ogloszenie-o-przetargu.pdf" class="download" id="25932" download="">Ogłoszenie o przetargu (PDF, 1.08Mb)</a></td>
          <td>2026-02-04 14:19:01</td><td>103</td></tr>
      </tbody>
    </table>`;
  const atts = parseAttachments(html);
  assert.equal(atts.length, 2);
  assert.equal(atts[0].filename, 'informacja-o-wyborze-nabywcy.pdf');
  assert.equal(atts[0].url, 'https://bip.choszczno.pl/pliki/choszczno/zalaczniki/379333/informacja-o-wyborze-nabywcy.pdf');
  assert.equal(atts[1].filename, 'ogloszenie-o-przetargu.pdf');
});
