import { makeWokissCity } from '../../core/wokiss-bip.js';

export const ostrorog = makeWokissCity({
  id: 'ostrorog',
  teryt: '3024054',
  label: 'Ostroróg',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Ostroróg',
  host: 'ostrorog.biuletyn.net',
  origin: 'https://ostrorog.biuletyn.net',
  boardUrl: 'https://ostrorog.biuletyn.net/bip/przetargi/',
});

export default ostrorog;
