import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const osiek = makeBiuletynNetCity({
  id: 'osiek',
  teryt: '2612044',
  name: 'Osiek',
  label: 'Osiek',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Osiek',
  host: 'osiek.biuletyn.net',
  origin: 'https://osiek.biuletyn.net',
  defaultCid: 70,
});

export default osiek;
