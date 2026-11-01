import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const czerniejewo = makeBiuletynNetCity({
  id: 'czerniejewo',
  teryt: '3003024',
  name: 'Czerniejewo',
  label: 'Czerniejewo',
  voivodeship: 'wielkopolskie',
  authority: 'Prezydent Miasta Czerniejewo',
  host: 'czerniejewo.biuletyn.net',
  origin: 'https://czerniejewo.biuletyn.net',
  defaultCid: 1018,
});

export default czerniejewo;
