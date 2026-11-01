import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const okonek = makeBiuletynNetCity({
  id: 'okonek',
  teryt: '3031054',
  name: 'Okonek',
  label: 'Okonek',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Okonek',
  host: 'okonek.biuletyn.net',
  origin: 'https://okonek.biuletyn.net',
  defaultCid: 1801,
});

export default okonek;
