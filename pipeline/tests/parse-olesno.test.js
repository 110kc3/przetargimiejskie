// Olesno parser tests. Fixtures are condensed-but-faithful copies of REAL
// page text fetched live from bip.olesno.pl (verified 2026-07-10, from this
// Pi's Polish residential IP). Long non-load-bearing boilerplate (building
// construction materials, geodesy disclaimers, notarial-cost warnings) is
// trimmed; every sentence that feeds a parsed field (address, area, price,
// date, round, outcome) is kept verbatim.
//
// The single groundtruth flat — ul. Małe Przedmieście 1, lokal nr 2, Olesno
// (14,09 m², udział 142/10000, Wspólnota Mieszkaniowa Małe Przedmieście 1 –
// Pieloka 11) — recurred across three 2025 rounds:
//   round I   announce  bip.olesno.pl/12154  cena wywoławcza 55 000 zł
//   round II  announce  bip.olesno.pl/12535  cena wywoławcza 50 000 zł
//   round II  result    bip.olesno.pl/12660  UNSOLD (wynikiem negatywnym)
//   round III announce  bip.olesno.pl/12722  cena wywoławcza 48 000 zł
//   round III result    bip.olesno.pl/12790  SOLD 48 480 zł netto (nabywca
//                        "AD-BAU" Artur Świtała, rozstrzygnięcie 2025-10-10)
// round I's result (bip.olesno.pl/12368) is a PDF-only Google-Docs-viewer
// iframe with no inline text — parseResultDoc must gracefully return [] for
// it (residual gap, no PDF-text fallback wired in this build).
//
// Announcements state the street as full "Małe Przedmieście"; results
// abbreviate it "M. Przedmieście" — both must resolve to the SAME
// address.key for build-properties' round-history merge to join correctly.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  mentionsLokal,
  isAnnounceTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc,
  extractArticleText,
  roundFromText,
  parsePLN,
} from '../src/cities/olesno/parse.js';

// --------------------------------------------------------------- fixtures

// Wraps body prose in the real Olesno skyCMS (bip_v4) page skeleton: an
// empty <div id="webreaderContainer"></div> sits between the heading and the
// real content on EVERY live page — this is the exact shape that broke a
// naive id="printArea" brace-counting regex (it stopped at that div's
// immediate </div>, truncating to just the title). bip-page__footer is the
// real trailing boundary (Metryczka/attachments), also verified live.
function pageHtml(title, bodyHtml) {
  return `<!doctype html><html><body>
<div class="bip-content col-12 col-md-7 col-lg-8 px-0">
<div id="printArea" class="bip-page bg-default wcag-border webreaderRead">
<h1 class="pageHeader">${title}</h1>
<div id="webreaderContainer"></div>
<div class="bip-page__content">
${bodyHtml}
</div>
</div>
</div>
<div class="bip-page__footer">
<ul><li><a href="#" class="btn btn-xml">XML</a></li></ul>
<div class="bip-info"><div class="bip-info__title">Metryczka</div>
<ul><li>Wytworzono: 31-03-2025 przez: Roman Kokot</li></ul></div>
</div>
</body></html>`;
}

const ROUND1_TITLE =
  'I przetarg ustny nieograniczony na sprzedaż lokalu nr 2 przy ulicy Małe Przedmieście 1- Pieloka 11.';
const ROUND1_ANNOUNCE_HTML = pageHtml(
  ROUND1_TITLE,
  `<p>BURMISTRZ OLESNA OGŁASZA I PRZETARG USTNY NIEOGRANICZONY NA SPRZEDAŻ LOKALU
STANOWIĄCEGO WŁASNOŚĆ GMINY OLESNO 1.Przedmiotem przetargu jest lokal mieszkalny
nr 2 o powierzchni 14,09 m 2 , wraz z udziałem w nieruchomości wspólnej
wynoszącym 142/10000 położony na parterze budynku mieszkalno-usługowego
Wspólnoty Mieszkaniowej Małe Przedmieście 1 - Pieloka 11 w Oleśnie.</p>
<p>Opis lokalu mieszkalnego. Lokal mieszkalny o numerze 2 mieści się na parterze
budynku mieszkalno-usługowego. Powierzchnia użytkowa lokalu wynosi 14,09m 2 .</p>
<p>Cena wywoławcza lokalu użytkowego nr 2 ustalona do I przetargu wynosi:
55.000 złotych netto. Najniższe postąpienie w licytacji wynosi nie mniej niż
1% ceny wywoławczej, tj. 550 złotych.</p>
<p>Nabywca pokrywa koszty zawarcia umowy notarialnej. Przetarg odbędzie się
12 marca 2025 roku o godz. 10 00 w sali nr 114 Urzędu Miejskiego w Oleśnie.</p>`,
);

const ROUND2_TITLE = 'Ogłoszenie o II przetargu na sprzedaż lokalu mieszkalnego w Oleśnie.';
const ROUND2_ANNOUNCE_HTML = pageHtml(
  ROUND2_TITLE,
  `<p>BURMISTRZ OLESNA OGŁASZA II przetarg ustny nieograniczony na sprzedaż
nieruchomości stanowiącej własność Gminy Olesno: 1.Przedmiotem przetargu jest
lokal mieszkalny nr 2 o powierzchni 14,09 m 2 , wraz z udziałem w
nieruchomości wspólnej wynoszącym 142/10000 położony na parterze budynku
mieszkalno-usługowego Wspólnoty Mieszkaniowej Małe Przedmieście 1 - Pieloka 11
w Oleśnie.</p>
<p>Opis lokalu mieszkalnego. Powierzchnia użytkowa lokalu wynosi 14,09m 2 .</p>
<p>Cena wywoławcza lokalu użytkowego nr 2 ustalona do II przetargu wynosi:
50.000 złotych netto.</p>
<p>Przetarg odbędzie się 08 lipca 2025 roku o godz. 10 00 w sali nr 117
Urzędu Miejskiego w Oleśnie.</p>`,
);

const ROUND2_RESULT_TITLE =
  'Informacja o wynikach II przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 w Oleśnie przy ul. M. Przedmieście 1 - Pieloka 11.';
const ROUND2_RESULT_HTML = pageHtml(
  ROUND2_RESULT_TITLE,
  `<p>Na podstawie § 12 ust. 1 Rozporządzenia Rady Ministrów z dnia 14 września
2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na
zbycie nieruchomości (t.j. Dz. U. z 2021 r. poz. 2213).</p>
<p align="center"><strong>Burmistrz Olesna informuje</strong></p>
<p>że w dniu <strong>08 lipca 2025</strong> r. o godz. <strong>10.00</strong> w
siedzibie Urzędu Miejskiego przy ul. Pieloka 21 w Oleśnie (duża sala narad - I
piętro, pokój 117), odbył się drugi przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 2 o powierzchni 14,09 m2 i udziałem w nieruchomości
wspólnej wynoszącym 142/10000, zlokalizowanego w budynku Wspólnoty
Mieszkaniowej M. Przedmieście 1 – Pieloka 11 na działkach nr 2642, 2646 i nr
2648 o łącznej pow. 548 m2, Wadium w wymaganej wysokości i w zakreślonym
terminie nie wpłaciła jakakolwiek osoba fizyczna lub prawna.</p>
<p>Cena wywoławcza lokalu mieszkalnego nr 2 o powierzchni 14,09 m2 ustalona do
II przetargu wynosiła: 50.000,00 złotych netto.</p>
<p>W związku z formalnym brakiem uczestników przetargu, którzy z zakreślonym
terminie i w wymaganej wysokości mieli możliwość dokonania wpłaty wadium w
wysokości 10% ceny wywoławczej i wzięcia udziału w licytacji, przetarg
zakończył się wynikiem negatywnym</p>
<p>Olesno dnia 18 lipca 2025 r Burmistrz Olesna Piotr Gręda</p>`,
);

const ROUND3_TITLE =
  'Ogłoszenie o III przetargu ustnym nieograniczonym na sprzedaż lokalu nr 2 w Oleśnie przy ul. M Przedmieście 1.';
const ROUND3_ANNOUNCE_HTML = pageHtml(
  ROUND3_TITLE,
  `<p>BURMISTRZ OLESNA OGŁASZA III przetarg ustny nieograniczony na sprzedaż
nieruchomości stanowiącej własność Gminy Olesno: 1.Przedmiotem przetargu jest
lokal mieszkalny nr 2 o powierzchni 14,09 m 2 , wraz z udziałem w
nieruchomości wspólnej wynoszącym 142/10000 położony na parterze budynku
mieszkalno-usługowego Wspólnoty Mieszkaniowej Małe Przedmieście 1 - Pieloka 11
w Oleśnie.</p>
<p>Opis lokalu mieszkalnego. Powierzchnia użytkowa lokalu wynosi 14,09m 2 .</p>
<p>Cena wywoławcza lokalu użytkowego nr 2 ustalona do III przetargu wynosi:
48.000 złotych netto.</p>
<p>Przetarg odbędzie się 10 października 2025 roku o godz. 11 00 w sali nr 114
Urzędu Miejskiego w Oleśnie.</p>`,
);

const ROUND3_RESULT_TITLE =
  'Informacja o wyniku III przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 w Oleśnie przy ul. Małe Przedmieście 1.';
const ROUND3_RESULT_HTML = pageHtml(
  ROUND3_RESULT_TITLE,
  `<p>Na podstawie § 12 ust. 1 Rozporządzenia Rady Ministrów z dnia 14 września
2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na
zbycie nieruchomości (t.j. Dz. U. z 2021 r. poz. 2213).</p>
<p align="center"><strong>Burmistrz Olesna informuje</strong></p>
<p>że w dniu <strong>10 października 2025 </strong>r. o godz. <strong>11.00
</strong>w siedzibie Urzędu Miejskiego przy ul. Pieloka 21 w Oleśnie (duża sala
narad - I piętro, pokój 117), <strong>odbył się trzeci przetarg ustny
nieograniczony</strong> na sprzedaż lokalu mieszkalnego nr 2 o powierzchni
14,09 m<sup>2</sup> i udziałem w nieruchomości wspólnej wynoszącym 142/10000,
zlokalizowanego w budynku Wspólnoty Mieszkaniowej M. Przedmieście 1 – Pieloka
11 na działkach nr 2642, 2646 i nr 2648 o łącznej pow. 548 m2.</p>
<p>Wadium w wymaganej wysokości i w zakreślonym terminie wpłacił jeden
podmiot, który został dopuszczony do przetargu i wpisany na listę
uczestników.</p>
<p><strong>Cena wywoławcza </strong>lokalu mieszkalnego nr 2 o powierzchni
14,09 m2 ustalona <strong>do przetargu wynosiła: <u>48.000,00
złotych.</u></strong></p>
<p>W wyniku przeprowadzonego przetargu, cena nieruchomości została ustalona na
kwotę <strong>48.480,00 zł netto</strong>.</p>
<p>Przetarg zakończył się <strong>wynikiem pozytywnym</strong> a jako nabywca
nieruchomości została ustalona firma:</p>
<p align="center"><strong>„AD – BAU”</strong></p>
<p align="center"><strong>Artur Świtała</strong></p>`,
);

// Round I's real result (bip.olesno.pl/12368) has NO inline text — the body
// is just a Google-Docs-viewer iframe wrapping a PDF ("Protokół z I
// przetargu…"). stripTags() strips the iframe tag itself (an attribute, not
// text content), leaving only the reload button's label.
const ROUND1_RESULT_TITLE =
  'Informacja o wyniku I przetargu nieograniczonego - lokal nr 2 w budynku wspólnoty mieszkaniowej Małe Przedmieście 1';
const ROUND1_RESULT_HTML = pageHtml(
  ROUND1_RESULT_TITLE,
  `<p><div><button class="btn btn-primary mb-2" type="button" onclick="window.location.reload()">Załaduj ponownie</button><iframe title="Protokół z I przetargu - sprzedaż lokalu nr 2" class="googleDocAttachment" frameborder="0" src="https://docs.google.com/gview?url=https://bip.olesno.pl/download//65063/protokol.pdf&amp;embedded=true"></iframe></div></p>`,
);

// A "lokal użytkowy" (commercial) result in the same building family
// (bip.olesno.pl/12058, 2024 board) — must be excluded from the flat stream
// by the kind backstop even though its title also mentions "lokal".
const COMMERCIAL_RESULT_TITLE =
  'Informacja o wyniku I przetargu na sprzedaż lokalu użytkowego 1c w budynku wspólnoty Mieszkaniowej M.Przedmieście 3.';
const COMMERCIAL_RESULT_HTML = pageHtml(
  COMMERCIAL_RESULT_TITLE,
  `<p>Burmistrz Olesna informuje że w dniu 05 marca 2024 r. odbył się pierwszy
przetarg ustny nieograniczony na sprzedaż lokalu użytkowego nr 1c o
powierzchni 14,40 m2. Cena wywoławcza lokalu użytkowego nr 1c ustalona do
przetargu wynosiła: 40.000,00 złotych. W wyniku przeprowadzonego przetargu,
cena nieruchomości została ustalona na kwotę 40.400,00 zł netto.</p>`,
);

// Land noise (bip.olesno.pl/12766, 2025 board) — never mentions "lokal".
const LAND_TITLE = 'Ogłoszenie o I przetargu nieograniczonym na sprzedaż działki nr 46 w Kucobach.';

// Real 2025 board list markup (bip.olesno.pl/12150), condensed to 3 items.
const LIST_PAGE_HTML = `<div class="pageOnPage"><ul class="pageOnPage">
<li class="pageOnPageElement pageOnPageElement1"><div class="pageOnPageImg"></div>
<div class="pageOnPageContent">
<h2 class="pageOnPageHeader"><a href="https://bip.olesno.pl/12902/informacja-o-wyniku-iii-przetargu-nieograniczonego-na-sprzedaz-dzialki-nr-576-w-wojciechowie.html">Informacja o wyniku III przetargu nieograniczonego na sprzedaż działki nr 576 w Wojciechowie.</a></h2>
<div class="pageOnPagePreambule"></div></div></li>
<li class="pageOnPageElement pageOnPageElement2"><div class="pageOnPageImg"></div>
<div class="pageOnPageContent">
<h2 class="pageOnPageHeader"><a href="https://bip.olesno.pl/12790/informacja-o-wyniku-iii-przetargu-ustnego-nieograniczonego-na-sprzedaz-lokalu-nr-2-w-olesnie-przy-ul-male-przedmiescie-1.html">Informacja o wyniku III przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 w Oleśnie przy ul. Małe Przedmieście 1.</a></h2>
<div class="pageOnPagePreambule"></div></div></li>
<li class="pageOnPageElement pageOnPageElement3"><div class="pageOnPageImg"></div>
<div class="pageOnPageContent">
<h2 class="pageOnPageHeader"><a href="https://bip.olesno.pl/12722/ogloszenie-o-iii-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-nr-2-w-olesnie-przy-ul-m-przedmiescie-1.html">Ogłoszenie o III przetargu ustnym nieograniczonym na sprzedaż lokalu nr 2 w Oleśnie przy ul. M Przedmieście 1.</a></h2>
<div class="pageOnPagePreambule"></div></div></li>
</ul></div>`;

const EXPECTED_KEY = 'male przedmiescie|1|2';

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands (no grosze), dot-thousands+grosze, space-thousands', () => {
  assert.equal(parsePLN('55.000'), 55000);
  assert.equal(parsePLN('48.000,00'), 48000);
  assert.equal(parsePLN('48.480,00'), 48480);
  assert.equal(parsePLN('136 350,00'), 136350);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: bare "I PRZETARG" prefix, ordinal words, roman-with-ordinal titles', () => {
  assert.equal(roundFromText('BURMISTRZ OLESNA OGŁASZA I PRZETARG USTNY NIEOGRANICZONY'), 1);
  assert.equal(roundFromText('BURMISTRZ OLESNA OGŁASZA II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('odbył się drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('odbył się trzeci przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('Informacja o wyniku III przetargu ustnego nieograniczonego'), 3);
});

test('mentionsLokal: catches round-I title with NO "mieszkalny" qualifier', () => {
  assert.equal(mentionsLokal(ROUND1_TITLE), true);
  assert.equal(mentionsLokal(COMMERCIAL_RESULT_TITLE), true);
  assert.equal(mentionsLokal(LAND_TITLE), false);
});

test('isAnnounceTitle / isResultTitle: bare roman-numeral title, "Ogłoszenie o" title, "wyniku <ordinal> przetargu" gap, "Protokół"', () => {
  assert.equal(isAnnounceTitle(ROUND1_TITLE), true);
  assert.equal(isResultTitle(ROUND1_TITLE), false);

  assert.equal(isAnnounceTitle(ROUND3_TITLE), true);
  assert.equal(isResultTitle(ROUND3_TITLE), false);

  assert.equal(isResultTitle(ROUND3_RESULT_TITLE), true);
  assert.equal(isAnnounceTitle(ROUND3_RESULT_TITLE), false);

  assert.equal(isResultTitle(ROUND2_RESULT_TITLE), true);
  assert.equal(
    isResultTitle('Protokół z II przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2.'),
    true,
  );
});

test('extractArticleText: content lives past the empty webreaderContainer div (naive printArea regex would truncate here)', () => {
  const text = extractArticleText(ROUND3_RESULT_HTML);
  assert.ok(text.includes('48.480,00 zł netto'), `expected achieved price in: ${text.slice(0, 200)}`);
  assert.ok(text.includes('Artur Świtała'));
  assert.ok(!text.includes('Metryczka'), 'must not leak past bip-page__footer');
});

test('parseListPage: extracts {title,url} from real pageOnPageHeader markup, absolute URLs pass through', () => {
  const items = parseListPage(LIST_PAGE_HTML, 'https://bip.olesno.pl');
  assert.equal(items.length, 3);
  assert.equal(items[1].url, 'https://bip.olesno.pl/12790/informacja-o-wyniku-iii-przetargu-ustnego-nieograniczonego-na-sprzedaz-lokalu-nr-2-w-olesnie-przy-ul-male-przedmiescie-1.html');
  assert.equal(items[2].title, ROUND3_TITLE);
});

// ------------------------------------------------------------- parseAnnouncement

test('parseAnnouncement: round I (bip.olesno.pl/12154) — 55 000 zł, 2025-03-12', () => {
  const r = parseAnnouncement(ROUND1_ANNOUNCE_HTML, 'https://bip.olesno.pl/12154/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, EXPECTED_KEY);
  assert.equal(r.address.street, 'Małe Przedmieście');
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '2');
  assert.equal(r.area_m2, 14.09);
  assert.equal(r.starting_price_pln, 55000);
  assert.equal(r.auction_date, '2025-03-12');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: round II (bip.olesno.pl/12535) — 50 000 zł, 2025-07-08', () => {
  const r = parseAnnouncement(ROUND2_ANNOUNCE_HTML, 'https://bip.olesno.pl/12535/x.html');
  assert.equal(r.address.key, EXPECTED_KEY);
  assert.equal(r.area_m2, 14.09);
  assert.equal(r.starting_price_pln, 50000);
  assert.equal(r.auction_date, '2025-07-08');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: round III (bip.olesno.pl/12722) — 48 000 zł, 2025-10-10', () => {
  const r = parseAnnouncement(ROUND3_ANNOUNCE_HTML, 'https://bip.olesno.pl/12722/x.html');
  assert.equal(r.address.key, EXPECTED_KEY);
  assert.equal(r.area_m2, 14.09);
  assert.equal(r.starting_price_pln, 48000);
  assert.equal(r.auction_date, '2025-10-10');
  assert.equal(r.round, 3);
});

// ------------------------------------------------------------- parseResultDoc

test('parseResultDoc: round III (bip.olesno.pl/12790) SOLD 48 480 zł, abbreviated "M. Przedmieście" resolves to the SAME key as the full-form announcements', () => {
  const [r] = parseResultDoc(ROUND3_RESULT_HTML, null, 'https://bip.olesno.pl/12790/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, EXPECTED_KEY);
  assert.equal(r.address.street, 'Małe Przedmieście');
  assert.equal(r.area_m2, 14.09);
  assert.equal(r.starting_price_pln, 48000);
  assert.equal(r.final_price_pln, 48480);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2025-10-10');
});

test('parseResultDoc: round II (bip.olesno.pl/12660) UNSOLD (wynikiem negatywnym), no achieved price', () => {
  const [r] = parseResultDoc(ROUND2_RESULT_HTML, null, 'https://bip.olesno.pl/12660/x.html');
  assert.equal(r.address.key, EXPECTED_KEY);
  assert.equal(r.starting_price_pln, 50000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak_uczestnikow');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2025-07-08');
});

test('parseResultDoc: round I (bip.olesno.pl/12368) is a PDF-only iframe with no inline text — returns [] (documented residual gap)', () => {
  const recs = parseResultDoc(ROUND1_RESULT_HTML, null, 'https://bip.olesno.pl/12368/x.html');
  assert.deepEqual(recs, []);
});

test('parseResultDoc: commercial "lokal użytkowy" result is excluded by the kind backstop', () => {
  const recs = parseResultDoc(COMMERCIAL_RESULT_HTML, null, 'https://bip.olesno.pl/12058/x.html');
  assert.deepEqual(recs, []);
});

test('parseResultDoc: empty input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});

// --------------------------------------------------- address fallback (synthetic)

// Synthetic (not a live 2026-07-10 fetch — constructed from the spike's
// documented Świercz fixture, spikes/opolskie/powiat-oleski/olesno.md §1) to
// exercise the "przy ul." fallback branch for a simple (non-wspólnota-framed)
// flat sale, since the groundtruth building always hits the Wspólnoty
// Mieszkaniowej branch first.
test('parseAnnouncement: "przy ul." fallback path for a non-wspólnota flat (synthetic, spike-derived)', () => {
  const html = pageHtml(
    'II przetarg ustny nieograniczony na sprzedaż mieszkania',
    `<p>Burmistrz Olesna ogłasza II przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 7 o powierzchni użytkowej 71,60 m 2 , położonego przy
ul. Częstochowskiej 9 w Świerczu. Cena wywoławcza wynosi: 153.000 złotych.
Wadium: 15.300 złotych. Przetarg odbędzie się 20 stycznia 2020 roku.</p>`,
  );
  const r = parseAnnouncement(html, 'https://bip.olesno.pl/synthetic/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Częstochowskiej');
  assert.equal(r.address.building, '9');
  assert.equal(r.address.apt, '7');
  assert.equal(r.area_m2, 71.6);
  assert.equal(r.starting_price_pln, 153000);
  assert.equal(r.auction_date, '2020-01-20');
  assert.equal(r.round, 2);
});
