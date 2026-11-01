import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const obrzycko = makeBiuletynNetCity({
  id: 'obrzycko',
  teryt: '3024011',
  name: 'Obrzycko',
  label: 'Obrzycko',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta Obrzycko',
  host: 'bip.obrzycko.pl',
  origin: 'https://bip.obrzycko.pl',
  defaultCid: 70,
});

export default obrzycko;
