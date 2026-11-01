import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const strumien = makeBiuletynNetCity({
  id: 'strumien',
  teryt: '2403114',
  name: 'Strumień',
  label: 'Strumień',
  voivodeship: 'slaskie',
  authority: 'Prezydent Miasta Strumień',
  host: 'strumien.biuletyn.net',
  origin: 'https://strumien.biuletyn.net',
  defaultCid: 70,
});

export default strumien;
