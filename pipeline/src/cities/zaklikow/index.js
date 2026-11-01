import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const zaklikow = makeBiuletynNetCity({
  id: 'zaklikow',
  teryt: '1818054',
  name: 'Zaklików',
  label: 'Zaklików',
  voivodeship: 'podkarpackie',
  authority: 'Prezydent Miasta Zaklików',
  host: 'zaklikow.biuletyn.net',
  origin: 'https://zaklikow.biuletyn.net',
  defaultCid: 1012,
});

export default zaklikow;
