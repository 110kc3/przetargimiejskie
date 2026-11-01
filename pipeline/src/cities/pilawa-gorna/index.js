import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const pilawaGorna = makeBiuletynNetCity({
  id: 'pilawa-gorna',
  teryt: '0202041',
  name: 'Piława Górna',
  label: 'Piława Górna',
  voivodeship: 'dolnoslaskie',
  authority: 'Burmistrz Miasta Piława Górna',
  host: 'pilawagorna.biuletyn.net',
  origin: 'https://pilawagorna.biuletyn.net',
  defaultCid: 51,
});

export default pilawaGorna;
