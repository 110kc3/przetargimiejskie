// Namysłów (ZAN) parser tests — groundtruthed against REAL fixtures fetched
// live from zan-namyslow.pl on 2026-07-10 (spike day 2026-07-08 re-verified
// during build; the 3 flats below were all still live/present).
//
// DETAIL PAGES (real <div class="entry-content">...</div> HTML, byte-for-byte
// as served — the "I V" split-Roman-numeral quirk on the first fixture is a
// REAL source quirk, not a transcription error; the backup PDF for that same
// post does NOT have it):
//
//   https://zan-namyslow.pl/iv-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-jana-pawla-ii-5a-2-w-namyslowie/
//     IV przetarg — ul. Jana Pawła II 5A/2, 60,12 m2, cena wywoławcza
//     160.000,00 zł, przetarg 30 lipca 2026r. godz. 11:00, KW OP1U/00069839/1.
//     Matches the task's groundtruth example exactly.
//
//   https://zan-namyslow.pl/iii-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-boh-warszawy-7-8-w-namyslowie/
//     III przetarg — ul. Bohaterów Warszawy 7/8, 38,11 m2 (area sentence has
//     the "wraz z powierzchnią przynależną" gap this fixture groundtruths),
//     cena wywoławcza 105.000,00 zł, KW OP1U/00086457/4. Body also contains
//     the wadium clause "10% ceny wywoławczej" (genitive) — the fixture that
//     proves startingPriceFromText doesn't match it.
//
//   https://zan-namyslow.pl/iii-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-przy-ul-jana-pawla-ii-5-w-namyslowie/
//     The ROUND-III predecessor of the 5A/2 flat above — still published,
//     past-dated (12 czerwca 2026): the round that failed and led to round
//     IV. Same address/price, different round + date + KW-adjacent prose
//     formatting (this post uses <strong>/<u> tags instead of bare <p><br>).
//
// BOARD PAGE (condensed but faithful reproduction of the real Divi article
// markup at zan-namyslow.pl/przetargi/ — titles/urls/dates are REAL, captured
// live 2026-07-10; trimmed from ~255 KB down to 6 representative posts: 3
// flat-sale + 3 real non-flat categories the filter must reject).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  roundFromText,
  roundFromTitle,
  auctionDateFromText,
  parsePublishedShort,
  startingPriceFromText,
  areaM2FromText,
  kwNumberFromText,
  aptFromText,
  streetBuildingFromText,
  parseNoticeText,
  isFlatSaleTitle,
  parseBoardPage,
  parseDetailPage,
  parseResultDoc,
} from '../src/cities/namyslow/parse.js';

// --------------------------------------------------------------- real fixtures

const JP2_5A2_IV_URL =
  'https://zan-namyslow.pl/iv-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-jana-pawla-ii-5a-2-w-namyslowie/';
const JP2_5A2_IV_HTML = `<div class="entry-content">
					<p>ZARZĄD ZAKŁADU ADMINISTRACJI NIERUCHOMOŚCI<br />
„ZAN” SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ<br />
ogłasza<br />
I V publiczny przetarg ustny nieograniczony na sprzedaż<br />
lokalu mieszkalnego nr 2 o powierzchni użytkowej 60,12 m2 stanowiącego własność<br />
„ZAN” Sp. z o. o. w Namysłowie położonego przy ul. Jana Pawła II 5A w Namysłowie.<br />
cena wywoławcza – 160.000,00 zł.<br />
Podana cena jest ceną brutto. Lokal będący przedmiotem sprzedaży składa się z trzech pokoi,<br />
kuchni, spiżarki, łazienki oraz przedpokoju położony na częściowo na pierwszym piętrze i poddaszu<br />
budynku.<br />
Dla przedmiotowego lokalu Sąd Rejonowy w Kluczborku Wydział IV Ksiąg Wieczystych prowadzi<br />
księgę wieczystą nr OP1U/00069839/1.<br />
Wraz z lokalem nastąpi oddanie udziału części wspólnych budynku i urządzeń, które nie służą<br />
do użytku właścicieli budynku w wysokości 90/1000 części. Lokal bez obciążeń i zobowiązań.<br />
Przetarg odbędzie się w dniu 30 lipca 2026r. o godz. 11:00, w siedzibie Zakładu Administracji<br />
Nieruchomości „ZAN” Sp. z o.o. w Namysłowie ul. Dubois 5, 46-100 Namysłów.</p>
<p><a href="https://zan-namyslow.pl/pseeckoo/2026/06/Przetarg-Jana-Pawla-II.pdf"><img decoding="async" class="alignnone size-full wp-image-223200" src="https://zan-namyslow.pl/pseeckoo/2020/12/mime_postscript-1.png" alt="" width="64" height="64" />Ogłoszenie o przetargu</a></p>
<p><a href="https://zan-namyslow.pl/pseeckoo/2026/06/REGULAMIN-SPRZEDAZY-1.pdf"><img decoding="async" class="alignnone size-full wp-image-223200" src="https://zan-namyslow.pl/pseeckoo/2020/12/mime_postscript-1.png" alt="" width="64" height="64" />Regulamin sprzedaży</a></p>
					</div>
					<div class="et_post_meta_wrapper">
										</div>
				</article>
						</div>
				<div id="sidebar">
		`;

const BOH_III_URL =
  'https://zan-namyslow.pl/iii-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-boh-warszawy-7-8-w-namyslowie/';
const BOH_III_HTML = `<div class="entry-content">
					<p>ZARZĄD ZAKŁADU ADMINISTRACJI NIERUCHOMOŚCI<br />
„ZAN” SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ<br />
ogłasza<br />
III publiczny przetarg ustny nieograniczony na sprzedaż<br />
lokalu mieszkalnego nr 8 o powierzchni użytkowej wraz z powierzchnią przynależną 38,11 m2,<br />
stanowiącego własność „ZAN” Sp. z o. o. w Namysłowie położonego przy ul. Bohaterów Warszawy<br />
7 w Namysłowie.<br />
cena wywoławcza – 105.000,00 zł.<br />
Podana cena jest ceną brutto. Lokal będący przedmiotem sprzedaży składa się z jednego<br />
pokoju, kuchni, spiżarki oraz pomieszczenia przynależnego tj. komórki, położony jest na czwartej<br />
kondygnacji budynku.<br />
Dla przedmiotowego lokalu Sąd Rejonowy w Kluczborku Wydział IV Ksiąg Wieczystych prowadzi<br />
księgę wieczystą nr OP1U/00086457/4.<br />
Wraz z lokalem nastąpi oddanie udziału części wspólnych budynku i urządzeń, które nie służą<br />
do użytku właścicieli budynku w wysokości 77/1000 części. Lokal bez obciążeń i zobowiązań.<br />
Przetarg odbędzie się w dniu 30 lipca 2026 r. o godz. 10:00, w siedzibie Zakładu Administracji<br />
Nieruchomości „ZAN” Sp. z o.o. w Namysłowie, ul. Dubois 5, 46-100 Namysłów.<br />
Warunkiem wzięcia udziału w przetargu jest wpłata wadium w pieniądzu, w wysokości 10%<br />
ceny wywoławczej podanej w ogłoszeniu do dnia 13 kwietnia 2026r.</p>
<p><a href="https://zan-namyslow.pl/pseeckoo/2026/06/Przetarg-Boh.-Warszawy-7.pdf"><img decoding="async" class="alignnone size-full wp-image-223200" src="https://zan-namyslow.pl/pseeckoo/2020/12/mime_postscript-1.png" alt="" width="64" height="64" />Ogłoszenie o przetargu</a></p>
<p><a href="https://zan-namyslow.pl/pseeckoo/2026/06/REGULAMIN-SPRZEDAZY-1.pdf"><img loading="lazy" decoding="async" class="alignnone size-full wp-image-223457" src="https://zan-namyslow.pl/pseeckoo/2021/02/mime_postscript.png" alt="" width="64" height="64" />Regulamin sprzedaży</a></p>
					</div>
					<div class="et_post_meta_wrapper">
										</div>
				</article>
						</div>
				<div id="sidebar">
		`;

const JP2_5_2_III_URL =
  'https://zan-namyslow.pl/iii-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-przy-ul-jana-pawla-ii-5-w-namyslowie/';
const JP2_5_2_III_HTML = `<div class="entry-content">
					<p><strong>ZARZĄD ZAKŁADU ADMINISTRACJI NIERUCHOMOŚCI </strong><strong>„ZAN” SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong></p>
<p><strong>ogłasza</strong></p>
<p><strong>III publiczny przetarg ustny nieograniczony na sprzedaż</strong></p>
<p>lokalu mieszkalnego nr 2 o powierzchni użytkowej 60,12 m2 stanowiącego własność „ZAN” Sp.  z o. o.  w Namysłowie położonego przy   <strong>ul. Jana Pawła II 5A w</strong> <strong>Namysłowie.</strong></p>
<p><strong><u>cena wywoławcza – 160.000,00 zł.</u></strong></p>
<p>Podana cena jest ceną brutto. Lokal będący przedmiotem sprzedaży składa się z trzech pokoi, kuchni, spiżarki, łazienki oraz przedpokoju położony na częściowo na pierwszym piętrze i poddaszu budynku.      Dla przedmiotowego lokalu Sąd Rejonowy w Kluczborku Wydział IV Ksiąg Wieczystych prowadzi księgę wieczystą   nr OP1U/00069839/1. Wraz z lokalem nastąpi oddanie udziału części wspólnych budynku i urządzeń, które nie służą do użytku właścicieli budynku w wysokości 90/1000 części.  Lokal bez obciążeń i zobowiązań.</p>
<p><strong>Przetarg odbędzie się w dniu 12 czerwca 2026r.  o godz.  10:00, w siedzibie Zakładu Administracji Nieruchomości „ZAN” Sp. z o.o. w Namysłowie ul. Dubois 5, 46-100 Namysłów. </strong><strong>Warunkiem</strong><strong> wzięcia udziału w przetargu jest wpłata wadium w pieniądzu w wysokości 10% ceny wywoławczej podanej w ogłoszeniu do dnia 8 czerwca 2026r.</strong></p>
<p><a href="https://zan-namyslow.pl/pseeckoo/2026/04/Przetarg-Czerwiec-2026.pdf"><img decoding="async" class="alignnone size-full wp-image-223200" src="https://zan-namyslow.pl/pseeckoo/2020/12/mime_postscript-1.png" alt="" width="64" height="64" /> Ogłoszenie o przetargu </a></p>
					</div>
					<div class="et_post_meta_wrapper">
										</div>
				</article>
						</div>
				<div id="sidebar">
		`;

// Real fixture (live 2026-07-10) demonstrating a genuine ZAN source quirk found
// during the mandatory live-crawl verification: this post's opening paragraph
// is rendered with letter-spacing baked into the text itself — "o g ł a s z a
// I I p u b l i c z n y p r z e t a r g" — which defeats roundFromText's
// "ogłasza ... przetarg" anchor even though the rest of the notice (address,
// area, price, date, KW) parses normally. The <h1> title ("II publiczny
// przetarg...") is NOT letter-spaced, so parseDetailPage falls back to it via
// roundFromTitle. Includes the real <h1>/<p class="post-meta"> header that
// sits OUTSIDE entry-content on the real page (unlike the other 3 fixtures,
// which only embed entry-content onward — this one needs the header too).
const ARMII_4_9_II_URL =
  'https://zan-namyslow.pl/ii-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-9-przy-ul-armii-krajowej-4-w-namyslowie/';
const ARMII_4_9_II_HTML = `<h1 class="entry-title">II publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9 przy ul. Armii Krajowej 4 w Namysłowie</h1>
						<p class="post-meta"><span class="published">sty 16, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="category tag">PRZETARGI</a></p>
						<div class="entry-content">
					<p>Z A R Z Ą D Z A K Ł A D U A D M I N I S T R A C J I N I E R U C H O M O Ś C I<br />
„ Z A N ” S P Ó Ł K A Z O G R A N I C Z O N Ą O D P O W I E D Z I A L N O Ś C I Ą<br />
o g ł a s z a<br />
I I p u b l i c z n y p r z e t a r g u s t n y n i e o g r a n i c z o n y n a s p r z e d a ż<br />
lokalu mieszkalnego nr 9 o powierzchni użytkowej 19,25 m2 stanowiącego własność<br />
„ZAN” Sp. z o. o. w Namysłowie położonego przy ul. Armii Krajowej 4 w Namysłowie.<br />
cena wywoławcza – 49.000,00 zł.<br />
Podana cena jest ceną brutto. Lokal będący przedmiotem sprzedaży składa się z jednego pokoju,<br />
mieszczenia, oraz pomieszczenia przynależnego tj. piwnicy położony na parterze budynku.<br />
Dla przedmiotowego lokalu Sąd Rejonowy w Kluczborku Wydział IV Ksiąg Wieczystych prowadzi księgę<br />
wieczystą nr OP1U/00069968/4<br />
Wraz z lokalem nastąpi oddanie udziału części wspólnych budynku i urządzeń, które nie służą<br />
do użytku właścicieli budynku w wysokości 3/100 części. Lokal bez obciążeń i zobowiązań.<br />
Przetarg odbędzie się w dniu 6 marca 2026 r. o godz. 12:00, w siedzibie Zakładu Administracji<br />
Nieruchomości „ZAN” Sp. z o.o. w Namysłowie ul. Dubois 5, 46-100 Namysłów.<br />
Warunkiem wzięcia udziału w przetargu jest wpłata wadium w pieniądzu w wysokości 10% ceny<br />
wywoławczej podanej w ogłoszeniu do dnia 2 marca 2026r.</p>
<p><a href="https://zan-namyslow.pl/pseeckoo/2026/01/II-przetarg-A.-Krajowej-4-m9.pdf"><img decoding="async" class="alignnone size-full wp-image-223457" src="https://zan-namyslow.pl/pseeckoo/2021/02/mime_postscript.png" alt="" width="64" height="64" />Ogłoszenie o przetargu</a></p>
					</div>
					<div class="et_post_meta_wrapper">
										</div>
				</article>
						</div>
				<div id="sidebar">
		`;

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands + grosze tail (ZAN\'s format)', () => {
  assert.equal(parsePLN('160.000,00'), 160000);
  assert.equal(parsePLN('105.000,00'), 105000);
  assert.equal(parsePLN('70000'), 70000);
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: comma-decimal m2', () => {
  assert.equal(parseArea('60,12'), 60.12);
  assert.equal(parseArea('38,11'), 38.11);
  assert.equal(parseArea(null), null);
});

test('roundFromText: tolerates the real "I V" split-numeral quirk', () => {
  assert.equal(roundFromText('ZAN ogłasza I V publiczny przetarg ustny nieograniczony na sprzedaż'), 4);
});

test('roundFromText: clean "III publiczny przetarg"', () => {
  assert.equal(roundFromText('ZAN ogłasza III publiczny przetarg ustny nieograniczony na sprzedaż'), 3);
});

test('roundFromText: not fooled by an unrelated Roman numeral ("Wydział IV Ksiąg Wieczystych")', () => {
  assert.equal(
    roundFromText('ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż. Sąd Rejonowy Wydział IV Ksiąg Wieczystych'),
    1,
  );
});

test('roundFromText: no "ogłasza ... przetarg" anchor -> null', () => {
  assert.equal(roundFromText('coś zupełnie innego'), null);
  assert.equal(roundFromText(''), null);
});

test('roundFromTitle: title-anchored fallback for the letter-spaced-heading quirk', () => {
  assert.equal(
    roundFromTitle('II publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9 przy ul. Armii Krajowej 4 w Namysłowie'),
    2,
  );
  assert.equal(
    roundFromTitle('I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 przy ul. Boh. Warszawy 7 w Namysłowie'),
    1,
  );
  assert.equal(roundFromTitle('coś zupełnie innego'), null);
  assert.equal(roundFromTitle(null), null);
});

test('auctionDateFromText: "30 lipca 2026r." (glued "r.") -> 2026-07-30', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 30 lipca 2026r. o godz. 11:00'), '2026-07-30');
});

test('auctionDateFromText: "30 lipca 2026 r." (spaced) -> 2026-07-30', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 30 lipca 2026 r. o godz. 10:00'), '2026-07-30');
});

test('auctionDateFromText: no match -> null', () => {
  assert.equal(auctionDateFromText('brak daty'), null);
});

test('parsePublishedShort: board post-meta short date', () => {
  assert.equal(parsePublishedShort('cze 15, 2026'), '2026-06-15');
  assert.equal(parsePublishedShort('lut 17, 2026'), '2026-02-17');
  assert.equal(parsePublishedShort(null), null);
});

test('startingPriceFromText: nominative "cena wywoławcza", not the genitive wadium clause', () => {
  const t = 'cena wywoławcza – 105.000,00 zł. wadium w wysokości 10% ceny wywoławczej podanej w ogłoszeniu';
  assert.equal(startingPriceFromText(t), 105000);
});

test('areaM2FromText: tolerates the "wraz z powierzchnią przynależną" gap', () => {
  assert.equal(
    areaM2FromText('lokalu mieszkalnego nr 8 o powierzchni użytkowej wraz z powierzchnią przynależną 38,11 m2,'),
    38.11,
  );
  assert.equal(areaM2FromText('o powierzchni użytkowej 60,12 m2 stanowiącego własność'), 60.12);
});

test('kwNumberFromText / aptFromText / streetBuildingFromText', () => {
  const t = 'lokalu mieszkalnego nr 2 [...] księgę wieczystą nr OP1U/00069839/1 [...] położonego przy ul. Jana Pawła II 5A w Namysłowie.';
  assert.equal(kwNumberFromText(t), 'OP1U/00069839/1');
  assert.equal(aptFromText(t), '2');
  assert.equal(streetBuildingFromText(t), 'Jana Pawła II 5A');
});

test('streetBuildingFromText: not confused by ZAN\'s own "w Namysłowie" mention before the property\'s', () => {
  const t = 'stanowiącego własność ZAN Sp. z o. o. w Namysłowie położonego przy ul. Bohaterów Warszawy 7 w Namysłowie.';
  assert.equal(streetBuildingFromText(t), 'Bohaterów Warszawy 7');
});

// ------------------------------------------------------------- parseNoticeText

test('parseNoticeText: full record — Jana Pawła II 5A/2 (round IV, task groundtruth)', () => {
  const t =
    'ZAN ogłasza IV publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 ' +
    'o powierzchni użytkowej 60,12 m2 stanowiącego własność ZAN Sp. z o. o. w Namysłowie położonego ' +
    'przy ul. Jana Pawła II 5A w Namysłowie. cena wywoławcza – 160.000,00 zł. ' +
    'Sąd Rejonowy w Kluczborku Wydział IV Ksiąg Wieczystych prowadzi księgę wieczystą nr OP1U/00069839/1. ' +
    'Przetarg odbędzie się w dniu 30 lipca 2026r. o godz. 11:00.';
  const rec = parseNoticeText(t);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'jana pawla ii|5A|2');
  assert.equal(rec.address.street, 'Jana Pawła II');
  assert.equal(rec.address.building, '5A');
  assert.equal(rec.address.apt, '2');
  assert.equal(rec.area_m2, 60.12);
  assert.equal(rec.starting_price_pln, 160000);
  assert.equal(rec.auction_date, '2026-07-30');
  assert.equal(rec.round, 4);
  assert.equal(rec.kw_nr, 'OP1U/00069839/1');
});

test('parseNoticeText: a garage-rental notice (kind != mieszkalny) -> null', () => {
  const t = 'ZAN ogłasza I przetarg ustny na najem garażu położonego przy ul. Bohaterów Warszawy w Namysłowie';
  assert.equal(parseNoticeText(t), null);
});

test('parseNoticeText: empty/garbage -> null', () => {
  assert.equal(parseNoticeText(''), null);
  assert.equal(parseNoticeText(null), null);
  assert.equal(parseNoticeText('lokal mieszkalny ale bez adresu ani numeru'), null);
});

// ----------------------------------------------------------------- board page

test('isFlatSaleTitle: real flat-sale titles -> true', () => {
  assert.equal(
    isFlatSaleTitle('IV publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Jana Pawła II 5a/2 w Namysłowie'),
    true,
  );
  assert.equal(
    isFlatSaleTitle('I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 przy ul. Boh. Warszawy 7 w Namysłowie'),
    true,
  );
});

test('isFlatSaleTitle: real non-flat titles -> false (renovation, procurement award, garage rental)', () => {
  assert.equal(isFlatSaleTitle('TERMOMODERNIZACJA BUDYNKU MIESZKALNEGO WIELORODZINNEGO PRZY UL. 3 MAJA 8 W NAMYSŁOWIE'), false);
  assert.equal(isFlatSaleTitle('ZAWIADOMIENIE O WYBORZE OFERTY – REMONT ELEWACJI WSCHODNIEJ (WYSOKA CZĘŚĆ) RYNEK 1 W NAMYSŁOWIE'), false);
  assert.equal(
    isFlatSaleTitle('I przetarg ustny na najem garażu położonego przy ul. Bohaterów Warszawy w Namysłowie usytuowanego na działce nr 1027/ 12'),
    false,
  );
});

test('isFlatSaleTitle: empty -> false', () => {
  assert.equal(isFlatSaleTitle(''), false);
  assert.equal(isFlatSaleTitle(null), false);
});

// Condensed-but-faithful reproduction of the real zan-namyslow.pl/przetargi/
// board markup (Divi theme) — titles/urls/published dates are REAL, captured
// live 2026-07-10 (trimmed from the full ~255 KB page to 6 representative
// posts spanning 2 of the real board's categories).
const BOARD_HTML = `<main>
<article id="post-225814" class="et_pb_post clearfix et_pb_blog_item_0_0 post-225814 post type-post status-publish format-standard has-post-thumbnail hentry category-aktualnosci category-przetargi">
	<h2 class="entry-title">
		<a href="${JP2_5A2_IV_URL}">IV publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Jana Pawła II 5a/2 w Namysłowie</a>
	</h2>
	<p class="post-meta">utworzone przez <span class="author vcard"><a href="https://zan-namyslow.pl/author/robert-radomski/" rel="author">Robert Radomski</a></span> | <span class="published">cze 15, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="tag">PRZETARGI</a></p>
</article>
<article id="post-225812" class="et_pb_post clearfix et_pb_blog_item_0_1 post-225812 post type-post status-publish format-standard has-post-thumbnail hentry category-aktualnosci category-przetargi">
	<h2 class="entry-title">
		<a href="${BOH_III_URL}">III publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Boh. Warszawy 7/8 w Namysłowie</a>
	</h2>
	<p class="post-meta">utworzone przez <span class="author vcard"><a href="https://zan-namyslow.pl/author/robert-radomski/" rel="author">Robert Radomski</a></span> | <span class="published">cze 15, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="tag">PRZETARGI</a></p>
</article>
<article id="post-225805" class="et_pb_post clearfix et_pb_blog_item_0_2 post-225805 post type-post status-publish format-standard has-post-thumbnail hentry category-aktualnosci category-przetargi">
	<h2 class="entry-title">
		<a href="https://zan-namyslow.pl/termomodernizacja-budynku-mieszkalnego-wielorodzinnego-przy-ul-3-maja-8-w-namyslowie/">TERMOMODERNIZACJA BUDYNKU MIESZKALNEGO WIELORODZINNEGO  PRZY UL. 3 MAJA 8 W NAMYSŁOWIE</a>
	</h2>
	<p class="post-meta">utworzone przez <span class="author vcard"><a href="https://zan-namyslow.pl/author/robert-radomski/" rel="author">Robert Radomski</a></span> | <span class="published">maj 22, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="tag">PRZETARGI</a></p>
</article>
<article id="post-225800" class="et_pb_post clearfix et_pb_blog_item_0_3 post-225800 post type-post status-publish format-standard has-post-thumbnail hentry category-aktualnosci category-przetargi">
	<h2 class="entry-title">
		<a href="https://zan-namyslow.pl/zawiadomienie-o-wyborze-oferty-remont-elewacji-wschodniej-wysoka-czesc-rynek-1-w-namyslowie/">ZAWIADOMIENIE O WYBORZE OFERTY &#8211; REMONT ELEWACJI WSCHODNIEJ (WYSOKA CZĘŚĆ) RYNEK 1 W NAMYSŁOWIE</a>
	</h2>
	<p class="post-meta">utworzone przez <span class="author vcard"><a href="https://zan-namyslow.pl/author/robert-radomski/" rel="author">Robert Radomski</a></span> | <span class="published">kwi 23, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="tag">PRZETARGI</a></p>
</article>
<article id="post-224001" class="et_pb_post clearfix et_pb_blog_item_0_4 post-224001 post type-post status-publish format-standard has-post-thumbnail hentry category-aktualnosci category-przetargi">
	<h2 class="entry-title">
		<a href="https://zan-namyslow.pl/i-przetarg-ustny-na-najem-garazu-polozonego-przy-ul-bohaterow-warszawy-w-namyslowie-usytuowanego-na-dzialce-nr-1027-12/">I przetarg ustny na najem garażu położonego przy ul. Bohaterów Warszawy  w Namysłowie usytuowanego na działce nr 1027/ 12</a>
	</h2>
	<p class="post-meta">utworzone przez <span class="author vcard"><a href="https://zan-namyslow.pl/author/robert-radomski/" rel="author">Robert Radomski</a></span> | <span class="published">lut 17, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="tag">PRZETARGI</a></p>
</article>
<article id="post-223995" class="et_pb_post clearfix et_pb_blog_item_0_5 post-223995 post type-post status-publish format-standard has-post-thumbnail hentry category-aktualnosci category-przetargi">
	<h2 class="entry-title">
		<a href="https://zan-namyslow.pl/i-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-8-przy-ul-boh-warszawy-7-w-namyslowie/">I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 przy ul. Boh. Warszawy 7 w Namysłowie</a>
	</h2>
	<p class="post-meta">utworzone przez <span class="author vcard"><a href="https://zan-namyslow.pl/author/robert-radomski/" rel="author">Robert Radomski</a></span> | <span class="published">lut 17, 2026</span> | <a href="https://zan-namyslow.pl/category/przetargi/" rel="tag">PRZETARGI</a></p>
</article>
</main>`;

test('parseBoardPage: extracts all 6 posts with url/title/published_date', () => {
  const items = parseBoardPage(BOARD_HTML);
  assert.equal(items.length, 6);
  assert.equal(items[0].url, JP2_5A2_IV_URL);
  assert.equal(items[0].published_date, '2026-06-15');
});

test('parseBoardPage + isFlatSaleTitle together: exactly the 3 real flat-sale posts survive', () => {
  const items = parseBoardPage(BOARD_HTML).filter((it) => isFlatSaleTitle(it.title));
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((it) => it.url).sort(),
    [JP2_5A2_IV_URL, BOH_III_URL, 'https://zan-namyslow.pl/i-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-8-przy-ul-boh-warszawy-7-w-namyslowie/'].sort(),
  );
});

test('parseBoardPage: dedupes repeated article ids/urls', () => {
  const items = parseBoardPage(BOARD_HTML + BOARD_HTML);
  assert.equal(items.length, 6);
});

test('parseBoardPage: empty/no articles -> []', () => {
  assert.deepEqual(parseBoardPage(''), []);
  assert.deepEqual(parseBoardPage('<main>nothing here</main>'), []);
});

// ---------------------------------------------------------------- detail page

test('parseDetailPage: Jana Pawła II 5A/2 — full record matches the task groundtruth', () => {
  const r = parseDetailPage(JP2_5A2_IV_HTML, JP2_5A2_IV_URL);
  assert.ok(r, 'should return a record');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'jana pawla ii|5A|2');
  assert.equal(r.address.street, 'Jana Pawła II');
  assert.equal(r.address.building, '5A');
  assert.equal(r.address.apt, '2');
  assert.equal(r.area_m2, 60.12);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.auction_date, '2026-07-30');
  assert.equal(r.round, 4);
  assert.equal(r.kw_nr, 'OP1U/00069839/1');
  assert.equal(r.detail_url, JP2_5A2_IV_URL);
  assert.equal(r.detail_pdf, 'https://zan-namyslow.pl/pseeckoo/2026/06/Przetarg-Jana-Pawla-II.pdf');
});

test('parseDetailPage: Bohaterów Warszawy 7/8 — area gap + KW + not fooled by wadium clause', () => {
  const r = parseDetailPage(BOH_III_HTML, BOH_III_URL);
  assert.ok(r, 'should return a record');
  assert.equal(r.address.key, 'bohaterow warszawy|7|8');
  assert.equal(r.address.building, '7');
  assert.equal(r.address.apt, '8');
  assert.equal(r.area_m2, 38.11);
  assert.equal(r.starting_price_pln, 105000);
  assert.equal(r.round, 3);
  assert.equal(r.kw_nr, 'OP1U/00086457/4');
  assert.equal(r.detail_pdf, 'https://zan-namyslow.pl/pseeckoo/2026/06/Przetarg-Boh.-Warszawy-7.pdf');
});

test('parseDetailPage: Jana Pawła II 5/2 round III (past-dated predecessor of round IV) — <strong>/<u>-tagged prose parses the same', () => {
  const r = parseDetailPage(JP2_5_2_III_HTML, JP2_5_2_III_URL);
  assert.ok(r, 'should return a record');
  assert.equal(r.address.key, 'jana pawla ii|5A|2');
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.auction_date, '2026-06-12');
  assert.equal(r.round, 3);
  assert.equal(r.kw_nr, 'OP1U/00069839/1');
  // Only one PDF link on this post (no separate Regulamin) — still resolved.
  assert.equal(r.detail_pdf, 'https://zan-namyslow.pl/pseeckoo/2026/04/Przetarg-Czerwiec-2026.pdf');
});

test('parseDetailPage: Armii Krajowej 4/9 — letter-spaced heading falls back to <h1> title for round', () => {
  const r = parseDetailPage(ARMII_4_9_II_HTML, ARMII_4_9_II_URL);
  assert.ok(r, 'should return a record — address/price/date still parse despite the letter-spaced heading');
  assert.equal(r.address.key, 'armii krajowej|4|9');
  assert.equal(r.area_m2, 19.25);
  assert.equal(r.starting_price_pln, 49000);
  assert.equal(r.auction_date, '2026-03-06');
  assert.equal(r.round, 2, 'round must come from the <h1> title fallback, not the letter-spaced body');
  assert.equal(r.kw_nr, 'OP1U/00069968/4');
});

test('parseDetailPage: null/empty HTML -> null', () => {
  assert.equal(parseDetailPage(null, JP2_5A2_IV_URL), null);
  assert.equal(parseDetailPage('', JP2_5A2_IV_URL), null);
});

test('parseDetailPage: a page with no flat-sale prose -> null', () => {
  const html = '<div class="entry-content"><p>Zapytanie ofertowe nr ZAN.VII/7062/2/2026 utrzymanie porządku i czystości</p></div></article>';
  assert.equal(parseDetailPage(html, 'https://zan-namyslow.pl/zapytanie-ofertowe/'), null);
});

// ---------------------------------------------------------------- result stub

test('parseResultDoc: stub returns [] for any input (ZAN has no flat-results board)', () => {
  assert.deepEqual(parseResultDoc('cena osiągnięta 200000 zł', '2026-07-30', 'https://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});
