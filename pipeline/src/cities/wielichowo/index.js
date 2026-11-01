import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const wielichowo = makeBiuletynNetCity({
  id: 'wielichowo',
  teryt: '3005054',
  name: 'Wielichowo',
  label: 'Wielichowo',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Wielichowo',
  host: 'wielichowo.biuletyn.net',
  origin: 'https://wielichowo.biuletyn.net',
  defaultCid: 70,
});

export default wielichowo;
