import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const raszkow = makeBiuletynNetCity({
  id: 'raszkow',
  teryt: '3017064',
  name: 'Raszków',
  label: 'Raszków',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Raszków',
  host: 'raszkow.biuletyn.net',
  origin: 'https://raszkow.biuletyn.net',
  defaultCid: 70,
});

export default raszkow;
