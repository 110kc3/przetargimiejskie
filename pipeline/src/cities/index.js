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
];

/** @param {string} id @returns {object|null} */
export function getCity(id) {
  return cities.find((c) => c.id === id) || null;
}
