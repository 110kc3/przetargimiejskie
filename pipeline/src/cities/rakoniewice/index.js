import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const rakoniewice = makeBiuletynNetCity({
  id: 'rakoniewice',
  teryt: '3005044',
  name: 'Rakoniewice',
  label: 'Rakoniewice',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Rakoniewice',
  host: 'rakoniewice.biuletyn.net',
  origin: 'https://rakoniewice.biuletyn.net',
  defaultCid: 1024,
});

export default rakoniewice;
