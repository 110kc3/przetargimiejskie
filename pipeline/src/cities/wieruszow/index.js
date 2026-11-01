import { makeFinnCity } from '../../core/finn-bip.js';

export const wieruszow = makeFinnCity({
  id: 'wieruszow',
  teryt: '1018074',
  label: 'Wieruszów',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Wieruszów',
  host: 'bip3.wokiss.pl',
  origin: 'https://bip3.wokiss.pl',
  boardUrl: 'https://bip3.wokiss.pl/wieruszowm/',
});

export default wieruszow;
