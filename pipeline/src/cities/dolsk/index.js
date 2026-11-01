import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const dolsk = makeBiuletynNetCity({
  id: 'dolsk',
  teryt: '3026024',
  name: 'Dolsk',
  label: 'Dolsk',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Dolsk',
  host: 'dolsk.biuletyn.net',
  origin: 'https://dolsk.biuletyn.net',
  defaultCid: 40,
});

export default dolsk;
