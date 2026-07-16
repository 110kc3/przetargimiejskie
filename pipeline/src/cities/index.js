// City registry. Adding a new city is: create cities/<city>/ implementing the
// adapter contract (see gliwice/index.js), then add one import + array entry
// here. refresh.js, the CI matrix, and data/index.json all read from this list.

import gliwice from './gliwice/index.js';
import katowice from './katowice/index.js';
import bytom from './bytom/index.js';
import zabrze from './zabrze/index.js';
import sosnowiec from './sosnowiec/index.js';
import rybnik from './rybnik/index.js';
import bielsko from './bielsko/index.js';
import myslowice from './myslowice/index.js';
import swietochlowice from './swietochlowice/index.js';
import tarnowskieGory from './tarnowskie-gory/index.js';
// Neighbouring-voivodeship expansion (first non-Śląskie cities) — see SPIKE-NEIGHBORS.md.
import kedzierzynKozle from './kedzierzyn-kozle/index.js';
import trzebinia from './trzebinia/index.js';
import krakow from './krakow/index.js';
import olkusz from './olkusz/index.js';
import opole from './opole/index.js';
import oswiecim from './oswiecim/index.js';
import chrzanow from './chrzanow/index.js';
// All-Poland expansion (city-counties + powiat seats) — see spikes/ + SPIKE-PROGRESS.md.
import legnica from './legnica/index.js';
import raciborz from './raciborz/index.js';
import olsztyn from './olsztyn/index.js';
import torun from './torun/index.js';
import pabianice from './pabianice/index.js';
import wejherowo from './wejherowo/index.js';
import lodz from './lodz/index.js';
import walbrzych from './walbrzych/index.js';
import bialystok from './bialystok/index.js';
import nysa from './nysa/index.js';
import gdansk from './gdansk/index.js';
import kielce from './kielce/index.js';
import pila from './pila/index.js';
import szczecin from './szczecin/index.js';
import klodzko from './klodzko/index.js';
import brzeg from './brzeg/index.js';
import stargard from './stargard/index.js';
import slupsk from './slupsk/index.js';
import tczew from './tczew/index.js';
import gniezno from './gniezno/index.js';
import cieszyn from './cieszyn/index.js';
import przemysl from './przemysl/index.js';
import chelm from './chelm/index.js';
import swinoujscie from './swinoujscie/index.js';
import warszawa from './warszawa/index.js';
import skarzysko from './skarzysko-kamienna/index.js';
import gizycko from './gizycko/index.js';
import nowaSol from './nowa-sol/index.js';
import augustow from './augustow/index.js';
import buskoZdroj from './busko-zdroj/index.js';
import braniewo from './braniewo/index.js';
import belchatow from './belchatow/index.js';
import bochnia from './bochnia/index.js';
import drawskoPomorskie from './drawsko-pomorskie/index.js';
import chelmno from './chelmno/index.js';
import ostroleka from './ostroleka/index.js';
// Rebuilt 2026-07-06 (clean rebuild after the June mount-corruption; live-groundtruthed).
import bydgoszcz from './bydgoszcz/index.js';
import gorzowWielkopolski from './gorzow-wielkopolski/index.js';
// Batch 1 of the BUILD-ready powiat-seat expansion (2026-07-10; each live-
// groundtruthed with a passing parse test). All test-tier except lubliniec (Śląskie).
import nakloNadNotecia from './naklo-nad-notecia/index.js';
import zgorzelec from './zgorzelec/index.js';
import konskie from './konskie/index.js';
import zlotoryja from './zlotoryja/index.js';
import choszczno from './choszczno/index.js';
import chodziez from './chodziez/index.js';
import namyslow from './namyslow/index.js';
import olesno from './olesno/index.js';
import mragowo from './mragowo/index.js';
import miedzyrzecz from './miedzyrzecz/index.js';
import pajeczno from './pajeczno/index.js';
import lubliniec from './lubliniec/index.js';
// Batch 2 of the BUILD-ready powiat-seat expansion (2026-07-10; each live-
// groundtruthed with a passing parse test). All test-tier (pszczyna deferred — see below).
import pultusk from './pultusk/index.js';
import sandomierz from './sandomierz/index.js';
import poddebice from './poddebice/index.js';
import proszowice from './proszowice/index.js';
import pleszew from './pleszew/index.js';
import pisz from './pisz/index.js';
import rawaMazowiecka from './rawa-mazowiecka/index.js';
// pszczyna (Śląskie = public-tier): crawl budgets tuned 2026-07-11 (MAX_PAGES
// 30→8, ARTICLE_BUDGET 15→8min, MAX_ARTICLES 320→150) to fit CI's 20-min step
// timeout, with the adapter's incremental backfill filling the archive over
// subsequent runs. See crawl.js header.
import pszczyna from './pszczyna/index.js';
// Batch 3 of the BUILD-ready powiat-seat expansion (2026-07-11; each live-
// groundtruthed with a passing parse test). All test-tier (none Śląskie).
import zdunskaWola from './zdunska-wola/index.js';
import trzebnica from './trzebnica/index.js';
import srodaWielkopolska from './sroda-wielkopolska/index.js';
import szczecinek from './szczecinek/index.js';
import wegorzewo from './wegorzewo/index.js';
// Batch 4 of the BUILD-ready expansion (2026-07-11; each live-groundtruthed with
// a passing parse test). All test-tier (none Śląskie).
import strzelceKrajenskie from './strzelce-krajenskie/index.js';
import wschowa from './wschowa/index.js';
import zagan from './zagan/index.js';
import wegrow from './wegrow/index.js';
import sulecin from './sulecin/index.js';
// Dolnośląskie powiat-seat builds (2026-07-11; each live-groundtruthed with a
// passing parse test). Both test-tier (dolnoslaskie, none Śląskie). boleslawiec
// = two-source (Joomla-RSS announcements + BIP born-digital result PDFs); wolow
// = SkyCMS city portal (wolow.pl), unsold-only outcome stream (no gmina hammer
// prices published — see spikes/dolnoslaskie/powiat-wolowski/wolow.md §4).
import boleslawiec from './boleslawiec/index.js';
import wolow from './wolow/index.js';
// Next wave — Low-effort powiat seats (2026-07-11; each live-groundtruthed with a
// passing parse test; all source:'html', none Śląskie). Live verification
// corrected each spike: lwowek-slaski = IDcom server-HTML + born-digital PDFs
// (land-dominated, not the inline-HTML/flat stream the spike assumed);
// sepolno-krajenskie = "BIP w JST" HTML + born-digital PDFs (incomplete TLS chain
// → insecureTLS + browser UA); zabkowice-slaskie = Logonet HTML announcements but
// SCANNED result PDFs (OCR via core/ocr-pdf.js, not pdfText — backfills over runs).
import lwowekSlaski from './lwowek-slaski/index.js';
import sepolnoKrajenskie from './sepolno-krajenskie/index.js';
import zabkowiceSlaskie from './zabkowice-slaskie/index.js';
// Low-effort wave (2026-07-11), all source:'html'. jarocin: WOKISS HTML year-index
// + born-digital text PDFs (brzeg analog; land-dominated). glubczyce: eSoteka/FINN
// boards /144+/145 hanging legacy .doc (catdoc) announcements + born-digital .pdf
// land (kedzierzyn-kozle analog). gostyn: Logonet .docx announcements + SCANNED .pdf
// results (OCR) — thin live volume (mostly one 2022 land notice; spike over-counted).
import jarocin from './jarocin/index.js';
import glubczyce from './glubczyce/index.js';
import gostyn from './gostyn/index.js';
// Low-effort wave cont. (2026-07-11), source:'html', both spikes materially
// corrected live. kwidzyn: React SPA backed by a Logonet/Madkom JSON API (crawl
// drives the API directly — no render.js) + SCANNED result PDFs (OCR); real board
// is "Gospodarka Nieruchomościami" (spike pointed at the procurement board).
// ketrzyn (miasto): old eSesja board was retired → now a gov.pl card board
// (bialystok analog) + born-digital result PDFs; 429 handled by core throttle.
import kwidzyn from './kwidzyn/index.js';
import ketrzyn from './ketrzyn/index.js';
// kamienna-gora (miasto): bip.kamiennagora.pl born-digital PDF notices behind a
// browser-UA gate; discovery via sitemap.xml (year-index URLs unstable); walbrzych
// × wolow analog. Real flat stream with sold+unsold achieved prices. TERYT
// 020701_1 geoportal-CONFIRMED. (Aside: klodzko/config.js teryt 0207 is mis-coded
// — 0207 is powiat kamiennogórski; Kłodzko is 0208. Left untouched — separate fix.)
import kamiennaGora from './kamienna-gora/index.js';
// Low-effort wave cont. (2026-07-12), server-HTML (no render). krosno-odrzanskie:
// SYSTEMDOBIP board /przetargi/202/status (wschowa analog) — inline Cena+Wynik +
// born-digital result PDFs; flats-only, all currently unsold; browser-UA required.
// lipsko: govpl/Liferay samorzad.gov.pl, mixed inline-HTML + SCANNED-PDF (OCR)
// notices; land-dominated with real achieved prices; sitemap discovery.
import krosnoOdrzanskie from './krosno-odrzanskie/index.js';
import lipsko from './lipsko/index.js';
// kolbuszowa: Pro3W CMS bip.kolbuszowa.pl — inline-HTML announcements (wolow
// analog) + SCANNED "Informacja o wyniku" result PDFs (OCR; brzeg-style). Flat
// stream under 3669-sprzedaz-nieruchomości (spike cited procurement cat); ~1
// flat/yr all SOLD, board ~99% land (land achieved-prices out of scope).
import kolbuszowa from './kolbuszowa/index.js';
// kujawsko-pomorskie server-HTML pair (2026-07-12), TERYT confirmed. wabrzezno:
// rbip.mojregion.info XML feed (/xml/330/przetargi.html, no pagination) + inline
// <tresc>/PDF/DOCX notices, multi-lokal split (zgorzelec analog). znin:
// bip.gminaznin.pl System-Rada board, browser-UA required, SCANNED PDFs (OCR),
// unsold-only via superseded rounds (no results board; nowa-sol analog). Both
// land-dominated, ~1 flat each.
import wabrzezno from './wabrzezno/index.js';
import znin from './znin/index.js';
// Low-effort wave cont. (2026-07-12), server-HTML (no render). strzelce-opolskie:
// GZMK/fast4net gzmk.pl server-HTML board 'Przetargi na sprzedaż nieruchomości,14'
// — inline-HTML announcements + born-digital PDF + inline ZAWIADOMIENIE results
// (brzeg/nowa-sol analog, wolow-shaped single MIXED flats+land board, body-driven
// classifyKind). sucha-beskidzka: Interaktywna Polska server-HTML (sucha-beskidzka.pl)
// + born-digital PDF notices (bochnia analog); achieved prices live only on the
// bip.malopolska JS-SPA (out of scope → final_price_pln residual-null, wolow-style
// round-supersession for unsold).
import strzelceOpolskie from './strzelce-opolskie/index.js';
import suchaBeskidzka from './sucha-beskidzka/index.js';
// lebork (Pomorskie/powiat lęborski, 2026-07-13): bip.um.lebork.pl bespoke BIP,
// server-HTML (browser UA), no PDF/OCR. ONE recursive "Lista artykułów" tree
// (board → year → month → leaf; decorative slugs — crawl follows the row href,
// classifies by BODY). Multi-lokal notices split one record per lokal; land →
// land.json; "Informacja … o wyniku" → result stream. Analogs: wabrzezno (multi-
// lokal parser + content-routed announce/result split) × zgorzelec (html board →
// article → inline text). Live-groundtruthed 2026-07-13, which corrected three
// parser assumptions: flat RESULTS drop "ul." ("przy Łokietka 24") so the address
// anchor made "ul." optional/uppercase-initial; tabular LAND rows abut a bare area
// to the price (2392 210.000,00) so the amount regex got a (?<!\d) guard; and a
// multi-lokal middle unit can read "nr 17 oficyna o pow" so the lokal anchor
// tolerates that qualifier.
import lebork from './lebork/index.js';
// klobuck (Śląskie/powiat kłobucki, 2026-07-13) — ⚠️ PUBLIC-TIER (blocks CI), so
// crawl.js is triple-bounded (MAX_PAGES/DETAILS/FETCHES) and never throws.
// gminaklobuck.pl bespoke PHP portal, server-HTML (browser UA, no PDF/OCR). Live
// verification corrected the DESK spike: the bip.gminaklobuck.pl IntraCOM mirror
// serves a BROKEN TLS cert → the town portal is the source of record; the
// `/ogloszenia?page=N` board's detail <h1> is a useless generic "Ogłoszenie", so
// routing keys on the URL SLUG (fetch only sale + result pages). Two parse bugs the
// resumed agent flagged were fixed here: the flat address grabbed the "Nr" label
// into the street ("Rómmla Nr" → "Rómmla"), and the buyer regex died on the Polish
// "Nabywcą" (ASCII \w) → now a Polish-letter class. Low flat volume (one recurring
// Rómmla unit, sold on round III) + repeat-round land; wolow/kolbuszowa analog. 8/8.
import klobuck from './klobuck/index.js';
// poznan (Wielkopolskie city-county, 2026-07-16) — bespoke WGN CMS, not the
// Kraków ?news_id= format the spike guessed; board + JSON API need a browser UA
// (spike's "API empty" was a missing-UA artifact). Board teasers lack price —
// price lives in a linked born-digital "pełna treść ogłoszenia" PDF. Achieved
// prices via category-8800 "wyniki przetargów" (confirmed real via Wayback,
// purged from the live CMS ~1-3 weeks after posting); parseResultDoc follows
// the cross-city idiom but is NOT YET live-verified against a real result PDF —
// re-confirm on the first live catch.
import poznan from './poznan/index.js';
// elblag (Warminsko-Mazurskie city-county, 2026-07-16) — Logonet eUrząd CMS
// (same vendor as tarnowskie-gory/kedzierzyn-kozle, confirmed via footer
// version string), but per-item detail pages are structured HTML tables (not
// PDF prose) and result docs are batch tables — one .doc can report several
// properties decided the same day, expanded to one record per row. Filters
// the bezprzetargowo (tenant-sale) wykaz stream both structurally (never
// crawls that board) and via an explicit isBezprzetargowoDoc() classifier,
// groundtruthed against a real tenant-sale notice.
import elblag from './elblag/index.js';
// wroclaw (Dolnoslaskie city-county, 2026-07-16) — Logonet eUrząd BIP with a
// structured search endpoint (/przetargi-nieruchomosci/szukaj); strong live
// volume (225 active flat listings on first crawl). Corrects the spike's
// two-source-join assumption: BIP itself grows a "wynik" .docx attachment
// with achieved price/buyer/area, but only for a ~7-day RODO publication
// window post-auction — daily refresh easily beats it, so BIP is the primary
// result source and Giełda Nieruchomości (bounded ID-range scan) is only a
// secondary backfill for lots whose BIP window already closed.
import wroclaw from './wroclaw/index.js';
// grudziadz (Kujawsko-Pomorskie city-county, 2026-07-16) — plain server-rendered
// DataTables board (bip.grudziadz.pl); despite client-side "paging": true, ALL
// ~620 rows since 2008 are in one plain-GET HTML response, so the spike's
// JS-pagination/render.js concern doesn't apply. Achieved-price stream is real
// but thin (one OCR'd result, currently unsold); the sold-outcome branch of
// parseResultDoc is best-effort/unvalidated against a real sold fixture.
import grudziadz from './grudziadz/index.js';
// kalisz (Wielkopolskie city-county, 2026-07-16) — older classic PHP BIP board
// (bip.kalisz.pl, r_ogl=SN), closer to the Kraków bespoke-HTML family than the
// named Poznań analog; one board serves both announcement + result streams as
// spiked. classifyKind/addressFromText are scoped to a subjectWindow() (the
// clause between "ogłasza"/"informacja o wyniku" and the "I." header) after
// live smoke-testing caught unscoped extraction bleeding into unrelated PDF
// body text (a land notice's incidental "zabudowana" mention, a RODO clause's
// vendor address). Land/grunt items are classified but not deep-parsed
// (out of scope per spike's flat-focused BUILD criterion).
import kalisz from './kalisz/index.js';

export const cities = [
  gliwice,
  katowice,
  bytom,
  zabrze,
  sosnowiec,
  rybnik,
  bielsko,
  myslowice,
  swietochlowice,
  tarnowskieGory,
  kedzierzynKozle,
  trzebinia,
  krakow,
  olkusz,
  opole,
  oswiecim,
  chrzanow,
  legnica,
  raciborz,
  olsztyn,
  torun,
  pabianice,
  wejherowo,
  lodz,
  walbrzych,
  bialystok,
  nysa,
  gdansk,
  kielce,
  pila,
  szczecin,
  klodzko,
  brzeg,
  stargard,
  slupsk,
  tczew,
  gniezno,
  cieszyn,
  przemysl,
  chelm,
  swinoujscie,
  warszawa,
  skarzysko,
  gizycko,
  nowaSol,
  augustow,
  buskoZdroj,
  braniewo,
  belchatow,
  bochnia,
  drawskoPomorskie,
  chelmno,
  ostroleka,
  bydgoszcz,
  gorzowWielkopolski,
  nakloNadNotecia,
  zgorzelec,
  konskie,
  zlotoryja,
  choszczno,
  chodziez,
  namyslow,
  olesno,
  mragowo,
  miedzyrzecz,
  pajeczno,
  lubliniec,
  pultusk,
  sandomierz,
  poddebice,
  proszowice,
  pleszew,
  pisz,
  rawaMazowiecka,
  pszczyna,
  zdunskaWola,
  trzebnica,
  srodaWielkopolska,
  szczecinek,
  wegorzewo,
  strzelceKrajenskie,
  wschowa,
  zagan,
  wegrow,
  sulecin,
  boleslawiec,
  wolow,
  lwowekSlaski,
  sepolnoKrajenskie,
  zabkowiceSlaskie,
  jarocin,
  glubczyce,
  gostyn,
  kwidzyn,
  ketrzyn,
  kamiennaGora,
  krosnoOdrzanskie,
  lipsko,
  kolbuszowa,
  wabrzezno,
  znin,
  strzelceOpolskie,
  suchaBeskidzka,
  lebork,
  klobuck,
  poznan,
  elblag,
  wroclaw,
  grudziadz,
  kalisz,
];

/** @param {string} id @returns {object|null} */
export function getCity(id) {
  return cities.find((c) => c.id === id) || null;
}
