// Zabrze parser tests. The live BIP can't be reached from CI sandboxes, so we
// exercise the pure parsers against fixtures: the list-item markup observed in
// a browser, and a synthetic announcement body in the standard Polish
// ogłoszenie vocabulary. (The real attachment parser is validated/tuned on the
// first GitHub Actions run — see cities/zabrze/config.js.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDocumentList, attachmentUrlFromDoc } from '../src/cities/zabrze/crawl.js';
import {
  roundFromTitle,
  auctionDateFromTitle,
  parseAnnouncementText,
  parseResultDoc,
  isResultNotice,
} from '../src/cities/zabrze/parse.js';

test('roundFromTitle: Roman after "o", and bare = 1', () => {
  assert.equal(roundFromTitle('Ogłoszenie o II ustnych nieograniczonych przetargach na sprzedaż lokali mieszkalnych na dzień 18.06.2026 r.'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o I ustnym nieograniczonym przetargu na sprzedaż lokalu mieszkalnego na dzień 26.03.2026 r.'), 1);
  assert.equal(roundFromTitle('Ogłoszenie o III ustnych nieograniczonych przetargach …'), 3);
});

test('auctionDateFromTitle → ISO', () => {
  assert.equal(auctionDateFromTitle('… na dzień 9.04.2026 r.'), '2026-04-09');
  assert.equal(auctionDateFromTitle('… na dzień 18.06.2026 r.'), '2026-06-18');
  assert.equal(auctionDateFromTitle('… bez daty'), null);
});

// Shape returned by /api/v1/document-list/549 (observed in a browser).
const LIST_JSON = {
  data: [
    {
      doc_id: 25227,
      dscrpt: 'Ogłoszenie o II ustnych nieograniczonych przetargach na sprzedaż lokali mieszkalnych zaplanowane na dzień 18.06.2026 r.',
      pubdat: '2026-04-17 09:02:49+02',
    },
    {
      doc_id: 25001,
      dscrpt: 'Ogłoszenie o I ustnym nieograniczonym przetargu na sprzedaż lokalu mieszkalnego na dzień 26.03.2026 r.',
      pubdat: '2026-02-13 09:17:00+01',
    },
    // a non-auction notice that should be filtered out
    { doc_id: 99999, dscrpt: 'Informacja porządkowa', pubdat: '2026-01-01 00:00:00+01' },
  ],
};

test('parseDocumentList maps API items → doc URL, title, round, dates; filters non-auctions', () => {
  const items = parseDocumentList(LIST_JSON);
  assert.equal(items.length, 2, 'the non-auction notice is dropped');
  const a = items[0];
  assert.equal(a.doc_url, 'https://bip.miastozabrze.pl/doc/25227');
  assert.equal(a.round, 2);
  assert.equal(a.auction_date, '2026-06-18');
  assert.equal(a.published_date, '2026-04-17');
  assert.equal(items[1].round, 1);
  assert.equal(items[1].auction_date, '2026-03-26');
});

test('parseDocumentList: missing/empty data → []', () => {
  assert.deepEqual(parseDocumentList({}), []);
  assert.deepEqual(parseDocumentList({ data: [] }), []);
});

test('attachmentUrlFromDoc finds the attachment link (absolute or relative)', () => {
  // Real /doc HTML uses an ABSOLUTE url:
  const abs = '<a href="https://bip.miastozabrze.pl/attachment/43642" title="Pobierz załącznik"></a>';
  assert.equal(attachmentUrlFromDoc(abs), 'https://bip.miastozabrze.pl/attachment/43642');
  // tolerate a relative form too:
  assert.equal(
    attachmentUrlFromDoc('<a href="/attachment/96404"></a>'),
    'https://bip.miastozabrze.pl/attachment/96404',
  );
  assert.equal(attachmentUrlFromDoc('<p>nothing</p>'), null);
});

// Real attachment text (from a downloaded Zabrze ogłoszenie, doc/5969 era):
// numbered per-flat blocks; each block has a *plot* `pow.:` (działka) before the
// *flat* `pow.:` (opis lokalu); boilerplate carries office addresses to exclude.
const ANN_TEXT = `Prezydent Miasta Zabrze ogłasza II ustne przetargi nieograniczone na sprzedaż niżej wymienionych lokali mieszkalnych
1. adres: ul. Ks. Bolesława Domańskiego 4/6
działka: nr 4129/50 pow.: 1.377 m2 księga wieczysta nr
GL1Z/00019567/1
opis lokalu: położenie:    pow.: 26,74 m2 pomieszczenia: pokój, kuchnia, wc
I piętro
Cena                  w tym:   92,99% stanowi cena lokalu     7,01% stanowi cena udziału w prawie własności gruntu
wywoławcza:
37.000,00 zł
Wysokość wadium: 1.900,00 zł
2. adres: ul. Krakowska 82/4
działka: nr 958/1 pow.: 407 m2 księga wieczysta nr
opis lokalu: położenie:    pow.: 42,34 m2 pomieszczenia: 2 pokoje, kuchnia, przedpokój
I piętro
Cena                  w tym:   93,42% stanowi cena lokalu     6,58% stanowi cena udziału w prawie własności gruntu
wywoławcza:
53.000,00 zł
Przetargi odbędą się w dniu 1.03.2022 roku w sali 207 Urzędu Miejskiego w Zabrzu przy ul. Powstańców Śląskich 5-7
Wadium należy wnosić w kasie Urzędu Miejskiego w Zabrzu przy ul. Wolności 286`;

test('parseAnnouncementText: per-flat address, FLAT area (not plot), price; office addresses excluded', () => {
  const flats = parseAnnouncementText(ANN_TEXT);
  assert.equal(flats.length, 2, 'two flats; office addresses in boilerplate excluded');
  const d = flats.find((f) => f.address.key === 'ks boleslawa domanskiego|4|6');
  assert.ok(d, 'Domańskiego flat keyed');
  assert.equal(d.area_m2, 26.74, 'flat area, not the 1377 m² plot');
  assert.equal(d.starting_price_pln, 37000);
  assert.equal(d.kind, 'mieszkalny');
  const k = flats.find((f) => f.address.key === 'krakowska|82|4');
  assert.equal(k.area_m2, 42.34);
  assert.equal(k.starting_price_pln, 53000);
  // no office address leaked through
  assert.ok(!flats.some((f) => /powsta|wolnosci/.test(f.address.street_norm)));
});

// The other real Zabrze layout (doc 96404): the `pdftotext -layout` table wraps
// so the FLAT area is detached from its "pow." label, the plot renders as
// "953 m     2", the cellar header "pomieszczenia przynależne" lands just before
// the flat's area, the flat area itself can be wide-spaced ("49,11 m  2"), and
// the price label is followed by an inline "w tym: …%" cell.
const ANN_WRAPPED = `Prezydent Miasta Zabrze ogłasza II ustne przetargi nieograniczone na sprzedaż lokali mieszkalnych
1.                                   adres: ul. Gen. Władysława Andersa 35/4
działka:   nr 740/1, 739/1,       pow.:      arkusz mapy: 2           prawo:        udział:
           737/1, 741/1, 744/1 953 m     2   obręb: 0007, Rokitnica   własność      41/1000
opis     położenie:     pow.:       pomieszczenia: 2 pokoje,          pomieszczenia przynależne
lokalu: II piętro       52,00 m2 kuchnia, łazienka z wc,              do lokalu:
                                                                      piwnica o pow. 6,12 m2
Cena             w       95,32% stanowi cena         4,68% stanowi cena udziału
wywoławcza:      tym: lokalu
120.000,00 zł
Wysokość wadium: 12.000,00 zł
2.                                     adres: ul. Ireny Kosmowskiej 40/9
działka:   nr 3816/65         pow.:           arkusz mapy: 3             prawo:        udział:
                              504 m 2         obręb: 0007, Rokitnica     własność      84/1000
opis     położenie:     pow.:       pomieszczenia: 2 pokoje,             pomieszczenia przynależne
lokalu: III piętro      49,11 m  2  kuchnia, łazienka z wc,              do lokalu:
                                    przedpokój                           piwnica o pow. 10,60 m2
Cena wywoławcza: w tym:             94,74% stanowi cena       5,26% stanowi cena udziału
110.000,00 zł
Wysokość wadium: 11.000,00 zł`;

test('parseAnnouncementText: wrapped layout — flat area (not plot/cellar) + inline "w tym" price', () => {
  const flats = parseAnnouncementText(ANN_WRAPPED);
  const a = flats.find((f) => f.address.key === 'gen wladyslawa andersa|35|4');
  assert.ok(a, 'Andersa keyed');
  assert.equal(a.area_m2, 52, 'flat 52 m², not plot 953 or cellar 6.12');
  assert.equal(a.starting_price_pln, 120000);
  const k = flats.find((f) => f.address.key === 'ireny kosmowskiej|40|9');
  assert.equal(k.area_m2, 49.11, 'wide-spaced "49,11 m  2", not cellar 10.60');
  assert.equal(k.starting_price_pln, 110000, 'price after the inline "w tym:" cell');
});

test('parseAnnouncementText: empty text → no flats', () => {
  assert.deepEqual(parseAnnouncementText(''), []);
});

// ---------------- result notices (achieved-price stream) ----------------
// Condensed from the real attachment 97916 ("INFORMACJA O WYNIKU PRZETARGÓW",
// 28.04.2026 — drugie przetargi): two sold bullets, incl. the "na działce"
// locative (k→c declension) and the de Gaulle’a typographic apostrophe.

const RESULT_NOTICE = `                           INFORMACJA O WYNIKU PRZETARGÓW
     Zgodnie z § 12 Rozporządzenia … Prezydent Miasta Zabrze podaje do publicznej
wiadomości informację o wyniku przetargów. W dniu 28 kwietnia 2026 roku w siedzibie
Urzędu Miejskiego w Zabrzu przy ul. Powstańców Śląskich 5-7 zostały przeprowadzone
drugie ustne nieograniczone przetargi w sprawie sprzedaży 2 lokali mieszkalnych.
  •   Nieruchomość lokalowa stanowiąca lokal mieszkalny nr 12 o pow. użytk. 46,56 m2
      znajdująca się w budynku położonym w Zabrzu przy ul. Armii Krajowej 6a na działce
      nr 2584/129 o pow. 1263 m2, arkusz mapy 4 obręb: 0012 Zabrze. Cena wywoławcza
      została ustalona na kwotę 100.000,00 zł. Najwyższa zaproponowana cena w przetargu
      wyniosła 101.000,00 zł. Jako nabywcę przedmiotowej nieruchomości ustalono X.
  •   Nieruchomość lokalowa stanowiąca lokal mieszkalny nr 7 o pow. użytk. 18,58 m2
      znajdująca się w budynku położonym w Zabrzu przy ul. gen. Charlesa de Gaulle’a 94
      na działce nr 5284/123 o pow. 324 m2. Cena wywoławcza została ustalona
      na kwotę 50.000,00 zł. Przetarg zakończył się wynikiem negatywnym.`;

test('parseResultDoc: sold + negative bullets, date + round from preamble', () => {
  assert.equal(isResultNotice(RESULT_NOTICE), true);
  const recs = parseResultDoc(RESULT_NOTICE, null, 'https://x/att/97916');
  assert.equal(recs.length, 2);

  const sold = recs[0];
  assert.equal(sold.address.key, 'armii krajowej|6A|12');
  assert.equal(sold.auction_date, '2026-04-28');
  assert.equal(sold.round, 2);
  assert.equal(sold.kind, 'mieszkalny');
  assert.equal(sold.area_m2, 46.56);
  assert.equal(sold.starting_price_pln, 100000);
  assert.equal(sold.final_price_pln, 101000);
  assert.equal(sold.outcome, 'sold');

  const neg = recs[1];
  assert.equal(neg.address.key, 'gen charlesa de gaulle a|94|7');
  assert.equal(neg.outcome, 'unsold');
  assert.equal(neg.final_price_pln, null);
  assert.equal(neg.starting_price_pln, 50000);
});

test('parseResultDoc: announcement text is not a result notice', () => {
  assert.equal(isResultNotice('Ogłoszenie o II ustnych przetargach …'), false);
  assert.deepEqual(parseResultDoc('Ogłoszenie o II ustnych przetargach …', null, 'u'), []);
});

// Condensed from the real 2022 cooperative-right announcement (doc 43654) —
// the typographic apostrophe in "de Gaulle’a" used to break ADDR_IN_LINE
// (0-flat warn), and the boilerplate "prawa użytkowania wieczystego" used to
// flip the kind to uzytkowy.
const ANN_APOSTROPHE = `1. adres : ul. Gen. de Gaulle’a 89/3
działka: nr 2796/123, pow.: 1.050 m2 księga wieczysta nr GL1Z/00004904/8 prawo: spółdzielcze własnościowe
lokal: położenie: parter pow.: 48,14 m2 pomieszczenia: 2 pokoje, przedpokój, kuchnia, łazienka z wc
Cena wywoławcza: 144.000,00 zł
Wysokość wadium: 7.200,00 zł
Roszczenie na podstawie Ustawy o przekształceniu prawa użytkowania wieczystego gruntów`;

test('parseAnnouncementText: typographic apostrophe address + kind not fooled by "użytkowania wieczystego"', () => {
  const flats = parseAnnouncementText(ANN_APOSTROPHE);
  assert.equal(flats.length, 1);
  assert.equal(flats[0].address.key, 'gen de gaulle a|89|3');
  assert.equal(flats[0].kind, 'mieszkalny');
  assert.equal(flats[0].area_m2, 48.14);
  assert.equal(flats[0].starting_price_pln, 144000);
});

// Third real layout (docs 91932/96874, the Harcerska 2/2 case): pdftotext
// wraps the SUPERSCRIPT of the flat's "m²" onto the PREVIOUS line ("lokalu:
// parter   2" / "34,90 m łazienka…"), so the strict "<num> m2" token never
// appears for the flat — only for the plot and the cellar. The bare-"<num> m"
// fallback must recover the flat area without picking up plot or cellar.
const ANN_WRAPPED_SUPERSCRIPT = `Prezydent Miasta Zabrze ogłasza II ustne przetargi nieograniczone
4.                                          adres: ul. Harcerska 2/2
działka:   nr 473/57          pow.:     Arkusz mapy 3,               prawo:           udział:
                              176 m2 Obręb 0010 Stolarzowice         własność         93/1000
opis     położenie:     pow.:       pomieszczenia: pokój, kuchnia, pomieszczenia przynależne do
lokalu: parter                   2
                        34,90 m łazienka z wc, przedpokój            lokalu: piwnica o pow. 7,10 m2
Cena wywoławcza: w tym:          96,92% stanowi cena lokalu 3,08% stanowi cena udziału w prawie
70.000,00 zł                                                   własności gruntu
Wysokość wadium: 7.000,00 zł`;

test('parseAnnouncementText: flat area recovered when the m² superscript wraps to another line (Harcerska 2/2)', () => {
  const flats = parseAnnouncementText(ANN_WRAPPED_SUPERSCRIPT);
  assert.equal(flats.length, 1);
  const h = flats[0];
  assert.equal(h.address.key, 'harcerska|2|2');
  assert.equal(h.area_m2, 34.9, 'flat area 34,90 — not the 176 m² plot nor the 7,10 m² cellar');
  assert.equal(h.starting_price_pln, 70000);
});

// ---- Land (board 555 działki/grunty) ----
import { parseLandAttachment } from '../src/cities/zabrze/parse.js';

test('parseLandAttachment: parcel/area/obręb/street/price from a real land notice', () => {
  const text = 'Prezydent Miasta Zabrze ogłasza I ustny przetarg nieograniczony na sprzedaż prawa własności nieruchomości niezabudowanej, stanowiącej własność Gminy Miejskiej Zabrze Oznaczenie nieruchomości według danych z ewidencji gruntów i księgi wieczystej: Działka nr 6089/50 o pow. 477 m2, użytek Bp, zapisana w księdze wieczystej nr GL1Z/00013557/6, położona w Zabrzu przy ul. Stefana Batorego, obręb: Zabrze, stanowi własność Gminy Miejskiej Zabrze. Cena wywoławcza nieruchomości wynosi 150 000,00 zł.';
  const r = parseLandAttachment(text);
  assert.equal(r.dzialka_nr, '6089/50');
  assert.equal(r.area_m2, 477);
  assert.equal(r.obreb, 'Zabrze');
  assert.equal(r.address_raw, 'ul. Stefana Batorego');
  assert.equal(r.starting_price_pln, 150000);
});

test('parseLandAttachment: plot thousands "1.377 m2" → 1377; null for GDPR annex', () => {
  const r = parseLandAttachment('Działka nr 4129/50 o pow. 1.377 m2 przy ul. Testowa, obręb: Mikulczyce.');
  assert.equal(r.dzialka_nr, '4129/50');
  assert.equal(r.area_m2, 1377);
  assert.equal(parseLandAttachment('INFORMACJA O PRZETWARZANIU DANYCH OSOBOWYCH w drodze przetargu'), null);
});

// ---- Commercial (board 552 lokale użytkowe) ----
// Fixtures faithful to the real `pdftotext -layout` output (docs 99878 / 95852 /
// 43727): a numbered "lokal użytkowy [nr N]" header, a *plot* `pow.` (działka)
// before the *unit* `pow.` (opis lokalu/położenie), and the "Cena wywoławcza"
// split by an inline "w tym: …%" cell. parseCommercialAttachment emits
// kind:'uzytkowy', the unit's usable area (not the plot), and the starting price.
import { parseCommercialAttachment } from '../src/cities/zabrze/parse.js';

// doc 99878: single unit spanning several floors — its "położenie" LISTS
// "piwnica, parter, …", so a naive cellar filter would wrongly drop the area.
const COMM_MULTIFLOOR = `                                    Prezydent Miasta Zabrze
   ogłasza V ustny przetarg nieograniczony na sprzedaż niżej wymienionego lokalu użytkowego
                             udziału w gruncie, położonego w Zabrzu:
1.                                         adres : ul. 3 Maja 10 lokal użytkowy
działka:     nr 764/82     pow. 792 m2        arkusz mapy: 10,         prawo: wieczyste       udział: 631/1000
lokal: położenie:       pow.:       pomieszczenia:                                                pomieszczenie
         piwnica,       591,06 m2 piwnica: 6 korytarzy, 7 magazynów, kotłownia                    przynależne
         parter,                    parter: klatka schodowa, przedsionek                          do lokalu:
Cena wywoławcza: w tym:           95,91 % stanowi          4,09 % stanowi I opłata z tytułu użytkowania
600.000,00 zł                     cena lokalu              wieczystego udziału w gruncie
Wysokość wadium: 60.000,00 zł
Przetarg odbędzie się w dniu 11.08.2026 roku o godz. 9:30, w sali 207 Urzędu Miejskiego w Zabrzu.`;

test('parseCommercialAttachment: single unit — unit area 591,06 (not plot 792), price; "piwnica" floor list not mistaken for a cellar', () => {
  const u = parseCommercialAttachment(COMM_MULTIFLOOR);
  assert.equal(u.length, 1);
  assert.equal(u[0].address.key, '3 maja|10|', 'bare building when no "nr" (lokal użytkowy stripped)');
  assert.equal(u[0].kind, 'uzytkowy');
  assert.equal(u[0].area_m2, 591.06, 'unit usable area, not the 792 m² plot');
  assert.equal(u[0].starting_price_pln, 600000);
});

// doc 95852: NO "adres:" label — the street sits directly on the numbered line.
const COMM_NO_ADRES = `                                        Prezydent Miasta Zabrze
           I ustny przetarg nieograniczony na sprzedaż niżej wymienionego lokalu użytkowego
1.                           ul. Bytomskich Strzelców 37 lokal użytkowy nr 1
działka:   nr 6167/205    pow.: 1129 m2 Arkusz mapy 4,               prawo: własność udział: 143/1000
opis       położenie: parter pow.: 68,39 m2    pomieszczenia: 4 pomieszczenia, wc
Cena wywoławcza: w tym:              57,57% stanowi cena lokalu 42,43% stanowi cena udziału
130.000,00 zł
Wysokość wadium: 13.000,00 zł
Przetarg odbędzie się w dniu 26.03.2026 roku o godz. 9:30.`;

test('parseCommercialAttachment: header without "adres:" label still parses; "nr 1" → /1 apt', () => {
  const u = parseCommercialAttachment(COMM_NO_ADRES);
  assert.equal(u.length, 1);
  assert.equal(u[0].address.key, 'bytomskich strzelcow|37|1');
  assert.equal(u[0].area_m2, 68.39);
  assert.equal(u[0].starting_price_pln, 130000);
});

// doc 43727: TWO units at the same building (nr 2 + nr 3) — must NOT collapse to
// one record. A footer viewing-times list repeats "ul. Witosa 6 lokal użytkowy
// nr N o godz. …" but those lines aren't numbered headers, so they're ignored.
const COMM_MULTI = `Prezydent Miasta Zabrze ogłasza III ustne przetargi nieograniczone na sprzedaż lokali użytkowych
   1.                         adres: ul. Wincentego Witosa 6 lokal użytkowy nr 2
   działka: nr 1234/5  pow.: 600 m2   prawo: własność udział: 50/1000
   opis lokalu: położenie: parter pow.: 20,79 m2 pomieszczenia: sala, wc
   Cena              w tym:      90,47 % stanowi cena       9,53 % stanowi cena udziału
   wywoławcza:                   lokalu
   40.000,00 zł
   Wysokość wadium: 4.000,00 zł
   2.                         adres: ul. Wincentego Witosa 6 lokal użytkowy nr 3
   działka: nr 1234/5  pow.: 600 m2   prawo: własność udział: 60/1000
   opis lokalu: położenie: parter pow.: 25,81 m2 pomieszczenia: 2 pomieszczenia, wc
   Cena              w tym:      87,50 % stanowi cena       12,50 % stanowi cena udziału
   wywoławcza:                   lokalu
   35.000,00 zł
   Wysokość wadium: 3.500,00 zł
Przetargi odbędą się w dniu 15.06.2023 roku:
- ul. Witosa 6 lokal użytkowy nr 2 o godz. 9:00,
- ul. Witosa 6 lokal użytkowy nr 3 o godz. 9:30.`;

test('parseCommercialAttachment: multi-unit keeps distinct keys; footer viewing-list lines excluded', () => {
  const u = parseCommercialAttachment(COMM_MULTI);
  assert.equal(u.length, 2, 'two units, footer list lines are not headers');
  assert.equal(u[0].address.key, 'wincentego witosa|6|2');
  assert.equal(u[0].area_m2, 20.79);
  assert.equal(u[0].starting_price_pln, 40000);
  assert.equal(u[1].address.key, 'wincentego witosa|6|3');
  assert.equal(u[1].area_m2, 25.81);
  assert.equal(u[1].starting_price_pln, 35000);
  assert.ok(u.every((x) => x.kind === 'uzytkowy'));
});

test('parseCommercialAttachment: empty text → no units', () => {
  assert.deepEqual(parseCommercialAttachment(''), []);
});
