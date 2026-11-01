import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const dubiecko = makeBiuletynNetCity({
  id: 'dubiecko',
  teryt: '1813024',
  name: 'Dubiecko',
  label: 'Dubiecko',
  voivodeship: 'podkarpackie',
  authority: 'Prezydent Miasta Dubiecko',
  host: 'dubiecko.biuletyn.net',
  origin: 'https://dubiecko.biuletyn.net',
  defaultCid: 1030,
});

export default dubiecko;
