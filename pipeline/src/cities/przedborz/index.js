import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const przedborz = makeBiuletynNetCity({
  id: 'przedborz',
  teryt: '1012114',
  name: 'Przedbórz',
  label: 'Przedbórz',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Przedbórz',
  host: 'przedborz.biuletyn.net',
  origin: 'https://przedborz.biuletyn.net',
  defaultCid: 36,
});

export default przedborz;
