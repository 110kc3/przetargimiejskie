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
];

/** @param {string} id @returns {object|null} */
export function getCity(id) {
  return cities.find((c) => c.id === id) || null;
}
