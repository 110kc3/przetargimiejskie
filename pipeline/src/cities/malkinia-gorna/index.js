import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const malkiniaGorna = makeBiuletynNetCity({
  id: 'malkinia-gorna',
  teryt: '1416054',
  name: 'Małkinia Górna',
  label: 'Małkinia Górna',
  voivodeship: 'mazowieckie',
  authority: 'Prezydent Miasta Małkinia Górna',
  host: 'malkiniagorna.biuletyn.net',
  origin: 'https://malkiniagorna.biuletyn.net',
  defaultCid: 136,
});

export default malkiniaGorna;
