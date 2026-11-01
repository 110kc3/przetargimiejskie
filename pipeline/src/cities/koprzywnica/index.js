import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const koprzywnica = makeBiuletynNetCity({
  id: 'koprzywnica',
  teryt: '2609044',
  name: 'Koprzywnica',
  label: 'Koprzywnica',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Koprzywnica',
  host: 'koprzywnica.biuletyn.net',
  origin: 'https://koprzywnica.biuletyn.net',
  defaultCid: 34,
});

export default koprzywnica;
