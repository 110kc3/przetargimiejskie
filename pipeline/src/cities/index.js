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
];

/** @param {string} id @returns {object|null} */
export function getCity(id) {
  return cities.find((c) => c.id === id) || null;
}
