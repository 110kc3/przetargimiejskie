import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  roundFromText,
  isSaleText,
  isResultNotice,
  extractFields,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/zabkowice-slaskie/parse.js';


function detailHtml({ adres, przetargNa, typ, rodzaj, cena, dateIso }) {
  return `<!doctype html><html><body>
<div id="main-content" class="contents estates box">
<table class="table table-borderless">
  <caption class="visuallyhidden">Szczegóły</caption>
  <tbody>
    <tr><th scope="row">Adres nieruchomości</th><td class="normal">${adres} </td></tr>
    <tr><th scope="row">Przetarg na</th><td class="normal">${przetargNa}</td></tr>
    <tr><th scope="row">Typ przetargu</th><td>${typ}</td></tr>
    <tr><th scope="row">Rodzaj nieruchomości</th><td>${rodzaj}</td></tr>
    <tr><th scope="row">Cena wywoławcza</th><td>${cena}</td></tr>
    <tr><th scope="row">Data przetargu</th><td>
      <time datetime="${dateIso}"><strong>${dateIso.slice(8, 10)}.${dateIso.slice(5, 7)}.${dateIso.slice(0, 4)}</strong> godz.</time>
    </td></tr>
  </tbody>
</table>
</div></body></html>`;
}

const SULISLAWICE_ANN = detailHtml({
  adres: 'Sulisławice 52B lokal mieszkalny nr 2 AM-2 obręb Sulisławice',
  przetargNa:
    'sprzedaż lokalu mieszkalnego nr 2 położonego w miejscowości Sulisławice 52B wraz z udziałem wynoszącym 192/1000 w częściach wspólnych budynku i prawie własności działki nr 215/32  AM-2 obręb Sulisławice o pow. 0.0277 ha oraz udział wynoszący 17/100 w nieruchomości stanowiącej działkę nr 215/41 Am-2 obręb Sulisławice o pow. 0.317 ha.',
  typ: 'Przetarg ustny nieograniczony',
  rodzaj: 'lokal mieszkalny',
  cena: '50 000,00',
  dateIso: '2026-08-12T09:00:00',
});

const KLODZKA_ANN = detailHtml({
  adres: 'Ząbkowice Śląskie, ul. Kłodzka 6- lokal mieszkalny',
  przetargNa:
    'sprzedaż nieruchomości lokalowej stanowiącej lokal mieszkalny nr 5 o pow. 76,85 m2 położony na II pietrze w budynku wielorodzinnym przy ul. Kłodzkiej 6 w Ząbkowicach Śląskich wraz z udziałem wynoszącym 976/10000 w częściach wspólnych budynku i prawie własności działek nr 47/3 i 47/4 AM-11 obręb Centrum o łącznej pow. 0,0443 ha',
  typ: 'Przetarg ustny nieograniczony',
  rodzaj: 'lokal mieszkalny',
  cena: '60 000 zł',
  dateIso: '2017-05-22T09:00:00',
});

const ZIEBICKA_ANN = detailHtml({
  adres: 'Ząbkowice Śląskie lokal położony przy ul. Ziębickiej 21 o pow. 29,56 m2',
  przetargNa:
    'sprzedaż lokalu użytkowego o pow. 29,56 m2 położonego w budynku przy ul. Ziębickiej 21 w Ząbkowicach Śląskich wraz z udziałem wynoszącym 13/100 w częściach wspólnych budynku i prawie własności działki nr 103/8 obręb Centrum-12 o pow. 0.0111 ha.',
  typ: 'Przetarg ustny ograniczony',
  rodzaj: 'nieruchomość zabudowana',
  cena: '85 000,00 zł',
  dateIso: '2026-08-12T09:30:00',
});

const LAND_ANN = detailHtml({
  adres: 'Ząbkowice Śląskie działka nr 21/65 ob. Osiedle Wschód-09 o pow. 0,1474 ha',
  przetargNa:
    'sprzedaż nieruchomości gruntowej niezabudowanej położonej w Ząbkowicach Śląskich, działka nr 21/65, ob. Osiedle Wschód-09 o pow. 0,1474ha.',
  typ: 'Przetarg ustny nieograniczony',
  rodzaj: 'nieruchomość niezabudowana',
  cena: '160 000,00',
  dateIso: '2026-07-30T09:00:00',
});

const SULISLAWICE_RESULT = `INFORMACJA O WYNIKU PRZETARGU

Burmistrz Ząbkowic Śląskich informuje, że I przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 2 położonego w miejscowości Sulisławice 52 B wraz z udziałem wynoszącym
192/1000 w częściach wspólnych budynku i prawie własności działki nr 215/32 AM-2 obręb
Sulisławice o pow. 0.0277 ha oraz udział wynoszący 17/100 w nieruchomości stanowiącej działkę nr
215/41 AM-2 obręb Sulisławice, dla której Sąd Rejonowy w Ząbkowicach Śląskich prowadzi księgę
wieczystą SW1Z/00055126/0 nie odbył się dnia 23 czerwca 2022 roku z powodu braku nabywców.`;

const KLODZKA_RESULT = `INFORMACJA O WYNIKU PRZETARGU

Burmistrz Ząbkowic Śląskich informuje, że VII przetarg ustny nieograniczony
ogłoszony na dzień 22 maja 2017 roku na sprzedaż nieruchomości lokalowej stanowiącej
lokal mieszkalny nr 5 położony na II piętrze w budynku wielorodzinnym przy ul. Kłodzkiej
6 w Ząbkowicach Śląskich wraz z udziałem wynoszącym 976/10000 w częściach wspólnych
budynku i prawie własności działek nr 47/3 i 47/4 AM-11, obręb Centrum o łącznej
powierzchni 0.0443 ha, nie odbył się z uwagi na brak nabywców.`;

const STOLEC_RESULT = `INFORMACJA O WYNIKU PRZETARGU

Dnia 12 października 2022 roku w Urzędzie Miejskim w Ząbkowicach Śląskich przy
ul. 1 Maja 15 odbył się I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
niezabudowanej położonej w Stolcu, stanowiącej działkę nr 399/6 AM-3 obręb Stolec
o pow. 0.2800 ha, księga wieczysta nr SW1Z/00045730/4.

Do dnia 6 października 2022 roku zostały wniesione 3 wadia. Cena wywoławcza
przedmiotowej nieruchomości wynosiła 15 000,00 zł, a cena osiągnięta w tym przetargu wyniosła
15 150,00 zł.

W wyniku przeprowadzonego I przetargu nieograniczonego nabywcą w/w nieruchomości
położonej w Stolcu został Jakub Kwit.`;


test('parsePLN: spaced thousands, grosze, an embedded "zł" label', () => {
  assert.equal(parsePLN('50 000,00'), 50000);
  assert.equal(parsePLN('15 150,00 zł'), 15150);
  assert.equal(parsePLN('60 000 zł'), 60000);
  assert.equal(parsePLN('160 000,00'), 160000);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma and dot decimal separators', () => {
  assert.equal(parseArea('76,85'), 76.85);
  assert.equal(parseArea('0,2800'), 0.28);
  assert.equal(parseArea('29,56'), 29.56);
});

test('roundFromText: ROMAN numeral form (the Ząbkowice form) + word-ordinal fallback', () => {
  assert.equal(roundFromText('I przetarg ustny nieograniczony na sprzedaż'), 1);
  assert.equal(roundFromText('VII przetarg ustny nieograniczony ogłoszony na dzień'), 7);
  assert.equal(roundFromText('drugi przetarg ustny'), 2);
  assert.equal(roundFromText('sprzedaż lokalu mieszkalnego nr 2'), null);
});

test('isSaleText: keep sprzedaż, skip dzierżawa / najem', () => {
  assert.equal(isSaleText('sprzedaż lokalu mieszkalnego nr 2 położonego'), true);
  assert.equal(isSaleText('dzierżawa części działki nr 5/1 o pow. 4 m2'), false);
  assert.equal(isSaleText('II przetarg ustny nieograniczony na najem lokalu użytkowego'), false);
});

test('extractFields: real Logonet "Szczegóły" table → fields (ISO auction date from <time>)', () => {
  const f = extractFields(SULISLAWICE_ANN);
  assert.equal(f.rodzaj, 'lokal mieszkalny');
  assert.equal(f.typ, 'Przetarg ustny nieograniczony');
  assert.equal(f.cenaText, '50 000,00');
  assert.equal(f.auctionDate, '2026-08-12');
  assert.ok(f.przetargNa.startsWith('sprzedaż lokalu mieszkalnego nr 2'));
});


test('parseAnnouncement: Sulisławice 52B nr 2 (id 10794) — rural village+number address, classified a flat from the BODY', () => {
  const r = parseAnnouncement(extractFields(SULISLAWICE_ANN), 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/10794/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Sulisławice');
  assert.equal(r.address.building, '52B');
  assert.equal(r.address.apt, '2');
  assert.equal(r.address.key, 'sulislawice|52B|2');
  assert.equal(r.starting_price_pln, 50000);
  assert.equal(r.auction_date, '2026-08-12');
  assert.equal(r.round, null);
});

test('parseAnnouncement: ul. Kłodzka 6/5 (id 2109) — genitive street "Kłodzkiej", pow. użytkowa 76,85 m²', () => {
  const r = parseAnnouncement(extractFields(KLODZKA_ANN), 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/2109/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Kłodzkiej');
  assert.equal(r.address.building, '6');
  assert.equal(r.address.apt, '5');
  assert.equal(r.address.key, 'klodzkiej|6|5');
  assert.equal(r.area_m2, 76.85);
  assert.equal(r.starting_price_pln, 60000);
  assert.equal(r.auction_date, '2017-05-22');
});

test('parseAnnouncement: ul. Ziębicka 21 (id 10793) — commercial, classified "uzytkowy" from BODY despite Rodzaj="nieruchomość zabudowana"', () => {
  const r = parseAnnouncement(extractFields(ZIEBICKA_ANN), 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/10793/x');
  assert.equal(r.kind, 'uzytkowy');
  assert.equal(r.address.street, 'Ziębickiej');
  assert.equal(r.address.building, '21');
  assert.equal(r.address.apt, null);
  assert.equal(r.address.key, 'ziebickiej|21|');
  assert.equal(r.area_m2, 29.56);
  assert.equal(r.starting_price_pln, 85000);
});


test('parseAnnouncement: działka nr 21/65 (id 10765) — LAND (grunt), parcel-keyed, ha→m², no address', () => {
  const r = parseAnnouncement(extractFields(LAND_ANN), 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/10765/x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, undefined);
  assert.equal(r.dzialka_nr, '21/65');
  assert.equal(r.obreb, 'Osiedle Wschód');
  assert.equal(r.area_m2, 1474);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.auction_date, '2026-07-30');
});


test('parseResultDoc: Sulisławice 52B nr 2 result (OCR, brak nabywców) — round 1, unsold; JOINS the announcement key sulislawice|52B|2', () => {
  const [r] = parseResultDoc(SULISLAWICE_RESULT, '2022-06-23', 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/6731/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'sulislawice|52B|2');
  assert.equal(r.round, 1);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.auction_date, '2022-06-23');
  assert.equal(r.source_pdf, 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/6731/x');
});

test('parseResultDoc: ul. Kłodzka 6/5 result (OCR, brak nabywców) — ROMAN round VII → 7, unsold; JOINS klodzkiej|6|5', () => {
  const [r] = parseResultDoc(KLODZKA_RESULT, '2017-05-22', 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/2109/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'klodzkiej|6|5');
  assert.equal(r.round, 7);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
});

test('parseResultDoc: Stolec działka 399/6 result (OCR, SOLD) — round 1, starting 15 000, achieved 15 150, buyer present', () => {
  const [r] = parseResultDoc(STOLEC_RESULT, '2022-10-12', 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/7081/x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '399/6');
  assert.equal(r.obreb, 'Stolec');
  assert.equal(r.area_m2, 2800);
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 15000);
  assert.equal(r.final_price_pln, 15150);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2022-10-12');
});

test('parseResultDoc: non-result / empty text → []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na sprzedaż lokalu', null, 'x'), []);
});

test('isResultNotice: matches the OCR header, rejects an announcement', () => {
  assert.equal(isResultNotice(STOLEC_RESULT), true);
  assert.equal(isResultNotice('sprzedaż lokalu mieszkalnego nr 2 położonego'), false);
});

test('parseAnnouncement: notice 11008 garage without house number on parcel 10/21 — parses kind garaz and synthesizes rejon address key', () => {
  const fields = {
    adres: 'Ząbkowice Śląskie, przy ul. Bartosza Głowackiego',
    przetargNa: 'sprzedaż nieruchomości zabudowanej budynkiem garażowym o pow. 19,43 m2 położonym w Ząbkowicach Śląskich przy, ul. Bartosza Głowackiego z jednoczesnym oddaniem w użytkowanie wieczyste udziału wynoszącego 1/6 w działce nr 10/21, ob. Osiedle Wschód-04 o pow. 0,0129 ha',
    typ: 'Przetarg ustny nieograniczony',
    rodzaj: 'nieruchomość zabudowana',
    cenaText: '44 000,00',
    auctionDate: '2026-11-18',
    publishedDate: '2026-10-10',
  };
  const r = parseAnnouncement(fields, 'https://bip.zabkowiceslaskie.pl/przetarg-nieruchomosci/11008/x');
  assert.ok(r);
  assert.equal(r.kind, 'garaz');
  assert.equal(r.address.street, 'Bartosza Głowackiego');
  assert.equal(r.address.building, '0');
  assert.equal(r.address.apt, '10-21');
  assert.equal(r.address.key, 'bartosza glowackiego|0|10-21');
  assert.equal(r.area_m2, 19.43);
  assert.equal(r.starting_price_pln, 44000);
  assert.equal(r.auction_date, '2026-11-18');
});
