import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const skorcz = makeBiuletynNetCity({
  id: 'skorcz',
  teryt: '2213021',
  name: 'Skórcz',
  label: 'Skórcz',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Skórcz',
  host: 'bip.skorcz.pl',
  origin: 'https://bip.skorcz.pl',
  defaultCid: 1100,
});

export default skorcz;
