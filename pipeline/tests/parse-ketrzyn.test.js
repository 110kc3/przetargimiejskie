// Kętrzyn parser + crawl-helper tests. Fixtures are condensed-but-verbatim
// copies of REAL page/PDF text fetched live from bip.miastoketrzyn.pl (verified
// 2026-07-11, from this Pi's Polish residential IP). Long non-load-bearing
// boilerplate (wadium-payment procedure, RODO clause, opis-nieruchomości prose,
// legal-basis footer) is trimmed; every sentence that feeds a parsed field
// (subject/kind, area, price, date, address/parcel, outcome) is kept verbatim.
//
// Deliberate regression traps KEPT verbatim in the fixtures:
//   * the flat's subject line also carries a land-SHARE area ("udział … w
//     działce gruntu nr 39/5 o powierzchni 0,1980 ha") and later cellar areas
//     ("piwnice o powierzchni 6,75 m²") — the flat area (33,20 m²) must win
//     because it is the FIRST "na sprzedaż … o pow." on the subject line;
//   * every result doc opens with a "Kętrzyn, dnia 5 czerwca 2026 r." ISSUE
//     date and closes with a "…dnia 05.06.2026 r." noticeboard date — the
//     AUCTION date must come only from the "informuje, że dnia 28 maja 2026"
//     clause, never those;
//   * the inline-HTML result card is MISLABELLED by the source ("Dotyczy
//     sprzedaż lokalu mieszkalnego nr 38") while the embedded document reads
//     "lokalu niemieszkalnego nr 38" — kind must resolve to 'uzytkowy' from the
//     document body, not the card title (classify-on-body, not on slug/title).
//
// Groundtruth (hand-verified against the live pages):
//   Sikorskiego 72A lok. 1, lokal mieszkalny, 33,20 m²:
//     announce  cena wyw. 50 400 zł, auction 2026-05-28
//     result    SOLD 51 000 zł (nabywca Ireneusz Bladowski)
//   Chrobrego 6 lok. 38, lokal NIEMIESZKALNY (→ uzytkowy), 24,60 m²:
//     result    NEGATIVE (wynik negatywny), auction 2026-05-26 (PDF) /
//               2026-03-12 (an earlier round, inline-HTML card)
//   dz. 12/61 obręb 8 Kętrzyn, działka gruntu, 0,3032 ha = 3032 m²:
//     announce  cena wyw. 205 200 zł, auction 2026-06-11
//     result    NEGATIVE, auction 2026-06-11

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  monthNum,
  roundFromText,
  announceDate,
  resultDate,
  isResultNotice,
  isNegativeOutcome,
  isCancelled,
  extractSubject,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/ketrzyn/parse.js';

import {
  parseBoardCards,
  extractPdfLinks,
  isRentalTitle,
  dmyToIso,
  resolveUrl,
} from '../src/cities/ketrzyn/crawl.js';

// ──────────────────────────────────────────────────────────── fixtures (PDF text)

const ANN_FLAT = `                             Burmistrz Miasta Kętrzyna ogłasza

kolejny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 o powierzchni 33,20 m²,
położonego w budynku przy ul. Gen. Władysława Sikorskiego 72A w Kętrzynie. Sprzedaż lokalu
obejmuje również udział wynoszący 29/1000 części w działce gruntu nr 39/5 o powierzchni 0,1980 ha,
położonej w obrębie 1 miasta Kętrzyna przy ul. Gen. Władysława Sikorskiego, objętej księgą wieczystą
nr OL1K/00034662/4.
        Cena wywoławcza - 50 400,00 zł        Wadium - 5 100,00 zł
        Przetarg odbędzie się 28 maja 2026 r. o godz. 9:00 w Urzędzie Miasta w Kętrzynie, ul. Wojska
Polskiego 11, sala nr 108.
Wadium należy wnieść przelewem do 22 maja 2026 r. na konto Urzędu Miasta w Kętrzynie.
Opis lokalu
Lokal mieszkalny nr 1 znajduje się na parterze budynku wielorodzinnego.
Do lokalu przynależą dwie piwnice o powierzchni 6,75 m² oraz 6,03 m².`;

const ANN_LAND = `                            Burmistrz Miasta Kętrzyna ogłasza
kolejny przetarg ustny nieograniczony na sprzedaż działki gruntu nr 12/61 o powierzchni 0,3032 ha,
położonej w obrębie 8 miasta Kętrzyna, przy ul. Stefana Batorego, dla której Sąd Rejonowy
w Kętrzynie prowadzi księgę wieczystą nr OL1K/00017546/0, z przeznaczeniem pod zabudowę
mieszkaniową jednorodzinną.
       Cena wywoławcza – 205 200,00 zł       wadium – 20 600,00 zł
        Przetarg odbędzie się 11 czerwca 2026 r. o godz. 11:00 w Urzędzie Miasta w Kętrzynie,
ul. Wojska Polskiego 11, sala nr 108.`;

const RES_FLAT_SOLD = `                                                          Kętrzyn, dnia 5 czerwca 2026 r.
GNP.6840.1.12.2025
                                                            INFORMACJA
                                              O WYNIKU PRZETARGU
        Burmistrz Miasta Kętrzyna informuje, że dnia 28 maja 2026 r. o godz. 900, w sali nr 108
Urzędu Miasta w Kętrzynie został przeprowadzony kolejny przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 1 o pow. 33,20 m2, położonego w budynku przy ul. Gen. Władysława
Sikorskiego 72A w Kętrzynie wraz ze sprzedażą udziału 29/1000 części w działce gruntu nr 39/5
o pow. 0,1980 ha, położonej w obrębie 1 miasta Kętrzyna przy ul. Gen. Władysława Sikorskiego.
        Cena wywoławcza - 50 400,00 zł               wadium - 5 100,00 zł
Najwyższa cena osiągnięta w przetargu                            - 51 000,00 zł
      W wyniku przeprowadzonego przetargu nabywcą ww. nieruchomości został Pan Ireneusz
Bladowski za kwotę 51 000,00 zł (słownie: pięćdziesiąt jeden tysięcy złotych i 00/100).
Zamieszczono na tablicy ogłoszeń dnia 05.06.2026 r.`;

const RES_COMMERCIAL_NEG = `                                                           Kętrzyn, dnia 3 czerwca 2026 r.
BAU.6840.1.20.2024
                                                  INFORMACJA
                                              O WYNIKU PRZETARGU
        Burmistrz Miasta Kętrzyna informuje, że dnia 26 maja 2026 r. o godz. 1100, w sali nr 108
Urzędu Miasta w Kętrzynie został przeprowadzony kolejny przetarg ustny nieograniczony na sprzedaż
lokalu niemieszkalnego nr 38 o pow. 24,60 m2, położonego w budynku przy ul. Bolesława Chrobrego
6 w Kętrzynie. Sprzedaż lokalu następuje wraz ze sprzedażą udziału 12/1000 części w działce gruntu.
        Cena wywoławcza – 42 000,00 zł        Wadium – 4 200,00 zł
Najwyższa cena osiągnięta w przetargu                           - brak
Przetarg zakończył się wynikiem negatywnym, nikt nie przystąpił do przetargu.
Zamieszczono na tablicy ogłoszeń dnia 03.06.2026 r.`;

const RES_LAND_NEG = `                                                           Kętrzyn, dnia 19 czerwca 2026 r.
GNP.6840.2.51.2025
                                                            INFORMACJA
                                              O WYNIKU PRZETARGU
        Burmistrz Miasta Kętrzyna informuje, że dnia 11 czerwca 2026 r. o godz. 1100, w sali nr 108
Urzędu Miasta w Kętrzynie został przeprowadzony kolejny przetarg ustny nieograniczony na sprzedaż
działki gruntu nr 12/61 o pow. 0,3032 ha, położonej w obrębie 8 miasta Kętrzyna przy ul. Stefana
Batorego, dla której prowadzona jest księga wieczysta nr OL1K/00017546/0.
         Cena wywoławcza - 205 200,00 zł                        wadium - 20 600,00 zł
Najwyższa cena osiągnięta w przetargu                            - brak
Przetarg zakończył się wynikiem negatywnym, nikt nie przystąpił do przetargu.`;

// Standalone "Informacja o wyniku" card — result text INLINE in HTML (no PDF),
// verbatim from the detail page's article region. Note the source MISLABEL
// ("Dotyczy sprzedaż lokalu mieszkalnego nr 38") vs the real embedded document
// ("lokalu niemieszkalnego nr 38"), and the spaced glyphs ("m 2", "9 00").
const RES_INLINE = `Dotyczy sprzedaż lokalu mieszkalnego nr 38 położonego w budynku przy ul. Bolesława Chrobrego 6 w Kętrzynie Ogłaszający Burmistrz Miasta Kętrzyna Rodzaj kolejny przetarg ustny nieograniczony Ogłoszono dnia 28.01.2026 Informacje o przetargu Odbędzie się dnia 12.03.2026 09:00 Cena wywoławcza 42 000,00 zł Wadium 4 200,00 zł Informacje dodatkowe I N F O R M A C J A O W Y N I K U P R Z E T A R G U Burmistrz Miasta Kętrzyna informuje, że dnia 12 marca 2026 r. o godz. 9 00 , w sali nr 108 Urzędu Miasta w Kętrzynie został przeprowadzony kolejny przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego nr 38 o pow. 24,60 m 2 , położonego w budynku przy ul. Bolesława Chrobrego 6 w Kętrzynie. Cena wywoławcza 42 000,00 zł Najwyższa cena osiągnięta w przetargu - brak Przetarg zakończył się wynikiem negatywnym, nikt nie przystąpił do przetargu.`;

// ──────────────────────────────────────────────────────────── unit primitives

test('parsePLN: space-thousands + comma-grosze, and "brak" → null', () => {
  assert.equal(parsePLN('50 400,00'), 50400);
  assert.equal(parsePLN('205 200,00'), 205200);
  assert.equal(parsePLN('1 205 200,00'), 1205200);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

test('monthNum: Polish genitive months, diacritic-tolerant', () => {
  assert.equal(monthNum('maja'), '05');
  assert.equal(monthNum('czerwca'), '06');
  assert.equal(monthNum('września'), '09');
  assert.equal(monthNum('października'), '10');
  assert.equal(monthNum('padziernika'), '10'); // diacritic-dropped extractor
  assert.equal(monthNum('grudnia'), '12');
  assert.equal(monthNum('xyz'), null);
});

test('roundFromText: "kolejny" (count unknown) and missing ordinal both → null', () => {
  assert.equal(roundFromText('ogłasza kolejny przetarg ustny nieograniczony'), null);
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('ogłasza drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('na sprzedaż lokalu'), null);
});

test('announceDate / resultDate: pick the auction date, never the wadium / issue / noticeboard date', () => {
  // announce body has BOTH "odbędzie się 28 maja" (auction) and "wnieść … do 22 maja" (wadium)
  assert.equal(announceDate(ANN_FLAT), '2026-05-28');
  // result body has "Kętrzyn, dnia 5 czerwca" (issue) + "dnia 05.06.2026" (board) + "dnia 28 maja" (auction)
  assert.equal(resultDate(RES_FLAT_SOLD), '2026-05-28');
  assert.equal(resultDate(RES_LAND_NEG), '2026-06-11');
});

test('isResultNotice / isNegativeOutcome / isCancelled', () => {
  assert.equal(isResultNotice(RES_FLAT_SOLD), true);
  assert.equal(isResultNotice(RES_INLINE), true); // spaced "I N F O R M A C J A" header, normal body markers
  assert.equal(isResultNotice(ANN_FLAT), false);
  assert.equal(isNegativeOutcome(RES_COMMERCIAL_NEG), true);
  assert.equal(isNegativeOutcome(RES_FLAT_SOLD), false);
  // the standing reservation clause must NOT read as a cancellation
  assert.equal(isCancelled('Sprzedający zastrzega sobie prawo odwołania przetargu bez podania przyczyny.'), false);
  assert.equal(isCancelled('Przetarg został odwołany.'), true);
  assert.equal(isCancelled('Unieważnienie przetargu na sprzedaż lokalu.'), true);
});

test('extractSubject: flat area binds to the flat, NOT the land-share ha or the cellars', () => {
  const s = extractSubject(ANN_FLAT);
  assert.equal(s.kind, 'mieszkalny');
  assert.equal(s.area_m2, 33.2); // not 1980 (0,1980 ha share) and not 6.75 (cellar)
  assert.equal(s.address.key, 'gen wladyslawa sikorskiego|72A|1');
});

// ──────────────────────────────────────────────────────────── parseAnnouncement

test('parseAnnouncement: flat (Sikorskiego 72A lok. 1) — address-keyed, cena wyw., future auction date, "kolejny" → round null', () => {
  const r = parseAnnouncement(ANN_FLAT, { detailUrl: 'https://bip.miastoketrzyn.pl/x', sourceUrl: 'https://bip.miastoketrzyn.pl/x.pdf' });
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Gen. Władysława Sikorskiego');
  assert.equal(r.address.building, '72A');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 33.2);
  assert.equal(r.starting_price_pln, 50400);
  assert.equal(r.auction_date, '2026-05-28');
  assert.equal(r.round, null);
  assert.equal(r.cancelled, false);
  assert.equal(r.dzialka_nr, null);
  assert.equal(r.source_url, 'https://bip.miastoketrzyn.pl/x.pdf');
});

test('parseAnnouncement: land (dz. 12/61, obręb 8 Kętrzyn) — parcel-keyed, 0,3032 ha → 3032 m², en-dash price', () => {
  const r = parseAnnouncement(ANN_LAND, {});
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, null);
  assert.equal(r.dzialka_nr, '12/61');
  assert.equal(r.obreb, 'Kętrzyn');
  assert.equal(r.area_m2, 3032); // 0,3032 ha × 10000
  assert.equal(r.starting_price_pln, 205200);
  assert.equal(r.auction_date, '2026-06-11');
});

// ──────────────────────────────────────────────────────────── parseResultDoc

test('parseResultDoc: flat SOLD (Sikorskiego 72A lok. 1) — cena osiągnięta 51 000, buyer noted, auction date from "informuje, że dnia"', () => {
  const [r] = parseResultDoc(RES_FLAT_SOLD, null, 'https://bip.miastoketrzyn.pl/res.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'gen wladyslawa sikorskiego|72A|1');
  assert.equal(r.area_m2, 33.2);
  assert.equal(r.starting_price_pln, 50400);
  assert.equal(r.final_price_pln, 51000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-05-28'); // NOT 2026-06-05 (issue/board date)
  assert.equal(r.source_pdf, 'https://bip.miastoketrzyn.pl/res.pdf');
  assert.ok(r.notes.some((n) => /nabywca: Pan Ireneusz Bladowski/.test(n)));
});

test('parseResultDoc: commercial NEGATIVE (Chrobrego 6 lok. 38) — "niemieszkalnego" → uzytkowy (not mieszkalny), no final price', () => {
  const [r] = parseResultDoc(RES_COMMERCIAL_NEG, null, 'S');
  assert.equal(r.kind, 'uzytkowy'); // FLAT_RE must not fire on "niemieszkalnego"
  assert.equal(r.address.key, 'boleslawa chrobrego|6|38');
  assert.equal(r.area_m2, 24.6);
  assert.equal(r.starting_price_pln, 42000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'negative_no_bidders');
  assert.equal(r.auction_date, '2026-05-26');
});

test('parseResultDoc: land NEGATIVE (dz. 12/61) — parcel-keyed, unsold, fallbackDate ignored in favour of body date', () => {
  const [r] = parseResultDoc(RES_LAND_NEG, '2099-01-01', 'S');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '12/61');
  assert.equal(r.obreb, 'Kętrzyn');
  assert.equal(r.starting_price_pln, 205200);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2026-06-11'); // body date wins over fallback
});

test('parseResultDoc: inline-HTML result — MISLABELLED card ("mieszkalnego") but body is "niemieszkalnego" → uzytkowy; date from spaced body', () => {
  const [r] = parseResultDoc(RES_INLINE, '2026-03-12', 'https://bip.miastoketrzyn.pl/detail');
  assert.equal(r.kind, 'uzytkowy'); // classify on the DOC body, not the card "Dotyczy" title
  assert.equal(r.address.key, 'boleslawa chrobrego|6|38');
  assert.equal(r.area_m2, 24.6); // "o pow. 24,60 m 2" (spaced m/2)
  assert.equal(r.starting_price_pln, 42000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2026-03-12');
});

test('parseResultDoc: empty / non-result input → []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc(ANN_FLAT, null, 'x'), []); // an announcement is not a result
});

// ──────────────────────────────────────────────────────────── crawl helpers

// Two verbatim board cards (real gov.pl-BIP markup, classes intact): one active
// flat, one rental (dzierżawa) that must be filtered out.
const BOARD_HTML = `<ul><li class="group list-none border border-slate-200 bg-white rounded-sm"><a href="/nieruchomosci/przetargi/sprzedaz-lokalu-mieszkalnego-nr-1-polozonego-w-budynku-przy-ul-gen-wladyslawa-sikorskiego-72a-w-ketrzynie" class="wcag-link-no-hover flex items-stretch" aria-label="Przejdź do Sprzedaż lokalu mieszkalnego nr 1 położonego w budynku przy ul. Gen. Władysława Sikorskiego 72A w Kętrzynie"><div class="flex-1 flex flex-col px-4 py-3"><div class="pb-2 mb-2 border-b border-slate-200"><h3 class="text-lg font-bold">Sprzedaż lokalu mieszkalnego nr 1 położonego w budynku przy ul. Gen. Władysława Sikorskiego 72A w Kętrzynie</h3></div><div class="flex flex-col gap-2 text-neutral"><span class="font-bold">Status: <span class="rounded-sm font-normal px-[3px] py-[3px] bg-amber-100 border border-amber-200">ogłoszony</span></span><span class="font-bold">Cena wywoławcza: <span class="font-normal">50 400,00 zł</span></span><span class="font-bold">Wadium: <span class="font-normal">5 100,00 zł</span></span><span class="font-bold">Termin przetargu: <span class="font-normal">28.05.2026 09:00</span></span></div><div class="mt-3 pt-2 border-t border-slate-200 text-sm text-neutral">Data wytworzenia: 20.04.2026</div></div></a></li><li class="group list-none border border-slate-200 bg-white rounded-sm"><a href="/nieruchomosci/przetargi/przetarg-na-dzierzawe-nieruchomosci-polozonej-przy-ul-michala-kajki-4-w-ketrzynie" class="wcag-link-no-hover flex items-stretch" aria-label="Przejdź do Przetarg na dzierżawę nieruchomości położonej przy ul. Michała Kajki 4 w Kętrzynie"><div class="flex-1 flex flex-col px-4 py-3"><div class="pb-2 mb-2 border-b border-slate-200"><h3 class="text-lg font-bold">Przetarg na dzierżawę nieruchomości położonej przy ul. Michała Kajki 4 w Kętrzynie</h3></div><div class="flex flex-col gap-2 text-neutral"><span class="font-bold">Status: <span class="font-normal">ogłoszony</span></span><span class="font-bold">Cena wywoławcza: <span class="font-normal">3 600,00 zł</span></span><span class="font-bold">Termin przetargu: <span class="font-normal">27.07.2026 09:00</span></span></div><div class="mt-3 pt-2 border-t border-slate-200 text-sm text-neutral">Data publikacji: 17.06.2026</div></div></a></li></ul>`;

test('parseBoardCards: extracts detailUrl, title, status, cena, terminIso, dataIso from real card markup', () => {
  const cards = parseBoardCards(BOARD_HTML);
  assert.equal(cards.length, 2);
  const flat = cards[0];
  assert.equal(flat.detailUrl, 'https://bip.miastoketrzyn.pl/nieruchomosci/przetargi/sprzedaz-lokalu-mieszkalnego-nr-1-polozonego-w-budynku-przy-ul-gen-wladyslawa-sikorskiego-72a-w-ketrzynie');
  assert.ok(/^Sprzedaż lokalu mieszkalnego nr 1/.test(flat.title));
  assert.equal(flat.status, 'ogłoszony');
  assert.equal(flat.cena, '50 400,00 zł');
  assert.equal(flat.terminIso, '2026-05-28');
  assert.equal(flat.dataIso, '2026-04-20');
});

test('isRentalTitle: dzierżawa/najem filtered; sales kept', () => {
  const cards = parseBoardCards(BOARD_HTML);
  assert.equal(isRentalTitle(cards[0].title), false); // sprzedaż flat
  assert.equal(isRentalTitle(cards[1].title), true); // dzierżawa
  assert.equal(isRentalTitle('Sprzedaż działki nr 12/61 przy ul. Stefana Batorego'), false);
});

test('extractPdfLinks: splits the result PDF ("informacja-o-wyniku…") from the announcement PDF, absolutised', () => {
  const detail = `<article><a href="/przetargi/slug/gen.-wladyslawa-sikorskiego-72a-lok.-1.pdf">Treść ogłoszenia</a>
    <a href="/przetargi/slug/informacja-o-wyniku-przetargu-sikorskiego-72a-lok.-1.pdf">Informacja o wyniku</a></article>`;
  const { announcePdfs, resultPdfs } = extractPdfLinks(detail);
  assert.deepEqual(announcePdfs, ['https://bip.miastoketrzyn.pl/przetargi/slug/gen.-wladyslawa-sikorskiego-72a-lok.-1.pdf']);
  assert.deepEqual(resultPdfs, ['https://bip.miastoketrzyn.pl/przetargi/slug/informacja-o-wyniku-przetargu-sikorskiego-72a-lok.-1.pdf']);
});

test('dmyToIso / resolveUrl', () => {
  assert.equal(dmyToIso('28.05.2026 09:00'), '2026-05-28');
  assert.equal(dmyToIso('7.6.2026'), '2026-06-07');
  assert.equal(dmyToIso('nope'), null);
  assert.equal(resolveUrl('/przetargi/x.pdf'), 'https://bip.miastoketrzyn.pl/przetargi/x.pdf');
});
