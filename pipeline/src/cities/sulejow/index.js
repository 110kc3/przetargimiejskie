import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const sulejow = makeBiuletynNetCity({
  id: 'sulejow',
  teryt: '1010094',
  name: 'Sulejów',
  label: 'Sulejów',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Sulejów',
  host: 'bip.sulejow.pl',
  origin: 'https://bip.sulejow.pl',
  defaultCid: 70,
});

export default sulejow;
