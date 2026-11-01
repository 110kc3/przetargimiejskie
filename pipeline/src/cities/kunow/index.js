import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const kunow = makeBiuletynNetCity({
  id: 'kunow',
  teryt: '2607054',
  name: 'Kunów',
  label: 'Kunów',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Kunów',
  host: 'kunow.biuletyn.net',
  origin: 'https://kunow.biuletyn.net',
  defaultCid: 166,
});

export default kunow;
