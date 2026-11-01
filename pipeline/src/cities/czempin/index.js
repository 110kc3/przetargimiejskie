import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const czempin = makeBiuletynNetCity({
  id: 'czempin',
  teryt: '3011024',
  name: 'Czempiń',
  label: 'Czempiń',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Czempiń',
  host: 'czempin.biuletyn.net',
  origin: 'https://czempin.biuletyn.net',
  defaultCid: 1185,
});

export default czempin;
