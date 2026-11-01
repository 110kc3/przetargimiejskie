import { makeBipLubelskieCity } from '../../core/biplubelskie-bip.js';

export const janowPodlaski = makeBipLubelskieCity({
  id: 'janow-podlaski',
  teryt: '0601054',
  label: 'Janów Podlaski',
  voivodeship: 'lubelskie',
  authority: 'Prezydent Miasta Janów Podlaski',
  host: 'umjanowpodlaski.bip.lubelskie.pl',
  origin: 'https://umjanowpodlaski.bip.lubelskie.pl',
  menuId: 413,
});

export default janowPodlaski;
