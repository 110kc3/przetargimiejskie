import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const nowaDeba = makeBiuletynNetCity({
  id: 'nowa-deba',
  teryt: '1820044',
  name: 'Nowa Dęba',
  label: 'Nowa Dęba',
  voivodeship: 'podkarpackie',
  authority: 'Prezydent Miasta Nowa Dęba',
  host: 'nowadeba.biuletyn.net',
  origin: 'https://nowadeba.biuletyn.net',
  defaultCid: 70,
});

export default nowaDeba;
