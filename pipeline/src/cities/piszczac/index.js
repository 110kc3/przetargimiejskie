import { makeBiuletynNetCity } from '../../core/biuletynnet-bip.js';

export const piszczac = makeBiuletynNetCity({
  id: 'piszczac',
  teryt: '0601114',
  name: 'Piszczac',
  label: 'Piszczac',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Piszczac',
  host: 'bip.piszczac.pl',
  origin: 'https://bip.piszczac.pl',
  defaultCid: 362,
});

export default piszczac;
