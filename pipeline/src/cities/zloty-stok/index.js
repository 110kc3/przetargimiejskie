import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const zlotyStok = makeBiuletynNetCity({
  id: 'zloty-stok',
  teryt: '0224074',
  name: 'Złoty Stok',
  label: 'Złoty Stok',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Złoty Stok',
  host: 'zlotystok.biuletyn.net',
  origin: 'https://zlotystok.biuletyn.net',
  defaultCid: 1157,
});

export default zlotyStok;
