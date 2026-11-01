import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const szadek = makeBiuletynNetCity({
  id: 'szadek',
  teryt: '1019024',
  name: 'Szadek',
  label: 'Szadek',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Szadek',
  host: 'szadek.biuletyn.net',
  origin: 'https://szadek.biuletyn.net',
  defaultCid: 57,
});

export default szadek;
