import { makeWokissCity } from '../../core/wokiss-bip.js';

export const wagrowiec = makeWokissCity({
  id: 'wagrowiec',
  teryt: '3028011',
  label: 'Wągrowiec',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Miasta Wągrowiec',
  host: 'bip.wagrowiec.eu',
  origin: 'https://bip.wagrowiec.eu',
  boardUrl: 'https://bip.wagrowiec.eu/wagrowiecm/bip/przetargi/',
});

export default wagrowiec;
