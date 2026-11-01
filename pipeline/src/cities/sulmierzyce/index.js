import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const sulmierzyce = makeBiuletynNetCity({
  id: 'sulmierzyce',
  teryt: '3012011',
  name: 'Sulmierzyce',
  label: 'Sulmierzyce',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta Sulmierzyce',
  host: 'sulmierzyce.biuletyn.net',
  origin: 'https://sulmierzyce.biuletyn.net',
  defaultCid: 645,
});

export default sulmierzyce;
