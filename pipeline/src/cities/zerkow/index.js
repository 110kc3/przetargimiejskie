import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const zerkow = makeBiuletynNetCity({
  id: 'zerkow',
  teryt: '3006044',
  name: 'Żerków',
  label: 'Żerków',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Żerków',
  host: 'zerkow.biuletyn.net',
  origin: 'https://zerkow.biuletyn.net',
  defaultCid: 1131,
});

export default zerkow;
