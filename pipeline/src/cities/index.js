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
];

/** @param {string} id @returns {object|null} */
export function getCity(id) {
  return cities.find((c) => c.id === id) || null;
}
