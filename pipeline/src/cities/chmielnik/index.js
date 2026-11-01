import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const chmielnik = makeBiuletynNetCity({
  id: 'chmielnik',
  teryt: '2604044',
  name: 'Chmielnik',
  label: 'Chmielnik',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Chmielnik',
  host: 'chmielnik.biuletyn.net',
  origin: 'https://chmielnik.biuletyn.net',
  defaultCid: 1228,
});

export default chmielnik;
