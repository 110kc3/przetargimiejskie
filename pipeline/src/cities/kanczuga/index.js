import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const kanczuga = makeBiuletynNetCity({
  id: 'kanczuga',
  teryt: '1814054',
  name: 'Kańczuga',
  label: 'Kańczuga',
  voivodeship: 'podkarpackie',
  authority: 'Prezydent Miasta Kańczuga',
  host: 'kanczuga.biuletyn.net',
  origin: 'https://kanczuga.biuletyn.net',
  defaultCid: 70,
});

export default kanczuga;
