import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const bialaczow = makeBiuletynNetCity({
  id: 'bialaczow',
  teryt: '1007014',
  name: 'Białaczów',
  label: 'Białaczów',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Białaczów',
  host: 'bialaczow.biuletyn.net',
  origin: 'https://bialaczow.biuletyn.net',
  defaultCid: 70,
});

export default bialaczow;
