import { makeNefeniCity } from '../../core/nefeni-bip.js';

export const piekarySlaskie = makeNefeniCity({
  id: 'piekary-slaskie',
  teryt: '2471011',
  label: 'Piekary Śląskie',
  voivodeship: 'slaskie',
  authority: 'Prezydent Miasta Piekary Śląskie',
  origin: 'https://piekaryslaskie.bip.net.pl',
  categories: ['276-przetargi-na-zbycie-najem-i-dzierzawe'],
});

export default piekarySlaskie;
